"""Separate observed original paragraph disposal from unsampled internal import branches."""
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


boundary = module('native-boundary-qa'); native = boundary.native
FIXTURES = ['carrier-story-left-left', 'right-three-row-220', 'right-continuous-cell-220']


def validate_measurement(measurement, original, packages):
    for key, expected in (('newReadonlyNativeLoads', 6), ('newInMemoryDocuments', 0), ('newPreparedSources', 0),
                          ('newNativeExports', 0), ('originalPackagesModified', 0)):
        assert type(measurement[key]) is int and measurement[key] == expected, 'Changed native import scope/count'
    assert measurement['version'] == original['binding']['engine']['version'], 'Changed import engine'
    options = measurement['loadOptions']
    assert options == {'Hidden': True, 'ReadOnly': True, 'MacroExecutionMode': 0, 'UpdateDocMode': 0,
                       'FilterName': 'Office Open XML Text'}
    assert options['Hidden'] is True and options['ReadOnly'] is True
    assert all(type(options[key]) is int for key in ('MacroExecutionMode', 'UpdateDocMode'))
    for key in ('internalStartCursorMeasured', 'internalDummyGuardMeasured', 'exactDetachmentCallMeasured'):
        assert measurement[key] is False, 'Public callbacks cannot claim an internal call trace'
    assert [(row['fixture'], row['phase']) for row in measurement['cases']] == [(name, phase) for name in FIXTURES for phase in ('source', 'saved')]
    summaries = []
    for case, request in zip(measurement['cases'], packages):
        expected = original['cases'][FIXTURES.index(case['fixture'])]['phases'][case['phase']]
        canonical = case['canonicalOwnerFieldIds']; first = canonical[0]
        assert canonical == expected['canonicalOwnerFieldIds']
        assert case['inputSha256'] == request['sha256'] == expected['inputSha256'], 'Changed actual import bytes'
        assert case['readOnly'] is True and case['modified'] is False, 'Original import must remain read-only'
        final = case['finalControls']; tags = [row['tag'] for row in final]
        assert tags == expected['liveCanonicalTags'], 'Changed final complete native registry'
        assert [{key: row[key] for key in ('tag', 'table', 'cell')} for row in final] == expected['nativeControlAncestryInputs']
        assert case['nativeTableNames'] == expected['nativeTableNames']
        assert len(tags) == len(set(tags)) and all(isinstance(row['text'], str) for row in final)
        events = case['events']; assert events and events[-1]['event'] == 'end'
        hits = []; disposals = []
        for index, event in enumerate(events):
            assert 'error' not in event, 'Callback exceptions cannot be hidden'
            assert event['event'] in ('start', 'value', 'end', 'first-paragraph-disposing'), 'Unexpected callback boundary'
            assert type(event['count']) is int and event['count'] == len(event['tags']), 'Changed callback count'
            assert len(event['tags']) == len(set(event['tags'])) and set(event['tags']) <= set(request['serializedTags']), 'Invalid complete progress inventory'
            sample = event['firstControl']
            if event['event'] == 'first-paragraph-disposing':
                assert event['firstControlAnchorSampled'] is False and sample is None
                disposals.append(index)
            else:
                assert event['firstControlAnchorSampled'] is True
                assert (sample is not None) == (first in event['tags']), 'Anchor observation disagrees with global presence'
                if sample is not None:
                    assert sample['tag'] == first and isinstance(sample['text'], str) and isinstance(sample['paragraphText'], str)
                    hits.append(index)
            if event['event'] == 'value': assert type(event['value']) is int
        assert events[-1]['tags'] == tags, 'End callback and returned import disagree'
        registration = case['paragraphDisposalRegistration']
        if hits:
            assert registration == {'eventIndex': hits[0], 'canonicalTag': first, 'paragraphText': events[hits[0]]['firstControl']['paragraphText']}
        else: assert registration is None, 'An unsampled first control cannot claim a registered paragraph'
        if case['phase'] == 'source':
            assert len(events) == 1 and hits == [0] and not disposals
            assert events[0]['firstControl']['text'] == request['firstSerializedText']
            assert events[0]['firstControl']['table'] is not None and events[0]['firstControl']['cell'] == 'A1'
            status = 'final-only healthy source; no intermediate progress'
        elif case['fixture'] == FIXTURES[0]:
            assert len(events) == 80 and hits == list(range(31, 78)) and disposals == [78], 'Changed observed loss interval'
            assert events[0]['event'] == 'start' and events[0]['value']['range'] == 77 and events[0]['count'] == 0
            assert [row['value'] for row in events if row['event'] == 'value'] == list(range(1, 78))
            for index in hits:
                assert events[index]['firstControl'] == {'tag': first, 'text': '', 'table': None, 'cell': None, 'paragraphText': ''}, 'Original first control must be observed on its empty body paragraph'
            assert events[77]['count'] == 69 and first in events[77]['tags']
            assert events[78]['count'] == 76 and first not in events[78]['tags']
            assert events[78]['tags'] == tags and first not in tags
            status = 'created on empty body paragraph; registered paragraph disposes before import end with first tag absent'
        else:
            assert len(events) == 3 and not hits and not disposals
            assert events[0]['event'] == 'start' and events[0]['value']['range'] == 1
            assert events[1]['event'] == 'value' and events[1]['value'] == events[1]['count'] == 1
            assert first not in tags
            status = 'first control not observed in sparse progress; creation and loss interval remain unmeasured'
        summaries.append({'fixture': case['fixture'], 'phase': case['phase'], 'status': status,
                          'firstObservedEvent': hits[0] if hits else None, 'lastObservedEvent': hits[-1] if hits else None,
                          'paragraphDisposalEvents': disposals})
    return summaries


