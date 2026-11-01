#!/usr/bin/env python3
"""Byte and part invariants for the one-property compatibility counterprobe."""
from pathlib import Path
import shutil
import tempfile
import unittest
from zipfile import ZipFile

from dossier_lo_compat import fixtures,mode_copy,package_delta

FIXTURES=Path(__file__).resolve().parents[1]/'tests/fixtures/lo-import-p2-04'


class CompatibilityControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.source=FIXTURES/'photo-table-mode15.docx'

    def rewrite(self,path,part,value):
        with ZipFile(path) as z:parts=[(i,z.read(i)) for i in z.infolist()]
        with ZipFile(path,'w') as z:
            for info,data in parts:z.writestr(info,value if info.filename==part else data)

    def test_mode14_changes_one_settings_byte_for_all_four_fixtures(self):
        for source in FIXTURES.glob('*.docx'):
            with self.subTest(source=source.name):
                output=self.root/source.name;result=mode_copy(source,output,14)
                self.assertEqual(result['settings_bytes_changed'],1)
                self.assertEqual(len(result['settings_attribute_edits']),1)
                self.assertTrue(result['all_other_parts_identical'])
                with ZipFile(source) as left,ZipFile(output) as right:
                    self.assertEqual(left.read('word/document.xml'),right.read('word/document.xml'))

    def test_mode15_is_byte_identical(self):
        output=self.root/'unchanged.docx';result=mode_copy(self.source,output,15)
        self.assertEqual(output.read_bytes(),self.source.read_bytes())
        self.assertEqual(result['settings_attribute_edits'],[])

    def test_cannot_overwrite_source(self):
        with self.assertRaisesRegex(ValueError,'overwrite fixture source'):mode_copy(self.source,self.source,14)

    def test_unsupported_mode_rejected(self):
        with self.assertRaisesRegex(ValueError,'Only modes'):mode_copy(self.source,self.root/'unsupported.docx',13)

    def test_unrelated_story_change_rejected(self):
        output=self.root/'tampered.docx';mode_copy(self.source,output,14)
        self.rewrite(output,'word/document.xml',b'<tampered/>')
        with self.assertRaisesRegex(ValueError,'Unrelated part changed'):package_delta(self.source,output,14)

    def test_extra_settings_change_rejected(self):
        output=self.root/'extra.docx';mode_copy(self.source,output,14)
        with ZipFile(output) as z:settings=z.read('word/settings.xml')
        self.assertIn(b'<w:autoHyphenation w:val="0"',settings)
        self.rewrite(output,'word/settings.xml',settings.replace(b'<w:autoHyphenation w:val="0"',b'<w:autoHyphenation w:val="1"'))
        with self.assertRaisesRegex(ValueError,'change only compatibilityMode'):package_delta(self.source,output,14)

    def test_pinned_fixture_manifest_is_positive_control(self):
        self.assertEqual(len(fixtures(FIXTURES)['fixtures']),4)

    def test_corrupted_fixture_hash_rejected(self):
        folder=self.root/'fixtures';shutil.copytree(FIXTURES,folder)
        with (folder/self.source.name).open('ab') as f:f.write(b'changed')
        with self.assertRaisesRegex(ValueError,'Fixture hash mismatch'):fixtures(folder)


if __name__=='__main__':unittest.main()
