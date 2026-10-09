"""Reject altered canonical observations, guard values, frame identity and causal claims."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('state', Path(__file__).with_name('docx-next-native-state-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


class NativeStateTest(unittest.TestCase):
    def setUp(self):
        docs = Path(__file__).resolve().parent.parent / 'docs/docx-next'
        self.report = json.loads((docs / 'sidebar-native-state-evidence.json').read_text())['local']
        self.result = self.report['observation']
        self.original = copy.deepcopy(self.result['measurement']['cases'][0])
        self.frames = json.loads((docs / 'sidebar-native-stack-evidence.json').read_text())['stable']['stacks'][0]['stack']['nativeFrames']

    def test_actual_original_case_and_every_disposal_frame_match(self):
        qa.validate_observation(self.result, self.original, self.frames)

    def test_changed_or_omitted_guard_states_and_wrong_types_are_rejected(self):
        for mutation in ('missing', 'early_set', 'late_reset', 'wrong_annotation', 'boolean_annotation', 'integer_flag', 'cached_start', 'boolean_count'):
            changed = copy.deepcopy(self.result)
            if mutation == 'missing': changed['progressStates'].pop()
            elif mutation == 'early_set': changed['progressStates'][29]['dummyFlag'] = True
            elif mutation == 'late_reset': changed['progressStates'][76]['dummyFlag'] = False
            elif mutation == 'wrong_annotation': changed['progressStates'][0]['annotationId'] = 0
            elif mutation == 'boolean_annotation': changed['progressStates'][0]['annotationId'] = False
            elif mutation == 'integer_flag': changed['progressStates'][0]['dummyFlag'] = 0
            elif mutation == 'cached_start': changed['progressStates'][0]['cachedSdtStartCount'] = 1
            else: changed['progressStates'][0]['cachedSdtStartCount'] = False
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError): qa.validate_observation(changed, self.original, self.frames)

    def test_disposal_state_cannot_be_presented_as_the_pre_cleanup_flag(self):
        changed = copy.deepcopy(self.result); changed['disposalState']['dummyFlagDuringDisposal'] = True
        with self.assertRaises(AssertionError): qa.validate_observation(changed, self.original, self.frames)

    def test_wrong_canonical_identity_and_changed_original_read_only_state_fail(self):
        for mutation in ('canonical', 'modified', 'missing_event', 'wrong_frame', 'missing_frame', 'different_implementation', 'cached_claim'):
            changed = copy.deepcopy(self.result)
            case = changed['measurement']['cases'][0]
            if mutation == 'canonical': case['canonicalOwnerFieldIds'][0] = 'plausible wrong tag'
            elif mutation == 'modified': case['modified'] = True
            elif mutation == 'missing_event': case['events'].pop(78)
            elif mutation == 'wrong_frame': changed['disposalFrames'][19]['returnOffset'] += 1
            elif mutation == 'missing_frame': changed['disposalFrames'].pop()
            elif mutation == 'different_implementation': changed['sameImplementationThroughout'] = False
            else: changed['cachedSdtStartObserved'] = True
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError): qa.validate_observation(changed, self.original, self.frames)

    def test_new_exports_prepared_sources_and_extra_loads_are_rejected(self):
        for key in ('newReadonlyNativeLoads', 'newNativeExports', 'newPreparedSources', 'originalPackagesModified'):
            changed = copy.deepcopy(self.result); changed['measurement'][key] += 1
            with self.subTest(key=key), self.assertRaises(AssertionError): qa.validate_observation(changed, self.original, self.frames)

    def test_baseline_preserves_layout_worker_library_and_all_acceptance_limits(self):
        self.assertEqual(qa.compare_baseline(self.report, self.report)['status'], 'pass')
        for key, value in (('layoutSha256', 'f' * 64), ('workerSha256', 'f' * 64), ('internalFirstCachedRangeMeasured', True),
                           ('internalPreCleanupGuardMeasured', True), ('historicalLossIntervalsMeasured', True),
                           ('engineFilesModified', 1), ('originalPackagesModified', 1), ('productionAcceptance', 'accepted'),
                           ('nativeGeometryAcceptance', 'pass')):
            changed = copy.deepcopy(self.report); changed[key] = value
            with self.subTest(key=key), self.assertRaises(AssertionError): qa.compare_baseline(self.report, changed)
        changed = copy.deepcopy(self.report); changed['libraryIdentities']['libsw_writerfilterlo.so']['buildId'] = 'ff' * 20
        with self.assertRaises(AssertionError): qa.compare_baseline(self.report, changed)


if __name__ == '__main__': unittest.main()
