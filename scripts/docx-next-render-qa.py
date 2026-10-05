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
        numbering = trees.get('word/numbering.xml')
        if numbering is not None:
            abstract_ids = [node.attrib[W + 'abstractNumId'] for node in numbering.findall(W + 'abstractNum')]
            assert len(set(abstract_ids)) == len(abstract_ids), 'Duplicate abstract numbering ID'
            num_ids = [node.attrib[W + 'numId'] for node in numbering.findall(W + 'num')]
            assert len(set(num_ids)) == len(num_ids), 'Duplicate numbering instance ID'
            for node in numbering.findall(W + 'num'):
                assert node.find(W + 'abstractNumId').attrib[W + 'val'] in abstract_ids, 'Missing abstract numbering definition'
            for part, tree in trees.items():
                if part.startswith('word/') and part.endswith('.xml'):
                    for node in tree.findall('.//' + W + 'numPr/' + W + 'numId'):
                        assert node.attrib[W + 'val'] == '0' or node.attrib[W + 'val'] in num_ids, f'{part}: missing numbering instance'
        for part, tree in trees.items():
            if not part.startswith('word/') or not part.endswith('.xml'):
                continue
            folder, name = part.rsplit('/', 1)
            rels = trees.get(f'{folder}/_rels/{name}.rels')
            relationships = {node.attrib['Id'] for node in rels} if rels is not None else set()
            for node in tree.iter():
                for key in (R + 'id', R + 'embed', R + 'link'):
                    if key in node.attrib:
                        assert node.attrib[key] in relationships, f'{part}: missing relationship for {node.tag}'
        assert not document.findall('.//' + W + 'txbxContent'), 'Editable content placed in text boxes'
        for control in document.findall('.//' + W + 'sdt'):
            assert not control.findall('.//' + W + 'sdt'), 'Nested controls break LibreOffice flow'
        return len([name for name in names if name.startswith('word/media/')])


def compact(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value).replace('\u00ad', ''))


def check_fonts(document, fixture):
    start = 0
    for part in fixture['parts']:
        spans = [span for page in document[start:start + part['expectedPages']] for block in page.get_text('dict')['blocks'] if block['type'] == 0 for line in block['lines'] for span in line['spans']]
        for probe in part.get('fontProbes', []):
            matches = [span for span in spans if compact(span['text']) == compact(probe['text'])]
            assert len(matches) == 1, f'Font fixture lost unique probe {probe["text"]}'
            family = re.sub(r'[^a-z]', '', probe['font'].lower())
            actual = re.sub(r'[^a-z]', '', matches[0]['font'].lower())
            assert actual.startswith(family), f'Unavailable font did not use selected alternative: {probe["font"]} / {matches[0]["font"]}'
        start += part['expectedPages']


def text_variants(value):
    if isinstance(value, str):
        return [compact(value)]
    text = compact(value['text'])
    return [text, text.upper()] if value.get('allCaps') else [text]


def check_columns(document, fixture):
    key = fixture['fixture']
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
        letter_start = fixture['parts'][0]['expectedPages']
        cv_start = letter_start + fixture['parts'][1]['expectedPages']
        for page in document[letter_start:cv_start]:
            assert 'Letter header' in page.get_text(), f'{key}: logical letter header lost'
            assert 'CV header' not in page.get_text(), f'{key}: CV header leaked into letter'
            if page.number > 1:
                assert 'lea.mueller@example.ch' not in page.get_text(), f'{key}: first-page contact repeated'
        assert 'CV header' in document[cv_start].get_text(), f'{key}: CV header not restored'


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
            assert any(variant in part_text for variant in text_variants(text)), f'{key}: missing {part["id"]} body text {str(text)[:100]}'
        body_text += part_text
        start += part['expectedPages']
    if fixture.get('parts'):
        assert start == len(document), f'{key}: incorrect logical part page count'
    for text in fixture['semanticText']:
        assert any(variant in full_text or variant in body_text for variant in text_variants(text)), f'{key}: missing rendered text {str(text)[:100]}'


