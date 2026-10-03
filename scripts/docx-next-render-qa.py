"""Structural and LibreOffice render checks. Does not certify Microsoft Word acceptance."""
import argparse
import json
import os
from pathlib import Path
import posixpath
import re
import subprocess
import tempfile
import unicodedata
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz
from PIL import Image, ImageChops

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
CT = '{http://schemas.openxmlformats.org/package/2006/content-types}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def check_package(file):
    with ZipFile(file) as z:
        assert z.testzip() is None, f'{file}: ZIP CRC failed'
        names = set(z.namelist())
        assert len(names) == len(z.namelist()), 'Duplicate ZIP member'
        required = {'[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/settings.xml', 'word/fontTable.xml', 'word/numbering.xml'}
        assert required <= names, 'Missing required parts'
        trees = {name: ET.fromstring(z.read(name)) for name in names if name.endswith(('.xml', '.rels'))}
        types = trees['[Content_Types].xml']
        overrides = {node.attrib['PartName'].lstrip('/') for node in types.findall(CT + 'Override')}
        assert {name for name in names if not name.endswith('.rels') and name != '[Content_Types].xml'} <= overrides, 'Missing content type'
        for part, tree in trees.items():
            if not part.endswith('.rels'):
                continue
            base = '' if part == '_rels/.rels' else part.split('_rels/')[0]
            ids = [node.attrib['Id'] for node in tree.findall(PR + 'Relationship')]
            assert len(set(ids)) == len(ids), 'Duplicate relationship ID'
            for node in tree.findall(PR + 'Relationship'):
                target = posixpath.normpath(base + node.attrib['Target'])
                assert target in names, f'{part}: missing target {target}'
        document = trees['word/document.xml']
        assert len(document.findall('.//' + W + 'sectPr')) == 3, 'Expected cover/letter/CV sections'
        relationships = {node.attrib['Id'] for node in trees['word/_rels/document.xml.rels']}
        for node in document.iter():
            for key in (R + 'id', R + 'embed', R + 'link'):
                if key in node.attrib:
                    assert node.attrib[key] in relationships, f'Missing relationship for {node.tag}'
        assert not document.findall('.//' + W + 'txbxContent'), 'Editable content placed in text boxes'
        for control in document.findall('.//' + W + 'sdt'):
            assert not control.findall('.//' + W + 'sdt'), 'Nested controls break LibreOffice flow'
        return len([name for name in names if name.startswith('word/media/')])


def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value).replace('\u00ad', ''))


