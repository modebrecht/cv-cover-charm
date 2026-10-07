"""Regression gates for evidence comparison, independent of engine availability."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('stable_compare', root / 'docx-next-stable-sidebar-compare.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EvidenceComparisonTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-cell-ending-evidence.json').read_text())
        self.observed = copy.deepcopy(self.baseline)

    def test_same_packages_and_measurements_match(self):
        result = module.compare_suite(self.baseline, self.observed, 12)
        self.assertEqual(result['changedCases'], 0)
        self.assertEqual(result['stableNegativeOpenings'], 10)

    def test_actual_page_difference_is_recorded_without_changing_baseline(self):
        before = copy.deepcopy(self.baseline)
        for phase in ['render', 'saveReopen']:
            self.observed['cases'][0][phase]['openingCvPages'] = [2] * 5
        result = module.compare_suite(self.baseline, self.observed, 12)
        self.assertEqual(result['changedCases'], 1)
        self.assertEqual(self.baseline, before)

    def test_changed_source_package_is_not_an_engine_difference(self):
        self.observed['cases'][0]['docxSha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'Changed candidate package'):
            module.compare_suite(self.baseline, self.observed, 12)

    def test_missing_full_text_still_fails_in_observation_mode(self):
        self.observed['cases'][0]['saveReopen']['fullTextVisible'] = False
        with self.assertRaisesRegex(AssertionError, 'Lost full text'):
            module.compare_suite(self.baseline, self.observed, 12)

    def test_missing_or_duplicate_controls_fail(self):
        for cases in [self.observed['cases'][:-1], [self.observed['cases'][0]] * 12]:
            with self.assertRaisesRegex(AssertionError, 'Changed observation matrix'):
                module.compare_suite(self.baseline, {'cases': cases}, 12)

    def test_glyph_geometry_difference_is_visible(self):
        self.observed['cases'][0]['render']['metadataMetrics'][0]['widthPt'] += 1
        result = module.compare_suite(self.baseline, self.observed, 12)
        self.assertEqual(result['changedCases'], 1)
        self.assertEqual(result['cases'][0]['differences'][0]['metric'], 'widthPt')

    def test_existing_nested_ownership_checkpoint_is_supported(self):
        recorded = json.loads((root.parent / 'docs/docx-next/sidebar-body-attachment-evidence.json').read_text())
        result = module.compare_suite(recorded, copy.deepcopy(recorded['diagnostics']), 24)
        self.assertEqual(result['changedCases'], 0)
        self.assertEqual(result['stableNegativeOpenings'], 10)


if __name__ == '__main__':
    unittest.main()