def check_entry_attachment(document, fixture):
    start = 0
    for part in fixture['parts']:
        pages = document[start:start + part['expectedPages']]
        for probe in part.get('entryProbes', []):
            titles = [(page, box) for page in pages for box in page.search_for(probe['title'])]
            # Repeated user values cannot identify one QA entry. Unique fixture
            # probes measure output only; renderer identity never uses this.
            if len(titles) != 1:
                continue
            page, title = titles[0]
            descriptions = page.search_for(probe['descriptionStart'])
            assert any(title.y0 < box.y0 < title.y1 + 60 for box in descriptions), f'{fixture["fixture"]}: entry description detached from {probe["title"]}'
        start += part['expectedPages']


def check_cv_composition(document, fixture):
    start = 0
    for part in fixture['parts']:
        pages = document[start:start + part['expectedPages']]
        for probe in part.get('dateRailProbes', []):
            dates = [(index, box) for index, page in enumerate(pages) for box in page.search_for(probe['date'])]
            titles = [(index, box) for index, page in enumerate(pages) for box in page.search_for(probe['title'])]
            # Deliberately unique fixture probes only; user field identity is
            # resolved in the model, never by this render QA measurement.
            if len(dates) != 1 or len(titles) != 1:
                continue
            date_page, date = dates[0]
            title_page, title = titles[0]
            assert date_page == title_page and abs(date.y0 - title.y0) < 12, f'{fixture["fixture"]}: date detached from native entry title'
            expected = probe['distanceMm'] * 72 / 25.4
            assert abs((title.x0 - date.x0) - expected) < 2, f'{fixture["fixture"]}: fixed date track changed width'
        pagination = part.get('pagination')
        if pagination:
            first = pages[0].search_for(part['firstBodyText'])
            expected = (part['contentBoxMm']['top'] + pagination['firstPageLeadMm']) * 72 / 25.4
            assert any(expected - 2 <= box.y0 <= expected + 18 for box in first), f'{fixture["fixture"]}: first-page margin/spacer lost'
            if len(pages) > 1:
                lines = [span['bbox'][1] for block in pages[1].get_text('dict')['blocks'] if 'lines' in block for line in block['lines'] for span in line['spans'] if span['text'].strip()]
                # Running chrome is excluded from the body by its reservation.
                top = part['contentBoxMm']['top'] * 72 / 25.4
                body = [y for y in lines if y >= top - 2]
                assert body and min(body) < top + 35, f'{fixture["fixture"]}: continuation margin/spacer repeated'
        start += part['expectedPages']


def render(file, folder, format='pdf'):
    folder.mkdir(exist_ok=True)
    result_file = folder / (file.stem + ('.pdf' if format == 'pdf' else '.docx'))
    assert result_file.resolve() != file.resolve(), 'QA must never overwrite its source'
    # Isolate converter output as well as the user profile. Existing render
    # evidence must not affect export or be mistaken for a fresh successful file.
    with tempfile.TemporaryDirectory(prefix='docx-next-lo-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-convert-') as output:
        if args.libreofficekit:
            command = [args.libreofficekit, Path(profile).as_uri(), file.resolve().as_uri(),
                       (Path(output) / result_file.name).as_uri(), format.split(':', 1)[0]]
        else:
            command = [args.soffice, '-env:UserInstallation=' + Path(profile).as_uri(), '--invisible', '--headless', '--norestore', '--convert-to', format, '--outdir', output, str(file.resolve())]
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        assert result.returncode == 0 and not re.search(r'error|warning', result.stderr, re.I), f'LibreOffice conversion failed (exit {result.returncode}, {command[0]}):\n' + result.stdout + result.stderr
        converted = Path(output) / result_file.name
        assert converted.is_file(), f'LibreOffice produced no new {format}'
        converted.replace(result_file)
    assert result_file.is_file(), f'LibreOffice produced no {format} output'
    return result_file


