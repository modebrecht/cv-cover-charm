"""Prove one original carrier owner lifetime through strong UNO identity and native cleanup frames."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / 'docs/docx-next'
spec = importlib.util.spec_from_file_location('pop', REPO / 'scripts/docx-next-native-pop-qa.py')
pop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pop)
IDENTITY = 'Strong live UNO control/paragraph references; native range comparison at every progress; disposal broadcaster interface equality'


def validate(observation, original):
    state = json.loads((DOCS / 'sidebar-native-state-evidence.json').read_text())['stable']['observation']
    pop.cache.validate_original(observation['originalObservation'], state, original, state['disposalFrames'])
    assert observation['identityMethod'] == IDENTITY
    assert observation['rawPointersUsedForCrossCallbackIdentity'] is False
    assert type(observation['dyingBroadcasterMethodsInvoked']) is int and observation['dyingBroadcasterMethodsInvoked'] == 0
    events = observation['ownerLifetime']
    assert len(events) == 49
    assert events[0] == {'event': 'registered', 'canonicalTag': 'cv.section.person.heading',
                         'ownerImplementation': 'SwXParagraph', 'controlImplementation': 'SwXContentControl'}
    for event, value in zip(events[1:47], range(32, 78)):
        assert event == {'event': 'live-owner', 'value': value, 'sameControlInterface': True,
                         'sameOwnerParagraphStart': True}
        assert type(event['value']) is int and event['sameControlInterface'] is True and event['sameOwnerParagraphStart'] is True
    control = events[47]
    assert set(control) == {'event', 'sameRegisteredInterface', 'nativeFrames'}
    assert control['event'] == 'control-disposing' and control['sameRegisteredInterface'] is True
    frames = control['nativeFrames']
    # The same native DelFullPara operation destroys the control before its registered owner.
    owner_index = [i for i, row in enumerate(frames) if row == {'library': 'libswlo.so', 'returnOffset': 0xbdfd49}]
    assert len(owner_index) == 1 and frames[owner_index[0]:] == state['disposalFrames'][17:]
    assert len(frames) == 38 and all(set(row) == {'library', 'returnOffset'} and type(row['returnOffset']) is int for row in frames)
    assert events[48] == {'event': 'owner-disposing', 'sameRegisteredInterface': True}
    assert events[48]['sameRegisteredInterface'] is True
    assert original['events'][31]['firstControl']['text'] == ''
    assert not any(row['tag'] == events[0]['canonicalTag'] for row in original['finalControls'])
    return {'hypothesis': 'CONFIRMED', 'scope': 'Original saved carrier-story-left-left only',
            'liveOwnerChecks': 46, 'controlDestroyedDuringOwnerDeletion': True,
            'nativeControlDisposalFrames': 38, 'exporterFixAccepted': False}


def audit(root, binding_directory):
    original_report = json.loads((root / 'native-import-report.json').read_text())
    pop.cache.state.stack.imports.compare_baseline(json.loads((DOCS / 'sidebar-native-import-evidence.json').read_text())['stable'], original_report)
    original = next(row for row in original_report['measurement']['cases'] if row['fixture'] == 'carrier-story-left-left' and row['phase'] == 'saved')
    path = root / 'carrier-story/carrier-story-left-left-saved.docx'
    before = hashlib.sha256(path.read_bytes()).hexdigest()
    assert before == original['inputSha256']
    request = {key: original[key] for key in ('fixture', 'phase', 'canonicalOwnerFieldIds')}
    request.update(path=str(path.resolve()), sha256=before)
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    binding = (binding_directory / 'binding').resolve()
    program = engine / 'usr/lib/libreoffice/program'
    manifest = json.loads((DOCS / 'stable-native-stack.json').read_text())
    images = {}
    for name, expected in manifest['libraries'].items():
        image_path = (engine if expected['scope'] == 'engine' else binding) / 'usr/lib/libreoffice/program' / name
        image = pop.cache.state.stack.elf.Elf(image_path)
        assert image.sha256 == expected['sha256'] and image.build_id == expected['buildId']
        images[image_path] = image.sha256
    env = os.environ.copy()
    env.update(LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(binding / 'usr/lib/libreoffice/program'), str(binding / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(binding), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    capture = REPO / 'scripts/docx-next-native-state-capture.c'
    worker = REPO / 'scripts/docx-next-native-owner-worker.py'
    with tempfile.TemporaryDirectory(prefix='docx-next-owner-') as folder:
        folder = Path(folder)
        helper = folder / 'capture.so'
        request_path = folder / 'request.json'
        request_path.write_text(json.dumps([request]))
        subprocess.run(['gcc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror', '-o', str(helper), str(capture)], check=True, timeout=20)
        process = subprocess.run([sys.executable, str(worker), str(request_path), '--helper', str(helper)], env=env, capture_output=True, text=True, timeout=45)
        assert process.returncode == 0, process.stderr
        assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US')
        observation = json.loads(process.stdout)
        assert observation['originalObservation']['helperSha256'] == hashlib.sha256(helper.read_bytes()).hexdigest()
    summary = validate(observation, original)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before
    for image_path, sha in images.items():
        assert hashlib.sha256(image_path.read_bytes()).hexdigest() == sha
    return {'summary': summary, 'observation': observation, 'libraryIdentities': manifest['libraries'],
            'workerSha256': hashlib.sha256(worker.read_bytes()).hexdigest(),
            'originalImportWorkerSha256': manifest['originalWorkerSha256'],
            'originalStateWorkerSha256': hashlib.sha256((REPO / 'scripts/docx-next-native-state-worker.py').read_bytes()).hexdigest(),
            'newReadonlyNativeLoads': 1, 'newPreparedSources': 0, 'newNativeExports': 0,
            'originalPackagesModified': 0, 'engineFilesModified': 0,
            'historicalLossIntervalsMeasured': False, 'productionAcceptance': 'blocked',
            'nativeGeometryAcceptance': 'unchanged fail', 'microsoftWordAccepted': 0}


def contract(report):
    original = report['observation']['originalObservation']['measurement']['cases'][0]
    assert report['summary'] == validate(report['observation'], original)
    for key, value in [('newReadonlyNativeLoads', 1), ('newPreparedSources', 0),
                       ('newNativeExports', 0), ('originalPackagesModified', 0),
                       ('engineFilesModified', 0), ('microsoftWordAccepted', 0)]:
        assert type(report[key]) is int and report[key] == value
    assert report['historicalLossIntervalsMeasured'] is False
    assert report['productionAcceptance'] == 'blocked'
    assert report['nativeGeometryAcceptance'] == 'unchanged fail'
    assert report['libraryIdentities'] == json.loads((DOCS / 'stable-native-stack.json').read_text())['libraries']
    for key, file in [('workerSha256', 'docx-next-native-owner-worker.py'),
                      ('originalStateWorkerSha256', 'docx-next-native-state-worker.py'),
                      ('originalImportWorkerSha256', 'docx-next-native-import-worker.py')]:
        assert report[key] == hashlib.sha256((REPO / 'scripts' / file).read_bytes()).hexdigest()
    return report['summary']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--binding', required=True, type=Path)
    args = parser.parse_args()
    report = audit(args.root, args.binding)
    contract(report)
    (args.root / 'native-owner-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report['summary']))
