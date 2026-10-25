"""Read-only live UNO snapshots of three already stopped native pairs; no new exports or geometry waiver."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


history = module('grid-history-qa')
grid = module('carrier-grid-qa')
worker = module('native-grid-worker')
W = history.W


def getter_model(geometry):
    stages = history.arithmetic(geometry['grid'], geometry['preferredWidthTwips'])
    widths = stages['predictedGrid']; total = geometry['preferredWidthTwips']
    return {'importArithmetic': stages,
            'predictedPublicGetterSeparators': [widths[0] * 10000 // total, (widths[0] + widths[1]) * 10000 // total],
            'scope': 'Arithmetic only: public getter normalizes native positions again; internal transient values are not sampled'}


def validate_snapshot(result, canonical, sha):
    assert result['inputSha256'] == sha, 'Changed native input digest'
    assert result['readOnly'] is True and result['modified'] is False and result['newNativeExports'] == 0
    assert result['loadOptions'] == {'Hidden': True, 'ReadOnly': True, 'MacroExecutionMode': 0, 'UpdateDocMode': 0}
    assert result['canonicalOwnerFieldIds'] == canonical
    assert result['nativeTableCount'] == len(result['nativeTableNames'])
    try:
        owner, ancestry = worker.canonical_owner(canonical, result['nativeControlAncestryInputs'], result['nativeTableNames'], result['nativeParents'])
    except AssertionError as error:
        assert result['ownerResolution'] == {'status': 'fail', 'reason': str(error)}, 'Changed native ownership failure'
        assert all(result[key] is None for key in ('nativeOwnerName', 'canonicalFieldAncestry', 'widthMm100', 'relativeSum', 'tableSeparators', 'rowSeparators', 'cellNames')), 'Metrics cannot precede complete owner resolution'
    else:
        assert result['ownerResolution'] == {'status': 'pass'} and result['nativeOwnerName'] == owner and result['canonicalFieldAncestry'] == ancestry, 'Changed resolved native ownership'
        assert type(result['relativeSum']) is int and result['relativeSum'] == 10000
        assert type(result['widthMm100']) is int and result['widthMm100'] > 0
        for separators in [result['tableSeparators']] + result['rowSeparators']:
            positions = [value['position'] for value in separators]
            assert all(type(value) is int and 0 < value < 10000 for value in positions) and positions == sorted(set(positions)), 'Malformed native separators'
            assert all(type(value['visible']) is bool for value in separators), 'Malformed native separator visibility'
    assert result['liveCanonicalTags'] == [row['tag'] for row in result['nativeControlAncestryInputs']], 'Changed live canonical inventory'
    assert result['twipGeometryAvailable'] is False, 'Public UNO width cannot substitute for exact twip geometry'


def snapshot(command, path, canonical):
    sha = hashlib.sha256(path.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix='docx-next-native-grid-request-') as temporary:
        request = Path(temporary) / 'request.json'
        request.write_text(json.dumps({'path': str(path.resolve()), 'sha256': sha, 'canonicalOwnerFieldIds': canonical}))
        process = subprocess.run([str(command), str(request)], capture_output=True, text=True, timeout=30)
        assert process.returncode == 0, 'Native UNO measurement failed for ' + path.name + ': ' + process.stderr
    # Kit's single allowlist message is expected; every other diagnostic is retained as a failure.
    assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US'), 'Unexpected native UNO diagnostics: ' + process.stderr
    result = json.loads(process.stdout)
    assert result['inputSha256'] == sha == hashlib.sha256(path.read_bytes()).hexdigest(), 'Changed native input bytes'
    validate_snapshot(result, canonical, sha)
    return result


def audit(root, command):
    stopped = grid.audit(root / 'carrier-story'); previous = history.audit(root)
    inventory = [('carrier-story', stopped['fixture'])] + [('continuous-cell', row['fixture']) for row in previous['cases']]
    pairs = []
    for folder, name in inventory:
        source, saved = root / folder / (name + '.docx'), root / folder / (name + '-saved.docx')
        before, after = history.document(source), history.document(saved)
        if folder == 'carrier-story':
            owners = [table for table in before.iter(W + 'tbl') if (caption := table.find(W + 'tblPr/' + W + 'tblCaption')) is not None and caption.get(W + 'val') == 'probe.floating-carrier']
            assert len(owners) == 1, 'Changed canonical carrier owner'
            a = owners[0]; canonical = history.ids(a)
            matches = [table for table in after.iter(W + 'tbl') if history.ids(table) == canonical]
            assert len(matches) == 1, 'Changed complete saved carrier ownership'
            b = matches[0]
        else: a, b, canonical = history.owners(before, after)
        geometries = {'source': history.geometry(a), 'saved': history.geometry(b)}
        phases = {}
        for phase, path in (('source', source), ('saved', saved)):
            actual = snapshot(command, path, canonical); arithmetic = getter_model(geometries[phase])
            actual['inputXmlGeometry'] = geometries[phase]; actual['getterArithmetic'] = arithmetic
            actual['arithmeticMatchesPublicGetter'] = None if actual['tableSeparators'] is None else [row['position'] for row in actual['tableSeparators']] == arithmetic['predictedPublicGetterSeparators']
            phases[phase] = actual
        pairs.append({'fixture': name, 'phases': phases,
                      'exactGeometryAcceptance': 'pass' if geometries['source'] == geometries['saved'] else 'fail',
                      'publicGetterValuesChanged': None if any(phases[phase]['tableSeparators'] is None for phase in phases) else phases['source']['tableSeparators'] != phases['saved']['tableSeparators']})
    repository = Path(__file__).resolve().parent.parent
    record_path = command.resolve().parent / 'binding-record.json'
    binding = json.loads(record_path.read_text())
    assert binding['workerSha256'] == hashlib.sha256((repository / 'scripts/docx-next-native-grid-worker.py').read_bytes()).hexdigest(), 'Changed native measurement worker'
    assert binding['bindingManifestSha256'] == hashlib.sha256((repository / 'docs/docx-next/stable-uno-binding.json').read_bytes()).hexdigest(), 'Changed native binding manifest'
    return {'scope': 'Live public UNO measurements of the short carrier and two already executed historical pairs; canonical owner IDs resolved before metrics',
            'binding': binding, 'cases': pairs, 'carrierEarlyStop': stopped['earlyStop'], 'historicalEarlyStop': previous['historicalEarlyStop'],
            'newReadonlyNativeLoads': 6, 'newPreparedSources': 0, 'newNativeExports': 0,
            'liveImportedUnoPropertiesMeasured': True, 'liveInternalTransientStagesInstrumented': False,
            'twipGeometryInferredFromPublicWidth': False,
            'causalAcceptance': 'unproven; the public getter re-normalizes existing native widths, and no internal import/export transient stage is instrumented'}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b):
        report.pop('stableComparison', None)
        # ZIP save metadata varies independently. Every actual worker still verifies its input bytes.
        for row in report['cases']: row['phases']['saved'].pop('inputSha256', None)
    assert a == b, 'Changed live native owner, geometry, properties, runtime or measurement scope'
    return {'status': 'pass', 'changedCases': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path); parser.add_argument('--native-uno', required=True, type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); result = audit(args.root, args.native_uno)
    if args.baseline: result['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], result)
    (args.root / 'native-grid-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'readonlyLoads': result['newReadonlyNativeLoads'], 'exports': 0,
                      'getterSeparators': [[None if row['phases'][phase]['tableSeparators'] is None else [v['position'] for v in row['phases'][phase]['tableSeparators']] for phase in ('source', 'saved')] for row in result['cases']],
                      'exactGeometry': [row['exactGeometryAcceptance'] for row in result['cases']]}))