def render(file, folder):
    folder.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='docx-next-lo-') as profile:
        command = ['soffice', '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--norestore', '--convert-to', 'pdf', '--outdir', str(folder), str(file)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        assert result.returncode == 0 and not re.search(r'error|warning', result.stderr, re.I), result.stdout + result.stderr
    pdf = folder / (file.stem + '.pdf')
    assert pdf.is_file(), 'LibreOffice produced no PDF'
    return pdf


parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--fixtures', nargs='*')
parser.add_argument('--snapshots', type=Path, help='Optional approved DOCX render baseline directory')
args = parser.parse_args()
manifest = json.loads((args.directory / 'manifest.json').read_text())
for key in ['png', 'jpeg', 'icc-jpeg', 'cmyk-jpeg', 'exif-jpeg', 'large-jpeg']:
    with Image.open(args.directory / f'normalized-{key}.png') as image:
        assert max(image.size) <= 1600, f'{key}: normalized image exceeds size budget'
        rgba = image.convert('RGBA')
        red, green, blue, alpha = rgba.split()
        assert ImageChops.subtract(red, green).getextrema()[1] > 100, f'{key}: red fixture content lost'
        assert ImageChops.subtract(blue, red).getextrema()[1] > 100, f'{key}: blue fixture content lost'
        if key == 'png':
            assert alpha.getextrema()[0] == 0, 'Transparent PNG alpha lost'
        if key == 'exif-jpeg':
            assert image.size == (180, 120), 'EXIF orientation lost'
        else:
            assert abs(image.width / image.height - 2 / 3) < 0.001, f'{key}: intrinsic aspect ratio changed'
report = []
for fixture in manifest:
    key = fixture['fixture']
    if args.fixtures and key not in args.fixtures:
        continue
    file = args.directory / (key + '.docx')
    media_count = check_package(file)
    folder = args.directory / (key + '-qa')
    pdf = render(file, folder)
    document = fitz.open(pdf)
    assert len(document) >= 3, f'{key}: missing dossier part'
    assert len(document) == fixture['expectedPages'], f'{key}: expected {fixture["expectedPages"]} pages, rendered {len(document)}'
    if key == 'long-letter' or key == 'long-cv':
        assert len(document) > 3, f'{key}: long fixture did not paginate'
    elif key not in ['custom-sections']:
        assert len(document) <= 5, f'{key}: unexpected pagination {len(document)} pages'
    full_text = compact(''.join(page.get_text() for page in document))
    for text in fixture['semanticText']:
        assert compact(text) in full_text, f'{key}: missing rendered text {text[:100]}'
    image_occurrences = 0
    for index, page in enumerate(document):
        assert page.get_text().strip() or page.get_images(), f'{key}: blank page {index + 1}'
        for picture in page.get_image_info():
            image_occurrences += 1
            x0, y0, x1, y1 = picture['bbox']
            assert x0 >= -0.5 and y0 >= -0.5 and x1 <= page.rect.width + 0.5 and y1 <= page.rect.height + 0.5, f'{key}: off-page image on page {index + 1}'
        spans = []
        for block in page.get_text('dict')['blocks']:
            if block['type'] != 0:
                continue
            for line in block['lines']:
                for span in line['spans']:
                    x0, y0, x1, y1 = span['bbox']
                    if span['text'].strip(): spans.append(span)
                    assert x0 >= -0.5 and y0 >= -0.5 and x1 <= page.rect.width + 0.5 and y1 <= page.rect.height + 0.5, f'{key}: off-page text on page {index + 1}'
        for left_index, left in enumerate(spans):
            a = fitz.Rect(left['bbox'])
            for right in spans[left_index + 1:]:
                b = fitz.Rect(right['bbox'])
                intersection = a & b
                assert intersection.width < 2 or intersection.height < min(a.height, b.height) * 0.5, f'{key}: text overlap on page {index + 1}: {left["text"]} / {right["text"]}'
        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(folder / f'page-{index + 1}.png')
        if args.snapshots:
            baseline = args.snapshots / key / f'page-{index + 1}.png'
            assert baseline.is_file(), f'No approved snapshot: {baseline}'
            with Image.open(baseline) as approved, Image.open(folder / f'page-{index + 1}.png') as candidate:
                assert approved.size == candidate.size and approved.tobytes() == candidate.tobytes(), f'{key}: approved rendering changed'
    if media_count:
        assert sum(len(page.get_images()) for page in document) >= media_count, f'{key}: missing rendered image'
    assert image_occurrences == fixture['expectedImages'], f'{key}: expected {fixture["expectedImages"]} placed images, rendered {image_occurrences}'
    row = {'fixture': key, 'pages': len(document), 'media': media_count, 'bytes': fixture['bytes'], 'durationMs': fixture['durationMs'], 'structural': 'pass', 'libreoffice': 'pass', 'microsoftWord': 'pending', 'snapshot': 'candidate'}
    report.append(row)
    print(json.dumps(row), flush=True)
    document.close()
report_path = args.directory / 'render-report.json'
previous = json.loads(report_path.read_text()) if report_path.exists() else []
combined = {row['fixture']: row for row in previous}
combined.update({row['fixture']: row for row in report})
report_path.write_text(json.dumps(list(combined.values()), indent=2) + '\n')
print(f'Passed {len(report)} fixtures. Microsoft Word acceptance and snapshot approval remain pending.', flush=True)
