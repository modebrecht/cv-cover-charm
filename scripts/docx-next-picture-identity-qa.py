"""Read-only minimal picture/context comparison; negative cases stop the native experiment."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED
import fitz

spec = importlib.util.spec_from_file_location('identity', Path(__file__).with_name('docx-next-native-identity-qa.py'))
identity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(identity)
spec = importlib.util.spec_from_file_location('photo', Path(__file__).with_name('docx-next-native-photo-qa.py'))
photo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(photo)
spec = importlib.util.spec_from_file_location('pdf_picture', Path(__file__).with_name('docx-next-pdf-picture-qa.py'))
pdf_picture = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pdf_picture)
MM = 72 / 25.4


def rectangular_frame(page, image, geometry):
    """A rectangular native border can inset the PDF image; measure its four strokes.

    Require the authored color/thickness, all four edges, and the image inset.
    This is not extra tolerance on image size or an inferred invisible frame.
    """
    border = geometry.get('borderWidthMm', 0)
    if geometry.get('shape') != 'rect' or not border:
        return image, None
    color = tuple(int(geometry['borderColor'][index:index + 2], 16) / 255 for index in [0, 2, 4])
    edges = {'left': [], 'right': [], 'top': [], 'bottom': []}
    for drawing in page.get_drawings():
        actual_color = drawing.get('color')
        if not actual_color or any(abs(a - b) > 0.005 for a, b in zip(actual_color, color)) or abs((drawing.get('width') or 0) / MM - border) > 0.05:
            continue
        for item in drawing['items']:
            if item[0] != 'l':
                continue
            a, b = item[1:]
            half = drawing['width'] / 2
            if abs(a.x - b.x) < 0.01 and min(a.y, b.y) <= image.y0 + 0.1 * MM and max(a.y, b.y) >= image.y1 - 0.1 * MM:
                for edge, distance, bound in [('left', image.x0 - a.x, a.x - half), ('right', a.x - image.x1, a.x + half)]:
                    if -0.02 * MM <= distance <= border * MM:
                        edges[edge].append(bound)
            if abs(a.y - b.y) < 0.01 and min(a.x, b.x) <= image.x0 + 0.1 * MM and max(a.x, b.x) >= image.x1 - 0.1 * MM:
                for edge, distance, bound in [('top', image.y0 - a.y, a.y - half), ('bottom', a.y - image.y1, a.y + half)]:
                    if -0.02 * MM <= distance <= border * MM:
                        edges[edge].append(bound)
    if any(len(values) != 1 for values in edges.values()):
        return image, 'picture-frame-strokes'
    outer = fitz.Rect(*(edges[key][0] for key in ['left', 'top', 'right', 'bottom']))
    insets = [image.x0 - outer.x0, image.y0 - outer.y0, outer.x1 - image.x1, outer.y1 - image.y1]
    if any(abs(value / MM - border) > 0.15 for value in insets):
        return outer, 'picture-frame-inset'
    return outer, None


def pdf_result(path, fixture):
    failures = []
    with fitz.open(path) as document:
        if len(document) != fixture['expectedPages']:
            failures.append('page-count')
        text = identity.compact(''.join(page.get_text() for page in document))
        for field in fixture['fields']:
            if identity.compact(field['text']) not in text:
                failures.append('pdf-text:' + field['fieldId'])
        pictures = [(page.number, item) for page in document for item in page.get_image_info()]
        expected = 1 if fixture['photo'] else 0
        if len(pictures) != expected:
            failures.append('picture-count')
        measured = []
        clipped = []
        for page_number, image in pictures:
            rect = fitz.Rect(image['bbox'])
            geometry = fixture['pictureGeometry']
            if geometry.get('shape') == 'rect' and fixture.get('crop'):
                records = pdf_picture.image_rectangles(path, page_number)
                matches = [record for record in records if all(abs(a - b) < 0.1 for a, b in zip(record['raw'], rect))]
                assert len(matches) == 1, 'Ambiguous or missing actual image paint/clip'
                record = matches[0]
                clipped.append({'page': page_number + 1, 'boundsMm': [round(v / MM, 3) for v in record['visible']], 'clipBoundsMm': None if record['clip'] is None else [round(v / MM, 3) for v in record['clip']]})
                rect = record['visible']
            frame, failure = rectangular_frame(document[page_number], rect, geometry)
            if failure:
                failures.append(failure)
            if frame != rect:
                measured.append({'page': page_number + 1, 'boundsMm': [round(v / MM, 3) for v in frame]})
            rect = frame
            if page_number != 2 or abs(rect.width / MM - geometry['widthMm']) > 0.5 or abs(rect.height / MM - geometry['heightMm']) > 0.5:
                failures.append('picture-geometry')
            left = fixture['margins']['left']
            if fixture['owner'] == 'right':
                left += fixture['cellWidthMm']
            if abs(rect.x0 / MM - left) > 0.5:
                failures.append('picture-cell-origin')
            if rect.x1 / MM > left + fixture['cellWidthMm'] + 0.5:
                failures.append('picture-cell-bounds')
        if len(document) >= 3:
            page = document[2]
            margins = fixture['margins']
            for block in page.get_text('dict')['blocks']:
                if block['type'] != 0:
                    continue
                for line in block['lines']:
                    for span in line['spans']:
                        rect = fitz.Rect(span['bbox'])
                        if rect.x0 / MM < margins['left'] - 0.7 or rect.x1 / MM > page.rect.width / MM - margins['right'] + 0.7 or rect.y0 / MM < margins['top'] - 3 or rect.y1 / MM > page.rect.height / MM - margins['bottom'] + 3:
                            failures.append('text-body-bounds')
            # Every actual page is retained for visual inspection, including rejected cases.
        result = {'status': 'fail' if failures else 'pass', 'pages': len(document), 'failures': sorted(set(failures)), 'pictures': [{'page': number + 1, 'boundsMm': [round(v / MM, 3) for v in item['bbox']]} for number, item in pictures]}
        if measured:
            result['rectangularFrames'] = measured
        if clipped:
            result['visibleImageClips'] = clipped
        return result


def source_check(source, fixture):
    fields, captions, _ = identity.inventory(source)
    for field in fixture['fields']:
        assert (field['fieldId'], identity.compact(field['text'])) in fields, 'Source lost complete field ' + field['fieldId']
    assert (fixture['pictureId'], '') in fields if fixture['photo'] else all(name != fixture['pictureId'] for name, _ in fields)
    assert captions == (set() if fixture['owner'] == 'body' else {'cv.identity.container'})
    assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture['docxSha256'], 'Source package changed'


def stop_reason(result):
    if result['native']['completeNativeText'] != 'pass':
        return 'complete-native-text'
    if result['native']['fieldIdentity'] != 'pass':
        return 'field-identity'
    if any(result[key]['status'] != 'pass' for key in ['render', 'saveReopen']):
        return 'pdf-text-or-geometry'
    if 'nativePhoto' in result:
        if any(row['originalPhotoPixels'] != 'pass' for row in result['nativePhoto']):
            return 'original-photo-pixels'
        if any(row['nativeCropParameters'] != 'unchanged' or row['nativeFrameGeometry'] != 'pass' or row['drawingName'] != 'pass' for row in result['nativePhoto']):
            return 'native-photo-frame-or-crop'
    # Container captions have their own unresolved requirement; do not mask field results.
    return None


def comparable(report):
    # External save metadata is not deterministic; source package identity and all
    # measured native/visible results remain exact baseline requirements.
    return {**report, 'fixtures': [{key: value for key, value in row.items() if key != 'savedDocxSha256'} for row in report['fixtures']]}


def run(directory, executable, kit=False, require_stable=False, observe=False, replay=False, baseline=None, frames=False, precision=False, windows=False, sizes=False):
    assert sum([precision, windows, sizes]) <= 1, 'Choose one independent diagnostic matrix'
    assert not (precision or windows or sizes) or frames, 'Precision/window controls require the strict frame/photo gates'
    with tempfile.TemporaryDirectory(prefix='identity-version-') as profile:
        version = subprocess.check_output([executable, '--version'] + ([Path(profile).as_uri()] if kit else []), text=True, timeout=30).strip()
    if kit:
        data = json.loads(version)
        version = f'{data["ProductName"]} {data["ProductVersion"]}{data["ProductExtension"]} {data["BuildId"]}'
    if require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'

    def convert(source, destination, format):
        with tempfile.TemporaryDirectory(prefix='identity-profile-') as profile, tempfile.TemporaryDirectory(prefix='identity-export-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if kit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            destination.write_bytes(exported.read_bytes())

    manifest = json.loads((directory / 'picture-identity-manifest.json').read_text())
    if frames:
        planned = [(True, False)] * 3 if sizes else [(True, False)] * 4 if windows else [(False, False), (True, False)] if precision else [(False, False), (False, True), (True, False), (True, True)]
        assert [(row['owner'], row['photo'], row['crop'], row['ellipse']) for row in manifest] == [('body', True, crop, ellipse) for crop, ellipse in planned]
        if precision:
            assert manifest[0]['docxSha256'] == '8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df', 'Start from the verified unchanged positive control'
            assert manifest[1]['pictureGeometry']['crop'] == {'left': 8378, 'top': 24396, 'right': 11622, 'bottom': 22255}, 'Prospective declared crop changed'
        if windows:
            assert manifest[0]['docxSha256'] == '8792017431b1a913da220b55a4fc7e5d83db749a55eee085741935bbc0856222', 'Start from the verified unchanged cropped positive control'
            expected = [(8378, 24396, 11622, 22255), (14992, 25005, 5008, 21667), (2992, 20008, 17008, 26664), (20000, 30002, 13323, 25551)]
            assert [tuple(row['pictureGeometry']['crop'][k] for k in ['left', 'top', 'right', 'bottom']) for row in manifest] == expected, 'Declared window plan changed'
        if sizes:
            assert manifest[0]['docxSha256'] == '8792017431b1a913da220b55a4fc7e5d83db749a55eee085741935bbc0856222', 'Start from verified unchanged cropped positive control'
            expected_pixels = [{'width': 120, 'height': 180}, {'width': 240, 'height': 360}, {'width': 600, 'height': 900}]
            assert [row['originalPixels'] for row in manifest] == expected_pixels, 'Original-photo dimension plan changed'
            assert all(row['pictureGeometry'] == manifest[0]['pictureGeometry'] for row in manifest), 'Frame/crop settings must stay fixed across photo sizes'
        reference = photo.decoded_photo((directory / 'canonical-photo.png').read_bytes())
        for fixture in manifest:
            if sizes:
                original = fixture['originalPixels']
                file = 'canonical-photo.png' if original['width'] == 120 else f"canonical-photo-{original['width']}x{original['height']}.png"
                assert fixture['canonicalPhotoFile'] == file, 'Canonical source photo file changed'
                data = (directory / file).read_bytes()
                assert hashlib.sha256(data).hexdigest() == fixture['normalizedSha256'], 'Canonical original-photo asset changed'
                reference = photo.decoded_photo(data)
                assert (reference['widthPx'], reference['heightPx']) == (original['width'], original['height']), 'Original source dimensions changed'
            pictures = photo.inventory(directory / (fixture['name'] + '.docx'))
            assert len(pictures) == 1
            picture = pictures[0]
            assert all(picture[key] == reference[key] for key in reference), 'Original source pixels differ'
            assert fixture['fields'] == manifest[0]['fields'], 'Complete semantic fields differ'
            assert picture['pictureId'] == fixture['pictureId'] == manifest[0]['pictureId']
            assert picture['shape'] == ('ellipse' if fixture['ellipse'] else 'rect')
            assert picture['crop'] == dict(zip(['l', 't', 'r', 'b'], [fixture['pictureGeometry']['crop'][key] for key in ['left', 'top', 'right', 'bottom']]))
            if not fixture['crop']:
                assert not any(picture['crop'].values()), 'Uncropped control has a crop'
    else:
        assert [(row['owner'], row['photo']) for row in manifest] == [(owner, picture) for owner in ['body', 'single', 'left', 'right'] for picture in [False, True]]
    # Validate all prepared source packages; this does not claim that all were rendered.
    for fixture in manifest:
        source_check(directory / (fixture['name'] + '.docx'), fixture)
    rows, stopped = [], None
    for fixture in manifest:
        if stopped:
            rows.append({'fixture': fixture['name'], 'execution': 'unrendered', 'reason': 'stopped after ' + stopped})
            continue
        source = directory / (fixture['name'] + '.docx')
        qa = directory / (fixture['name'] + '-qa')
        qa.mkdir(exist_ok=True)
        pdf, saved = qa / 'source.pdf', qa / source.name
        convert(source, pdf, 'pdf')
        convert(source, saved, 'docx')
        saved_pdf = qa / 'saved.pdf'
        convert(saved, saved_pdf, 'pdf')
        result = {'fixture': fixture['name'], 'execution': 'rendered', 'sourceDocxSha256': fixture['docxSha256'], 'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'native': identity.audit(source, saved), 'render': pdf_result(pdf, fixture), 'saveReopen': pdf_result(saved_pdf, fixture)}
        if frames:
            result['nativePhoto'] = photo.compare(source, saved)
            assert len(result['nativePhoto']) == 1, 'Photo control must audit one source picture'
        for label, path in [('source', pdf), ('saved', saved_pdf)]:
            with fitz.open(path) as document:
                for page in document:
                    page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False).save(qa / f'{label}-page-{page.number + 1}.png')
        rows.append(result)
        reason = stop_reason(result)
        if reason:
            stopped = fixture['name'] + ':' + reason
    actual = [row for row in rows if row['execution'] == 'rendered']
    report = {'runtime': version, 'interface': 'LibreOfficeKit' if kit else 'soffice CLI', 'plannedCases': len(rows), 'actualCases': len(actual), 'pages': sum(row['render']['pages'] for row in actual), 'stoppedAfter': stopped, 'fieldIdentityFailures': sum(row['native']['fieldIdentity'] == 'fail' for row in actual), 'tableIdentityFailures': sum(row['native']['tableIdentity'] == 'fail' for row in actual), 'architectureAcceptance': 'blocked; minimal diagnostics do not enable export or certify Word', 'fixtures': rows}
    if frames:
        report['matrix'] = 'picture-size' if sizes else 'picture-window' if windows else 'picture-precision' if precision else 'picture-frame'
        report['originalPixelFailures'] = sum(picture['originalPhotoPixels'] == 'fail' for row in actual for picture in row['nativePhoto'])
    (directory / 'picture-identity-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
    if replay:
        buffer = io.BytesIO()
        with ZipFile(buffer, 'w', compression=ZIP_DEFLATED) as archive:
            for name in list(dict.fromkeys(['picture-identity-manifest.json', 'picture-identity-report.json', 'canonical-photo.png'] + [fixture.get('canonicalPhotoFile', 'canonical-photo.png') for fixture in manifest] + [fixture['name'] + '.docx' for fixture in manifest])):
                archive.writestr(name, (directory / name).read_bytes())
        data = buffer.getvalue()
        print(json.dumps({'pictureIdentityReplaySha256': hashlib.sha256(data).hexdigest(), 'pictureIdentityReplayBase64': base64.b64encode(data).decode()}))
    assert observe or not stopped, 'Stopped native identity experiment; actual evidence retained'
    if baseline:
        expected = json.loads(baseline.read_text())
        expected = expected.get('stable', expected)
        assert comparable(report) == comparable(expected), 'Stable picture identity observation changed; actual evidence retained'
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--observe', action='store_true')
    parser.add_argument('--replay', action='store_true')
    parser.add_argument('--baseline', type=Path)
    matrix = parser.add_mutually_exclusive_group()
    matrix.add_argument('--frames', action='store_true')
    matrix.add_argument('--precision-controls', action='store_true')
    matrix.add_argument('--window-controls', action='store_true')
    matrix.add_argument('--size-controls', action='store_true')
    args = parser.parse_args()
    run(args.directory, args.libreofficekit or args.soffice, bool(args.libreofficekit), args.require_stable, args.observe, args.replay, args.baseline, args.frames or args.precision_controls or args.window_controls or args.size_controls, args.precision_controls, args.window_controls, args.size_controls)
