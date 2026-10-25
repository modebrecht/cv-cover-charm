"""Read-only validation of actual UI downloads after the bounded chrome correction."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
import fitz
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

old, app, out = map(Path, sys.argv[1:4])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
results = []
for case in ['normal', 'scaled', 'long']:
    before, after = old/case, app/case
    previous = json.loads((before/'model.json').read_text())
    model = json.loads((after/'model.json').read_text())
    ev = json.loads((after/'app-evidence.json').read_text())
    assert ev['clickedAppExport'] and ev['uiDownloadEqualsAppEntry']
    assert ev['savedDocumentsUnchangedByExport'] and ev['neighborBodiesIdentical']
    assert not ev['neighborModelsIdentical']  # page-edge paint intentionally changes
    assert model['cover'] == previous['cover']
    assert sha(after/'baseline.docx') == sha(before/'baseline.docx')
    assert sha(after/'web.png') == sha(before/'web.png')
    d = fitz.open(after/'rendered/candidate.pdf')
    prior = fitz.open(before/'candidate/candidate.pdf')
    assert len(d) == len(prior) == 4
    page_equal, body_equal, body_glyphs = [], [], []
    for i in range(4):
        a = Image.open(before/f'candidate/page-{i+1}.png').convert('RGB')
        b = Image.open(after/f'rendered/page-{i+1}.png').convert('RGB')
        assert a.size == b.size
        page_equal.append(ImageChops.difference(a,b).getbbox() is None)
        box = (int(a.width*10/210), int(a.height*5/297), int(a.width*200/210), int(a.height*275/297))
        body_equal.append(ImageChops.difference(a.crop(box),b.crop(box)).getbbox() is None)
        rect = fitz.Rect(10*72/25.4,5*72/25.4,200*72/25.4,275*72/25.4)
        glyphs = lambda page: [(round(w[0],3),round(w[1],3),round(w[2],3),round(w[3],3),w[4]) for w in page.get_text('words',clip=rect)]
        body_glyphs.append(glyphs(d[i]) == glyphs(prior[i]))
        assert abs(d[i].rect.width-595.2756)<.1 and abs(d[i].rect.height-841.8898)<.1
        words = d[i].get_text('words')
        assert all(d[i].rect.contains(fitz.Rect(w[:4])) for w in words)
        if i: assert all(rect.contains(fitz.Rect(w[:4])) for w in words)
    assert page_equal[0] and all(body_equal) and all(body_glyphs)
    for scope in ['letter','cv']:
        p = model[scope]
        assert p['blocks'] == previous[scope]['blocks'] and p['page'] == previous[scope]['page']
        assert not p['footer'] and not p['chrome'].get('borderColor')
        paint = {s['id'].split('.')[-1]:s for s in p['headerShapes'] if '.compact.' in s['id']}
        assert paint['footer']['heightMm'] + paint['footer-edge']['heightMm'] == 4
        assert paint['footer-edge']['yMm'] == 293 and paint['footer']['opacity'] == .92
        web = json.loads((after/f'web-{scope}-chrome.json').read_text())
        assert len(web)==2 and all(abs(v['heightMm']-4)<.02 and v['text']=='' for v in web)
    filename = f'modern-compact-{case}.docx'
    shutil.copyfile(after/'candidate.docx', out/filename)
    shutil.copyfile(after/'app-evidence.json',out/f'{case}-app-evidence.json')
    results.append({'case':case,'pages':4,'coverPixelsUnchanged':page_equal[0],
        'wholePagePixelEquality':page_equal,'bodyRegionsPixelIdentical':body_equal[1:],
        'bodyGlyphPositionsIdentical':body_glyphs[1:],'defaultNextBytesUnchanged':True,
        'webCoverPixelsUnchanged':True,'letterAndCvBodyModelsUnchanged':True,
        'nativeFooterMm':4,'nativeImplicitFooterName':False,'nativePageFrame':False,
        'sha256':sha(after/'candidate.docx'),'wordAcceptance':'UNVERIFIED'})
for scope in ['letter','cv']:
    for filename in [f'web-{scope}.png',f'web-{scope}-chrome.json']:
        shutil.copyfile(app/'normal'/filename,out/filename)
for filename in ['project.json','snapshot.json','metrics.json','model.json']:
    shutil.copyfile(app/'normal'/filename,out/f'normal-{filename}')
(out/'validation.json').write_text(json.dumps(results,indent=2)+'\n')
# Three real A4 panels: source Web, prior native candidate, corrected candidate.
pdf = Canvas(str(out/'compact-chrome-a4-comparison.pdf'),pagesize=landscape(A4))
w,h = landscape(A4)
pw=min((w-68)/3,(h-80)*210/297); ph=pw*297/210
y=h-70-ph
for scope,index in [('letter',2),('cv',3)]:
    pdf.setFont('Helvetica-Bold',12);pdf.drawString(18,h-23,f'Modern {scope}: compact chrome correction')
    pdf.setFont('Helvetica',8);pdf.drawString(18,h-38,'Same saved project. Native panels: LibreOffice. New Microsoft Word acceptance UNVERIFIED.')
    files=[('Actual Web',app/'normal'/f'web-{scope}.png'),('Prior DOCX',old/'normal'/f'candidate/page-{index}.png'),('Corrected DOCX',app/'normal'/f'rendered/page-{index}.png')]
    for i,(label,file) in enumerate(files):
        x=(w-3*pw-32)/2+i*(pw+16)
        pdf.setFont('Helvetica-Bold',9);pdf.drawString(x,y+ph+8,label)
        pdf.drawImage(ImageReader(str(file)),x,y,width=pw,height=ph)
    pdf.showPage()
pdf.save()
print(json.dumps(results,indent=2))
