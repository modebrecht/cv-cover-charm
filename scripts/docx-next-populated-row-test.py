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


class SideEndingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-side-ending-evidence.json').read_text())
        self.observed = copy.deepcopy(self.baseline)

    def test_empty_side_ending_alone_does_not_change_the_reviewed_results(self):
        result = module.compare_baseline(self.baseline, self.observed)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 4)
        for start, orientation in ((0, 'right'), (2, 'left')):
            a, b = self.baseline['cases'][start:start + 2]
            self.assertFalse(a['diagnostic']['sideSemanticKeepNext'])
            self.assertFalse(b['diagnostic']['sideSemanticKeepNext'])
            self.assertEqual(a['render'], b['render'])
            self.assertEqual(a['saveReopen'], b['saveReopen'])
            self.assertEqual(a['render']['productGates'], 'pass' if orientation == 'right' else 'fail')
            self.assertNotEqual(a['docxSha256'], b['docxSha256'])

    def test_detached_controls_retain_original_main_only_packages(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        for current in self.baseline['cases']:
            if current['diagnostic']['sideEndingKeepNext']: continue
            old = next(case for case in previous['cases'] if case['fixture'] == current['diagnostic']['orientation'] + '-main-only-220')
            self.assertEqual(current['docxSha256'], old['docxSha256'])
            self.assertEqual(current['render'], old['render'])
            self.assertEqual(current['saveReopen'], old['saveReopen'])

    def test_semantic_attachment_and_right_regression_cannot_hide(self):
        self.observed['plannedCases'][1]['sideSemanticKeepNext'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, self.observed)
        self.observed = copy.deepcopy(self.baseline)
        self.observed['cases'][1]['saveReopen']['productGates'] = 'fail'
        with self.assertRaisesRegex(AssertionError, 'Changed product gate'):
            module.compare_baseline(self.baseline, self.observed)

    def test_changed_left_opening_requires_review(self):
        self.observed['cases'][3]['render']['tracks'][0]['openingCvPages'] = [2] * 5
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, self.observed)


class LeadTogetherEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-lead-together-evidence.json').read_text())

    def test_lead_row_cantsplit_alone_has_no_observed_effect(self):
        self.assertTrue(module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))['productGates'].startswith('fail'))
        for start, orientation in ((0, 'right'), (2, 'left')):
            a, b = self.baseline['cases'][start:start + 2]
            self.assertEqual(a['render'], b['render'])
            self.assertEqual(a['saveReopen'], b['saveReopen'])
            self.assertNotEqual(a['docxSha256'], b['docxSha256'])
            self.assertEqual(a['render']['productGates'], 'pass' if orientation == 'right' else 'fail')

    def test_lead_control_retains_original_ownership_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        for current in self.baseline['cases']:
            if not current['diagnostic']['leadKeepTogether']: continue
            old = next(case for case in previous['cases'] if case['fixture'] == current['diagnostic']['orientation'] + '-main-only-220')
            self.assertEqual(current['docxSha256'], old['docxSha256'])
            self.assertEqual(current['render'], old['render'])

    def test_changed_lead_flag_or_native_bytes_require_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['cases'][1]['diagnostic']['leadKeepTogether'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed candidate flags'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][1]['docxSha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'Changed candidate package'):
            module.compare_baseline(self.baseline, observed)


class LeadPaddingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-lead-padding-evidence.json').read_text())

    def test_padding_counterexample_stops_before_left_controls(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertEqual(result['changedCases'], 0)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['plannedCases']), 4)
        self.assertEqual(len(self.baseline['cases']), 2)
        self.assertEqual(self.baseline['earlyStop']['unrenderedCases'], ['left-paragraph-220', 'left-cell-padding-220'])
        before, after = self.baseline['cases']
        self.assertEqual(before['render']['productGates'], 'pass')
        self.assertEqual(after['render']['pages'], 23)
        self.assertEqual(after['render']['tracks'][1]['openingCvPages'], [2, 2, 2, 2, 3])
        self.assertEqual(after['render']['failures'], [{'gate': 'openingAttachment', 'role': 'side'}])
        self.assertTrue(all(track['fullTextVisible'] for track in after['render']['tracks']))
        for original, saved in zip(after['render']['tracks'], after['saveReopen']['tracks']):
            module.same_metrics(original['metadataMetrics'], saved['metadataMetrics'])
            self.assertEqual({k: v for k, v in original.items() if k != 'metadataMetrics'},
                             {k: v for k, v in saved.items() if k != 'metadataMetrics'})
        self.assertEqual({k: v for k, v in after['render'].items() if k != 'tracks'},
                         {k: v for k, v in after['saveReopen'].items() if k != 'tracks'})

    def test_paragraph_lead_is_identical_to_previous_positive_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        old = next(case for case in previous['cases'] if case['fixture'] == 'right-main-only-220')
        current = self.baseline['cases'][0]
        self.assertEqual(current['docxSha256'], old['docxSha256'])
        self.assertEqual(current['render'], old['render'])

    def test_source_plan_and_stop_changes_require_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][1]['leadRepresentation'] = 'paragraph'
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['earlyStop']['unrenderedCases'] = []
        with self.assertRaisesRegex(AssertionError, 'Changed terminal stop condition'):
            module.compare_baseline(self.baseline, observed)


class LeadBoundaryEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-lead-boundary-evidence.json').read_text())

    def test_zero_lead_restores_bounded_left_opening_without_enabling_export(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertEqual(result['changedCases'], 0)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual([case['render']['productGates'] for case in self.baseline['cases']], ['pass', 'pass', 'fail', 'pass'])
        self.assertEqual(self.baseline['cases'][3]['render']['tracks'][0]['openingCvPages'], [1] * 5)
        self.assertTrue(all(track['fullTextVisible'] for case in self.baseline['cases'] for track in case['render']['tracks']))

    def test_220_controls_retain_previous_native_packages(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        for current in self.baseline['cases']:
            if current['diagnostic']['leadMm'] != 220: continue
            old = next(case for case in previous['cases'] if case['fixture'] == current['diagnostic']['orientation'] + '-main-only-220')
            self.assertEqual(current['docxSha256'], old['docxSha256'])
            self.assertEqual(current['render'], old['render'])

    def test_lead_height_or_positive_left_changes_require_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][3]['leadMm'] = 220
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][3]['render']['tracks'][0]['openingCvPages'] = [1, 1, 1, 1, 2]
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, observed)


class LeadWindowEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-lead-window-evidence.json').read_text())

    def test_sampled_boundary_is_reproduced_without_product_acceptance(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertEqual(result['changedCases'], 0)
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 8)
        self.assertEqual([case['render']['productGates'] for case in self.baseline['cases']],
                         ['pass', 'pass', 'pass', 'pass', 'fail', 'pass', 'pass', 'fail'])
        self.assertEqual(self.baseline['cases'][3]['render']['tracks'][0]['openingCvPages'], [2] * 5)
        self.assertEqual(self.baseline['cases'][7]['render']['tracks'][0]['openingCvPages'], [1, 1, 1, 1, 2])

    def test_220_window_controls_retain_previous_sources(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        for current in self.baseline['cases']:
            if current['diagnostic']['leadMm'] != 220: continue
            old = next(case for case in previous['cases'] if case['fixture'] == current['diagnostic']['orientation'] + '-main-only-220')
            self.assertEqual(current['docxSha256'], old['docxSha256'])
            self.assertEqual(current['render'], old['render'])

    def test_window_order_and_positive_controls_cannot_change_silently(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][1]['leadMm'] = 210
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][6]['saveReopen']['productGates'] = 'fail'
        with self.assertRaisesRegex(AssertionError, 'Changed product gate'):
            module.compare_baseline(self.baseline, observed)

    def test_missing_or_expanded_window_results_fail(self):
        for cases in [self.baseline['cases'][:-1], self.baseline['cases'] + [self.baseline['cases'][0]]]:
            observed = {**self.baseline, 'cases': cases}
            with self.assertRaisesRegex(AssertionError, 'Changed bounded matrix'):
                module.compare_baseline(self.baseline, observed)


class DescriptionOwnerEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-description-owner-evidence.json').read_text())

    def test_native_complete_fields_do_not_accept_incomplete_visible_descriptions(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 2)
        self.assertEqual(len(self.baseline['earlyStop']['unrenderedCases']), 2)
        before, after = self.baseline['cases']
        self.assertEqual(before['render']['productGates'], 'pass')
        self.assertEqual(after['package']['completeNativeFields'], 'pass')
        self.assertEqual(after['saveReopenPackage']['completeNativeFields'], 'pass')
        self.assertTrue(all(not track['fullTextVisible'] and track['openingAttachment'] for track in after['render']['tracks']))
        self.assertEqual(after['render']['visibleBounds'], 'fail')
        self.assertEqual(after['render']['pages'], 15)

    def test_control_retains_original_positive_main_only_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        old = next(case for case in previous['cases'] if case['fixture'] == 'right-main-only-220')
        self.assertEqual(self.baseline['cases'][0]['docxSha256'], old['docxSha256'])
        self.assertEqual(self.baseline['cases'][0]['render'], old['render'])

    def test_owner_plan_and_missing_pdf_text_cannot_change_silently(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][1]['descriptionOwner'] = 'tail-cell'
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][1]['saveReopen']['tracks'][0]['fullTextVisible'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, observed)


class SplitDescriptionOwnerEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-split-description-owner-evidence.json').read_text())

    def test_false_row_does_not_restore_complete_pdf_text(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 2)
        self.assertEqual(self.baseline['earlyStop']['unrenderedCases'],
                         ['left-split-tail-cell-220', 'left-split-opening-cell-220'])
        before, after = self.baseline['cases']
        self.assertEqual(before['render']['productGates'], 'pass')
        self.assertEqual(after['package']['completeNativeFields'], 'pass')
        self.assertEqual(after['saveReopenPackage']['completeNativeFields'], 'pass')
        self.assertTrue(all(not track['fullTextVisible'] and track['openingAttachment']
                            for track in after['render']['tracks']))
        self.assertEqual(after['render']['visibleBounds'], 'fail')
        self.assertEqual(after['render']['pages'], 15)

    def test_splittable_control_retains_previous_positive_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-row-together-evidence.json').read_text())
        old = next(case for case in previous['cases'] if case['fixture'] == 'right-splittable-220')
        self.assertEqual(self.baseline['cases'][0]['docxSha256'], old['docxSha256'])
        self.assertEqual(self.baseline['cases'][0]['render'], old['render'])

    def test_true_and_false_row_packages_have_identical_observations(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-description-owner-evidence.json').read_text())
        for old, current in zip(previous['cases'], self.baseline['cases']):
            self.assertNotEqual(current['docxSha256'], old['docxSha256'])
            self.assertEqual(current['render'], old['render'])
            self.assertEqual(current['saveReopen'], old['saveReopen'])

    def test_false_flag_and_visible_failures_require_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][1]['openingKeepTogether'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][1]['saveReopen']['tracks'][0]['fullTextVisible'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, observed)


class NestedSideEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-nested-side-evidence.json').read_text())

    def test_complete_native_fields_do_not_accept_clipped_side_table(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 2)
        self.assertEqual(self.baseline['earlyStop']['unrenderedCases'], ['left-direct-side-220', 'left-nested-side-220'])
        before, after = self.baseline['cases']
        self.assertEqual(before['render']['productGates'], 'pass')
        self.assertEqual(after['render']['pages'], 10)
        self.assertEqual(after['package']['completeNativeFields'], 'pass')
        self.assertEqual(after['saveReopenPackage']['completeNativeFields'], 'pass')
        main, side = after['render']['tracks']
        self.assertTrue(main['fullTextVisible'])
        self.assertFalse(side['fullTextVisible'])
        self.assertEqual(side['visibleCharacters'], 790)
        self.assertEqual(side['expectedCharacters'], 18444)
        self.assertEqual(after['render']['visibleBounds'], 'pass')
        self.assertTrue(main['openingAttachment'] and side['openingAttachment'])

    def test_direct_control_retains_original_positive_package(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-main-ending-evidence.json').read_text())
        old = next(case for case in previous['cases'] if case['fixture'] == 'right-main-only-220')
        self.assertEqual(self.baseline['cases'][0]['docxSha256'], old['docxSha256'])
        self.assertEqual(self.baseline['cases'][0]['render'], old['render'])

    def test_composition_and_visibility_changes_require_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['plannedCases'][1]['sideComposition'] = 'direct'
        with self.assertRaisesRegex(AssertionError, 'Changed planned terminal matrix'):
            module.compare_baseline(self.baseline, observed)
        observed = copy.deepcopy(self.baseline)
        observed['cases'][1]['saveReopen']['tracks'][1]['fullTextVisible'] = True
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, observed)


class MainLeadEndingEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.baseline = json.loads((root.parent / 'docs/docx-next/sidebar-lead-main-ending-evidence.json').read_text())

    def test_explicit_native_flags_do_not_hide_the_left_layout_failure(self):
        result = module.compare_baseline(self.baseline, copy.deepcopy(self.baseline))
        self.assertTrue(result['productGates'].startswith('fail'))
        self.assertEqual(len(self.baseline['cases']), 4)
        for case in self.baseline['cases']:
            self.assertEqual(case['nativeAttachment']['status'], 'pass')
            self.assertEqual(case['nativeAttachment']['sourceCellEndingFlags'], case['nativeAttachment']['savedCellEndingFlags'])
            self.assertEqual(case['nativeIdentity']['tableIdentity'], 'fail')
        self.assertEqual([case['render']['productGates'] for case in self.baseline['cases']], ['pass', 'pass', 'fail', 'fail'])

    def test_original_detached_packages_and_observations_are_unchanged(self):
        previous = json.loads((root.parent / 'docs/docx-next/sidebar-side-ending-evidence.json').read_text())
        for case in self.baseline['cases'][::2]:
            old = next(item for item in previous['cases'] if item['fixture'] == case['diagnostic']['orientation'] + '-detached-220')
            self.assertEqual(case['docxSha256'], old['docxSha256'])
            for phase in ['render', 'saveReopen']:
                self.assertEqual(case[phase], old[phase])

    def test_changed_left_attachment_requires_review(self):
        observed = copy.deepcopy(self.baseline)
        observed['cases'][3]['render']['tracks'][0]['openingCvPages'] = [2] * 5
        with self.assertRaisesRegex(AssertionError, 'Changed visible track evidence'):
            module.compare_baseline(self.baseline, observed)

    def test_native_flag_and_caption_evidence_cannot_change_silently(self):
        for key in ['nativeAttachment', 'nativeIdentity']:
            observed = copy.deepcopy(self.baseline)
            observed['cases'][0][key] = {'status': 'different'}
            with self.assertRaisesRegex(AssertionError, 'Changed native'):
                module.compare_baseline(self.baseline, observed)

    def test_changed_pixels_cannot_claim_the_same_no_effect_result(self):
        observed = copy.deepcopy(self.baseline)
        observed['leadMainEndingRasterIdentity']['left']['saveReopen'] = 'fail'
        with self.assertRaisesRegex(AssertionError, 'Changed main-lead page pixels'):
            module.compare_baseline(self.baseline, observed)


if __name__ == '__main__': unittest.main()
