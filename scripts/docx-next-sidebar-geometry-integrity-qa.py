"""Read-only supplemental identity/photo/page audit of the official gate artifacts."""
import hashlib
import importlib.util
import io
import json
import posixpath
import sys
from pathlib import Path
from xml.etree import ElementTree as E
from zipfile import ZipFile

import fitz
from PIL import Image

repo, folder, output = map(Path, sys.argv[1:])
sys.path.insert(0, str(repo / 'scripts'))
spec = importlib.util.spec_from_file_location('g', repo / 'scripts/docx-next-sidebar-save-geometry-qa.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
W = g.W
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
digest = lambda b: hashlib.sha256(b).hexdigest()


def photos(path, ids):
    records = []
    with ZipFile(path) as z:
        root = E.fromstring(z.read('word/document.xml'))
        parents = {child: parent for parent in root.iter() for child in parent}
        def table_ancestry(node):
            result = []
            while node in parents:
                node = parents[node]
                if node.tag == W + 'tbl':
                    inventory = g.history.ids(node)
                    result.append({'fieldCount': len(inventory),
                                   'orderedFieldInventorySha256': digest(json.dumps(inventory).encode())})
            return result
        rels = {r.get('Id'): posixpath.normpath(posixpath.join('word', r.get('Target')))
                for r in E.fromstring(z.read('word/_rels/document.xml.rels'))}
        for field in ids:
            controls = [s for s in root.iter(W + 'sdt')
                        if (t := s.find(W + 'sdtPr/' + W + 'tag')) is not None and t.get(W + 'val') == field]
            assert len(controls) == 1, 'Photo field identity missing or ambiguous'
            drawings = [d for d in root.iter() if d.tag in (WP + 'inline', WP + 'anchor')
                        and (n := d.find(WP + 'docPr')) is not None and n.get('name') == field]
            assert len(drawings) == 1, 'Explicit named photo drawing missing or ambiguous'
            pic = drawings[0]
            blips = list(pic.iter(A + 'blip'))
            assert len(blips) == 1, 'Explicit photo asset missing or ambiguous'
            blip = blips[0]
            asset = z.read(rels[blip.get(R + 'embed')])
            image = Image.open(io.BytesIO(asset)).convert('RGBA')
            crop = pic.find('.//' + A + 'srcRect')
            fill_rect = pic.find('.//' + A + 'fillRect')
            extent = pic.find(WP + 'extent')
            geom = pic.find('.//' + A + 'prstGeom')
            stroke = pic.find('.//' + A + 'ln')
            records.append({'fieldId': field, 'namedDrawingUnique': True,
                            'photoControlContainsDrawing': any(n.get('name') == field for n in controls[0].iter(WP + 'docPr')),
                            'photoControlTableAncestry': table_ancestry(controls[0]),
                            'namedDrawingTableAncestry': table_ancestry(pic),
                            'assetSha256': digest(asset),
                            'decodedRgbaSha256': digest(image.tobytes()), 'assetSizePx': list(image.size),
                            'srcRect': None if crop is None else dict(crop.attrib),
                            'fillRect': None if fill_rect is None else dict(fill_rect.attrib),
                            'extentEmu': {k: int(extent.get(k)) for k in ('cx', 'cy')},
                            'shape': None if geom is None else geom.get('prst'),
                            'strokeWidthEmu': 0 if stroke is None else int(stroke.get('w', '0'))})
    return records


geometry = json.loads((folder / 'app-save-geometry-report.json').read_text())
content = json.loads((folder / 'app-body-report.json').read_text())
assert geometry['collectionStatus'] == content['contentRoundtripAcceptance'] == 'pass'
assert json.loads((folder / 'manifest.json').read_text()) == g.app.NAMES
assert [c['fixture'] for c in geometry['cases']] == g.app.NAMES
assert [c['fixture'] for c in content['cases']] == g.app.NAMES
assert digest((folder / 'app-body-report.json').read_bytes()) == geometry['contentReportSha256']
rows = []
for case, cc in zip(geometry['cases'], content['cases']):
    assert [p['phase'] for p in case['phases']] == list(g.PHASES)
    assert [p['phase'] for p in cc['phases']] == list(g.PHASES)
    name = case['fixture']
    fixture = json.loads((folder / (name + '.json')).read_text())
    row = {'fixture': name, 'phases': []}
    source_fields = None
    for phase, attestation in zip(case['phases'], cc['phases']):
        suffix = '' if phase['phase'] == 'source' else '-' + phase['phase']
        docx = folder / (name + suffix + '.docx')
        assert digest(docx.read_bytes()) == phase['inputSha256']
        body, fields = g.app.package_controls(docx)
        if source_fields is None:
            source_fields = (body, fields)
        assert (body, fields) == source_fields and list(body) == list(source_fields[0])
        with ZipFile(docx) as z:
            root = E.fromstring(z.read('word/document.xml'))
        owner = g.canonical_table(root, case['canonicalOwnerFieldIds'])
        assert g.grid_record(owner) == phase['serializedRoot']
        sections = [{k: int(size.get(W + k)) for k in ('w', 'h')}
                    for size in root.iter(W + 'pgSz')]
        pdf = folder / (name + '-' + phase['phase'] + '.pdf')
        assert digest(pdf.read_bytes()) == phase['pdfSha256'] == attestation['pdfSha256']
        with fitz.open(pdf) as document:
            page_sizes = sorted(set((round(p.rect.width, 4), round(p.rect.height, 4)) for p in document))
            assert all(abs(w - 210 * 72 / 25.4) < .15 and abs(h - 297 * 72 / 25.4) < .15 for w, h in page_sizes)
        row['phases'].append({'phase': phase['phase'], 'bodyFields': len(body), 'allFields': len(fields),
                              'canonicalTableOwnerFields': len(case['canonicalOwnerFieldIds']),
                              'serializedA4SectionsTwips': sections, 'pdfPageSizesPt': page_sizes,
                              'pdfPages': attestation['pdfPages'], 'emptyCvPages': attestation['emptyCvPages'],
                              'photos': photos(docx, [p['id'] for p in fixture['pictures']]),
                              'visiblePhotoFrames': attestation['imageFrames']})
    row['coverLetterExactVisible'] = all(not ({1, 2} & set(c['changedWordPages'] + c['changedPixelPages']))
                                       for c in case['comparisons'])
    row['exactPictureXmlAcrossSaves'] = all(p['photos'] == row['phases'][0]['photos'] for p in row['phases'])
    row['samePhotoAssetAcrossSaves'] = all(
        [(p['assetSha256'], p['decodedRgbaSha256']) for p in state['photos']] ==
        [(p['assetSha256'], p['decodedRgbaSha256']) for p in row['phases'][0]['photos']]
        for state in row['phases'])
    row['namedPhotoAndControlTableAncestryStable'] = all(
        [(p['photoControlTableAncestry'], p['namedDrawingTableAncestry']) for p in state['photos']] ==
        [(p['photoControlTableAncestry'], p['namedDrawingTableAncestry']) for p in row['phases'][0]['photos']]
        for state in row['phases'])
    rows.append(row)
output.write_text(json.dumps({'scope': 'Supplemental read-only package/photo/page identity, not a replacement geometry gate',
                              'cases': rows}, indent=2) + '\n')
print(json.dumps({'cases': len(rows), 'photoCases': sum(bool(r['phases'][0]['photos']) for r in rows),
                  'samePhotoAssets': sum(bool(r['phases'][0]['photos']) and r['samePhotoAssetAcrossSaves'] for r in rows),
                  'exactPictureXml': sum(bool(r['phases'][0]['photos']) and r['exactPictureXmlAcrossSaves'] for r in rows),
                  'coverLetterExactVisible': sum(r['coverLetterExactVisible'] for r in rows)}))
