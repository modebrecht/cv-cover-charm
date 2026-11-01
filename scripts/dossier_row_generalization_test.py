#!/usr/bin/env python3
"""Guard against changing the established candidate while varying source count."""
from pathlib import Path
import tempfile
import unittest
from dossier_row_generalization import make_copy
from dossier_layout_rows import make_copy as frozen_copy

ROOT = Path(__file__).resolve().parents[1]


class Generalization(unittest.TestCase):
    def test_fresh_builder_reproduces_both_retained_p216_candidate_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            for side in ['left', 'right']:
                src = ROOT / f'tests/fixtures/lo-import-p2-08/cv-18-{side}-original.docx'
                target = Path(tmp) / (side + '.docx')
                frozen = Path(tmp) / (side + '-frozen.docx')
                meta = make_copy(src, target, 18)
                frozen_copy(src, frozen, 'rows-5-14', True)
                self.assertEqual(target.read_bytes(), frozen.read_bytes())
                self.assertEqual(meta['critical_tables_identical'], 19)
                self.assertEqual(meta['body_controls_retained'], 107)
                self.assertEqual(meta['drawing_payloads_identical'], 8)

    def test_wrong_count_and_overwrite_rejected_without_output(self):
        src = ROOT / 'tests/fixtures/lo-import-p2-08/cv-18-left-original.docx'
        original = src.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'invalid.docx'
            for count in [16, 17, 19, 20]:
                with self.assertRaises(ValueError):
                    make_copy(src, target, count)
                self.assertFalse(target.exists())
        with self.assertRaisesRegex(ValueError, 'overwrite'):
            make_copy(src, src, 18)
        self.assertEqual(src.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
