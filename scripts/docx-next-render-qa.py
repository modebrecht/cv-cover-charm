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


def check_package(file, expected_sections=3, next_package=True):
    with ZipFile(file) as z:
        assert z.testzip() is None, f'{file}: ZIP CRC failed'
        names = set(z.namelist())
        assert len(names) == len(z.namelist()), 'Duplicate ZIP member'
        required = {'[Content_Types].xml', '_rels/.rels', 'word/document.xml'}
        if next_package:
            required |= {'word/styles.xml', 'word/settings.xml', 'word/fontTable.xml', 'word/numbering.xml'}
        assert required <= names, 'Missing required parts'
        trees = {name: ET.fromstring(z.read(name)) for name in names if name.endswith(('.xml', '.rels'))}
        types = trees['[Content_Types].xml']
        overrides = {node.attrib['PartName'].lstrip('/') for node in types.findall(CT + 'Override')}
        defaults = {node.attrib['Extension'] for node in types.findall(CT + 'Default')}
        assert all(name in overrides or name.rsplit('.', 1)[-1] in defaults for name in names if name != '[Content_Types].xml'), 'Missing content type'
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
        assert len(document.findall('.//' + W + 'sectPr')) == expected_sections, 'Unexpected physical section count'
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


def check_columns(document, key):
    def visible_lines(page):
        for block in page.get_text('rawdict')['blocks']:
            if block['type'] != 0:
                continue
            for line in block['lines']:
                chars = [char for span in line['spans'] for char in span['chars']]
                visible = [char for char in chars if not char['c'].isspace()]
                if visible:
                    rect = fitz.Rect(visible[0]['bbox'])
                    for char in visible[1:]: rect |= fitz.Rect(char['bbox'])
                    yield ''.join(char['c'] for char in chars), rect
    count = 3 if key == 'columns-three' else 2
    before = document[1].search_for('Vor dem Spaltenabschnitt')[0]
    after_page, after = next((page, page.search_for('Nach dem Spaltenabschnitt')[0])
                            for page in document if page.search_for('Nach dem Spaltenabschnitt'))
    left = before.x0
    # Brief fixture margins are 20 mm; physical Word column gap is 5 mm.
    full_width = document[1].rect.width - 2 * left
    gap = 5 * 72 / 25.4
    width = (full_width - (count - 1) * gap) / count
    starts = [left + index * (width + gap) for index in range(count)]
    assert abs(after.x0 - left) < 1, f'{key}: full-width flow did not resume'
    seen = set()
    for page in document[1:after_page.number + 1]:
        for text, rect in visible_lines(page):
            if page.number == 1 and rect.y0 < before.y1:
                continue
            if page.number == after_page.number and rect.y1 > after.y0:
                continue
            # Footer/header content is excluded by matching a known fixture sentence.
            if not any(fragment in text for fragment in ('Native', 'Spalten', 'Aufgaben', 'sorgfältig', 'Neues', 'zuverlässig', 'editierbar', 'gerne', 'Ä ö ü', 'é è à')):
                continue
            column = min(range(count), key=lambda index: abs(rect.x0 - starts[index]))
            assert abs(rect.x0 - starts[column]) < 1, f'{key}: column start shifted'
            assert rect.x1 <= starts[column] + width + 1, f'{key}: text crossed its column'
            seen.add(column)
    assert seen == set(range(count)), f'{key}: one or more columns did not render'
    for page, marker in [(document[1], 'Vor dem Spaltenabschnitt'), (after_page, 'Nach dem Spaltenabschnitt')]:
        lines = [rect for text, rect in visible_lines(page) if marker in text]
        assert lines and lines[0].width > width + 10, f'{key}: normal paragraph retained column width'
    if key.endswith('chrome'):
        assert 'lea.mueller@example.ch' in document[1].get_text(), f'{key}: first-page contact header missing'
        for page in document[1:after_page.number + 1]:
            assert 'Letter header' in page.get_text(), f'{key}: logical letter header lost'
            assert 'CV header' not in page.get_text(), f'{key}: CV header leaked into letter'
            if page.number > 1:
                assert 'lea.mueller@example.ch' not in page.get_text(), f'{key}: first-page contact repeated'
        assert 'CV header' in document[after_page.number + 1].get_text(), f'{key}: CV header not restored'


def check_semantic_text(document, fixture):
    key = fixture['fixture']
    full_text = compact(''.join(page.get_text() for page in document))
    body_text = ''
    start = 0
    for part in fixture.get('parts', []):
        part_text = ''
        for page in document[start:start + part['expectedPages']]:
            margins = part['contentBoxMm']
            # Allow for font ascender bounds at the native body boundary; exclude
            # running chrome so it cannot interrupt a paragraph crossing pages.
            clip = fitz.Rect(0, max(0, (margins['top'] - 3) * 72 / 25.4),
                             page.rect.width, min(page.rect.height, page.rect.height - (margins['bottom'] - 3) * 72 / 25.4))
            part_text += page.get_text(clip=clip)
        part_text = compact(part_text)
        for text in part['semanticText']:
            assert compact(text) in part_text, f'{key}: missing {part["id"]} body text {text[:100]}'
        body_text += part_text
        start += part['expectedPages']
    if fixture.get('parts'):
        assert start == len(document), f'{key}: incorrect logical part page count'
    for text in fixture['semanticText']:
        assert compact(text) in full_text or compact(text) in body_text, f'{key}: missing rendered text {text[:100]}'


