"""Adversarial checks keep transfer, dummy-owner loss and hidden long text distinct."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('transfer', Path(__file__).with_name('docx-next-owner-transfer-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
evidence = json.loads((qa.DOCS / 'sidebar-owner-transfer-evidence.json').read_text())


class TransferTests(unittest.TestCase):
    def reject(self, report):
        with self.assertRaises(AssertionError):
            qa.contract(report)

    def test_actual_bounded_report(self):
        self.assertEqual(qa.contract(evidence['local']), evidence['localContract'])

    def test_copy_delete_does_not_become_stable_object_survival(self):
        report = copy.deepcopy(evidence['local'])
        report['transfer']['canonicalControlSurvives'] = True
        self.reject(report)

    def test_semantics_and_transfer_callers_cannot_disappear(self):
        for change in ('inventory', 'text', 'frame', 'dummy'):
            report = copy.deepcopy(evidence['local'])
            transfer = report['transfer']
            if change == 'inventory':
                transfer['completeFinalControls'] = 76
            elif change == 'text':
                transfer['firstFinalText'] = ''
            else:
                frame = next(row for row in transfer['resolvedFrames'] if any('MakeFlyAndMove' in value['name'] for value in row['functions']))
                frame['functions'][0]['name'] = '' if change == 'frame' else 'RemoveDummyParaForTableInSection'
            self.reject(report)

    def test_nearest_symbols_or_other_builds_are_rejected(self):
        for change in ('extent', 'build'):
            report = copy.deepcopy(evidence['local'])
            if change == 'extent':
                frame = next(row for row in report['transfer']['resolvedFrames'] if row['functions'])
                frame['returnOffset'] = frame['functions'][0]['value']
            else:
                report['transfer']['symbolProvenance']['libswlo.so']['buildId'] = 'other'
            self.reject(report)

    def test_inline_loss_and_stop_cannot_be_hidden(self):
        for key, value in [('candidateAccepted', True), ('missingTags', []), ('nativeControls', 77),
                           ('executedImports', 6), ('unexecutedSources', 0)]:
            report = copy.deepcopy(evidence['local'])
            report['placement'][key] = value
            self.reject(report)

    def test_four_and_six_pages_do_not_prove_complete_content(self):
        for index in (0, 1):
            for label in ('main', 'side'):
                for change in ('status', 'count', 'missing'):
                    report = copy.deepcopy(evidence['local'])
                    story = report['longVisibility'][index]['stories'][label]
                    if change == 'status':
                        story['completeLaneText']['status'] = 'pass'
                    elif change == 'count':
                        story['completeLaneText']['actualCharacters'] = story['completeLaneText']['authoredCharacters']
                    else:
                        story['paragraphsAbsentFromWholeCvPdf'] = []
                    self.reject(report)

    def test_no_architecture_export_or_word_acceptance_is_inferred(self):
        for key, value in [('newNativeExports', 1), ('newPdfExports', 1), ('historicalPackagesModified', 1),
                           ('engineFilesModified', 1), ('microsoftWordAccepted', 39), ('productionAcceptance', 'pass')]:
            report = copy.deepcopy(evidence['local'])
            report[key] = value
            self.reject(report)

    def test_duplicate_occurrences_cannot_be_promoted_to_full_visibility(self):
        for change in ('count', 'deficit'):
            report = copy.deepcopy(evidence['local'])
            group = report['longVisibility'][0]['stories']['main']['incompleteDuplicateGroups'][0]
            if change == 'count':
                group['wholeCvPdfOccurrences'] = group['authoredOccurrences']
            else:
                group['missingOccurrences'] = 0
            self.reject(report)


if __name__ == '__main__':
    unittest.main()
