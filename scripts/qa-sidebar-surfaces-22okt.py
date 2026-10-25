"""Compare saved-App paint repair without transferring Writer evidence to Word."""
import argparse, hashlib, importlib.util, json
from pathlib import Path
from zipfile import ZipFile
import fitz
from lxml import etree as ET

spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('docx-next-sidebar-word-layout-qa.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('baseline', type=Path)
parser.add_argument('candidate', type=Path)
parser.add_argument('report', type=Path)
parser.add_argument('--viewscale-case', type=Path)
args = parser.parse_args()
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def compact(s): return ''.join(c for c in s if c.isalnum()).casefold()
def old_metrics(m):
    m = json.loads(json.dumps(m))
    m.pop('surfaces', None)
    m['version'] = 1
    for f in m['fields'].values(): f.pop('listMarkerStyle', None)
    return m
def sample(page, x, y):
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    return list(pix.pixel(round(x / 210 * pix.width), round(y / 297 * pix.height)))
def pictures(doc):
    return [[round(v * 25.4 / 72, 5) for v in i['bbox']] for pg in list(doc)[2:] for i in pg.get_image_info() if abs((i['bbox'][2] - i['bbox'][0]) * 25.4 / 72 - 34) < .1]
rows = []
for folder in sorted(args.candidate.glob('0*-*')):
    name = folder.name
    old = args.baseline / name
    bp, fp = [json.loads((p/'proof.json').read_text()) for p in [old, folder]]
    checks = {k: bp[k] == fp[k] for k in ['snapshot', 'metrics']}
    checks['originalTextMetrics'] = old_metrics(bp['sidebarMetrics']) == old_metrics(fp['sidebarMetrics'])
    checks.update({p+'Model': bp['model'][p] == fp['model'][p] for p in ['cover', 'letter']})
    checks['WebScreenshots'] = all(digest(p) == digest(old/p.name) for p in folder.glob('Web-CV-*.png'))
    checks['coverAndLetterRenders'] = all(digest(folder/'native-render'/f'page-{i}.png') == digest(old/'native-render'/f'page-{i}.png') for i in [1, 2])
    assert all(checks.values()), (name, checks)
    bi, fi = [inv.inventory(p/(name+'.docx')) for p in [old, folder]]
    assert all(bi[k] == fi[k] for k in ['fields', 'pictures', 'texts', 'grids'])
    baseline, native = [fitz.open(p/'native-render'/(name+'.pdf')) for p in [old, folder]]
    app = fitz.open(folder/'App-Referenz.pdf')
    assert len(native) == len(app) == len(baseline)
    assert pictures(native) == pictures(baseline)
    text = compact(''.join(p.get_text() for p in list(native)[2:]))
    missing = [k for k, v in fi['fields'].items() if k.startswith('cv.') and compact(v) not in text]
    assert not missing, missing
    rail_x = 5 if fp['snapshot']['settings']['sidebarSide'] == 'left' else 208
    samples = []
    for i in range(2, len(native)):
        for y in [10, 60, 180, 280]:
            a, b = sample(app[i], rail_x, y), sample(native[i], rail_x, y)
            assert max(abs(x-y) for x, y in zip(a, b)) <= 1, (name, i, y, a, b)
            samples.append({'cvPage': i-1, 'xMm': rail_x, 'yMm': y, 'appRgb': a, 'nativeRgb': b})
    markers = [s['color'] for pg in list(native)[2:] for b in pg.get_text('dict')['blocks'] for l in b.get('lines', []) for s in l['spans'] if s['text'] == '•']
    assert len(markers) == 3 and set(markers) == {int('244A61', 16)}, markers
    z = ZipFile(folder/(name+'.docx'))
    ns = {**inv.NS, 'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
    backgrounds = []
    for story in ['word/cv-header.xml', 'word/cv-header-first.xml']:
        root = ET.fromstring(z.read(story))
        anchors = root.xpath('.//wp:anchor[starts-with(wp:docPr/@name,"cv.page-paint.")]', namespaces=ns)
        assert len(anchors) == 1 and anchors[0].get('relativeHeight') == '0'
        backgrounds.append({'story': story, 'zOrder': 0})
    if name.startswith('03'):
        assert 'Schulstation 12' not in native[2].get_text() and 'Schulstation 12' in native[3].get_text()
    rows.append({'case': name, 'unchanged': checks, 'activeFields': len(fi['fields']), 'allCanonicalTextVisible': True,
                 'picturesAndCropsUnchanged': fi['pictures'], 'pictureBboxMm': pictures(native), 'railSamples': samples,
                 'nativeMarkerColors': markers, 'backgroundAnchors': backgrounds, 'nativeCvPages': len(native)-2,
                 'appCvPages': len(app)-2, 'baselineDocxSha256': digest(old/(name+'.docx')), 'candidateDocxSha256': digest(folder/(name+'.docx'))})
assert len(rows) == 4
report = {'wordAcceptance': 'UNVERIFIED', 'verticalTextFidelity': 'OPEN; original typography and flow retained', 'cases': rows}
if args.viewscale_case:
    a = args.viewscale_case
    b = args.candidate/a.name
    ap, bp = [json.loads((p/'proof.json').read_text()) for p in [a, b]]
    checks = {k: ap[k] == bp[k] for k in ['snapshot', 'metrics', 'sidebarMetrics', 'model']}
    checks['docxByteEqual'] = (a/(a.name+'.docx')).read_bytes() == (b/(b.name+'.docx')).read_bytes()
    assert all(checks.values()), checks
    report['viewScaleComparison'] = checks
args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'verifiedCases': len(rows), 'viewScaleComparison': report.get('viewScaleComparison'), 'wordAcceptance': 'UNVERIFIED'}))