def render(file, folder, format='pdf'):
    folder.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='docx-next-lo-') as profile:
        command = ['soffice', '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--norestore', '--convert-to', format, '--outdir', str(folder), str(file)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        assert result.returncode == 0 and not re.search(r'error|warning', result.stderr, re.I), result.stdout + result.stderr
    result_file = folder / (file.stem + ('.pdf' if format == 'pdf' else '.docx'))
    assert result_file.is_file(), f'LibreOffice produced no {format} output'
    return result_file


def check_custom_footers(document, key):
    if not key.startswith('chrome-custom'):
        return
    for index, page in enumerate(document[1:], start=2):
        footer = page.get_text(clip=fitz.Rect(0, page.rect.height - 60, page.rect.width, page.rect.height))
        assert compact(footer).count(compact('Wiederholter Text')) == 2, f'{key}: missing custom footer on page {index}'


parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--fixtures', nargs='*')
parser.add_argument('--roundtrip', action='store_true', help='Save as DOCX in LibreOffice, reopen and repeat text/column/page-count checks')
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
    media_count = check_package(file, fixture.get('expectedSections', 3))
    folder = args.directory / (key + '-qa')
    pdf = render(file, folder)
    document = fitz.open(pdf)
    assert len(document) >= 3, f'{key}: missing dossier part'
    assert len(document) == fixture['expectedPages'], f'{key}: expected {fixture["expectedPages"]} pages, rendered {len(document)}'
    if key in ('long-letter', 'long-cv', 'photo-long-cv') or key.startswith('columns-long'):
        assert len(document) > 3, f'{key}: long fixture did not paginate'
    elif key not in ['custom-sections']:
        assert len(document) <= 5, f'{key}: unexpected pagination {len(document)} pages'
    check_semantic_text(document, fixture)
    check_custom_footers(document, key)
    if key.startswith('columns-'):
        check_columns(document, key)
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
    if key.startswith('photo-'):
        pictures = document[2].get_image_info()
        assert len(pictures) == 1, f'{key}: photo must occur once on the first CV page'
        bounds = fitz.Rect(pictures[0]['bbox'])
        expected_width = 35 * 72 / 25.4
        expected_height = expected_width * (1 if key == 'photo-circle' else 1.25)
        assert abs(bounds.width - expected_width) < 1 and abs(bounds.height - expected_height) < 1, f'{key}: frame dimensions lost during rendering'
        if key == 'photo-free':
            assert abs(bounds.x0 - 155 * 72 / 25.4) < 1 and abs(bounds.y0 - 25 * 72 / 25.4) < 1, 'Page-relative placement lost'
        # Check rendered page pixels rather than the unmodified reusable media asset.
        raster = document[2].get_pixmap(matrix=fitz.Matrix(2, 2), clip=bounds)
        pixels = Image.frombytes('RGB', [raster.width, raster.height], raster.samples)
        channels = pixels.tobytes()
        red = blue = 0
        for r, g, b in zip(channels[0::3], channels[1::3], channels[2::3]):
            red += r > 150 and r > g * 2 and r > b * 1.5
            blue += b > 150 and b > r * 1.5
        assert red and blue, f'{key}: cropped picture content disappeared'
        if key == 'photo-zoom':
            assert red / (red + blue) > 0.65, 'Zoom/pan crop was not applied to the Word picture'
        if key == 'photo-circle':
            assert all(channel > 240 for channel in pixels.getpixel((5, 5))), 'Circular picture clipping was lost'
    if args.roundtrip:
        saved = render(file, folder / 'roundtrip', 'docx:Office Open XML Text')
        # Other editors may remove unused optional parts such as numbering.xml.
        check_package(saved, fixture.get('expectedSections', 3), next_package=False)
        reopened_pdf = render(saved, folder / 'roundtrip-pdf')
        with fitz.open(reopened_pdf) as reopened:
            assert len(reopened) == len(document), f'{key}: save/reopen changed pagination'
            check_semantic_text(reopened, fixture)
            check_custom_footers(reopened, key)
            if key.startswith('columns-'):
                check_columns(reopened, key)
    row = {'fixture': key, 'pages': len(document), 'media': media_count, 'bytes': fixture['bytes'], 'durationMs': fixture['durationMs'], 'structural': 'pass', 'libreoffice': 'pass', 'libreofficeRoundtrip': 'pass' if args.roundtrip else 'notRun', 'microsoftWord': 'pending', 'snapshot': 'candidate'}
    report.append(row)
    print(json.dumps(row), flush=True)
    document.close()
report_path = args.directory / 'render-report.json'
previous = json.loads(report_path.read_text()) if report_path.exists() else []
combined = {row['fixture']: row for row in previous}
combined.update({row['fixture']: row for row in report})
report_path.write_text(json.dumps(list(combined.values()), indent=2) + '\n')
print(f'Passed {len(report)} fixtures. Microsoft Word acceptance and snapshot approval remain pending.', flush=True)
