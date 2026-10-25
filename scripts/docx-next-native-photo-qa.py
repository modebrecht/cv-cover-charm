"""Read-only native picture inventory. Visible crop does not prove original-photo restoration."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import posixpath
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from PIL import Image

WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
PIC = '{http://schemas.openxmlformats.org/drawingml/2006/picture}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def decoded_photo(data):
    with Image.open(io.BytesIO(data)) as image:
        rgba = image.convert('RGBA')
        return {'widthPx': rgba.width, 'heightPx': rgba.height,
                'rgbaSha256': hashlib.sha256(rgba.tobytes()).hexdigest()}


def inventory(path):
    pictures = []
    with ZipFile(path) as archive:
        for story in sorted(archive.namelist()):
            if not story.endswith('.xml') or not story.startswith(('word/document', 'word/header', 'word/footer')):
                continue
            root = ET.fromstring(archive.read(story))
            relationship_file = posixpath.join(posixpath.dirname(story), '_rels', posixpath.basename(story) + '.rels')
            if relationship_file not in archive.namelist():
                continue
            relationships = {node.get('Id'): node.get('Target') for node in ET.fromstring(archive.read(relationship_file)).iter(PR + 'Relationship') if node.get('TargetMode') != 'External'}
            for drawing in root.iter(W + 'drawing'):
                # Editors may replace pic:pic with an editable shape using an image fill.
                # Inspect both native representations; a missing pic:pic alone proves no loss.
                picture = drawing
                blip = picture.find('.//' + A + 'blip')
                if blip is None:
                    continue
                props = drawing.find('.//' + WP + 'docPr')
                extent = drawing.find('.//' + WP + 'extent')
                assert props is not None and extent is not None and blip is not None
                target = relationships[blip.get(R + 'embed')]
                media = posixpath.normpath(posixpath.join(posixpath.dirname(story), target)) if not target.startswith('/') else target.lstrip('/')
                assert media.startswith('word/media/'), 'Unexpected native media location'
                crop = picture.find('.//' + A + 'srcRect')
                shape = picture.find('.//' + A + 'prstGeom')
                line = picture.find('.//' + A + 'ln')
                color = None if line is None else line.find('.//' + A + 'srgbClr')
                pictures.append({'pictureId': props.get('name'), 'alt': props.get('descr'), 'story': story,
                                 'representation': 'picture' if drawing.find('.//' + PIC + 'pic') is not None else 'image-fill',
                                 'extentMm': [round(int(extent.get(key)) / 36000, 6) for key in ['cx', 'cy']],
                                 'crop': {key: int(crop.get(key, '0')) if crop is not None else 0 for key in ['l', 't', 'r', 'b']},
                                 'shape': shape.get('prst') if shape is not None else None,
                                 'borderMm': int(line.get('w', '0')) / 36000 if line is not None else 0,
                                 'borderColor': color.get('val') if color is not None else None,
                                 'media': media, **decoded_photo(archive.read(media))})
    return pictures


def compare(source, saved):
    before, after = inventory(source), inventory(saved)
    rows = []
    for picture in before:
        matches = [candidate for candidate in after if candidate['pictureId'] == picture['pictureId'] and candidate['story'] == picture['story']]
        assert len(matches) <= 1, 'Ambiguous saved drawing identity'
        restored = matches[0] if matches else None
        pixels = bool(restored and all(picture[key] == restored[key] for key in ['widthPx', 'heightPx', 'rgbaSha256']))
        frame = bool(restored and picture['shape'] == restored['shape'] and (picture['borderColor'] or '').upper() == (restored['borderColor'] or '').upper() and abs(picture['borderMm'] - restored['borderMm']) <= 0.05 and all(abs(a - b) <= 0.05 for a, b in zip(picture['extentMm'], restored['extentMm'])))
        rows.append({'pictureId': picture['pictureId'], 'source': picture, 'saved': restored,
                     'drawingName': 'pass' if restored else 'fail',
                     'originalPhotoPixels': 'pass' if pixels else 'fail',
                     'nativeCropParameters': 'unchanged' if restored and picture['crop'] == restored['crop'] else 'changed',
                     'nativeFrameGeometry': 'pass' if frame else 'fail'})
    return rows


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    directory = args.directory
    manifest = json.loads((directory / 'picture-identity-manifest.json').read_text())
    evidence = json.loads((directory / 'picture-identity-report.json').read_text())
    rendered = {row['fixture'] for row in evidence['fixtures'] if row['execution'] == 'rendered'}
    rows = []
    for fixture in manifest:
        if not fixture['photo'] or fixture['name'] not in rendered:
            continue
        source = directory / (fixture['name'] + '.docx')
        saved = directory / (fixture['name'] + '-qa') / source.name
        rows.append({'fixture': fixture['name'], 'sourceDocxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                     'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'pictures': compare(source, saved)})
    result = {'runtime': evidence['runtime'], 'interface': evidence['interface'], 'actualPhotoCases': len(rows),
              'scope': 'Original decoded photo pixels/crop in native saved package; independent of input/model JSON restoration and SDT field identity.',
              'originalPixelFailures': sum(picture['originalPhotoPixels'] == 'fail' for row in rows for picture in row['pictures']),
              'nativeFrameFailures': sum(picture['nativeFrameGeometry'] == 'fail' for row in rows for picture in row['pictures']),
              'fixtures': rows}
    (directory / 'native-photo-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if args.baseline:
        expected = json.loads(args.baseline.read_text())['stablePhoto']
        def comparable(report):
            return {**report, 'fixtures': [{key: value for key, value in row.items() if key != 'savedDocxSha256'} for row in report['fixtures']]}
        assert comparable(result) == comparable(expected), 'Stable native photo observation changed; actual evidence retained'
