"""Read-only adversarial checks for two complete declared native owners."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from docx_next_story_qa import native_stories

spec = importlib.util.spec_from_file_location('dual', Path(__file__).with_name('docx-next-dual-story-qa.py'))
dual = importlib.util.module_from_spec(spec); spec.loader.exec_module(dual)


def field(key):
    return '<w:sdt><w:sdtPr><w:tag w:val="' + key + '"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Repeated</w:t></w:r></w:p></w:sdtContent></w:sdt>'


def table(key, content, floating=True, row=''):
    return '<w:tbl><w:tblPr><w:tblCaption w:val="' + key + '"/>' + ('<w:tblpPr/>' if floating else '') + '</w:tblPr><w:tblGrid><w:gridCol w:w="2000"/></w:tblGrid><w:tr>' + row + '<w:tc>' + content + '<w:p/></w:tc></w:tr></w:tbl>'


SIDE = table('side.owner', field('side.1') + field('side.2'))
MAIN = field('main.1') + table('entry.1', field('main.2'), False)
FIELDS = ['side.1', 'side.2', 'main.1', 'main.2']


def package(path, body):
    with ZipFile(path, 'w') as archive:
        archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:p/><w:sectPr/></w:body></w:document>')


class DualStoryTest(unittest.TestCase):
    def structure(self, main=MAIN, separator='', row='', floating=True, side=SIDE):
        with tempfile.TemporaryDirectory() as directory:
            before, after = [Path(directory) / name for name in ('before.docx', 'after.docx')]
            package(before, SIDE + '<w:p/>' + table('main.owner', MAIN, False))
            package(after, side + separator + table('main.owner', main, floating, row))
            return dual.source_structure(before, after, 'main.owner')

    def test_complete_independent_owners_keep_nested_native_entries(self):
        result = self.structure()
        self.assertEqual(result['storyOwners'], {'side': 0, 'main': 1})
        self.assertEqual(result['originalMainTables'], 1)
        self.assertEqual(result['originalMainParagraphs'], 2)

    def test_unowned_separator_does_not_invoke_adjacent_import_anchors(self):
        with self.assertRaisesRegex(AssertionError, 'directly adjacent'):
            self.structure(separator='<w:p/>')

    def test_inline_main_is_not_a_second_independent_floating_owner(self):
        with self.assertRaisesRegex(AssertionError, 'must be floating'):
            self.structure(floating=False)

    def test_no_fixed_or_unsplittable_story_capacity(self):
        for props in ('<w:cantSplit/>', '<w:trHeight w:val="9000" w:hRule="exact"/>'):
            with self.subTest(props=props), self.assertRaisesRegex(AssertionError, 'automatically splittable'):
                self.structure(row='<w:trPr>' + props + '</w:trPr>')

    def test_equal_visible_text_cannot_hide_flattening_or_reordering(self):
        for changed in (field('main.1') + field('main.2'), table('entry.1', field('main.2'), False) + field('main.1')):
            with self.assertRaisesRegex(AssertionError, 'complete native main block'):
                self.structure(main=changed)

    def test_original_complete_side_story_cannot_change(self):
        with self.assertRaisesRegex(AssertionError, 'complete side block'):
            self.structure(side=SIDE.replace('side.1', 'other.id'))

    def native(self, main=MAIN, extra='', owners=None, default=False):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.docx'
            package(path, SIDE + table('main.owner', main) + extra)
            return native_stories(path, FIELDS) if default else native_stories(path, FIELDS, owners or {'side': 0, 'main': 1})

    def test_actual_native_order_and_full_ancestry_resolve_both_stories(self):
        result = self.native()
        self.assertFalse(result['errors'])
        self.assertEqual(result['stories']['main'][1]['owners'], [{'table': 2, 'row': 0, 'cell': 0}, {'table': 1, 'row': 0, 'cell': 0}])

    def test_single_owner_default_contract_is_not_weakened(self):
        with self.assertRaisesRegex(AssertionError, 'one declared floating'):
            self.native(default=True)

    def test_changed_declared_owner_inventory_cannot_fall_back_to_visible_text(self):
        for owners in ({'side': 0, 'main': 0}, {'side': 0, 'main': 2}, {'side': 0}):
            with self.assertRaises(AssertionError): self.native(owners=owners)

    def test_field_cannot_escape_both_complete_native_owners(self):
        result = self.native(main=field('main.1'), extra=field('main.2'))
        self.assertTrue(any(row['reason'] == 'field-outside-declared-independent-owner' for row in result['errors']))

    def test_equal_visible_text_cannot_hide_native_id_reorder(self):
        result = self.native(main=field('main.2') + field('main.1'))
        self.assertTrue(any(row['reason'] == 'changed-declared-native-paragraph-order' for row in result['errors']))

    def test_strict_baseline_preserves_pixels_geometry_sources_and_stop_inventory(self):
        baseline = {'libreOfficeVersion': 'label', 'preparedSources': ['source'], 'cases': [{'savedDocxSha256': 'zip', 'rasterPages': ['all-pixels'], 'sourceGeometry': [1], 'savedStories': ['whole-native']}], 'earlyStop': {'unrenderedCases': ['long']}}
        permitted = copy.deepcopy(baseline); permitted['libreOfficeVersion'] = 'other'; permitted['cases'][0]['savedDocxSha256'] = 'other'
        self.assertEqual(dual.compare_baseline(baseline, permitted)['changedCases'], 0)
        for key in ('rasterPages', 'sourceGeometry', 'savedStories'):
            changed = copy.deepcopy(baseline); changed['cases'][0][key] = 'changed'
            with self.assertRaises(AssertionError): dual.compare_baseline(baseline, changed)
        for key in ('preparedSources', 'earlyStop'):
            changed = copy.deepcopy(baseline); changed[key] = 'changed'
            with self.assertRaises(AssertionError): dual.compare_baseline(baseline, changed)


if __name__ == '__main__': unittest.main()
