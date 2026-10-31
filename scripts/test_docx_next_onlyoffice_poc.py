"""Evidence guards and real PDF/SSIM countercontrols; no pretend native conversions."""
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

import fitz

import docx_next_onlyoffice_poc as qa


class OnlyofficeGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def bundle(self):
        rows = []
        for name, expected in qa.CASES.items():
            file = self.root / (name + '.docx')
            with ZipFile(file, 'w') as package:
                package.writestr('word/document.xml', '<document/>')
            rows.append({'id': name, 'file': file.name, 'sha256': qa.sha(file), 'expectedPhoto': expected})
        manifest = {'schemaVersion': 1, 'sourceCommit': 'a' * 40, 'cases': rows}
        self.write_manifest(manifest)
        return manifest

    def write_manifest(self, manifest):
        (self.root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')

    def test_changed_source_rejected_before_native_work(self):
        manifest = self.bundle()
        (self.root / manifest['cases'][0]['file']).write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'Source hash changed'):
            qa.sources(self.root)

    def test_duplicate_cases_do_not_count_as_three(self):
        manifest = self.bundle()
        manifest['cases'][2] = manifest['cases'][1]
        self.write_manifest(manifest)
        with self.assertRaisesRegex(ValueError, 'Exactly three'):
            qa.sources(self.root)

    def test_external_filename_and_disabled_photo_expectation_rejected(self):
        for modification in ({'file': '../outside.docx'}, {'expectedPhoto': False}):
            manifest = self.bundle()
            manifest['cases'][1].update(modification)
            self.write_manifest(manifest)
            with self.assertRaisesRegex(ValueError, 'filename or photo'):
                qa.sources(self.root)

    def test_existing_output_cannot_be_overwritten(self):
        with self.assertRaisesRegex(ValueError, 'fresh output'):
            qa.run(self.root / 'missing', self.root, self.root / 'missing', self.root / 'missing')

    def test_release_digest_is_required_before_tar_or_native_work(self):
        wrong = self.root / 'untrusted.tar.xz'
        wrong.write_bytes(b'not a trusted engine')
        with self.assertRaisesRegex(ValueError, 'release archive digest'):
            qa.engine_binding(wrong, self.root / 'missing-builder')

    def pdf(self, name, photo, pages=3):
        path = self.root / name
        with fitz.open() as doc:
            for _ in range(pages):
                page = doc.new_page(width=595, height=842)
                page.insert_text((50, 70), 'Real PDF control: shared parity functions')
            if photo:
                page.draw_rect(fitz.Rect(450, 90, 475, 140), color=None, fill=(1, 0, 0))
                page.draw_rect(fitz.Rect(475, 90, 500, 140), color=None, fill=(0, 0, 1))
            doc.save(path)
        return path

    def test_high_overall_ssim_does_not_replace_visible_photo_control(self):
        present = self.pdf('photo.pdf', True)
        empty = self.pdf('empty.pdf', False)
        self.assertTrue(qa.photo_control(present)['knownPhotoVisible'])
        self.assertFalse(qa.photo_control(empty)['knownPhotoVisible'])
        a = qa.rasterize_pdf(present, self.root / 'a', 'case')['cv']
        b = qa.rasterize_pdf(empty, self.root / 'b', 'case')['cv']
        score = qa.pair_scores(a, a, b)
        self.assertEqual(score['web_pdf'], 1.0)
        self.assertGreater(score['pdf_docx'], .98)
        self.assertLess(score['pdf_docx'], 1.0)

    def test_wrong_pdf_page_count_is_not_silently_normalized(self):
        with self.assertRaisesRegex(ValueError, 'three dossier pages'):
            qa.photo_control(self.pdf('one-page.pdf', False, pages=1))


if __name__ == '__main__':
    unittest.main()
