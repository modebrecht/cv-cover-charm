"""Adversarial checks for the bounded synthetic photo owner trial.

Usage: python scripts/docx-next-photo-rich-owner-test.py CURRENT-SYNTHETIC-SOURCE.docx
No input documents or pictures belong in Git.
"""
import copy
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

from lxml import etree as ET

spec = importlib.util.spec_from_file_location('trial',
    Path(__file__).with_name('docx-next-photo-rich-owner-prototype.py'))
trial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(trial)
SOURCE = Path(sys.argv.pop(1)) if len(sys.argv) > 1 else None
W, NS = trial.W, trial.NS


class PhotoOwnerTrialTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if SOURCE is None:
            raise RuntimeError('Pass the current synthetic decision-packet source DOCX')
        if trial.hashlib.sha256(SOURCE.read_bytes()).hexdigest() != trial.CONTROL_SOURCE_SHA256:
            raise ValueError('Wrong synthetic control source')
        with ZipFile(SOURCE) as archive:
            cls.payloads = {n: archive.read(n) for n in archive.namelist()}

    def tree(self):
        return ET.fromstring(self.payloads['word/document.xml'])

    def package(self, folder, root=None, mutate=None):
        payloads = dict(self.payloads)
        if root is not None:
            payloads['word/document.xml'] = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        if mutate:
            mutate(payloads)
        path = Path(folder)/'trial.docx'
        with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
            for name, data in payloads.items():
                archive.writestr(name, data)
        return path

    def test_both_trials_preserve_active_original_and_inverse_markup(self):
        for mode in ['block', 'inline']:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as folder:
                root = self.tree()
                trial.promote(root, mode)
                report = trial.verify(SOURCE, self.package(folder, root), mode)
                self.assertEqual(report['controlOccurrences'], 145)
                self.assertEqual(report['wordAcceptance'], 'UNVERIFIED')
                self.assertEqual(report['normalSidebarGuard'], 'CLOSED')

    def test_duplicate_canonical_owner_is_rejected(self):
        root = self.tree()
        owner = trial.photo_owner(root)
        owner.getparent().append(copy.deepcopy(owner))
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            trial.promote(root)

    def test_missing_canonical_owner_is_rejected(self):
        root = self.tree()
        owner = trial.photo_owner(root)
        owner.getparent().remove(owner)
        with self.assertRaisesRegex(ValueError, 'exactly one'):
            trial.promote(root)

    def test_source_lock_is_not_silently_removed(self):
        root = self.tree()
        props = trial.photo_owner(root).find('w:sdtPr', NS)
        ET.SubElement(props, '{'+W+'}lock').set('{'+W+'}val', 'sdtContentLocked')
        with self.assertRaisesRegex(ValueError, 'locks'):
            trial.promote(root)

    def test_unrelated_photo_paragraph_content_is_rejected(self):
        root = self.tree()
        ET.SubElement(trial.photo_owner(root).getparent(), '{'+W+'}r')
        with self.assertRaisesRegex(ValueError, 'unrelated'):
            trial.promote(root)

    def test_floating_source_requires_a_separate_contract(self):
        root = self.tree()
        trial.photo_owner(root).find('.//wp:inline', NS).tag = '{'+NS['wp']+'}anchor'
        with self.assertRaisesRegex(ValueError, 'ordinary inline'):
            trial.promote(root)

    def test_frame_source_is_rejected(self):
        root = self.tree()
        owner = trial.photo_owner(root)
        owner.find('.//pic:pic', NS).tag = '{'+W+'}txbxContent'
        with self.assertRaisesRegex(ValueError, 'ordinary inline'):
            trial.promote(root)

    def test_source_without_typed_picture_is_rejected(self):
        root = self.tree()
        props = trial.photo_owner(root).find('w:sdtPr', NS)
        props.remove(props.find('w:picture', NS))
        with self.assertRaisesRegex(ValueError, 'typed'):
            trial.promote(root)

    def test_invalid_mode_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'mode'):
            trial.promote(self.tree(), 'floating')

    def test_changed_other_package_part_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.tree()
            trial.promote(root)
            path = self.package(folder, root, lambda p: p.update({'word/settings.xml': b'changed'}))
            with self.assertRaisesRegex(ValueError, 'Only main'):
                trial.verify(SOURCE, path)

    def test_changed_crop_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.tree()
            trial.promote(root)
            owner = trial.photo_owner(root)
            owner.xpath('.//*[local-name()="srcRect"]')[0].set('t', '9000')
            with self.assertRaisesRegex(ValueError, 'exact owner-only'):
                trial.verify(SOURCE, self.package(folder, root))

    def test_changed_neighbour_text_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.tree()
            trial.promote(root)
            root.find('.//w:t', NS).text = 'UNEXPECTED CHANGE'
            with self.assertRaisesRegex(ValueError, 'exact owner-only'):
                trial.verify(SOURCE, self.package(folder, root))

    def test_untagged_active_picture_cannot_be_rescued_by_its_name(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.tree()
            trial.promote(root)
            trial.photo_owner(root).find('w:sdtPr/w:tag', NS).set('{'+W+'}val', 'orphan')
            with self.assertRaisesRegex(ValueError, 'exact owner-only'):
                trial.verify(SOURCE, self.package(folder, root))


if __name__ == '__main__':
    unittest.main()
