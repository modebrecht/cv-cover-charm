"""Negative controls for bounded consolidation inputs and visible field gates."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from zipfile import ZipFile
import fitz

spec=importlib.util.spec_from_file_location('word_consolidation',Path(__file__).with_name('docx-next-word-consolidation-qa.py'))
qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)


class ConsolidationTests(unittest.TestCase):
    def metadata(self):
        baseline=json.loads((qa.ROOT/'tests/fixtures/docx-next/word-consolidation-baseline.json').read_text())
        return {'sha':'a'*40,'cases':[{'id':'body-long-'+s,'sha256':'hash'} for s in ['left','right']],
                'baseline_commit':baseline['baseline_commit'],'normal_package_sha256':baseline['normal_package_sha256'],'normal_packages_identical':8}

    def test_source_requires_same_implementation_and_exact_normal_baseline(self):
        meta=self.metadata()
        with patch.dict(os.environ,{'GITHUB_SHA':'a'*40}),patch.object(qa,'digest',return_value='hash'),patch.object(qa.body,'check_cell_start_attachments'):
            qa.require_source(Path('/synthetic'),meta)
            for key,value in [('sha','b'*40),('baseline_commit','b'*40),('normal_packages_identical',7),('normal_package_sha256',{})]:
                bad=copy.deepcopy(meta);bad[key]=value
                with self.subTest(key=key),self.assertRaises(AssertionError):qa.require_source(Path('/synthetic'),bad)

    def test_missing_case_duplicate_case_and_changed_hash_fail(self):
        meta=self.metadata()
        with patch.dict(os.environ,{'GITHUB_SHA':'a'*40}),patch.object(qa,'digest',return_value='hash'),patch.object(qa.body,'check_cell_start_attachments'):
            for cases in [meta['cases'][:1],[meta['cases'][0],meta['cases'][0]],meta['cases']+[meta['cases'][0]]]:
                bad=copy.deepcopy(meta);bad['cases']=cases
                with self.assertRaises(AssertionError):qa.require_source(Path('/synthetic'),bad)
            bad=copy.deepcopy(meta);bad['cases'][0]['sha256']='changed'
            with self.assertRaises(AssertionError):qa.require_source(Path('/synthetic'),bad)

    def test_visible_field_end_is_required(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf=Path(tmp)/'page.pdf'
            with fitz.open() as doc:
                doc.new_page().insert_text((40,40),'Complete entry ending');doc.save(pdf)
            pages,missing=qa.visible_fields({'entry':'Complete entry ending'},pdf)
            self.assertEqual((pages,missing),(1,[]))
            self.assertEqual(qa.visible_fields({'entry':'Complete entry ending missing'},pdf)[1],['entry'])

    def test_blank_native_page_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            pdf=Path(tmp)/'blank.pdf'
            with fitz.open() as doc:doc.new_page();doc.save(pdf)
            with self.assertRaisesRegex(AssertionError,'blank'):qa.visible_fields({},pdf)

    def test_missing_sources_write_blocked_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder=Path(tmp)
            self.assertEqual(qa.main(['--source-dir',str(folder/'missing'),'--out-dir',str(folder/'out')]),1)
            self.assertEqual(json.loads((folder/'out/RESULTS.json').read_text())['status'],'BLOCKED')


if __name__=='__main__':unittest.main()
