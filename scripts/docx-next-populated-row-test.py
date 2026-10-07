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


class MainEndingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        self.observed = copy.deepcopy(self.baseline)

    def test_scope_counterexamples_remain_failed_with_two_positive_right_controls(self):
        result = module.compare_baseline(self.baseline, self.observed)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(sum(case['render']['productGates'] == 'pass' for case in self.baseline['cases']), 2)
        for orientation in ('left', 'right'):
            group = [case for case in self.baseline['cases'] if case['diagnostic']['orientation'] == orientation]
            self.assertEqual([case['diagnostic']['scope'] for case in group], ['all-cells', 'main-only'])
            self.assertEqual(group[0]['render'], group[1]['render'])
            self.assertNotEqual(group[0]['docxSha256'], group[1]['docxSha256'])

    def test_positive_right_regression_cannot_be_accepted_as_reviewed_failure(self):
        self.observed['cases'][3]['saveReopen']['productGates'] = 'fail'
        with self.assertRaisesRegex(AssertionError, 'Changed product gate'):
            module.compare_baseline(self.baseline, self.observed)

    def test_changed_left_opening_requires_review(self):
        self.observed['cases'][1]['render']['tracks'][0]['openingCvPages'] = [2] * 5
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, self.observed)

    def test_all_cell_controls_retain_previous_packages_and_observations(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-populated-row-evidence.json').read_text())
        for case in self.baseline['cases']:
            if case['diagnostic']['scope'] != 'all-cells': continue
            before = next(old for old in previous['cases'] if old['fixture'] == case['diagnostic']['orientation'] + '-split-attached-220')
            self.assertEqual(case['docxSha256'], before['docxSha256'])
            for phase in ('render', 'saveReopen'): self.assertEqual(case[phase], before[phase])


class RowTogetherEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-row-together-evidence.json').read_text())

    def test_short_row_flag_alone_has_no_visible_effect(self):
        self.assertTrue(module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))['productGates'].startswith('fail'))
        for orientation in ('left', 'right'):
            group = [case for case in self.baseline['cases'] if case['diagnostic']['orientation'] == orientation]
            self.assertEqual([case['diagnostic']['keepTogether'] for case in group], [True, False])
            self.assertEqual(group[0]['render'], group[1]['render'])
            self.assertEqual(group[0]['saveReopen'], group[1]['saveReopen'])
            self.assertNotEqual(group[0]['docxSha256'], group[1]['docxSha256'])
            self.assertTrue(all(track['fullTextVisible'] for track in group[0]['render']['tracks']))

    def test_together_controls_retain_previous_main_only_packages(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        for case in self.baseline['cases']:
            if not case['diagnostic']['keepTogether']: continue
            before = next(old for old in previous['cases'] if old['fixture'] == case['diagnostic']['orientation'] + '-main-only-220')
            self.assertEqual(case['docxSha256'], before['docxSha256'])
            self.assertEqual(case['render'], before['render'])


class SideTerminalEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-side-terminal-evidence.json').read_text())
        self.observed = copy.deepcopy(self.baseline)

    def test_stopped_counterexample_is_reproduced_without_accepting_export(self):
        result = module.compare_baseline(self.baseline, self.observed)
        self.assertEqual(result['changedCases'], 0)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['plannedCases']), 6)
        self.assertEqual(len(self.baseline['cases']), 2)
        self.assertEqual(len(self.baseline['earlyStop']['unrenderedCases']), 4)
        before, after = self.baseline['cases']
        self.assertEqual(before['render']['productGates'], 'pass')
        self.assertEqual(after['render']['failures'], [{'gate': 'openingAttachment', 'role': 'side'}])
        self.assertEqual(after['render']['tracks'][1]['openingCvPages'], [1, 1, 1, 1, 2])
        self.assertTrue(all(track['fullTextVisible'] for track in after['render']['tracks']))
        for old, saved in zip(after['render']['tracks'], after['saveReopen']['tracks']):
            module.same_metrics(old['metadataMetrics'], saved['metadataMetrics'])
            self.assertEqual({k: v for k, v in old.items() if k != 'metadataMetrics'},
                             {k: v for k, v in saved.items() if k != 'metadataMetrics'})
        self.assertEqual({k: v for k, v in after['render'].items() if k != 'tracks'},
                         {k: v for k, v in after['saveReopen'].items() if k != 'tracks'})

    def test_stopped_baseline_retains_original_positive_right_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        old = next(case for case in previous['cases'] if case['fixture'] == 'right-main-only-220')
        current = self.baseline['cases'][0]
        self.assertEqual(current['docxSha256'], old['docxSha256'])
        self.assertEqual(current['render'], old['render'])
        self.assertEqual(current['saveReopen'], old['saveReopen'])

    def test_unrendered_plan_cannot_silently_change(self):
        self.observed['plannedCases'][-1]['sideEndingKeepNext'] = False
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, self.observed)

    def test_stop_condition_and_case_flags_require_review(self):
        self.observed['earlyStop']['fixture'] = 'right-ending-only-220'
        with self.assertRaisesRegex(AssertionError, 'Changed terminal stop condition'):
            module.compare_baseline(self.baseline, self.observed)
        self.observed = copy.deepcopy(self.baseline)
        self.observed['cases'][1]['diagnostic']['sideSemanticKeepNext'] = False
        with self.assertRaisesRegex(AssertionError, 'Changed candidate flags'):
            module.compare_baseline(self.baseline, self.observed)

    def test_regression_or_native_package_changes_cannot_hide(self):
        self.observed['cases'][1]['saveReopen']['productGates'] = 'pass'
        with self.assertRaisesRegex(AssertionError, 'Changed product gate'):
            module.compare_baseline(self.baseline, self.observed)
        self.observed = copy.deepcopy(self.baseline)
        self.observed['cases'][1]['docxSha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'Changed candidate package'):
            module.compare_baseline(self.baseline, self.observed)

    def test_missing_duplicate_or_expanded_actual_cases_fail(self):
        for cases in [self.observed['cases'][:-1], [self.observed['cases'][0]] * 2,
                      self.observed['cases'] + [self.observed['cases'][0]]]:
            observed = {**self.observed, 'cases': cases}
            with self.assertRaisesRegex(AssertionError, 'Changed bounded matrix'):
                module.compare_baseline(self.baseline, observed)


if __name__ == '__main__': unittest.main()
