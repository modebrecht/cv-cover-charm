#!/usr/bin/env python3
"""Mutation controls: unrelated OOXML must never change during isolation."""
from pathlib import Path
from copy import deepcopy
import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz

from dossier_lo_isolation import NS, attribute_diff, baseline_controls, body_heading, entry_spans, mutate
from dossier_parity_content import docx_text


class IsolationControls(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root/'original.docx'
        cell = '<w:tc><w:p><w:pPr><w:keepNext w:val="1"/></w:pPr><w:r><w:t>Unchanged marker</w:t></w:r></w:p></w:tc>'
        xml = (f'<w:document xmlns:w="{NS["w"]}" xmlns:wp="{NS["wp"]}"><w:body>'
               '<w:tbl><w:tr>'+cell*3+'</w:tr></w:tbl>'
               '<w:p><w:r><wp:anchor layoutInCell="0"><wp:docPr name="cv.person.photo"/>'
               '<wp:positionH relativeFrom="page"><wp:posOffset>5580000</wp:posOffset></wp:positionH>'
               '</wp:anchor></w:r></w:p><w:tbl><w:tr><w:trPr><w:cantSplit/></w:trPr></w:tr></w:tbl>'
               '<w:sectPr><w:pgMar w:left="1134"/></w:sectPr></w:body></w:document>')
        with ZipFile(self.source,'w') as pkg:
            pkg.writestr('word/document.xml',xml)
            pkg.writestr('word/media/image.png',b'fixed binary image')
        self.addCleanup(self.temp.cleanup)

    def test_every_probe_preserves_semantics_and_other_parts(self):
        for operation, count in [('margin-zero',1),('margin-half',1),('layout-in-cell',1),
                                 ('horizontal-column',1),('detach-all',2),('detach-main',1),
                                 ('detach-sidebar',1),('allow-inner-row-split',1)]:
            with self.subTest(operation=operation):
                output=self.root/(operation+'.docx')
                edits=mutate(self.source,output,operation)
                self.assertEqual(len(edits),count)
                self.assertEqual(docx_text(self.source),docx_text(output))
                with ZipFile(output) as pkg:
                    self.assertEqual(pkg.read('word/media/image.png'),b'fixed binary image')

    def test_structural_mutation_rejected(self):
        with self.assertRaisesRegex(ValueError,'structure or text'):
            attribute_diff(ET.fromstring('<a><b/></a>'),ET.fromstring('<a/>'))

    def test_text_mutation_rejected(self):
        with self.assertRaisesRegex(ValueError,'structure or text'):
            attribute_diff(ET.fromstring('<a>Original</a>'),ET.fromstring('<a>Changed</a>'))

    def test_unrecognized_operation_rejected(self):
        with self.assertRaisesRegex(ValueError,'Unknown operation'):
            mutate(self.source,self.root/'bad.docx','unrecognized')

    def test_source_without_expected_coupling_rejected(self):
        changed=self.root/'detached.docx'
        mutate(self.source,changed,'detach-all')
        with self.assertRaisesRegex(ValueError,'expected cell-start coupling'):
            mutate(changed,self.root/'again.docx','detach-all')

    def test_failure_labels_alone_cannot_pass_baseline_control(self):
        statuses = {'cover':'PASS','letter':'PASS','cv-left':'PASS','cv-crop-left':'PASS',
                    'cv-right':'FAIL','cv-crop-right':'FAIL','cv-long-left':'FAIL','cv-long-right':'FAIL'}
        original = {'sha':'sample','cases':[{'id':k,'status':v} for k,v in statuses.items()]}
        self.assertFalse(baseline_controls(original,'sample'))

    def test_retained_native_ci_is_positive_control(self):
        original=json.loads((Path(__file__).resolve().parents[1]/'docs/qa/p2-02-semantic-results.json').read_text())
        self.assertTrue(baseline_controls(original,original['sha']))
        self.assertFalse(baseline_controls(original,'different-source'))
        changed=deepcopy(original)
        long=next(r for r in changed['cases'] if r['id']=='cv-long-left')
        long['missing'][0]['source_xml']=False
        self.assertFalse(baseline_controls(changed,changed['sha']))

    def test_title_on_correct_page_does_not_hide_split_description(self):
        complete=entry_spans(['P202Praxis01 Beschreibung Arbeitsschritte. P202Praxis02'])
        split=entry_spans(['P202Praxis01 Beschreibung','Arbeitsschritte. P202Praxis02'])
        self.assertTrue(complete[0]['complete'])
        self.assertFalse(complete[0]['split'])
        self.assertTrue(split[0]['complete'])
        self.assertTrue(split[0]['split'])

    def test_later_entry_cannot_supply_missing_description(self):
        entries=entry_spans(['P202Praxis01','P202Praxis02 Arbeitsschritte. P202Praxis03'])
        self.assertFalse(entries[0]['complete'])
        self.assertTrue(entries[1]['complete'])

    def test_body_heading_uses_baseline_and_excludes_running_header(self):
        path=self.root/'heading.pdf'
        with fitz.open() as pdf:
            page=pdf.new_page()
            page.insert_text((60,30),'Lea Müller',fontsize=10)
            page.insert_text((60,200),'Lea Müller',fontsize=32)
            pdf.save(path)
        self.assertEqual(body_heading(path),[21.167,70.556])


if __name__=='__main__':
    unittest.main()
