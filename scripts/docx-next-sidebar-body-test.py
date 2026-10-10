"""Adversarial package-story inventory checks; no new native loads."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('body_qa', Path(__file__).with_name('docx-next-sidebar-body-qa.py'))
qa = importlib.util.module_from_spec(spec); spec.loader.exec_module(qa)


def story(tag, text, root='document'):
    return f'<w:{root} xmlns:w="{qa.W[1:-1]}"><w:sdt><w:sdtPr><w:tag w:val="{tag}"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:sdtContent></w:sdt></w:{root}>'


class InventoryTests(unittest.TestCase):
    def package(self, folder, stories, missing=False):
        path = Path(folder) / 'probe.docx'
        parts = [('word/document.xml', 'document', story('body', 'Body')),
                 *[(name, kind, value) for name, kind, value in stories]]
        with ZipFile(path, 'w') as archive:
            archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + ''.join(
                f'<Override PartName="/{name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.{kind}+xml"/>'
                for name, kind, value in parts) + '</Types>')
            for index, (name, kind, value) in enumerate(parts):
                if not missing or index == 0: archive.writestr(name, value)
        return path

    def test_source_and_saved_story_names_are_equivalent(self):
        with tempfile.TemporaryDirectory() as folder:
            source = self.package(folder, [('word/cv-header-first.xml', 'header', story('cv.header.first.name', 'Lea', 'hdr'))])
            body, all_fields = qa.package_controls(source)
            self.assertEqual(body, {'body':'Body'})
            self.assertEqual(all_fields, {'body':'Body', 'cv.header.first.name':'Lea'})
            saved = self.package(folder, [('word/header9.xml', 'header', story('cv.header.first.name', 'Lea', 'hdr'))])
            self.assertEqual(qa.package_controls(saved), (body, all_fields))

    def test_duplicate_first_and_default_footer_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.package(folder, [('word/footer8.xml', 'footer', story('cv.footer.content', 'Lea', 'ftr')),
                                         ('word/footer9.xml', 'footer', story('cv.footer.content', 'Lea', 'ftr'))])
            with self.assertRaisesRegex(AssertionError, 'Duplicated package canonical field'): qa.package_controls(path)

    def test_distinct_footer_instances_preserve_the_same_authored_text(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.package(folder, [('word/cv-footer.xml', 'footer', story('cv.footer.content', 'Lea', 'ftr')),
                                         ('word/cv-footer-first.xml', 'footer', story('cv.footer.first.content', 'Lea', 'ftr'))])
            body, all_fields = qa.package_controls(path)
            self.assertEqual(all_fields, {'body':'Body', 'cv.footer.content':'Lea', 'cv.footer.first.content':'Lea'})

    def test_body_header_identity_collision_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.package(folder, [('word/cv-header.xml', 'header', story('body', 'Body', 'hdr'))])
            with self.assertRaisesRegex(AssertionError, 'Duplicated package canonical field'): qa.package_controls(path)

    def test_missing_declared_story_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            path = self.package(folder, [('word/cv-footer-first.xml', 'footer', story('first.footer', 'Lea', 'ftr'))], True)
            with self.assertRaisesRegex(AssertionError, 'Missing declared package story'): qa.package_controls(path)


if __name__ == '__main__': unittest.main()
