"""Pin original disposal's native ELF frames without guessing hidden importer function names."""
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


imports = module('native-import-qa'); elf = module('native-stack-elf')
CONVENTION = 'ELF-relative return address; exported extent contains return address minus one'


def digest(value): return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def validate_stacks(stacks, manifest, images=None):
    assert len(stacks) == 1, 'Only the observed canonical carrier paragraph has a native stack'
    row = stacks[0]
    assert {key: row[key] for key in ('fixture', 'phase', 'eventIndex', 'canonicalTag')} == {
        'fixture': 'carrier-story-left-left', 'phase': 'saved', 'eventIndex': 78, 'canonicalTag': 'cv.section.person.heading'}
    assert type(row['eventIndex']) is int
    stack = row['stack']; assert stack['truncated'] is False and type(stack['capacity']) is int and stack['capacity'] == 128, 'Truncated/changed backtrace capture'
    assert stack['addressConvention'] == CONVENTION and stack['systemAndInterpreterFramesAccepted'] is False
    frames = stack['nativeFrames']; assert len(frames) == 36, 'Incomplete native frame sequence'
    assert set(frame['library'] for frame in frames) == set(manifest['libraries']), 'Unpinned or missing native library'
    for frame in frames:
        assert set(frame) == {'library', 'returnOffset', 'exportedFunctions'}
        offset = frame['returnOffset']; assert type(offset) is int and offset > 0, 'Invalid ELF-relative return address'
        functions = frame['exportedFunctions']; assert isinstance(functions, list)
        for function in functions:
            assert set(function) == {'name', 'value', 'size'} and isinstance(function['name'], str) and function['name']
            assert type(function['value']) is int and function['value'] >= 0 and type(function['size']) is int and function['size'] > 0
            assert function['value'] <= offset - 1 < function['value'] + function['size'], 'Nearest symbol cannot resolve an unnamed frame'
        assert functions == sorted(functions, key=lambda x: (x['value'], x['size'], x['name']))
        assert len({(x['name'], x['value'], x['size']) for x in functions}) == len(functions)
        if images is not None: assert functions == images[frame['library']].resolve(offset), 'Exported function extents disagree with actual pinned ELF'
    # Actual exported extents identify destruction, not the unnamed writerfilter callers.
    expected = [(10, 'libmergedlo.so', '_ZN14SvtBroadcaster9BroadcastERK7SfxHint'),
                (11, 'libmergedlo.so', '_ZN14SvtBroadcasterD1Ev'),
                (12, 'libswlo.so', '_ZN13SwContentNodeD1Ev'),
                (13, 'libswlo.so', '_ZThn120_N10SwTextNodeD0Ev')]
    for index, library, name in expected:
        assert frames[index]['library'] == library and name in [x['name'] for x in frames[index]['exportedFunctions']], 'Changed text-node destruction chain'
    importer = [frame for frame in frames if frame['library'] == 'libsw_writerfilterlo.so']
    assert len(importer) == 6 and all(frame['exportedFunctions'] == [] for frame in importer), 'Hidden importer names remain unresolved'


def validate_report(report, manifest):
    assert report['libraryIdentities'] == manifest['libraries'] and report['originalImportWorkerSha256'] == manifest['originalWorkerSha256']
    for key, expected in (('newReadonlyNativeLoads', 6), ('newInMemoryDocuments', 0), ('newPreparedSources', 0), ('newNativeExports', 0), ('originalPackagesModified', 0)):
        assert type(report[key]) is int and report[key] == expected, 'Changed original native stack scope'
    assert report['originalObservationUnchanged'] is True and report['nativeTextNodeDestructionObserved'] is True
    for key in ('exactImporterCallerResolved', 'internalStartCursorMeasured', 'internalDummyGuardMeasured', 'historicalLossIntervalsMeasured'):
        assert report[key] is False, 'Unresolved internal state/call cannot claim acceptance'
    assert report['nativeGeometryAcceptance'] == 'unchanged fail' and report['productionAcceptance'] == 'blocked'
    validate_stacks(report['stacks'], manifest)


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b):
        report.pop('stableComparison', None)
        for index, package in enumerate(report['originalPackageInputs']):
            if index % 2 == 1: package.pop('sha256', None)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True), 'Changed native stack, original observations, binary identity, binding or scope'
    return {'status': 'pass', 'changedStacks': 0}


