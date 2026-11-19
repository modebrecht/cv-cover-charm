#!/usr/bin/env python3
"""Replay the photographed Modern long-CV experiment on fresh synthetic downloads."""

import argparse
from collections import Counter
from copy import deepcopy
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
from zipfile import ZipFile

import fitz
from lxml import etree as ET
from PIL import Image

from dossier_qa import ROOT, evaluate, load_fresh
import dossier_qa_core as core


NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
W, A, WP, R = ('{' + NS[key] + '}' for key in ('w', 'a', 'wp', 'r'))
DOCUMENT = 'word/document.xml'
TILE_SCRIPT = '''
import { nativePictureTileGraphic } from "./src/lib/docx-next/native-picture-fill.ts";
const [geometry, bitmap, relation] = JSON.parse(process.argv[1]);
process.stdout.write(nativePictureTileGraphic(geometry, bitmap, relation));
'''


def check(value, message):
    if not value:
        raise ValueError(message)


def fields(root):
    return Counter((control.find('w:sdtPr/w:tag', NS).get(W + 'val'),
                    ''.join(node.text or '' for node in control.iter(W + 't')))
                   for control in root.iter(W + 'sdt'))


def header_tags(package):
    return sorted({tag.get(W + 'val') for name in package.namelist()
                   if name.startswith('word/') and 'header' in name and name.endswith('.xml')
                   for tag in ET.fromstring(package.read(name)).iter(W + 'tag')})


def portrait(package, root):
    anchor, = root.xpath('.//wp:anchor[wp:docPr/@name="cv.person.photo"]', namespaces=NS)
    blip, = anchor.findall('.//a:blip', NS)
    relation = blip.get(R + 'embed')
    rels = ET.fromstring(package.read('word/_rels/document.xml.rels'))
    target, = [rel.get('Target') for rel in rels if rel.get('Id') == relation]
    check(re.fullmatch(r'media/[^/]+', target), 'Unexpected portrait relationship')
    with Image.open(BytesIO(package.read('word/' + target))) as image:
        return anchor, relation, image.convert('RGBA')


def caption(node):
    return node.xpath('string(w:tblPr/w:tblCaption/@w:val)', namespaces=NS)


def empty_paragraph(node):
    return node.tag == W + 'p' and not node.xpath('.//w:t | .//w:drawing | .//w:pict', namespaces=NS)


def measured_entry_pages(app_pdf):
    with fitz.open(app_pdf) as pdf:
        markers = [re.findall(r'P202(?:Praxis\d{2}|Endreferenz)', page.get_text()) for page in pdf]
    check(len(markers) > 1 and all(markers), 'Expected a marker on every measured page')
    return markers


def compact_table(root, side, count, boundaries, explicit_pages):
    body = root.find('w:body', NS)
    table, = body.xpath('w:tbl[w:tblPr/w:tblCaption/@w:val="cv.sidebar"]', namespaces=NS)
    first, = table.findall('w:tr', NS)
    cells = first.findall('w:tc', NS)
    check(len(cells) == 3, 'Expected three Sidebar grid columns')
    main_index = 0 if side else 2
    main = cells[main_index]
    nodes = list(main)[1:]
    blank = nodes[-1]
    check(empty_paragraph(blank), 'Expected an empty cell end')

    lead, = [node for node in nodes if caption(node) == 'cv.section.erfahrung.lead']
    lead_end = lead.getprevious()
    check(empty_paragraph(lead_end), 'Expected an empty experience lead boundary')
    gap = lead_end.find('w:pPr/w:spacing', NS)
    check(gap.get(W + 'line') == '20' and gap.get(W + 'after') == '72', 'Unexpected lead spacing')
    gap.set(W + 'line', '1')
    gap.set(W + 'after', '0')
    stations = [node for node in nodes if caption(node).startswith('cv.entry.erfahrung:p202-')]
    check(len(stations) == count - 1, 'Unexpected set of synthetic station rows')
    for node in stations:
        boundary = node.getnext()
        check(empty_paragraph(boundary), 'Expected an empty station boundary')
        after = boundary.find('w:pPr/w:spacing', NS)
        check(after.get(W + 'after') in {'1', '72'}, 'Unexpected station boundary')
        after.set(W + 'after', '0')

    cuts = []
    for marker in boundaries:
        if marker == 'P202Endreferenz':
            position, = [i for i, node in enumerate(nodes) if
                         node.xpath('string(w:sdtPr/w:tag/@w:val)', namespaces=NS) == 'cv.section.referenzen.heading']
        else:
            position, = [i for i, node in enumerate(nodes) if node.tag == W + 'tbl' and
                         marker in node.xpath('.//w:t/text()', namespaces=NS)]
        cuts.append(position)
    check(cuts == sorted(set(cuts)) and cuts[0] > 0, 'Invalid measured station boundaries')
    next_table = table
    for start, end in zip(cuts, cuts[1:] + [len(nodes)]):
        check(nodes[end - 1].tag == W + 'p', 'Ending a native row requires a paragraph')
        if explicit_pages:
            boundary = ET.Element(W + 'p')
            props = ET.SubElement(boundary, W + 'pPr')
            ET.SubElement(props, W + 'pageBreakBefore')
            ET.SubElement(props, W + 'spacing', {W + 'before': '0', W + 'after': '0',
                                                W + 'line': '1', W + 'lineRule': 'exact'})
            body.insert(body.index(next_table) + 1, boundary)
            next_table = ET.Element(W + 'tbl')
            next_table.extend(deepcopy(table[:2]))
            body.insert(body.index(boundary) + 1, next_table)
        row = ET.SubElement(next_table, W + 'tr')
        for index, cell in enumerate(cells):
            target = ET.SubElement(row, W + 'tc')
            props = deepcopy(cell.find('w:tcPr', NS))
            for pad in props.xpath('w:tcMar/w:top | w:tcMar/w:bottom', namespaces=NS):
                pad.set(W + 'w', '0')
            target.append(props)
            target.extend(nodes[start:end] if index == main_index else [deepcopy(blank)])
    check(main[-1].tag == W + 'p', 'Opening native row requires a closing paragraph')


