"""Compare saved-App Sidebar packages; Writer evidence never implies Word acceptance."""
import argparse,importlib.util,json,hashlib
from pathlib import Path
from zipfile import ZipFile
from lxml import etree as ET
import fitz
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('docx-next-sidebar-word-layout-qa.py'));inv=importlib.util.module_from_spec(spec);spec.loader.exec_module(inv)
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('baseline',type=Path);parser.add_argument('fixed',type=Path);parser.add_argument('report',type=Path)
parser.add_argument('--stress-case',type=Path);parser.add_argument('--viewscale-case',type=Path)
args=parser.parse_args();base=args.baseline;fixed=args.fixed
rows=[]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def compact(text):return ''.join(c for c in text if c.isalnum()).casefold()
for folder in sorted(fixed.glob('0*-*')):
 name=folder.name;old=base/name
 bp,fp=[json.loads((p/'proof.json').read_text()) for p in [old,folder]]
 equal={key:bp[key]==fp[key] for key in ['snapshot','metrics','sidebarMetrics']}
 equal.update({part+'Model':bp['model'][part]==fp['model'][part] for part in ['cover','letter']})
 equal['WebScreenshots']=all(digest(p)==digest(old/p.name) for p in folder.glob('Web-CV-*.png'))
 equal['coverAndLetterRenders']=all(digest(folder/'native-render'/f'page-{i}.png')==digest(old/'native-render'/f'page-{i}.png') for i in [1,2])
 assert all(equal.values()),(name,equal)
 bi,fi=[inv.inventory(p/(name+'.docx')) for p in [old,folder]]
 assert bi['fields']==fi['fields'] and bi['pictures']==fi['pictures'] and bi['texts']==fi['texts'] and bi['grids']==fi['grids']
 docs=[fitz.open(next((p/'native-render').glob('*.pdf'))) for p in [old,folder]]
 app=fitz.open(folder/'App-Referenz.pdf');assert len(docs[0])==len(docs[1])==len(app)
 photo=[]
 for p,d in zip([old,folder],docs):
  boxes=[[round(v*25.4/72,5) for v in i['bbox']] for page in list(d)[2:] for i in page.get_image_info() if abs((i['bbox'][2]-i['bbox'][0])*25.4/72-34)<.1]
  root=inv.effective_tree(ZipFile(p/(name+'.docx')).read('word/document.xml'))
  ns={**inv.NS,'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
  anchors=root.xpath('.//wp:anchor[wp:docPr/@name="cv.person.photo.frame"]',namespaces=ns)
  photo.append({'visibleBboxMm':boxes,'anchorCount':len(anchors),'anchorInsideTable':[bool(a.xpath('ancestor::w:tbl',namespaces=ns)) for a in anchors],'declaredOffsetEmu':[{axis:a.find(f'wp:position{axis}/wp:posOffset',ns).text for axis in ['H','V']} for a in anchors]})
 if fp.get('picture'):
  assert photo[0]['anchorInsideTable']==[True] and photo[1]['anchorInsideTable']==[False]
  assert photo[0]['declaredOffsetEmu']==photo[1]['declaredOffsetEmu']
  assert abs(photo[1]['visibleBboxMm'][0][1]-210)<.05
  pic=fi['pictures']['cv.person.photo'];source=fp['picture']['source']
  assert all(pic[k]==source[k] for k in ['width','height','rgbaSha256'])
 native_text=compact(''.join(p.get_text() for p in list(docs[1])[2:]))
 missing=[key for key,text in fi['fields'].items() if key.startswith('cv.') and any(compact(line) not in native_text for line in text.splitlines())];assert not missing,missing
 record={'case':name,'sameSourceAndAdjacentDocuments':equal,'activeFields':len(fi['fields']),'fieldIdsAndTextUnchanged':True,'gridsUnchanged':True,'picturesUnchanged':fi['pictures'],'nativeCvPages':len(docs[1])-2,'appCvPages':len(app)-2,'baselineDocxSha256':digest(old/(name+'.docx')),'fixedDocxSha256':digest(folder/(name+'.docx')),'pictureBefore':photo[0],'pictureAfter':photo[1]}
 if name.startswith('03'):
  before=[p.get_text() for p in list(docs[0])[2:]];after=[p.get_text() for p in list(docs[1])[2:]]
  assert 'Schulstation 12' in before[0] and 'Schulstation 12' not in before[1]
  assert 'Schulstation 12' not in after[0] and 'Schulstation 12' in after[1]
  assert 'Schulhaus Zentrum, Hubersdorf' in after[1].split('PRAKTIKA')[0] and 'Schwerpunkt Mathematik und Informatik' in after[1].split('PRAKTIKA')[0]
  record['shortEntryBefore']={'page1Tail':before[0][-250:],'page2Start':before[1][:250]};record['shortEntryAfter']={'page1Tail':after[0][-250:],'page2Start':after[1][:250]}
 rows.append(record)
assert rows,'No cases found'
report={'wordAcceptance':'UNVERIFIED','cases':rows}
if args.stress_case:
 folder=args.stress_case;proof=json.loads((folder/'proof.json').read_text())
 entry=proof['snapshot']['cv']['data']['schule'][0];field='cv.entry.schule:'+entry['id']
 def walk(value):
  if isinstance(value,dict):
   yield value
   for child in value.values():yield from walk(child)
  elif isinstance(value,list):
   for child in value:yield from walk(child)
 rail=next(b for b in walk(proof['model']['cv']['blocks']) if b.get('kind')=='table' and b.get('id')==field+'.dateRail')
 assert rail['rows'][0]['keepTogether'] is False
 doc=fitz.open(next((folder/'native-render').glob('*.pdf')))
 text=compact(''.join(p.get_text() for p in list(doc)[2:]));lines=entry['beschreibung'].splitlines()
 assert all(compact(line) in text for line in lines)
 root=inv.effective_tree(ZipFile(folder/(folder.name+'.docx')).read('word/document.xml'))
 control=root.xpath('.//w:sdt[w:sdtPr/w:tag/@w:val=$field]',field=field+'.description',namespaces=inv.NS)
 assert len(control)==1
 tokens=control[0].xpath('.//w:t | .//w:br | .//w:tab',namespaces=inv.NS)
 complete=''.join('\n' if node.tag=='{'+inv.W+'}br' else '\t' if node.tag=='{'+inv.W+'}tab' else node.text or '' for node in tokens)
 assert complete==entry['beschreibung']
 report['longEntry']={'nativeCvPages':len(doc)-2,'sourceLines':len(lines),'allLinesAndEndMarkerVisible':True,'completeDescriptionControl':True,'nativeRowKeepTogether':False,'docxSha256':digest(folder/(folder.name+'.docx'))}
if args.viewscale_case:
 z=args.viewscale_case;b=fixed/z.name;zp,bp=[json.loads((p/'proof.json').read_text()) for p in [z,b]]
 checks={key:zp[key]==bp[key] for key in ['snapshot','metrics','sidebarMetrics','model']};checks['docxByteEqual']=(z/(z.name+'.docx')).read_bytes()==(b/(b.name+'.docx')).read_bytes()
 assert all(checks.values()),checks
 report['viewScaleComparison']=checks
args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'verifiedCases':len(rows),'longEntry':report.get('longEntry'),'viewScaleComparison':report.get('viewScaleComparison'),'wordAcceptance':'UNVERIFIED'},indent=2))
