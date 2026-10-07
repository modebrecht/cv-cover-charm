"""Protect renderer-failure evidence from silently becoming acceptance."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('populated_qa', root / 'docx-next-populated-row-qa.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PopulatedEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-populated-row-evidence.json').read_text())
        self.observed = copy.deepcopy(self.baseline)

    def test_reproduced_counterexamples_do_not_become_product_acceptance(self):
        result = module.compare_baseline(self.baseline, self.observed)
        self.assertEqual(result['changedCases'], 0)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(sum(case['render']['productGates'] == 'pass' for case in self.baseline['cases']), 1)

    def test_changed_source_package_requires_review(self):
        self.observed['cases'][0]['docxSha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'Changed candidate package'):
            module.compare_baseline(self.baseline, self.observed)

    def test_changed_text_visibility_cannot_hide_as_the_same_engine_result(self):
        self.observed['cases'][2]['render']['tracks'][0]['fullTextVisible'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, self.observed)

    def test_missing_or_duplicate_cases_fail(self):
        for cases in [self.observed['cases'][:-1], [self.observed['cases'][0]] * 4]:
            with self.assertRaisesRegex(AssertionError, 'Changed bounded matrix'):
                module.compare_baseline(self.baseline, {'cases': cases})


if __name__ == '__main__': unittest.main()
