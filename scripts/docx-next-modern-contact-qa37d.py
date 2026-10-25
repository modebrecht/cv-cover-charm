"""Validate the Modern compact-grid/accent app cohort and the returned R2 Word files.

Inputs: app, old cases, prior normal, Brief app, Brief golden, other Web,
other golden, returned DOCX, Word PDF, output. Returned files are never copied.
"""
import base64
import hashlib
import io
import json
import math
import re
import shutil
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

import fitz
from PIL import Image, ImageChops
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

app, old_cases, prior, brief, golden, other, other_golden, returned, word_pdf, out = map(Path, sys.argv[1:11])
out.mkdir(parents=True, exist_ok=True)
cases = ['normal','scaled','long','moved','photo-portrait','photo-circle','hidden','badge-center','badge-right','badge-long','contact-long','contact-partial','contact-unaligned']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
norm = lambda s: re.sub(r'\s+', '', unicodedata.normalize('NFKC',s).casefold()).replace('–','-').replace('—','-')
ns = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def controls(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
        return {t.get(f'{{{ns["w"]}}}val'):''.join(x.text or '' for x in s.findall('.//w:t',ns)) for s in root.findall('.//w:sdt',ns) if (t:=s.find('w:sdtPr/w:tag',ns)) is not None}

before, after = controls(prior/'candidate.docx'), controls(returned)
assert before.keys()==after.keys() and len(after)==82
changes = {key:{'before':before[key],'after':after[key]} for key in before if before[key]!=after[key]}
assert set(changes)=={'cover.kontaktTitel'}
word = fitz.open(word_pdf)
assert len(word)==4 and 'Word' in word.metadata['producer']
all_word = norm(''.join(p.get_text() for p in word))
assert all(norm(v) in all_word for v in after.values() if v.strip())
paint = []
for i in range(1,4):
    imgs = [im for im in word[i].get_image_info(xrefs=True) if im['bbox'][2]-im['bbox'][0]>500]
    assert len(imgs)==1
    box = imgs[0]['bbox']
    gap = (word[i].rect.width-box[2])*25.4/72
    assert 0<=gap<.03
    paint.append({'page':i+1,'bboxPt':list(box),'rightGapMm':gap,'oneSharedTransform':True})
(out/'word-r2-inspection.json').write_text(json.dumps({'sourceCommit':'560345bb39042da0c15909a78673a235740a1ac7','returnedDocxSha256':sha(returned),'wordPdfSha256':sha(word_pdf),'producer':word.metadata['producer'],'pages':4,'nativeControlIdsRetained':82,'intentionalEdits':changes,'allSavedTextInWordPdf':True,'interiorPaint':paint,'originalUnequalWidthDefect':'PASS for this normal returned file','latestContactAndAccentWordAcceptance':'UNVERIFIED'},indent=2)+'\n')

results = []
reference_letter = Image.open(prior/'rendered/page-2.png').convert('RGB')
for case in cases:
    folder = app/case
    model = json.loads((folder/'model.json').read_text())
    ev = json.loads((folder/'app-evidence.json').read_text())
    assert all(ev[k] for k in ['clickedAppExport','uiDownloadEqualsAppEntry','savedDocumentsUnchangedByExport','webSourceEqualsExportSource','neighborBodiesExceptContactIdentical'])
    pdf = fitz.open(folder/'rendered/candidate.pdf')
    assert len(pdf)==4
    expected = controls(folder/'candidate.docx')
    scopes = {'cover':norm(pdf[0].get_text()),'letter':norm(pdf[1].get_text()),'cv':norm(pdf[2].get_text()+pdf[3].get_text())}
    for key,value in expected.items():
        if value.strip(): assert norm(value) in scopes[key.split('.')[0]],(case,key,value)
    for page in pdf:
        assert abs(page.rect.width-595.2756)<.1 and abs(page.rect.height-841.8898)<.1
        assert all(page.rect.contains(fitz.Rect(w[:4])) for w in page.get_text('words'))
    letter = Image.open(folder/'rendered/page-2.png').convert('RGB')
    assert letter.size==reference_letter.size and ImageChops.difference(letter,reference_letter).getbbox() is None
    baseline_equal = None
    outside_badge_equal = None
    if (old_cases/case).exists():
        old = json.loads((old_cases/case/'model.json').read_text())
        assert [b for b in model['cover']['blocks'] if not b['id'].endswith('.badge-paint')]==[b for b in old['cover']['blocks'] if not b['id'].endswith('.badge-paint')]
        assert model['cover']['headerShapes']==old['cover']['headerShapes']
        assert sha(folder/'baseline.docx')==sha(old_cases/case/'baseline.docx')
        baseline_equal = True
        a = Image.open(old_cases/case/'web.png').convert('RGB')
        b = Image.open(folder/'web.png').convert('RGB')
        diff = ImageChops.difference(a,b).getbbox()
        bg = next((p for p in model['cover']['blocks'] if p['id'].endswith('.badge-paint')),None)
        if diff:
            assert bg is not None
            bounds = (math.floor(bg['xMm']*a.width/210)-3,math.floor(bg['yMm']*a.height/297)-3,math.ceil((bg['xMm']+bg['widthMm'])*a.width/210)+3,math.ceil((bg['yMm']+bg['heightMm'])*a.height/297)+3)
            assert bounds[0]<=diff[0] and bounds[1]<=diff[1] and bounds[2]>=diff[2] and bounds[3]>=diff[3],(case,bounds,diff)
        outside_badge_equal = True
    bg = next((p for p in model['cover']['blocks'] if p['id'].endswith('.badge-paint')),None)
    if bg and case not in ['badge-center','badge-right']:
        label = next(p for p in model['cover']['blocks'] if p['id']=='cover.kontaktTitel.frame')
        assert bg['opacity']==1 and bg['fill']['color']==label['paragraphs'][0]['runs'][0]['style']['color']=='F44664'
    photo_equal = None
    if case.startswith('photo-'):
        source = json.loads((folder/'snapshot.json').read_text())
        src = Image.open(io.BytesIO(base64.b64decode(source['cover']['data']['foto'].split(',')[1]))).convert('RGB')
        with zipfile.ZipFile(folder/'candidate.docx') as z:
            image = Image.open(io.BytesIO(z.read('word/media/image-1.png'))).convert('RGB')
        assert src.size==image.size and ImageChops.difference(src,image).getbbox() is None
        photo_equal = True
    results.append({'case':case,'pages':4,'nativeControls':len(expected),'allTextPresentInCorrectDossierPart':True,'allGlyphBoundsInsideA4':True,'letterWholePagePixelsUnchanged':True,'nonContactCanonicalCvBodyUnchanged':True,'defaultNextBytesUnchanged':baseline_equal,'webOutsideBadgeUnchanged':outside_badge_equal,'originalPhotoPixelsPreserved':photo_equal,'candidateSha256':sha(folder/'candidate.docx'),'wordAcceptance':'UNVERIFIED'})
    shutil.copyfile(folder/'app-evidence.json',out/f'{case}-app-evidence.json')
    if case in ['normal','scaled','long','contact-long']:
        shutil.copyfile(folder/'candidate.docx',out/f'modern-contact-accent-{case}.docx')
    pdf.close()
for case in ['normal','scaled','long','moved','photo-portrait','photo-circle','hidden']:
    assert sha(brief/case/'candidate.docx')==sha(golden/case/'candidate.docx'),case
for template in ['verlauf','neon','freundlich']:
    assert sha(other/template/'web.png')==sha(other_golden/template/'web.png'),template
for name in ['project','snapshot','metrics','model']:
    shutil.copyfile(app/'normal'/f'{name}.json',out/f'normal-{name}.json')
(out/'validation.json').write_text(json.dumps({'modernCases':results,'briefPackagesByteIdentical':7,'otherAuditedWebCoversByteIdentical':['verlauf','neon','freundlich'],'otherTemplatesEnabled':False},indent=2)+'\n')
pdf = Canvas(str(out/'contact-accent-a4-comparison.pdf'),pagesize=landscape(A4))
w,h = landscape(A4)
pw=min((w-68)/3,(h-80)*210/297); ph=pw*297/210; y=h-70-ph
for scope,index,file in [('cover',1,'web.png'),('CV contact',3,'web-cv.png')]:
    pdf.setFont('Helvetica-Bold',12);pdf.drawString(18,h-23,f'Modern {scope}: contact/accent candidate')
    pdf.setFont('Helvetica',8);pdf.drawString(18,h-38,'Native panels: LibreOffice. New Microsoft Word acceptance UNVERIFIED. Web CV is more compact overall.')
    for i,(label,path) in enumerate([('Actual saved Web',app/'normal'/file),('Previous DOCX',prior/f'rendered/page-{index}.png'),('New DOCX',app/'normal'/f'rendered/page-{index}.png')]):
        x=(w-3*pw-32)/2+i*(pw+16)
        pdf.setFont('Helvetica-Bold',9);pdf.drawString(x,y+ph+8,label)
        pdf.drawImage(ImageReader(str(path)),x,y,width=pw,height=ph)
    pdf.showPage()
pdf.save()
print(json.dumps({'modernCases':len(results),'nativeA4Pages':52,'briefByteIdentical':7,'wordR2Header':'PASS bounded normal','newWordAcceptance':'UNVERIFIED'}))
