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
    def package(self, folder, stories, missing=False, first=True, even=False, force_even=False):
        path = Path(folder) / 'probe.docx'
        parts = [('word/document.xml', 'document', story('body', 'Body')),
                 *[(name, kind, value) for name, kind, value in stories]]
        relationships = []; references = []; counters = {}
        for index, (name, kind, value) in enumerate(parts[1:]):
            count=counters.get(kind,0); counters[kind]=count+1
            role='even' if force_even and count else 'default' if count==0 else 'first'
            relationships.append(f'<Relationship Id="r{index}" Target="{name.removeprefix("word/")}" Type="{kind}"/>')
            references.append(f'<w:{kind}Reference w:type="{role}" r:id="r{index}"/>')
        document=parts[0][2].replace('xmlns:w=', 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w=')
        document=document.replace('</w:document>', '<w:sectPr>'+''.join(references)+('<w:titlePg/>' if first else '')+'</w:sectPr></w:document>')
        parts[0]=(parts[0][0],parts[0][1],document)
        with ZipFile(path, 'w') as archive:
            archive.writestr('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' + ''.join(
                f'<Override PartName="/{name}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.{kind}+xml"/>'
                for name, kind, value in parts) + '</Types>')
            for index, (name, kind, value) in enumerate(parts):
                if not missing or index == 0: archive.writestr(name, value)
            archive.writestr('word/_rels/document.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(relationships)+'</Relationships>')
            archive.writestr('word/settings.xml',f'<w:settings xmlns:w="{qa.W[1:-1]}">'+('<w:evenAndOddHeaders/>' if even else '')+'</w:settings>')
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

    def test_inactive_first_story_copies_are_not_live_identity_duplicates(self):
        with tempfile.TemporaryDirectory() as folder:
            path=self.package(folder,[('word/footer5.xml','footer',story('footer','Lea','ftr')),
                                      ('word/footer6.xml','footer',story('footer','Lea','ftr'))],first=False)
            self.assertEqual(qa.package_controls(path)[1],{'body':'Body','footer':'Lea'})

    def test_even_story_duplicates_fail_when_even_story_is_active(self):
        with tempfile.TemporaryDirectory() as folder:
            stories=[('word/header8.xml','header',story('header','Lea','hdr')),
                     ('word/header7.xml','header',story('header','Lea','hdr'))]
            path=self.package(folder,stories,even=False,force_even=True)
            self.assertEqual(qa.package_controls(path)[1],{'body':'Body','header':'Lea'})
            path=self.package(folder,stories,even=True,force_even=True)
            with self.assertRaisesRegex(AssertionError,'Duplicated package canonical field'):qa.package_controls(path)


if __name__ == '__main__': unittest.main()
