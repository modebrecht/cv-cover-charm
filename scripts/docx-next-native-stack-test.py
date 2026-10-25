"""Reject fabricated native callers, hidden-state acceptance and relaxed stack comparisons."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result); return result


qa = module('native-stack-qa'); worker = module('native-stack-worker')


class NativeStackTest(unittest.TestCase):
    def setUp(self):
        docs = Path(__file__).resolve().parent.parent / 'docs/docx-next'
        self.report = json.loads((docs / 'sidebar-native-stack-evidence.json').read_text())['local']
        self.manifest = json.loads((docs / 'stable-native-stack.json').read_text())

    def test_actual_original_disposal_has_text_node_destruction_without_importer_names(self):
        qa.validate_report(self.report, self.manifest)
        self.assertEqual(len(self.report['stacks'][0]['stack']['nativeFrames']), 36)
        self.assertFalse(self.report['exactImporterCallerResolved'])

    def test_canonical_callback_identity_is_required(self):
        for key, value in (('phase', 'source'), ('eventIndex', 77), ('canonicalTag', 'Kontakt'), ('fixture', 'right-three-row-220')):
            report = copy.deepcopy(self.report); report['stacks'][0][key] = value
            with self.assertRaises(AssertionError): qa.validate_report(report, self.manifest)

    def test_sparse_historical_cases_cannot_claim_a_stack(self):
        self.report['stacks'].append(copy.deepcopy(self.report['stacks'][0]))
        with self.assertRaisesRegex(AssertionError, 'Only the observed'): qa.validate_report(self.report, self.manifest)

    def test_capture_must_be_complete_and_use_return_address_convention(self):
        for key, value in (('truncated', True), ('capacity', 128.0), ('addressConvention', 'absolute PC'), ('systemAndInterpreterFramesAccepted', True)):
            report = copy.deepcopy(self.report); report['stacks'][0]['stack'][key] = value
            with self.assertRaises(AssertionError): qa.validate_report(report, self.manifest)

    def test_unpinned_libraries_and_missing_native_frames_are_rejected(self):
        for mode in ('library', 'missing'):
            report = copy.deepcopy(self.report); frames = report['stacks'][0]['stack']['nativeFrames']
            if mode == 'library': frames[18]['library'] = 'unverified.so'
            else: frames.pop(18)
            with self.assertRaises(AssertionError): qa.validate_report(report, self.manifest)

    def test_boolean_negative_and_zero_addresses_are_rejected(self):
        for offset in (False, 0, -1, 136.5):
            report = copy.deepcopy(self.report); report['stacks'][0]['stack']['nativeFrames'][18]['returnOffset'] = offset
            with self.assertRaisesRegex(AssertionError, 'Invalid ELF-relative'): qa.validate_report(report, self.manifest)

    def test_nearest_symbol_is_not_a_containing_function(self):
        frame = self.report['stacks'][0]['stack']['nativeFrames'][18]
        frame['exportedFunctions'] = [{'name': 'guessed_nearest', 'value': frame['returnOffset'] - 100, 'size': 20}]
        with self.assertRaisesRegex(AssertionError, 'Nearest symbol'): qa.validate_report(self.report, self.manifest)

    def test_actual_elf_resolution_is_required_even_for_plausible_symbol_extents(self):
        class ActualImage:
            def __init__(self, frames): self.frames = frames
            def resolve(self, offset): return next(row['exportedFunctions'] for row in self.frames if row['returnOffset'] == offset)
        frames = self.report['stacks'][0]['stack']['nativeFrames']
        images = {name: ActualImage(copy.deepcopy([row for row in frames if row['library'] == name])) for name in self.manifest['libraries']}
        frames[8]['exportedFunctions'] = [{'name': 'fabricated_internal_caller', 'value': frames[8]['returnOffset'] - 2, 'size': 4}]
        with self.assertRaisesRegex(AssertionError, 'actual pinned ELF'): qa.validate_stacks(self.report['stacks'], self.manifest, images)

    def test_destroy_chain_order_and_aliases_cannot_be_substituted(self):
        frames = self.report['stacks'][0]['stack']['nativeFrames']; frames[12], frames[13] = frames[13], frames[12]
        with self.assertRaisesRegex(AssertionError, 'destruction chain'): qa.validate_report(self.report, self.manifest)

    def test_scope_counts_and_unmeasured_internal_flags_remain_strict(self):
        for key, value in (('newReadonlyNativeLoads', 6.0), ('newNativeExports', False), ('originalPackagesModified', 1),
                           ('exactImporterCallerResolved', True), ('internalStartCursorMeasured', True), ('internalDummyGuardMeasured', True),
                           ('historicalLossIntervalsMeasured', True), ('originalObservationUnchanged', False)):
            report = copy.deepcopy(self.report); report[key] = value
            with self.assertRaises(AssertionError): qa.validate_report(report, self.manifest)

    def test_strict_comparison_keeps_all_frames_binary_ids_and_original_observations(self):
        changed = copy.deepcopy(self.report); changed['originalPackageInputs'][1]['sha256'] = 'actual saved ZIP metadata'
        self.assertEqual(qa.compare_baseline(self.report, changed)['changedStacks'], 0)
        changes = [lambda r: r['stacks'][0]['stack']['nativeFrames'][18].update(returnOffset=1234),
                   lambda r: r['libraryIdentities']['libswlo.so'].update(buildId='different'),
                   lambda r: r.update(originalMeasurementSha256='different'),
                   lambda r: r['originalPackageInputs'][0].update(sha256='different'),
                   lambda r: r.update(newNativeExports=False),
                   lambda r: r['stacks'][0]['stack']['nativeFrames'][8]['exportedFunctions'].append({'name': 'invented', 'value': 0, 'size': 99999999})]
        for change in changes:
            changed = copy.deepcopy(self.report); change(changed)
            with self.assertRaisesRegex(AssertionError, 'Changed native stack'): qa.compare_baseline(self.report, changed)

    def test_original_callback_instrumentation_requires_exact_pinned_source(self):
        source = Path(__file__).with_name('docx-next-native-import-worker.py').read_bytes()
        self.assertTrue(callable(worker.instrument(source, self.manifest['originalWorkerSha256'], lambda: None)))
        with self.assertRaisesRegex(AssertionError, 'Changed original callback'): worker.instrument(source + b'\n', self.manifest['originalWorkerSha256'], lambda: None)
        ambiguous = b"row = {'event': 'first-paragraph-disposing', 'value': None}\n" * 2
        with self.assertRaisesRegex(AssertionError, 'Ambiguous'): worker.instrument(ambiguous, hashlib.sha256(ambiguous).hexdigest(), lambda: None)


if __name__ == '__main__': unittest.main()