def check_presentation(document, fixture):
    key = fixture['fixture']
    if not key.startswith('layout-'):
        return
    cv = document[2:]
    def locate(text):
        matches = [(index, box) for index, page in enumerate(cv) for box in page.search_for(text)]
        assert len(matches) == 1, f'{key}: missing/ambiguous presentation probe {text}'
        return matches[0]
    values = [locate(text) for text in ['14.03.1990', 'Geburtsort Zürich', 'Heimatort Bern', 'Nationalität Schweiz']]
    xs = [box.x0 for _, box in values]
    if key == 'layout-contact-plain':
        assert max(xs) - min(xs) > 10, f'{key}: plain values unexpectedly aligned'
    else:
        assert max(xs) - min(xs) < 1, f'{key}: aligned value column drifted'
    references = [locate('Referenz ' + value) for value in ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon']]
    if key == 'layout-references-stacked':
        assert max(box.x0 for _, box in references) - min(box.x0 for _, box in references) < 1
        assert all((a[0], a[1].y0) < (b[0], b[1].y0) for a, b in zip(references, references[1:])), f'{key}: stacked reference order lost'
    elif key != 'layout-settings-long':
        for left, right in [references[:2], references[2:4]]:
            assert left[0] == right[0] and abs(left[1].y0 - right[1].y0) < 1, f'{key}: paired reference rows drifted'
            assert right[1].x0 - left[1].x0 > 180, f'{key}: paired widths lost'
        assert references[-1][1].x0 == references[0][1].x0, f'{key}: odd reference moved to right cell'
    if key in ['layout-rubrics-positive', 'layout-rubrics-short']:
        assert any(path['fill'] and path['rect'].width > 20 for page in cv for path in page.get_drawings()), f'{key}: native heading badge missing'
    if key == 'layout-rubrics-short':
        rules = [path['rect'] for page in cv for path in page.get_drawings() if path['color'] and path['rect'].height < 1 and abs(path['rect'].width - 18 * 72 / 25.4) < 1]
        assert len(rules) >= 3, f'{key}: short native rules missing'
    if key == 'layout-letter-rules':
        lines = {(round(path['rect'].x0), round(path['rect'].y0)) for path in document[1].get_drawings() if path['color'] and path['rect'].height < 1 and path['rect'].width > 400}
        assert len(lines) == 3, f'{key}: sender/recipient/subject separator lost'


def check_presentation_offsets(directory, roundtrip):
    keys = ['layout-contact-aligned', 'layout-rubrics-positive', 'layout-rubrics-negative']
    def values(key, reopened):
        folder = directory / (key + '-qa')
        if reopened:
            folder /= 'roundtrip-pdf'
        file = folder / (key + '.pdf')
        if not file.exists():
            return None
        with fitz.open(file) as document:
            page = document[2]
            # Largest Kontakt occurrence is the semantic heading, not contact values.
            heading = max(page.search_for('Kontakt'), key=lambda box: box.height)
            return heading, page.search_for('14.03.1990')[0]
    for reopened in ([False, True] if roundtrip else [False]):
        probes = [values(key, reopened) for key in keys]
        if any(probe is None for probe in probes):
            continue
        baseline, positive, negative = probes
        mm = 72 / 25.4
        assert abs(positive[0].x0 - baseline[0].x0 - 6 * mm) < 1, 'Positive native heading offset lost'
        assert abs(negative[0].x0 - baseline[0].x0 + 6 * mm) < 1, 'Negative native heading offset lost'
        # Value table shrinks with indent, so a 30% label column moves by 70% of it.
        assert abs(positive[1].x0 - baseline[1].x0 - 12 * mm * .7) < 1, 'Native content indent lost'
        assert positive[0].y0 > negative[0].y0 + 20, 'Native section gap lost'


def check_custom_footers(document, key):
    if not key.startswith(('chrome-custom', 'offsets-')):
        return
    for index, page in enumerate(document[1:], start=2):
        footer = page.get_text(clip=fitz.Rect(0, page.rect.height - 100, page.rect.width, page.rect.height))
        assert compact(footer).count(compact('Wiederholter Text')) == 2, f'{key}: missing custom footer on page {index}'


def check_artwork(document, fixture):
    start = 0
    scale = 72 / 25.4
    for part in fixture.get('parts', []):
        artwork = part.get('artwork', [])
        for relative_page, page in enumerate(document[start:start + part['expectedPages']]):
            scoped_artwork = [paint for paint in artwork if paint.get('repeat') in (None, 'first' if relative_page == 0 else 'continuation')]
            if not scoped_artwork:
                continue
            pixmap = page.get_pixmap()
            for target in scoped_artwork:
                x, y = 1, target['yMm'] + target['heightMm'] / 2
                # A full-page paper layer may be covered by a declared edge rail.
                # Probe exposed paper, while the separate shape guard checks every overlay.
                if target['id'].endswith('.artwork.paper'):
                    overlays = [shape for shape in part.get('pageScopedShapes', [])
                                if shape.get('repeat') in (None, 'first' if relative_page == 0 else 'continuation')]
                    candidates = [1, page.rect.width / scale - 1, page.rect.width / scale / 2]
                    exposed = [px for px in candidates if not any(
                        shape['xMm'] <= px < shape['xMm'] + shape['widthMm'] and
                        shape['yMm'] <= y < shape['yMm'] + shape['heightMm'] for shape in overlays)]
                    assert exposed, f'{fixture["fixture"]}: no exposed paper probe; declare a pixel probe for fully covered paper'
                    x = exposed[0]
                layers = [paint for paint in scoped_artwork if paint['xMm'] <= x < paint['xMm'] + paint['widthMm'] and paint['yMm'] <= y < paint['yMm'] + paint['heightMm']]
                assert layers, 'Artwork sample outside known rectangle'
                paint = layers[-1]
                ratio = (y - paint['yMm']) / paint['heightMm']
                fill = paint['fill']
                rgb = lambda value: tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))
                first, last = rgb(fill['color']), rgb(fill.get('endColor', fill['color']))
                expected = tuple(round(a + (b - a) * ratio) for a, b in zip(first, last))
                actual = pixmap.pixel(round(x * scale), round(y * scale))[:3]
                assert max(abs(a - b) for a, b in zip(actual, expected)) <= 4, f'{fixture["fixture"]}: missing/incorrect {paint["id"]} on page {page.number + 1}: {actual} != {expected}'
        start += part['expectedPages']



