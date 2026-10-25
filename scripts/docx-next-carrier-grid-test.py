"""Adversarial read-only grid audit: real package bytes, exact geometry and limited causality."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('grid', Path(__file__).with_name('docx-next-carrier-grid-qa.py'))
grid = importlib.util.module_from_spec(spec); spec.loader.exec_module(grid)


def package(path, widths):
    cell = lambda width: '<w:tc><w:tcPr><w:tcW w:w="' + str(width) + '"/></w:tcPr><w:p/></w:tc>'
    body = '<w:tbl><w:tblPr><w:tblpPr/><w:tblW w:w="9637"/></w:tblPr><w:tblGrid>' + ''.join('<w:gridCol w:w="' + str(width) + '"/>' for width in widths) + '</w:tblGrid><w:tr>' + ''.join(cell(width) for width in widths) + '</w:tr></w:tbl>'
    with ZipFile(path, 'w') as archive:
        archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '</w:body></w:document>')


class GridTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.root = Path(self.temp.name)
        self.name = 'carrier-story-left-left'
        self.source = self.root / (self.name + '.docx'); self.saved = self.root / (self.name + '-saved.docx')
        package(self.source, [2789, 340, 6508]); package(self.saved, [2788, 341, 6508])
        self.report = {'actualCases': 1, 'earlyStop': {'unrenderedCases': ['a', 'b', 'c', 'd', 'e']}, 'cases': [{'fixture': self.name, 'docxSha256': hashlib.sha256(self.source.read_bytes()).hexdigest(), 'savedDocxSha256': hashlib.sha256(self.saved.read_bytes()).hexdigest(), 'sourceGeometry': grid.carrier.native_geometry(self.source), 'savedGeometry': grid.carrier.native_geometry(self.saved)}]}
        self.write_report()

    def tearDown(self): self.temp.cleanup()
    def write_report(self): (self.root / 'carrier-story-report.json').write_text(json.dumps(self.report))

    def test_arithmetic_match_keeps_exact_geometry_failed_and_cause_unproven(self):
        result = grid.audit(self.root)
        self.assertTrue(result['arithmeticMatchesObservedGrid']); self.assertEqual(result['exactGeometryAcceptance'], 'fail')
        self.assertFalse(result['liveNativeIntermediatesInstrumented']); self.assertIn('unproven', result['causalAcceptance'])
        self.assertEqual(result['gridDeltaTwips'], [-1, 1, 0])

    def test_read_only_audit_preserves_every_input_byte(self):
        before = {p.name: p.read_bytes() for p in self.root.iterdir()}; grid.audit(self.root)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.iterdir()})

    def test_changed_actual_package_does_not_trust_archived_report(self):
        for path in (self.source, self.saved):
            original = path.read_bytes(); path.write_bytes(original + b'changed')
            with self.assertRaisesRegex(AssertionError, 'actual source or saved'): grid.audit(self.root)
            path.write_bytes(original)

    def test_archived_geometry_cannot_substitute_for_actual_xml(self):
        self.report['cases'][0]['savedGeometry'][0]['grid'][0] += 1; self.write_report()
        with self.assertRaisesRegex(AssertionError, 'actual package'): grid.audit(self.root)

    def test_grid_and_cell_disagreement_fails(self):
        with ZipFile(self.saved) as archive: xml = archive.read('word/document.xml').decode()
        with ZipFile(self.saved, 'w') as archive: archive.writestr('word/document.xml', xml.replace('<w:tcW w:w="2788"', '<w:tcW w:w="2789"'))
        row = self.report['cases'][0]; row['savedDocxSha256'] = hashlib.sha256(self.saved.read_bytes()).hexdigest(); row['savedGeometry'] = grid.carrier.native_geometry(self.saved); self.write_report()
        with self.assertRaisesRegex(AssertionError, 'Grid/cell'): grid.audit(self.root)

    def test_more_executed_or_missing_unrendered_cases_fail(self):
        for report in (dict(self.report, actualCases=2), dict(self.report, earlyStop={'unrenderedCases': []})):
            (self.root / 'carrier-story-report.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(AssertionError, 'stopped carrier inventory'): grid.audit(self.root)

    def test_unmatched_arithmetic_remains_an_observation(self):
        package(self.saved, [2787, 342, 6508]); row = self.report['cases'][0]
        row['savedDocxSha256'] = hashlib.sha256(self.saved.read_bytes()).hexdigest(); row['savedGeometry'] = grid.carrier.native_geometry(self.saved); self.write_report()
        result = grid.audit(self.root); self.assertFalse(result['arithmeticMatchesObservedGrid']); self.assertEqual(result['exactGeometryAcceptance'], 'fail')

    def test_malformed_native_widths_are_rejected(self):
        for widths, total in (([True, 340, 6508], 6849), ([2789, 340, 6508], 9638), ([2789, 6848], 9637), ([2789, 0, 6848], 9637)):
            with self.assertRaises(AssertionError): grid.relative_roundtrip(widths, total)

    def test_strict_baseline_preserves_every_geometry_and_scope_field(self):
        result = grid.audit(self.root); changed = copy.deepcopy(result); changed['savedDocxSha256'] = 'zip metadata'
        self.assertEqual(grid.compare_baseline(result, changed)['changedCases'], 0)
        for key in ('sourceGeometry', 'savedGeometry', 'gridDeltaTwips', 'earlyStop', 'arithmetic', 'exactGeometryAcceptance', 'liveNativeIntermediatesInstrumented', 'causalAcceptance', 'newNativeExports'):
            changed = copy.deepcopy(result); changed[key] = 'changed'
            with self.assertRaises(AssertionError): grid.compare_baseline(result, changed)


if __name__ == '__main__': unittest.main()
