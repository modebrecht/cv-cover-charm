#!/usr/bin/env python3
"""P2-22: separate floating sidebar from a single-column main table flow."""
import argparse
from collections import Counter
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz

import dossier_entry_rows as entries
from dossier_photo_frame import make_copy as photo_copy, layout_profile
from dossier_lo_context import W, NS, canon, parse_part
from dossier_layout_rows import word_values, drawing_payloads
from dossier_lo_minimal import paragraph
from dossier_production_spacing import critical, digest

PROFILES = ['prior-control', 'detached-wrap', 'detached-frame']
P219_SHA256 = 'cefb4ea23416455ae11da353eeb6d03caefe0084e748575c638da59a4506642d'


def table_properties(original, width, caption, indent=0):
    props = deepcopy(original)
    props.find('w:tblW', NS).set(W + 'w', str(width))
    props.find('w:tblCaption', NS).set(W + 'val', caption)
    if indent:
        idx = list(props).index(props.find('w:tblW', NS)) + 1
        props.insert(idx, ET.Element(W + 'tblInd', {W + 'w': str(indent), W + 'type': 'dxa'}))
    return props


def make_copy(source, target, profile):
    if profile not in PROFILES:
        raise ValueError('Unknown detached-main profile')
    with ZipFile(source) as z:
        original = parse_part(z.read('word/document.xml'))
    margin = original.find('w:body/w:sectPr/w:pgMar', NS)
    left = int(margin.get(W + 'left'))
    frame = 'margin-equivalent' if left else 'original-photo'
    meta = photo_copy(source, target, frame, layout=layout_profile(source))
    if profile == 'prior-control':
        meta.update(profile=profile, photo_control_profile=frame)
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    body = root.find('w:body', NS)
    outer = body.find('w:tbl', NS)
    rows = outer.findall('w:tr', NS)
    cells = rows[0].findall('w:tc', NS)
    mi = 0 if 'P202Praxis01' in ''.join(word_values(cells[0])) else 2
    si = 2 - mi
    main_cell, sidebar = cells[mi], cells[si]
    sidebar_before = canon(sidebar)
    main_nodes = [n for row in rows for n in row.findall('w:tc', NS)[mi] if n.tag != W + 'tcPr']
    main_blocks = [canon(n) for n in main_nodes]
    widths = [int(c.find('w:tcPr/w:tcW', NS).get(W + 'w')) for c in cells]
    if widths != ([6746, 454, 3572] if mi == 0 else [3572, 453, 6747]):
        raise ValueError('Unexpected source column widths')
    main_width, sidebar_width, gap = widths[mi], widths[si], widths[1]
    sidebar_x = left + sum(widths[:si])
    main_x = left + sum(widths[:mi])
    original_props = outer.find('w:tblPr', NS)
    floating = ET.Element(W + 'tbl')
    floating_props = table_properties(original_props, sidebar_width, 'ccc.detached-sidebar')
    distance = gap if profile == 'detached-wrap' else 0
    positioning = ET.Element(W + 'tblpPr', {
        W + 'horzAnchor': 'page', W + 'vertAnchor': 'page', W + 'tblpX': str(sidebar_x),
        W + 'tblpY': margin.get(W + 'top'), W + 'leftFromText': str(distance if si == 2 else 0),
        W + 'rightFromText': str(distance if si == 0 else 0), W + 'topFromText': '0', W + 'bottomFromText': '0'})
    floating_props.insert(0, positioning)
    floating_props.insert(1, ET.Element(W + 'tblOverlap', {W + 'val': 'overlap'}))
    floating.append(floating_props)
    grid = ET.SubElement(floating, W + 'tblGrid')
    ET.SubElement(grid, W + 'gridCol', {W + 'w': str(sidebar_width)})
    ET.SubElement(floating, W + 'tr').append(sidebar)
    main = ET.Element(W + 'tbl')
    indent = 0
    main.append(table_properties(original_props, main_width, 'ccc.detached-main', indent))
    grid = ET.SubElement(main, W + 'tblGrid')
    ET.SubElement(grid, W + 'gridCol', {W + 'w': str(main_width)})
    cuts = []
    for number in range(2, 19):
        found = [i for i, n in enumerate(main_nodes) if n.tag == W + 'tbl' and f'P202Praxis{number:02}' in ''.join(word_values(n))]
        if len(found) != 1:
            raise ValueError('Expected unique semantic entry boundary')
        cuts += found
    refs = [i for i, n in enumerate(main_nodes) if ''.join(word_values(n)) == 'Referenzen']
    if len(refs) != 1 or cuts != sorted(set(cuts)):
        raise ValueError('Invalid semantic partition')
    cuts += refs
    positions = [0] + cuts + [len(main_nodes)]
    chunks = [main_nodes[a:b] for a, b in zip(positions, positions[1:])]
    for i, chunk in enumerate(chunks):
        row = ET.SubElement(main, W + 'tr')
        if i:
            ET.SubElement(ET.SubElement(row, W + 'trPr'), W + 'cantSplit')
        cell = ET.SubElement(row, W + 'tc')
        cell.append(deepcopy(main_cell.find('w:tcPr', NS)))
        cell.extend(chunk)
    index = list(body).index(outer)
    body.remove(outer)
    body.insert(index, floating)
    # A regular paragraph immediately follows the float, keeping its logical
    # anchor before the main flow, rather than at the final body paragraph.
    body.insert(index + 1, paragraph(line=1, keep=False))
    body.insert(index + 2, main)
    moved = [canon(n) for row in main.findall('w:tr', NS) for n in row.find('w:tc', NS) if n.tag != W + 'tcPr']
    if moved != main_blocks or canon(sidebar) != sidebar_before:
        raise ValueError('Main blocks or sidebar payload changed')
    if Counter(word_values(root)) != Counter(word_values(before)) or critical(root, 18) != critical(before, 18):
        raise ValueError('Visible text or critical payload changed')
    if drawing_payloads(root) != drawing_payloads(before) or len(root.findall('.//w:sdt', NS)) != 107:
        raise ValueError('Drawing or control payload changed')
    if profile == 'detached-frame':
        section = root.find('w:body/w:sectPr', NS)
        new_margin = section.find('w:pgMar', NS)
        page_width = int(section.find('w:pgSz', NS).get(W + 'w'))
        new_margin.set(W + 'left', str(main_x))
        new_margin.set(W + 'right', str(page_width - main_x - main_width))
        expected_section = deepcopy(before.find('w:body/w:sectPr', NS))
        expected_margin = expected_section.find('w:pgMar', NS)
        expected_margin.set(W + 'left', str(main_x))
        expected_margin.set(W + 'right', str(page_width - main_x - main_width))
    else:
        expected_section = before.find('w:body/w:sectPr', NS)
    if canon(root.find('w:body/w:sectPr', NS)) != canon(expected_section):
        raise ValueError('Unexpected page/section frame change')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any(a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml'):
            raise ValueError('Unrelated package part changed')
    meta.update(profile=profile, copy_sha256=digest(target), photo_control_profile=frame,
                main_table_columns=1, main_table_rows=len(chunks), sidebar_table_columns=1,
                main_frame_source_x_twips=main_x, main_table_indent_twips=indent,
                sidebar_float_page_xy_twips=[sidebar_x, int(margin.get(W + 'top'))],
                sidebar_float_standoff_twips=distance, source_spacer_cell_removed=True,
                added_empty_body_anchor_paragraphs=1, section_frame_identical=profile != 'detached-frame',
                section_main_frame_restricted=profile == 'detached-frame',
                main_story_blocks_identical=True, sidebar_identical_to_photo_control=True,
                global_word_text_order_identical=word_values(root) == word_values(before),
                layout_rows=len(chunks), reference_heading_body_grouped=True,
                declared_losses=['Outer three-column layout replaced by floating sidebar and independent one-column flow; global XML reading order may change'])
    return meta


def page_edges(pdf):
    rows = []
    with fitz.open(pdf) as doc:
        for page in doc:
            crops = [fitz.Rect(0, 0, page.rect.width, 45 * 72 / 25.4),
                     fitz.Rect(0, 292 * 72 / 25.4, page.rect.width, page.rect.height)]
            hashes = [hashlib.sha256(page.get_pixmap(matrix=fitz.Matrix(96/72, 96/72), clip=crop, alpha=False).samples).hexdigest() for crop in crops]
            rows.append({'header_sha256': hashes[0], 'bottom_sha256': hashes[1]})
    return rows


def main():
    root = Path(__file__).resolve().parents[1]
    path = root / 'docs/qa/p2-19-native-results.json'
    if digest(path) != P219_SHA256:
        raise ValueError('Pinned P2-19 evidence changed')
    previous = json.loads(path.read_text())
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--out-dir', type=Path, required=True)
    args, _ = parser.parse_known_args()
    baselines = {}
    def check(row, source):
        edges = page_edges(args.out_dir.resolve() / row['id'] / 'copy.pdf')
        row['page_edge_signatures'] = edges
        if row['profile'] == 'prior-control':
            expected = next(c for c in previous['cases'] if c['source_id'] == source['id'] and c['profile'] == row['package']['photo_control_profile'])
            row['baseline_input_match_p219'] = row['package']['copy_sha256'] == expected['package']['copy_sha256']
            row['baseline_pixels_match_p219'] = row['actual']['pixel_sha256'] == expected['actual']['pixel_sha256']
            if not row['baseline_input_match_p219'] or not row['baseline_pixels_match_p219']:
                raise ValueError('Prior control changed')
            baselines[source['id']] = edges
        baseline = baselines[source['id']]
        row['page_edge_status'] = 'PASS' if all(edge == baseline[min(i, len(baseline)-1)] for i, edge in enumerate(edges)) else 'FAIL'
        if row['page_edge_status'] != 'PASS':
            row['trial_status'] = 'FAIL'
    return entries.main(profiles=PROFILES, builder=make_copy, case_check=check,
                        title='P2-22 — detached main flow and floating sidebar',
                        scope='Four frozen actual 18-entry P2-17 sources, ordinary/varied both sides. Prior control vs floating-sidebar/main-flow placements: wrapping or section restricted to the original main frame. Unchanged leaf tables and non-document ZIP parts. Not product/Word/x39 acceptance.',
                        extra_evidence={'p219_report_sha256': P219_SHA256, 'page_edge_gate': 'Exact native control hashes above 45 mm and below 292 mm on each page'})


if __name__ == '__main__':
    raise SystemExit(main())
