"""Bounded floating counterfactual tests; input is the complete synthetic rich trial."""
import copy
import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from zipfile import ZipFile

from lxml import etree as ET

spec = importlib.util.spec_from_file_location('floating_probe',
    Path(__file__).with_name('docx-next-photo-floating-probe-25okt.py'))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
SOURCE = Path(sys.argv.pop(1)) if len(sys.argv) > 1 else None
NS, W = probe.NS, probe.W


class FloatingProbeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if SOURCE is None or probe.check.reader.digest(SOURCE.read_bytes()) != probe.SOURCE_HASH:
            raise ValueError('Pass the pinned combined synthetic rich-owner DOCX')
        with ZipFile(SOURCE) as archive:
            cls.payloads = {n: archive.read(n) for n in archive.namelist()}
            cls.infos = archive.infolist()

    def tree(self):
        return ET.fromstring(self.payloads['word/document.xml'])

    def package(self, root, folder, mutate=None):
        parts = dict(self.payloads)
        parts['word/document.xml'] = ET.tostring(root, xml_declaration=True, encoding='UTF-8')
        if mutate:
            mutate(parts)
        target = Path(folder)/'probe.docx'
        with ZipFile(target, 'w') as archive:
            for info in self.infos:
                archive.writestr(copy.copy(info), parts[info.filename])
        return target

    def test_both_scopes_preserve_original_and_restore_source(self):
        for scope in probe.SCOPES:
            with self.subTest(scope=scope), tempfile.TemporaryDirectory() as folder:
                root = self.tree()
                probe.transform(root, scope)
                report = probe.verify(SOURCE, self.package(root, folder), scope)
                self.assertEqual(report['initialPreservation']['controlOccurrences'], 145)
                self.assertEqual(report['initialPreservation']['failedChecks'], [])
                self.assertTrue(report['inverseRestoresCanonicalSource'])
                self.assertFalse(report['productCandidate'])
                self.assertEqual(report['wordAcceptance'], 'UNVERIFIED')
                self.assertEqual(report['renderAcceptance'], 'UNVERIFIED')

    def test_changed_offset_crop_or_neighbour_text_is_not_the_probe(self):
        for mode in ['offset', 'crop', 'text', 'paragraph-spacing']:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as folder:
                root = self.tree()
                probe.transform(root, 'inline-owner')
                owner = probe.check.trial.photo_owner(root)
                if mode == 'offset':
                    owner.find('.//wp:positionV/wp:posOffset', NS).text = '1000'
                elif mode == 'crop':
                    owner.find('.//a:srcRect', NS).set('t', '9000')
                elif mode == 'text':
                    root.find('.//w:t', NS).text = 'Changed neighbour'
                else:
                    owner.getparent().find('w:pPr/w:spacing', NS).set('{'+W+'}after', '0')
                with self.assertRaisesRegex(ValueError, 'exact zero-offset'):
                    probe.verify(SOURCE, self.package(root, folder), 'inline-owner')

    def test_other_package_part_cannot_change(self):
        with tempfile.TemporaryDirectory() as folder:
            root = self.tree()
            probe.transform(root, 'inline-owner')
            saved = self.package(root, folder, lambda p: p.update({'word/settings.xml': b'changed'}))
            with self.assertRaisesRegex(ValueError, 'Only main'):
                probe.verify(SOURCE, saved, 'inline-owner')

    def test_missing_or_duplicate_owner_is_rejected(self):
        for mode in ['missing', 'duplicate']:
            with self.subTest(mode=mode):
                root = self.tree()
                owner = probe.check.trial.photo_owner(root)
                if mode == 'missing':
                    owner.getparent().remove(owner)
                else:
                    owner.getparent().append(copy.deepcopy(owner))
                with self.assertRaisesRegex(ValueError, 'exactly one'):
                    probe.transform(root, 'inline-owner')

    def test_source_type_and_locks_are_not_silently_rewritten(self):
        for kind in ['picture', 'lock', 'dataBinding']:
            with self.subTest(kind=kind):
                root = self.tree()
                props = probe.check.trial.photo_owner(root).find('w:sdtPr', NS)
                ET.SubElement(props, '{'+W+'}'+kind)
                with self.assertRaisesRegex(ValueError, 'source owner properties'):
                    probe.transform(root, 'inline-owner')

    def test_unrelated_paragraph_content_is_rejected(self):
        root = self.tree()
        ET.SubElement(probe.check.trial.photo_owner(root).getparent(), '{'+W+'}r')
        with self.assertRaisesRegex(ValueError, 'dedicated inline'):
            probe.transform(root, 'inline-owner')

    def test_foreign_property_with_allowed_local_name_is_rejected(self):
        root = self.tree()
        props = probe.check.trial.photo_owner(root).find('w:sdtPr', NS)
        ET.SubElement(props, '{urn:diagnostic}alias')
        with self.assertRaisesRegex(ValueError, 'source owner properties'):
            probe.transform(root, 'inline-owner')

    def test_floating_source_is_not_transformed_twice(self):
        root = self.tree()
        probe.transform(root, 'inline-owner')
        with self.assertRaisesRegex(ValueError, 'dedicated inline'):
            probe.transform(root, 'inline-owner')

    def test_unknown_scope_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'scope'):
            probe.transform(self.tree(), 'other')

    def test_existing_output_directory_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder)
            marker = target/'keep.txt'
            marker.write_text('keep')
            with self.assertRaisesRegex(ValueError, 'new output'):
                probe.build(SOURCE, target)
            self.assertEqual(marker.read_text(), 'keep')
            self.assertEqual(probe.check.reader.digest(SOURCE.read_bytes()), probe.SOURCE_HASH)


if __name__ == '__main__':
    unittest.main()
