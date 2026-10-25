"""Adversarial native/layout baselines, including whole-channel CV pixel identity."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('continuous', Path(__file__).with_name('docx-next-continuous-cell-qa.py'))
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
BASELINE = json.loads((Path(__file__).resolve().parents[1] / 'docs/docx-next/sidebar-continuous-cell-evidence.json').read_text())
BASELINE = BASELINE.get('stable', BASELINE)


class StrictEvidence(unittest.TestCase):
    def rejects(self, change):
        actual = copy.deepcopy(BASELINE)
        change(actual)
        with self.assertRaises(AssertionError): qa.compare_baseline(BASELINE, actual)

    def test_exact_replay_and_editor_zip_metadata(self):
        actual = copy.deepcopy(BASELINE)
        actual['cases'][0]['savedDocxSha256'] = 'different-editor-zip-metadata'
        self.assertEqual(qa.compare_baseline(BASELINE, actual)['changedCases'], 0)

    def test_source_hash(self):
        self.rejects(lambda r: r['cases'][0].update(docxSha256='other-source'))

    def test_full_text(self):
        self.rejects(lambda r: r['cases'][1]['render']['tracks'][1].update(fullTextVisible=False))

    def test_semantic_owner(self):
        self.rejects(lambda r: r['cases'][1]['savedOwners']['rowFields'][0][0].append('other-field'))

    def test_explicit_paragraph_policy(self):
        self.rejects(lambda r: r['cases'][1]['nativeAttachment']['semanticParagraphs'][0]['flags'].pop('keepNext'))

    def test_original_caption_failure(self):
        self.rejects(lambda r: r['cases'][1]['nativeIdentity'].update(tableIdentity='pass', missingTableIds=[]))

    def test_one_twip_grid_change(self):
        self.rejects(lambda r: r['cases'][1]['nativeGrids']['saved'][0]['gridTwips'].__setitem__(2, 2789))

    def test_detached_right_opening(self):
        self.rejects(lambda r: r['cases'][1]['render']['tracks'][0]['openingCvPages'].__setitem__(4, 1))

    def test_exact_stop_and_unrendered_sources(self):
        self.rejects(lambda r: r['earlyStop']['unrenderedCases'].pop())
        self.rejects(lambda r: r['preparedSources'][2].update(docxSha256='untracked-left-source'))

    def test_every_cv_channel_byte(self):
        self.rejects(lambda r: r['cases'][1]['rasterPages']['render'].__setitem__(2, 'changed-CV-pixels'))

    def test_same_runtime_cover_pixels_are_exact(self):
        self.rejects(lambda r: r['cases'][0]['rasterPages']['render'].__setitem__(0, 'changed-cover-pixels'))

    def test_cross_runtime_cover_variants_stay_observations(self):
        actual = copy.deepcopy(BASELINE)
        actual['libreOfficeVersion'] = 'independent-runtime'
        actual['cases'][0]['rasterPages']['render'][0] = 'different-runtime-cover-pixels'
        self.assertEqual(qa.compare_baseline(BASELINE, actual)['changedCases'], 0)
        actual['cases'][1]['rasterPages']['render'][2] = 'changed-CV-pixels'
        with self.assertRaises(AssertionError): qa.compare_baseline(BASELINE, actual)


if __name__ == '__main__': unittest.main()
