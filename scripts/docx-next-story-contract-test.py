"""Adversarial native and whole-visible-story integrity tests; no editor or visible-text ID resolution."""
import copy
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

from docx_next_story_qa import compare_native_stories, native_stories, visible_story


def control(key, value, inline=False):
    marker = f'<w:sdt><w:sdtPr><w:tag w:val="{key}"/></w:sdtPr><w:sdtContent>'
    run = f'<w:r><w:t>{value}</w:t></w:r>'
    return f'<w:p>{marker}{run}</w:sdtContent></w:sdt></w:p>' if inline else marker + f'<w:p>{run}</w:p></w:sdtContent></w:sdt>'


def package(path, main, side=None):
    side = side if side is not None else control('side.1', 'Side one') + control('side.2', 'Side two')
    table = '<w:tbl><w:tblPr><w:tblpPr/></w:tblPr><w:tr><w:tc>' + side + '</w:tc></w:tr></w:tbl>'
    xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + table + main + '</w:body></w:document>'
    with ZipFile(path, 'w') as archive: archive.writestr('word/document.xml', xml)


FIELDS = ['side.1', 'side.2', 'main.1', 'main.2']


class StoryContractTest(unittest.TestCase):
    def inspect(self, main, side=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.docx'
            package(path, main, side)
            return native_stories(path, FIELDS)

    def normal(self, inline=False):
        return self.inspect(control('main.1', 'Repeated', inline) + control('main.2', 'Repeated', inline))

    def test_block_to_inline_controls_preserve_whole_paragraph_contract(self):
        self.assertEqual(compare_native_stories(self.normal(), self.normal(True))['status'], 'pass')

    def test_equal_visible_values_do_not_hide_native_id_reordering(self):
        changed = self.inspect(control('main.2', 'Repeated') + control('main.1', 'Repeated'))
        self.assertEqual(compare_native_stories(self.normal(), changed)['status'], 'fail')
        self.assertEqual(changed['errors'][0]['reason'], 'changed-declared-native-paragraph-order')

    def test_duplicated_native_id_is_rejected_even_when_text_is_equal(self):
        changed = self.inspect(control('main.1', 'Repeated') * 2 + control('main.2', 'Repeated'))
        self.assertTrue(any(row['reason'] == 'missing-or-duplicate-native-id' for row in changed['errors']))

    def test_missing_native_id_cannot_be_recovered_from_visible_text(self):
        changed = self.inspect(control('main.1', 'Repeated') + '<w:p><w:r><w:t>Repeated</w:t></w:r></w:p>')
        self.assertEqual(compare_native_stories(self.normal(), changed)['status'], 'fail')

    def test_fragmented_semantic_paragraph_fails(self):
        broken = control('main.1', 'Repeated').replace('</w:p>', '</w:p><w:p><w:r><w:t>Extra</w:t></w:r></w:p>')
        result = self.inspect(broken + control('main.2', 'Repeated'))
        self.assertTrue(any(row['reason'] == 'fragmented-or-missing-whole-paragraph' for row in result['errors']))

    def test_partial_inline_control_does_not_own_complete_paragraph(self):
        partial = control('main.1', 'Repeated', True).replace('</w:p>', '<w:r><w:t>Unowned</w:t></w:r></w:p>')
        result = self.inspect(partial + control('main.2', 'Repeated', True))
        self.assertTrue(any(row['reason'] == 'native-control-does-not-own-whole-paragraph' for row in result['errors']))

    def test_changed_native_cell_owner_fails(self):
        before = self.normal(); after = copy.deepcopy(before)
        after['stories']['main'][0]['owners'] = [{'table': 1, 'row': 0, 'cell': 0}]
        self.assertEqual(compare_native_stories(before, after)['status'], 'fail')

    def test_changed_complete_native_text_fails(self):
        changed = self.inspect(control('main.1', 'Changed') + control('main.2', 'Repeated'))
        self.assertEqual(compare_native_stories(self.normal(), changed)['status'], 'fail')

    def test_changed_native_story_fails(self):
        before = self.normal(); after = copy.deepcopy(before)
        after['stories']['side'].append(after['stories']['main'].pop())
        self.assertEqual(compare_native_stories(before, after)['status'], 'fail')

    def test_extra_undeclared_native_paragraph_fails_even_if_it_would_be_hidden(self):
        changed = self.inspect(control('main.1', 'Repeated') + control('main.2', 'Repeated') + '<w:p><w:r><w:t>Unexpected</w:t></w:r></w:p>')
        self.assertTrue(any(row['reason'] == 'undeclared-native-story-text' for row in changed['errors']))

    def test_extra_unknown_field_cannot_expand_the_declared_native_story(self):
        changed = self.inspect(control('main.1', 'Repeated') + control('main.2', 'Repeated') + control('unknown.id', 'Unexpected'))
        self.assertTrue(any(row['reason'] == 'undeclared-native-story-text' for row in changed['errors']))

    def test_required_empty_helpers_do_not_expand_semantic_story(self):
        changed = self.inspect(control('main.1', 'Repeated') + '<w:p><w:r/></w:p>' + control('main.2', 'Repeated'))
        self.assertEqual(compare_native_stories(self.normal(), changed)['status'], 'pass')

    def test_visible_reordering_is_rejected_when_every_paragraph_survives(self):
        self.assertEqual(visible_story(['First', 'Second'], ['Second', 'First'])['status'], 'fail')

    def test_visible_duplicate_is_rejected_when_native_identity_survives(self):
        self.assertEqual(visible_story(['Title', 'Body'], ['Title', 'TitleBody'])['status'], 'fail')

    def test_authored_duplicates_and_page_spanning_paragraphs_are_preserved(self):
        self.assertEqual(visible_story(['Repeat', 'Repeat', 'Complete paragraph'], ['Repeat Repeat Com', 'plete para\u00adgraph'])['status'], 'pass')

    def test_invalid_expected_id_inventory_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.docx'; package(path, control('main.1', 'Value'))
            for fields in ([], ['main.1', 'main.1']):
                with self.assertRaises(AssertionError): native_stories(path, fields)


if __name__ == '__main__': unittest.main()
