#!/usr/bin/env python3
from collections import Counter
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_detached_main import make_copy, PROFILES
from dossier_entry_rows import load_cases
from dossier_lo_context import W, NS, canon, read_root
from dossier_layout_rows import word_values, drawing_payloads
from dossier_production_spacing import critical

ROOT = Path(__file__).resolve().parents[1]


class DetachedMain(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        _, self.cases = load_cases(ROOT)

    def test_four_prior_controls_match_p219_native_inputs(self):
        prior = json.loads((ROOT/'docs/qa/p2-19-native-results.json').read_text())
        for case, src in self.cases:
            m = make_copy(src, self.folder/'copy.docx', 'prior-control')
            expected = next(c for c in prior['cases'] if c['source_id'] == case['id'] and c['profile'] == m['photo_control_profile'])
            self.assertEqual(m['copy_sha256'], expected['package']['copy_sha256'])

    def test_all_critical_tables_controls_and_story_text_survive_detachment(self):
        for case, src in self.cases:
            a = read_root(src)
            baseline = self.folder/'prior.docx'
            make_copy(src, baseline, 'prior-control')
            prior = read_root(baseline)
            for profile in PROFILES[1:]:
                target = self.folder/'copy.docx'
                m = make_copy(src, target, profile)
                b = read_root(target)
                self.assertEqual(critical(a,18), critical(b,18))
                self.assertEqual(Counter(word_values(a)), Counter(word_values(b)))
                self.assertEqual(len(b.findall('.//w:sdt', NS)),107)
                self.assertEqual(drawing_payloads(prior),drawing_payloads(b))
                self.assertTrue(m['main_story_blocks_identical'])

    def test_floating_sidebar_anchor_precedes_main_and_rows_are_semantic(self):
        for case,src in self.cases:
            for profile in PROFILES[1:]:
                target=self.folder/'copy.docx';m=make_copy(src,target,profile)
                body=read_root(target).find('w:body',NS);tables=body.findall('w:tbl',NS)
                self.assertEqual(len(tables),2)
                self.assertIs(body[0],tables[0]);self.assertEqual(body[1].tag,W+'p');self.assertIs(body[2],tables[1])
                self.assertIsNotNone(tables[0].find('w:tblPr/w:tblpPr',NS))
                self.assertEqual(len(tables[1].findall('w:tr',NS)),19)
                rows=tables[1].findall('w:tr',NS)
                for row,i in zip(rows[1:-1],range(2,19)):
                    self.assertEqual(len(row.findall('w:tc',NS)),1)
                    self.assertIn(f'P202Praxis{i:02}',''.join(word_values(row)))
                    self.assertEqual(''.join(word_values(row)).count('P202Praxis'),1)
                    self.assertIsNotNone(row.find('w:trPr/w:cantSplit',NS))
                self.assertIn('Referenzen',''.join(word_values(rows[-1])))
                self.assertIn('P202Endreferenz',''.join(word_values(rows[-1])))
                self.assertEqual(m['main_table_indent_twips'],0)
                if profile=='detached-frame':
                    section=body.find('w:sectPr',NS);margins=section.find('w:pgMar',NS)
                    width=int(section.find('w:pgSz',NS).get(W+'w'))-int(margins.get(W+'left'))-int(margins.get(W+'right'))
                    self.assertEqual(width,6746 if case['mirrored'] else 6747)

    def test_page_frame_headers_media_and_other_zip_parts_unchanged(self):
        for case,src in self.cases:
            target=self.folder/'copy.docx';make_copy(src,target,'detached-wrap')
            a,b=read_root(src),read_root(target)
            self.assertEqual(canon(a.find('w:body/w:sectPr',NS)),canon(b.find('w:body/w:sectPr',NS)))
            with ZipFile(src) as x,ZipFile(target) as y:
                self.assertEqual(x.namelist(),y.namelist())
                for name in x.namelist():
                    if name!='word/document.xml':self.assertEqual(x.read(name),y.read(name))

    def test_invalid_profile_and_source_overwrite_rejected(self):
        src=self.cases[0][1];original=src.read_bytes();dst=self.folder/'invalid.docx'
        with self.assertRaises(ValueError):make_copy(src,dst,'unknown')
        self.assertFalse(dst.exists())
        with self.assertRaises(ValueError):make_copy(src,src,'detached-wrap')
        self.assertEqual(src.read_bytes(),original)


if __name__=='__main__':unittest.main()