def check_scoped_shapes(document, fixture):
    start = 0
    scale = 72 / 25.4
    for part in fixture['parts']:
        for relative_page, page in enumerate(document[start:start + part['expectedPages']]):
            pictures = page.get_image_info()
            groups = {}
            # Distinct paint layers can share a rectangle (e.g. a tint above a band).
            # Count every declared paint layer so bounds do not confuse its ownership.
            for shape in [*part.get('pageScopedShapes', []), *part.get('artwork', [])]:
                x, y = max(0, shape['xMm']), max(0, shape['yMm'])
                right = min(page.rect.width / scale, shape['xMm'] + shape['widthMm'])
                bottom = min(page.rect.height / scale, shape['yMm'] + shape['heightMm'])
                bounds = [value * scale for value in (x, y, right, bottom)]
                expected = shape.get('repeat') in (None, 'first' if relative_page == 0 else 'continuation')
                group = groups.setdefault(tuple(round(v, 4) for v in bounds), {'count': 0, 'ids': []})
                group['count'] += int(expected)
                group['ids'].append(shape['id'])
            for bounds, group in groups.items():
                matches = [picture for picture in pictures if max(abs(a-b) for a,b in zip(picture['bbox'],bounds)) < 1]
                assert len(matches) == group['count'], f'{fixture["fixture"]}: incorrect clipped/scoped paint {group["ids"]} on page {relative_page+1}'
        start += part['expectedPages']

def check_paint_probes(document, fixture):
    """Independent color/opacity probes verify declared polygon paint and transparent regions."""
    start, scale = 0, 72 / 25.4
    rgb = lambda value: tuple(int(value.lstrip('#')[i:i+2], 16) for i in (0, 2, 4))
    for part in fixture['parts']:
        for relative_page, page in enumerate(document[start:start + part['expectedPages']]):
            pixmap = page.get_pixmap()
            for probe in part.get('paintProbes') or []:
                if probe.get('repeat') not in (None, 'first' if relative_page == 0 else 'continuation'):
                    continue
                foreground = rgb(probe['color'])
                background = rgb(probe.get('backdrop', probe['color']))
                alpha = probe.get('opacity', 1)
                expected = tuple(round(a * alpha + b * (1-alpha)) for a,b in zip(foreground, background))
                actual = pixmap.pixel(round(probe['xMm'] * scale), round(probe['yMm'] * scale))[:3]
                assert max(abs(a-b) for a,b in zip(actual, expected)) <= 4, f'{fixture["fixture"]}: declared paint lost on {part["id"]} page {relative_page+1}: {actual} != {expected}'
        start += part['expectedPages']

