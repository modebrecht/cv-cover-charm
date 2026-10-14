"""Bounded paired Writer source regression; no modified engine enters application export."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import time
from zipfile import ZipFile

REPO = Path(__file__).resolve().parent.parent
PACKET = REPO / 'docs/qa/upstream-sidebar-14okt'
spec = importlib.util.spec_from_file_location('packet', REPO / 'scripts/sidebar-upstream-source-gate.py')
packet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packet)
TARGET = 'CppunitTest_sw_ooxmlexport23'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def classify_test(exit_code, text, expected_failures, all_names):
    assert type(exit_code) is int
    executed = re.findall(r'^\[_RUN_____\]\s+(?:[\w:]+::)?(test\w+)\s*$', text, re.MULTILINE)
    assert all(executed.count(name) == 1 for name in all_names), 'Not every prepared test executed exactly once'
    failures = re.findall(r'^Test name:\s*(?:[\w:]+::)?(test\w+)\s*$', text, re.MULTILINE)
    assert len(failures) == len(set(failures)), 'Duplicate native failure record'
    if expected_failures:
        assert exit_code != 0 and set(failures) == set(expected_failures), 'Baseline must fail precisely the four known geometry tests'
    else:
        assert exit_code == 0 and not failures and re.search(r'OK\s*\(\d+ tests?\)', text), 'Candidate native target did not pass'
    return {'result': 'EXPECTED FAIL' if expected_failures else 'PASS',
            'failedTests': failures, 'preparedTestsExecuted': len(all_names)}


def run(args, cwd, log, timeout, env=None):
    started = time.time()
    with log.open('w') as output:
        try:
            result = subprocess.run(args, cwd=cwd, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=timeout)
            code = result.returncode
        except subprocess.TimeoutExpired:
            code = 124
        except OSError as error:
            output.write(type(error).__name__ + ': ' + str(error) + '\n')
            code = -error.errno
    receipt = {'argv': args, 'exitCode': code, 'seconds': round(time.time() - started, 2),
               'log': log.name, 'logSha256': digest(log)}
    print(json.dumps(receipt), flush=True)
    return receipt


def prepare(root, evidence):
    packet.validate_packet(PACKET)
    declaration = json.loads((PACKET / 'source-preflight.json').read_text())
    (root / 'tarballs').mkdir()
    checkout = root / 'checkout'
    assert not checkout.exists(), 'Use a fresh source-build root'
    checkout.mkdir()
    result = run(['git', 'clone', '--filter=blob:none', '--no-checkout', '--depth=1',
                  '--branch', 'libreoffice-25.8.7.3', 'https://github.com/LibreOffice/core.git', str(checkout / 'core')],
                 root, root / 'clone.log', 900)
    assert result['exitCode'] == 0, 'Upstream checkout failed'
    origin = checkout / 'core'
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=origin, text=True).strip() == packet.SOURCE_SHA
    for label in ('baseline', 'candidate'):
        tree = root / label
        subprocess.run(['git', 'worktree', 'add', '--detach', str(tree), packet.SOURCE_SHA], cwd=origin, check=True, timeout=900)
        assert digest(tree / packet.SOURCE_FILE) == declaration['sourceFileSha256']
        assert digest(tree / packet.TEST_FILE) == declaration['testSourceBaseSha256']
        subprocess.run(['git', 'apply', str(PACKET / 'libreoffice-sidebar-grid-regression.patch')], cwd=tree, check=True)
        with ZipFile(PACKET / 'libreoffice-sidebar-grid-fixtures.zip') as archive:
            for name in archive.namelist():
                assert name.startswith('sw/qa/extras/ooxmlexport/data/') and '..' not in Path(name).parts
                path = tree / name
                assert not path.exists(), 'Fixture must not replace an upstream source'
                path.write_bytes(archive.read(name))
        if label == 'candidate':
            subprocess.run(['git', 'apply', str(REPO / 'docs/docx-next/libreoffice-nearest-tabcols-proposal.patch')], cwd=tree, check=True)
        expected = declaration['patchedSourceFileSha256'] if label == 'candidate' else declaration['sourceFileSha256']
        assert digest(tree / packet.SOURCE_FILE) == expected
        changed = subprocess.check_output(['git', 'diff', '--name-only', 'HEAD'], cwd=tree, text=True).splitlines()
        assert set(changed) == {packet.TEST_FILE} | ({packet.SOURCE_FILE} if label == 'candidate' else set())
        diff = subprocess.check_output(['git', 'diff', 'HEAD'], cwd=tree)
        (root / (label + '-source.diff')).write_bytes(diff)
        evidence['trees'][label] = {'sourceSha': packet.SOURCE_SHA, 'engineFileSha256': expected,
                                    'testFileSha256': digest(tree / packet.TEST_FILE), 'sourceDiffSha256': hashlib.sha256(diff).hexdigest()}
    assert evidence['trees']['baseline']['testFileSha256'] == evidence['trees']['candidate']['testFileSha256']
    evidence['fixtureArchiveSha256'] = declaration['fixtureArchiveSha256']
    evidence['preparedCases'] = declaration['preparedCases']


def build(root, label, evidence):
    tree = root / label
    flags = ['--without-java', '--disable-gui', '--disable-dbus', '--disable-cups',
             '--disable-gstreamer-1-0', '--disable-odk', '--disable-postgresql-sdbc',
             '--disable-mariadb-sdbc', '--without-gssapi', '--without-krb5',
             '--with-lang=en-US', '--with-parallelism=2', '--with-external-tar=' + str(root / 'tarballs')]
    env = os.environ.copy()
    env.update(CCACHE_BASEDIR=str(root), CCACHE_MAXSIZE='10G', CCACHE_COMPRESS='true', LC_ALL='C.UTF-8', TZ='UTC')
    assert not env.get('CPPUNIT_TEST_NAME'), 'The full native target cannot be filtered'
    # Upstream autogen.sh is a shebangless shell/Perl wrapper beginning with ':'.
    # POSIX shells perform the ENOEXEC fallback; Python Popen deliberately does not.
    configured = run(['/bin/sh', './autogen.sh'] + flags, tree, root / (label + '-configure.log'), 900, env)
    evidence['trees'][label]['configure'] = configured
    assert configured['exitCode'] == 0, 'Configure failed; no dependency debugging loop is permitted'
    config = (tree / 'config_host.mk').read_text().replace(str(tree), '<SOURCE_TREE>')
    evidence['trees'][label]['normalizedConfigSha256'] = hashlib.sha256(config.encode()).hexdigest()
    if label == 'candidate':
        assert evidence['trees'][label]['normalizedConfigSha256'] == evidence['trees']['baseline']['normalizedConfigSha256'], 'Paired configurations differ'
    outcome = run(['make', TARGET], tree, root / (label + '-writer.log'), 9000, env)
    evidence['trees'][label]['buildAndNativeTarget'] = outcome
    native_log = tree / 'workdir/CppunitTest/sw_ooxmlexport23.test.log'
    assert native_log.is_file(), 'Writer/native target did not reach its test executor'
    (root / (label + '-native.log')).write_bytes(native_log.read_bytes())
    declaration = json.loads((PACKET / 'source-preflight.json').read_text())
    names = [row['testName'] for row in declaration['cases']]
    expected = declaration['expectedUnpatchedFailures'] if label == 'baseline' else []
    evidence['trees'][label]['nativeResult'] = classify_test(outcome['exitCode'], native_log.read_text(), expected, names)
    evidence['trees'][label]['nativeLogSha256'] = digest(native_log)
    libraries = []
    for path in sorted((tree / 'instdir/program').glob('*.so')):
        if path.is_symlink():
            continue
        build_id = subprocess.run(['readelf', '-n', str(path)], capture_output=True, text=True, timeout=15)
        identity = re.findall(r'Build ID: (\w+)', build_id.stdout)
        libraries.append({'name': path.name, 'sha256': digest(path), 'buildIds': identity})
    assert libraries, 'No built engine libraries fingerprinted'
    evidence['trees'][label]['outputLibraries'] = libraries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    args = parser.parse_args()
    root = args.root.resolve(); root.mkdir(parents=True, exist_ok=True)
    evidence = {'scope': 'Paired complete upstream checkout; Writer target and native CppUnit, not full product build or application matrix',
                'applicationSourceSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
                'upstreamSourceSha': packet.SOURCE_SHA, 'trees': {}, 'status': 'IN_PROGRESS',
                'productionAcceptance': 'blocked', 'originalControlCreationLifetime': 'UNVERIFIED',
                'originalContainerLifetime': 'UNVERIFIED', 'microsoftWordAcceptance': 'UNVERIFIED',
                'applicationRuntimeDependency': False, 'newArchitectureHypotheses': 0, 'sourceEngineMatrix22': 'UNEXECUTED'}
    path = root / 'source-build-result.json'
    try:
        prepare(root, evidence)
        path.write_text(json.dumps(evidence, indent=2) + '\n')
        for label in ('baseline', 'candidate'):
            build(root, label, evidence)
            path.write_text(json.dumps(evidence, indent=2) + '\n')
        evidence['status'] = 'PASS: paired source regression only'
    except Exception as error:
        evidence['status'] = 'FAIL / INCONCLUSIVE: stopped at first build or contract failure'
        evidence['failure'] = type(error).__name__ + ': ' + str(error)
        raise
    finally:
        path.write_text(json.dumps(evidence, indent=2) + '\n')


if __name__ == '__main__':
    main()
