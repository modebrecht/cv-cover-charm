"""Adversarial complete owner/structure and strict evidence tests; no native execution."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('inline', Path(__file__).with_name('docx-next-inline-story-qa.py'))
inline = importlib.util.module_from_spec(spec); spec.loader.exec_module(inline)

P1 = '<w:sdt><w:sdtPr><w:tag w:val="main.1"/></w:sdtPr><w:sdtContent><w:p><w:pPr><w:keepNext w:val="1"/></w:pPr><w:r><w:t>Same</w:t></w:r></w:p></w:sdtContent></w:sdt>'
P2 = P1.replace('main.1', 'main.2')
NESTED = '<w:tbl><w:tblPr><w:tblCaption w:val="entry.1"/></w:tblPr><w:tr><w:tc>' + P2 + '</w:tc></w:tr></w:tbl>'
MAIN = P1 + NESTED
SIDE = '<w:tbl><w:tblPr><w:tblpPr/></w:tblPr><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl><w:p/>'


def package(path, body):
    with ZipFile(path, 'w') as archive:
        archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + SIDE + body + '<w:sectPr/></w:body></w:document>')


def owner(content=MAIN, props='', row_props=''):
    return '<w:tbl><w:tblPr><w:tblCaption w:val="main.owner"/>' + props + '</w:tblPr><w:tr>' + row_props + '<w:tc><w:tcPr/>' + content + '<w:p/></w:tc></w:tr></w:tbl><w:p/>'


class InlineStoryTest(unittest.TestCase):
    def inspect(self, content):
        with tempfile.TemporaryDirectory() as directory:
            before, after = [Path(directory) / name for name in ('before.docx', 'after.docx')]
            package(before, MAIN); package(after, content)
            return inline.source_structure(before, after, 'main.owner')

    def test_whole_native_blocks_keep_nested_entry_ownership(self):
        result = self.inspect(owner())
        self.assertEqual(result['status'], 'pass')
        self.assertEqual(result['originalMainTables'], 1)
        self.assertEqual(result['originalMainParagraphs'], 2)

    def test_flattening_equal_visible_nested_text_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'complete native main block'):
            self.inspect(owner(P1 + P2))

    def test_equal_visible_paragraph_reorder_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'complete native main block'):
            self.inspect(owner(NESTED + P1))

    def test_changed_original_paragraph_rule_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'complete native main block'):
            self.inspect(owner(MAIN.replace('w:val="1"', 'w:val="0"')))

    def test_extra_unowned_native_text_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'complete native main block'):
            self.inspect(owner(MAIN + '<w:p><w:r><w:t>Extra</w:t></w:r></w:p>'))

    def test_forbidden_fixed_capacity_owner_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'automatically splittable'):
            self.inspect(owner(row_props='<w:trPr><w:cantSplit/></w:trPr>'))

    def test_fixed_height_owner_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'automatically splittable'):
            self.inspect(owner(row_props='<w:trPr><w:trHeight w:val="1000" w:hRule="exact"/></w:trPr>'))

    def test_floating_main_owner_is_not_an_inline_owner(self):
        with self.assertRaisesRegex(AssertionError, 'must be inline'):
            self.inspect(owner(props='<w:tblpPr/>'))

    def test_duplicate_complete_native_owner_is_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'duplicated declared'):
            self.inspect(owner() + owner())

    def baseline(self):
        return {'libreOfficeVersion': 'original', 'preparedSources': [{'docxSha256': 'source'}],
                'cases': [{'savedDocxSha256': 'zip-a', 'sourceStories': {'main': ['main.1', 'main.2']},
                           'savedStories': {'main': ['main.1', 'main.2']}, 'sourceGeometry': [1234],
                           'savedGeometry': [1234], 'wholeVisibleStories': {'render': 'pass'},
                           'rasterPages': {'render': ['all-rgba-digest']}}],
                'earlyStop': {'reasons': ['render-opening'], 'unrenderedCases': ['long']}}

    def test_only_runtime_label_and_saved_zip_metadata_are_excluded(self):
        original = self.baseline(); actual = copy.deepcopy(original)
        actual['libreOfficeVersion'] = 'independent'; actual['cases'][0]['savedDocxSha256'] = 'zip-b'
        self.assertEqual(inline.compare_baseline(original, actual)['changedCases'], 0)
        self.assertEqual(original, self.baseline())

    def test_native_source_geometry_story_pixels_and_stop_inventory_remain_strict(self):
        original = self.baseline()
        for field in ('sourceStories', 'savedStories', 'sourceGeometry', 'savedGeometry', 'wholeVisibleStories', 'rasterPages'):
            with self.subTest(field=field):
                actual = copy.deepcopy(original); actual['cases'][0][field] = 'changed'
                with self.assertRaisesRegex(AssertionError, 'Changed complete-story'):
                    inline.compare_baseline(original, actual)
        for field in ('preparedSources', 'earlyStop'):
            with self.subTest(field=field):
                actual = copy.deepcopy(original); actual[field] = 'changed'
                with self.assertRaisesRegex(AssertionError, 'Changed complete-story'):
                    inline.compare_baseline(original, actual)


if __name__ == '__main__': unittest.main()