def check_letter_tail(document, fixture):
    start = 0
    for part in fixture['parts']:
        probe = part.get('tailProbe')
        if probe and probe['closing'] and probe['lastAttachment']:
            texts = [compact(page.get_text()) for page in document[start:start + part['expectedPages']]]
            closing = [i for i,t in enumerate(texts) if compact(probe['closing']) in t]
            attachments = [i for i,t in enumerate(texts) if compact(probe['lastAttachment']) in t]
            assert len(closing) == 1 and closing[0] in attachments, f'{fixture["fixture"]}: short closing/attachment tail split across pages'
        start += part['expectedPages']

def check_header_paint_coverage(document, fixture):
    """Authored header ink stays on its declared paint, including wrapped contact lines."""
    start, scale = 0, 72 / 25.4
    for part in fixture['parts']:
        for relative_page, page in enumerate(document[start:start + part['expectedPages']]):
            repeat = 'first' if relative_page == 0 else 'continuation'
            colors = {int(c, 16) for c in part.get('headerPaintColors', {}).get(repeat, [])}
            bands = [p for p in part.get('artwork', [])
                     if ('.artwork.band.' in p['id'] or p['id'].endswith('.artwork.header'))
                     and p.get('repeat') in (None, repeat)]
            if not colors or not bands:
                continue
            bounds = [fitz.Rect(p['xMm'] * scale, p['yMm'] * scale,
                       (p['xMm'] + p['widthMm']) * scale, (p['yMm'] + p['heightMm']) * scale)
                      for p in bands]
            limit = max(part['contentBoxMm']['top'] * scale, *(b.y1 for b in bounds))
            spans = [s for b in page.get_text('dict')['blocks'] if 'lines' in b
                     for line in b['lines'] for s in line['spans']
                     if s['text'].strip() and s['color'] in colors and s['bbox'][1] < limit]
            assert spans, f'{fixture["fixture"]}: missing painted header ink on {part["id"]} page {relative_page+1}'
            for span in spans:
                rect = fitz.Rect(span['bbox'])
                assert any(fitz.Rect(b.x0-0.5,b.y0-0.5,b.x1+0.5,b.y1+0.5).contains(rect) for b in bounds), \
                    f'{fixture["fixture"]}: header ink outside its paint on {part["id"]} page {relative_page+1}: {span["text"]}'
        start += part['expectedPages']

def comparison_paths(directory, keys, saved):
    initial = {key: directory / (key + '-qa') / (key + '.pdf') for key in keys}
    if not all(path.is_file() for path in initial.values()):
        return None  # A deliberately selected fixture subset need not contain both probes.
    paths = {key: path.parent / 'roundtrip-pdf' / path.name if saved else path for key, path in initial.items()}
    assert all(path.is_file() for path in paths.values()), 'Missing saved comparison rendering'
    return paths


def check_offset_distances(manifest, directory, roundtrip):
    keys = ['offsets-negative', 'offsets-zero', 'offsets-positive']
    fixtures = {fixture['fixture']: fixture for fixture in manifest if fixture['fixture'] in keys}
    if len(fixtures) != 3:
        return
    for saved in ([False, True] if roundtrip else [False]):
        paths = comparison_paths(directory, keys, saved)
        if paths is None:
            continue
        measurements = {}
        for key in keys:
            with fitz.open(paths[key]) as doc:
                part = fixtures[key]['parts'][1]
                repeated = doc[1].search_for('Wiederholter Text')
                measurements[key] = (min(rect.y0 for rect in repeated), max(rect.y0 for rect in repeated), doc[1].search_for(part['recipientText'])[0].y0)
        baseline = fixtures['offsets-zero']['parts'][1]
        for key in (keys[0], keys[2]):
            part = fixtures[key]['parts'][1]
            expected = [part['headerDistanceMm'] - baseline['headerDistanceMm'],
                        baseline['footerDistanceMm'] - part['footerDistanceMm'],
                        part['recipientGapMm'] - baseline['recipientGapMm'] + part['contentBoxMm']['top'] - baseline['contentBoxMm']['top']]
            actual = [a - b for a, b in zip(measurements[key], measurements['offsets-zero'])]
            assert all(abs(a - b * 72 / 25.4) < 1 for a, b in zip(actual, expected)), f'{key}: signed offsets did not move native content by the declared distance; saved={saved}, actual={actual}, expectedMm={expected}'


