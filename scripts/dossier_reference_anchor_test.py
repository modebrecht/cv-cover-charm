#!/usr/bin/env python3
"""Anchor probes must preserve data, isolate edits and reject invisible lines."""
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from PIL import Image,ImageDraw
from dossier_lo_context import W,WP,NS,canon,critical,named_drawings,read_root,reduce_context
from dossier_lo_isolation import attribute_diff
from dossier_reference_anchor import A,PROFILES,REFERENCE,line_pixels,make_copy,reference_drawing
from dossier_production_spacing import digest

ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'tests/fixtures/lo-import-p2-08'


class ReferenceAnchor(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_all_32_copies_keep_critical_tables_word_text_and_controls(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';a=read_root(src);saved=src.read_bytes()
            for zero in [False,True]:
                for profile in PROFILES:
                    with self.subTest(side=side,zero=zero,profile=profile):
                        dst=self.folder/'copy.docx';r=make_copy(src,dst,profile,zero);b=read_root(dst)
                        self.assertEqual(critical(a,18),critical(b,18));self.assertEqual([t.text for t in a.iter(W+'t')],[t.text for t in b.iter(W+'t')]);self.assertEqual(len(b.findall('.//w:sdt',NS)),107)
                        self.assertEqual(len(r['spacing_attribute_edits']),18 if zero else 0)
                        self.assertEqual(named_drawings(b),[n for n in named_drawings(a) if profile!='delete-reference' or n!=REFERENCE])
            self.assertEqual(src.read_bytes(),saved)

    def test_attributes_change_only_the_declared_reference_anchor_properties(self):
        src=SOURCE/'cv-18-left-original.docx';a=read_root(src)
        for profile,count,attribute in [('outside-cell',1,'layoutInCell'),('foreground',1,'behindDoc'),('no-overlap',1,'allowOverlap'),('paragraph-y',1,'relativeFrom'),('paragraph-y-outside-cell',2,None)]:
            dst=self.folder/'copy.docx';make_copy(src,dst,profile,False);changes=attribute_diff(a,read_root(dst))
            self.assertEqual(len(changes),count)
            if attribute:self.assertTrue(changes[0]['attribute'].endswith(attribute))

    def test_inline_keeps_graphic_extent_and_required_child_order(self):
        src=SOURCE/'cv-18-left-original.docx';dst=self.folder/'copy.docx';make_copy(src,dst,'inline',False)
        a=reference_drawing(read_root(src));b=reference_drawing(read_root(dst));inline=b.find(WP+'inline')
        self.assertIsNotNone(inline);self.assertIsNone(b.find(WP+'anchor'))
        self.assertEqual([n.tag for n in inline],[WP+'extent',WP+'effectExtent',WP+'docPr',WP+'cNvGraphicFramePr',A+'graphic'])
        self.assertEqual(canon(a.find('.//'+A+'graphic')),canon(inline.find(A+'graphic')))
        self.assertEqual(canon(a.find('.//'+WP+'extent')),canon(inline.find(WP+'extent')))

    def test_other_package_payloads_stay_byte_identical_for_every_profile(self):
        src=SOURCE/'cv-18-right-original.docx'
        for profile in PROFILES:
            dst=self.folder/'copy.docx';make_copy(src,dst,profile,True)
            with ZipFile(src) as a,ZipFile(dst) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_original_and_delete_zero_endpoints_match_p212_bytes(self):
        previous=json.loads((ROOT/'docs/qa/p2-12-native-results.json').read_text())
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx'
            for profile,mask in [('original',0),('delete-reference',8)]:
                r=make_copy(src,self.folder/'copy.docx',profile,True);old=next(c for c in previous['cases'] if c['side']==side and c['mask']==mask)
                self.assertEqual(r['copy_sha256'],old['package']['copy_sha256'])

    def test_source_overwrite_and_unknown_profile_rejected(self):
        src=SOURCE/'cv-18-left-original.docx'
        with self.assertRaisesRegex(ValueError,'overwrite'):make_copy(src,src,'outside-cell',False)
        with self.assertRaisesRegex(ValueError,'profile'):make_copy(src,self.folder/'copy.docx','unknown',False)

    def test_line_detector_real_positive_and_deleted_line_negative(self):
        folder=ROOT/'tests/fixtures/lo-import-p2-13';m=json.loads((folder/'line-calibration.json').read_text())
        for f in m['fixtures']:
            p=folder/f['filename'];self.assertEqual(digest(p),f['sha256'])
            with Image.open(p) as rgb:self.assertEqual(line_pixels(rgb)['status'],f['expected'])

    def test_line_detector_rejects_textlike_short_runs_and_accepts_continuous_line(self):
        rgb=Image.new('RGB',(200,20),'white');d=ImageDraw.Draw(rgb)
        for x in range(0,200,12):d.rectangle((x,5,x+6,10),fill='#234455')
        self.assertEqual(line_pixels(rgb)['status'],'FAIL')
        d.line((2,15,197,15),fill='#476470');self.assertEqual(line_pixels(rgb)['status'],'PASS')


if __name__=='__main__':unittest.main()
