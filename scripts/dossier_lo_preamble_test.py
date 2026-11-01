#!/usr/bin/env python3
"""Checks for preserving content while reducing only generated lead wrappers."""
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from dossier_lo_preamble import OPERATIONS,NS,W,change_story,payloads
from dossier_lo_isolation import attribute_diff

FIXTURES=Path(__file__).resolve().parents[1]/'tests/fixtures/lo-import-p2-04'


class PreambleControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.source=FIXTURES/'long-coupled.docx'

    def read(self,path):
        with ZipFile(path) as pkg:return ET.fromstring(pkg.read('word/document.xml'))

    def test_all_reductions_preserve_critical_payload_and_other_parts(self):
        for op in OPERATIONS:
            with self.subTest(operation=op):
                source=FIXTURES/'long-detached.docx' if op=='baseline-detached' else self.source
                target=self.root/(op+'.docx');change_story(source,target,op)
                self.assertEqual(payloads(self.read(source)),payloads(self.read(target)))
                with ZipFile(source) as left,ZipFile(target) as right:
                    self.assertEqual(left.namelist(),right.namelist())
                    for n in left.namelist():
                        if n!='word/document.xml':self.assertEqual(left.read(n),right.read(n))

    def test_baselines_are_byte_identical(self):
        for tag,file in [('coupled','long-coupled.docx'),('detached','long-detached.docx')]:
            target=self.root/file;source=FIXTURES/file;change_story(source,target,'baseline-'+tag)
            self.assertEqual(source.read_bytes(),target.read_bytes())

    def test_row_split_probes_change_only_expected_flags(self):
        for op,count in [('allow-school-lead-split',1),('allow-experience-lead-split',1),('allow-both-leads-split',2)]:
            output=self.root/(op+'.docx');change_story(self.source,output,op)
            edits=attribute_diff(self.read(self.source),self.read(output))
            self.assertEqual(len(edits),count)
            self.assertTrue(all('cantSplit' in e['path'] and e['after']=='0' for e in edits))

    def test_flatten_removes_only_outer_table_count_and_no_text(self):
        original=self.read(self.source);count=len(original.findall('.//w:tbl',NS))
        for op,delta in [('flatten-school',1),('flatten-experience',1),('flatten-both',2)]:
            output=self.root/(op+'.docx');change_story(self.source,output,op);result=self.read(output)
            self.assertEqual(len(result.findall('.//w:tbl',NS)),count-delta)
            self.assertEqual(''.join(original.itertext()),''.join(result.itertext()))

    def test_drop_main_start_preserves_all_visible_text(self):
        output=self.root/'drop.docx';result=change_story(self.source,output,'drop-main-leading')
        self.assertTrue(result['visible_text_identical'])
        self.assertEqual(result['before']['nodes']-result['after']['nodes'],4)

    def test_spacer_is_declared_and_never_removes_station_data(self):
        output=self.root/'spacer.docx';result=change_story(self.source,output,'prefix-spacer')
        self.assertFalse(result['visible_text_identical']);self.assertEqual(result['diagnostic_spacer_twips'],4762)
        text=''.join(self.read(output).itertext());self.assertIn('P206PRELUDE',text)
        self.assertIn('P202Praxis18',text);self.assertIn('P202Endreferenz',text)

    def test_source_cannot_be_overwritten(self):
        with self.assertRaisesRegex(ValueError,'overwrite source'):change_story(self.source,self.source,'flatten-both')

    def test_unknown_probe_rejected(self):
        with self.assertRaisesRegex(ValueError,'Unknown reduction'):change_story(self.source,self.root/'bad.docx','unknown')

    def test_direct_paragraph_probes_only_change_keep_next_flags(self):
        for op,count in [('detach-main-top-level',5),('detach-main-title',1),('detach-reference-heading',1)]:
            output=self.root/(op+'.docx');change_story(self.source,output,op)
            edits=attribute_diff(self.read(self.source),self.read(output))
            self.assertEqual(len(edits),count)
            self.assertTrue(all('keepNext' in e['path'] and e['before']=='1' and e['after']=='0' for e in edits))

    def test_entry_only_control_has_no_original_heading_paragraphs(self):
        output=self.root/'entries.docx';result=change_story(self.source,output,'entry-only-control')
        main=self.read(output).find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
        texts=[''.join(t.text or '' for t in n.iter(W+'t')) for n in main.findall('w:p',NS)]
        self.assertEqual([text for text in texts if text],['P206PRELUDE'])
        self.assertEqual(result['max_table_depth_after'],2)

    def test_minimal_gap_pairs_have_exactly_one_attribute_difference(self):
        baseline=self.root/'entry-control.docx';change_story(self.source,baseline,'entry-only-control')
        for op,value in [('entry-only-gap02-one','1'),('entry-only-reference-gap72','72')]:
            output=self.root/(op+'.docx');change_story(self.source,output,op)
            edits=attribute_diff(self.read(baseline),self.read(output))
            self.assertEqual(len(edits),1);self.assertEqual(edits[0]['attribute'],W+'after')
            self.assertEqual(edits[0]['before'],'0');self.assertEqual(edits[0]['after'],value)

    def test_only_empty_paragraph_spacing_is_zeroed(self):
        for op,count in [('main-empty-zero-after',18),('prefix-spacer-zero-after',17)]:
            output=self.root/(op+'.docx');result=change_story(self.source,output,op)
            edits=result['within_pair_attribute_edits'];self.assertEqual(len(edits),count)
            self.assertTrue(all(e['attribute']==W+'after' and e['after']=='0' for e in edits))

    def test_deduping_empty_paragraphs_preserves_nonzero_gap_properties(self):
        baseline=self.root/'prefix.docx';change_story(self.source,baseline,'prefix-spacer-no-headings')
        output=self.root/'dedup.docx';change_story(self.source,output,'prefix-spacer-dedupe-empty')
        original=self.read(baseline).find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
        changed=self.read(output).find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
        self.assertEqual(len(original)-len(changed),3)
        values=[n.get(W+'after') for n in changed.findall('w:p/w:pPr/w:spacing',NS)]
        self.assertEqual(values.count('1'),16);self.assertIn('72',values)


if __name__=='__main__':unittest.main()
