"""Read-only dossier inventory; semantic survival never implies pixel/Word acceptance."""
import argparse
import hashlib
import io
import json
import posixpath
from pathlib import Path
from zipfile import ZipFile

from lxml import etree as ET
from PIL import Image

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
NS = {'w': W, 'mc': MC, 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'v': 'urn:schemas-microsoft-com:vml', 'r': R}
CAPABILITIES = {'http://schemas.microsoft.com/office/word/2010/wordprocessingShape',
                'http://schemas.microsoft.com/office/word/2010/wordprocessingGroup',
                'http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing',
                'http://schemas.microsoft.com/office/word/2010/wordml'}


def effective_tree(data):
    """Select one supported MC representation; fallback copies are not active controls."""
    root = ET.fromstring(data)
    while True:
        alternatives = root.xpath('.//mc:AlternateContent', namespaces=NS)
        if not alternatives:
            return root
        alternate = alternatives[0]
        selected = None
        for choice in alternate.findall('{'+MC+'}Choice'):
            required = choice.get('Requires', '').split()
            if required and all(choice.nsmap.get(prefix) in CAPABILITIES for prefix in required):
                selected = choice
                break
        if selected is None:
            selected = alternate.find('{'+MC+'}Fallback')
        assert selected is not None, 'No supported markup-compatibility representation'
        parent = alternate.getparent()
        index = parent.index(alternate)
        for child in list(selected):
            parent.insert(index, child)
            index += 1
        parent.remove(alternate)


def control_fields(root):
    fields = {}
    for control in root.xpath('.//w:sdt', namespaces=NS):
        tag = control.find('w:sdtPr/w:tag', NS)
        if tag is None:
            continue
        field = tag.get('{'+W+'}val')
        assert field not in fields, f'Duplicate active field {field}'
        fields[field] = ''.join(control.xpath('.//w:t/text()', namespaces=NS))
    return fields


def inventory(path):
    fields, texts, pictures, grids = {}, [], {}, []
    with ZipFile(path) as archive:
        assert archive.testzip() is None, 'Corrupt package'
        for story in sorted(archive.namelist()):
            if not story.startswith('word/') or not story.endswith('.xml'):
                continue
            root = effective_tree(archive.read(story))
            if root.tag not in ['{'+W+'}'+name for name in ['document', 'hdr', 'ftr']]:
                continue
            owned = control_fields(root)
            assert not set(fields).intersection(owned), 'Duplicate active field across stories'
            fields.update(owned)
            text = ''.join(root.xpath('.//w:t/text()', namespaces=NS))
            if text:
                texts.append(text)
            grids.extend([[int(c.get('{'+W+'}w')) for c in grid] for grid in root.findall('.//w:tblGrid', NS)])
            relpath = posixpath.join(posixpath.dirname(story), '_rels', posixpath.basename(story)+'.rels')
            rels = {} if relpath not in archive.namelist() else {
                n.get('Id'): n.get('Target') for n in ET.fromstring(archive.read(relpath))
                if n.get('TargetMode') != 'External'}
            for control in root.xpath('.//w:sdt[w:sdtPr/w:tag/@w:val="cv.person.photo"]', namespaces=NS):
                dml = control.xpath('.//a:blip/@r:embed', namespaces=NS)
                vml = control.xpath('.//v:fill/@r:id | .//v:imagedata/@r:id', namespaces=NS)
                targets = dml + vml
                assert len(targets) <= 1, 'Ambiguous picture owner'
                if not targets:
                    pictures['cv.person.photo'] = None
                    continue
                target = rels[targets[0]]
                media = target.lstrip('/') if target.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(story), target))
                with Image.open(io.BytesIO(archive.read(media))) as im:
                    rgba = im.convert('RGBA')
                    crop = control.find('.//a:srcRect', NS)
                    pictures['cv.person.photo'] = {
                        'representation': 'DrawingML' if dml else 'VML',
                        'width': rgba.width, 'height': rgba.height,
                        'embeddedFileSha256': hashlib.sha256(archive.read(media)).hexdigest(),
                        'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest(),
                        'crop': None if crop is None else dict(crop.attrib),
                    }
    return {'fields': fields, 'texts': sorted(texts), 'pictures': pictures, 'grids': grids}


def compare(source, saved):
    before, after = inventory(source), inventory(saved)
    photos = {}
    for field, photo in before['pictures'].items():
        restored = after['pictures'].get(field)
        photos[field] = {
            'pictureControlContainsImage': bool(restored),
            'originalDrawingMLPreserved': bool(restored and restored['representation'] == 'DrawingML'),
            'originalPixelsPreserved': bool(restored and all(photo[k] == restored[k] for k in ['width', 'height', 'rgbaSha256'])),
            'exactCropMarkupPreserved': bool(restored and photo['crop'] == restored['crop']),
            'source': photo, 'saved': restored,
        }
    return {'sourceFields': len(before['fields']), 'savedFields': len(after['fields']),
            'fieldIdsAndTextPreserved': before['fields'] == after['fields'],
            'completeTextPreserved': before['texts'] == after['texts'],
            'exactGridsPreserved': before['grids'] == after['grids'], 'pictures': photos}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('save1', type=Path)
    parser.add_argument('save2', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--require-pixels', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((args.source/'packet-manifest.json').read_text())
    cases = []
    for case in manifest['fixtures']:
        source = args.source/case['filename']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case['docxSha256']
        initial = inventory(source)['pictures']
        assert set(initial) == ({'cv.person.photo'} if case['photo'] else set()), 'Source picture owner missing'
        assert all(p and p['representation'] == 'DrawingML' and
                   p['embeddedFileSha256'] == manifest['photoSha256'] for p in initial.values()), 'Source did not retain the complete original image'
        cases.append({'file': case['filename'], 'phases': {
            name: compare(source, directory/case['filename'])
            for name, directory in [('save1', args.save1), ('save2', args.save2)]}})
    rows = [phase for case in cases for phase in case['phases'].values()]
    semantic = all(r['fieldIdsAndTextPreserved'] and r['completeTextPreserved'] and
                   all(p['pictureControlContainsImage'] for p in r['pictures'].values()) for r in rows)
    pixels = all(p['originalPixelsPreserved'] for r in rows for p in r['pictures'].values())
    report = {'runtime': 'LibreOfficeDev 26.8.0.0.alpha0', 'wordAcceptance': 'UNVERIFIED',
              'semanticSurvival': 'PASS' if semantic else 'FAIL',
              'originalPixelGate': 'PASS' if pixels else 'FAIL',
              'cases': cases, 'manifest': manifest}
    args.report.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({k: report[k] for k in ['semanticSurvival', 'originalPixelGate', 'wordAcceptance']}))
    assert semantic, 'Native field or picture ownership did not survive'
    if args.require_pixels:
        assert pixels, 'Original picture pixels did not survive'


if __name__ == '__main__':
    main()
