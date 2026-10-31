"""Counterexamples for cumulative, read-only photo return inspection."""
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile

from lxml import etree as ET
from PIL import Image

SCRIPT = Path(__file__).with_name('docx-next-picture-word-return.py')
spec = importlib.util.spec_from_file_location('photo_return', SCRIPT)
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class PhotoReturnTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        self.first, self.second = [self.folder / f'saved{i}.docx' for i in (1, 2)]
        for path in (self.first, self.second):
            shutil.copyfile(qa.SOURCE, path)

    def change(self, path, mutation):
        with ZipFile(path) as archive:
            parts = {name: archive.read(name) for name in archive.namelist()}
        mutation(parts)
        with ZipFile(path, 'w') as archive:
            for name, data in parts.items():
                archive.writestr(name, data)

    def xml_change(self, path, mutation):
        def apply(parts):
            root = ET.fromstring(parts['word/document.xml'])
            mutation(root)
            parts['word/document.xml'] = ET.tostring(root)
        self.change(path, apply)

    def test_identical_copies_never_grant_word_acceptance(self):
        result = qa.audit(self.first, self.second)
        self.assertEqual(result['exactPackageContract'], 'pass')
        self.assertTrue(result['allInputsByteIdentical'])
        self.assertEqual(result['wordAcceptance'], 'UNVERIFIED')
        self.assertFalse(result['saveReopenPerformedByThisTool'])
        self.assertEqual(result['nativeLoads'], 0)
        self.assertEqual(result['nativeSaves'], 0)

    def test_stable_second_save_does_not_hide_first_save_pixel_loss(self):
        def change_image(parts):
            part = qa.picture_inventory(self.first, qa.PICTURES)['pictures'][0]['image']['part']
            with Image.open(io.BytesIO(parts[part])) as image:
                image = image.convert('RGBA')
                image.putpixel((0, 0), (1, 2, 3, 255))
                stream = io.BytesIO()
                image.save(stream, 'PNG')
            parts[part] = stream.getvalue()
        self.change(self.first, change_image)
        shutil.copyfile(self.first, self.second)
        result = qa.audit(self.first, self.second)
        self.assertEqual(result['exactPackageContract'], 'fail')
        self.assertTrue(result['comparisons']['firstToSecondSave']['checks']['originalImageData'])
        for key in ('sourceToFirstSave', 'sourceToSecondSave'):
            self.assertFalse(result['comparisons'][key]['checks']['originalImageData'])

    def test_orphan_image_cannot_rescue_empty_photo_control(self):
        def orphan(root):
            content = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val="cv.person.photo"]]/w:sdtContent',
                                 namespaces=qa.reader.NS)[0]
            parent = content.getparent().getparent()
            for child in list(content):
                content.remove(child)
                parent.append(child)
        self.xml_change(self.second, orphan)
        result = qa.audit(self.first, self.second)
        self.assertFalse(result['comparisons']['sourceToSecondSave']['checks']['pictureOwnership'])
        self.assertEqual(result['exactPackageContract'], 'fail')

    def test_crop_change_is_reported_separately_from_original_pixels(self):
        def crop(root):
            root.find('.//a:srcRect', qa.reader.NS).set('l', '0')
        self.xml_change(self.second, crop)
        checks = qa.audit(self.first, self.second)['comparisons']['sourceToSecondSave']['checks']
        self.assertTrue(checks['originalImageData'])
        self.assertFalse(checks['exactCropMarkup'])

    def test_hidden_joiner_is_rejected_by_existing_owner_contract(self):
        def marker(root):
            content = root.xpath('.//w:sdt[w:sdtPr/w:tag[@w:val="cv.person.photo"]]/w:sdtContent',
                                 namespaces=qa.reader.NS)[0]
            ET.SubElement(ET.SubElement(content, '{'+qa.reader.W+'}r'),
                          '{'+qa.reader.W+'}t').text = '\u2060'
        self.xml_change(self.second, marker)
        checks = qa.audit(self.first, self.second)['comparisons']['sourceToSecondSave']['checks']
        self.assertFalse(checks['pictureOwnership'])

    def test_changed_text_field_fails_even_when_photo_survives(self):
        self.xml_change(self.second, lambda root: setattr(
            root.find('.//w:t', qa.reader.NS), 'text', 'Changed review text'))
        checks = qa.audit(self.first, self.second)['comparisons']['sourceToSecondSave']['checks']
        self.assertFalse(checks['canonicalFields'])
        self.assertTrue(checks['pictureOwnership'])

    def test_source_or_same_file_cannot_be_reused_as_return(self):
        for paths in ((qa.SOURCE, self.second), (self.first, self.first)):
            with self.subTest(paths=paths), self.assertRaises(ValueError):
                qa.audit(*paths)

    def test_changed_source_is_rejected_before_comparing_returns(self):
        source = self.folder / 'changed-source.docx'
        source.write_bytes(b'Not the pinned source')
        with patch.object(qa, 'SOURCE', source), self.assertRaisesRegex(ValueError, 'hash differs'):
            qa.audit(self.first, self.second)

    def test_hardlink_alias_cannot_fake_two_separate_return_files(self):
        self.second.unlink()
        os.link(self.first, self.second)
        with self.assertRaises(ValueError):
            qa.audit(self.first, self.second)

    def test_cli_never_overwrites_an_input_or_existing_report(self):
        for output in (self.first, self.folder / 'existing.json'):
            if output.suffix == '.json':
                output.write_text('Existing evidence', encoding='utf-8')
            before = output.read_bytes()
            result = subprocess.run([sys.executable, str(SCRIPT), str(self.first),
                str(self.second), str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(output.read_bytes(), before)

    def test_cli_writes_bound_report_without_modifying_inputs(self):
        hashes = [qa.sha(path) for path in (qa.SOURCE, self.first, self.second)]
        output = self.folder / 'report.json'
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.first),
            str(self.second), str(output)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(output.read_text(encoding='utf-8'))
        self.assertEqual([row['sha256'] for row in report['inputs']], hashes)
        self.assertEqual([qa.sha(path) for path in (qa.SOURCE, self.first, self.second)], hashes)
        self.assertEqual(report['wordAcceptance'], 'UNVERIFIED')

    def test_cli_keeps_failure_evidence_and_returns_nonzero(self):
        self.xml_change(self.second, lambda root: setattr(
            root.find('.//w:t', qa.reader.NS), 'text', 'Changed review text'))
        output = self.folder / 'failed-report.json'
        result = subprocess.run([sys.executable, str(SCRIPT), str(self.first),
            str(self.second), str(output)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, result.stderr)
        report = json.loads(output.read_text(encoding='utf-8'))
        self.assertEqual(report['exactPackageContract'], 'fail')
        self.assertEqual(report['wordAcceptance'], 'UNVERIFIED')


if __name__ == '__main__':
    unittest.main()
