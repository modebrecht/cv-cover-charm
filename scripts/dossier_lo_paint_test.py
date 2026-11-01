#!/usr/bin/env python3
"""Bounded drawing probes retain full source data and report finite-domain minima."""
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_lo_context import MAIN_PAINT,NS,W,WP,canon,cells_of,critical,named_drawings,read_root,reduce_context
from dossier_lo_paint import HEADINGS,make_copy,selected,summarize

ROOT=Path(__file__).resolve().parents[1];SOURCES=ROOT/'tests/fixtures/lo-import-p2-08'


def rows(left,right=None):
    return [{'side':side,'mask':mask,'actual':{'content':{'status':'PASS' if mask in good else 'FAIL'}}}
        for side,good in [('left',left),('right',left if right is None else right)] for mask in range(16)]


class HeadingSubsets(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_every_subset_retains_text_critical_tables_and_107_controls(self):
        for side in ['left','right']:
            src=SOURCES/f'cv-18-{side}-original.docx';a=read_root(src);saved=src.read_bytes()
            for mask in range(16):
                with self.subTest(side=side,mask=mask):
                    dst=self.folder/'copy.docx';p=make_copy(src,dst,mask);b=read_root(dst)
                    self.assertEqual(critical(a,18),critical(b,18));self.assertEqual([n.text for n in a.iter(W+'t')],[n.text for n in b.iter(W+'t')])
                    self.assertEqual(len(b.findall('.//w:sdt',NS)),107);self.assertEqual(len(p['spacing_attribute_edits']),18)
                    self.assertEqual(set(p['removed_drawing_names']),selected(mask))
                    self.assertEqual(named_drawings(b),[n for n in named_drawings(a) if n not in selected(mask)])
            self.assertEqual(src.read_bytes(),saved)

    def test_singletons_preserve_sidebar_photo_headers_and_all_other_zip_parts(self):
        for side in ['left','right']:
            src=SOURCES/f'cv-18-{side}-original.docx';a=read_root(src);ac,_,si=cells_of(a)
            def photo(root):return next(n for n in root.iter(W+'drawing') if n.find('.//'+WP+'docPr').get('name')=='cv.person.photo')
            for mask in [1,2,4,8]:
                dst=self.folder/'copy.docx';make_copy(src,dst,mask);b=read_root(dst);bc,_,_=cells_of(b)
                self.assertEqual(canon(ac[si]),canon(bc[si]));self.assertEqual(canon(photo(a)),canon(photo(b)))
                self.assertEqual([canon(c.find('w:p/w:pPr',NS)) for c in ac],[canon(c.find('w:p/w:pPr',NS)) for c in bc])
                with ZipFile(src) as z,ZipFile(dst) as other:
                    self.assertEqual(z.namelist(),other.namelist())
                    for name in z.namelist():
                        if name!='word/document.xml':self.assertEqual(z.read(name),other.read(name))

    def test_endpoints_match_pinned_p211_docx_bytes(self):
        previous=json.loads((ROOT/'docs/qa/p2-11-outer-results.json').read_text())
        for side in ['left','right']:
            for mask,context in [(0,'original'),(15,'main-heading-paint')]:
                p=make_copy(SOURCES/f'cv-18-{side}-original.docx',self.folder/'copy.docx',mask)
                old=next(c for c in previous['cases'] if c['id']==f'{side}-zero-{context}')
                self.assertEqual(p,old['package'])

    def test_domain_is_exact_and_rejects_non_masks(self):
        self.assertEqual(set().union(*(selected(m) for m in range(16))),MAIN_PAINT)
        self.assertEqual(len({tuple(sorted(selected(m))) for m in range(16)}),16)
        self.assertEqual([next(iter(selected(1<<i))) for i in range(4)],[name for _,name in HEADINGS])
        for mask in [-1,16,True,1.5,'1']:
            with self.assertRaises(ValueError):selected(mask)

    def test_invalid_names_and_source_overwrite_rejected_before_writing(self):
        source=SOURCES/'cv-18-left-original.docx';target=self.folder/'copy.docx'
        for context,names in [('main-heading-paint',[]),('main-heading-paint',['cv.person.photo']),('outer-controls',MAIN_PAINT)]:
            with self.assertRaises(ValueError):reduce_context(source,target,context,True,paint_names=names)
            self.assertFalse(target.exists())
        with self.assertRaisesRegex(ValueError,'overwrite'):make_copy(source,source,1)

    def test_minimum_cardinality_and_inclusion_minimal_are_distinct(self):
        r=summarize(rows([1,3,6,7,9,11,14,15]))['left']
        self.assertEqual(r['minimum_deleted_drawings'],1);self.assertEqual(r['minimum_masks'],[1])
        self.assertEqual(r['inclusion_minimal_masks'],[1,6]);self.assertEqual(r['drawings_in_every_successful_deletion'],[])

    def test_nonmonotonic_recovery_is_explicit(self):
        r=summarize(rows([4,15]))['left'];self.assertIn({'pass_mask':4,'failed_superset':5},r['nonmonotonic_success_to_failure'])
        self.assertEqual(r['drawings_in_every_successful_deletion'],[HEADINGS[2][1]])

    def test_no_success_and_no_deletion_success_have_distinct_minima(self):
        r=summarize(rows([],range(16)));self.assertIsNone(r['left']['minimum_deleted_drawings'])
        self.assertEqual(r['right']['minimum_deleted_drawings'],0);self.assertEqual(r['right']['minimum_masks'],[0])

    def test_partial_or_duplicated_domains_cannot_claim_minimality(self):
        for data in [rows([1])[:-1],rows([1])+[rows([1])[0]]]:
            with self.assertRaisesRegex(ValueError,'domain'):summarize(data)


if __name__=='__main__':unittest.main()
