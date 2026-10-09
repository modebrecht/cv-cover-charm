"""Adversarial complete shared-carrier cell ownership and strict source/evidence checks."""
import copy,importlib.util,tempfile,unittest
from pathlib import Path
from zipfile import ZipFile
from docx_next_story_qa import native_stories,compare_native_stories
spec=importlib.util.spec_from_file_location('carrier',Path(__file__).with_name('docx-next-carrier-story-qa.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)

def field(key):
 return '<w:sdt><w:sdtPr><w:tag w:val="'+key+'"/></w:sdtPr><w:sdtContent><w:p><w:r><w:t>Same</w:t></w:r></w:p></w:sdtContent></w:sdt>'
def table(content,caption='entry',position='',row=''):
 return '<w:tbl><w:tblPr><w:tblCaption w:val="'+caption+'"/>'+position+'</w:tblPr><w:tblGrid/><w:tr>'+row+content+'</w:tr></w:tbl>'
def cell(content):return '<w:tc>'+content+'<w:p/></w:tc>'
SIDE=field('side.1')+field('side.2');MAIN=field('main.1')+table(cell(field('main.2')))
FIELDS=['side.1','side.2','main.1','main.2'];OWNERS={'side':{'table':0,'row':0,'cell':0},'main':{'table':0,'row':0,'cell':2}}
def carrier(main=MAIN,side=SIDE,gap='',row='',position='<w:tblpPr/>'):
 return table(cell(side)+cell(gap)+cell(main),'carrier',position,row)
def package(path,body):
 with ZipFile(path,'w') as z:z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:p/><w:sectPr/></w:body></w:document>')
class CarrierTest(unittest.TestCase):
 def structure(self,body):
  with tempfile.TemporaryDirectory() as d:
   a,b=[Path(d)/name for name in ('a.docx','b.docx')];package(a,table(cell(SIDE),'side','<w:tblpPr/>')+'<w:p/>'+MAIN);package(b,body)
   return q.source_structure(a,b,'carrier',{'side':0,'main':2})
 def native(self,body=None,owners=None,default=False):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'source.docx';package(p,body if body is not None else carrier())
   return native_stories(p,FIELDS) if default else native_stories(p,FIELDS,OWNERS if owners is None else owners)
 def test_shared_carrier_retains_complete_native_blocks(self):
  r=self.structure(carrier());self.assertEqual(r['originalMainParagraphs'],2);self.assertEqual(r['originalMainTables'],1);self.assertEqual(r['storyOwners'],OWNERS)
 def test_flattened_or_reordered_equal_text_cannot_replace_native_entries(self):
  for main in (field('main.1')+field('main.2'),table(cell(field('main.2')))+field('main.1')):
   with self.assertRaisesRegex(AssertionError,'complete native main'):self.structure(carrier(main=main))
 def test_side_canonical_identity_cannot_change(self):
  with self.assertRaisesRegex(AssertionError,'complete side'):self.structure(carrier(side=SIDE.replace('side.1','other')))
 def test_gap_cannot_hide_semantic_text_or_identity(self):
  with self.assertRaisesRegex(AssertionError,'Gap cell'):self.structure(carrier(gap=field('extra')))
 def test_fixed_height_and_unsplittable_row_are_rejected(self):
  for props in ('<w:cantSplit/>','<w:trHeight w:val="9999"/>'):
   with self.assertRaisesRegex(AssertionError,'automatically splitting'):self.structure(carrier(row='<w:trPr>'+props+'</w:trPr>'))
 def test_inline_table_is_not_the_automatic_floating_mechanism(self):
  with self.assertRaisesRegex(AssertionError,'must be floating'):self.structure(carrier(position=''))
 def test_distinct_cells_resolve_full_nested_native_ancestry(self):
  r=self.native();self.assertFalse(r['errors']);self.assertEqual(r['stories']['main'][1]['owners'],[{'table':1,'row':0,'cell':0},OWNERS['main']])
 def test_original_default_does_not_infer_two_stories_from_one_carrier(self):
  r=self.native(default=True);self.assertFalse(r['errors']);self.assertEqual(r['stories']['main'],[]);self.assertEqual(len(r['stories']['side']),len(FIELDS))
  self.assertEqual(compare_native_stories(self.native(),r)['status'],'fail')
 def test_duplicate_invalid_or_missing_cell_owners_fail(self):
  variants=[{'side':OWNERS['side'],'main':OWNERS['side']},{'side':OWNERS['side'],'main':{'table':0,'row':0,'cell':3}},{'side':OWNERS['side'],'main':0},{'side':OWNERS['side'],'main':{'table':0,'row':0,'cell':True}}]
  for owners in variants:
   with self.assertRaises(AssertionError):self.native(owners=owners)
 def test_field_escaping_both_cells_fails_even_with_equal_text(self):
  r=self.native(carrier(main=field('main.1'))+field('main.2'));self.assertTrue(any(e['reason']=='field-outside-declared-independent-owner' for e in r['errors']))
 def test_gap_ownership_does_not_fall_back_to_visible_text(self):
  r=self.native(carrier(main=field('main.1'),gap=field('main.2')));self.assertTrue(any(e['reason']=='field-outside-declared-independent-owner' for e in r['errors']))
 def test_equal_text_cell_swap_changes_native_story_contract(self):
  a=self.native();b=self.native(carrier(main=SIDE,side=MAIN));self.assertEqual(compare_native_stories(a,b)['status'],'fail')
 def test_strict_evidence_retains_geometry_pixels_and_stop_inventory(self):
  base={'libreOfficeVersion':'label','preparedSources':['source'],'cases':[{'savedDocxSha256':'zip','sourceGeometry':[1],'savedGeometry':[1],'rasterPages':['rgba'],'sourceStories':['whole'],'sourceStructure':['native']}],'earlyStop':{'unrenderedCases':['long']}}
  allowed=copy.deepcopy(base);allowed['libreOfficeVersion']='other';allowed['cases'][0]['savedDocxSha256']='other';self.assertEqual(q.compare_baseline(base,allowed)['changedCases'],0)
  for key in ('sourceGeometry','savedGeometry','rasterPages','sourceStories','sourceStructure'):
   changed=copy.deepcopy(base);changed['cases'][0][key]='changed'
   with self.assertRaises(AssertionError):q.compare_baseline(base,changed)
  for key in ('preparedSources','earlyStop'):
   changed=copy.deepcopy(base);changed[key]='changed'
   with self.assertRaises(AssertionError):q.compare_baseline(base,changed)
if __name__=='__main__':unittest.main()