def check_cover_features(document, fixture):
    key = fixture['fixture']
    if key == 'cover-typography':
        assert compact('ÉVA MÜLLER') in compact(document[0].get_text()), 'Cover caps did not render as uppercase'
    if key not in ('cover-lists', 'cover-long-list'):
        return
    cover_pages = fixture['parts'][0]['expectedPages']
    text = compact(''.join(page.get_text() for page in document[:cover_pages]))
    for number, name in [(1, 'Neue Liste Eins'), (2, 'Neue Liste Zwei')]:
        assert compact(f'{number}. {name}') in text, f'{key}: independent cover list did not restart'
    if key == 'cover-lists':
        for number, name in [(1, 'Beilage Eins'), (2, 'Beilage Zwei'), (3, 'Beilage Drei')]:
            assert compact(f'{number}. {name}') in text, 'Cover list counter or empty-item handling failed'
    else:
        for number in range(1, 56):
            assert compact(f'{number}. Unterlage {number}:') in text, 'Long cover list lost counter/content during reflow'
    letter = compact(document[cover_pages].get_text())
    for number, name in [(1, 'Letter list one'), (2, 'Letter list two')]:
        assert compact(f'{number}. {name}') in letter, 'Letter list inherited a cover counter'
    for number, name in [(1, 'Second letter list one'), (1, 'Left cell one'), (2, 'Left cell two'), (1, 'Right cell one'), (2, 'Right cell two')]:
        assert compact(f'{number}. {name}') in letter, 'Separated letter or table-cell list did not restart'


def check_element_features(document, fixture):
    if not fixture['fixture'].startswith('elements-'):
        return
    start = 0
    scale = 72 / 25.4
    for part in fixture['parts']:
        # Measure known fixture border paths to catch adjacent-table merging.
        expected_edges = {}
        for box in part.get('flowBoxes', []):
            width = round(box['widthMm'], 2)
            expected_edges[width] = expected_edges.get(width, 0) + 2
        for width, count in expected_edges.items():
            edges = set()
            for page_index in range(start, start + part['expectedPages']):
                for drawing in document[page_index].get_drawings():
                    if drawing.get('fill') or not drawing.get('color'):
                        continue
                    for item in drawing['items']:
                        if item[0] == 'l':
                            a, b = item[1], item[2]
                            if abs(a.y - b.y) < 0.1 and abs(abs(a.x - b.x) - width * scale) < 1.5:
                                edges.add((page_index, round(a.y, 1), round(min(a.x, b.x), 1)))
            assert len(edges) >= count, f'{part["id"]}: adjacent boxes lost {width}mm borders/width: {len(edges)} < {count}'
        paper = next((paint['fill']['color'] for paint in part.get('artwork', []) if paint['id'].endswith('.paper')), 'FFFFFF')
        background = tuple(int(paper[index:index + 2], 16) for index in (0, 2, 4))
        for shape in part.get('shapes', []):
            page = document[start + shape['expectedRelativePage']]
            expected = fitz.Rect(shape['xMm'] * scale, shape['yMm'] * scale,
                                 (shape['xMm'] + shape['widthMm']) * scale,
                                 (shape['yMm'] + shape['heightMm']) * scale)
            matches = [info for info in page.get_image_info() if all(abs(a - b) < 0.8 for a, b in zip(info['bbox'], expected))]
            assert len(matches) == 1, f'{shape["id"]}: missing/wrong page-relative body artwork'
            # Fixture artwork sits in the left margin, away from editable text.
            pixels = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            def sample(x, y):
                return pixels.pixel(round(x * scale * 2), round(y * scale * 2))[:3]
            x, y = shape['xMm'], shape['yMm']
            if shape['shape'] == 'rect':
                rgb = sample(x + shape['widthMm'] / 2, y + shape['heightMm'] / 2)
                blended = tuple(round(a * shape['opacity'] + b * (1 - shape['opacity'])) for a, b in zip((204, 102, 0), background))
                assert all(abs(a - b) < 6 for a, b in zip(rgb, blended)), f'{shape["id"]}: fill/opacity lost: {rgb}'
            elif shape['shape'] == 'circle':
                left, right = sample(x + 3, y + 7), sample(x + 11, y + 7)
                assert left[0] > 180 and left[2] < 70 and right[2] > 180 and right[0] < 70, f'{shape["id"]}: gradient angle/stops lost: {left}/{right}'
                assert all(abs(a - b) < 6 for a, b in zip(sample(x + 0.5, y + 0.5), background)), f'{shape["id"]}: transparent circular corner lost'
            elif shape['shape'] == 'line':
                rgb = sample(x + 7, y + 0.4)
                assert all(abs(a - b) < 6 for a, b in zip(rgb, (34, 153, 34))), f'{shape["id"]}: line color/thickness lost'
            elif shape['shape'] == 'path':
                rgb = sample(x + 7, y + shape['heightMm'] * 0.75)
                assert rgb[0] > 120 and rgb[1] < 100 and rgb[2] > 120, f'{shape["id"]}: freehand stroke lost: {rgb}'
        start += part['expectedPages']
    if fixture['fixture'] == 'elements-page-two':
        assert 'Eigenes Feld' in document[3].get_text() and 'Zweite CV-Zone' in document[3].get_text(), 'Custom/section page-two boundaries produced a blank or duplicate break'


