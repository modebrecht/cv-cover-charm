"""Contract/negative checks for bounded synthetic QA, without a native converter."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import dossier_qa as qa
from PIL import Image, ImageDraw


class DossierQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = qa.load_frozen('full')

    def test_ten_verified_candidates_are_byte_exact_and_sources_unchanged(self):
        with tempfile.TemporaryDirectory() as tmp:
            for meta, source, _ in self.rows:
                with self.subTest(case=meta['id']):
                    before = source.read_bytes()
                    target = Path(tmp) / (meta['id'] + '.docx')
                    qa.make_candidate(source, target, meta['entry_count'])
                    self.assertEqual(qa.core.digest(target), meta['expected_candidate_sha256'])
                    self.assertEqual(source.read_bytes(), before)
                    with ZipFile(source) as a, ZipFile(target) as b:
                        self.assertEqual(a.namelist(), b.namelist())
                        self.assertTrue(all(a.read(n) == b.read(n) for n in a.namelist() if n != 'word/document.xml'))

    def test_missing_title_description_end_and_reference_are_detected(self):
        n = 18
        text = ' '.join(f'P202Praxis{i:02} Arbeitsschritte' for i in range(1, n+1)) + ' P202Endreferenz Klassenlehrer 079 555 12 34'
        self.assertEqual(qa.core.content([text], n)['status'], 'PASS')
        for needle in ['P202Praxis09', 'P202Praxis09 Arbeitsschritte', 'Klassenlehrer', '079 555 12 34']:
            with self.subTest(missing=needle):
                broken = text.replace(needle, 'P202Praxis09' if ' Arbeitsschritte' in needle else '')
                self.assertEqual(qa.core.content([broken], n)['status'], 'FAIL')

    def test_photo_missing_shifted_wrong_pattern_and_repetition_fail(self):
        app = copy.deepcopy(self.rows[0][0]['app'])
        compare = qa.core.compare
        for mutate in [lambda a: a['photos'][0].update(visible=False),
                       lambda a: a['photos'][0]['bbox_mm'].__setitem__(0, a['photos'][0]['bbox_mm'][0]+3),
                       lambda a: a['photos'][0].update(grid=[99]*64),
                       lambda a: a['photos'][1].update(visible=True)]:
            actual = copy.deepcopy(app)
            mutate(actual)
            self.assertEqual(compare(app, actual, 17, False)['status'], 'FAIL')

    def test_wrong_side_split_and_title_geometry_fail(self):
        app = copy.deepcopy(self.rows[0][0]['app'])
        self.assertEqual(qa.core.compare(app, app, 17, True)['status'], 'FAIL')
        actual = copy.deepcopy(app)
        actual['title_positions']['P202Praxis01']['top_left_mm'][1] += 2.01
        self.assertEqual(qa.core.compare(app, actual, 17, False)['status'], 'FAIL')
        actual = copy.deepcopy(app)
        actual['content']['split_entries'] = ['P202Praxis01']
        self.assertEqual(qa.core.compare(app, actual, 17, False)['status'], 'FAIL')

    def test_weak_section_line_is_rejected(self):
        blank = Image.new('RGB', (200, 40), 'white')
        draw = ImageDraw.Draw(blank)
        draw.line((0, 20, 150, 20), fill='black', width=2)
        self.assertEqual(qa.core._reference_anchor_line_pixels(blank)['status'], 'FAIL')
        draw.line((0, 20, 199, 20), fill='black', width=2)
        self.assertEqual(qa.core._reference_anchor_line_pixels(blank)['status'], 'PASS')

    def test_populated_or_field_footer_is_rejected_before_output(self):
        source = self.rows[0][1]
        W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        for kind in ['t', 'fldSimple', 'drawing']:
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as tmp:
                changed = Path(tmp) / 'source.docx'
                target = Path(tmp) / 'candidate.docx'
                with ZipFile(source) as a, ZipFile(changed, 'w') as b:
                    parts = {n:a.read(n) for n in a.namelist()}
                    footer = qa.core._row_metrics_empty_footers(parts, qa.core._lo_context_parse_part(parts['word/document.xml']))[0]
                    for info in a.infolist():
                        raw = a.read(info)
                        if info.filename == footer:
                            root = ET.fromstring(raw)
                            node = ET.SubElement(root.find(W+'p'), W+kind)
                            node.text = 'Must survive' if kind == 't' else None
                            raw = ET.tostring(root)
                        b.writestr(info, raw)
                with self.assertRaises(ValueError):
                    qa.make_candidate(changed, target, 17)
                self.assertFalse(target.exists())

    def test_source_overwrite_and_unsupported_count_are_rejected(self):
        source = self.rows[0][1]
        with self.assertRaises(ValueError):
            qa.make_candidate(source, source, 17)
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(ValueError):
            qa.make_candidate(source, Path(tmp)/'copy.docx', 20)

    def test_execution_pass_does_not_mask_candidate_failure(self):
        self.assertFalse(qa.acceptance([]))
        self.assertFalse(qa.acceptance([{'execution_status':'PASS', 'original':{'status':'FAIL'}, 'candidate':{'status':'FAIL'}}]))
        self.assertTrue(qa.acceptance([{'original':{'status':'FAIL'}, 'candidate':{'status':'PASS'}}]))
        self.assertFalse(qa.acceptance([{'original':{'status':'FAIL'}}]))

    def test_missing_sources_write_blocked_report_and_return_nonzero(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)/'out'
            code = qa.main(['--source-dir', str(Path(tmp)/'missing'), '--out-dir', str(out)])
            self.assertNotEqual(code, 0)
            self.assertEqual(json.loads((out/'RESULTS.json').read_text())['status'], 'BLOCKED')
            self.assertTrue((out/'SUMMARY.md').exists())

    def test_cover_letter_gate_requires_app_native_and_source_markers(self):
        text = qa.compact('Guten Tag Freundliche Grüsse')
        markers = ['Guten Tag', 'Freundliche Grüsse']
        self.assertEqual(qa.simple_document_result(text, text, text, markers, True)['status'], 'PASS')
        for label in ['app', 'native', 'source']:
            args = {key: text for key in ['app', 'native', 'source']}
            args[label] = ''
            self.assertEqual(qa.simple_document_result(args['app'], args['native'], args['source'], markers, True)['status'], 'FAIL')
        self.assertEqual(qa.simple_document_result(text, text, text, markers, False)['status'], 'FAIL')

    def test_contact_sheet_does_not_count_ocr_rasters_as_extra_pages(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder/'app').mkdir()
            for name in ['render-1.png', 'render-1-ocr.png']:
                Image.new('RGB', (20, 30), 'white').save(folder/'app'/name)
            target = folder/'comparison.jpg'
            qa.contact_sheet(folder, target)
            with Image.open(target) as im:
                self.assertEqual(im.size, (900, 455))

    def test_mixed_sha_and_missing_source_pair_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp)
            catalog = {
                'sha':'a'*40, 'rows':[{'id':'modern','status':'ELIGIBLE'}]+[{'id':str(i),'status':'BLOCKED'} for i in range(38)]}
            (source/'CATALOG.json').write_text(json.dumps(catalog))
            with self.assertRaisesRegex(ValueError, 'Mixed'):
                qa.load_fresh(source, 'smoke', 'b'*40)
            with self.assertRaisesRegex(ValueError, 'Missing'):
                qa.load_fresh(source, 'smoke', 'a'*40)


if __name__ == '__main__':
    unittest.main()
