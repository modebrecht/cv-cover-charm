#!/usr/bin/env python3
"""Context removals must preserve critical story, source media and flow flags."""
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile
import fitz
from PIL import Image
from dossier_lo_context import CONTEXTS,W,NS,reduce_context,read_root,canon,cells_of,named_drawings,digest,critical
from dossier_production_spacing import blank_native_page,measure

ROOT=Path(__file__).resolve().parents[1];FIXTURES=ROOT/'tests/fixtures/lo-import-p2-08'


class ContextControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_all_context_spacing_side_combinations_preserve_critical_story(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';before=source.read_bytes()
            for zero in [False,True]:
                for context in CONTEXTS:
                    with self.subTest(side=side,zero=zero,context=context):
                        r=reduce_context(source,self.folder/'copy.docx',context,zero)
                        self.assertEqual(r['critical_tables_identical'],19);self.assertTrue(r['cell_start_properties_identical'])
                        self.assertEqual(len(r['spacing_attribute_edits']),18 if zero else 0)
                        self.assertEqual(critical(read_root(source),18),critical(read_root(self.folder/'copy.docx'),18))
            self.assertEqual(source.read_bytes(),before)

    def test_originals_reproduce_p209_whole_file_baselines(self):
        reference=json.loads((ROOT/'docs/qa/p2-09-closing-results.json').read_text())
        for side in ['left','right']:
            for zero in [False,True]:
                target=self.folder/'copy.docx';reduce_context(FIXTURES/f'cv-18-{side}-original.docx',target,'original',zero)
                expected=next(c for c in reference['cases'] if c['id']==side+('-all-gaps-zero' if zero else '-original'))
                self.assertEqual(digest(target),expected['package']['copy_sha256'])

    def test_background_only_changes_two_headers_and_keeps_their_text(self):
        source=FIXTURES/'cv-18-left-original.docx';target=self.folder/'copy.docx';r=reduce_context(source,target,'no-background',False)
        self.assertEqual(set(r['changed_parts']),{'word/cv-header.xml','word/cv-header-first.xml'})
        with ZipFile(source) as a,ZipFile(target) as b:
            self.assertEqual(a.read('word/document.xml'),b.read('word/document.xml'))
            import xml.etree.ElementTree as ET
            for name in r['changed_parts']:
                self.assertEqual([n.text for n in ET.fromstring(a.read(name)).iter(W+'t')],[n.text for n in ET.fromstring(b.read(name)).iter(W+'t')])

    def test_photo_removal_keeps_every_other_body_drawing_and_all_text(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'copy.docx';reduce_context(source,target,'no-photo',False)
            a=read_root(source);b=read_root(target)
            self.assertEqual(named_drawings(b),[n for n in named_drawings(a) if n!='cv.person.photo'])
            self.assertEqual([n.text for n in a.iter(W+'t')],[n.text for n in b.iter(W+'t')])

    def test_sidebar_reduction_preserves_photo_and_main_cell_for_both_sides(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'copy.docx';r=reduce_context(source,target,'sidebar-min',False)
            a,mi,si=cells_of(read_root(source));b,_,_=cells_of(read_root(target))
            self.assertEqual(canon(a[mi]),canon(b[mi]));self.assertEqual(canon(a[si].find('w:p',NS)),canon(b[si].find('w:p',NS)))
            self.assertIn('cv.person.photo',named_drawings(read_root(target)));self.assertGreater(r['removed_sidebar_text_characters'],100)

    def test_header_unlink_keeps_original_payload_parts_and_section_margins(self):
        source=FIXTURES/'cv-18-left-original.docx';target=self.folder/'copy.docx';r=reduce_context(source,target,'no-header-footer',False)
        self.assertEqual(r['changed_parts'],['word/document.xml']);self.assertEqual(len(r['removed_section_references']),4)
        a=read_root(source);b=read_root(target)
        self.assertEqual(canon(a.find('.//w:pgMar',NS)),canon(b.find('.//w:pgMar',NS)))
        self.assertFalse(b.findall('.//w:headerReference',NS))

    def test_compaction_twin_has_identical_document_xml(self):
        for side in ['left','right']:
            for zero in [False,True]:
                source=FIXTURES/f'cv-18-{side}-original.docx';a=self.folder/'full.docx';b=self.folder/'compact.docx'
                reduce_context(source,a,'reduced-context',zero);r=reduce_context(source,b,'reduced-context-compact',zero)
                with ZipFile(a) as left,ZipFile(b) as right:
                    self.assertEqual(left.read('word/document.xml'),right.read('word/document.xml'))
                    self.assertLess(len(right.namelist()),len(left.namelist()))
                self.assertTrue(r['compaction']['retained_payloads_identical'])

    def test_unknown_context_and_source_overwrite_rejected(self):
        source=FIXTURES/'cv-18-left-original.docx'
        with self.assertRaisesRegex(ValueError,'Unknown'):reduce_context(source,self.folder/'bad.docx','unknown',False)
        with self.assertRaisesRegex(ValueError,'overwrite'):reduce_context(source,source,'no-photo',False)

    def test_blank_native_page_bypasses_ocr_without_passing_content(self):
        path=self.folder/'blank.pdf'
        with fitz.open() as pdf:pdf.new_page();pdf.save(path)
        with patch('dossier_production_spacing.subprocess.run',side_effect=AssertionError('OCR called')):
            actual,_=measure(path,self.folder,'blank',18,native_blank_pages=True)
        self.assertEqual(actual['pages'],1);self.assertEqual(actual['content']['status'],'FAIL')
        self.assertTrue(actual['text_methods'][0].startswith('Blank native'))
        with patch('dossier_production_spacing.subprocess.run',side_effect=AssertionError('OCR called')):
            with self.assertRaisesRegex(AssertionError,'OCR called'):measure(path,self.folder,'app-default',18)

    def test_blank_gate_never_hides_sparse_ink_or_white_text_layer(self):
        white=Image.new('RGB',(100,100),'white');self.assertTrue(blank_native_page('',white))
        ink=white.copy();ink.putpixel((50,50),(0,0,0));self.assertFalse(blank_native_page('',ink))
        ink=white.copy();ink.putpixel((50,50),(254,254,254));self.assertFalse(blank_native_page('',ink))
        self.assertFalse(blank_native_page('P202Praxis01',white))


if __name__=='__main__':unittest.main()
