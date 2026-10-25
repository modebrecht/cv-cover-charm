"""Observe importer guard state on the original canonical carrier; preserve every older gate."""
import argparse
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


stack = module('native-stack-qa')


def validate_observation(result, original, frames):
    assert result['measurement']['cases'] == [original], 'Changed complete original carrier observations'
    for key, value in (('newReadonlyNativeLoads', 1), ('newInMemoryDocuments', 0), ('newPreparedSources', 0), ('newNativeExports', 0), ('originalPackagesModified', 0)):
        assert type(result['measurement'][key]) is int and result['measurement'][key] == value, 'Changed original state observation scope'
    assert result['sameImplementationThroughout'] is True and result['cachedSdtStartObserved'] is False
    assert result['disposalFrames'] == [{key: frame[key] for key in ('library', 'returnOffset')} for frame in frames], 'Changed original disposal frame sequence'
    progress = [event for event in original['events'] if event['event'] == 'value']
    assert len(result['progressStates']) == len(progress) == 77
    for row, event in zip(result['progressStates'], progress):
        assert type(row['value']) is int and row['value'] == event['value']
        assert type(row['dummyFlag']) is bool and row['dummyFlag'] == (row['value'] >= 31), 'Changed measured dummy flag transition'
        assert type(row['annotationId']) is int and row['annotationId'] == -1, 'Changed measured annotation state'
        assert isinstance(row['activeSdtTag'], str)
        assert type(row['cachedSdtStartCount']) is int and row['cachedSdtStartCount'] == 0, 'Cached first range remains unobserved'
    state = result['disposalState']
    assert type(state['annotationIdDuringDisposal']) is int and state['annotationIdDuringDisposal'] == -1
    assert state['dummyFlagDuringDisposal'] is False, 'Cleanup has already reset the dummy flag at disposal'


def compare_baseline(expected, actual):
    a, b = json.loads(json.dumps(expected)), json.loads(json.dumps(actual))
    for report in (a, b):
        report.pop('stableComparison', None)
        report.pop('helperSha256', None)  # Rebuilt observer identity is retained, never an engine identity.
        report.pop('compiler', None)
        report['observation']['measurement']['cases'][0].pop('inputSha256', None)
    assert a == b, 'Changed exact original importer state evidence'
    return {'status': 'pass', 'changedGuardStates': 0}


def audit(root, binding_directory):
    repository = Path(__file__).resolve().parent.parent; docs = repository / 'docs/docx-next'
    original_report = json.loads((root / 'native-import-report.json').read_text())
    stack.imports.compare_baseline(json.loads((docs / 'sidebar-native-import-evidence.json').read_text())['stable'], original_report)
    native_stack = json.loads((root / 'native-stack-report.json').read_text())
    manifest = json.loads((docs / 'stable-native-stack.json').read_text()); stack.validate_report(native_stack, manifest)
    original = next(case for case in original_report['measurement']['cases'] if case['fixture'] == 'carrier-story-left-left' and case['phase'] == 'saved')
    path = root / 'carrier-story/carrier-story-left-left-saved.docx'
    before = hashlib.sha256(path.read_bytes()).hexdigest(); assert before == original['inputSha256']
    request = {key: original[key] for key in ('fixture', 'phase', 'canonicalOwnerFieldIds')}
    request.update(path=str(path.resolve()), sha256=before)
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    runtime = (binding_directory / 'binding').resolve(); program = engine / 'usr/lib/libreoffice/program'
    images = {}
    for name, expected in manifest['libraries'].items():
        image_path = (engine if expected['scope'] == 'engine' else runtime) / 'usr/lib/libreoffice/program' / name
        image = stack.elf.Elf(image_path)
        assert image.sha256 == expected['sha256'] and image.build_id == expected['buildId'], 'Changed actual state observation engine'
        images[image_path] = image.sha256
    layout_path = docs / 'stable-native-state-layout.json'; layout = json.loads(layout_path.read_text())
    assert layout['buildId'] == manifest['libraries']['libsw_writerfilterlo.so']['buildId'] and layout['pointerSize'] == 8
    assert layout['packageSha256'] == json.loads((docs / 'stable-native-debug-package.json').read_text())['sha256']
    env = os.environ.copy(); env.update(
        LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
        PYTHONPATH=':'.join((str(runtime / 'usr/lib/libreoffice/program'), str(runtime / 'usr/lib/python3/dist-packages'))),
        DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(runtime), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    source = repository / 'scripts/docx-next-native-state-capture.c'; worker = repository / 'scripts/docx-next-native-state-worker.py'
    with tempfile.TemporaryDirectory(prefix='docx-next-import-state-') as temporary:
        temporary = Path(temporary); helper = temporary / 'capture.so'; request_path = temporary / 'request.json'
        request_path.write_text(json.dumps([request]))
        subprocess.run(['gcc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror', '-o', str(helper), str(source)], check=True, timeout=20)
        process = subprocess.run([sys.executable, str(worker), str(request_path), '--helper', str(helper)], capture_output=True, text=True, env=env, timeout=45)
        assert process.returncode == 0, 'Original state observation failed: ' + process.stderr
        assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US')
        result = json.loads(process.stdout)
        assert result['helperSha256'] == hashlib.sha256(helper.read_bytes()).hexdigest()
    validate_observation(result, original, native_stack['stacks'][0]['stack']['nativeFrames'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == before, 'Original package changed'
    for image_path, digest in images.items():
        assert hashlib.sha256(image_path.read_bytes()).hexdigest() == digest, 'Native engine changed'
    assert hashlib.sha256((repository / 'scripts/docx-next-native-import-worker.py').read_bytes()).hexdigest() == manifest['originalWorkerSha256']
    helper_digest = result.pop('helperSha256')
    return {'scope': 'One unchanged original saved carrier read-only import; 77 progress states and one canonical paragraph disposal',
            'observation': result, 'originalStackMeasurementSha256': stack.digest(native_stack['stacks']),
            'layoutSha256': hashlib.sha256(layout_path.read_bytes()).hexdigest(),
            'captureSourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'workerSha256': hashlib.sha256(worker.read_bytes()).hexdigest(),
            'helperSha256': helper_digest, 'compiler': subprocess.check_output(['gcc', '--version'], text=True).splitlines()[0],
            'libraryIdentities': manifest['libraries'], 'originalImportWorkerSha256': manifest['originalWorkerSha256'],
            'internalProgressGuardMeasured': True, 'internalPreCleanupGuardMeasured': False, 'internalFirstCachedRangeMeasured': False,
            'historicalLossIntervalsMeasured': False, 'newReadonlyNativeLoads': 1, 'newPreparedSources': 0, 'newNativeExports': 0,
            'engineFilesModified': 0, 'originalPackagesModified': 0, 'nativeGeometryAcceptance': 'unchanged fail', 'productionAcceptance': 'blocked'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('root', type=Path)
    parser.add_argument('--binding', type=Path, required=True); parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); report = audit(args.root, args.binding)
    if args.baseline: report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
    (args.root / 'native-state-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'progressStates': 77, 'dummyFlagSetFromProgress': 31, 'annotationId': -1, 'firstCachedRangeMeasured': False, 'productionAcceptance': 'blocked'}))
