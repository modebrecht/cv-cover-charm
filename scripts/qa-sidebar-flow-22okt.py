"""Saved-App flow repair evidence. Fresh packages and Writer are not Word acceptance."""
import argparse, hashlib, importlib.util, json
from pathlib import Path
from zipfile import ZipFile
import fitz

spec = importlib.util.spec_from_file_location('inventory', Path(__file__).with_name('docx-next-sidebar-word-layout-qa.py'))
inv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inv)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('baseline', type=Path)
parser.add_argument('candidate', type=Path)
parser.add_argument('report', type=Path)
parser.add_argument('--viewscale-case', type=Path)
parser.add_argument('--stress-case', type=Path)
args = parser.parse_args()
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def compact(s): return ''.join(c for c in s if c.isalnum()).casefold()
def walk(v):
    if isinstance(v, dict):
        yield v
        for c in v.values(): yield from walk(c)
    elif isinstance(v, list):
        for c in v: yield from walk(c)
def date_row(table):
    return next(r for r in table["rows"] if any(c and c[0].get("id", "").endswith(".date") for c in r["cells"]))
def image_boxes(doc):
    return [[round(v*25.4/72, 5) for v in i['bbox']] for pg in list(doc)[2:] for i in pg.get_image_info() if abs((i['bbox'][2]-i['bbox'][0])*25.4/72-34) < .1]
def first_baseline(doc, text):
    for page, pg in enumerate(list(doc)[2:], 1):
        for b in pg.get_text('dict')['blocks']:
            for l in b.get('lines', []):
                spans = l['spans']
                if compact(''.join(s['text'] for s in spans)) == compact(text):
                    return {'cvPage': page, 'baselineMm': spans[0]['origin'][1]*25.4/72}
                for s in spans:
                    if compact(s['text']) == compact(text):
                        return {'cvPage': page, 'baselineMm': s['origin'][1]*25.4/72}
    return None
rows = []
for folder in sorted(args.candidate.glob('0*-*')):
    name = folder.name
    old = args.baseline/name
    bp, fp = [json.loads((p/'proof.json').read_text()) for p in [old, folder]]
    equal = {k: bp[k] == fp[k] for k in ['snapshot', 'metrics']}
    equal.update({p+'Model': bp['model'][p] == fp['model'][p] for p in ['cover', 'letter']})
    equal['WebScreenshots'] = all(digest(p) == digest(old/p.name) for p in folder.glob('Web-CV-*.png'))
    equal['coverAndLetterRenders'] = all(digest(folder/'native-render'/f'page-{i}.png') == digest(old/'native-render'/f'page-{i}.png') for i in [1, 2])
    assert all(equal.values()), (name, equal)
    bm = {p['id']: p for p in walk(bp['model']['cv']['blocks']) if p.get('kind') == 'paragraph'}
    fm = {p['id']: p for p in walk(fp['model']['cv']['blocks']) if p.get('kind') == 'paragraph'}
    assert bm.keys() == fm.keys()
    for key in bm:
        before, after = bm[key]['runs'], fm[key]['runs']
        assert len(before) == len(after)
        for a, b in zip(before, after):
            b = json.loads(json.dumps(b))
            b['style'].pop('kerning', None)
            assert a == b, (name, key)
    bi, fi = [inv.inventory(p/(name+'.docx')) for p in [old, folder]]
    assert all(bi[k] == fi[k] for k in ['fields', 'pictures', 'texts'])
    # Root grid and reference tracks stay authored. Date-cell boundaries move
    # into their existing gap; no content track moves to the right.
    bt = {b['id']: b for b in walk(bp['model']['cv']['blocks']) if b.get('kind') == 'table'}
    ft = {b['id']: b for b in walk(fp['model']['cv']['blocks']) if b.get('kind') == 'table'}
    assert bt['cv.sidebar']['columnWidthsMm'] == ft['cv.sidebar']['columnWidthsMm']
    for key in bt:
        if key.startswith('cv.section.referenzen.pair:'):
            assert bt[key]['columnWidthsMm'] == ft[key]['columnWidthsMm']
        if key.endswith('.dateRail'):
            a, b = bt[key], ft[key]
            old_x = a['columnWidthsMm'][0] + date_row(a)['cells'][1][0].get('indentMm', 0)
            new_x = b['columnWidthsMm'][0] + date_row(b)['cells'][1][0].get('indentMm', 0)
            assert abs(old_x-new_x) < 1e-9
    baseline, native = [fitz.open(p/'native-render'/(name+'.pdf')) for p in [old, folder]]
    app = fitz.open(folder/'App-Referenz.pdf')
    assert len(native) == len(app) == len(baseline)
    assert image_boxes(native) == image_boxes(baseline)
    visible = compact(''.join(pg.get_text() for pg in list(native)[2:]))
    assert all(compact(v) in visible for k, v in fi['fields'].items() if k.startswith('cv.'))
    if name.startswith('03'):
        pages = [pg.get_text() for pg in list(native)[2:]]
        owner = next(i for i, t in enumerate(pages) if 'Schulstation 12' in t)
        heading = first_baseline(native, 'PRAKTIKA & SCHNUPPERTAGE')
        first_entry = first_baseline(native, 'Schnupperlehre Informatik')
        assert heading and first_entry and heading['cvPage'] == first_entry['cvPage'], (heading, first_entry)
        tail = pages[owner].split('Schulstation 12', 1)[1]
        assert 'Schulhaus Zentrum, Hubersdorf' in tail and 'Schwerpunkt Mathematik und Informatik' in tail
    row = {'case': name, 'unchanged': equal, 'activeFields': len(fi['fields']), 'canonicalTextAndRunStylesPreserved': True,
           'allTextVisible': True, 'picturesAndCropsUnchanged': fi['pictures'], 'pictureBboxMm': image_boxes(native),
           'mainAndReferenceTracksUnchanged': True, 'dateContentStartUnchanged': True,
           'nativeCvPages': len(native)-2, 'appCvPages': len(app)-2,
           'baselineDocxSha256': digest(old/(name+'.docx')), 'candidateDocxSha256': digest(folder/(name+'.docx'))}
    if name.startswith('03'): row.update({'shortEntry12CvPage': owner+1, 'headingAndFirstEntrySamePage': True})
    if name.startswith('07'):
        assert first_baseline(native, '2023 – heute') is not None
        row['dateOnOneLine'] = True
    rows.append(row)
