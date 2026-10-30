"""Bounded crop/shape controls: observe the active native bitmap before any save."""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from zipfile import ZipFile

from PIL import Image
from docx_next_picture_owner_qa import A, W, effective_document, picture_inventory


REPO = Path(__file__).resolve().parent.parent
SOURCE_SHA256 = '7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923'


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixels(image):
    return {'sizePx': list(image.size), 'rgbaSha256': hashlib.sha256(image.tobytes()).hexdigest()}


def opaque_source_pixels(image):
    assert image.getchannel('A').getextrema() == (255, 255), 'Only the bound opaque source is measured'
    return pixels(image)


def integer_crop(image, edges):
    """Positive srcRect offsets, with the pinned importer's half-away rounding."""
    assert all(0 <= edges.get(key, 0) < 100000 for key in ('l', 't', 'r', 'b')), 'Out-of-scope crop'
    width, height = image.size
    left = (width * edges.get('l', 0) + 50000) // 100000
    top = (height * edges.get('t', 0) + 50000) // 100000
    right = width - (width * edges.get('r', 0) + 50000) // 100000
    bottom = height - (height * edges.get('b', 0) + 50000) // 100000
    assert left < right and top < bottom, 'Empty crop'
    return (left, top, right, bottom), image.crop((left, top, right, bottom))


def source_variants(document):
    matches = list(re.finditer(r'<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"/>(?:(?!<w:sdt>).)*?</w:sdt>', document, re.S))
    assert len(matches) == 1, 'Ambiguous source picture control'
    match = matches[0]
    owner = match.group()
    assert owner.count('<a:prstGeom prst="ellipse">') == 1
    crops = list(re.finditer(r'<a:srcRect\b[^>]*/>', owner))
    assert len(crops) == 1
    zero = owner.replace(crops[0].group(), '<a:srcRect l="0" t="0" r="0" b="0"/>')
    rect = lambda value: value.replace('<a:prstGeom prst="ellipse">', '<a:prstGeom prst="rect">')
    result = {'ellipse-crop-anchored': document,
              'rect-crop-anchored': document.replace(owner, rect(owner)),
              'ellipse-zero-anchored': document.replace(owner, zero),
              'rect-zero-anchored': document.replace(owner, rect(zero))}
    probe = module('docx-next-picture-owner-probe')
    result['ellipse-crop-inline'] = probe.variants(document)['ellipse-inline-control']
    start = document.rfind('<w:p>', 0, match.start())
    end = document.index('</w:p>', match.end()) + len('</w:p>')
    paragraph = document[start:end]
    assert start >= 0 and paragraph.count('<w:p>') == paragraph.count(owner) == 1
    properties = '<w:pPr><w:keepNext/><w:spacing w:before="0" w:after="0" w:line="0" w:lineRule="exact"/><w:rPr><w:sz w:val="1"/><w:szCs w:val="1"/></w:rPr></w:pPr>'
    block = owner.replace('<w:sdtContent>', '<w:sdtContent><w:p>' + properties)
    block = block.replace('</w:sdtContent>', '</w:p></w:sdtContent>')
    result['ellipse-crop-block-zero'] = document[:start] + block + paragraph.replace(owner, '') + document[end:]
    assert len(set(result.values())) == len(result), 'Repeated control source'
    return result