def audit(root, binding_directory):
    repository = Path(__file__).resolve().parent.parent
    original = json.loads((root / 'native-grid-report.json').read_text())
    native.compare_baseline(json.loads((repository / 'docs/docx-next/sidebar-native-grid-evidence.json').read_text())['stable'], original)
    requests = []; packages = []
    for row in original['cases']:
        folder = 'carrier-story' if row['fixture'].startswith('carrier-story-') else 'continuous-cell'
        for phase in ('source', 'saved'):
            path = root / folder / (row['fixture'] + ('-saved' if phase == 'saved' else '') + '.docx')
            controls = boundary.package_controls(native.history.document(path))
            canonical = row['phases'][phase]['canonicalOwnerFieldIds']; sha = hashlib.sha256(path.read_bytes()).hexdigest()
            requests.append({'path': str(path.resolve()), 'sha256': sha, 'fixture': row['fixture'], 'phase': phase, 'canonicalOwnerFieldIds': canonical})
            packages.append({'sha256': sha, 'serializedTags': list(controls), 'firstSerializedText': controls[canonical[0]]['text']})
    record = json.loads((binding_directory / 'binding-record.json').read_text())
    assert record['bindingManifestSha256'] == hashlib.sha256((repository / 'docs/docx-next/stable-uno-binding.json').read_bytes()).hexdigest()
    assert record['workerSha256'] == hashlib.sha256((repository / 'scripts/docx-next-native-grid-worker.py').read_bytes()).hexdigest()
    for key in ('packageManifestSha256', 'fontManifestSha256', 'adapterSha256', 'version'):
        assert record['engine'][key] == original['binding']['engine'][key]
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime'))
    assert json.loads((engine / 'runtime-record.json').read_text()) == record['engine']
    runtime = binding_directory / 'binding'; program = engine / 'usr/lib/libreoffice/program'
    env = os.environ.copy()
    env.update(LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(runtime / 'usr/lib/libreoffice/program'), str(runtime / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(runtime), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    worker = repository / 'scripts/docx-next-native-import-worker.py'
    assert sys.version_info[:2] == (3, 12)
    with tempfile.TemporaryDirectory(prefix='docx-next-native-import-request-') as temporary:
        request = Path(temporary) / 'request.json'; request.write_text(json.dumps(requests))
        process = subprocess.run([sys.executable, str(worker), str(request)], capture_output=True, text=True, env=env, timeout=30)
    assert process.returncode == 0, 'Original import observation failed: ' + process.stderr
    assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US'), 'Unexpected import diagnostics'
    measurement = json.loads(process.stdout); summaries = validate_measurement(measurement, original, packages)
    assert all(hashlib.sha256(Path(row['path']).read_bytes()).hexdigest() == row['sha256'] for row in requests)
    return {'scope': 'Six unchanged original read-only imports with public status and canonical-anchor paragraph-disposal callbacks',
            'binding': record, 'originalImportBinding': original['binding'], 'workerSha256': hashlib.sha256(worker.read_bytes()).hexdigest(),
            'measurement': measurement, 'originalPackageInputs': packages, 'summaries': summaries, 'nativeGeometryAcceptance': 'unchanged fail',
            'productionAcceptance': 'blocked',
            'causalAcceptance': 'carrier first control creation and associated empty paragraph disposal are observed; exact internal start guard and detachment call, and both historical loss intervals, remain unmeasured'}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b):
        report.pop('stableComparison', None)
        for case, package in zip(report['measurement']['cases'], report['originalPackageInputs']):
            if case['phase'] == 'saved':
                case.pop('inputSha256', None); package.pop('sha256', None)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True), 'Changed original native import observations, disposal, binding or scope'
    return {'status': 'pass', 'changedCases': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__); parser.add_argument('root', type=Path)
    parser.add_argument('--binding', required=True, type=Path); parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); report = audit(args.root, args.binding)
    if args.baseline: report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
    (args.root / 'native-import-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'newReadonlyNativeLoads': 6, 'newNativeExports': 0, 'summaries': report['summaries'],
                      'stableComparison': report.get('stableComparison')}))
