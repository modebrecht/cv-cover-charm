#!/usr/bin/env python3
"""P2-08 package and measurement negative controls; no native engine mocks."""
from copy import deepcopy
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from PIL import Image,ImageDraw
from dossier_production_spacing import NS,W,change_gap,compare,content,markers,read_root,spans,tsv_origins
from dossier_parity_content import photo_signature

ROOT=Path(__file__).resolve().parents[1]


def authored(count):return '\n'.join(m+' Support mit Arbeitsschritte.' for m in markers(count)[:-1])+'\nP202Endreferenz Klassenlehrer 079 555 12 34'


class ProductionSpacingControls(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.folder=Path(self.temp.name)
        self.source=ROOT/'tests/fixtures/lo-import-p2-06/long-gap-original.docx'

    def test_semantic_gap_edit_reproduces_persisted_minimum(self):
        target=self.folder/'copy.docx';r=change_gap(self.source,target,18)
        self.assertEqual(target.read_bytes(),(ROOT/'tests/fixtures/lo-import-p2-07/long-gap06-zero.docx').read_bytes())
        self.assertEqual(len(r['attribute_edits']),1);self.assertEqual(r['critical_tables_identical'],19)

    def test_mirrored_main_is_found_by_content_not_cell_number(self):
        root=read_root(self.source);row=root.find('w:body/w:tbl/w:tr',NS);cells=row.findall('w:tc',NS)
        positions=[list(row).index(c) for c in cells]
        row.remove(cells[0]);row.remove(cells[2]);row.insert(positions[0],cells[2]);row.insert(positions[2],cells[0])
        source=self.folder/'mirrored.docx'
        with ZipFile(self.source) as pkg,ZipFile(source,'w') as out:
            for info in pkg.infolist():out.writestr(info,ET.tostring(root,encoding='utf-8',xml_declaration=True) if info.filename=='word/document.xml' else pkg.read(info))
        r=change_gap(source,self.folder/'copy.docx',18);self.assertEqual(r['main_cell_index'],0)

    def test_source_overwrite_and_unexpected_count_rejected(self):
        with self.assertRaisesRegex(ValueError,'overwrite'):change_gap(self.source,self.source,18)
        with self.assertRaisesRegex(ValueError,'table count'):change_gap(self.source,self.folder/'bad.docx',19)

    def test_original_download_remains_byte_identical(self):
        original=self.source.read_bytes();change_gap(self.source,self.folder/'copy.docx',18)
        self.assertEqual(self.source.read_bytes(),original)

    def test_dynamic_entry_counts_17_and_19(self):
        for count in [17,19]:
            result=content([authored(count)],count);self.assertEqual(result['status'],'PASS')
            self.assertEqual(result['complete_entries'],count)

    def test_title_without_complete_description_does_not_pass(self):
        text=authored(19).replace('P202Praxis19 Support mit Arbeitsschritte.','P202Praxis19 Support mit')
        result=content([text],19);self.assertEqual(result['status'],'FAIL');self.assertEqual(result['complete_entries'],18)

    def test_reference_contact_and_unique_markers_are_required(self):
        self.assertEqual(content([authored(17).replace('079 555 12 34','')],17)['status'],'FAIL')
        self.assertEqual(content([authored(17),'P202Praxis01'],17)['status'],'FAIL')

    def test_split_description_is_observed(self):
        result=spans(['P202Praxis01 Support','Arbeitsschritte. P202Endreferenz'],1)
        self.assertTrue(result[0]['complete']);self.assertTrue(result[0]['split'])

    def test_ocr_token_boxes_are_scaled_and_joined(self):
        text='level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
        text+='5\t1\t1\t1\t1\t1\t100\t200\t70\t20\t99\tP202Praxis\n'
        text+='5\t1\t1\t1\t1\t2\t172\t200\t20\t20\t99\t06\n'
        r=tsv_origins(text,['P202Praxis06'],2,[210,297],[1000,1500])
        self.assertEqual(r['P202Praxis06'],{'page':2,'top_left_mm':[21.0,39.6]})

    def test_page_or_geometry_change_cannot_pass_on_content_alone(self):
        im=Image.new('RGB',(210,297),'white');d=ImageDraw.Draw(im)
        d.rectangle((25,50,65,110),fill='#19a867');d.rectangle((25,50,38,70),fill='#df2638');d.rectangle((52,90,65,110),fill='#204fc8');d.rectangle((38,70,52,90),fill='#fff024')
        app={'pages':1,'content':content([authored(1)],1),'photos':[photo_signature(im)],
            'title_positions':{m:{'page':1,'top_left_mm':[70,80+i*20]} for i,m in enumerate(markers(1))}}
        self.assertEqual(compare(app,deepcopy(app),1,False)['status'],'PASS')
        moved=deepcopy(app);moved['title_positions']['P202Praxis01']['top_left_mm'][0]+=3
        self.assertEqual(compare(app,moved,1,False)['layout_status'],'FAIL')
        moved=deepcopy(app);moved['content']['marker_pages']['P202Praxis01']=[2]
        self.assertEqual(compare(app,moved,1,False)['status'],'FAIL')


if __name__=='__main__':unittest.main()
