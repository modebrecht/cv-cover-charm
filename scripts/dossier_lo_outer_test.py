#!/usr/bin/env python3
"""Outer-factor probes must retain all text, photo/sidebar and critical controls."""
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_lo_context import OUTER_CONTEXTS,MAIN_PAINT,reduce_context,read_root,cells_of,canon,named_drawings,critical,NS,W

ROOT=Path(__file__).resolve().parents[1];FIXTURES=ROOT/'tests/fixtures/lo-import-p2-08'


class OuterControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_factor_matrix_retains_all_critical_tables_and_all_word_text(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';original=source.read_bytes()
            for zero in [False,True]:
                for context in OUTER_CONTEXTS:
                    with self.subTest(side=side,zero=zero,context=context):
                        target=self.folder/'copy.docx';r=reduce_context(source,target,context,zero)
                        a=read_root(source);b=read_root(target)
                        self.assertEqual(critical(a,18),critical(b,18));self.assertEqual([t.text for t in a.iter(W+'t')],[t.text for t in b.iter(W+'t')])
                        self.assertEqual(len(r['spacing_attribute_edits']),18 if zero else 0)
            self.assertEqual(source.read_bytes(),original)

    def test_outer_only_drops_32_envelopes_but_no_drawing_or_text(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'outer.docx';reduce_context(source,target,'outer-controls',False)
            a=read_root(source);b=read_root(target)
            self.assertEqual(len(a.findall('.//w:sdt',NS)),107);self.assertEqual(len(b.findall('.//w:sdt',NS)),75)
            self.assertEqual(named_drawings(a),named_drawings(b));self.assertEqual(critical(a,18),critical(b,18))

    def test_main_paint_only_removes_four_named_drawings_and_no_controls(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'paint.docx';r=reduce_context(source,target,'main-heading-paint',False)
            a=read_root(source);b=read_root(target)
            self.assertEqual(set(r['removed_drawing_names']),MAIN_PAINT)
            self.assertEqual(named_drawings(b),[n for n in named_drawings(a) if n not in MAIN_PAINT])
            self.assertEqual(len(b.findall('.//w:sdt',NS)),107);self.assertIn('cv.person.photo',named_drawings(b))

    def test_headers_footers_relationships_settings_styles_media_unchanged(self):
        source=FIXTURES/'cv-18-left-original.docx'
        for context in OUTER_CONTEXTS:
            target=self.folder/'copy.docx';reduce_context(source,target,context,True)
            with ZipFile(source) as a,ZipFile(target) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_sidebar_cell_canonical_payload_preserved_when_not_unwrapping(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'copy.docx';reduce_context(source,target,'main-heading-paint',False)
            a,_,si=cells_of(read_root(source));b,_,_=cells_of(read_root(target));self.assertEqual(canon(a[si]),canon(b[si]))

    def test_first_paragraph_flags_and_photo_drawing_payload_stay_identical(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';target=self.folder/'copy.docx';reduce_context(source,target,'outer-controls-and-main-paint',True)
            a,_,_=cells_of(read_root(source));b,_,_=cells_of(read_root(target))
            for x,y in zip(a,b):self.assertEqual(canon(x.find('w:p/w:pPr',NS)),canon(y.find('w:p/w:pPr',NS)))
            from dossier_lo_context import WP
            def photo(root):return next(n for n in root.iter(W+'drawing') if n.find('.//'+WP+'docPr').get('name')=='cv.person.photo')
            self.assertEqual(canon(photo(read_root(source))),canon(photo(read_root(target))))

    def test_source_overwrite_rejected(self):
        source=FIXTURES/'cv-18-left-original.docx'
        with self.assertRaisesRegex(ValueError,'overwrite'):reduce_context(source,source,'outer-controls',False)


if __name__=='__main__':unittest.main()