def tile_graphic(anchor, relation, pixels, margins, bun):
    x = anchor.find('wp:positionH', NS)
    offset = x.find('wp:posOffset', NS)
    left_emu = int(margins.get(W + 'left')) * 635
    check(x.get('relativeFrom') == 'page', 'Expected a page-relative portrait')
    if left_emu:
        offset.text = str(int(offset.text) - left_emu)
        x.set('relativeFrom', 'margin')
    extent = anchor.find('wp:extent', NS)
    rect, = anchor.findall('.//a:srcRect', NS)
    geometry, = anchor.findall('.//a:prstGeom', NS)
    check(geometry.get('prst') == 'roundRect' and anchor.find('.//a:ln', NS) is None,
          'Expected a synthetic rounded portrait without an outline')
    adj = geometry.find('a:avLst/a:gd', NS).get('fmla')
    style = {'widthMm': int(extent.get('cx')) / 36000, 'heightMm': int(extent.get('cy')) / 36000,
             'shape': 'roundRect', 'cornerAdjustment': int(adj.removeprefix('val ')),
             'borderWidthMm': 0, 'borderColor': '000000',
             'crop': {edge: int(rect.get(edge[0])) for edge in ('left', 'top', 'right', 'bottom')}}
    args = [style, {'widthPx': pixels.width, 'heightPx': pixels.height}, relation]
    native = subprocess.check_output([bun, '--eval', TILE_SCRIPT, '--', json.dumps(args)],
                                     cwd=ROOT, text=True, timeout=45)
    wrapper = ET.fromstring(f'<root xmlns:a="{NS["a"]}" xmlns:r="{NS["r"]}">{native}</root>')
    anchor.replace(anchor.find('a:graphic', NS), wrapper[0])


