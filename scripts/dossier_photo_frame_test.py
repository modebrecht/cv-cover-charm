#!/usr/bin/env python3
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_entry_rows import load_cases
from dossier_photo_frame import make_copy, photo, PROFILES
from dossier_lo_context import W, WP, NS, read_root, canon
from dossier_layout_rows import drawing_payloads
from dossier_production_spacing import critical

ROOT = Path(__file__).resolve().parents[1]


class PhotoFrames(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        _, self.cases = load_cases(ROOT)

    def test_original_copies_match_four_native_p218_controls(self):
        previous = json.loads((ROOT / 'docs/qa/p2-18-native-results.json').read_text())
        for case, src in self.cases:
            meta = make_copy(src, self.folder / 'copy.docx', 'original-photo')
            expected = next(c for c in previous['cases'] if c['source_id'] == case['id'] and c['profile'] == meta['layout_control_profile'])
            self.assertEqual(meta['copy_sha256'], expected['package']['copy_sha256'])

    def test_equivalent_margin_frame_preserves_declared_absolute_page_position(self):
        for case, src in self.cases:
            target = self.folder / 'copy.docx'
            m = make_copy(src, target, 'margin-equivalent')
            self.assertTrue(m['declared_page_x_equivalent'])
            self.assertEqual(m['photo_frame_after'], 'margin')
            self.assertEqual(m['photo_offset_emu_after'] + m['section_left_margin_emu'], m['photo_offset_emu_before'])
            self.assertEqual(m['section_left_margin_emu'], 720090 if case['mirrored'] else 0)

    def test_all_variants_preserve_nonphoto_drawings_critical_content_and_media(self):
        for case, src in self.cases:
            old = read_root(src)
            for profile in PROFILES:
                target = self.folder / 'copy.docx'
                meta = make_copy(src, target, profile)
                new = read_root(target)
                self.assertEqual(critical(old, 18), critical(new, 18))
                a, b = drawing_payloads(old), drawing_payloads(new)
                a.pop('cv.person.photo'); b.pop('cv.person.photo')
                self.assertEqual(a, b)
                self.assertEqual(len(new.findall('.//w:sdt', NS)), 107)
                self.assertEqual(canon(photo(old).find(WP+'anchor/'+WP+'positionV')), canon(photo(new).find(WP+'anchor/'+WP+'positionV')))
                with ZipFile(src) as x, ZipFile(target) as y:
                    self.assertEqual(x.namelist(), y.namelist())
                    for name in x.namelist():
                        if name != 'word/document.xml':self.assertEqual(x.read(name), y.read(name))

    def test_shifted_diagnostics_do_not_claim_frame_equivalence_or_word_acceptance(self):
        for case, src in self.cases:
            for profile in ['margin-unadjusted', 'page-compensated']:
                m = make_copy(src, self.folder/'copy.docx', profile)
                self.assertEqual(m['declared_page_x_equivalent'], not case['mirrored'])
                self.assertEqual(m['word_verification'], 'NOT_PERFORMED')
                if case['mirrored']:
                    self.assertTrue(any('converter-specific' in s for s in m['declared_losses']))

    def test_invalid_profile_and_overwrite_rejected_before_source_mutation(self):
        src = self.cases[0][1]
        original = src.read_bytes()
        target = self.folder/'invalid.docx'
        with self.assertRaises(ValueError):make_copy(src, target, 'unknown')
        self.assertFalse(target.exists())
        with self.assertRaises(ValueError):make_copy(src, src, 'margin-equivalent')
        self.assertEqual(src.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
