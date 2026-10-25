"""Adversarial ownership, native geometry and retained negative-plan controls."""
import copy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('span', Path(__file__).with_name('docx-next-container-span-qa.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ContainerSpanTests(unittest.TestCase):
    fixture = {'tableId': 'cv.table', 'carrier': 'cell-ending',
               'rowFields': [[['side'], [], ['lead']], [[], [], ['main.title']], [[], [], ['main.description']]]}

    def marker(self, identity, text=''):
        run = '<w:r><w:t>' + text + '</w:t></w:r>' if text else ''
        return '<w:sdt><w:sdtPr><w:tag w:val="' + identity + '"/></w:sdtPr><w:sdtContent><w:p>' + run + '</w:p></w:sdtContent></w:sdt>'

    def table(self):
        rows = []
        for index, values in enumerate(self.fixture['rowFields']):
            cells = []
            for cell, fields in enumerate(values):
                merge = '<w:vMerge w:val="' + ('restart' if index == 0 else 'continue') + '"/>' if cell == 0 else ''
                content = ''.join(self.marker(field) for field in fields)
                ending = self.marker('cv.table') if index == cell == 0 else '<w:p/>'
                cells.append('<w:tc><w:tcPr>' + merge + '</w:tcPr>' + content + ending + '</w:tc>')
            rows.append('<w:tr>' + ''.join(cells) + '</w:tr>')
        return '<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="2800"/><w:gridCol w:w="400"/><w:gridCol w:w="6400"/></w:tblGrid>' + ''.join(rows) + '</w:tbl>'

    def owner(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'native.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', '<w:document xmlns:w="' + module.W[1:-1] + '"><w:body>' + content + '</w:body></w:document>')
            return module.owner_result(path, self.fixture)

    def row(self):
        track = {'fullTextVisible': True}
        render = {'pages': 21, 'visibleBounds': 'pass', 'tracks': [track, track]}
        return {'native': {'completeNativeText': 'pass', 'fieldIdentity': 'pass', 'tableIdentity': 'fail'},
                'containerOwner': self.owner(self.table()), 'controlRasterIdentity': 'pass',
                'render': render, 'saveReopen': copy.deepcopy(render)}

    def test_marker_resolves_all_three_rows_and_the_spanning_owner(self):
        owner = self.owner(self.table())
        self.assertEqual(owner['status'], 'pass')
        self.assertEqual(owner['rowFields'], self.fixture['rowFields'])
        self.assertEqual(owner['verticalMerges'], [['restart', None, None], ['continue', None, None], ['continue', None, None]])

    def test_plain_text_does_not_supply_the_container_id(self):
        source = self.table().replace(self.marker('cv.table'), '<w:p><w:r><w:t>cv.table</w:t></w:r></w:p>')
        self.assertEqual(self.owner(source)['reason'], 'missing-or-duplicate-container-marker')

    def test_duplicate_marker_is_rejected(self):
        self.assertEqual(self.owner(self.table() + self.marker('cv.table'))['status'], 'fail')

    def test_body_marker_has_no_native_owner(self):
        source = self.table().replace(self.marker('cv.table'), '<w:p/>')
        self.assertEqual(self.owner(source + self.marker('cv.table'))['reason'], 'marker-outside-native-table-cell')

    def test_content_marker_is_rejected(self):
        source = self.table().replace(self.marker('cv.table'), self.marker('cv.table', 'hidden'))
        self.assertEqual(self.owner(source)['reason'], 'container-marker-has-content')

    def test_changed_main_description_owner_is_rejected(self):
        source = self.table().replace(self.marker('main.description'), '')
        source = source.replace(self.marker('main.title'), self.marker('main.title') + self.marker('main.description'))
        self.assertEqual(self.owner(source)['reason'], 'changed-container-owner')

    def test_lost_semantic_spacer_id_is_rejected(self):
        self.assertEqual(self.owner(self.table().replace(self.marker('lead'), '<w:p/>'))['status'], 'fail')

    def test_exact_grid_drift_stops_even_when_id_owner_passes(self):
        row = self.row()
        before = copy.deepcopy(row['containerOwner'])
        row['containerOwner']['gridTwips'][-1] += 1
        self.assertEqual(module.regression(row, self.fixture, before), 'changed-native-owner-structure')

    def test_changed_span_or_ending_rule_stops(self):
        row = self.row()
        for key in ['verticalMerges', 'cellEndKeepNext', 'rowKeepTogether', 'tableWidthTwips']:
            after = copy.deepcopy(row)
            after['containerOwner'][key] = 'changed'
            self.assertEqual(module.regression(after, self.fixture, row['containerOwner']), 'changed-native-owner-structure')

    def test_caption_failure_is_retained_as_a_separate_requirement(self):
        row = self.row()
        self.assertEqual(row['native']['tableIdentity'], 'fail')
        self.assertIsNone(module.regression(row, self.fixture, row['containerOwner']))

    def test_lost_text_or_changed_pixels_never_passes(self):
        row = self.row()
        after = copy.deepcopy(row)
        after['render']['tracks'][0]['fullTextVisible'] = False
        self.assertEqual(module.regression(after, self.fixture, row['containerOwner']), 'complete-pdf-text-or-bounds')
        row['controlRasterIdentity'] = 'fail'
        self.assertEqual(module.regression(row, self.fixture, row['containerOwner']), 'control-raster-identity')

    def test_baseline_locks_stopped_plan_and_exact_owner_geometry(self):
        row = self.row()
        for phase in ['render', 'saveReopen']:
            row[phase]['tracks'] = [{'metadataMetrics': []}, {'metadataMetrics': []}]
        row.update(fixture='case', savedDocxSha256='metadata')
        before = {'matrix': 'container-span', 'plannedCases': 8, 'actualCases': 1, 'pages': 21,
                  'stoppedAfter': 'case:changed-native-owner-structure', 'preparedSources': ['source'], 'fixtures': [row]}
        for key, value in [('actualCases', 8), ('stoppedAfter', None), ('preparedSources', ['other'])]:
            after = copy.deepcopy(before)
            after[key] = value
            with self.assertRaises(AssertionError):
                module.compare_baseline(before, after)
        after = copy.deepcopy(before)
        after['fixtures'][0]['containerOwner']['gridTwips'][0] += 1
        with self.assertRaises(AssertionError):
            module.compare_baseline(before, after)
        after = copy.deepcopy(before)
        after['fixtures'][0]['savedDocxSha256'] = 'native-nondeterministic-metadata'
        module.compare_baseline(before, after)


if __name__ == '__main__':
    unittest.main()
