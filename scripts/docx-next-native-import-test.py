"""Reject fabricated creation, disposal, sparse coverage and relaxed native baselines."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest


spec = importlib.util.spec_from_file_location('import_qa', Path(__file__).with_name('docx-next-native-import-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


class NativeImportTest(unittest.TestCase):
    def setUp(self):
        docs = Path(__file__).resolve().parent.parent / 'docs/docx-next'
        self.report = json.loads((docs / 'sidebar-native-import-evidence.json').read_text())['local']
        self.measurement = copy.deepcopy(self.report['measurement'])
        self.original = json.loads((docs / 'sidebar-native-grid-evidence.json').read_text())['stable']
        # Actual ZIP digests are checked against input files by audit; use measured digests in adversarial tests.
        for case in self.measurement['cases']:
            self.original['cases'][qa.FIXTURES.index(case['fixture'])]['phases'][case['phase']]['inputSha256'] = case['inputSha256']
        self.packages = self.report['originalPackageInputs']

    def validate(self): return qa.validate_measurement(self.measurement, self.original, self.packages)

    def test_actual_disposal_remains_distinct_from_sparse_imports(self):
        self.assertEqual(self.validate(), self.report['summaries'])
        self.assertEqual(self.measurement['cases'][1]['events'][77]['count'], 69)
        self.assertEqual(self.measurement['cases'][1]['events'][78]['count'], 76)
        self.assertIsNone(self.report['summaries'][3]['firstObservedEvent'])

    def test_payload_cannot_rescue_empty_body_anchor(self):
        self.measurement['cases'][1]['events'][31]['firstControl'].update(text='Kontakt', table='Table7', cell='A1')
        with self.assertRaisesRegex(AssertionError, 'empty body paragraph'): self.validate()

    def test_first_tag_must_be_absent_at_registered_paragraph_disposal(self):
        case = self.measurement['cases'][1]; event = case['events'][78]
        event['tags'].append(case['canonicalOwnerFieldIds'][0]); event['count'] += 1
        with self.assertRaises(AssertionError): self.validate()

    def test_last_progress_is_not_final_import(self):
        case = self.measurement['cases'][1]; case['events'][-1] = copy.deepcopy(case['events'][77]); case['events'][-1]['event'] = 'end'
        with self.assertRaisesRegex(AssertionError, 'returned import'): self.validate()

    def test_listener_requires_canonical_anchor(self):
        self.measurement['cases'][1]['paragraphDisposalRegistration'].update(canonicalTag='cover.eyebrow')
        with self.assertRaises(AssertionError): self.validate()

    def test_sparse_progress_cannot_claim_unseen_control_or_disposal(self):
        self.measurement['cases'][3]['paragraphDisposalRegistration'] = copy.deepcopy(self.measurement['cases'][1]['paragraphDisposalRegistration'])
        with self.assertRaisesRegex(AssertionError, 'unsampled first control'): self.validate()

    def test_callback_errors_duplicates_and_unknown_tags_are_fatal(self):
        for kind in ('error', 'duplicate', 'unknown'):
            measurement = copy.deepcopy(self.measurement); event = measurement['cases'][1]['events'][31]
            if kind == 'error': event['error'] = 'DisposedException'
            else:
                event['tags'].append(event['tags'][0] if kind == 'duplicate' else 'invented'); event['count'] += 1
            with self.assertRaises(AssertionError): qa.validate_measurement(measurement, self.original, self.packages)

    def test_original_imports_cannot_be_mutations_exports_or_boolean_counts(self):
        for key, value in (('newReadonlyNativeLoads', 6.0), ('newNativeExports', False), ('originalPackagesModified', 1)):
            measurement = copy.deepcopy(self.measurement); measurement[key] = value
            with self.assertRaisesRegex(AssertionError, 'scope/count'): qa.validate_measurement(measurement, self.original, self.packages)
        self.measurement['cases'][1]['modified'] = True
        with self.assertRaisesRegex(AssertionError, 'read-only'): self.validate()

    def test_public_callbacks_cannot_claim_internal_guard_or_call(self):
        for key in ('internalStartCursorMeasured', 'internalDummyGuardMeasured', 'exactDetachmentCallMeasured'):
            measurement = copy.deepcopy(self.measurement); measurement[key] = True
            with self.assertRaisesRegex(AssertionError, 'internal call trace'): qa.validate_measurement(measurement, self.original, self.packages)

    def test_strict_baseline_keeps_types_observations_and_source_bytes(self):
        changed = copy.deepcopy(self.report); changed['measurement']['cases'][1]['inputSha256'] = 'ZIP metadata'
        changed['originalPackageInputs'][1]['sha256'] = 'ZIP metadata'
        self.assertEqual(qa.compare_baseline(self.report, changed)['changedCases'], 0)
        changes = [lambda r: r['measurement']['cases'][0].update(inputSha256='changed'),
                   lambda r: r['measurement']['cases'][1]['events'][78].update(event='end'),
                   lambda r: r['measurement'].update(newNativeExports=False),
                   lambda r: r['measurement']['cases'][1]['finalControls'][0].update(text='lost'),
                   lambda r: r.update(causalAcceptance='proven')]
        for change in changes:
            changed = copy.deepcopy(self.report); change(changed)
            with self.assertRaisesRegex(AssertionError, 'Changed original native import'): qa.compare_baseline(self.report, changed)


if __name__ == '__main__': unittest.main()
