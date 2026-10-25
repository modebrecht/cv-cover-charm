"""Final semantic equality must not conceal recreated controls or longer pagination."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('boundary', Path(__file__).with_name('docx-next-owner-boundary-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
evidence = json.loads((qa.DOCS / 'sidebar-owner-boundary-evidence.json').read_text())


class BoundaryTests(unittest.TestCase):
    def reject(self, report):
        with self.assertRaises(AssertionError):
            qa.contract(report)

    def test_actual_stopped_candidate(self):
        self.assertEqual(qa.contract(evidence['local']), evidence['localContract'])

    def test_recreated_tags_do_not_pass_live_identity_gate(self):
        failed = 0
        for phase in evidence['local']['observation']['cases']:
            if phase['controlLifetime'][-1]['sameRegisteredInterface']:
                qa.require_stable_control(phase)
            else:
                with self.assertRaises(AssertionError):
                    qa.require_stable_control(phase)
                failed += 1
        self.assertEqual(failed, 8)

    def test_complete_text_tag_order_and_ancestry_cannot_change(self):
        for kind in ('missing', 'text', 'cell', 'order'):
            report = copy.deepcopy(evidence['local'])
            fields = report['observation']['cases'][1]['finalControls']
            if kind == 'missing':
                fields.pop()
            elif kind == 'text':
                fields[0]['text'] = 'changed'
            elif kind == 'cell':
                fields[0]['cell'] = 'C1'
            else:
                fields[0], fields[1] = fields[1], fields[0]
            self.reject(report)

    def test_actual_disposal_cannot_be_hidden_by_final_same_tag(self):
        for change in ('final', 'disposal', 'identity'):
            report = copy.deepcopy(evidence['local'])
            lifetime = report['observation']['cases'][1]['controlLifetime']
            if change == 'final':
                lifetime[-1]['sameRegisteredInterface'] = True
            elif change == 'disposal':
                lifetime[:] = [row for row in lifetime if row['event'] != 'control-disposing']
            else:
                lifetime[1]['sameRegisteredInterface'] = False
            self.reject(report)

    def test_empty_wrong_or_unobserved_paragraphs_stay_rejected(self):
        for change in ('empty', 'wrong-cell', 'error'):
            report = copy.deepcopy(evidence['local'])
            event = next(row for row in report['observation']['cases'][1]['events'] if row.get('firstControl'))
            if change == 'empty':
                event['firstControl']['paragraphText'] = ''
            elif change == 'wrong-cell':
                event['firstControl']['table'] = 'other'
            else:
                event['error'] = 'hidden failure'
            self.reject(report)

    def test_long_page_counterexample_and_stop_scope_stay_exact(self):
        for change in ('pages', 'waive', 'extend', 'pixels'):
            report = copy.deepcopy(evidence['local'])
            if change == 'pages':
                report['stoppedGeometry']['candidatePages'] = 4
            elif change == 'waive':
                report['geometryAcceptance'] = 'pass'
            elif change == 'extend':
                report['beforeStopPdfPixels'].append(report['beforeStopPdfPixels'][-1])
            else:
                report['beforeStopPdfPixels'][0]['pixelSha256'] = ''
            self.reject(report)

    def test_scope_acceptance_and_word_cannot_be_promoted(self):
        for key, value in [('candidateAccepted', True), ('microsoftWordAccepted', 39),
                           ('ownerLifetimeAcceptance', 'pass'), ('newNativeExports', 42),
                           ('historicalPackagesModified', 1), ('productionAcceptance', 'accepted')]:
            report = copy.deepcopy(evidence['local'])
            report[key] = value
            self.reject(report)


if __name__ == '__main__':
    unittest.main()
