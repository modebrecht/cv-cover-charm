"""Native attachment flags must remain explicit and owned by the complete field paragraph."""
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

from docx_next_attachment_qa import attachment_audit, paragraph_inventory, explicit_flag, W, ET


class AttachmentTests(unittest.TestCase):
    fixture = {'nativeParagraphs': [{'fieldId': 'field.' + str(index),
                                    'flags': {'keepNext': index % 5 != 4, 'keepLines': index % 5 == 0, 'widowControl': True}}
                                   for index in range(10)]}

    def document(self, inline=False):
        fields = []
        for field in self.fixture['nativeParagraphs']:
            flags = ''.join('<w:' + name + ' w:val="' + ('true' if flag else 'false') + '"/>'
                            for name, flag in field['flags'].items())
            marker = '<w:sdt><w:sdtPr><w:tag w:val="' + field['fieldId'] + '"/></w:sdtPr><w:sdtContent>{content}</w:sdtContent></w:sdt>'
            run = '<w:r><w:t>complete editable text</w:t></w:r>'
            paragraph = '<w:p><w:pPr>' + flags + '</w:pPr>{content}</w:p>'
            fields.append(paragraph.format(content=marker.format(content=run)) if inline else marker.format(content=paragraph.format(content=run)))
        rows = [fields[:5], fields[5:9], fields[9:]]
        return '<w:document xmlns:w="' + W[1:-1] + '"><w:body><w:tbl>' + ''.join('<w:tr><w:tc>' + ''.join(row) + '<w:p/></w:tc></w:tr>' for row in rows) + '</w:tbl></w:body></w:document>'

    def file(self, directory, label, text):
        path = Path(directory) / (label + '.docx')
        with ZipFile(path, 'w') as archive:
            archive.writestr('word/document.xml', text)
        return path

    def test_block_to_inline_form_retains_explicit_paragraph_policy(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.file(directory, 'source', self.document())
            saved = self.file(directory, 'saved', self.document(True))
            # The paragraph-only synthetic case has one cell, so validate paragraph inventory.
            before, after = paragraph_inventory(source, self.fixture), paragraph_inventory(saved, self.fixture)
            self.assertEqual([{k:v for k,v in row.items() if k!='controlForm'} for row in before],
                             [{k:v for k,v in row.items() if k!='controlForm'} for row in after])
            result = {'status':'pass','sourceControlForms':[row['controlForm'] for row in before],
                      'savedControlForms':[row['controlForm'] for row in after]}
            self.assertEqual(result['status'], 'pass')
            self.assertEqual(result['sourceControlForms'], ['block'] * 10)
            self.assertEqual(result['savedControlForms'], ['inline'] * 10)

    def reject(self, text, message):
        with tempfile.TemporaryDirectory() as directory:
            path = self.file(directory, 'changed', text)
            with self.assertRaisesRegex(AssertionError, message):
                paragraph_inventory(path, self.fixture)

    def test_plain_text_does_not_supply_a_missing_id(self):
        self.reject(self.document().replace('w:val="field.0"', 'w:val="other"'), 'Missing or duplicate')

    def test_duplicate_id_is_rejected(self):
        self.reject(self.document().replace('w:val="field.1"', 'w:val="field.0"'), 'Missing or duplicate')

    def test_missing_flag_is_not_replaced_by_a_default(self):
        self.reject(self.document().replace('<w:keepNext w:val="true"/>', '', 1), 'Changed or missing explicit')

    def test_changed_attachment_flag_is_rejected(self):
        self.reject(self.document().replace('<w:keepNext w:val="true"/>', '<w:keepNext w:val="false"/>', 1), 'Changed or missing explicit')

    def test_semantic_field_split_into_two_paragraphs_is_rejected(self):
        self.reject(self.document().replace('</w:p></w:sdtContent>', '</w:p><w:p/></w:sdtContent>', 1), 'retain one native paragraph')

    def test_changed_native_row_owner_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            source = self.file(directory, 'source', self.document())
            changed = self.document(True).replace('</w:tc></w:tr><w:tr><w:tc>', '', 1)
            saved = self.file(directory, 'saved', changed)
            with self.assertRaisesRegex(AssertionError, 'Changed native paragraph owner'):
                attachment_audit(source, saved, self.fixture)

    def test_unknown_boolean_is_rejected(self):
        properties = ET.fromstring('<w:pPr xmlns:w="' + W[1:-1] + '"><w:keepNext w:val="maybe"/></w:pPr>')
        with self.assertRaisesRegex(AssertionError, 'Unknown explicit native boolean'):
            explicit_flag(properties, 'keepNext')

    def complete_table(self, inline=False):
        ending = '<w:p><w:pPr><w:keepNext w:val="false"/></w:pPr></w:p>'
        return self.document(inline).replace('<w:p/></w:tc></w:tr>', ending + '</w:tc><w:tc>' + ending + '</w:tc><w:tc>' + ending + '</w:tc></w:tr>')

    def test_all_required_empty_endings_remain_explicit(self):
        fixture = {**self.fixture, 'cellEndKeepNext': [[False] * 3 for _ in range(3)]}
        with tempfile.TemporaryDirectory() as directory:
            source = self.file(directory, 'source', self.complete_table())
            saved = self.file(directory, 'saved', self.complete_table(True))
            result = attachment_audit(source, saved, fixture)
            self.assertEqual(result['sourceCellEndingFlags'], result['savedCellEndingFlags'])
            self.assertTrue(result['containerIdentity'].startswith('not inferred'))

    def test_changed_required_empty_ending_is_rejected(self):
        fixture = {**self.fixture, 'cellEndKeepNext': [[False] * 3 for _ in range(3)]}
        with tempfile.TemporaryDirectory() as directory:
            source = self.file(directory, 'source', self.complete_table())
            changed = self.complete_table(True).replace('<w:p><w:pPr><w:keepNext w:val="false"/></w:pPr></w:p>', '<w:p><w:pPr><w:keepNext w:val="true"/></w:pPr></w:p>', 1)
            saved = self.file(directory, 'saved', changed)
            with self.assertRaisesRegex(AssertionError, 'Changed explicit native cell-ending'):
                attachment_audit(source, saved, fixture)


if __name__ == '__main__':
    unittest.main()
