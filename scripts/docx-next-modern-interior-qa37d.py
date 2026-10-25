"""Read-only validation of app downloads; copy bounded candidates and A4 evidence.

Arguments: grouped app, preceding Modern app, interior app, reviewed regression,
Brief app, Brief golden, user screenshot, output. No package XML repairs.
"""
import hashlib
import json
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

grouped, prior, interior, reviewed, brief, brief_golden, screenshot, out = map(Path, sys.argv[1:9])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
norm = lambda s: re.sub(r'\s+', '', unicodedata.normalize('NFKC', s).casefold()).replace('–', '-').replace('—', '-')
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'wps': 'http://schemas.microsoft.com/office/word/2010/wordprocessingShape', 'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}

def load(path):
    return json.loads(path.read_text())

def controls(path, stories=False):
    result = {}
    with zipfile.ZipFile(path) as z:
        for name in z.namelist():
            if name != 'word/document.xml' and not (stories and re.match(r'word/(?:letter|cv)-(?:header|footer).*\.xml$', name)):
                continue
            root = ET.fromstring(z.read(name))
            for s in root.findall('.//w:sdt', ns):
                t = s.find('w:sdtPr/w:tag', ns)
                if t is not None:
                    key = t.get(f'{{{ns["w"]}}}val')
                    assert key not in result, (path, key)
                    result[key] = ''.join(x.text or '' for x in s.findall('.//w:t', ns))
    return result

def spans(page, exclude=''):
    return sorted((s['text'], s['font'], s['size'], tuple(round(x, 4) for x in s['bbox']))
                  for b in page.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans']
                  if not exclude or exclude not in s['text'])

group_results = []
for folder in sorted(p for p in grouped.iterdir() if (p/'candidate.docx').exists()):
    case = folder.name
    ev, model, old = load(folder/'app-evidence.json'), load(folder/'model.json'), load(prior/case/'model.json')
    assert all(ev[k] for k in ['clickedAppExport', 'uiDownloadEqualsAppEntry', 'savedDocumentsUnchangedByExport', 'webSourceEqualsExportSource'])
    assert model['letter'] == old['letter'] and model['cv'] == old['cv']
    before, after = controls(prior/case/'candidate.docx'), controls(folder/'candidate.docx')
    assert before == after
    pdf = fitz.open(folder/'rendered/candidate.pdf')
    old_pdf = fitz.open(prior/case/'rendered/candidate.pdf')
    assert len(pdf) == 4
    scopes = {'cover': norm(pdf[0].get_text()), 'letter': norm(pdf[1].get_text()), 'cv': norm(pdf[2].get_text()+pdf[3].get_text())}
    for key, value in after.items():
        if value.strip(): assert norm(value) in scopes[key.split('.')[0]], (case, key)
    for page in pdf:
        assert abs(page.rect.width - 595.2756) < .1 and abs(page.rect.height - 841.8898) < .1
        assert all(page.rect.contains(fitz.Rect(w[:4])) for w in page.get_text('words'))
    assert spans(pdf[0], 'Lehrbeginn') == spans(old_pdf[0], 'Lehrbeginn')
    for page in [2, 3, 4]:
        a, b = (Image.open(p/f'rendered/page-{page}.png').convert('RGB') for p in [folder, prior/case])
        assert a.size == b.size and ImageChops.difference(a, b).getbbox() is None, (case, page)
    for name in ['web.png', 'web-letter.png', 'web-cv.png', 'baseline.docx']:
        assert sha(folder/name) == sha(prior/case/name), (case, name)
    surfaces = [b for b in model['cover']['blocks'] if b.get('surface')]
    with zipfile.ZipFile(folder/'candidate.docx') as z:
        root = ET.fromstring(z.read('word/document.xml'))
        shapes = root.findall('.//wps:wsp', ns)
        assert len(shapes) == len(surfaces) == (0 if case == 'hidden' else 1)
        if shapes:
            tags = shapes[0].findall('.//w:tag', ns)
            assert [t.get(f'{{{ns["w"]}}}val') for t in tags] == ['cover.lehrbeginn']
            assert 'cover.lehrbeginn.badge-paint' not in z.read('word/document.xml').decode()
    if surfaces:
        f = surfaces[0]
        rect = fitz.Rect(f['xMm'], f['yMm'], f['xMm']+f['widthMm'], f['yMm']+f['surface']['heightMm'])
        rect = fitz.Rect([v*72/25.4 for v in rect])
        for b in pdf[0].get_text('dict')['blocks']:
            for l in b.get('lines', []):
                for s in l['spans']:
                    if 'Lehrbeginn' in s['text']: assert rect.contains(fitz.Rect(s['bbox'])), (case, s)
    group_results.append({'case': case, 'pages': len(pdf), 'nativeControls': len(after), 'nativeTextAndPaintOwners': len(surfaces), 'allTextPresent': True, 'glyphBoundsInsideA4': True, 'nonBadgeCoverGlyphRecordsUnchanged': True, 'neighborWholePageRastersIdentical': 3, 'webCapturesByteIdentical': 3, 'ordinaryNextBytesUnchanged': True, 'candidateSha256': sha(folder/'candidate.docx'), 'wordDragEditingReopen': 'UNVERIFIED'})
    shutil.copyfile(folder/'app-evidence.json', out/f'{case}-grouped-app-evidence.json')
    if case in ['normal', 'scaled', 'long', 'badge-center']:
        shutil.copyfile(folder/'candidate.docx', out/f'modern-grouped-pill-{case}.docx')
    pdf.close(); old_pdf.close()

