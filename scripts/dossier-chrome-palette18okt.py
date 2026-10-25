"""Package the shared palette gate: COHORT MODERN_APP RENDER NEGATIVES CONTACT_APP OUT PREVIOUS_RENDER."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
from zipfile import ZipFile

import fitz
from lxml import etree
from PIL import Image, ImageChops

cohort, app, render, negatives, contacts, out, previous = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
read = lambda p: json.loads(p.read_text())
def write(p, value):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
def copy(a, b):
    b.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(a, b)

results = read(cohort / 'results.json')
assert len(results) == 30 and all(r['status'] == 'PASS' for r in results)
assert len({(r['template'], r['kind']) for r in results}) == 30
pdf_results = []
for row in results:
    source = cohort / f'{row["template"]}-{row["kind"]}'
    capture = read(source / 'capture.json')
    snapshot = capture['snapshot']
    assert capture['immutable'] and capture['unchangedStorage']
    assert snapshot['settings']['chrome']['sync'] == (row['kind'] != 'separate')
    for scope in ['letter', 'cv']:
        palette = capture['resolved'][scope]['options']['resolvedPalette']
        authority = 'letter' if row['kind'] != 'separate' else scope
        assert palette['colors'] == snapshot[authority]['design']['colors']
        assert palette['template'] == snapshot[authority]['design']['template']
        assert all(p['footer']['opacity'] == 1 for p in capture['paints'][scope])
    folder = out / 'cohort' / source.name
    copy(source / 'project.json', folder / 'project.json')
    write(folder / 'proof.json', {k: capture[k] for k in ['resolved', 'paints', 'immutable', 'unchangedStorage']})
    if row['kind'] == 'compact':
        write(folder / 'capture.json', capture)
        for scope in ['letter', 'cv']:
            for side in ['first', 'continuation']:
                copy(source / f'{scope}-{side}.png', folder / f'{scope}-{side}.png')
        pdf = fitz.open(source / 'primary.pdf')
        assert pdf.metadata['producer'].startswith('jsPDF')
        count = len(capture['paints']['letter'])
        assert len(pdf) == 1 + count + len(capture['paints']['cv'])
        samples = {}
        for name, index in [('letter-first', 1), ('letter-continuation', 2), ('cv-first', 1+count), ('cv-continuation', 2+count)]:
            pix = pdf[index].get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
            samples[name] = {'header': list(pix.pixel(pix.width//2, 5)), 'footer': list(pix.pixel(pix.width//2, pix.height-5))}
        for v in samples.values():
            for surface in ['header', 'footer']:
                assert max(abs(a-b) for a,b in zip(v[surface], samples['letter-first'][surface])) <= 2
        if row['template'] == 'modern':
            for sample in samples.values():
                for rgb in sample.values():
                    assert max(abs(a-b) for a,b in zip(rgb, [17,24,39])) <= 2
        pdf_results.append({'template': row['template'], 'pages': len(pdf), 'samples': samples, 'actualAppPdf': True})
        copy(source/'primary.pdf', folder/'primary.pdf')

ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
old = Path('docs/qa/docx-next-shared-settings-18okt/07-Modern-Gemeinsame-Abstaende.docx')
new = app/'candidate.docx'
with ZipFile(old) as a, ZipFile(new) as b:
    assert set(a.namelist()) == set(b.namelist())
    changed = [n for n in a.namelist() if a.read(n) != b.read(n)]
    assert set(changed) == {'word/media/decoration-4.png', 'word/media/decoration-12.png'}
    assert a.read('word/document.xml') == b.read('word/document.xml')
    tags = lambda p: [v for name in p.namelist() if name.endswith('.xml') for v in etree.fromstring(p.read(name)).xpath('//w:sdtPr/w:tag/@w:val', namespaces=ns)]
    assert tags(a) == tags(b)
    controls = len(tags(a))
    media = [n for n in a.namelist() if n.startswith('word/media/')]
    retained_media = [n for n in media if a.read(n) == b.read(n)]

pdf = fitz.open(render/'candidate.pdf')
assert len(pdf) == 4
pixel_parity = []
for index, page in enumerate(pdf, 1):
    assert abs(page.rect.width - 210*72/25.4) < .1 and abs(page.rect.height - 297*72/25.4) < .1
    assert all(page.rect.contains(fitz.Rect(w[:4])) for w in page.get_text('words'))
    a,b = [Image.open(root/f'page-{index}.png').convert('RGB') for root in [previous, render]]
    assert a.size == b.size
    box = (0,0,a.width,a.height) if index == 1 else (0,round(6*a.height/297),a.width,round(291*a.height/297))
    assert ImageChops.difference(a.crop(box),b.crop(box)).getbbox() is None
    pixel_parity.append({'page': index, 'bodyPixelIdentical': True})
    pix = page.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    if index > 1:
        for rgb in [pix.pixel(pix.width//2,5),pix.pixel(pix.width//2,pix.height-5)]:
            assert max(abs(a-b) for a,b in zip(rgb,[17,24,39])) <= 2

def walk(blocks):
    for block in blocks:
        yield block
        if block.get('heading'):
            yield block['heading']
        yield from walk(block.get('blocks', []))
pills = []
for block in walk(read(app/'model.json')['cv']['blocks']):
    surface = block.get('flowSurface')
    if not surface:
        continue
    label = ''.join(run['text'].upper() if run['style'].get('allCaps') else run['text'] for run in block['runs'])
    for index in [2,3]:
        hits = pdf[index].search_for(label)
        if not hits:
            continue
        text = hits[0]
        images = [im for im in pdf[index].get_image_info() if abs(im['bbox'][3]-im['bbox'][1]-surface['heightMm']*72/25.4) < .3 and abs(im['bbox'][2]-im['bbox'][0]-surface['rowWidthMm']*72/25.4) < 2]
        paint = fitz.Rect(min(images, key=lambda im:abs(im['bbox'][1]-text.y0))['bbox'])
        assert paint.y0-.1 <= text.y0 and text.y1 <= paint.y1+.1
        pills.append({'label':label,'page':index+1,'contained':True})
assert len(pills) == 7
rejections = read(negatives/'rejections.json')
assert len(rejections) == 8 and all(r.get('downloads',0) == 0 for r in rejections)
contact_results = read(contacts/'app-results.json')
assert len(contact_results) == 2
for row in contact_results:
    assert row['uiDownloadEqualsAppEntry'] and row['savedDocumentsUnchangedByExport'] and not row['pageErrors']
    source = contacts/row['name']
    for name in ['snapshot.json','interior-metrics.json','app-evidence.json']:
        copy(source/name,out/'contact-app'/row['name']/name)
    headers = read(source/'interior-metrics.json')['headers']
    assert headers['letter']['first']['background'] == headers['cv']['first']['background']
    assert headers['letter']['first']['footer']['opacity'] == 1

copy(new, out/'08-Modern-Gemeinsame-Farben.docx')
for name in ['snapshot.json','metrics.json','model.json','project.json','app-evidence.json','interior-metrics.json']:
    copy(app/name,out/'modern-app'/name)
write(out/'browser-results.json',results)
write(out/'primary-pdf-proof.json',pdf_results)
write(out/'rejections.json',rejections)
validation = {'status':'PARTIAL: palette engineering PASS; full fidelity and Word acceptance pending', 'browserCases':30,'templateFamilies':5,'actualPrimaryPdfs':5,'actualNativeAppDownloads':3,'nativeCandidatePages':4,'controlsRetained':controls,'originalMediaCount':len(media),'unchangedMediaCount':len(retained_media),'changedPackageEntries':changed,'nativeDocumentXmlIdenticalTo07':True,'bodyPixelParity':pixel_parity,'pillContainment':pills,'rejections':8,'all39Accepted':False,'wordVisualEditingSaveReopen':'UNVERIFIED','defaultExportChanged':False,'nativeCandidateSha256':hashlib.sha256(new.read_bytes()).hexdigest()}
write(out/'validation.json',validation)
write(out/'sha256.json',{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'sha256.json'})
print(json.dumps(validation,indent=2))