assert len(rows) == 4
report = {'wordAcceptance': 'UNVERIFIED', 'exactGeometryGate': 'NOT_RUN', 'cases': rows}
if args.viewscale_case:
    a = args.viewscale_case
    b = args.candidate/a.name
    ap, bp = [json.loads((p/'proof.json').read_text()) for p in [a, b]]
    checks = {k: ap[k] == bp[k] for k in ['snapshot', 'metrics', 'sidebarMetrics', 'model']}
    checks['docxByteEqual'] = (a/(a.name+'.docx')).read_bytes() == (b/(b.name+'.docx')).read_bytes()
    assert all(checks.values()), checks
    report['viewScaleComparison'] = checks
    old = fitz.open(args.baseline/a.name/'native-render'/(a.name+'.pdf'))
    native = fitz.open(b/'native-render'/(b.name+'.pdf'))
    baselines = []
    for field, web in ap.get('webFlowBaselines', {}).items():
        before, after = [first_baseline(doc, web['text']) for doc in [old, native]]
        assert before and after
        baselines.append({'field': field, 'webPreviewBaselineMm': web['baselineMm'], 'beforeMm': before['baselineMm'], 'afterMm': after['baselineMm'],
                          'beforeDeltaMm': before['baselineMm']-web['baselineMm'], 'afterDeltaMm': after['baselineMm']-web['baselineMm']})
    report['baselineComparison'] = {'method': 'Fresh physical preview baselines; display rounding is not exact Word geometry acceptance', 'fields': baselines}
if args.stress_case:
    folder = args.stress_case
    proof = json.loads((folder/'proof.json').read_text())
    entry = proof['snapshot']['cv']['data']['schule'][0]
    field = 'cv.entry.schule:'+entry['id']
    rail = next(b for b in walk(proof['model']['cv']['blocks']) if b.get('id') == field+'.dateRail')
    assert date_row(rail)['keepTogether'] is False
    doc = fitz.open(folder/'native-render'/(folder.name+'.pdf'))
    text = compact(''.join(pg.get_text() for pg in list(doc)[2:]))
    assert all(compact(line) in text for line in entry['beschreibung'].splitlines())
    root = inv.effective_tree(ZipFile(folder/(folder.name+'.docx')).read('word/document.xml'))
    sdts = root.xpath('.//w:sdt[w:sdtPr/w:tag/@w:val=$f]', f=field+'.description', namespaces=inv.NS)
    assert len(sdts) == 1
    tokens = sdts[0].xpath('.//w:t | .//w:br | .//w:tab', namespaces=inv.NS)
    actual = ''.join('\n' if n.tag == '{'+inv.W+'}br' else '\t' if n.tag == '{'+inv.W+'}tab' else n.text or '' for n in tokens)
    assert actual == entry['beschreibung']
    report['longEntry'] = {'nativeCvPages': len(doc)-2, 'sourceLines': len(entry['beschreibung'].splitlines()), 'allLinesVisible': True, 'completeSingleDescriptionControl': True, 'nativeRowKeepTogether': False, 'docxSha256': digest(folder/(folder.name+'.docx'))}
args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'verifiedCases': len(rows), 'longEntry': report.get('longEntry'), 'zoomStable': report.get('viewScaleComparison'), 'wordAcceptance': 'UNVERIFIED'}))
