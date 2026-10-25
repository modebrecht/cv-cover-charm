"""Read existing native media only: an exact cropped subset is still original-pixel loss."""
import argparse
from fractions import Fraction
import hashlib
import importlib.util
import io
import json
from pathlib import Path
from zipfile import ZipFile
from PIL import Image

spec = importlib.util.spec_from_file_location('native_photo', Path(__file__).with_name('docx-next-native-photo-qa.py'))
photo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photo)


def rounded_positive(value):
    return (2 * value.numerator + value.denominator) // (2 * value.denominator)


def measure(source, saved, crop):
    """Compare decoded RGBA bytes, never modify/restore source or saved packages."""
    first = Image.open(io.BytesIO(source)).convert('RGBA')
    second = Image.open(io.BytesIO(saved)).convert('RGBA')
    source_hash = hashlib.sha256(first.tobytes()).hexdigest()
    saved_hash = hashlib.sha256(second.tobytes()).hexdigest()
    preserved = first.size == second.size and source_hash == saved_hash
    result = {'sourceSizePx': list(first.size), 'savedSizePx': list(second.size),
              'sourceRgbaSha256': source_hash, 'savedRgbaSha256': saved_hash,
              'originalPhotoPixels': 'pass' if preserved else 'fail'}
    if preserved:
        return {**result, 'subsetComparison': 'not-needed-original-preserved'}
    assert all(type(crop[k]) is int and 0 <= crop[k] <= 100000 for k in ['l', 't', 'r', 'b']), 'Unsupported source crop range'
    assert crop['l'] + crop['r'] < 100000 and crop['t'] + crop['b'] < 100000, 'Empty source crop window'
    width, height = first.size
    edges = [rounded_positive(Fraction(width * crop['l'], 100000)),
             rounded_positive(Fraction(height * crop['t'], 100000)),
             rounded_positive(Fraction(width * crop['r'], 100000)),
             rounded_positive(Fraction(height * crop['b'], 100000))]
    left, top, right, bottom = edges
    bounds = [left, top, width - right, height - bottom]
    size = [bounds[2] - left, bounds[3] - top]
    result.update({'roundedCropEdgesPx': edges, 'sourceBoundsExclusivePx': bounds, 'expectedSubsetSizePx': size})
    if min(size) <= 0:
        return {**result, 'subsetComparison': 'rounded-window-empty'}
    candidate = first.crop(tuple(bounds))
    candidate_hash = hashlib.sha256(candidate.tobytes()).hexdigest()
    matches = candidate.size == second.size and candidate_hash == saved_hash
    result.update({'subsetRgbaSha256': candidate_hash,
                   'subsetComparison': 'exact-rounded-source-crop' if matches else 'no-exact-rounded-source-crop'})
    if matches:
        result['retainedOriginalPixels'] = candidate.width * candidate.height
        result['missingOriginalPixels'] = width * height - result['retainedOriginalPixels']
        result['retainedOriginalPixelFraction'] = round(result['retainedOriginalPixels'] / (width * height), 9)
    return result


def audit(directory):
    manifest = json.loads((directory / 'picture-identity-manifest.json').read_text())
    evidence = json.loads((directory / 'picture-identity-report.json').read_text())
    recorded = {row['fixture']: row for row in evidence['fixtures']}
    assert len(recorded) == len(manifest) and set(recorded) == {row['name'] for row in manifest}, 'Evidence/manifest mismatch'
    rows, unrendered = [], []
    for fixture in manifest:
        observed = recorded[fixture['name']]
        assert observed['execution'] in ['rendered', 'unrendered'], 'Unknown execution state'
        if observed['execution'] == 'unrendered':
            unrendered.append(fixture['name'])
            continue
        if not fixture['photo']:
            continue
        source = directory / (fixture['name'] + '.docx')
        saved = directory / (fixture['name'] + '-qa') / (fixture['name'] + '.docx')
        assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture['docxSha256'] == observed['sourceDocxSha256'], 'Source package changed'
        assert hashlib.sha256(saved.read_bytes()).hexdigest() == observed['savedDocxSha256'], 'Saved package differs from actual render evidence'
        before, after = photo.inventory(source), photo.inventory(saved)
        assert len(before) == len(after) == 1, 'One actual original/saved photo required'
        first, second = before[0], after[0]
        assert (first['pictureId'], first['story']) == (second['pictureId'], second['story']) == (fixture['pictureId'], 'word/document.xml'), 'Drawing identity changed'
        with ZipFile(source) as archive:
            original_bytes = archive.read(first['media'])
        with ZipFile(saved) as archive:
            saved_bytes = archive.read(second['media'])
        rows.append({'fixture': fixture['name'], 'sourceDocxSha256': fixture['docxSha256'],
                     'savedDocxSha256': observed['savedDocxSha256'], 'pictureId': first['pictureId'],
                     'sourceCrop': first['crop'], 'savedCrop': second['crop'],
                     **measure(original_bytes, saved_bytes, first['crop'])})
    return {'runtime': evidence['runtime'], 'interface': evidence['interface'],
            'scope': 'Read-only exact rounded source-pixel subset comparison; a matching subset does not preserve the full original, restore pixels or prove an instrumented live import branch.',
            'actualPhotoCases': len(rows), 'unrenderedFixtures': unrendered, 'stoppedAfter': evidence['stoppedAfter'],
            'originalPixelFailures': sum(row['originalPhotoPixels'] == 'fail' for row in rows),
            'exactSubsetCases': sum(row['subsetComparison'] == 'exact-rounded-source-crop' for row in rows), 'fixtures': rows}


def comparable(report):
    return {**report, 'fixtures': [{k: v for k, v in row.items() if k != 'savedDocxSha256'} for row in report['fixtures']]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--baseline-section', choices=['contexts', 'sized'], default='contexts')
    args = parser.parse_args()
    result = audit(args.directory)
    (args.directory / 'pixel-subset-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if args.baseline:
        assert comparable(result) == comparable(json.loads(args.baseline.read_text())[args.baseline_section]), 'Native pixel-subset observation changed; actual report retained'
