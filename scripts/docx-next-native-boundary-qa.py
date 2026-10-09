"""Keep first-cell public conversion counterevidence separate from three original missing-tag imports."""
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


native = module('native-grid-qa'); history = native.history; W = history.W
CANONICAL = ['diagnostic.first', 'diagnostic.after']


def package_controls(document):
    parents = {child: parent for parent in document.iter() for child in parent}
    controls = {}
    for control in document.iter(W + 'sdt'):
        props = control.find(W + 'sdtPr'); tag = props.find(W + 'tag')
        assert tag is not None and tag.get(W + 'val'), 'Missing package canonical tag'
        key = tag.get(W + 'val'); assert key not in controls, 'Duplicated package canonical tag'
        content = control.find(W + 'sdtContent'); assert content is not None
        controls[key] = {'properties': [child.tag.removeprefix(W) for child in props],
                         'contentElements': [child.tag.removeprefix(W) for child in content],
                         'parentElement': parents[control].tag.removeprefix(W),
                         'text': ''.join(child.text or '' for child in content.iter(W + 't'))}
    return controls


def import_pair(source, saved, phases):
    documents = {'source': history.document(source), 'saved': history.document(saved)}
    packages = {phase: package_controls(document) for phase, document in documents.items()}
    assert packages['source'].keys() == packages['saved'].keys(), 'Changed complete serialized tag inventory'
    for phase, path in (('source', source), ('saved', saved)):
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        native.validate_snapshot(phases[phase], phases[phase]['canonicalOwnerFieldIds'], sha)
        assert set(phases[phase]['liveCanonicalTags']) <= packages[phase].keys(), 'Unexpected native tag'
    source_tags, saved_tags = (phases[phase]['liveCanonicalTags'] for phase in ('source', 'saved'))
    assert set(source_tags) == packages['source'].keys(), 'Original source native controls are incomplete'
    missing = [tag for tag in source_tags if tag not in saved_tags]
    assert [tag for tag in source_tags if tag not in missing] == saved_tags, 'Changed remaining native registry order'
    canonical = phases['source']['canonicalOwnerFieldIds']; assert phases['saved']['canonicalOwnerFieldIds'] == canonical
    assert missing == canonical[:1], 'Changed original missing-first-control boundary'
    first = canonical[0]
    assert packages['source'][first]['contentElements'] == ['p'] and packages['source'][first]['parentElement'] == 'tc'
    assert packages['saved'][first]['contentElements'] == ['r', 'r'] and packages['saved'][first]['parentElement'] == 'p'
    assert packages['source'][first]['properties'] == ['alias', 'tag']
    assert packages['saved'][first]['properties'] == ['alias', 'tag', 'text']
    assert packages['source'][first]['text'] == packages['saved'][first]['text'], 'Changed serialized first-control text'
    table_heads = []
    for table in documents['source'].iter(W + 'tbl'):
        ids = history.ids(table)
        if not ids: continue
        matches = [candidate for candidate in documents['saved'].iter(W + 'tbl') if history.ids(candidate) == ids]
        assert len(matches) == 1, 'Changed full saved table identity'
        table_heads.append({'canonicalTableIds': ids, 'firstTag': ids[0], 'savedNativePresent': ids[0] in saved_tags})
    assert all(row['savedNativePresent'] == (row['firstTag'] != first) for row in table_heads)
    return {'sourceInputSha256': phases['source']['inputSha256'], 'savedInputSha256': phases['saved']['inputSha256'],
            'canonicalOwnerFieldIds': canonical, 'serializedTagCount': len(packages['source']),
            'sourceNativeTagCount': len(source_tags), 'savedNativeTagCount': len(saved_tags),
            'missingNativeTags': missing, 'remainingNativeRegistryOrderPreserved': True,
            'nativeRegistryOrderIsDocumentOrder': source_tags == list(packages['source']),
            'firstControl': {phase: packages[phase][first] for phase in ('source', 'saved')},
            'allTaggedTables': table_heads,
            'savedOwnerResolution': phases['saved']['ownerResolution'],
            'savedOwnerMetricsWithheld': all(phases['saved'][key] is None for key in
                 ('nativeOwnerName', 'canonicalFieldAncestry', 'widthMm100', 'relativeSum', 'tableSeparators', 'rowSeparators', 'cellNames'))}