def audit(fixtures, output, engine, binding):
    source = fixtures / 'app-body-photo-free-main.docx'
    fixture = json.loads(source.with_suffix('.json').read_text())
    assert sha(source) == fixture['sourceSha256'] == SOURCE_SHA256, 'Changed real application source'
    assert [picture['id'] for picture in fixture['pictures']] == ['cv.person.photo']
    inventory = picture_inventory(source, fixture['pictures'])
    assert inventory['status'] == 'pass'
    with ZipFile(source) as archive:
        parts = [(info, archive.read(info.filename)) for info in archive.infolist()]
        document = archive.read('word/document.xml').decode()
        data = archive.read(inventory['pictures'][0]['image']['part'])
    with Image.open(io.BytesIO(data)) as image:
        original = image.convert('RGBA')
    # XBitmap.getDIB does not measure a separate transparency mask here.
    source_pixels = opaque_source_pixels(original)
    output.mkdir(parents=True, exist_ok=True)
    requests, expected = [], []
    for name, value in source_variants(document).items():
        target = output / (name + '.docx')
        if name == 'ellipse-crop-anchored':
            shutil.copyfile(source, target)
        else:
            with ZipFile(target, 'w') as archive:
                for info, content in parts:
                    archive.writestr(info, value.encode() if info.filename == 'word/document.xml' else content)
        with ZipFile(target) as archive:
            assert all(archive.read(info.filename) == content for info, content in parts if info.filename != 'word/document.xml')
            root = effective_document(archive.read('word/document.xml'))
        assert picture_inventory(target, fixture['pictures'])['status'] == 'pass', 'Invalid diagnostic source'
        owners = [node for node in root.iter(W + 'sdt')
                  if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None and tag.get(W + 'val') == 'cv.person.photo']
        assert len(owners) == 1
        crop = owners[0].find('.//' + A + 'srcRect')
        assert crop is not None
        edges = {key: int(crop.get(key, '0')) for key in ('l', 't', 'r', 'b')}
        box, cropped = integer_crop(original, edges)
        requests.append({'name': name, 'path': str(target.resolve()), 'sha256': sha(target), 'pictureId': 'cv.person.photo'})
        expected.append({'name': name, 'sourcePixels': source_pixels, 'sourceCrop': edges,
                         'integerCropBoxPx': list(box), 'expectedIntegerCrop': pixels(cropped)})
    request_path = output / 'requests.json'
    request_path.write_text(json.dumps(requests, indent=2) + '\n')
    entry = module('docx-next-entry-flow-qa')
    process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-picture-import-worker.py'), str(request_path)],
                             env=entry.native_environment(engine, binding), capture_output=True, text=True, timeout=60)
    (output / 'worker.stderr').write_text(process.stderr)
    (output / 'worker.stdout').write_text(process.stdout)
    assert process.returncode == 0, 'Native import observation failed: ' + process.stderr
    native = json.loads(process.stdout)
    assert len(native['cases']) == len(requests)
    rows = []
    for request, source_record, actual in zip(requests, expected, native['cases']):
        assert actual['name'] == request['name'] and actual['inputSha256'] == request['sha256']
        assert actual['readOnly'] and not actual['modified'] and sha(Path(request['path'])) == request['sha256']
        bitmap = actual['shape']['bitmap']
        observed = {key: bitmap[key] for key in ('sizePx', 'rgbaSha256')}
        unchanged = observed == source_pixels
        integer_match = observed == source_record['expectedIntegerCrop']
        rows.append({**source_record, **actual, 'sourcePixelsPreserved': unchanged,
                     'matchesExpectedIntegerCrop': integer_match,
                     'croppedPixelsAlreadyActiveBeforeSave': integer_match and not unchanged,
                     'nativePictureControlCount': len(actual['pictureControls'])})
    report = {'scope': 'Bounded opaque source: shape/crop controls after original load, no document saves',
              'collectionStatus': 'pass', 'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0,
              'sourceDocxSha256': SOURCE_SHA256, 'sourcePhotoPayloadSha256': hashlib.sha256(data).hexdigest(),
              'sourcePhotoOpaque': True, 'activeBitmapAlphaMaskMeasured': False,
              'engine': json.loads((engine / 'runtime-record.json').read_text()),
              'binding': json.loads((binding.parent / 'binding-record.json').read_text()),
              'observerSha256': sha(REPO / 'scripts/docx-next-picture-import-worker.py'),
              'nativeLibrarySha256': native['librarySha256'], 'newReadonlyNativeLoads': len(rows),
              'newNativeExports': 0, 'originalPackagesModified': 0, 'newPreparedDiagnosticSources': len(rows) - 1,
              'countercontrolsAreProductCandidates': False, 'cases': rows}
    assert sha(source) == SOURCE_SHA256
    path = output / 'picture-import-report.json'
    path.write_text(json.dumps(report, indent=2) + '\n')
    for row in rows:
        print(json.dumps({'name': row['name'], 'activeBitmapSizePx': row['shape']['bitmap']['sizePx'],
                          'sourcePixelsPreserved': row['sourcePixelsPreserved'],
                          'integerCropAlreadyActive': row['croppedPixelsAlreadyActiveBeforeSave'],
                          'nativePictureControls': row['nativePictureControlCount']}), flush=True)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fixtures', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--binding', type=Path, required=True, help='Extracted binding directory, ending in /binding')
    args = parser.parse_args()
    audit(args.fixtures.resolve(), args.output.resolve(), args.engine.resolve(), args.binding.resolve())
