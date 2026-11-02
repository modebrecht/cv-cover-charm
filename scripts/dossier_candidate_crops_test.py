#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
import fitz
from dossier_candidate_crops import CROPS,validate_fresh,make_copy,attach_ink
from dossier_production_spacing import content

ROOT=Path(__file__).resolve().parents[1]


class CandidateCrops(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)
        catalog={'sha':'tested-sha','rows':[{'id':'modern','status':'ELIGIBLE'}]+[{'id':f'blocked-{i}','status':'BLOCKED'} for i in range(38)]}
        (self.folder/'CATALOG.json').write_text(json.dumps(catalog))
        for tag,settings in CROPS.items():
            files=[]
            for fmt in ['PDF','DOCX']:
                name=tag+'.'+fmt.lower();data=(tag+fmt).encode();(self.folder/name).write_bytes(data)
                files.append({'format':fmt,'filename':name,'sha256':hashlib.sha256(data).hexdigest()})
            row={'id':tag,**settings,'part':'cv','long':True,'entryCount':18,'cropTrial':'p2-26-candidate','sha':'tested-sha','status':'EXPORTED','files':files,
                 'intent':{'template':'modern','sidebarSide':'right' if settings['mirrored'] else 'left'}}
            (self.folder/(tag+'.json')).write_text(json.dumps(row))

    def test_accepts_two_new_matched_intents_and_rejects_mixed_sha(self):
        sha,rows=validate_fresh(self.folder,'tested-sha');self.assertEqual(sha,'tested-sha');self.assertEqual(len(rows),2)
        with self.assertRaisesRegex(ValueError,'Mixed'):validate_fresh(self.folder,'other-sha')

    def test_old_crop_or_wrong_side_cannot_count_as_new_coverage(self):
        path=self.folder/'cv-crop-left.json';row=json.loads(path.read_text());row['zoom']=1.8;path.write_text(json.dumps(row))
        with self.assertRaisesRegex(ValueError,'crop intent'):validate_fresh(self.folder)
        row['zoom']=1.6;row['intent']['sidebarSide']='right';path.write_text(json.dumps(row))
        with self.assertRaisesRegex(ValueError,'intent differs'):validate_fresh(self.folder)

    def test_missing_guard_evidence_or_tampered_download_rejected(self):
        path=self.folder/'CATALOG.json';row=json.loads(path.read_text());row['rows']=row['rows'][:1];path.write_text(json.dumps(row))
        with self.assertRaisesRegex(ValueError,'guard evidence'):validate_fresh(self.folder)
        (self.folder/'cv-crop-right.pdf').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'hash mismatch'):validate_fresh(self.folder)

    def test_candidate_binds_to_p224_and_original_is_byte_identical(self):
        previous=json.loads((ROOT/'docs/qa/p2-24-native-results.json').read_text())
        for side in ['left','right']:
            source=ROOT/f'tests/fixtures/lo-import-p2-08/cv-18-{side}-original.docx';target=self.folder/'copy.docx'
            make_copy(source,target,'original-source');self.assertEqual(source.read_bytes(),target.read_bytes())
            meta=make_copy(source,target,'footer-distance-zero')
            expected=next(c for c in previous['cases'] if c['source_id']=='cv-18-'+side and c['profile']=='footer-distance-zero')
            self.assertEqual(meta['copy_sha256'],expected['package']['copy_sha256'])
            with self.assertRaises(ValueError):make_copy(source,source,'footer-distance-zero')

    def test_incomplete_native_negative_control_is_reported_without_aborting_the_matrix(self):
        for name,expected in [('lo-import-p2-17/cv-18-varied-left-original-lo.pdf',8),('lo-import-p2-24/cv-18-left-footer-distance-zero.pdf',18)]:
            pdf=ROOT/'tests/fixtures'/name
            with fitz.open(pdf) as doc:measured=content([p.get_text() for p in doc],18)
            self.assertEqual(measured['complete_entries'],expected)
            row={'actual':{'content':measured}};attach_ink(row,pdf)
            self.assertEqual(len(row['entry_visible_ink']),18 if expected==18 else 0)
            self.assertEqual(row['actual']['content']['status'],'PASS' if expected==18 else 'FAIL')


if __name__=='__main__':unittest.main()
