"""Measure public import observation coverage; final identity is never original-control lifetime."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile


REPO = Path(__file__).resolve().parent.parent


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), REPO / 'scripts' / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


body = load('docx-next-sidebar-body-qa')
WORKER = REPO / 'scripts/docx-next-owner-boundary-worker.py'


def classify(phase):
    """The PASS below covers the observed interval of one control, never its creation."""
    events, lifetime = phase['events'], phase['controlLifetime']
    assert events and events[-1]['event'] == 'end'
    assert not any('error' in event for event in events), 'Import callback failed'
    assert phase['readOnly'] is True and phase['modified'] is False
    canonical = phase['canonicalOwnerFieldIds'][0]
    assert lifetime[0] == {'event': 'registered', 'canonicalTag': canonical}
    assert lifetime[-1]['event'] == 'final-control'
    assert type(lifetime[-1]['sameRegisteredInterface']) is bool
    assert all(row['event'] in ('registered', 'live-control', 'control-disposing', 'final-control') for row in lifetime)
    registration = phase['paragraphDisposalRegistration']
    assert registration['canonicalTag'] == canonical
    index = registration['eventIndex']
    assert type(index) is int and 0 <= index < len(events)
    assert events[index].get('firstControl', {}).get('tag') == canonical
    live = [row for row in lifetime if row['event'] == 'live-control']
    disposals = [row for row in lifetime if row['event'] == 'control-disposing']
    assert all(type(row['sameRegisteredInterface']) is bool for row in live + disposals)
    assert len(disposals) <= 1
    final = lifetime[-1]['sameRegisteredInterface']
    if disposals or not final or any(not row['sameRegisteredInterface'] for row in live):
        status, reason = 'FAIL', 'Observed canonical control disposal or changed live interface'
    elif events[index]['event'] == 'end' or not live:
        status, reason = 'INCONCLUSIVE', 'No control identity observation before import end'
    else:
        status, reason = 'PASS', 'Same strong UNO control reference across the observed import interval'
    return {'fixture': phase['fixture'], 'phase': phase['phase'], 'canonicalTag': canonical,
            'inputSha256': phase['inputSha256'], 'registrationEvent': events[index]['event'],
            'liveControlChecks': len(live), 'controlDisposals': len(disposals),
            'sameRegisteredInterfaceAtEnd': final, 'observedControlInterval': status, 'reason': reason,
            'originalControlCreationLifetime': 'UNVERIFIED', 'originalContainerLifetime': 'UNVERIFIED'}


def require_source_interval(report):
    source = next((row for row in report['phases'] if row['phase'] == 'source'), None)
    assert source is not None and source['observedControlInterval'] == 'PASS', 'Source original-control interval is not observed'


def validate_final_fields(phase, expected):
    fields = phase['finalControls']
    assert [row['tag'] for row in fields] == list(expected), 'Missing, duplicate or reordered native fields'
    for row in fields:
        assert row['text'].replace('\n', '').replace('\t', '') == expected[row['tag']].replace('\n', '').replace('\t', ''), 'Changed native field text'


def contract(report):
    assert report['scope'] == 'One existing short left body-stories fixture; public observation coverage only'
    assert report['newNativeExports'] == 0 and report['newPreparedSources'] == 0
    assert report['productionAcceptance'] == 'blocked' and report['microsoftWordAcceptance'] == 'UNVERIFIED'
    assert report['originalControlCreationLifetime'] == report['originalContainerLifetime'] == 'UNVERIFIED'
    assert report['workerSha256'] == hashlib.sha256(WORKER.read_bytes()).hexdigest()
    assert report['newReadonlyNativeLoads'] == len(report['observation']['cases']) == len(report['phases'])
    assert report['phases'] == [classify(row) for row in report['observation']['cases']]
    assert [row['phase'] for row in report['phases']] in (['saved'], ['saved', 'source'])
    assert all(row['fixture'] == 'app-body-left' for row in report['phases'])
    expected = report['expectedBodyFields']
    assert len(expected) == 77
    for phase in report['observation']['cases']:
        validate_final_fields(phase, expected)
    return {'phases': report['phases'], 'productionAcceptance': 'blocked',
            'originalControlCreationLifetime': 'UNVERIFIED', 'originalContainerLifetime': 'UNVERIFIED'}


def audit(folder, engine, binding):
    name = 'app-body-left'
    fixture = json.loads((folder / (name + '.json')).read_text())
    source = folder / (name + '.docx')
    assert body.entry.sha(source) == fixture['sourceSha256']
    expected, _ = body.package_controls(source)
    assert len(expected) == 77
    report = {'scope': 'One existing short left body-stories fixture; public observation coverage only',
              'workerSha256': hashlib.sha256(WORKER.read_bytes()).hexdigest(),
              'applicationSourceSha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip(),
              'sourceSha256': fixture['sourceSha256'], 'expectedBodyFields': expected,
              'engineRecord': json.loads((engine / 'runtime-record.json').read_text()),
              'bindingRecord': json.loads((binding / 'binding-record.json').read_text()),
              'observation': {'cases': []}, 'phases': [], 'newReadonlyNativeLoads': 0,
              'newNativeExports': 0, 'newPreparedSources': 0,
              'originalControlCreationLifetime': 'UNVERIFIED', 'originalContainerLifetime': 'UNVERIFIED',
              'productionAcceptance': 'blocked', 'microsoftWordAcceptance': 'UNVERIFIED'}
    # The previously saved package is the actual early-observation control. No
    # new save, fixture generation, engine patch or accepted worker change occurs.
    for phase, path in [('saved', folder / (name + '-saved.docx')), ('source', source)]:
        actual, _ = body.package_controls(path)
        assert actual == expected and list(actual) == list(expected)
        request = {'fixture': name, 'phase': phase, 'path': str(path.resolve()), 'sha256': body.entry.sha(path),
                   'canonicalOwnerFieldIds': fixture['canonicalOwnerFieldIds']}
        with tempfile.TemporaryDirectory(prefix='docx-next-control-coverage-') as temporary:
            request_path = Path(temporary) / 'request.json'
            request_path.write_text(json.dumps([request]))
            process = subprocess.run([sys.executable, str(WORKER), str(request_path)],
                                     env=body.entry.native_environment(engine, binding / 'binding'),
                                     capture_output=True, text=True, timeout=60)
            assert process.returncode == 0, process.stderr
            observation = json.loads(process.stdout)
        assert len(observation['cases']) == 1 and observation['newReadonlyNativeLoads'] == 1
        case = observation['cases'][0]
        assert case['inputSha256'] == request['sha256'] and body.entry.sha(path) == request['sha256']
        validate_final_fields(case, expected)
        report['observation']['cases'].append(case)
        report['phases'].append(classify(case))
        report['newReadonlyNativeLoads'] += 1
        contract(report)
        (folder / 'control-coverage-report.json').write_text(json.dumps(report, indent=2) + '\n')
        if report['phases'][-1]['observedControlInterval'] != 'PASS':
            break  # No expansion to long/right/photograph/template matrices.
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--binding', type=Path, required=True)
    parser.add_argument('--require-source-interval', action='store_true')
    args = parser.parse_args()
    report = audit(args.folder.resolve(), args.engine.resolve(), args.binding.resolve())
    print(json.dumps(contract(report)))
    if args.require_source_interval:
        require_source_interval(report)
