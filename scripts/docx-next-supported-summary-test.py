"""Integrity tests use synthetic reports; they do not render or certify a stable engine."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('supported_summary', root / 'docx-next-supported-summary.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SupportedSummaryTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.directory = Path(self.work.name)
        baseline = json.loads((root.parent / 'docs/docx-next/sidebar-supported-refresh-evidence.json').read_text())
        self.renders = copy.deepcopy(baseline['fixtures'])
        self.restored = {'browserNormalizedInputs': 6, 'fixtures': []}
        for row in self.renders:
            row['libreOfficeVersion'] = 'LibreOffice 25.8.7.3 synthetic-test-build'
            row['libreOfficeInterface'] = 'LibreOfficeKit'
            data = ('synthetic package ' + row['fixture']).encode()
            (self.directory / (row['fixture'] + '.docx')).write_bytes(data)
            self.restored['fixtures'].append({'fixture': row['fixture'], 'docxSha256': hashlib.sha256(data).hexdigest(),
                                             'input': 'pass', 'model': 'pass', 'immutable': 'pass'})
        self.manifest = [{'fixture': row['fixture']} for row in self.renders]
        self.identities = {
            'completeNativeText': 'pass', 'fieldIdentityFailures': 0, 'tableIdentityFailures': 0,
            'missingOrChangedTaggedFields': 0, 'architectureAcceptance': 'synthetic bounded identity pass',
            'fixtures': [{'fixture': row['fixture'], 'completeNativeText': 'pass', 'fieldIdentity': 'pass',
                          'tableIdentity': 'pass', 'missingOrChangedTaggedFields': []} for row in self.renders],
        }
        self.write()

    def write(self):
        for name, value in [('manifest.json', self.manifest), ('render-report.json', self.renders),
                            ('json-restoration-report.json', self.restored), ('native-identity-report.json', self.identities)]:
            (self.directory / name).write_text(json.dumps(value))

    def test_complete_synthetic_reports_remain_candidates(self):
        result = module.summarize(self.directory)
        self.assertEqual(result['fixtureCount'], 31)
        self.assertEqual(result['dossierPageCount'], 253)
        self.assertEqual(result['microsoftWord'], 'pending')
        self.assertEqual(result['snapshotApproval'], 'pending')

    def test_missing_or_duplicate_photo_fixture_is_rejected(self):
        self.restored['fixtures'][-1] = copy.deepcopy(self.restored['fixtures'][0])
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Incomplete or reordered'):
            module.summarize(self.directory)

    def test_development_engine_is_rejected(self):
        self.renders[0]['libreOfficeVersion'] = 'LibreOfficeDev 26.8.0.0.alpha0'
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Pinned stable'):
            module.summarize(self.directory)

    def test_photo_package_tampering_is_rejected(self):
        (self.directory / 'sidebar-photo-main.docx').write_bytes(b'changed photo package')
        with self.assertRaisesRegex(AssertionError, 'does not match native source'):
            module.summarize(self.directory)

    def test_page_count_transfer_cannot_hide_changed_fixture(self):
        self.renders[0]['pages'] += 1
        self.renders[1]['pages'] -= 1
        self.write()
        with self.assertRaisesRegex(AssertionError, 'per-fixture pagination'):
            module.summarize(self.directory)

    def test_missing_browser_inputs_and_failed_restoration_are_rejected(self):
        self.restored['browserNormalizedInputs'] = 5
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Missing canonical browser'):
            module.summarize(self.directory)
        self.restored['browserNormalizedInputs'] = 6
        self.restored['fixtures'][0]['immutable'] = 'fail'
        self.write()
        with self.assertRaises(AssertionError):
            module.summarize(self.directory)

    def test_saved_identity_failure_stays_explicit_despite_visible_success(self):
        self.identities['fieldIdentityFailures'] = 1
        self.identities['missingOrChangedTaggedFields'] = 1
        self.identities['fixtures'][0]['fieldIdentity'] = 'fail'
        self.identities['fixtures'][0]['missingOrChangedTaggedFields'] = [{'fieldId': 'lost.native.field'}]
        self.identities['architectureAcceptance'] = 'blocked: saved native identities lost; no export enablement'
        self.write()
        result = module.summarize(self.directory)
        self.assertEqual(result['nativeSemanticIdsAfterSaveReopen']['fieldIdentityFailures'], 1)
        self.assertTrue(result['nativeSemanticIdsAfterSaveReopen']['architectureAcceptance'].startswith('blocked'))

    def test_successful_global_text_summary_cannot_hide_a_native_loss(self):
        self.identities['fixtures'][0]['completeNativeText'] = 'fail'
        self.write()
        with self.assertRaisesRegex(AssertionError, 'Incomplete saved native text'):
            module.summarize(self.directory)


if __name__ == '__main__': unittest.main()