def candidate(row, source, app_pdf, output, bun):
    with ZipFile(source) as archive:
        raw = archive.read(DOCUMENT)
        root = ET.fromstring(raw)
        core._row_metrics_empty_footers({name: archive.read(name) for name in archive.namelist()},
                                       core._lo_context_parse_part(raw))
        before = fields(root)
        tags = header_tags(archive)
        anchor, relation, pixels = portrait(archive, root)
        margins = root.find('w:body/w:sectPr/w:pgMar', NS)
        check(margins.get(W + 'footer') == '680', 'Unexpected empty-footer distance')
        margins.set(W + 'footer', '0')
        pages = measured_entry_pages(app_pdf)
        explicit_pages = row['varied_text']
        if explicit_pages:
            boundaries = [page[0] for page in pages[1:]]
        else:
            # An added row at the very first entry of page 2 can pull it back
            # onto page 1. Use an internal boundary of the measured page.
            second_page = pages[1]
            check(len(second_page) >= 3, 'No interior continuation boundary')
            boundaries = [second_page[len(second_page) // 2]]
        compact_table(root, row['mirrored'], row['entry_count'], boundaries, explicit_pages)
        tile_graphic(anchor, relation, pixels, margins, bun)
        check(fields(root) == before, 'Candidate construction changed body field content')
        with ZipFile(output, 'x') as copy:
            for item in archive.infolist():
                data = ET.tostring(root, encoding='utf-8', xml_declaration=True) if item.filename == DOCUMENT else archive.read(item.filename)
                copy.writestr(item, data)
    return before, tags, (pixels.size, pixels.tobytes())


def convert(engine, source, output):
    check(not output.exists(), f'Refusing to overwrite {output.name}')
    output.parent.mkdir(parents=True, exist_ok=True)
    profile = output.parent / (output.suffix[1:] + '-profile')
    command = [str(engine), profile.as_uri(), source.as_uri(), output.as_uri(), output.suffix[1:]]
    result = subprocess.run(command, capture_output=True, text=True, timeout=110)
    log = output.with_suffix(output.suffix + '.log')
    log.write_text(result.stdout + result.stderr)
    check(result.returncode == 0 and output.is_file() and output.stat().st_size > 1000,
          f'Native conversion failed for {source.name}. See {log}')
    return output


def roundtrip(row, source, app_pdf, folder, engine, bun):
    folder.mkdir()
    copy = folder / source.name
    expected_fields, expected_tags, expected_photo = candidate(row, source, app_pdf, copy, bun)
    count = row['entry_count']
    app, _ = core.measure(app_pdf, folder, 'app', count)
    original = core.digest(source)
    reference = folder / 'original' / app_pdf.name
    convert(engine, source, reference)
    original_edges = core.page_edges(reference)
    check(len(original_edges) > 1, 'Expected original first and continuation page edges')
    with fitz.open(reference) as pdf:
        original_content = core.content([page.get_text() for page in pdf], count)
    edges = [original_edges[0], *([original_edges[1]] * (app['pages'] - 1))]
    observed = []
    for phase in ('source', 'save-1', 'save-2'):
        stage = folder / phase
        if phase != 'source':
            copy = convert(engine, copy, stage / source.name)
        with ZipFile(copy) as archive:
            body = ET.fromstring(archive.read(DOCUMENT))
            _, _, pixels = portrait(archive, body)
            same_fields = fields(body) == expected_fields
            same_photo = (pixels.size, pixels.tobytes()) == expected_photo
            missing_tags = sorted(set(expected_tags) - set(header_tags(archive)))
        pdf = convert(engine, copy, stage / app_pdf.name)
        native, _ = core.measure(pdf, stage, 'writer', count)
        review = evaluate(app, native, count, row['mirrored'], pdf, edges, varied=row['varied_text'])
        comp = review['comparison']
        shifts = [abs(v) for marker in comp['title_geometry'] for v in (marker['delta_mm'] or [])]
        result = {'phase': phase, 'pages': native['pages'], 'gates': review['gates'],
                  'body_fields_match': same_fields, 'bitmap_pixels_match': same_photo,
                  'missing_header_tags': missing_tags, 'title_max_mm': max(shifts, default=None),
                  'photo': comp['photo'], 'docx_sha256': core.digest(copy), 'pdf_sha256': core.digest(pdf)}
        result['pass'] = same_fields and same_photo and review['status'] == 'PASS'
        observed.append(result)
        print(row['id'], phase, 'PASS' if result['pass'] else 'FAIL', flush=True)
    check(core.digest(source) == original, 'Source download changed')
    return {'id': row['id'], 'source_docx_sha256': original, 'app_pdf_sha256': core.digest(app_pdf),
            'app_pages': app['pages'], 'phases': observed,
            'original_native_pages': len(original_edges), 'original_native_body': original_content['status']}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--source-dir', required=True, type=Path)
    cli.add_argument('--engine', required=True, type=Path, help='Pinned runtime directory containing lo-kit')
    cli.add_argument('--out-dir', required=True, type=Path)
    cli.add_argument('--bun', default='bun')
    args = cli.parse_args()
    engine = args.engine.resolve()
    record = json.loads((engine / 'runtime-record.json').read_text())
    check(record['version']['ProductVersion'] + record['version']['ProductExtension'] == '25.8.7.3', 'Use the pinned stable Writer engine')
    for file, key in [('stable-lo-packages.json', 'packageManifestSha256'),
                      ('stable-sidebar-fonts.json', 'fontManifestSha256')]:
        check(core.digest(ROOT / 'docs/docx-next' / file) == record[key], 'Pinned engine manifest differs')
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    inputs = [row for row in load_fresh(args.source_dir.resolve(), 'full', sha) if row[0]['part'] == 'cv']
    out = args.out_dir.resolve()
    out.mkdir(parents=True)
    program = engine / 'lo-kit'
    version = subprocess.check_output([str(program), '--version', (out / 'version-profile').as_uri()],
                                      text=True, timeout=30)
    check(json.loads(version) == record['version'], 'Running Writer differs from the recorded engine')
    cases = [roundtrip(row, docx, pdf, out / row['id'], program, args.bun)
             for row, docx, pdf in inputs]
    report = {'implementation': sha, 'engine': record, 'cases': cases,
              'scope': 'Synthetic QA, raster/header, layout, body field and original bitmap checks. Desktop Word and header control identity require separate review.'}
    (out / 'RESULTS.json').write_text(json.dumps(report, indent=2) + '\n')
    return 0 if all(phase['pass'] for case in cases for phase in case['phases']) else 1


if __name__ == '__main__':
    raise SystemExit(main())
