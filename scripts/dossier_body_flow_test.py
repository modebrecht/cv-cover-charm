#!/usr/bin/env python3
from collections import Counter
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_body_flow import make_copy, neutral_tables, leaves, section_lines, LABELS
from dossier_entry_rows import load_cases
from dossier_lo_context import W,WP,NS,canon,read_root,MAIN_PAINT
from dossier_layout_rows import word_values,drawing_payloads
from dossier_production_spacing import critical,digest

ROOT=Path(__file__).resolve().parents[1]


class BodyFlow(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.folder=Path(self.temp.name);_,self.cases=load_cases(ROOT)

    def test_four_controls_reproduce_p222_native_inputs(self):
        r=json.loads((ROOT/'docs/qa/p2-22-native-results.json').read_text())
        for case,src in self.cases:
            m=make_copy(src,self.folder/'copy.docx','frame-control')
            expected=next(c for c in r['cases'] if c['source_id']==case['id'] and c['profile']=='detached-frame')
            self.assertEqual(m['copy_sha256'],expected['package']['copy_sha256'])

    def test_direct_body_transfer_preserves_original_critical_payload_and_controls(self):
        for case,src in self.cases:
            dst=self.folder/'copy.docx';m=make_copy(src,dst,'body-flow');a,b=read_root(src),read_root(dst)
            self.assertEqual(critical(a,18),critical(b,18));self.assertEqual(Counter(word_values(a)),Counter(word_values(b)))
            self.assertEqual(len(b.findall('.//w:sdt',NS)),107)
            body=b.find('w:body',NS)
            self.assertFalse(any((p:=t.find('w:tblPr/w:tblCaption',NS)) is not None and p.get(W+'val')=='ccc.detached-main' for t in body.findall('w:tbl',NS)))
            self.assertGreater(len(body.findall('w:tbl',NS)),18)
            self.assertTrue(m['main_outer_table_removed'])

    def test_guarded_tables_change_only_the_19_row_split_properties(self):
        for case,src in self.cases:
            a,b=self.folder/'a.docx',self.folder/'b.docx';make_copy(src,a,'body-flow');m=make_copy(src,b,'body-flow-nosplit')
            x,y=read_root(a),read_root(b);self.assertEqual(neutral_tables(x),neutral_tables(y));self.assertEqual(m['added_leaf_row_cant_split'],19)
            self.assertEqual(sum(t.find('w:tr/w:trPr/w:cantSplit',NS) is not None for t in leaves(y)),19)
            self.assertEqual(word_values(x),word_values(y));self.assertEqual(drawing_payloads(x),drawing_payloads(y))

    def test_foreground_counterprobe_changes_exactly_four_anchor_flags(self):
        for case,src in self.cases:
            a,b=self.folder/'a.docx',self.folder/'b.docx';make_copy(src,a,'body-flow-nosplit');m=make_copy(src,b,'body-flow-nosplit-front')
            x,y=read_root(a),read_root(b);self.assertEqual(critical(x,18),critical(y,18));self.assertEqual(word_values(x),word_values(y))
            self.assertEqual(set(m['main_paint_foreground_edits']),MAIN_PAINT)
            for old,new in zip(x.iter(W+'drawing'),y.iter(W+'drawing')):
                name=new.find('.//'+WP+'docPr').get('name')
                if name in MAIN_PAINT:old.find(WP+'anchor').set('behindDoc','0')
                self.assertEqual(canon(old),canon(new))

    def test_line_detector_has_actual_positive_and_faint_negative_pdf_controls(self):
        for name in ['lo-import-p2-18/varied-left-entry-rows-nosplit-lo.pdf','lo-import-p2-19/varied-right-margin-equivalent-lo.pdf']:
            result=section_lines(ROOT/'tests/fixtures'/name)
            self.assertEqual(set(result),set(LABELS));self.assertTrue(all(v['status']=='PASS' and v['longest_dark_run_fraction']==1.0 for v in result.values()))
        p=ROOT/'tests/fixtures/lo-import-p2-23';m=json.loads((p/'NEGATIVE.json').read_text());pdf=p/m['filename'];self.assertEqual(digest(pdf),m['pdf_sha256'])
        result=section_lines(pdf);self.assertTrue(all(v['status']=='FAIL' and v['longest_dark_run_fraction']==0.0 for v in result.values()))

    def test_headers_styles_media_and_non_document_parts_unchanged(self):
        for case,src in self.cases:
            dst=self.folder/'copy.docx';make_copy(src,dst,'body-flow-nosplit-front')
            with ZipFile(src) as a,ZipFile(dst) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_invalid_profile_and_source_overwrite_rejected(self):
        src=self.cases[0][1];original=src.read_bytes();dst=self.folder/'invalid.docx'
        with self.assertRaises(ValueError):make_copy(src,dst,'unknown')
        self.assertFalse(dst.exists())
        with self.assertRaises(ValueError):make_copy(src,src,'body-flow')
        self.assertEqual(src.read_bytes(),original)


if __name__=='__main__':unittest.main()