def fixture_line_bounds(page, text):
    # Large native tracking makes PDF extraction insert spaces between glyphs.
    # Measure the known QA line's original character boxes, without a word-search assumption.
    matches = []
    for block in page.get_text('rawdict')['blocks']:
        if block['type'] != 0:
            continue
        for line in block['lines']:
            chars = [char for span in line['spans'] for char in span['chars']]
            if compact(''.join(char['c'] for char in chars)) == compact(text):
                boxes = [fitz.Rect(char['bbox']) for char in chars if char['c'].strip()]
                bounds = boxes[0]
                for box in boxes[1:]:
                    bounds |= box
                matches.append(bounds)
    assert len(matches) == 1, f'Expected one fixture line: {text}; found {len(matches)}'
    return matches[0]


def check_cover_spacing(directory, roundtrip):
    for saved in ([False, True] if roundtrip else [False]):
        keys = ('cover-tracking-zero', 'cover-tracking-wide')
        paths = comparison_paths(directory, keys, saved)
        if paths is not None:
            widths = []
            for key in keys:
                with fitz.open(paths[key]) as doc:
                    widths.append(fixture_line_bounds(doc[0], 'Tracking Probe').width)
            assert widths[1] - widths[0] > 40, f'Native cover tracking did not visibly expand text; saved={saved}: {widths}'
        keys = ('cover-line-single', 'cover-line-double')
        paths = comparison_paths(directory, keys, saved)
        if paths is not None:
            spacing = []
            for key in keys:
                with fitz.open(paths[key]) as doc:
                    spacing.append(fixture_line_bounds(doc[0], 'Line Probe Two').y0 - fixture_line_bounds(doc[0], 'Line Probe One').y0)
            assert spacing[1] > spacing[0] * 1.7, f'Native cover line spacing did not transfer; saved={saved}: {spacing}'


def check_native_opacity(document, fixture):
    if fixture['fixture'] != 'opacity-native':
        return
    cover = document[0]
    names = [span for block in cover.get_text('dict')['blocks'] if block['type'] == 0
             for line in block['lines'] for span in line['spans'] if span['text'] == 'Lea Müller']
    assert len(names) == 1 and names[0]['color'] == 0x787878, 'Editable text opacity/paper compositing lost'


parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--fixtures', nargs='*')
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice', help='Explicit LibreOffice executable/wrapper; version is recorded, never implicitly approved')
renderer.add_argument('--libreofficekit', help='Explicit QA-only LibreOfficeKit adapter from docx-next-lo-kit-setup.py')
parser.add_argument('--require-stable', action='store_true', help='Reject LibreOfficeDev/alpha/beta/RC builds')
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
executable = args.libreofficekit or args.soffice
interface = 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI'
with tempfile.TemporaryDirectory(prefix='docx-next-lo-version-') as profile:
    version_command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(version_command, capture_output=True, text=True, timeout=30)
assert version.returncode == 0 and version.stdout.strip(), 'LibreOffice version query failed: ' + version.stderr
if args.libreofficekit:
    info = json.loads(version.stdout)
    lo_version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
else:
    lo_version = version.stdout.strip()
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', lo_version, re.I), 'Stable LibreOffice required; available renderer is ' + lo_version
print(json.dumps({'libreOfficeVersion': lo_version, 'libreOfficeInterface': interface, 'executable': executable}), flush=True)
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
    if key.startswith(('warm-', 'prism-', 'human-', 'orbit-', 'cove-', 'glow-', 'horizon-', 'monoLuxe-', 'ledger-', 'ribbon-', 'sunrise-')) and any(part['expectedPages'] > 2 for part in fixture['parts']):
        assert len(document) > 3, f'{key}: long fixture did not paginate'
    elif key in ('long-letter', 'long-cv', 'photo-long-cv', 'paint-long-letter', 'paint-long-cv', 'layout-settings-long', 'layout-entry-overflow') or key.startswith('columns-long') or key.startswith('pagination-') or (key.startswith('variant-') and key.endswith('-long')):
        assert len(document) > 3, f'{key}: long fixture did not paginate'
    elif key not in ['custom-sections', 'cover-long-list', 'elements-long', 'fonts-long-letter', 'fonts-long-cv']:
        assert len(document) <= 5, f'{key}: unexpected pagination {len(document)} pages'
    check_semantic_text(document, fixture)
    check_entry_attachment(document, fixture)
    check_cv_composition(document, fixture)
    check_fonts(document, fixture)
    check_custom_footers(document, key)
    check_artwork(document, fixture)
    check_scoped_shapes(document, fixture)
    check_paint_probes(document, fixture)
    check_letter_tail(document, fixture)
    check_header_paint_coverage(document, fixture)
    check_cover_features(document, fixture)
    check_element_features(document, fixture)
    check_native_opacity(document, fixture)
    check_presentation(document, fixture)
    if key.startswith('columns-'):
        check_columns(document, fixture)
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
            check_entry_attachment(reopened, fixture)
            check_cv_composition(reopened, fixture)
            check_custom_footers(reopened, key)
            check_artwork(reopened, fixture)
            check_scoped_shapes(reopened, fixture)
            check_paint_probes(reopened, fixture)
            check_letter_tail(reopened, fixture)
            check_header_paint_coverage(reopened, fixture)
            check_cover_features(reopened, fixture)
            check_element_features(reopened, fixture)
            check_native_opacity(reopened, fixture)
            check_presentation(reopened, fixture)
            check_fonts(reopened, fixture)
            if key.startswith('columns-'):
                check_columns(reopened, fixture)
    row = {'fixture': key, 'libreOfficeVersion': lo_version, 'libreOfficeInterface': interface, 'pages': len(document), 'media': media_count, 'bytes': fixture['bytes'], 'durationMs': fixture['durationMs'], 'structural': 'pass', 'libreoffice': 'pass', 'libreofficeRoundtrip': 'pass' if args.roundtrip else 'notRun', 'microsoftWord': 'pending', 'snapshot': 'candidate'}
    report.append(row)
    print(json.dumps(row), flush=True)
    document.close()
check_offset_distances(manifest, args.directory, args.roundtrip)
check_cover_spacing(args.directory, args.roundtrip)
check_presentation_offsets(args.directory, args.roundtrip)
report_path = args.directory / 'render-report.json'
previous = json.loads(report_path.read_text()) if report_path.exists() else []
combined = {row['fixture']: row for row in previous}
combined.update({row['fixture']: row for row in report})
report_path.write_text(json.dumps(list(combined.values()), indent=2) + '\n')
print(f'Passed {len(report)} fixtures. Microsoft Word acceptance and snapshot approval remain pending.', flush=True)
