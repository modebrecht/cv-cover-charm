"""Read-only ownership gate; original pixels/crop remain separate, explicit results."""
import argparse
import hashlib
import io
import json
import posixpath
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from PIL import Image

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'


def inventory(path):
    fields, pictures, texts, grids, drawings = {}, {}, [], [], {}
    with ZipFile(path) as archive:
        assert archive.testzip() is None, 'Corrupt ZIP'
        for story in sorted(archive.namelist()):
            if not story.startswith('word/') or not story.endswith('.xml'):
                continue
            root = ET.fromstring(archive.read(story))
            if root.tag not in [W + 'document', W + 'hdr', W + 'ftr']:
                continue
            text = ''.join(node.text or '' for node in root.iter(W + 't'))
            # Writer adds inactive empty header/footer parts; they contain no authored text.
            if text:
                texts.append(text)
            grids.extend([[int(node.get(W + 'w')) for node in grid] for grid in root.iter(W + 'tblGrid')])
            for drawing in root.iter(W + 'drawing'):
                properties = drawing.find('.//' + WP + 'docPr')
                if properties is not None:
                    name = properties.get('name')
                    drawings[name] = drawings.get(name, 0) + 1
            relpath = posixpath.join(posixpath.dirname(story), '_rels', posixpath.basename(story) + '.rels')
            relationships = {} if relpath not in archive.namelist() else {
                node.get('Id'): node.get('Target') for node in ET.fromstring(archive.read(relpath)).iter(PR + 'Relationship')
                if node.get('TargetMode') != 'External'
            }
            for control in root.iter(W + 'sdt'):
                tag = control.find(W + 'sdtPr/' + W + 'tag')
                if tag is None:
                    continue
                field = tag.get(W + 'val')
                assert field not in fields, f'Duplicate field {field}'
                fields[field] = ''.join(node.text or '' for node in control.iter(W + 't'))
                for drawing in control.iter(W + 'drawing'):
                    properties = drawing.find('.//' + WP + 'docPr')
                    blip = drawing.find('.//' + A + 'blip')
                    if properties is None or properties.get('name') != field or blip is None:
                        continue
                    assert field not in pictures, f'Ambiguous owned drawing {field}'
                    target = relationships[blip.get(R + 'embed')]
                    media = posixpath.normpath(posixpath.join(posixpath.dirname(story), target)) if not target.startswith('/') else target.lstrip('/')
                    with Image.open(io.BytesIO(archive.read(media))) as picture:
                        rgba = picture.convert('RGBA')
                        crop = drawing.find('.//' + A + 'srcRect')
                        pictures[field] = {
                            'width': rgba.width, 'height': rgba.height,
                            'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest(),
                            'srcRect': None if crop is None else dict(crop.attrib),
                        }
    return {'fields': fields, 'ownedPictures': pictures, 'texts': sorted(texts), 'grids': grids, 'drawingCounts': drawings}


def compare(source, saved):
    before, after = inventory(source), inventory(saved)
    photos = {}
    for field, picture in before['ownedPictures'].items():
        restored = after['ownedPictures'].get(field)
        photos[field] = {
            'ownsDrawing': restored is not None and after['drawingCounts'].get(field) == 1,
            'fullPixelsPreserved': bool(restored and all(restored[key] == picture[key] for key in ['width', 'height', 'rgbaSha256'])),
            'exactCropMarkupPreserved': bool(restored and restored['srcRect'] == picture['srcRect']),
            'source': picture, 'saved': restored,
        }
    return {
        'sourceFieldCount': len(before['fields']), 'savedFieldCount': len(after['fields']),
        'fieldIdsAndTextPreserved': before['fields'] == after['fields'],
        'completeTextPreserved': before['texts'] == after['texts'],
        'exactGridsPreserved': before['grids'] == after['grids'],
        'pictures': photos,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('saved', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--runtime', required=True)
    parser.add_argument('--saved2', type=Path)
    parser.add_argument('--require-pixels', action='store_true', help='Additional strict pixel gate; ownership success alone is not image acceptance')
    args = parser.parse_args()
    manifest = json.loads((args.source / 'ownership-manifest.json').read_text())
    cases = []
    for fixture in manifest['fixtures']:
        name = fixture['fixture'] + '.docx'
        source = args.source / name
        assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture['docxSha256'], 'Source manifest mismatch'
        original = inventory(source)
        expected = {'cv.person.photo'} if fixture['photo'] else set()
        assert set(original['ownedPictures']) == expected, 'Source picture ownership missing or unexpected'
        phases = {}
        for phase, folder in [('saved1', args.saved), ('saved2', args.saved2)]:
            if folder is not None:
                phases[phase] = compare(source, folder / name)
                phases[phase]['savedDocxSha256'] = hashlib.sha256((folder / name).read_bytes()).hexdigest()
        cases.append({'fixture': fixture['fixture'], 'phases': phases})
    rows = [row for case in cases for row in case['phases'].values()]
    ownership = all(row['fieldIdsAndTextPreserved'] and row['completeTextPreserved'] and all(picture['ownsDrawing'] for picture in row['pictures'].values()) for row in rows)
    pixels = all(picture['fullPixelsPreserved'] for row in rows for picture in row['pictures'].values())
    report = {'runtime': args.runtime, 'manifest': manifest, 'cases': cases, 'ownershipGate': 'PASS' if ownership else 'FAIL', 'originalPixelGate': 'PASS' if pixels else 'FAIL', 'wordAcceptance': 'UNVERIFIED'}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['ownershipGate', 'originalPixelGate', 'wordAcceptance']}))
    assert ownership, 'Native field/picture ownership did not survive'
    if args.require_pixels:
        assert pixels, 'Full original picture pixels did not survive'


if __name__ == '__main__':
    main()
