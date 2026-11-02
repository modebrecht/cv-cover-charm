#!/usr/bin/env python3
from pathlib import Path
import tempfile
import unittest
from collections import Counter
from dossier_entry_rows import make_copy, load_cases, reference_group, PROFILES
from dossier_layout_rows import word_values, drawing_payloads
from dossier_lo_context import W, NS, canon, read_root
from dossier_production_spacing import critical, digest

ROOT = Path(__file__).resolve().parents[1]


class EntryRows(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        _, self.cases = load_cases(ROOT)

    def test_four_fixed_baseline_inputs_reproduce_p217_checksums(self):
        for case, src in self.cases:
            target = self.folder / 'copy.docx'
            make_copy(src, target, 'fixed-5-14')
            self.assertEqual(digest(target), case['package']['copy_sha256'])

    def test_each_followup_entry_and_reference_get_own_outer_row(self):
        for case, src in self.cases:
            source = read_root(src)
            for profile in PROFILES[1:]:
                target = self.folder / 'copy.docx'
                meta = make_copy(src, target, profile)
                root = read_root(target)
                rows = root.findall('w:body/w:tbl/w:tr', NS)
                self.assertEqual(len(rows), 15)
                self.assertEqual(critical(root, 18), critical(source, 18))
                self.assertEqual(drawing_payloads(root), drawing_payloads(source))
                self.assertEqual(Counter(word_values(root)), Counter(word_values(source)))
                self.assertEqual(len(root.findall('.//w:sdt', NS)), 107)
                for row, i in zip(rows[1:-1], range(6, 19)):
                    text = ''.join(word_values(row))
                    self.assertIn(f'P202Praxis{i:02}', text)
                    self.assertEqual(text.count('P202Praxis'), 1)
                text = ''.join(word_values(rows[-1]))
                self.assertIn('Referenzen', text)
                self.assertIn('P202Endreferenz', text)
                self.assertTrue(meta['reference_heading_body_grouped'])

    def test_only_followup_rows_get_requested_split_guard_and_first_cells_unchanged(self):
        for case, src in self.cases:
            a = read_root(src).find('w:body/w:tbl/w:tr', NS).findall('w:tc', NS)
            for profile in PROFILES[1:]:
                target = self.folder / 'copy.docx'
                make_copy(src, target, profile)
                rows = read_root(target).findall('w:body/w:tbl/w:tr', NS)
                self.assertIsNone(rows[0].find('w:trPr', NS))
                for row in rows[1:]:
                    self.assertEqual(row.find('w:trPr/w:cantSplit', NS) is not None, profile.endswith('nosplit'))
                for old, new in zip(a, rows[0].findall('w:tc', NS)):
                    self.assertEqual(canon(old.find('w:p', NS)), canon(new.find('w:p', NS)))
                    self.assertEqual(canon(old.find('w:tcPr', NS)), canon(new.find('w:tcPr', NS)))

    def test_visible_reference_line_alone_cannot_pass_orphan_heading(self):
        actual = {'content': {'marker_pages': {'P202Endreferenz': [5]}}}
        line = {'status': 'PASS', 'heading_count': 1, 'page': 4}
        self.assertEqual(reference_group(line, actual)['status'], 'FAIL')
        line['page'] = 5
        self.assertEqual(reference_group(line, actual)['status'], 'PASS')
        actual['content']['marker_pages']['P202Endreferenz'] = [4, 5]
        self.assertEqual(reference_group(line, actual)['status'], 'FAIL')

    def test_invalid_profile_and_overwrite_do_not_modify_source(self):
        src = self.cases[0][1]
        original = src.read_bytes()
        target = self.folder / 'invalid.docx'
        with self.assertRaises(ValueError):
            make_copy(src, target, 'unknown')
        self.assertFalse(target.exists())
        with self.assertRaises(ValueError):
            make_copy(src, src, 'entry-rows-nosplit')
        self.assertEqual(src.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