def audit(root, binding_directory):
    repository = Path(__file__).resolve().parent.parent; docs = repository / 'docs/docx-next'
    original = json.loads((root / 'native-import-report.json').read_text())
    imports.compare_baseline(json.loads((docs / 'sidebar-native-import-evidence.json').read_text())['stable'], original)
    grid = json.loads((root / 'native-grid-report.json').read_text())
    imports.native.compare_baseline(json.loads((docs / 'sidebar-native-grid-evidence.json').read_text())['stable'], grid)
    manifest_path = docs / 'stable-native-stack.json'; manifest = json.loads(manifest_path.read_text())
    record = json.loads((binding_directory / 'binding-record.json').read_text())
    assert record['bindingManifestSha256'] == hashlib.sha256((docs / 'stable-uno-binding.json').read_bytes()).hexdigest()
    assert record['workerSha256'] == hashlib.sha256((repository / 'scripts/docx-next-native-grid-worker.py').read_bytes()).hexdigest()
    for key in ('packageManifestSha256', 'fontManifestSha256', 'adapterSha256', 'version'):
        assert record['engine'][key] == original['binding']['engine'][key]
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    assert json.loads((engine / 'runtime-record.json').read_text()) == record['engine']
    runtime = (binding_directory / 'binding').resolve(); program = engine / 'usr/lib/libreoffice/program'
    images = {}
    for name, expected in manifest['libraries'].items():
        base = engine if expected['scope'] == 'engine' else runtime
        image = elf.Elf(base / 'usr/lib/libreoffice/program' / name)
        assert image.sha256 == expected['sha256'] and image.build_id == expected['buildId'], 'Changed pinned native stack identity'
        images[name] = image
    requests = []; packages = []
    for case in original['measurement']['cases']:
        folder = 'carrier-story' if case['fixture'].startswith('carrier-story-') else 'continuous-cell'
        path = root / folder / (case['fixture'] + ('-saved' if case['phase'] == 'saved' else '') + '.docx')
        controls = imports.boundary.package_controls(imports.native.history.document(path))
        sha = hashlib.sha256(path.read_bytes()).hexdigest(); assert sha == case['inputSha256'], 'Changed actual original stack input'
        requests.append({'path': str(path.resolve()), 'sha256': sha, 'fixture': case['fixture'], 'phase': case['phase'], 'canonicalOwnerFieldIds': case['canonicalOwnerFieldIds']})
        packages.append({'sha256': sha, 'serializedTags': list(controls), 'firstSerializedText': controls[case['canonicalOwnerFieldIds'][0]]['text']})
    assert packages == original['originalPackageInputs']
    env = os.environ.copy(); env.update(
        LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
        PYTHONPATH=':'.join((str(runtime / 'usr/lib/libreoffice/program'), str(runtime / 'usr/lib/python3/dist-packages'))),
        DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(runtime), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    worker = repository / 'scripts/docx-next-native-stack-worker.py'; assert sys.version_info[:2] == (3, 12)
    with tempfile.TemporaryDirectory(prefix='docx-next-native-stack-request-') as temporary:
        request = Path(temporary) / 'request.json'; request.write_text(json.dumps(requests))
        process = subprocess.run([sys.executable, str(worker), str(request)], capture_output=True, text=True, env=env, timeout=30)
    assert process.returncode == 0, 'Native stack observation failed: ' + process.stderr
    assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US'), 'Unexpected native stack diagnostics'
    result = json.loads(process.stdout)
    imports.validate_measurement(result['measurement'], grid, packages)
    assert json.dumps(result['measurement'], sort_keys=True) == json.dumps(original['measurement'], sort_keys=True), 'Stack observer changed original complete observations'
    validate_stacks(result['stacks'], manifest, images)
    assert len(result['diagnostics']) == 1
    for request in requests: assert hashlib.sha256(Path(request['path']).read_bytes()).hexdigest() == request['sha256']
    (root / 'native-stack-diagnostics.json').write_text(json.dumps(result['diagnostics'], indent=2) + '\n')
    normalized = copy.deepcopy(result['measurement'])
    for case in normalized['cases']:
        if case['phase'] == 'saved': case.pop('inputSha256')
    report = {'scope': 'Native pinned-library frames inside the single original canonical carrier paragraph disposal; six unchanged read-only imports',
              'binding': record, 'originalImportBinding': original['binding'], 'originalPackageInputs': packages,
              'originalImportWorkerSha256': manifest['originalWorkerSha256'], 'stackWorkerSha256': hashlib.sha256(worker.read_bytes()).hexdigest(),
              'elfReaderSha256': hashlib.sha256((repository / 'scripts/docx-next-native-stack-elf.py').read_bytes()).hexdigest(),
              'binaryManifestSha256': hashlib.sha256(manifest_path.read_bytes()).hexdigest(),
              'originalImportBaselineSha256': hashlib.sha256((docs / 'sidebar-native-import-evidence.json').read_bytes()).hexdigest(),
              'originalMeasurementSha256': digest(normalized), 'originalObservationUnchanged': True,
              'libraryIdentities': manifest['libraries'], 'stacks': result['stacks'],
              'newReadonlyNativeLoads': 6, 'newInMemoryDocuments': 0, 'newPreparedSources': 0, 'newNativeExports': 0, 'originalPackagesModified': 0,
              'nativeTextNodeDestructionObserved': True, 'exactImporterCallerResolved': False,
              'internalStartCursorMeasured': False, 'internalDummyGuardMeasured': False, 'historicalLossIntervalsMeasured': False,
              'nativeGeometryAcceptance': 'unchanged fail', 'productionAcceptance': 'blocked'}
    validate_report(report, manifest); return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('root', type=Path)
    parser.add_argument('--binding', required=True, type=Path); parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); report = audit(args.root, args.binding)
    if args.baseline: report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
    (args.root / 'native-stack-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'nativeStacks': len(report['stacks']), 'nativeFrames': len(report['stacks'][0]['stack']['nativeFrames']),
                      'originalObservationUnchanged': True, 'exactImporterCallerResolved': False, 'stableComparison': report.get('stableComparison')}))
