"""Complete character counts and native identity do not waive visible reading order."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('body', Path(__file__).with_name('docx-next-body-carrier-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
evidence = json.loads((qa.DOCS / 'sidebar-body-carrier-evidence.json').read_text())


class BodyCarrierTests(unittest.TestCase):
    def reject(self, report):
        with self.assertRaises(AssertionError):
            qa.contract(report)

    def test_actual_source_counterexample(self):
        self.assertEqual(qa.contract(evidence['local']), evidence['localContract'])

    def test_full_character_count_does_not_prove_order(self):
        report = copy.deepcopy(evidence['local'])
        report['visibleStories']['main']['status'] = 'pass'
        self.reject(report)

    def test_native_field_text_order_and_object_lifetime_stay_required(self):
        for change in ('count', 'text', 'order', 'lifetime'):
            report = copy.deepcopy(evidence['local'])
            if change == 'count':
                report['nativeControls'] = 381
            elif change == 'text':
                report['firstFinalControl']['text'] = ''
            elif change == 'order':
                report['nativeStories']['main']['wholeTextAndOrder'] = 'fail'
            else:
                report['canonicalControlLifetime'][-1]['sameRegisteredInterface'] = False
            self.reject(report)

    def test_visible_reordered_or_missing_school_titles_cannot_change(self):
        for change in ('sort', 'drop', 'page'):
            report = copy.deepcopy(evidence['local'])
            rows = report['visibleSchoolOrder']
            if change == 'sort':
                rows.sort(key=lambda row: row['number'])
            elif change == 'drop':
                rows.pop()
            else:
                rows[5]['page'] = 5
            self.reject(report)

    def test_correct_side_story_does_not_accept_the_whole_document(self):
        report = copy.deepcopy(evidence['local'])
        report['candidateAccepted'] = True
        self.reject(report)

    def test_source_stop_cannot_be_extended_or_promoted(self):
        for key, value in [('newPreparedSources', 6), ('newNativeDocxExports', 1), ('newSavedImports', 1),
                           ('geometryAcceptance', 'pass'), ('productionAcceptance', 'pass'), ('microsoftWordAccepted', 39)]:
            report = copy.deepcopy(evidence['local'])
            report[key] = value
            self.reject(report)

    def test_final_only_registration_cannot_prove_import_lifetime(self):
        report = copy.deepcopy(evidence['local'])
        report['canonicalLifetimeCoverage'] = 'stable throughout import'
        self.reject(report)

    def test_actual_node_order_and_complete_node_text_cannot_be_replaced_by_registry_order(self):
        for change in ('order', 'text', 'count'):
            report = copy.deepcopy(evidence['local'])
            if change == 'order':
                report['nativeNodeSchoolOrder'][5]['number'] = 12
            elif change == 'text':
                report['nativeNodeStories']['main']['completeNativeNodeText']['status'] = 'fail'
            else:
                report['nativeNodeStories']['main']['nonemptyParagraphNodes'] = 278
            self.reject(report)


if __name__ == '__main__':
    unittest.main()
