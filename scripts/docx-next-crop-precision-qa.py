"""Read existing native packages only; quantify crop windows without relaxing any gate."""
import argparse
from fractions import Fraction
import hashlib
import importlib.util
import json
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('native_photo', Path(__file__).with_name('docx-next-native-photo-qa.py'))
photo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photo)


def crop_window(picture):
    crop = picture['crop']
    assert all(isinstance(crop[k], int) and 0 <= crop[k] <= 100000 for k in ['l', 't', 'r', 'b']), 'Unsupported crop range'
    assert crop['l'] + crop['r'] < 100000 and crop['t'] + crop['b'] < 100000, 'Empty crop window'
    width, height = picture['widthPx'], picture['heightPx']
    assert width > 0 and height > 0, 'Invalid source dimensions'
    left, top = Fraction(width * crop['l'], 100000), Fraction(height * crop['t'], 100000)
    right, bottom = Fraction(width * (100000 - crop['r']), 100000), Fraction(height * (100000 - crop['b']), 100000)
    return {'left': left, 'top': top, 'right': right, 'bottom': bottom,
            'width': right - left, 'height': bottom - top,
            'centerX': (left + right) / 2, 'centerY': (top + bottom) / 2}


def numeric(values):
    return {key: round(float(value), 9) for key, value in values.items()}


def measure(before, after, source_extent, saved_extent):
    identical = all(before[k] == after[k] for k in ['widthPx', 'heightPx', 'rgbaSha256'])
    result = {'originalPhotoPixels': 'pass' if identical else 'fail',
              'exactCropParameters': 'unchanged' if before['crop'] == after['crop'] else 'changed',
              'sourceCrop': before['crop'], 'savedCrop': after['crop'],
              'sourceExtentEmu': source_extent, 'savedExtentEmu': saved_extent,
              'extentDeltaMm': numeric({axis: Fraction(saved_extent[axis] - source_extent[axis], 36000) for axis in ['cx', 'cy']}),
              'sourceNearestTwipEmu': {axis: round(Fraction(source_extent[axis], 635)) * 635 for axis in ['cx', 'cy']}}
    result['savedEqualsSourceNearestTwip'] = result['sourceNearestTwipEmu'] == saved_extent
    if identical:
        first, second = crop_window(before), crop_window(after)
        result.update({'windowComparison': 'same-original-pixel-grid',
                       'sourceWindowPx': numeric(first), 'savedWindowPx': numeric(second),
                       'windowDeltaPx': numeric({key: second[key] - first[key] for key in first})})
    else:
        result['windowComparison'] = 'unavailable-original-pixels-changed'
    return result


def extents(path):
    result = {}
    with ZipFile(path) as archive:
        for story in sorted(archive.namelist()):
            if not story.endswith('.xml') or not story.startswith(('word/document', 'word/header', 'word/footer')):
                continue
            for drawing in ET.fromstring(archive.read(story)).iter(photo.W + 'drawing'):
                if drawing.find('.//' + photo.A + 'blip') is None:
                    continue
                props, extent = drawing.find('.//' + photo.WP + 'docPr'), drawing.find('.//' + photo.WP + 'extent')
                assert props is not None and extent is not None, 'Missing drawing properties'
                key = (story, props.get('name'))
                assert key not in result, 'Ambiguous drawing identity'
                result[key] = {axis: int(extent.get(axis)) for axis in ['cx', 'cy']}
                assert all(value > 0 for value in result[key].values()), 'Invalid native extent'
    return result


def audit(directory):
    manifest = json.loads((directory / 'picture-identity-manifest.json').read_text())
    evidence = json.loads((directory / 'picture-identity-report.json').read_text())
    recorded = {row['fixture']: row for row in evidence['fixtures']}
    assert len(recorded) == len(manifest) and set(recorded) == {row['name'] for row in manifest}, 'Evidence/manifest mismatch'
    rows, unrendered = [], []
    for fixture in manifest:
        name, observed = fixture['name'], recorded[fixture['name']]
        assert observed['execution'] in ['rendered', 'unrendered'], 'Unknown execution state'
        if observed['execution'] == 'unrendered':
            unrendered.append(name)
            continue
        if not fixture['photo']:
            continue
        source, saved = directory / (name + '.docx'), directory / (name + '-qa') / (name + '.docx')
        source_hash, saved_hash = hashlib.sha256(source.read_bytes()).hexdigest(), hashlib.sha256(saved.read_bytes()).hexdigest()
        assert source_hash == fixture['docxSha256'] == observed['sourceDocxSha256'], 'Source package changed'
        assert saved_hash == observed['savedDocxSha256'], 'Saved package differs from actual render evidence'
        before, after = photo.inventory(source), photo.inventory(saved)
        first_extents, second_extents = extents(source), extents(saved)
        assert len(before) == len(after) == 1, 'This audit requires one actual photo per control'
        first, second = before[0], after[0]
        key = (first['story'], first['pictureId'])
        assert key == (second['story'], second['pictureId']), 'Saved drawing identity changed'
        rows.append({'fixture': name, 'sourceDocxSha256': source_hash, 'savedDocxSha256': saved_hash,
                     'pictureId': first['pictureId'], 'sourcePixels': {k: first[k] for k in ['widthPx', 'heightPx', 'rgbaSha256']},
                     'savedPixels': {k: second[k] for k in ['widthPx', 'heightPx', 'rgbaSha256']},
                     **measure(first, second, first_extents[key], second_extents[key])})
    return {'runtime': evidence['runtime'], 'interface': evidence['interface'],
            'scope': 'Read-only existing native packages; no rendering, package repair, crop acceptance or causal attribution. Nearest-twip arithmetic uses ties-to-even.',
            'actualPhotoCases': len(rows), 'unrenderedFixtures': unrendered, 'stoppedAfter': evidence['stoppedAfter'],
            'originalPixelFailures': sum(row['originalPhotoPixels'] == 'fail' for row in rows),
            'changedCropCases': sum(row['exactCropParameters'] == 'changed' for row in rows), 'fixtures': rows}


def comparable(report):
    return {**report, 'fixtures': [{k: v for k, v in row.items() if k != 'savedDocxSha256'} for row in report['fixtures']]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    result = audit(args.directory)
    (args.directory / 'crop-precision-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if args.baseline:
        assert comparable(result) == comparable(json.loads(args.baseline.read_text())['stable']), 'Crop precision observation changed; actual report retained'