assert len(group_results) == 13
for case in ['normal', 'scaled', 'long']:
    assert sha(reviewed/case/'candidate.docx') == sha(prior/case/'candidate.docx')
for case in ['normal', 'scaled', 'long', 'moved', 'photo-portrait', 'photo-circle', 'hidden']:
    assert sha(brief/case/'candidate.docx') == sha(brief_golden/case/'candidate.docx')

audit_results = []
for case in ['header-inline', 'header-stacked', 'header-inline-pipe', 'header-reduced', 'cv-pills', 'cv-pills-offset']:
    folder = interior/case
    model, ev = load(folder/'model.json'), load(folder/'app-evidence.json')
    assert ev['clickedAppExport'] and ev['uiDownloadEqualsAppEntry'] and ev['savedDocumentsUnchangedByExport']
    pdf = fitz.open(folder/'rendered/candidate.pdf')
    full_text = norm(''.join(p.get_text() for p in pdf))
    expected = controls(folder/'candidate.docx', stories=True)
    for key, value in expected.items():
        if value.strip(): assert norm(value) in full_text, (case, key, value)
    row = {'case': case, 'nativePages': len(pdf), 'allPackageControlTextInPdf': True, 'candidateSha256': sha(folder/'candidate.docx'), 'fidelity': 'FAIL supplementary; not accepted', 'wordAcceptance': 'UNVERIFIED'}
    for part in ['letter', 'cv']:
        geometry = load(folder/f'web-{part}-interior-geometry.json')
        row[f'{part}ActualWebPages'] = len(geometry)
        row[f'{part}NativeHeaderParagraphs'] = len(model[part]['header'])
        row[f'{part}NativeTopMarginMm'] = model[part]['page']['margins']['top']
        row[f'{part}NativeHeaderAlignment'] = [p['align'] for p in model[part]['header']]
        row[f'{part}NativeHeaderFields'] = [r.get('fieldId') for p in model[part]['header'] for r in p['runs'] if r.get('fieldId')]
        row[f'{part}NativeHeaderHasSurface'] = any(a['id'].endswith('.artwork.header') for a in model[part]['artwork'])
        shutil.copyfile(folder/f'web-{part}-interior-geometry.json', out/f'{case}-{part}-web-geometry.json')
    for name in ['project', 'snapshot', 'model']:
        shutil.copyfile(folder/f'{name}.json', out/f'{case}-{name}.json')
    shutil.copyfile(folder/'app-evidence.json', out/f'{case}-audit-app-evidence.json')
    if case in ['header-inline', 'header-stacked', 'cv-pills']:
        shutil.copyfile(folder/'candidate.docx', out/f'DIAGNOSTIC-NOT-ACCEPTED-{case}.docx')
    audit_results.append(row)
    pdf.close()

