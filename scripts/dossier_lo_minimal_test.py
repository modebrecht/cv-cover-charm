#!/usr/bin/env python3
"""Controls for the destructive *diagnostic-copy-only* story reducer."""
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from dossier_lo_minimal import NS, W, reduce_story, unwrap_controls
from dossier_lo_isolation import attribute_diff


class ReductionControls(unittest.TestCase):
    def setUp(self):
        for prefix,uri in NS.items():ET.register_namespace(prefix,uri)
        ET.register_namespace('r','http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        ET.register_namespace('a','http://schemas.openxmlformats.org/drawingml/2006/main')
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.source=self.root/'source.docx'
        cell=lambda width: (f'<w:tc><w:tcPr><w:tcW w:w="{width}"/></w:tcPr><w:p><w:pPr>'
                            '<w:keepNext w:val="1"/><w:spacing w:line="2254"/></w:pPr></w:p></w:tc>')
        xml=(f'<w:document xmlns:w="{NS["w"]}" xmlns:wp="{NS["wp"]}"><w:body><w:tbl>'
             '<w:tblPr/><w:tblGrid/><w:tr>'+cell(3572)+cell(453)+cell(6746)+'</w:tr></w:tbl>'
             '<w:sectPr><w:headerReference/><w:pgMar w:left="1134"/></w:sectPr></w:body></w:document>')
        r=ET.fromstring(xml)
        drawing=ET.SubElement(r.find('.//w:tc/w:p',NS),W+'r')
        anchor=ET.SubElement(ET.SubElement(drawing,W+'drawing'),'{'+NS['wp']+'}anchor',{'layoutInCell':'0'})
        ET.SubElement(anchor,'{http://schemas.openxmlformats.org/drawingml/2006/main}blip',
                      {'{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed':'image1'})
        with ZipFile(self.source,'w') as pkg:
            pkg.writestr('word/document.xml',ET.tostring(r))
            pkg.writestr('word/media/image.png',b'unchanged calibration pixels')
            prefix='http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
            rels='http://schemas.openxmlformats.org/package/2006/relationships'
            pkg.writestr('_rels/.rels',f'<Relationships xmlns="{rels}"><Relationship Id="doc" Type="{prefix}officeDocument" Target="word/document.xml"/></Relationships>')
            pkg.writestr('word/_rels/document.xml.rels',f'<Relationships xmlns="{rels}"><Relationship Id="image1" Type="{prefix}image" Target="media/image.png"/><Relationship Id="header" Type="{prefix}header" Target="unused-header.xml"/></Relationships>')
            pkg.writestr('word/unused-header.xml','unused header')
            pkg.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/unused-header.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/></Types>')

    def read(self,path):
        with ZipFile(path) as pkg:return ET.fromstring(pkg.read('word/document.xml'))

    def test_original_is_byte_identical(self):
        target=self.root/'original.docx';reduce_story(self.source,target,'original')
        self.assertEqual(self.source.read_bytes(),target.read_bytes())

    def test_photo_preserves_payload_and_changes_only_requested_margin(self):
        outputs=[]
        for op in ['photo-table-20','photo-table-0']:
            target=self.root/(op+'.docx');reduce_story(self.source,target,op);outputs.append(self.read(target))
            with ZipFile(target) as pkg:self.assertEqual(pkg.read('word/media/image.png'),b'unchanged calibration pixels')
        edits=attribute_diff(*outputs)
        self.assertEqual(len(edits),1);self.assertTrue(edits[0]['attribute'].endswith('left'))
        self.assertEqual(edits[0]['after'],'0')

    def test_paragraph_host_has_one_drawing_and_no_table(self):
        target=self.root/'paragraph.docx';reduce_story(self.source,target,'photo-paragraph-20');r=self.read(target)
        self.assertEqual(len(r.findall('.//w:drawing',NS)),1)
        self.assertEqual(len(r.findall('.//w:tbl',NS)),0)

    def test_nested_controls_unwrap_without_losing_text(self):
        r=ET.fromstring(f'<w:body xmlns:w="{NS["w"]}"><w:sdt><w:sdtContent><w:sdt><w:sdtContent>'
                        '<w:p><w:r><w:t>Keep me</w:t></w:r></w:p></w:sdtContent></w:sdt></w:sdtContent></w:sdt></w:body>')
        unwrap_controls(r)
        self.assertFalse(r.findall('.//w:sdt',NS))
        self.assertEqual(''.join(r.itertext()),'Keep me')

    def test_bare_pair_diff_is_only_first_cell_keep_next(self):
        outputs=[]
        for op in ['long-bare','long-bare-detached']:
            target=self.root/(op+'.docx');reduce_story(self.source,target,op);outputs.append(self.read(target))
        edits=attribute_diff(*outputs)
        self.assertEqual(len(edits),1);self.assertIn('keepNext',edits[0]['path'])
        self.assertEqual(edits[0]['before'],'1');self.assertEqual(edits[0]['after'],'0')
        self.assertFalse(outputs[0].findall('.//w:drawing',NS))
        text=''.join(outputs[0].itertext());self.assertIn('P204Entry18',text);self.assertIn('P204TAIL',text)

    def test_unknown_reduction_rejected(self):
        with self.assertRaisesRegex(ValueError,'Unknown reduction'):
            reduce_story(self.source,self.root/'invalid.docx','unknown')

    def test_reducer_cannot_overwrite_source(self):
        with self.assertRaisesRegex(ValueError,'overwrite its source'):
            reduce_story(self.source,self.source,'long-bare')

    def test_compaction_keeps_live_bytes_and_drops_unreachable_header(self):
        full=self.root/'full.docx';small=self.root/'small.docx'
        reduce_story(self.source,full,'photo-table-20')
        result=reduce_story(self.source,small,'photo-table-20-compact')
        with ZipFile(full) as left,ZipFile(small) as right:
            self.assertEqual(left.read('word/document.xml'),right.read('word/document.xml'))
            self.assertEqual(right.read('word/media/image.png'),b'unchanged calibration pixels')
            self.assertNotIn('word/unused-header.xml',right.namelist())
        self.assertTrue(result['compaction']['retained_payloads_identical'])
        self.assertLess(small.stat().st_size,full.stat().st_size)


if __name__=='__main__':unittest.main()
