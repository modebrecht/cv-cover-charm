#!/usr/bin/env python3
"""Mutation controls: unrelated OOXML must never change during isolation."""
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from dossier_lo_isolation import NS, attribute_diff, mutate
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


if __name__=='__main__':
    unittest.main()
