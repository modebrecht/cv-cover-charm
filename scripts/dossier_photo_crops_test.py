#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from dossier_photo_crops import validate_sources, make_copy, IDS

ROOT = Path(__file__).resolve().parents[1]


class FreshCrops(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.folder = Path(self.temp.name)
        (self.folder/'CATALOG.json').write_text(json.dumps({'sha':'tested-sha'}))
        for tag in IDS:
            files=[]
            for fmt in ['PDF','DOCX']:
                name=tag+'.'+fmt.lower();data=(tag+fmt).encode();(self.folder/name).write_bytes(data)
                files.append({'format':fmt,'filename':name,'sha256':hashlib.sha256(data).hexdigest()})
            (self.folder/(tag+'.json')).write_text(json.dumps({'id':tag,'sha':'tested-sha','status':'EXPORTED','entryCount':18,'files':files}))

    def test_mixed_source_sha_is_rejected(self):
        p=self.folder/'cv-crop-right.json';m=json.loads(p.read_text());m['sha']='other-sha';p.write_text(json.dumps(m))
        with self.assertRaisesRegex(ValueError,'Mixed'):validate_sources(self.folder,'tested-sha')

    def test_tampered_download_is_rejected(self):
        (self.folder/'cv-crop-left.pdf').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'hash'):validate_sources(self.folder,'tested-sha')

    def test_missing_docx_format_cannot_count_as_source_export(self):
        p=self.folder/'cv-crop-left.json';m=json.loads(p.read_text());m['files']=m['files'][:1];p.write_text(json.dumps(m))
        with self.assertRaisesRegex(ValueError,'format'):validate_sources(self.folder,'tested-sha')

    def test_unchanged_baseline_and_side_aware_candidate_reproduce_p219_inputs(self):
        previous=json.loads((ROOT/'docs/qa/p2-19-native-results.json').read_text())
        for side in ['left','right']:
            src=ROOT/f'tests/fixtures/lo-import-p2-08/cv-18-{side}-original.docx'
            target=self.folder/'copy.docx';make_copy(src,target,'original-source');self.assertEqual(src.read_bytes(),target.read_bytes())
            meta=make_copy(src,target,'side-aware-photo')
            expected=next(c for c in previous['cases'] if c['source_id']==f'cv-18-{side}' and c['profile']==('margin-equivalent' if side=='right' else 'original-photo'))
            self.assertEqual(meta['copy_sha256'],expected['package']['copy_sha256'])


if __name__=='__main__':unittest.main()
