#!/usr/bin/env python3
from collections import Counter
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
import xml.etree.ElementTree as ET
from dossier_boundary_check import make_copy,entry_count,PROFILES
from dossier_body_flow import neutral_tables
from dossier_lo_context import read_root,NS,W,canon
from dossier_layout_rows import word_values
from dossier_production_spacing import critical
from dossier_unified_rows import load_cases

ROOT = Path(__file__).resolve().parents[1]


class BoundaryCheck(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.folder=Path(self.temp.name);_,self.cases=load_cases(ROOT)

    def test_all_eight_18_entry_controls_and_candidates_keep_pinned_hashes(self):
        old={p:json.loads((ROOT/f'docs/qa/{p}-native-results.json').read_text()) for p in ['p2-23','p2-24']}
        for case,source in self.cases:
            if case['entry_count']!=18:continue
            for profile in PROFILES:
                meta=make_copy(source,self.folder/'copy.docx',profile)
                phase,previous=('p2-23','body-flow-nosplit-front') if profile=='prior-control' else ('p2-24','footer-distance-zero')
                expected=next(c for c in old[phase]['cases'] if c['source_id']==case['id'] and c['profile']==previous)
                self.assertEqual(meta['copy_sha256'],expected['package']['copy_sha256'])

    def test_adjacent_sources_preserve_every_entry_control_and_non_document_part(self):
        for case,source in self.cases:
            count=case['entry_count']
            if count==18:continue
            control=self.folder/'control.docx';target=self.folder/'candidate.docx'
            make_copy(source,control,'prior-control');meta=make_copy(source,target,'footer-distance-zero')
            original,before,after=read_root(source),read_root(control),read_root(target)
            self.assertEqual(entry_count(source),count);self.assertEqual(meta['entry_count'],count)
            self.assertEqual(neutral_tables(original,count),neutral_tables(after,count))
            self.assertEqual(critical(before,count),critical(after,count))
            self.assertEqual(Counter(word_values(original)),Counter(word_values(after)))
            self.assertEqual(len(original.findall('.//w:sdt',NS)),len(after.findall('.//w:sdt',NS)))
            self.assertEqual(len(after.findall('.//w:sdt',NS)),{17:103,19:111}[count])
            self.assertEqual(meta['added_leaf_row_cant_split'],1)
            self.assertEqual(meta['existing_leaf_row_cant_split'],count)
            before.find('w:body/w:sectPr/w:pgMar',NS).set(W+'footer','0')
            self.assertEqual(canon(before),canon(after))
            with ZipFile(source) as a,ZipFile(target) as b:
                self.assertEqual(a.namelist(),b.namelist())
                self.assertTrue(all(a.read(n)==b.read(n) for n in a.namelist() if n!='word/document.xml'))

    def test_duplicate_markers_are_rejected_before_a_candidate_is_written(self):
        source=self.cases[0][1];bad=self.folder/'bad.docx';target=self.folder/'copy.docx'
        with ZipFile(source) as a,ZipFile(bad,'w') as b:
            for info in a.infolist():
                payload=a.read(info.filename)
                if info.filename=='word/document.xml':
                    root=ET.fromstring(payload);ET.SubElement(root.find('w:body',NS),W+'t').text='P202Praxis01';payload=ET.tostring(root)
                b.writestr(info,payload)
        with self.assertRaises(ValueError):make_copy(bad,target,'footer-distance-zero')
        self.assertFalse(target.exists())

    def test_invalid_profile_and_overwrite_preserve_original(self):
        source=self.cases[0][1];payload=source.read_bytes()
        with self.assertRaises(ValueError):make_copy(source,self.folder/'invalid.docx','invalid')
        with self.assertRaises(ValueError):make_copy(source,source,'footer-distance-zero')
        self.assertEqual(payload,source.read_bytes())


if __name__=='__main__':unittest.main()
