"""Synthetic package controls protect the distinction between text and native identity."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

root = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('native_identity', root / 'docx-next-native-identity-qa.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NativeIdentityTests(unittest.TestCase):
    def setUp(self):
        self.work = tempfile.TemporaryDirectory()
        self.addCleanup(self.work.cleanup)
        self.directory = Path(self.work.name)

    def package(self, name, content):
        path = self.directory / name
        with ZipFile(path, 'w') as archive:
            archive.writestr('word/document.xml', '<w:document xmlns:w="' + module.W[1:-1] + '"><w:body>' + content + '</w:body></w:document>')
        return path

    def field(self, identity='cv.description', text='Complete editable description'):
        return '<w:sdt><w:sdtPr><w:tag w:val="' + identity + '"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:sdtContent></w:sdt>'

    def test_unchanged_native_field_passes(self):
        result = module.audit(self.package('source.docx', self.field()), self.package('saved.docx', self.field()))
        self.assertEqual(result['completeNativeText'], 'pass')
        self.assertEqual(result['saveReopenIdentity'], 'pass')

    def test_plain_editable_text_does_not_replace_native_id(self):
        result = module.audit(self.package('source.docx', self.field()),
                              self.package('saved.docx', '<w:p><w:r><w:t>Complete editable description</w:t></w:r></w:p>'))
        self.assertEqual(result['completeNativeText'], 'pass')
        self.assertEqual(result['fieldIdentity'], 'fail')
        self.assertEqual(result['missingOrChangedTaggedFields'][0]['fieldId'], 'cv.description')

    def test_truncated_tagged_text_fails_both_checks(self):
        result = module.audit(self.package('source.docx', self.field()), self.package('saved.docx', self.field(text='Complete')))
        self.assertEqual(result['completeNativeText'], 'fail')
        self.assertEqual(result['fieldIdentity'], 'fail')

    def test_replaced_identity_with_same_text_is_rejected(self):
        result = module.audit(self.package('source.docx', self.field()), self.package('saved.docx', self.field(identity='other.description')))
        self.assertEqual(result['completeNativeText'], 'pass')
        self.assertEqual(result['fieldIdentity'], 'fail')

    def test_table_caption_loss_is_explicit(self):
        table = '<w:tbl><w:tblPr><w:tblCaption w:val="cv.flow"/></w:tblPr></w:tbl>'
        result = module.audit(self.package('source.docx', self.field() + table), self.package('saved.docx', self.field()))
        self.assertEqual(result['fieldIdentity'], 'pass')
        self.assertEqual(result['tableIdentity'], 'fail')
        self.assertEqual(result['missingTableIds'], ['cv.flow'])

    def test_picture_identity_requires_its_tag_even_with_empty_text(self):
        result = module.audit(self.package('source.docx', self.field(identity='cv.photo', text='')),
                              self.package('saved.docx', self.field(identity='other.photo', text='')))
        self.assertEqual(result['completeNativeText'], 'pass')
        self.assertEqual(result['fieldIdentity'], 'fail')


if __name__ == '__main__': unittest.main()
