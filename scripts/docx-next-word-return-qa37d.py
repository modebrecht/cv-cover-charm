"""Read-only Word return review and bounded shared-background candidate QA.

Arguments: original DOCX, returned DOCX, Word PDF, prior app folder,
new app folder, output folder. User documents are hashed, never republished.
"""
import hashlib
import io
import json
import posixpath
import re
import shutil
import sys
import unicodedata
import zipfile
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET

import fitz
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

original, returned, word_pdf, prior_app, app, out = map(Path, sys.argv[1:7])
out.mkdir(parents=True, exist_ok=True)
ns = {"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main", "wp":"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "a":"http://schemas.openxmlformats.org/drawingml/2006/main", "r":"http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
attr = lambda e: {k.rsplit('}',1)[-1]:v for k,v in e.attrib.items()}
norm = lambda s: re.sub(r"\s+", "", unicodedata.normalize("NFKC",s).casefold()).replace("–","-").replace("—","-")

def package(path):
    with zipfile.ZipFile(path) as z:
        doc = ET.fromstring(z.read("word/document.xml"))
        controls = [(t.get(f'{{{ns["w"]}}}val'), ''.join(x.text or '' for x in s.findall('.//w:t',ns))) for s in doc.findall('.//w:sdt',ns) if (t:=s.find('w:sdtPr/w:tag',ns)) is not None]
        defaults = {'hRule':'auto','hSpace':'0','vSpace':'0'}
        frames = [{k:v for k,v in attr(f).items() if defaults.get(k)!=v} for f in doc.findall('.//w:framePr',ns)]
        paints = []
        badge = None
        for name in z.namelist():
            if not name.startswith('word/') or not name.endswith('.xml') or '/_rels/' in name:
                continue
            tree = ET.fromstring(z.read(name))
            for a in tree.findall('.//wp:anchor',ns):
                id = a.find('wp:docPr',ns).get('name')
                if '.compact.' in id:
                    paints.append({'id':id,'extent':attr(a.find('wp:extent',ns)), 'x':a.find('wp:positionH/wp:posOffset',ns).text, 'y':a.find('wp:positionV/wp:posOffset',ns).text})
                if id == 'cover.lehrbeginn.badge-paint':
                    assert name == 'word/document.xml'
                    rid = a.find('.//a:blip',ns).get(f'{{{ns["r"]}}}embed')
                    rels = ET.fromstring(z.read('word/_rels/document.xml.rels'))
                    target = next(r.get('Target') for r in rels if r.get('Id')==rid)
                    data = z.read(posixpath.normpath('word/'+target))
                    im = Image.open(io.BytesIO(data)).convert('RGBA')
                    badge = {'sha256':hashlib.sha256(data).hexdigest(), 'extent':attr(a.find('wp:extent',ns)), 'x':a.find('wp:positionH/wp:posOffset',ns).text, 'y':a.find('wp:positionV/wp:posOffset',ns).text, 'behindDoc':a.get('behindDoc'), 'originH':a.find('wp:positionH',ns).get('relativeFrom'), 'originV':a.find('wp:positionV',ns).get('relativeFrom'), 'centerRGBA':im.getpixel((im.width//2,im.height//2))}
        return {'controls':controls, 'frames':frames, 'paint':sorted(paints,key=lambda p:json.dumps(p,sort_keys=True)), 'badge':badge, 'sections':len(doc.findall('.//w:sectPr',ns))}

old, saved = package(original), package(returned)
assert old['controls']==saved['controls'] and len(saved['controls'])==82
assert old['frames']==saved['frames'] and len(saved['frames'])==11
assert old['badge']==saved['badge'] and old['sections']==saved['sections']==3
assert old['paint']==saved['paint'] and all(p['extent']['cx']=='7560000' for p in saved['paint'])
d = fitz.open(word_pdf)
assert len(d)==4 and 'Word' in d.metadata['producer']
text = norm(''.join(p.get_text() for p in d))
assert all(norm(value) in text for _,value in old['controls'] if value.strip())
widths = []
for i in range(1,4):
    p = d[i]
    for image in p.get_image_info(xrefs=True):
        x0,y0,x1,y1 = image['bbox']
        if x1-x0>500 and y1-y0<20:
            widths.append({'page':i+1, 'bboxPt':[x0,y0,x1,y1], 'rightGapMm':(p.rect.width-x1)*25.4/72})
assert len(widths)==12
spans = [s for b in d[0].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l.get('spans',[])]
headings = {s['text']:f'#{s["color"]:06X}' for s in spans if s['text'] in ['KONTAKT','BEILAGEN']}
pix = d[0].get_pixmap(matrix=fitz.Matrix(120/72,120/72),colorspace=fitz.csRGB,alpha=False)
im = Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
box = tuple(round(v*120/72) for v in (20*72/25.4,166.67*72/25.4,73.90107421875*72/25.4,175.5003333333*72/25.4))
fill = Counter(im.crop(box).get_flattened_data()).most_common(1)[0][0]
word = {'originalSha256':sha(original),'returnedSha256':sha(returned),'wordPdfSha256':sha(word_pdf),'pdfProducer':d.metadata['producer'],'pages':len(d),'nativeControlsRetained':82,'allControlTextPresentInPdf':True,'coverFramesGeometryRetained':11,'badgeAssetAndAnchorUnchanged':True,'badge':saved['badge'],'compactSavedExtentsUnchanged':True,'wordPdfPaintBounds':widths,'headingColors':headings,'visiblePillFillSrgb':'#'+''.join(f'{c:02X}' for c in fill),'note':'The PDF proves the observed Word output after save; first-open versus Save/Reopen causality is not isolated.'}
(out/'word-return-inspection.json').write_text(json.dumps(word,indent=2)+'\n')

before = json.loads((prior_app/'model.json').read_text())
model = json.loads((app/'model.json').read_text())
ev = json.loads((app/'app-evidence.json').read_text())
assert all(ev[k] for k in ['clickedAppExport','uiDownloadEqualsAppEntry','webSourceEqualsExportSource','savedDocumentsUnchangedByExport','neighborBodiesIdentical'])
assert before['cover']==model['cover']
for scope in ['letter','cv']:
    part = dict(model[scope])
    assert part.pop('pagePaintComposition')=='single-asset' and part==before[scope]
assert sha(app/'baseline.docx')==sha(prior_app/'baseline.docx')
assert sha(app/'web.png')==sha(prior_app/'web.png')
for scope in ['letter','cv']:
    assert sha(app/f'web-{scope}.png')==sha(prior_app/f'web-{scope}.png')
prior_pdf = fitz.open(prior_app/'rendered/candidate.pdf')
candidate = fitz.open(app/'rendered/candidate.pdf')
assert len(candidate)==len(prior_pdf)==4
pages = []
for i in range(4):
    words = lambda p:[(round(w[0],3),round(w[1],3),round(w[2],3),round(w[3],3),w[4]) for w in p.get_text('words')]
    assert words(candidate[i])==words(prior_pdf[i])
    a = Image.open(prior_app/f'rendered/page-{i+1}.png').convert('RGB')
    b = Image.open(app/f'rendered/page-{i+1}.png').convert('RGB')
    equal = a.size==b.size and ImageChops.difference(a,b).getbbox() is None
    if i==0: assert equal
    pages.append({'page':i+1,'nativeGlyphPositionsUnchanged':True,'wholePagePixelsIdentical':equal})
new = package(app/'candidate.docx')
assert new['controls']==old['controls'] and new['badge']==old['badge'] and new['frames']==old['frames']
with zipfile.ZipFile(app/'candidate.docx') as z:
    for scope in ['letter','cv']:
        for suffix in ['', '-first']:
            xml = ET.fromstring(z.read(f'word/{scope}-header{suffix}.xml'))
            anchors = xml.findall('.//wp:anchor',ns)
            assert len(anchors)==1 and anchors[0].find('wp:docPr',ns).get('name').startswith(scope+'.page-paint.')
validation = {'status':'PARTIAL','candidateWordAcceptance':'UNVERIFIED','case':'normal','actualAppExport':True,'pages':pages,'canonicalBodyAndPageGeometryUnchanged':True,'coverModelUnchanged':True,'defaultNextBytesUnchanged':True,'allThreeWebCapturesUnchanged':True,'nativeControlsUnchanged':82,'singlePaintAnchorPerInteriorHeader':True,'candidateSha256':sha(app/'candidate.docx')}
(out/'candidate-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
shutil.copyfile(app/'candidate.docx',out/'modern-shared-edge-normal.docx')
for name in ['app-evidence','project','snapshot','metrics','model']:
    shutil.copyfile(app/f'{name}.json',out/f'normal-{name}.json')
pdf = Canvas(str(out/'shared-edge-a4-comparison.pdf'),pagesize=landscape(A4))
w,h = landscape(A4)
pw = min((w-60)/2,(h-80)*210/297)
ph = pw*297/210
y = h-70-ph
for i in range(4):
    pdf.setFont('Helvetica-Bold',12)
    pdf.drawString(18,h-23,f'Modern page {i+1}: decorative shared-background candidate')
    pdf.setFont('Helvetica',8)
    pdf.drawString(18,h-38,'Both panels: LibreOffice. Word edge correction UNVERIFIED. Text coordinates unchanged; contact layout not changed.')
    for j,(label,folder) in enumerate([('Prior native candidate',prior_app),('Shared-background candidate',app)]):
        x=(w-2*pw-20)/2+j*(pw+20)
        pdf.setFont('Helvetica-Bold',9)
        pdf.drawString(x,y+ph+8,label)
        pdf.drawImage(ImageReader(str(folder/f'rendered/page-{i+1}.png')),x,y,width=pw,height=ph)
    pdf.showPage()
pdf.save()
print(json.dumps({'wordPages':4,'nativeControlsRetained':82,'wordEdgeDefectConfirmed':True,'candidatePages':4,'candidateWordAcceptance':'UNVERIFIED'}))
