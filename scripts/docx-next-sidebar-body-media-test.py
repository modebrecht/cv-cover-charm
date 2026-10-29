"""Source/saved canonical identities and native paint remain independently guarded."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from PIL import Image

spec = importlib.util.spec_from_file_location('body', Path(__file__).with_name('docx-next-sidebar-body-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
W = module.W[1:-1]


class BodyPackageTests(unittest.TestCase):
    def png(self, size, color):
        stream = io.BytesIO()
        Image.new('RGB', size, color).save(stream, format='PNG')
        return stream.getvalue()

    def test_page_paint_does_not_become_a_photo_frame(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'photo.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/media/image-1.png', self.png((120, 180), 'red'))
                archive.writestr('word/media/paint-1.png', self.png((1, 1), 'blue'))
            photo, paint = module.package_image_digests(path)
            self.assertEqual(len(photo), 1)
            self.assertEqual(len(paint), 1)
            self.assertFalse(photo & paint)

    def test_unknown_source_media_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'unknown.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/media/unknown.png', self.png((1, 1), 'blue'))
            with self.assertRaises(AssertionError): module.package_image_digests(path)

    def test_ambiguous_photo_and_paint_pixels_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'ambiguous.docx'
            pixels = self.png((1, 1), 'blue')
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/media/image-1.png', pixels)
                archive.writestr('word/media/paint-1.png', pixels)
            with self.assertRaises(AssertionError): module.package_image_digests(path)

    def controls(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fields.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('[Content_Types].xml', '<Types/>')
                archive.writestr('word/settings.xml', f'<w:settings xmlns:w="{W}"/>')
                archive.writestr('word/_rels/document.xml.rels', '<Relationships/>')
                archive.writestr('word/document.xml', f'<w:document xmlns:w="{W}"><w:body>{content}</w:body></w:document>')
            return module.package_controls(path)

    def test_authored_text_and_identity_are_preserved(self):
        field = '<w:sdt><w:sdtPr><w:tag w:val="cv.name"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Lea</w:t></w:r></w:p></w:sdtContent></w:sdt>'
        body, all_fields = self.controls(field)
        self.assertEqual(body, {'cv.name': 'Lea'})
        self.assertEqual(body, all_fields)

    def test_duplicate_tags_still_block_acceptance(self):
        field = '<w:sdt><w:sdtPr><w:tag w:val="cv.photo"/></w:sdtPr><w:sdtContent/></w:sdt>'
        with self.assertRaisesRegex(AssertionError, 'duplicate.*cv.photo'):
            self.controls(field + field)

    def test_missing_tag_still_blocks_acceptance(self):
        with self.assertRaisesRegex(AssertionError, 'missing authored'):
            self.controls('<w:sdt><w:sdtPr/><w:sdtContent/></w:sdt>')


if __name__ == '__main__': unittest.main()
