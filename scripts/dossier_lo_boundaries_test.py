#!/usr/bin/env python3
"""Preserve full production packages while changing only selected spacer values."""
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_lo_boundaries import PLAN,change_gaps,gap_map,load_inputs,read_root,digest

ROOT=Path(__file__).resolve().parents[1];FIXTURES=ROOT/'tests/fixtures/lo-import-p2-08'


class BoundaryControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)

    def test_all_input_parts_and_pinned_reference_are_bound(self):
        m,r=load_inputs(FIXTURES,ROOT/'docs/qa/p2-08-production-results.json')
        self.assertEqual(len(m['fixtures']),4);self.assertEqual(r['sha'],'b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6')

    def test_both_sides_select_same_authored_gap_independently_of_cell(self):
        for side,cell in [('left',2),('right',0)]:
            selected,mapping=gap_map(read_root(FIXTURES/f'cv-18-{side}-original.docx'))
            self.assertEqual(selected,cell);self.assertEqual(set(mapping),set(range(2,18)))

    def test_every_planned_copy_changes_exactly_declared_attributes(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx';before=source.read_bytes()
            for name,selected in PLAN.items():
                with self.subTest(side=side,variant=name):
                    r=change_gaps(source,self.folder/(side+'-'+name+'.docx'),selected)
                    self.assertEqual(len(r['attribute_edits']),len(selected));self.assertEqual(r['critical_tables_identical'],19)
                    self.assertEqual(r['main_child_indices'],[2*n+10 for n in selected])
            self.assertEqual(source.read_bytes(),before)

    def test_original_and_gap06_controls_are_whole_file_identical(self):
        for side in ['left','right']:
            source=FIXTURES/f'cv-18-{side}-original.docx'
            for variant,selected in [('original',[]),('gap06-zero',[6])]:
                target=self.folder/'copy.docx';change_gaps(source,target,selected)
                self.assertEqual(target.read_bytes(),(FIXTURES/f'cv-18-{side}-{variant}.docx').read_bytes())

    def test_media_styles_settings_and_headers_remain_byte_identical(self):
        source=FIXTURES/'cv-18-left-original.docx';target=self.folder/'all.docx';change_gaps(source,target,PLAN['small-gaps-zero'])
        with ZipFile(source) as a,ZipFile(target) as b:
            self.assertEqual(a.namelist(),b.namelist())
            for n in a.namelist():
                if n!='word/document.xml':self.assertEqual(a.read(n),b.read(n))

    def test_invalid_duplicate_and_source_overwrite_rejected(self):
        source=FIXTURES/'cv-18-left-original.docx'
        for selected in [[1],[18],[5,5]]:
            with self.assertRaisesRegex(ValueError,'Invalid'):change_gaps(source,self.folder/'bad.docx',selected)
        with self.assertRaisesRegex(ValueError,'overwrite'):change_gaps(source,source,[5])

    def test_already_zero_source_cannot_silently_become_a_noop(self):
        with self.assertRaisesRegex(ValueError,'after=1'):
            change_gaps(FIXTURES/'cv-18-left-gap06-zero.docx',self.folder/'bad.docx',[5])

    def test_changed_app_reference_rejected(self):
        ref=self.folder/'changed.json';ref.write_text('{}')
        with self.assertRaisesRegex(ValueError,'reference report hash'):load_inputs(FIXTURES,ref)


if __name__=='__main__':unittest.main()
