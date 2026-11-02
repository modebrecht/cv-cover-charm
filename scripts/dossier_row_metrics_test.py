#!/usr/bin/env python3
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from dossier_row_metrics import make_copy, empty_footers, entry_ink, PROFILES
from dossier_entry_rows import load_cases
from dossier_lo_context import W, NS, canon, read_root
from dossier_production_spacing import critical
from dossier_layout_rows import drawing_payloads, word_values

ROOT = Path(__file__).resolve().parents[1]


class RowMetrics(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name); _, self.cases = load_cases(ROOT)

    def test_all_four_controls_match_retained_native_inputs(self):
        report = json.loads((ROOT/'docs/qa/p2-23-native-results.json').read_text())
        for case, source in self.cases:
            meta = make_copy(source, self.folder/'copy.docx', 'prior-control')
            expected = next(c for c in report['cases'] if c['source_id'] == case['id'] and c['profile'] == 'body-flow-nosplit-front')
            self.assertEqual(meta['copy_sha256'], expected['package']['copy_sha256'])

    def test_each_probe_changes_only_its_declared_section_nodes(self):
        for case, source in self.cases:
            control = self.folder/'control.docx'; make_copy(source, control, 'prior-control')
            before = read_root(control)
            for profile in PROFILES[1:]:
                target = self.folder/'probe.docx'; meta = make_copy(source, target, profile); actual = read_root(target)
                expected = deepcopy(before); sect = expected.find('w:body/w:sectPr', NS)
                if profile == 'footer-references-off':
                    for node in sect.findall('w:footerReference', NS): sect.remove(node)
                else: sect.find('w:pgMar', NS).set(W+('footer' if profile == 'footer-distance-zero' else 'bottom'), '0')
                self.assertEqual(canon(actual), canon(expected)); self.assertEqual(critical(actual,18), critical(before,18))
                self.assertEqual(word_values(actual), word_values(before)); self.assertEqual(drawing_payloads(actual), drawing_payloads(before))
                self.assertEqual(len(actual.findall('.//w:sdt', NS)),107)
                with ZipFile(control) as a, ZipFile(target) as b:
                    self.assertEqual(a.namelist(), b.namelist())
                    self.assertTrue(all(a.read(n) == b.read(n) for n in a.namelist() if n != 'word/document.xml'))

    def test_visible_or_field_footer_cannot_be_silently_removed(self):
        source = self.cases[0][1]
        with ZipFile(source) as z: parts = {n: z.read(n) for n in z.namelist()}
        root = ET.fromstring(parts['word/document.xml'])
        for tag in ['t','drawing','fldSimple','tbl']:
            changed = dict(parts); footer = ET.fromstring(changed['word/cv-footer.xml'])
            ET.SubElement(footer.find('w:p',NS), W+tag).text = 'synthetic' if tag == 't' else None
            changed['word/cv-footer.xml'] = ET.tostring(footer)
            with self.assertRaises(ValueError): empty_footers(changed, root)

    def test_real_native_text_ink_extents_cover_all_retained_entries(self):
        pdf = ROOT/'tests/fixtures/lo-import-p2-23/varied-right-body-flow-nosplit-front-lo.pdf'
        # Retained P223 five-page native candidate has all 18 guarded entries.
        values = entry_ink(pdf)
        self.assertEqual(len(values), 18)
        self.assertTrue(all(v['title_page'] == v['terminal_description_page'] and v['same_page_ink_extent_mm'] > 0 for v in values))
        report = json.loads((ROOT/'docs/qa/p2-23-native-results.json').read_text())
        expected = next(c for c in report['cases'] if c['id'] == 'cv-18-varied-right-body-flow-nosplit-front')['actual']['content']['marker_pages']
        self.assertEqual({v['marker']: [v['title_page']] for v in values}, {k:v for k,v in expected.items() if k != 'P202Endreferenz'})

    def test_invalid_profile_and_overwrite_leave_original_unchanged(self):
        source = self.cases[0][1]; before = source.read_bytes()
        with self.assertRaises(ValueError): make_copy(source, self.folder/'x.docx', 'invalid')
        with self.assertRaises(ValueError): make_copy(source, source, 'prior-control')
        self.assertEqual(source.read_bytes(), before)


if __name__ == '__main__': unittest.main()
