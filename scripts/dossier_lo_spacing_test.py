#!/usr/bin/env python3
"""Package-preservation and bounded-search controls; native behavior is CI-only."""
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from dossier_lo_spacing import gaps,load_fixtures,make_copy,read_root,search

FIXTURES=Path(__file__).resolve().parents[1]/'tests/fixtures/lo-import-p2-06'


class SpacingControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.folder=Path(self.temp.name);self.source=FIXTURES/'long-gap-original.docx'

    def test_persisted_source_integrity(self):self.assertEqual(len(load_fixtures(FIXTURES)['fixtures']),2)

    def test_gap_map(self):
        rows=gaps(read_root(self.source));self.assertEqual(len(rows),18)
        self.assertEqual(sum(r['after_twips']==1 for r in rows),16)
        self.assertEqual({r['id'] for r in rows if r['after_twips']==72},{'school-gap','reference-gap'})

    def test_every_single_attribute_edit_preserves_payload_and_package(self):
        for gap in gaps(read_root(self.source)):
            result=make_copy(self.source,self.folder/'copy.docx',[gap['id']])
            self.assertEqual(len(result['attribute_edits']),1)
            self.assertEqual(result['attribute_edits'][0]['before'],str(gap['after_twips']))
            self.assertEqual(result['critical_tables_identical'],19)

    def test_original_is_exact_copy(self):
        target=self.folder/'copy.docx';make_copy(self.source,target,[])
        self.assertEqual(target.read_bytes(),self.source.read_bytes())

    def test_reject_unknown_and_source_overwrite(self):
        with self.assertRaisesRegex(ValueError,'Unknown'):make_copy(self.source,self.folder/'bad.docx',['other'])
        with self.assertRaisesRegex(ValueError,'overwrite'):make_copy(self.source,self.source,[])

    def test_all_zero_xml_matches_persisted_success(self):
        target=self.folder/'all.docx';make_copy(self.source,target,[r['id'] for r in gaps(read_root(self.source))])
        with ZipFile(target) as left,ZipFile(FIXTURES/'long-gap-zero.docx') as right:
            for name in left.namelist():self.assertEqual(left.read(name),right.read(name))

    def test_minimum_one_exhausts_all_singletons(self):
        ids=['entry-gap-02','entry-gap-03','school-gap','reference-gap'];seen=[]
        def oracle(mask):seen.append(mask);return 'entry-gap-03' in mask or 'reference-gap' in mask
        result=search(ids,oracle)
        self.assertEqual(result['all_sufficient_singletons'],['entry-gap-03','reference-gap'])
        self.assertTrue(all([i] in seen for i in ids));self.assertTrue(result['minimum_proven'])

    def test_minimum_two_requires_all_singletons_fail(self):
        result=search(['entry-gap-02','school-gap','reference-gap'],lambda s:{'school-gap','reference-gap'}<=set(s))
        self.assertEqual(result['minimum_cardinality'],2);self.assertTrue(result['minimum_proven'])

    def test_nonmonotonic_search_does_not_claim_global_minimum(self):
        ids=['entry-gap-02','entry-gap-03','entry-gap-04','school-gap','reference-gap']
        result=search(ids,lambda s:len(s)>=3)
        self.assertEqual(result['minimum_cardinality'],3);self.assertFalse(result['minimum_proven'])

    def test_control_behavior_change_and_oracle_failure_abort(self):
        with self.assertRaisesRegex(ValueError,'control'):search(['school-gap','reference-gap'],lambda s:True)
        def broken(mask):raise RuntimeError('conversion BLOCKED')
        with self.assertRaisesRegex(RuntimeError,'BLOCKED'):search(['school-gap','reference-gap'],broken)


if __name__=='__main__':unittest.main()
