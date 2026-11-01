#!/usr/bin/env python3
"""Negative controls: a present image and valid PDF alone cannot pass parity."""
import json,tempfile,unittest
from pathlib import Path
from PIL import Image,ImageDraw,ImageOps
from dossier_parity_content import marker_pages,photo_signature,compare_photo
from dossier_visual_parity import apply_next_coverage,TemplateCase
from assemble_next_coverage import assemble

def card(x=25):
    im=Image.new('RGB',(210,297),'white');d=ImageDraw.Draw(im)
    d.rectangle((x,50,x+40,110),fill='#19a867');d.rectangle((x,50,x+13,70),fill='#df2638');d.rectangle((x+27,90,x+40,110),fill='#204fc8');d.rectangle((x+13,70,x+27,90),fill='#fff024')
    return im

class SemanticTests(unittest.TestCase):
    def test_spaced_glyphs_diacritics_soft_hyphen_and_missing_tail(self):
        pages=marker_pages(['L E B E N S L A U F Lea Mu\u0308ller P202Praxis01','Endre\u00adferenz'],['Lebenslauf','Lea Müller','Endreferenz','LostTail'])
        self.assertEqual(pages,{'Lebenslauf':[1],'Lea Müller':[1],'Endreferenz':[2],'LostTail':[]})
    def test_identical_calibration_photos_pass(self):
        s=photo_signature(card());self.assertEqual(compare_photo(s,s)['status'],'PASS')
    def test_photo_loss_fails(self):
        self.assertEqual(compare_photo(photo_signature(card()),photo_signature(Image.new('RGB',(210,297),'white')))['status'],'FAIL')
    def test_photo_moved_to_other_side_fails(self):
        self.assertEqual(compare_photo(photo_signature(card()),photo_signature(card(150)))['status'],'FAIL')
    def test_reversed_picture_with_same_extent_fails(self):
        im=card();im.paste(ImageOps.mirror(im.crop((25,50,66,111))),(25,50))
        self.assertEqual(compare_photo(photo_signature(card()),photo_signature(im))['status'],'FAIL')
    def test_wrong_crop_with_same_extent_fails(self):
        im=card();crop=im.crop((35,65,56,96)).resize((41,61));im.paste(crop,(25,50))
        self.assertEqual(compare_photo(photo_signature(card()),photo_signature(im))['status'],'FAIL')
    def test_missing_coverage_is_not_a_pass(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'coverage.json';p.write_text(json.dumps({'sha':'one','exporter':'production DOCX Next','rows':[]}))
            with self.assertRaisesRegex(RuntimeError,'exactly once'):apply_next_coverage([TemplateCase('modern','Modern',{})],p,'one')
    def test_blocked_row_needs_a_reason(self):
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'coverage.json';p.write_text(json.dumps({'sha':'one','exporter':'production DOCX Next','rows':[{'base':'modern','status':'BLOCKED'}]}))
            with self.assertRaisesRegex(RuntimeError,'reason'):apply_next_coverage([TemplateCase('modern','Modern',{})],p,'one')
    def test_mixed_sha_batch_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);d=root/'one'/'docx';d.mkdir(parents=True);(d/'COVERAGE.part-00.json').write_text('[]');(d/'SOURCE_SHA.txt').write_text('other')
            with self.assertRaisesRegex(ValueError,'SHAs'):assemble(root,root,'expected',1,0)
if __name__=='__main__':unittest.main()
