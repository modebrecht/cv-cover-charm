from pathlib import Path
import json,fitz,sys
from PIL import Image,ImageChops
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/docx-next-sidebar-page-surface-verify.py GENERATED_DIRECTORY')
qa=Path(sys.argv[1]).resolve()
manifest=json.loads((qa/'manifest.json').read_text())
results=[]
for case in manifest['results']:
 id=case['id'];old=fitz.open(qa/(id+'-before-render')/(id+'-before.pdf'));new=fitz.open(qa/(id+'-after-render')/(id+'-after.pdf'))
 assert len(old)==len(new)
 paint=case['surface'][0];edge=case['surface'][1]
 pages=[]
 for i,(before,after) in enumerate(zip(old,new)):
  def spans(page):
   return [(s['text'],s['font'],s['size'],s['color'],tuple(s['bbox'])) for b in page.get_text('dict')['blocks'] if 'lines'in b for l in b['lines'] for s in l['spans']]
  assert spans(before)==spans(after),(id,i,'text/positions changed')
  b=Image.open(qa/(id+'-before-render')/f'page-{i+1}.png').convert('RGB');a=Image.open(qa/(id+'-after-render')/f'page-{i+1}.png').convert('RGB')
  assert a.size==b.size
  diff=ImageChops.difference(a,b).getbbox()
  r={'page':i+1,'semanticSpansAndPositionsIdentical':True,'imagePixelsIdentical':diff is None,'diffBounds':diff}
  if i<2:assert diff is None,(id,i,'cover/letter changed')
  else:
   x=(paint['xMm']+paint['widthMm']/2)/210*a.width
   # Sample rail away from its inner stroke, at both paper edges and mid-page.
   points=[(round(x),round(mm/297*a.height)) for mm in (1,2,295,296)]
   fill=tuple(bytes.fromhex(paint['fill']['color']))
   samples=[]
   for p in points:
    actual=a.getpixel(p);assert max(abs(c-e) for c,e in zip(actual,fill))<=2,(id,i,p,actual,fill)
    samples.append({'pixel':p,'before':b.getpixel(p),'after':actual})
   if diff:
    left=min(paint['xMm'],edge['xMm'])/210*a.width
    right=max(paint['xMm']+paint['widthMm'],edge['xMm']+edge['widthMm'])/210*a.width
    assert diff[0]>=int(left)-2 and diff[2]<=round(right)+2,(id,i,'paint escaped rail',diff,left,right)
   r['edgePaintSamples']=samples
  pages.append(r)
 results.append({'id':id,'pagesBefore':len(old),'pagesAfter':len(new),'allTextAndPositionsIdentical':True,'pages':pages})
(qa/'visual-verification.json').write_text(json.dumps({'renderer':'LibreOfficeDev supplemental, not Microsoft Word','results':results},indent=2))
print(json.dumps({'cases':len(results),'renderedPages':sum(x['pagesAfter']+x['pagesBefore'] for x in results),'unchangedCoverLetterPages':12,'newCvPagesToInspect':sum(x['pagesAfter']-2 for x in results),'allTextAndPositionsIdentical':True,'fullHeightRailSamples':'PASS'},indent=2))