for name in ['project', 'snapshot', 'metrics', 'model']:
    shutil.copyfile(grouped/'normal'/f'{name}.json', out/f'normal-{name}.json')
(out/'validation.json').write_text(json.dumps({'groupedBadgeCases': group_results, 'interiorAuditCases': audit_results, 'briefByteIdentical': 7, 'reviewedModernUiDownloadsByteIdentical': 3, 'newGroupedWordAcceptance': 'UNVERIFIED'}, indent=2)+'\n')
(out/'user-visual-feedback.json').write_text(json.dumps({'screenshotSha256': sha(screenshot), 'userReport': 'ohja sieht heftig gut aus danke', 'scope': 'User-reported visual approval of preceding Modern cover; cropped screenshot inspected', 'notProven': ['new native-shape candidate', 'all stress cases', 'dragging', 'text editing', 'close/reopen', 'new Word-generated PDF'], 'attachmentRepublished': False}, indent=2)+'\n')

canvas = Canvas(str(out/'grouped-pill-and-interior-a4-comparison.pdf'), pagesize=landscape(A4))
w, h = landscape(A4)
def panels(title, note, items):
    canvas.setFont('Helvetica-Bold', 12); canvas.drawString(18, h-23, title)
    canvas.setFont('Helvetica', 8); canvas.drawString(18, h-38, note)
    pw = min((w-48-16*(len(items)-1))/len(items), (h-85)*210/297)
    ph = pw*297/210; x0 = (w-len(items)*pw-(len(items)-1)*16)/2; y = h-70-ph
    for i, (label, path) in enumerate(items):
        x = x0+i*(pw+16); canvas.setFont('Helvetica-Bold', 9); canvas.drawString(x, y+ph+8, label)
        canvas.drawImage(ImageReader(str(path)), x, y, width=pw, height=ph)
    canvas.showPage()

panels('Modern: one native owner for pill and editable text', 'Native panels: LibreOffice supplementary. Word dragging/editing/Save-Reopen UNVERIFIED.', [('Saved Web', grouped/'normal/web.png'), ('Preceding reviewed DOCX', prior/'normal/rendered/page-1.png'), ('New native text shape', grouped/'normal/rendered/page-1.png')])
for case in ['header-inline', 'header-stacked', 'header-inline-pipe', 'header-reduced', 'cv-pills', 'cv-pills-offset']:
    folder = interior/case
    part = 'letter' if case in ['header-inline', 'header-stacked', 'header-inline-pipe'] else 'cv'
    web_page = 2 if case == 'header-reduced' else 1
    native_page = 2 if part == 'letter' else 4 if case == 'header-reduced' else 3
    panels('Modern interior audit: '+case, 'FAIL fidelity: diagnostic output only. Native panel is LibreOffice, not Microsoft Word.', [('Actual saved Web', folder/f'web-{part}-page-{web_page}.png'), ('Existing native composition - not accepted', folder/f'rendered/page-{native_page}.png')])
canvas.save()
print(json.dumps({'groupedAppCases': len(group_results), 'groupedNativePages': sum(r['pages'] for r in group_results), 'interiorAppCases': len(audit_results), 'interiorFidelity': 'FAIL 6/6 supplementary', 'wordAcceptance': 'UNVERIFIED'}))
