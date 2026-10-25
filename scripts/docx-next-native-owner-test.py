"""Reject fabricated owner lifetime, disposal identity and widened acceptance claims."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('owner', Path(__file__).with_name('docx-next-native-owner-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
evidence = json.loads((qa.DOCS / 'sidebar-native-owner-evidence.json').read_text())['local']


class OwnerTests(unittest.TestCase):
    def reject(self, report):
        with self.assertRaises(AssertionError):
            qa.contract(report)

    def test_actual_owner_lifetime(self):
        self.assertEqual(qa.contract(copy.deepcopy(evidence))['hypothesis'], 'CONFIRMED')

    def test_control_or_paragraph_identity_must_match(self):
        for index, key in [(1, 'sameControlInterface'), (1, 'sameOwnerParagraphStart'),
                           (47, 'sameRegisteredInterface'), (48, 'sameRegisteredInterface')]:
            report = copy.deepcopy(evidence)
            report['observation']['ownerLifetime'][index][key] = False
            self.reject(report)

    def test_missing_or_reordered_lifetime_events(self):
        for operation in ('missing', 'reordered', 'extra'):
            report = copy.deepcopy(evidence)
            events = report['observation']['ownerLifetime']
            if operation == 'missing':
                events.pop(10)
            elif operation == 'reordered':
                events[47], events[48] = events[48], events[47]
            else:
                events.append(events[-1])
            self.reject(report)

    def test_original_engine_trace_stays_exact(self):
        report = copy.deepcopy(evidence)
        report['observation']['ownerLifetime'][47]['nativeFrames'][20]['returnOffset'] += 1
        self.reject(report)
        report = copy.deepcopy(evidence)
        report['observation']['originalObservation']['measurement']['cases'][0]['finalControls'] = []
        self.reject(report)

    def test_no_dying_object_method_or_pointer_reuse_identity(self):
        for key, value in [('rawPointersUsedForCrossCallbackIdentity', True),
                           ('dyingBroadcasterMethodsInvoked', 1), ('identityMethod', 'raw pointers')]:
            report = copy.deepcopy(evidence)
            report['observation'][key] = value
            self.reject(report)

    def test_no_export_fix_or_word_acceptance_inferred(self):
        for key, value in [('newPreparedSources', 1), ('newNativeExports', 1),
                           ('engineFilesModified', 1), ('microsoftWordAccepted', 39),
                           ('productionAcceptance', 'accepted'), ('nativeGeometryAcceptance', 'pass')]:
            report = copy.deepcopy(evidence)
            report[key] = value
            self.reject(report)
        report = copy.deepcopy(evidence)
        report['summary']['exporterFixAccepted'] = True
        self.reject(report)


if __name__ == '__main__':
    unittest.main()