def validate_model(model):
    assert model['newInMemoryDocuments'] == 2 and model['existingDocumentLoads'] == 0
    assert model['newPreparedSources'] == model['newNativeExports'] == model['originalPackagesModified'] == 0
    assert model['loadOptions'] == {'Hidden': True, 'MacroExecutionMode': 0, 'UpdateDocMode': 0}
    assert model['internalImportStartIndexMeasured'] is False and model['internalNodeSplitInstrumented'] is False
    assert model['causalAcceptance'] == 'unproven: this public conversion model retains both global native tags; it does not reproduce the original saved-package missing tag'
    assert len(model['cases']) == 2
    for steps, case in enumerate(model['cases']):
        assert case['requestedPublicCursorSteps'] == steps and type(case['requestedPublicCursorSteps']) is int
        assert case['prefixText'] == '' and case['selectedText'] == case['tableCellText'] == 'alpha'
        assert case['bodyBefore'] == 'alpha\nbeta' and case['bodyAfter'] == ('beta' if steps == 0 else '\nalpha\nbeta')
        assert case['hasLocation'] is False and case['modified'] is True
        assert case['before'] == [{'tag': CANONICAL[0], 'text': 'alpha', 'table': None, 'cell': None},
                                  {'tag': CANONICAL[1], 'text': 'beta', 'table': None, 'cell': None}]
        assert [row['tag'] for row in case['after']] == CANONICAL, 'Conversion model must retain both global controls'
        assert case['after'][1] == case['before'][1]
        assert len(case['nativeTableNames']) == 1 and len(set(case['nativeTableNames'])) == 1
        try:
            owner, ancestry = native.worker.canonical_owner(CANONICAL[:1], case['after'], case['nativeTableNames'], {})
            resolution = {'status': 'pass', 'name': owner, 'ancestry': ancestry}
        except AssertionError as error: resolution = {'status': 'fail', 'reason': str(error)}
        assert case['completeOwnerResolution'] == resolution, 'Changed complete boundary owner resolution'
        if steps == 0:
            assert resolution['status'] == 'pass'
            assert case['after'][0] == {'tag': CANONICAL[0], 'text': 'alpha', 'table': owner, 'cell': 'A1'}
        else:
            assert resolution['status'] == 'fail'
            assert case['after'][0] == {'tag': CANONICAL[0], 'text': '', 'table': None, 'cell': None}, 'Empty body anchor cannot be accepted as table ownership'


def audit(root, binding_directory):
    repository = Path(__file__).resolve().parent.parent
    original = json.loads((root / 'native-grid-report.json').read_text())
    baseline = json.loads((repository / 'docs/docx-next/sidebar-native-grid-evidence.json').read_text())['stable']
    native.compare_baseline(baseline, original)
    pairs = []
    inputs = {}
    for row in original['cases']:
        folder = 'carrier-story' if row['fixture'].startswith('carrier-story-') else 'continuous-cell'
        prefix = root / folder / row['fixture']
        pair = import_pair(prefix.with_suffix('.docx'), prefix.with_name(prefix.name + '-saved.docx'), row['phases'])
        pair['fixture'] = row['fixture']; pairs.append(pair)
        for path in (prefix.with_suffix('.docx'), prefix.with_name(prefix.name + '-saved.docx')):
            inputs[path] = hashlib.sha256(path.read_bytes()).hexdigest()
    record = json.loads((binding_directory / 'binding-record.json').read_text())
    assert record['bindingManifestSha256'] == hashlib.sha256((repository / 'docs/docx-next/stable-uno-binding.json').read_bytes()).hexdigest()
    assert record['workerSha256'] == hashlib.sha256((repository / 'scripts/docx-next-native-grid-worker.py').read_bytes()).hexdigest()
    for key in ('packageManifestSha256', 'fontManifestSha256', 'adapterSha256', 'version'):
        assert record['engine'][key] == original['binding']['engine'][key], 'Different native model engine identity'
    runtime = binding_directory / 'binding'
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime'))
    assert json.loads((engine / 'runtime-record.json').read_text()) == record['engine']
    env = os.environ.copy()
    program = engine / 'usr/lib/libreoffice/program'
    env.update(LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(runtime / 'usr/lib/libreoffice/program'), str(runtime / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(runtime), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    worker_path = repository / 'scripts/docx-next-native-boundary-worker.py'
    assert sys.version_info[:2] == (3, 12)
    process = subprocess.run([sys.executable, str(worker_path)], capture_output=True, text=True, env=env, timeout=30)
    assert process.returncode == 0, 'Native boundary model failed: ' + process.stderr
    assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US'), 'Unexpected native boundary diagnostics: ' + process.stderr
    model = json.loads(process.stdout); validate_model(model)
    assert all(hashlib.sha256(path.read_bytes()).hexdigest() == sha for path, sha in inputs.items()), 'Native boundary model changed an original package'
    assert model['version'] == record['engine']['version'], 'Changed actual boundary engine'
    return {'scope': 'Two unsaved synthetic public UNO conversion models, separate from three unchanged original imported source/saved pairs',
            'binding': record, 'originalImportBinding': original['binding'], 'workerSha256': hashlib.sha256(worker_path.read_bytes()).hexdigest(),
            'originalImports': pairs, 'publicConversionModel': model,
            'newReadonlyNativeLoads': 0, 'newInMemoryDocuments': 2, 'newPreparedSources': 0, 'newNativeExports': 0,
            'originalPackagesModified': 0, 'nativeGeometryAcceptance': 'unchanged fail', 'productionAcceptance': 'blocked',
            'originalImportStartPositionInstrumented': False,
            'causalAcceptance': 'unproven: first-cell conversion can orphan a control but does not reproduce its absence from the original native global supplier'}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for report in (a, b):
        report.pop('stableComparison', None)
        # Only saved ZIP metadata varies; import_pair verifies the actual input SHA against the measured native snapshot.
        for row in report['originalImports']: row.pop('savedInputSha256', None)
    assert a == b, 'Changed native boundary model, original import inventory, binding or causal scope'
    return {'status': 'pass', 'changedCases': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path); parser.add_argument('--binding', required=True, type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args(); result = audit(args.root, args.binding)
    if args.baseline:
        result['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], result)
    (args.root / 'native-boundary-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'originalImportPairs': len(result['originalImports']), 'newInMemoryDocuments': 2, 'newNativeExports': 0,
                      'causalAcceptance': result['causalAcceptance'], 'stableComparison': result.get('stableComparison')}, indent=2))
