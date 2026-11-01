#!/usr/bin/env python3
"""Placement probes isolate the reference frame and preserve source payloads."""
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_lo_context import W,WP,NS,canon,critical,named_drawings,read_root
from dossier_reference_anchor import A,REFERENCE,make_copy as base_copy,reference_drawing
from dossier_reference_placement import CALIBRATION,PROFILES,make_copy
from dossier_lo_isolation import attribute_diff

ROOT=Path(__file__).resolve().parents[1];SOURCE=ROOT/'tests/fixtures/lo-import-p2-08'


class ReferencePlacement(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_all_36_copies_preserve_text_tables_controls_and_other_graphics(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';a=read_root(src);original=src.read_bytes()
            def others(root):return [canon(d) for d in root.iter(W+'drawing') if d.find('.//'+WP+'docPr').get('name')!=REFERENCE]
            for zero in [False,True]:
                for profile in PROFILES:
                    with self.subTest(side=side,zero=zero,profile=profile):
                        dst=self.folder/'copy.docx';r=make_copy(src,dst,profile,zero);b=read_root(dst)
                        self.assertEqual(critical(a,18),critical(b,18));self.assertEqual([t.text for t in a.iter(W+'t')],[t.text for t in b.iter(W+'t')])
                        self.assertEqual(len(b.findall('.//w:sdt',NS)),107);self.assertEqual(others(a),others(b));self.assertEqual(len(r['spacing_attribute_edits']),18 if zero else 0)
            self.assertEqual(src.read_bytes(),original)

    def test_inline_extent_edits_leave_intrinsic_graphic_data_and_height_as_declared(self):
        src=SOURCE/'cv-18-left-original.docx';baseline=self.folder/'baseline.docx';base_copy(src,baseline,'inline',False);a=read_root(baseline)
        for profile,count,height in [('inline-min-width',1,'149696'),('inline-min-size',2,'1')]:
            dst=self.folder/'copy.docx';make_copy(src,dst,profile,False);b=read_root(dst);extent=reference_drawing(b).find(WP+'inline/'+WP+'extent')
            self.assertEqual(extent.attrib,{'cx':'1','cy':height});self.assertEqual(len(attribute_diff(a,b)),count)
            self.assertEqual(canon(reference_drawing(a).find('.//'+A+'graphic')),canon(reference_drawing(b).find('.//'+A+'graphic')))

    def test_absolute_positions_are_explicit_side_specific_and_graphic_data_unchanged(self):
        for side in ['left','right']:
            src=SOURCE/f'cv-18-{side}-original.docx';original=reference_drawing(read_root(src))
            for profile in ['page-y','page-y-outside-cell','simple-position','simple-position-outside-cell']:
                dst=self.folder/'copy.docx';make_copy(src,dst,profile,False);drawing=reference_drawing(read_root(dst));node=drawing.find(WP+'anchor')
                self.assertEqual(canon(original.find('.//'+A+'graphic')),canon(drawing.find('.//'+A+'graphic')))
                self.assertEqual(node.get('layoutInCell'),'0' if profile.endswith('-outside-cell') else '1')
                if profile.startswith('page-y'):
                    position=node.find(WP+'positionV');self.assertEqual(position.get('relativeFrom'),'page');self.assertEqual(position.find(WP+'posOffset').text,str(round(150.478*36000)))
                else:
                    self.assertEqual(node.get('simplePos'),'1');position=node.find(WP+'simplePos');self.assertEqual(position.get('x'),str(round(CALIBRATION[side+'_x_mm']*36000)));self.assertEqual(position.get('y'),str(round(150.478*36000)))

    def test_all_new_profiles_keep_every_non_document_zip_payload(self):
        src=SOURCE/'cv-18-right-original.docx'
        for profile in PROFILES:
            dst=self.folder/'copy.docx';make_copy(src,dst,profile,True)
            with ZipFile(src) as a,ZipFile(dst) as b:
                self.assertEqual(a.namelist(),b.namelist())
                for name in a.namelist():
                    if name!='word/document.xml':self.assertEqual(a.read(name),b.read(name))

    def test_all_12_shared_inputs_match_frozen_p213_bytes(self):
        previous=json.loads((ROOT/'docs/qa/p2-13-native-results.json').read_text())
        for side in ['left','right']:
            for zero in [False,True]:
                for profile in ['original','delete-reference','inline']:
                    r=make_copy(SOURCE/f'cv-18-{side}-original.docx',self.folder/'copy.docx',profile,zero);tag=side+('-zero-' if zero else '-raw-')+profile;expected=next(c for c in previous['cases'] if c['id']==tag)
                    self.assertEqual(r['copy_sha256'],expected['package']['copy_sha256'])

    def test_invalid_profile_and_source_overwrite_rejected(self):
        src=SOURCE/'cv-18-left-original.docx'
        with self.assertRaisesRegex(ValueError,'profile'):make_copy(src,self.folder/'copy.docx','unknown',True)
        self.assertFalse((self.folder/'copy.docx').exists())
        with self.assertRaisesRegex(ValueError,'overwrite'):make_copy(src,src,'page-y',False)


if __name__=='__main__':unittest.main()
