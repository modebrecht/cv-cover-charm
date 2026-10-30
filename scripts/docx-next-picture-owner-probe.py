"""Bounded native counterprobes on one real app source; no renderer or production changes."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
from zipfile import ZipFile
from xml.etree import ElementTree as ET

import fitz
from docx_next_picture_owner_qa import W, picture_inventory, compare_image_data


def variants(document):
    matches = list(re.finditer(r'<w:sdt><w:sdtPr><w:alias w:val="cv.person.photo"/>(?:(?!<w:sdt>).)*?</w:sdt>', document, re.S))
    assert len(matches) == 1, 'One unambiguous source photo control required'
    owner = matches[0].group()
    assert owner.count('<wp:anchor ') == owner.count('<w:drawing>') == 1
    assert '<a:prstGeom prst="ellipse">' in owner, 'Probe is scoped to the existing ellipse counterexample'
    rect = owner.replace('<a:prstGeom prst="ellipse">', '<a:prstGeom prst="rect">')
    rect = re.sub(r'<a:ln\b[^>]*>.*?</a:ln>', '', rect, flags=re.S)
    # DomainMapper::PopSdt() builds a text-range control. Test a nonempty range
    # around the unchanged floating drawing; this is not a product workaround.
    marker = '<w:r><w:rPr><w:sz w:val="1"/></w:rPr><w:t>\u2060</w:t></w:r>'
    ranged = owner.replace('<w:sdtContent>', '<w:sdtContent>' + marker)
    ranged = ranged.replace('</w:sdtContent>', marker + '</w:sdtContent>')
    def inline(value):
        value, count = re.subn(r'<wp:anchor\b[^>]*>', '<wp:inline distT="108000" distB="108000" distL="108000" distR="108000">', value)
        assert count == 1
        value = re.sub(r'<wp:simplePos\b[^>]*/>|<wp:positionH\b[^>]*>.*?</wp:positionH>|<wp:positionV\b[^>]*>.*?</wp:positionV>|<wp:wrapSquare\b[^>]*/>', '', value, flags=re.S)
        return value.replace('</wp:anchor>', '</wp:inline>')
    candidates = {'baseline': document,
                  'rectangle-anchor': document.replace(owner, rect),
                  'rectangle-anchor-no-crop': document.replace(owner, re.sub(r'<a:srcRect\b[^>]*/>', '', rect)),
                  'ellipse-inline-control': document.replace(owner, inline(owner)),
                  'rectangle-inline-control': document.replace(owner, inline(rect)),
                  'nonempty-picture-range-control': document.replace(owner, ranged),
                  'character-relative-anchor': document.replace(owner, owner.replace('<wp:positionH relativeFrom="column">', '<wp:positionH relativeFrom="character">'))}
    assert len(set(candidates.values())) == len(candidates), 'A counterprobe did not change its declared source'
    return candidates


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def convert(engine, source, target, kind):
    with tempfile.TemporaryDirectory(prefix='docx-next-picture-owner-') as temporary:
        profile = Path(temporary)
        copied = profile / source.name
        output = profile / target.name
        shutil.copyfile(source, copied)
        process = subprocess.run([str(engine / 'lo-kit'), profile.as_uri(), copied.as_uri(), output.as_uri(), kind],
                                 capture_output=True, text=True, timeout=45)
        assert process.returncode == 0 and output.is_file(), process.stderr
        shutil.copyfile(output, target)


def pdf_snapshot(path):
    with fitz.open(path) as document:
        return {'pages': len(document), 'text': [page.get_text() for page in document],
                'pagePixels': [hashlib.sha256(page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).samples).hexdigest() for page in document],
                'photoFrames': [{'page': page.number + 1, 'bboxMm': [float(v * 25.4 / 72) for v in image['bbox']]}
                                for page in document for image in page.get_image_info()
                                if image['width'] > 1 and image['height'] > 1]}


def probe(fixtures, target, engine, selected_variants=None):
    source = fixtures / 'app-body-photo-free-main.docx'
    fixture = json.loads((fixtures / 'app-body-photo-free-main.json').read_text())
    assert sha(source) == fixture['sourceSha256'], 'Changed real app source'
    assert fixture['directPictureOwnership'] is True
    with ZipFile(source) as archive:
        parts = [(info, archive.read(info.filename)) for info in archive.infolist()]
        document = archive.read('word/document.xml').decode()
    candidates = variants(document)
    legacy = fixtures / 'legacy-frame.docx'
    assert legacy.is_file(), 'Missing unchanged renderer frame counterprobe'
    with ZipFile(legacy) as archive:
        assert all(archive.read(info.filename) == data for info, data in parts if info.filename != 'word/document.xml')
        candidates['legacy-frame-control'] = archive.read('word/document.xml').decode()
    if selected_variants:
        assert len(selected_variants) == len(set(selected_variants)), 'Duplicate diagnostic variant'
        assert set(selected_variants) <= set(candidates), 'Unknown diagnostic variant'
        candidates = {name: candidates[name] for name in selected_variants}
    target.mkdir(parents=True, exist_ok=True)
    report = {'sourceSha256': sha(source), 'productionAcceptance': 'blocked',
              'scope': 'One existing app free-photo counterexample; explicit diagnostic mutations only', 'cases': []}
    baseline_pdf = None
    for name, modified in candidates.items():
        row = {'variant': name, 'phases': [], 'collectionStatus': 'pending', 'productionAcceptance': 'blocked'}
        report['cases'].append(row)
        try:
            path = target / (name + '.docx')
            if name == 'baseline':
                shutil.copyfile(source, path)
            else:
                with ZipFile(path, 'w') as archive:
                    for info, data in parts:
                        archive.writestr(info, modified.encode() if info.filename == 'word/document.xml' else data)
            with ZipFile(path) as archive:
                assert all(archive.read(info.filename) == data for info, data in parts if info.filename != 'word/document.xml')
            before = picture_inventory(path, fixture['pictures'])
            if name == 'nonempty-picture-range-control':
                # This deliberately nonconforming control tests the range
                # mechanism only; it must fail the strict picture contract.
                assert before['status'] == 'fail' and all(
                    picture['reasons'] == ['non-picture-text-in-picture-control']
                    for picture in before['pictures']), 'Unexpected diagnostic source defect'
            else:
                assert before['status'] == 'pass', 'Source ownership must remain explicit'
            row['sourcePictureContract'] = before['status']
            for phase in ('source', 'saved', 'saved2'):
                if phase != 'source':
                    next_path = target / (name + '-' + phase + '.docx')
                    convert(engine, path, next_path, 'docx')
                    path = next_path
                ownership = picture_inventory(path, fixture['pictures'])
                with ZipFile(path) as archive:
                    raw_document = ET.fromstring(archive.read('word/document.xml'))
                raw_count = sum((tag := sdt.find(W+'sdtPr/'+W+'tag')) is not None and tag.get(W+'val') == 'cv.person.photo'
                                for sdt in raw_document.iter(W+'sdt'))
                pdf = target / (name + '-' + phase + '.pdf')
                convert(engine, path, pdf, 'pdf')
                row['phases'].append({'phase': phase, 'packageSha256': sha(path), 'pdfSha256': sha(pdf),
                                      'rawPhotoControlCount': raw_count,
                                      'pictureOwnership': ownership, 'imageData': compare_image_data(before, ownership),
                                      'pdf': pdf_snapshot(pdf)})
            row['ownershipStable'] = all(p['pictureOwnership']['status'] == 'pass' for p in row['phases'])
            row['singleDrawingAndImagePresentInEveryPhase'] = all(
                picture['ownerCount'] == 1 and picture['typedPicture']
                and picture['drawingCount'] == picture['imageReferenceCount'] == 1
                and picture['image'] is not None
                for phase in row['phases'] for picture in phase['pictureOwnership']['pictures'])
            row['imageDataStable'] = all(p['imageData']['status'] == 'pass' for p in row['phases'])
            row['sourceToSavedVisibleGeometryStable'] = row['phases'][0]['pdf'] == row['phases'][1]['pdf']
            row['savedToSaved2VisibleGeometryStable'] = row['phases'][1]['pdf'] == row['phases'][2]['pdf']
            if name == 'baseline':
                baseline_pdf = row['phases'][0]['pdf']
            # A hidden/removed photo can be stable across saves. Compare the
            # candidate source with the unchanged source as a separate check.
            row['sourceMatchesBaselineVisibleGeometry'] = (
                row['phases'][0]['pdf'] == baseline_pdf if baseline_pdf is not None else None)
            row['photoFrameCountsMatchBaseline'] = (
                all(len(phase['pdf']['photoFrames']) == len(baseline_pdf['photoFrames'])
                    for phase in row['phases']) if baseline_pdf is not None else None)
            row['collectionStatus'] = 'pass'
            row['rawPhotoControlCounts'] = [phase['rawPhotoControlCount'] for phase in row['phases']]
            row['activePhotoControlCounts'] = [phase['pictureOwnership']['pictures'][0]['ownerCount'] for phase in row['phases']]
            row['ownershipFailures'] = [{'phase': phase['phase'], 'reasons': picture['reasons'],
                                         'typedPicture': picture['typedPicture'], 'drawingCount': picture['drawingCount'],
                                         'imageReferenceCount': picture['imageReferenceCount']}
                                        for phase in row['phases'] for picture in phase['pictureOwnership']['pictures']
                                        if picture['status'] != 'pass']
        except Exception as error:
            row['collectionStatus'] = 'fail'
            row['failure'] = type(error).__name__ + ': ' + str(error)
        (target / 'picture-owner-probe-report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({key: value for key, value in row.items() if key != 'phases'}), flush=True)
    assert all(row['collectionStatus'] == 'pass' for row in report['cases']), 'Incomplete diagnostic collection; never infer missing outcomes'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fixtures', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--variant', action='append', help='Collect only these named diagnostics; default: all variants')
    args = parser.parse_args()
    probe(args.fixtures.resolve(), args.output.resolve(), args.engine.resolve(), args.variant)
