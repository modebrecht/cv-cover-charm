"""Final strings or references acquired at import end cannot pass a lifetime gate."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest


REPO = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('coverage', Path(__file__).with_name('docx-next-sidebar-control-coverage-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
historical = json.loads((REPO / 'docs/docx-next/sidebar-owner-boundary-evidence.json').read_text())['local']['observation']['cases']
source = historical[0]
disposed = historical[1]
# Explicit synthetic unit control: existing historical saved imports all failed.
# Only an actual new native observation can establish a positive body interval.
positive = copy.deepcopy(disposed)
positive['controlLifetime'] = [row for row in positive['controlLifetime'] if row['event'] != 'control-disposing']
positive['controlLifetime'][-1]['sameRegisteredInterface'] = True


class CoverageTests(unittest.TestCase):
    def test_synthetic_early_interval_and_actual_disposal_control(self):
        self.assertEqual(qa.classify(positive)['observedControlInterval'], 'PASS')
        self.assertEqual(qa.classify(disposed)['observedControlInterval'], 'FAIL')

    def test_actual_final_only_is_inconclusive_even_with_same_interface(self):
        self.assertTrue(source['controlLifetime'][-1]['sameRegisteredInterface'])
        self.assertEqual(qa.classify(source)['observedControlInterval'], 'INCONCLUSIVE')
        with self.assertRaises(AssertionError):
            qa.require_source_interval({'phases': [qa.classify(source)]})

    def test_forged_live_rows_do_not_rescue_registration_at_end(self):
        phase = copy.deepcopy(source)
        phase['controlLifetime'].insert(1, {'event': 'live-control', 'sameRegisteredInterface': True})
        self.assertEqual(qa.classify(phase)['observedControlInterval'], 'INCONCLUSIVE')

    def test_late_registration_without_live_samples_remains_inconclusive(self):
        phase = copy.deepcopy(positive)
        phase['controlLifetime'] = [phase['controlLifetime'][0], phase['controlLifetime'][-1]]
        self.assertEqual(qa.classify(phase)['observedControlInterval'], 'INCONCLUSIVE')

    def test_recreated_matching_tag_does_not_rescue_disposal(self):
        phase = copy.deepcopy(disposed)
        phase['controlLifetime'][-1]['sameRegisteredInterface'] = True
        self.assertEqual(qa.classify(phase)['observedControlInterval'], 'FAIL')

    def test_changed_live_interface_is_failure(self):
        phase = copy.deepcopy(positive)
        next(row for row in phase['controlLifetime'] if row['event'] == 'live-control')['sameRegisteredInterface'] = False
        self.assertEqual(qa.classify(phase)['observedControlInterval'], 'FAIL')

    def test_callback_errors_and_malformed_registration_are_rejected(self):
        for change in ('error', 'registration', 'end'):
            phase = copy.deepcopy(positive)
            if change == 'error':
                phase['events'][0]['error'] = 'callback exception'
            elif change == 'registration':
                phase['paragraphDisposalRegistration']['canonicalTag'] = 'wrong'
            else:
                phase['events'].pop()
            with self.assertRaises(AssertionError):
                qa.classify(phase)

    def test_observed_interval_does_not_promote_original_ownership(self):
        result = qa.classify(positive)
        self.assertEqual(result['originalControlCreationLifetime'], 'UNVERIFIED')
        self.assertEqual(result['originalContainerLifetime'], 'UNVERIFIED')

    def test_final_native_fields_must_keep_text_order_and_identity(self):
        expected = {row['tag']: row['text'] for row in positive['finalControls']}
        qa.validate_final_fields(positive, expected)
        for change in ('missing', 'duplicate', 'order', 'text'):
            phase = copy.deepcopy(positive)
            fields = phase['finalControls']
            if change == 'missing':
                fields.pop()
            elif change == 'duplicate':
                fields.append(fields[0])
            elif change == 'order':
                fields[0], fields[1] = fields[1], fields[0]
            else:
                fields[0]['text'] = 'changed'
            with self.assertRaises(AssertionError):
                qa.validate_final_fields(phase, expected)


if __name__ == '__main__':
    unittest.main()
