"""Adversarial checks against confusing orphaned model anchors with missing original native tags."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
from xml.etree import ElementTree as ET


spec = importlib.util.spec_from_file_location('boundary', Path(__file__).with_name('docx-next-native-boundary-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


class NativeBoundaryTest(unittest.TestCase):
    def setUp(self):
        evidence = Path(__file__).resolve().parent.parent / 'docs/docx-next/sidebar-native-boundary-evidence.json'
        self.report = json.loads(evidence.read_text())['local']
        self.model = copy.deepcopy(self.report['publicConversionModel'])

    def test_actual_public_conversion_counterexample_keeps_global_tags(self):
        qa.validate_model(self.model)
        self.assertEqual(self.model['cases'][1]['after'][0]['text'], '')
        self.assertEqual(self.model['cases'][1]['completeOwnerResolution']['status'], 'fail')
        self.assertEqual(self.model['cases'][0]['completeOwnerResolution']['status'], 'pass')

    def test_orphan_model_cannot_be_changed_to_original_missing_tag(self):
        self.model['cases'][1]['after'].pop(0)
        with self.assertRaisesRegex(AssertionError, 'retain both global'): qa.validate_model(self.model)

    def test_visible_cell_text_cannot_rescue_empty_body_control(self):
        self.model['cases'][1]['after'][0].update(table='Table1', cell='A1')
        with self.assertRaises(AssertionError): qa.validate_model(self.model)

    def test_generated_name_and_claimed_owner_cannot_rescue_negative(self):
        self.model['cases'][1]['completeOwnerResolution'] = copy.deepcopy(self.model['cases'][0]['completeOwnerResolution'])
        with self.assertRaisesRegex(AssertionError, 'complete boundary owner'): qa.validate_model(self.model)

    def test_model_must_keep_complete_other_control_and_payload(self):
        for change in (lambda m: m['cases'][1]['after'][1].update(text='lost'),
                       lambda m: m['cases'][0].update(tableCellText='truncated'),
                       lambda m: m['cases'][1].update(prefixText='a'),
                       lambda m: m['cases'][1].update(requestedPublicCursorSteps=True)):
            model = copy.deepcopy(self.model); change(model)
            with self.assertRaises(AssertionError): qa.validate_model(model)

    def test_unsaved_models_cannot_be_reported_as_readonly_original_loads_or_exports(self):
        for key in ('existingDocumentLoads', 'newPreparedSources', 'newNativeExports', 'originalPackagesModified'):
            model = copy.deepcopy(self.model); model[key] = 1
            with self.assertRaises(AssertionError): qa.validate_model(model)
        self.model['cases'][0]['hasLocation'] = True
        with self.assertRaises(AssertionError): qa.validate_model(self.model)

    def test_native_model_cannot_claim_original_import_position_or_node_split(self):
        for key in ('internalImportStartIndexMeasured', 'internalNodeSplitInstrumented'):
            model = copy.deepcopy(self.model); model[key] = True
            with self.assertRaises(AssertionError): qa.validate_model(model)
        self.model['causalAcceptance'] = 'proven'
        with self.assertRaises(AssertionError): qa.validate_model(self.model)

    def test_no_macro_or_update_execution_in_memory_factory(self):
        for key in ('MacroExecutionMode', 'UpdateDocMode'):
            model = copy.deepcopy(self.model); model['loadOptions'][key] = 4
            with self.assertRaises(AssertionError): qa.validate_model(model)

    def test_package_inventory_rejects_duplicate_or_missing_canonical_ids(self):
        w = qa.W
        document = ET.Element(w + 'document')
        for tag in ('same', 'same'):
            sdt = ET.SubElement(document, w + 'sdt'); props = ET.SubElement(sdt, w + 'sdtPr')
            ET.SubElement(props, w + 'tag').set(w + 'val', tag); ET.SubElement(sdt, w + 'sdtContent')
        with self.assertRaisesRegex(AssertionError, 'Duplicated package'): qa.package_controls(document)
        list(document)[1].find(w + 'sdtPr/' + w + 'tag').attrib.clear()
        with self.assertRaisesRegex(AssertionError, 'Missing package'): qa.package_controls(document)

    def test_actual_original_boundary_is_distinct_and_nested_heads_survive(self):
        pairs = self.report['originalImports']
        self.assertEqual([row['serializedTagCount'] for row in pairs], [77, 41, 41])
        self.assertEqual([row['savedNativeTagCount'] for row in pairs], [76, 40, 40])
        self.assertEqual(pairs[0]['firstControl']['saved']['text'], 'Kontakt')
        self.assertFalse(pairs[0]['nativeRegistryOrderIsDocumentOrder'])
        self.assertTrue(all(row['remainingNativeRegistryOrderPreserved'] and row['savedOwnerMetricsWithheld'] for row in pairs))
        self.assertEqual(sum(row['savedNativePresent'] for row in pairs[0]['allTaggedTables']), 6)

    def test_strict_baseline_keeps_all_model_original_binding_and_scope_values(self):
        changed = copy.deepcopy(self.report)
        changed['originalImports'][0]['savedInputSha256'] = 'different zip metadata'
        self.assertEqual(qa.compare_baseline(self.report, changed)['changedCases'], 0)
        changes = [lambda r: r['originalImports'][0].update(sourceInputSha256='changed'),
                   lambda r: r['originalImports'][0].update(remainingNativeRegistryOrderPreserved=False),
                   lambda r: r['originalImports'][0]['allTaggedTables'][1].update(savedNativePresent=False),
                   lambda r: r['publicConversionModel']['cases'][1]['after'][0].update(text='alpha')]
        for key in set(self.report) - {'originalImports', 'publicConversionModel'}:
            changes.append(lambda r, key=key: r.update({key: 'changed'}))
        for change in changes:
            changed = copy.deepcopy(self.report); change(changed)
            with self.assertRaisesRegex(AssertionError, 'Changed native boundary'): qa.compare_baseline(self.report, changed)


if __name__ == '__main__': unittest.main()
