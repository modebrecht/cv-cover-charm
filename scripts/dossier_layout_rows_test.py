#!/usr/bin/env python3
"""Outer-row changes must retain every main block, sidebar, SDT and graphic."""
from collections import Counter
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_layout_rows import PROFILES,make_copy,word_values,drawing_payloads
from dossier_lo_context import W,NS,canon,cells_of,critical,read_root

ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'tests/fixtures/lo-import-p2-08'


class LayoutRows(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_all_16_inputs_preserve_critical_tables_word_values_controls_and_graphics(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';a=read_root(src);original=src.read_bytes()
            for zero in [False,True]:
                for profile in PROFILES:
                    with self.subTest(side=side,zero=zero,profile=profile):
                        dst=self.folder/'copy.docx';meta=make_copy(src,dst,profile,zero);b=read_root(dst)
                        self.assertEqual(critical(a,18),critical(b,18));self.assertEqual(Counter(word_values(a)),Counter(word_values(b)))
                        self.assertEqual(len(b.findall('.//w:sdt',NS)),107);self.assertEqual(drawing_payloads(a),drawing_payloads(b));self.assertEqual(len(meta['spacing_attribute_edits']),18 if zero else 0)
            self.assertEqual(src.read_bytes(),original)

    def test_no_main_blocks_added_or_changed_by_partitioning(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';a=read_root(src);cells,mi,_=cells_of(a);expected=[canon(n) for n in cells[mi] if n.tag!=W+'tcPr']
            for profile in PROFILES[1:]:
                dst=self.folder/'copy.docx';make_copy(src,dst,profile,False);b=read_root(dst)
                actual=[canon(n) for row in b.findall('w:body/w:tbl/w:tr',NS) for n in row.findall('w:tc',NS)[mi] if n.tag!=W+'tcPr'];self.assertEqual(actual,expected)

    def test_boundaries_are_exact_and_sidebar_occurs_only_once(self):
        groups={'reference-row':[(1,18),(0,0)],'rows-5-14':[(1,5),(6,14),(15,18)],'rows-6-15':[(1,6),(7,15),(16,18)]}
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';a=read_root(src);cells,mi,si=cells_of(a)
            for profile,expected in groups.items():
                dst=self.folder/'copy.docx';make_copy(src,dst,profile,False);rows=read_root(dst).findall('w:body/w:tbl/w:tr',NS)
                self.assertEqual(len(rows),len(expected));self.assertEqual(canon(rows[0].findall('w:tc',NS)[si]),canon(cells[si]))
                for row,(first,last) in zip(rows,expected):
                    cs=row.findall('w:tc',NS);text=''.join(word_values(cs[mi]));self.assertEqual([i for i in range(1,19) if f'P202Praxis{i:02}' in text],list(range(first,last+1)) if first else [])
                    if row is not rows[0]:
                        self.assertFalse(word_values(cs[si]));self.assertFalse(cs[si].findall('.//w:drawing',NS))

    def test_original_properties_and_all_column_widths_preserved(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';cells,mi,_=cells_of(read_root(src));dst=self.folder/'copy.docx';make_copy(src,dst,'rows-6-15',True)
            rows=read_root(dst).findall('w:body/w:tbl/w:tr',NS)
            for row in rows:
                for i,cell in enumerate(row.findall('w:tc',NS)):
                    self.assertEqual(canon(cell.find('w:tcPr',NS)),canon(cells[i].find('w:tcPr',NS)))
                    if row is rows[0]:self.assertEqual(canon(cell.find('w:p',NS)),canon(cells[i].find('w:p',NS)))
                    elif i!=mi:
                        self.assertEqual(len(cell.findall('w:p',NS)),1);p=cell.find('w:p/w:pPr',NS);self.assertEqual(p.find('w:keepNext',NS).get(W+'val'),'0');self.assertEqual(p.find('w:spacing',NS).get(W+'line'),'1')

    def test_non_document_parts_and_mirrored_reading_order_are_explicit(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';dst=self.folder/'copy.docx';meta=make_copy(src,dst,'reference-row',False)
            self.assertEqual(meta['global_word_text_order_identical'],side=='left')
            with ZipFile(src) as a,ZipFile(dst) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_original_raw_and_zero_hashes_match_p213(self):
        previous=json.loads((ROOT/'docs/qa/p2-13-native-results.json').read_text())
        for side in ['left','right']:
            for zero in [False,True]:
                meta=make_copy(SOURCE/f'cv-18-{side}-original.docx',self.folder/'copy.docx','original',zero);tag=side+('-zero-' if zero else '-raw-')+'original'
                old=next(c for c in previous['cases'] if c['id']==tag);self.assertEqual(meta['copy_sha256'],old['package']['copy_sha256'])
                for key,value in meta.items():self.assertEqual(value,old['package'][key])

    def test_invalid_profile_and_overwrite_fail_before_mutation(self):
        src=SOURCE/'cv-18-left-original.docx';dst=self.folder/'copy.docx'
        with self.assertRaisesRegex(ValueError,'profile'):make_copy(src,dst,'unknown',False)
        self.assertFalse(dst.exists())
        with self.assertRaisesRegex(ValueError,'overwrite'):make_copy(src,src,'reference-row',False)


if __name__=='__main__':unittest.main()
