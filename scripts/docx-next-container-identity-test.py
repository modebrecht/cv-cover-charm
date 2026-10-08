"""Adversarial native carrier controls: an ID must retain its actual table owner."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('container', Path(__file__).with_name('docx-next-container-identity-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ContainerIdentityTests(unittest.TestCase):
    fixture = {'tableId': 'cv.container', 'cellFields': [['cv.first'], ['cv.second']]}

    def field(self, identity, text=''):
        return f'<w:sdt><w:sdtPr><w:tag w:val="{identity}"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:sdtContent></w:sdt>' if text else f'<w:sdt><w:sdtPr><w:tag w:val="{identity}"/></w:sdtPr><w:sdtContent><w:p/></w:sdtContent></w:sdt>'

    def table(self, first=None, second=None):
        a = self.field('cv.first') + self.field('cv.container') if first is None else first
        b = self.field('cv.second') + '<w:p/>' if second is None else second
        return '<w:tbl><w:tblGrid><w:gridCol w:w="4800"/><w:gridCol w:w="4800"/></w:tblGrid><w:tr><w:tc>' + a + '</w:tc><w:tc>' + b + '</w:tc></w:tr></w:tbl>'

    def result(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'source.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', '<w:document xmlns:w="' + module.W[1:-1] + '"><w:body>' + content + '</w:body></w:document>')
            return module.owner_result(path, self.fixture)

    def test_correct_empty_ending_id_retains_its_owner(self):
        self.assertEqual(self.result(self.table())['status'], 'pass')

    def test_plain_text_cannot_supply_a_missing_marker(self):
        self.assertEqual(self.result(self.table(first=self.field('cv.first', 'cv.container') + '<w:p/>'))['reason'], 'missing-or-duplicate-container-marker')

    def test_duplicate_marker_is_rejected(self):
        self.assertEqual(self.result(self.table() + self.field('cv.container'))['reason'], 'missing-or-duplicate-container-marker')

    def test_body_marker_is_not_a_table_identity(self):
        self.assertEqual(self.result(self.field('cv.container') + self.table(first=self.field('cv.first') + '<w:p/>'))['reason'], 'marker-outside-native-table-cell')

    def test_wrong_table_with_same_id_is_rejected(self):
        self.assertEqual(self.result(self.table(first=self.field('other.first') + self.field('cv.container')))['reason'], 'changed-container-owner')

    def test_marker_in_neighbour_cell_is_rejected(self):
        self.assertEqual(self.result(self.table(first=self.field('cv.first') + '<w:p/>', second=self.field('cv.second') + self.field('cv.container')))['reason'], 'changed-container-owner')

    def test_marker_moved_before_field_is_rejected(self):
        self.assertEqual(self.result(self.table(first=self.field('cv.container') + self.field('cv.first') + '<w:p/>'))['reason'], 'changed-container-owner')

    def test_text_in_marker_is_rejected(self):
        self.assertEqual(self.result(self.table(first=self.field('cv.first') + self.field('cv.container', 'Hidden text')))['reason'], 'container-marker-has-content')

    def test_caption_loss_remains_explicit_without_stopping_carrier_comparison(self):
        row = {'native': {'completeNativeText': 'pass', 'fieldIdentity': 'pass', 'tableIdentity': 'fail'},
               'containerOwner': {'status': 'pass'}, 'render': {'status': 'pass'}, 'saveReopen': {'status': 'pass'}}
        self.assertIsNone(module.stop_reason(row, {'carrier': 'cell-ending'}))
        row['containerOwner']['status'] = 'fail'
        self.assertEqual(module.stop_reason(row, {'carrier': 'cell-ending'}), 'container-owner')


if __name__ == '__main__':
    unittest.main()
