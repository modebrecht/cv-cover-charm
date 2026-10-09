"""Adversarial canonical ownership and read-only live evidence boundaries; no synthetic acceptance."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


worker = module('native-grid-worker'); qa = module('native-grid-qa')


class NativeGridTest(unittest.TestCase):
    def setUp(self):
        self.canonical = ['cv.side', 'cv.main', 'cv.entry']
        self.controls = [{'tag': 'cover.title', 'table': None, 'cell': None},
                         {'tag': 'cv.side', 'table': 'generated-owner', 'cell': 'A1'},
                         {'tag': 'cv.main', 'table': 'generated-owner', 'cell': 'C1'},
                         {'tag': 'cv.entry', 'table': 'generated-entry', 'cell': 'B1'}]
        self.tables = ['unrelated', 'generated-entry', 'generated-owner']
        self.parents = {'generated-entry': {'table': 'generated-owner', 'cell': 'C1'}}

    def resolve(self): return worker.canonical_owner(self.canonical, self.controls, self.tables, self.parents)

    def test_complete_canonical_inventory_resolves_nested_native_ancestry(self):
        owner, ancestry = self.resolve()
        self.assertEqual(owner, 'generated-owner')
        self.assertEqual(ancestry[-1]['ancestry'], [{'table': 'generated-owner', 'cell': 'C1'}, {'table': 'generated-entry', 'cell': 'B1'}])

    def test_table_ordinal_and_display_name_do_not_select_owner(self):
        self.tables.reverse()
        self.assertEqual(self.resolve()[0], 'generated-owner')
        self.tables = ['unrelated', 'generated-entry', 'generated-owner']
        self.controls[1]['table'] = 'unrelated'
        with self.assertRaisesRegex(AssertionError, 'complete native owner'): self.resolve()

    def test_missing_first_native_tag_cannot_use_partial_owner_or_package_ids(self):
        self.controls.pop(1)
        with self.assertRaisesRegex(AssertionError, 'Missing live canonical tag'): self.resolve()

    def test_reordered_full_native_ids_fail(self):
        self.controls[1], self.controls[2] = self.controls[2], self.controls[1]
        with self.assertRaisesRegex(AssertionError, 'complete native owner'): self.resolve()

    def test_extra_native_owner_tag_cannot_be_ignored(self):
        self.controls.append({'tag': 'cv.unexpected', 'table': 'generated-owner', 'cell': 'A1'})
        with self.assertRaisesRegex(AssertionError, 'complete native owner'): self.resolve()

    def test_duplicate_canonical_tag_or_table_name_fails(self):
        self.controls.append(dict(self.controls[-1]))
        with self.assertRaisesRegex(AssertionError, 'Duplicated live canonical'): self.resolve()
        self.controls.pop(); self.tables.append(self.tables[-1])
        with self.assertRaisesRegex(AssertionError, 'Duplicated live table'): self.resolve()

    def test_same_full_inventory_in_nested_wrapper_is_ambiguous(self):
        self.tables.append('wrapper'); self.parents['generated-owner'] = {'table': 'wrapper', 'cell': 'A1'}
        with self.assertRaisesRegex(AssertionError, 'ambiguous complete native owner'): self.resolve()

    def test_unknown_parent_or_cyclic_ancestry_fails(self):
        self.parents['generated-entry']['table'] = 'unknown'
        with self.assertRaisesRegex(AssertionError, 'Unknown native parent'): self.resolve()
        self.parents['generated-entry']['table'] = 'generated-owner'
        self.parents['generated-owner'] = {'table': 'generated-entry', 'cell': 'A1'}
        with self.assertRaisesRegex(AssertionError, 'cyclic ancestry'): self.resolve()

    def test_malformed_canonical_request_fails_before_native_load(self):
        for canonical in ([], ['cv.side', 'cv.side'], [''], [1], 'cv.side'):
            with self.assertRaisesRegex(AssertionError, 'canonical owner inventory'): worker.validate_canonical(canonical)

    def test_changed_input_hash_fails_before_importing_uno(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); source = root / 'source.docx'; source.write_bytes(b'original bytes')
            request = root / 'request.json'
            request.write_text(json.dumps({'path': str(source), 'sha256': 'wrong', 'canonicalOwnerFieldIds': ['cv.side']}))
            result = subprocess.run([sys.executable, str(Path(worker.__file__)), str(request)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0); self.assertIn('Changed native input bytes before loading', result.stderr)
            self.assertNotIn('import uno', result.stderr); self.assertEqual(source.read_bytes(), b'original bytes')

    def measured(self, missing=False):
        controls = copy.deepcopy(self.controls)
        if missing: controls.pop(1)
        try:
            owner, ancestry = worker.canonical_owner(self.canonical, controls, self.tables, self.parents)
            resolution = {'status': 'pass'}
        except AssertionError as error:
            owner, ancestry = None, None; resolution = {'status': 'fail', 'reason': str(error)}
        return {'inputSha256': 'original', 'readOnly': True, 'modified': False, 'newNativeExports': 0,
                'loadOptions': {'Hidden': True, 'ReadOnly': True, 'MacroExecutionMode': 0, 'UpdateDocMode': 0},
                'canonicalOwnerFieldIds': self.canonical, 'ownerResolution': resolution,
                'nativeTableCount': len(self.tables), 'nativeTableNames': self.tables, 'nativeParents': self.parents,
                'nativeControlAncestryInputs': controls, 'liveCanonicalTags': [row['tag'] for row in controls],
                'nativeOwnerName': owner, 'canonicalFieldAncestry': ancestry,
                'relativeSum': None if missing else 10000, 'widthMm100': None if missing else 16999,
                'tableSeparators': None if missing else [{'position': 2893, 'visible': True}, {'position': 3246, 'visible': True}],
                'rowSeparators': None if missing else [], 'cellNames': None if missing else ['A1', 'B1', 'C1'], 'twipGeometryAvailable': False}

    def test_missing_owner_never_authorizes_metric_or_ordinal_fallback(self):
        result = self.measured(True); qa.validate_snapshot(result, self.canonical, 'original')
        for key, value in (('widthMm100', 16999), ('nativeOwnerName', 'generated-owner'), ('tableSeparators', [])):
            changed = copy.deepcopy(result); changed[key] = value
            with self.assertRaisesRegex(AssertionError, 'Metrics cannot precede'): qa.validate_snapshot(changed, self.canonical, 'original')

    def test_readonly_flags_and_original_bytes_are_required(self):
        result = self.measured(); qa.validate_snapshot(result, self.canonical, 'original')
        for key, value in (('inputSha256', 'changed'), ('readOnly', False), ('modified', True), ('newNativeExports', 1), ('twipGeometryAvailable', True)):
            changed = copy.deepcopy(result); changed[key] = value
            with self.assertRaises(AssertionError): qa.validate_snapshot(changed, self.canonical, 'original')

    def test_malformed_or_changed_native_property_and_ancestry_evidence_fails(self):
        result = self.measured()
        changes = [lambda r: r.update(relativeSum=True), lambda r: r.update(widthMm100=-1),
                   lambda r: r['tableSeparators'][0].update(position=True), lambda r: r['tableSeparators'][0].update(visible=1),
                   lambda r: r.update(canonicalFieldAncestry=[]), lambda r: r['loadOptions'].update(MacroExecutionMode=4)]
        for change in changes:
            changed = copy.deepcopy(result); change(changed)
            with self.assertRaises(AssertionError): qa.validate_snapshot(changed, self.canonical, 'original')

    def test_getter_normalization_is_distinct_from_import_separators(self):
        model = qa.getter_model({'grid': [2789, 340, 6508], 'preferredWidthTwips': 9637})
        self.assertEqual(model['importArithmetic']['roundedRelativeSeparators'], [2894, 3247])
        self.assertEqual(model['predictedPublicGetterSeparators'], [2893, 3246])
        self.assertIn('not sampled', model['scope'])

    def test_historical_preferred_width_is_not_replaced_with_grid_sum(self):
        model = qa.getter_model({'grid': [6508, 340, 2789], 'preferredWidthTwips': 9638})
        self.assertEqual(model['importArithmetic']['sourcePreferredMinusGridTwips'], 1)
        self.assertEqual(model['predictedPublicGetterSeparators'], [6752, 7105])

    def test_strict_baseline_keeps_missing_owner_and_all_scope_fields(self):
        report = {'cases': [{'phases': {'source': {'inputSha256': 'source', 'tableSeparators': [2893, 3246]},
                            'saved': {'inputSha256': 'saved zip metadata', 'ownerResolution': {'status': 'fail'}, 'tableSeparators': None}}, 'exactGeometryAcceptance': 'fail'}],
                  'newReadonlyNativeLoads': 6, 'newPreparedSources': 0, 'newNativeExports': 0,
                  'liveImportedUnoPropertiesMeasured': True, 'liveInternalTransientStagesInstrumented': False,
                  'twipGeometryInferredFromPublicWidth': False, 'causalAcceptance': 'unproven', 'binding': {'workerSha256': 'pinned'}}
        changed = copy.deepcopy(report); changed['cases'][0]['phases']['saved']['inputSha256'] = 'different zip metadata'
        self.assertEqual(qa.compare_baseline(report, changed)['changedCases'], 0)
        changes = [(lambda r: r['cases'][0]['phases']['source'].update(inputSha256='different source')),
                   (lambda r: r['cases'][0]['phases']['saved'].update(ownerResolution={'status': 'pass'})),
                   (lambda r: r['cases'][0]['phases']['saved'].update(tableSeparators=[2891, 3246])),
                   (lambda r: r['cases'][0].update(exactGeometryAcceptance='pass'))]
        for key in set(report) - {'cases'}: changes.append(lambda r, key=key: r.update({key: 'changed'}))
        for change in changes:
            changed = copy.deepcopy(report); change(changed)
            with self.assertRaisesRegex(AssertionError, 'Changed live native'): qa.compare_baseline(report, changed)


if __name__ == '__main__': unittest.main()
