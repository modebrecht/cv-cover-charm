#!/usr/bin/env python3
from collections import Counter
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_unified_rows import make_copy, load_cases, PROFILES
from dossier_lo_context import W, NS, canon, read_root
from dossier_layout_rows import word_values, drawing_payloads
from dossier_production_spacing import critical
from dossier_lo_isolation import attribute_diff

ROOT = Path(__file__).resolve().parents[1]


class UnifiedRows(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        _, self.cases = load_cases(ROOT)

    def test_sixteen_copies_preserve_every_critical_table_control_and_text(self):
        for case, src in self.cases:
            old = read_root(src)
            for profile in PROFILES:
                dst = self.folder/'copy.docx'
                meta = make_copy(src, dst, profile)
                new = read_root(dst)
                self.assertEqual(critical(old, case['entry_count']), critical(new, case['entry_count']))
                self.assertEqual(Counter(word_values(old)), Counter(word_values(new)))
                self.assertEqual(len(new.findall('.//w:sdt', NS)), len(old.findall('.//w:sdt', NS)))
                self.assertEqual(meta['layout_rows'], case['entry_count'] - 3)
                self.assertTrue(meta['declared_page_x_equivalent'])

    def test_counterprobe_is_exactly_seven_empty_paragraph_line_edits(self):
        for case, src in self.cases:
            a,b=self.folder/'a.docx',self.folder/'b.docx'
            make_copy(src,a,PROFILES[0]);m=make_copy(src,b,PROFILES[1])
            edits=attribute_diff(read_root(a),read_root(b))
            self.assertEqual(len(edits),7)
            self.assertEqual(edits,m['prelude_line_attribute_edits'])
            self.assertTrue(all(e['attribute']==W+'line' and e['before']=='20' and e['after']=='1' for e in edits))

    def test_initial_cell_paragraphs_graphics_and_column_properties_do_not_change(self):
        for case,src in self.cases:
            a,b=self.folder/'a.docx',self.folder/'b.docx'
            make_copy(src,a,PROFILES[0]);make_copy(src,b,PROFILES[1]);x,y=read_root(a),read_root(b)
            self.assertEqual(drawing_payloads(x),drawing_payloads(y))
            for c,d in zip(x.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS),y.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)):
                self.assertEqual(canon(c.find('w:p',NS)),canon(d.find('w:p',NS)))
                self.assertEqual(canon(c.find('w:tcPr',NS)),canon(d.find('w:tcPr',NS)))

    def test_no_other_package_parts_change(self):
        for case,src in self.cases:
            dst=self.folder/'copy.docx';make_copy(src,dst,PROFILES[1])
            with ZipFile(src) as a,ZipFile(dst) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_invalid_profile_and_overwrite_do_not_mutate_sources(self):
        src=self.cases[0][1];original=src.read_bytes();dst=self.folder/'invalid.docx'
        with self.assertRaises(ValueError):make_copy(src,dst,'unknown')
        self.assertFalse(dst.exists())
        with self.assertRaises(ValueError):make_copy(src,src,PROFILES[1])
        self.assertEqual(src.read_bytes(),original)


if __name__=='__main__':unittest.main()
