"""Bounded Modern QA mechanics, extracted from the verified P2-26 research.

Only synthetic 17/18/19-entry fixtures are supported. Public orchestration is
in dossier_qa.py. No historical CLIs, evidence files or experiment jobs are
required. Private intermediate profiles preserve the verified transformation
and its content/graphics guards; they are not product export options.
Provenance: d6318bcb7bdeaf84561a1bd66388a36a7d57d459, scripts/dossier_*.py.
"""
from __future__ import annotations
from copy import deepcopy
import json
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz
from collections import Counter
from PIL import Image
import hashlib
import io
import os
import subprocess
from collections import defaultdict
import csv
import re
import unicodedata
import numpy as np
import time


# row_metrics: PROFILES
_row_metrics_PROFILES = ['prior-control', 'footer-distance-zero', 'footer-references-off', 'bottom-margin-zero']


# body_flow: PROFILES
_body_flow_PROFILES = ['frame-control', 'body-flow', 'body-flow-nosplit', 'body-flow-nosplit-front']


# detached_main: PROFILES
_detached_main_PROFILES = ['prior-control', 'detached-wrap', 'detached-frame']


# lo_context: parse_part
def _lo_context_parse_part(raw):
    for _, pair in ET.iterparse(io.BytesIO(raw), events=['start-ns']):
        ET.register_namespace(*pair)
    return ET.fromstring(raw)


# production_spacing: W
_production_spacing_W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


# production_spacing: NS
_production_spacing_NS = {'w': _production_spacing_W[1:-1]}


# photo_frame: PROFILES
_photo_frame_PROFILES = ['original-photo', 'margin-equivalent', 'margin-unadjusted', 'page-compensated']


# photo_frame: layout_profile
def _photo_frame_layout_profile(source):
    return 'entry-rows-nosplit' if 'varied' in source.name else 'fixed-5-14'


# entry_rows: PROFILES
_entry_rows_PROFILES = ['fixed-5-14', 'entry-rows', 'entry-rows-nosplit']


# layout_rows: word_values
def _layout_rows_word_values(root):
    return [n.text for n in root.iter(_production_spacing_W + 't')]


# production_spacing: markers
def _production_spacing_markers(count):
    return [f'P202Praxis{i:02}' for i in range(1, count + 1)] + ['P202Endreferenz']


# production_spacing: critical
def _production_spacing_critical(root, count):
    result = []
    for table in root.findall('.//w:tbl', _production_spacing_NS):
        text = ''.join((t.text or '' for t in table.iter(_production_spacing_W + 't')))
        if not table.findall('.//w:tbl', _production_spacing_NS) and any((m in text for m in _production_spacing_markers(count))):
            result.append(hashlib.sha256(ET.canonicalize(ET.tostring(table, encoding='unicode')).encode()).hexdigest())
    if len(result) != count + 1:
        raise ValueError('Unexpected station/reference table count')
    return result


# lo_context: cells_of
def _lo_context_cells_of(root):
    cells = root.find('w:body/w:tbl/w:tr', _production_spacing_NS).findall('w:tc', _production_spacing_NS)
    mains = [i for i, c in enumerate(cells) if 'P202Praxis06' in ''.join((t.text or '' for t in c.iter(_production_spacing_W + 't')))]
    if len(cells) != 3 or len(mains) != 1 or mains[0] not in [0, 2]:
        raise ValueError('Unexpected main/sidebar cells')
    return (cells, mains[0], 2 - mains[0])


# lo_isolation: attribute_diff
def _lo_isolation_attribute_diff(before, after, path=''):
    """Reject structural/text edits; enumerate all attribute edits by tree path."""
    if (before.tag, before.text, before.tail, len(before)) != (after.tag, after.text, after.tail, len(after)):
        raise ValueError('Unexpected structure or text mutation at ' + path)
    edits = []
    for key in sorted(before.attrib.keys() | after.attrib.keys()):
        if before.get(key) != after.get(key):
            edits.append({'path': path, 'attribute': key, 'before': before.get(key), 'after': after.get(key)})
    for i, (left, right) in enumerate(zip(before, after)):
        edits += _lo_isolation_attribute_diff(left, right, path + '/' + left.tag.split('}')[-1] + f'[{i}]')
    return edits


# lo_context: canon
def _lo_context_canon(node):
    return ET.canonicalize(ET.tostring(node, encoding='unicode'))


# lo_minimal: NS
_lo_minimal_NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}


# lo_minimal: W
_lo_minimal_W = '{' + _lo_minimal_NS['w'] + '}'


# lo_minimal: paragraph
def _lo_minimal_paragraph(text='', line=None, keep=None):
    p = ET.Element(_lo_minimal_W + 'p')
    props = ET.SubElement(p, _lo_minimal_W + 'pPr')
    if keep is not None:
        ET.SubElement(props, _lo_minimal_W + 'keepNext', {_lo_minimal_W + 'val': str(int(keep))})
    if line:
        ET.SubElement(props, _lo_minimal_W + 'spacing', {_lo_minimal_W + 'line': str(line), _lo_minimal_W + 'lineRule': 'exact', _lo_minimal_W + 'after': '0'})
    if text:
        run = ET.SubElement(p, _lo_minimal_W + 'r')
        rp = ET.SubElement(run, _lo_minimal_W + 'rPr')
        ET.SubElement(rp, _lo_minimal_W + 'rFonts', {_lo_minimal_W + 'ascii': 'Arial', _lo_minimal_W + 'hAnsi': 'Arial'})
        ET.SubElement(rp, _lo_minimal_W + 'sz', {_lo_minimal_W + 'val': '20'})
        ET.SubElement(run, _lo_minimal_W + 't').text = text
    return p


# layout_rows: partition
def _layout_rows_partition(row, main_index, profile):
    cells = row.findall('w:tc', _production_spacing_NS)
    main = cells[main_index]
    nodes = [n for n in main if n.tag != _production_spacing_W + 'tcPr']
    if profile == 'reference-row':
        cuts = [i for i, n in enumerate(nodes) if ''.join((t.text or '' for t in n.iter(_production_spacing_W + 't'))) == 'Referenzen']
        if len(cuts) != 1:
            raise ValueError('Expected one direct reference heading')
    else:
        boundaries = [6, 15] if profile == 'rows-5-14' else [7, 16]
        cuts = []
        for number in boundaries:
            found = [i for i, n in enumerate(nodes) if n.tag == _production_spacing_W + 'tbl' and f'P202Praxis{number:02}' in ''.join((t.text or '' for t in n.iter(_production_spacing_W + 't')))]
            if len(found) != 1:
                raise ValueError('Expected direct entry boundary')
            cuts.extend(found)
    if cuts != sorted(set(cuts)) or not cuts or cuts[0] == 0:
        raise ValueError('Invalid row partition')
    positions = [0] + cuts + [len(nodes)]
    chunks = [nodes[a:b] for a, b in zip(positions, positions[1:])]
    properties = [deepcopy(c.find('w:tcPr', _production_spacing_NS)) for c in cells]
    for node in nodes:
        main.remove(node)
    main.extend(chunks[0])
    rows = []
    for chunk in chunks[1:]:
        new = ET.Element(_production_spacing_W + 'tr', dict(row.attrib))
        if row.find('w:trPr', _production_spacing_NS) is not None:
            new.append(deepcopy(row.find('w:trPr', _production_spacing_NS)))
        for i, properties_node in enumerate(properties):
            cell = ET.SubElement(new, _production_spacing_W + 'tc')
            cell.append(deepcopy(properties_node))
            if i == main_index:
                cell.extend(chunk)
            else:
                cell.append(_lo_minimal_paragraph(line=1, keep=False))
        rows.append(new)
    return (rows, chunks)


# lo_context: WP
_lo_context_WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'


# layout_rows: drawing_payloads
def _layout_rows_drawing_payloads(root):
    drawings = {}
    for d in root.iter(_production_spacing_W + 'drawing'):
        prop = d.find('.//' + _lo_context_WP + 'docPr')
        if prop is None or prop.get('name') in drawings:
            raise ValueError('Missing or duplicate drawing identity')
        drawings[prop.get('name')] = _lo_context_canon(d)
    return drawings


# production_spacing: digest
def _production_spacing_digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


# row_generalization: make_copy
def _row_generalization_make_copy(source, target, count):
    if source.resolve() == target.resolve():
        raise ValueError('Cannot overwrite source')
    if count not in [17, 18, 19]:
        raise ValueError('Unsupported entry count')
    with ZipFile(source) as package:
        infos = package.infolist()
        parts = {n: package.read(n) for n in package.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    original = deepcopy(root)
    text = ''.join(_layout_rows_word_values(root))
    if re.findall('P202Praxis\\d{2}', text) != [f'P202Praxis{i:02}' for i in range(1, count + 1)]:
        raise ValueError('Count/marker sequence mismatch')
    protected = _production_spacing_critical(root, count)
    cells, mi, si = _lo_context_cells_of(root)
    table = root.find('w:body/w:tbl', _production_spacing_NS)
    row = table.find('w:tr', _production_spacing_NS)
    if len(table.findall('w:tr', _production_spacing_NS)) != 1 or row.find('w:trPr', _production_spacing_NS) is not None:
        raise ValueError('Unexpected original layout row')
    main = cells[mi]
    gaps = []
    for entry, offset, expected in [(i, 1, '1') for i in range(2, count)] + [(1, -1, '72'), (count, 1, '72')]:
        found = [n for n in main.findall('w:tbl', _production_spacing_NS) if f'P202Praxis{entry:02}' in ''.join(_layout_rows_word_values(n))]
        if len(found) != 1:
            raise ValueError('Missing direct boundary table')
        gap = main[list(main).index(found[0]) + offset]
        spacing = gap.find('w:pPr/w:spacing', _production_spacing_NS)
        if gap.tag != _production_spacing_W + 'p' or _layout_rows_word_values(gap) or spacing is None or (spacing.get(_production_spacing_W + 'after') != expected):
            raise ValueError('Unexpected original empty gap')
        gaps.append(spacing)
    if len({id(n) for n in gaps}) != count:
        raise ValueError('Gap identity collision')
    for gap in gaps:
        gap.set(_production_spacing_W + 'after', '0')
    edits = _lo_isolation_attribute_diff(original, root)
    if len(edits) != count or any((e['attribute'] != _production_spacing_W + 'after' or e['after'] != '0' for e in edits)):
        raise ValueError('Unexpected spacing changes')
    before_partition = deepcopy(root)
    blocks = [_lo_context_canon(n) for n in main if n.tag != _production_spacing_W + 'tcPr']
    sidebar = _lo_context_canon(cells[si])
    initial = [_lo_context_canon(c.find('w:p', _production_spacing_NS)) for c in cells]
    new_rows, _ = _layout_rows_partition(row, mi, 'rows-5-14')
    table.extend(new_rows)
    rows = table.findall('w:tr', _production_spacing_NS)
    moved = [_lo_context_canon(n) for r in rows for n in r.findall('w:tc', _production_spacing_NS)[mi] if n.tag != _production_spacing_W + 'tcPr']
    if moved != blocks or _lo_context_canon(cells[si]) != sidebar:
        raise ValueError('Main blocks or sidebar changed')
    if Counter(_layout_rows_word_values(root)) != Counter(_layout_rows_word_values(original)) or _production_spacing_critical(root, count) != protected:
        raise ValueError('Critical entry/text payload changed')
    controls = len(original.findall('.//w:sdt', _production_spacing_NS))
    drawings = _layout_rows_drawing_payloads(original)
    if len(root.findall('.//w:sdt', _production_spacing_NS)) != controls or _layout_rows_drawing_payloads(root) != drawings:
        raise ValueError('Control or drawing payload changed')
    if initial != [_lo_context_canon(c.find('w:p', _production_spacing_NS)) for c in cells]:
        raise ValueError('Cell leading paragraph changed')
    for r in rows:
        for i, c in enumerate(r.findall('w:tc', _production_spacing_NS)):
            if _lo_context_canon(c.find('w:tcPr', _production_spacing_NS)) != _lo_context_canon(cells[i].find('w:tcPr', _production_spacing_NS)):
                raise ValueError('Cell properties changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as package:
        for info in infos:
            package.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        changed = [n for n in a.namelist() if a.read(n) != b.read(n)]
        if a.namelist() != b.namelist() or changed != ['word/document.xml']:
            raise ValueError('Unrelated package parts changed')
    return {'source_sha256': _production_spacing_digest(source), 'copy_sha256': _production_spacing_digest(target), 'entry_count': count, 'spacing_attribute_edits': edits, 'critical_tables_identical': len(protected), 'body_controls_retained': controls, 'drawing_payloads_identical': len(drawings), 'layout_rows': len(rows), 'main_story_blocks_identical': True, 'sidebar_payload_identical': True, 'all_non_document_parts_identical': True, 'global_word_text_order_identical': _layout_rows_word_values(before_partition) == _layout_rows_word_values(root), 'row_entry_ranges': [[1, 5], [6, 14], [15, count]], 'declared_losses': ['Mirrored global XML reading order changes'] if mi == 0 else []}


# entry_rows: make_copy
def _entry_rows_make_copy(source, target, profile, *, count=18):
    if profile not in _entry_rows_PROFILES:
        raise ValueError('Unknown entry-row profile')
    meta = _row_generalization_make_copy(source, target, count)
    if profile == 'fixed-5-14':
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    table = root.find('w:body/w:tbl', _production_spacing_NS)
    rows = table.findall('w:tr', _production_spacing_NS)
    mi = 0 if 'P202Praxis01' in ''.join(_layout_rows_word_values(rows[0].findall('w:tc', _production_spacing_NS)[0])) else 2
    cells = rows[0].findall('w:tc', _production_spacing_NS)
    nodes = [n for row in rows for n in row.findall('w:tc', _production_spacing_NS)[mi] if n.tag != _production_spacing_W + 'tcPr']
    blocks = [_lo_context_canon(n) for n in nodes]
    cuts = []
    controls = len(root.findall('.//w:sdt', _production_spacing_NS))
    for number in range(6, count + 1):
        found = [i for i, n in enumerate(nodes) if n.tag == _production_spacing_W + 'tbl' and f'P202Praxis{number:02}' in ''.join(_layout_rows_word_values(n))]
        if len(found) != 1:
            raise ValueError('Missing unique direct entry boundary')
        cuts += found
    references = [i for i, n in enumerate(nodes) if ''.join(_layout_rows_word_values(n)) == 'Referenzen']
    if len(references) != 1:
        raise ValueError('Missing unique reference heading')
    cuts += references
    if cuts != sorted(set(cuts)):
        raise ValueError('Invalid continuation boundaries')
    positions = [0] + cuts + [len(nodes)]
    chunks = [nodes[a:b] for a, b in zip(positions, positions[1:])]
    for row in rows[1:]:
        table.remove(row)
    for n in list(cells[mi]):
        if n.tag != _production_spacing_W + 'tcPr':
            cells[mi].remove(n)
    cells[mi].extend(chunks[0])
    for chunk in chunks[1:]:
        row = ET.SubElement(table, _production_spacing_W + 'tr')
        if profile == 'entry-rows-nosplit':
            ET.SubElement(ET.SubElement(row, _production_spacing_W + 'trPr'), _production_spacing_W + 'cantSplit')
        for i, cell in enumerate(cells):
            new = ET.SubElement(row, _production_spacing_W + 'tc')
            new.append(deepcopy(cell.find('w:tcPr', _production_spacing_NS)))
            if i == mi:
                new.extend(chunk)
            else:
                new.append(_lo_minimal_paragraph(line=1, keep=False))
    rows = table.findall('w:tr', _production_spacing_NS)
    moved = [_lo_context_canon(n) for row in rows for n in row.findall('w:tc', _production_spacing_NS)[mi] if n.tag != _production_spacing_W + 'tcPr']
    if moved != blocks or _production_spacing_critical(root, count) != _production_spacing_critical(before, count):
        raise ValueError('Main or leaf-table payload changed')
    if Counter(_layout_rows_word_values(root)) != Counter(_layout_rows_word_values(before)) or _layout_rows_drawing_payloads(root) != _layout_rows_drawing_payloads(before):
        raise ValueError('Text or graphic payload changed')
    if len(root.findall('.//w:sdt', _production_spacing_NS)) != controls:
        raise ValueError('Content-control count changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any((a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml')):
            raise ValueError('Unrelated package parts changed')
    meta.update(profile=profile, copy_sha256=_production_spacing_digest(target), layout_rows=len(rows), continuation_rows_cant_split=profile == 'entry-rows-nosplit', row_entry_ranges=[[1, 5]] + [[i, i] for i in range(6, count + 1)] + [['reference', 'reference']], reference_heading_body_grouped=True, first_layout_row_properties_unchanged=True)
    return meta


# photo_frame: photo
def _photo_frame_photo(root):
    found = [d for d in root.iter(_production_spacing_W + 'drawing') if (p := d.find('.//' + _lo_context_WP + 'docPr')) is not None and p.get('name') == 'cv.person.photo']
    if len(found) != 1:
        raise ValueError('Expected one portrait drawing')
    return found[0]


# photo_frame: make_copy
def _photo_frame_make_copy(source, target, profile, *, layout=None, count=18):
    if profile not in _photo_frame_PROFILES:
        raise ValueError('Unknown photo-frame profile')
    layout = _photo_frame_layout_profile(source) if layout is None else layout
    meta = _entry_rows_make_copy(source, target, layout, count=count)
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    drawing = _photo_frame_photo(root)
    position = drawing.find(_lo_context_WP + 'anchor/' + _lo_context_WP + 'positionH')
    offset = position.find(_lo_context_WP + 'posOffset') if position is not None else None
    if position is None or position.get('relativeFrom') != 'page' or offset is None:
        raise ValueError('Expected original page-based photo offset')
    margins = root.findall('w:body/w:sectPr/w:pgMar', _production_spacing_NS)
    if len(margins) != 1:
        raise ValueError('Expected one final section margin')
    left = int(margins[0].get(_production_spacing_W + 'left')) * 635
    x = int(offset.text)
    if profile in ['margin-equivalent', 'margin-unadjusted']:
        position.set('relativeFrom', 'margin')
    if profile in ['margin-equivalent', 'page-compensated']:
        offset.text = str(x - left)
    if profile != 'original-photo':
        parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        with ZipFile(target, 'w') as z:
            for info in infos:
                z.writestr(info, parts[info.filename])
    if _layout_rows_word_values(root) != _layout_rows_word_values(before) or _production_spacing_critical(root, count) != _production_spacing_critical(before, count):
        raise ValueError('Text or critical table changed')
    a, b = (deepcopy(before), deepcopy(root))
    for tree in [a, b]:
        target_drawing = _photo_frame_photo(tree)
        for parent in tree.iter():
            if target_drawing in list(parent):
                parent.remove(target_drawing)
                break
    if _lo_context_canon(a) != _lo_context_canon(b):
        raise ValueError('Non-photo document payload changed')
    old_photo = deepcopy(_photo_frame_photo(before))
    old_position = old_photo.find(_lo_context_WP + 'anchor/' + _lo_context_WP + 'positionH')
    old_position.attrib.clear()
    old_position.attrib.update(position.attrib)
    old_position.find(_lo_context_WP + 'posOffset').text = offset.text
    if _lo_context_canon(old_photo) != _lo_context_canon(drawing):
        raise ValueError('Photo edit extended beyond horizontal frame/offset')
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any((a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml')):
            raise ValueError('Unrelated package parts changed')
    declared_x = int(offset.text) + (left if position.get('relativeFrom') == 'margin' else 0)
    changed = _lo_context_canon(drawing) != _lo_context_canon(_photo_frame_photo(before))
    meta.update(profile=profile, layout_control_profile=layout, copy_sha256=_production_spacing_digest(target), photo_frame_before='page', photo_frame_after=position.get('relativeFrom'), photo_offset_emu_before=x, photo_offset_emu_after=int(offset.text), section_left_margin_emu=left, declared_page_x_emu_before=x, declared_page_x_emu_after=declared_x, declared_page_x_equivalent=declared_x == x, photo_horizontal_anchor_only_changed=changed, drawing_payloads_identical=7 if changed else 8, photo_graphic_payload_identical=True, sidebar_payload_identical=not changed, sidebar_text_and_non_photo_payload_identical=True, word_verification='NOT_PERFORMED', declared_losses=meta['declared_losses'] + (['Declared OOXML horizontal page position changes; converter-specific diagnostic only'] if declared_x != x else []))
    return meta


# detached_main: table_properties
def _detached_main_table_properties(original, width, caption, indent=0):
    props = deepcopy(original)
    props.find('w:tblW', _production_spacing_NS).set(_production_spacing_W + 'w', str(width))
    props.find('w:tblCaption', _production_spacing_NS).set(_production_spacing_W + 'val', caption)
    if indent:
        idx = list(props).index(props.find('w:tblW', _production_spacing_NS)) + 1
        props.insert(idx, ET.Element(_production_spacing_W + 'tblInd', {_production_spacing_W + 'w': str(indent), _production_spacing_W + 'type': 'dxa'}))
    return props


# detached_main: make_copy
def _detached_main_make_copy(source, target, profile, *, count=18):
    if profile not in _detached_main_PROFILES:
        raise ValueError('Unknown detached-main profile')
    with ZipFile(source) as z:
        original = _lo_context_parse_part(z.read('word/document.xml'))
    margin = original.find('w:body/w:sectPr/w:pgMar', _production_spacing_NS)
    left = int(margin.get(_production_spacing_W + 'left'))
    frame = 'margin-equivalent' if left else 'original-photo'
    meta = _photo_frame_make_copy(source, target, frame, layout=_photo_frame_layout_profile(source), count=count)
    if profile == 'prior-control':
        meta.update(profile=profile, photo_control_profile=frame)
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    body = root.find('w:body', _production_spacing_NS)
    outer = body.find('w:tbl', _production_spacing_NS)
    rows = outer.findall('w:tr', _production_spacing_NS)
    cells = rows[0].findall('w:tc', _production_spacing_NS)
    mi = 0 if 'P202Praxis01' in ''.join(_layout_rows_word_values(cells[0])) else 2
    si = 2 - mi
    main_cell, sidebar = (cells[mi], cells[si])
    sidebar_before = _lo_context_canon(sidebar)
    main_nodes = [n for row in rows for n in row.findall('w:tc', _production_spacing_NS)[mi] if n.tag != _production_spacing_W + 'tcPr']
    main_blocks = [_lo_context_canon(n) for n in main_nodes]
    widths = [int(c.find('w:tcPr/w:tcW', _production_spacing_NS).get(_production_spacing_W + 'w')) for c in cells]
    if widths != ([6746, 454, 3572] if mi == 0 else [3572, 453, 6747]):
        raise ValueError('Unexpected source column widths')
    main_width, sidebar_width, gap = (widths[mi], widths[si], widths[1])
    sidebar_x = left + sum(widths[:si])
    main_x = left + sum(widths[:mi])
    original_props = outer.find('w:tblPr', _production_spacing_NS)
    floating = ET.Element(_production_spacing_W + 'tbl')
    floating_props = _detached_main_table_properties(original_props, sidebar_width, 'ccc.detached-sidebar')
    distance = gap if profile == 'detached-wrap' else 0
    positioning = ET.Element(_production_spacing_W + 'tblpPr', {_production_spacing_W + 'horzAnchor': 'page', _production_spacing_W + 'vertAnchor': 'page', _production_spacing_W + 'tblpX': str(sidebar_x), _production_spacing_W + 'tblpY': margin.get(_production_spacing_W + 'top'), _production_spacing_W + 'leftFromText': str(distance if si == 2 else 0), _production_spacing_W + 'rightFromText': str(distance if si == 0 else 0), _production_spacing_W + 'topFromText': '0', _production_spacing_W + 'bottomFromText': '0'})
    floating_props.insert(0, positioning)
    floating_props.insert(1, ET.Element(_production_spacing_W + 'tblOverlap', {_production_spacing_W + 'val': 'overlap'}))
    floating.append(floating_props)
    grid = ET.SubElement(floating, _production_spacing_W + 'tblGrid')
    ET.SubElement(grid, _production_spacing_W + 'gridCol', {_production_spacing_W + 'w': str(sidebar_width)})
    ET.SubElement(floating, _production_spacing_W + 'tr').append(sidebar)
    main = ET.Element(_production_spacing_W + 'tbl')
    indent = 0
    main.append(_detached_main_table_properties(original_props, main_width, 'ccc.detached-main', indent))
    grid = ET.SubElement(main, _production_spacing_W + 'tblGrid')
    ET.SubElement(grid, _production_spacing_W + 'gridCol', {_production_spacing_W + 'w': str(main_width)})
    cuts = []
    for number in range(2, count + 1):
        found = [i for i, n in enumerate(main_nodes) if n.tag == _production_spacing_W + 'tbl' and f'P202Praxis{number:02}' in ''.join(_layout_rows_word_values(n))]
        if len(found) != 1:
            raise ValueError('Expected unique semantic entry boundary')
        cuts += found
    refs = [i for i, n in enumerate(main_nodes) if ''.join(_layout_rows_word_values(n)) == 'Referenzen']
    if len(refs) != 1 or cuts != sorted(set(cuts)):
        raise ValueError('Invalid semantic partition')
    cuts += refs
    positions = [0] + cuts + [len(main_nodes)]
    chunks = [main_nodes[a:b] for a, b in zip(positions, positions[1:])]
    for i, chunk in enumerate(chunks):
        row = ET.SubElement(main, _production_spacing_W + 'tr')
        if i:
            ET.SubElement(ET.SubElement(row, _production_spacing_W + 'trPr'), _production_spacing_W + 'cantSplit')
        cell = ET.SubElement(row, _production_spacing_W + 'tc')
        cell.append(deepcopy(main_cell.find('w:tcPr', _production_spacing_NS)))
        cell.extend(chunk)
    index = list(body).index(outer)
    body.remove(outer)
    body.insert(index, floating)
    body.insert(index + 1, _lo_minimal_paragraph(line=1, keep=False))
    body.insert(index + 2, main)
    moved = [_lo_context_canon(n) for row in main.findall('w:tr', _production_spacing_NS) for n in row.find('w:tc', _production_spacing_NS) if n.tag != _production_spacing_W + 'tcPr']
    if moved != main_blocks or _lo_context_canon(sidebar) != sidebar_before:
        raise ValueError('Main blocks or sidebar payload changed')
    if Counter(_layout_rows_word_values(root)) != Counter(_layout_rows_word_values(before)) or _production_spacing_critical(root, count) != _production_spacing_critical(before, count):
        raise ValueError('Visible text or critical payload changed')
    if _layout_rows_drawing_payloads(root) != _layout_rows_drawing_payloads(before) or len(root.findall('.//w:sdt', _production_spacing_NS)) != len(before.findall('.//w:sdt', _production_spacing_NS)):
        raise ValueError('Drawing or control payload changed')
    if profile == 'detached-frame':
        section = root.find('w:body/w:sectPr', _production_spacing_NS)
        new_margin = section.find('w:pgMar', _production_spacing_NS)
        page_width = int(section.find('w:pgSz', _production_spacing_NS).get(_production_spacing_W + 'w'))
        new_margin.set(_production_spacing_W + 'left', str(main_x))
        new_margin.set(_production_spacing_W + 'right', str(page_width - main_x - main_width))
        expected_section = deepcopy(before.find('w:body/w:sectPr', _production_spacing_NS))
        expected_margin = expected_section.find('w:pgMar', _production_spacing_NS)
        expected_margin.set(_production_spacing_W + 'left', str(main_x))
        expected_margin.set(_production_spacing_W + 'right', str(page_width - main_x - main_width))
    else:
        expected_section = before.find('w:body/w:sectPr', _production_spacing_NS)
    if _lo_context_canon(root.find('w:body/w:sectPr', _production_spacing_NS)) != _lo_context_canon(expected_section):
        raise ValueError('Unexpected page/section frame change')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any((a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml')):
            raise ValueError('Unrelated package part changed')
    meta.update(profile=profile, copy_sha256=_production_spacing_digest(target), photo_control_profile=frame, main_table_columns=1, main_table_rows=len(chunks), sidebar_table_columns=1, main_frame_source_x_twips=main_x, main_table_indent_twips=indent, sidebar_float_page_xy_twips=[sidebar_x, int(margin.get(_production_spacing_W + 'top'))], sidebar_float_standoff_twips=distance, source_spacer_cell_removed=True, added_empty_body_anchor_paragraphs=1, section_frame_identical=profile != 'detached-frame', section_main_frame_restricted=profile == 'detached-frame', main_story_blocks_identical=True, sidebar_identical_to_photo_control=True, global_word_text_order_identical=_layout_rows_word_values(root) == _layout_rows_word_values(before), layout_rows=len(chunks), reference_heading_body_grouped=True, declared_losses=['Outer three-column layout replaced by floating sidebar and independent one-column flow; global XML reading order may change'])
    return meta


# body_flow: leaves
def _body_flow_leaves(root, count=18):
    result = [t for t in root.findall('.//w:tbl', _production_spacing_NS) if not t.findall('.//w:tbl', _production_spacing_NS) and any((m in ''.join(_layout_rows_word_values(t)) for m in _production_spacing_markers(count)))]
    if len(result) != count + 1:
        raise ValueError('Expected one critical leaf table per entry plus reference')
    return result


# lo_context: MAIN_PAINT
_lo_context_MAIN_PAINT = {'cv.section.custom:familie.heading.flow-paint', 'cv.section.schule.heading.flow-paint', 'cv.section.erfahrung.heading.flow-paint', 'cv.section.referenzen.heading.flow-paint'}


# body_flow: neutral_tables
def _body_flow_neutral_tables(root, count=18):
    result = []
    for table in _body_flow_leaves(root, count):
        table = deepcopy(table)
        for row in table.findall('w:tr', _production_spacing_NS):
            props = row.find('w:trPr', _production_spacing_NS)
            if props is not None:
                for node in props.findall('w:cantSplit', _production_spacing_NS):
                    props.remove(node)
                if not len(props) and (not props.attrib):
                    row.remove(props)
        result.append(_lo_context_canon(table))
    return result


# body_flow: make_copy
def _body_flow_make_copy(source, target, profile, *, count=18):
    if profile not in _body_flow_PROFILES:
        raise ValueError('Unknown body-flow profile')
    meta = _detached_main_make_copy(source, target, 'detached-frame', count=count)
    if profile == 'frame-control':
        meta.update(profile=profile)
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    body = root.find('w:body', _production_spacing_NS)
    tables = [t for t in body.findall('w:tbl', _production_spacing_NS) if (p := t.find('w:tblPr/w:tblCaption', _production_spacing_NS)) is not None and p.get(_production_spacing_W + 'val') == 'ccc.detached-main']
    if len(tables) != 1:
        raise ValueError('Expected one detached outer main table')
    table = tables[0]
    blocks = [n for row in table.findall('w:tr', _production_spacing_NS) for n in row.find('w:tc', _production_spacing_NS) if n.tag != _production_spacing_W + 'tcPr']
    original_blocks = [_lo_context_canon(n) for n in blocks]
    index = list(body).index(table)
    body.remove(table)
    for i, node in enumerate(blocks):
        body.insert(index + i, node)
    if [_lo_context_canon(n) for n in list(body)[index:index + len(blocks)]] != original_blocks:
        raise ValueError('Direct body transfer changed original blocks')
    guard_edits = 0
    existing_guards = sum((row.find('w:trPr/w:cantSplit', _production_spacing_NS) is not None for leaf in _body_flow_leaves(root, count) for row in leaf.findall('w:tr', _production_spacing_NS)))
    if profile != 'body-flow':
        for leaf in _body_flow_leaves(root, count):
            for row in leaf.findall('w:tr', _production_spacing_NS):
                props = row.find('w:trPr', _production_spacing_NS)
                if props is None:
                    props = ET.Element(_production_spacing_W + 'trPr')
                    row.insert(0, props)
                existing = props.find('w:cantSplit', _production_spacing_NS)
                if existing is not None:
                    if existing.get(_production_spacing_W + 'val', '1') not in ['1', 'true', 'on']:
                        raise ValueError('Unexpected explicitly disabled source guard')
                    continue
                ET.SubElement(props, _production_spacing_W + 'cantSplit')
                guard_edits += 1
        if guard_edits + existing_guards != count + 1:
            raise ValueError('Expected all leaf rows guarded after preserving source guards')
    paint_edits = []
    if profile == 'body-flow-nosplit-front':
        for d in root.iter(_production_spacing_W + 'drawing'):
            prop = d.find('.//' + _lo_context_WP + 'docPr')
            if prop is not None and prop.get('name') in _lo_context_MAIN_PAINT:
                anchor = d.find(_lo_context_WP + 'anchor')
                if anchor is None or anchor.get('behindDoc') != '1':
                    raise ValueError('Unexpected main-paint anchor')
                anchor.set('behindDoc', '0')
                paint_edits.append(prop.get('name'))
        if set(paint_edits) != _lo_context_MAIN_PAINT:
            raise ValueError('Expected exactly four main-section paint edits')
    if _body_flow_neutral_tables(before, count) != _body_flow_neutral_tables(root, count):
        raise ValueError('Critical content changed beyond declared leaf split guards')
    if Counter(_layout_rows_word_values(root)) != Counter(_layout_rows_word_values(before)) or len(root.findall('.//w:sdt', _production_spacing_NS)) != len(before.findall('.//w:sdt', _production_spacing_NS)):
        raise ValueError('Text or content-control payload changed')
    a, b = (_layout_rows_drawing_payloads(before), _layout_rows_drawing_payloads(root))
    if set(a) != set(b) or any((a[n] != b[n] for n in a if n not in paint_edits)):
        raise ValueError('Undeclared drawing change')
    for da, db in zip(before.iter(_production_spacing_W + 'drawing'), root.iter(_production_spacing_W + 'drawing')):
        p = db.find('.//' + _lo_context_WP + 'docPr')
        if p.get('name') in paint_edits:
            expected = deepcopy(da)
            expected.find(_lo_context_WP + 'anchor').set('behindDoc', '0')
            if _lo_context_canon(expected) != _lo_context_canon(db):
                raise ValueError('Paint edit exceeded behindDoc flag')
    if _lo_context_canon(before.find('w:body/w:sectPr', _production_spacing_NS)) != _lo_context_canon(root.find('w:body/w:sectPr', _production_spacing_NS)):
        raise ValueError('Body frame changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any((a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml')):
            raise ValueError('Unrelated ZIP part changed')
    same = sum((x == y for x, y in zip(_production_spacing_critical(before, count), _production_spacing_critical(root, count))))
    meta.update(profile=profile, copy_sha256=_production_spacing_digest(target), main_outer_table_removed=True, main_table_columns=0, main_table_rows=0, layout_rows=0, continuation_rows_cant_split=False, reference_heading_body_grouped=False, source_reference_keep_next_preserved=True, main_story_blocks_identical=not guard_edits, main_story_text_identical=True, critical_tables_identical=same, critical_tables_except_cant_split_identical=count + 1, added_leaf_row_cant_split=guard_edits, existing_leaf_row_cant_split=existing_guards, main_paint_foreground_edits=paint_edits, drawing_payloads_identical=8 - len(paint_edits) - (1 if meta['photo_control_profile'] == 'margin-equivalent' else 0), declared_losses=meta['declared_losses'] + ['Outer main table removed; original leaf blocks now direct body flow'] + ([f'Leaf table formatting changed only by {guard_edits} missing cantSplit additions; existing guards retained'] if guard_edits else []) + (['Four main-section drawing behindDoc flags changed to foreground'] if paint_edits else []))
    return meta


# row_metrics: R
_row_metrics_R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


# row_metrics: empty_footers
def _row_metrics_empty_footers(parts, root):
    refs = root.findall('w:body/w:sectPr/w:footerReference', _production_spacing_NS)
    if len(refs) != 2 or {n.get(_production_spacing_W + 'type') for n in refs} != {'default', 'first'}:
        raise ValueError('Expected exactly first/default footer references')
    rels = _lo_context_parse_part(parts['word/_rels/document.xml.rels'])
    result = []
    for ref in refs:
        matches = [n for n in rels if n.get('Id') == ref.get(_row_metrics_R + 'id')]
        if len(matches) != 1 or matches[0].get('TargetMode') == 'External':
            raise ValueError('Missing or external footer relationship')
        rel = matches[0]
        if not rel.get('Type', '').endswith('/footer'):
            raise ValueError('Unexpected footer relationship type')
        name = str(PurePosixPath('word') / rel.get('Target'))
        if '..' in PurePosixPath(name).parts:
            raise ValueError('Unexpected footer path')
        footer = _lo_context_parse_part(parts[name])
        allowed = {_production_spacing_W + n for n in ['ftr', 'p', 'pPr', 'spacing']}
        if footer.tag != _production_spacing_W + 'ftr' or any((n.tag not in allowed for n in footer.iter())) or any((t.strip() for t in footer.itertext())):
            raise ValueError('Footer is not the verified empty-paragraph fixture')
        if len(footer.findall('w:p', _production_spacing_NS)) != 1:
            raise ValueError('Expected one empty footer paragraph')
        result.append(name)
    return result


# row_metrics: section_metrics
def _row_metrics_section_metrics(root):
    section = root.find('w:body/w:sectPr', _production_spacing_NS)
    size, margin = (section.find('w:pgSz', _production_spacing_NS), section.find('w:pgMar', _production_spacing_NS))
    return {'page_twips': {k.split('}')[-1]: int(v) for k, v in size.attrib.items()}, 'margin_twips': {k.split('}')[-1]: int(v) for k, v in margin.attrib.items()}, 'footer_reference_count': len(section.findall('w:footerReference', _production_spacing_NS)), 'nominal_body_bottom_mm': round((int(size.get(_production_spacing_W + 'h')) - int(margin.get(_production_spacing_W + 'bottom'))) * 25.4 / 1440, 3), 'effective_native_body_bottom': 'NOT_MEASURED: PDF text ink does not expose Writer row/page-area boxes'}


# row_metrics: make_copy
def _row_metrics_make_copy(source, target, profile, *, count=18):
    if profile not in _row_metrics_PROFILES:
        raise ValueError('Unknown row-metrics profile')
    meta = _body_flow_make_copy(source, target, 'body-flow-nosplit-front', count=count)
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = _lo_context_parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    footer_parts = _row_metrics_empty_footers(parts, root)
    section = root.find('w:body/w:sectPr', _production_spacing_NS)
    margin = section.find('w:pgMar', _production_spacing_NS)
    if margin.get(_production_spacing_W + 'footer') != '680' or margin.get(_production_spacing_W + 'bottom') != '283':
        raise ValueError('Frozen source page-area settings changed')
    if profile == 'footer-distance-zero':
        margin.set(_production_spacing_W + 'footer', '0')
    elif profile == 'footer-references-off':
        for node in section.findall('w:footerReference', _production_spacing_NS):
            section.remove(node)
    elif profile == 'bottom-margin-zero':
        margin.set(_production_spacing_W + 'bottom', '0')
    expected = deepcopy(before)
    expected.find('w:body', _production_spacing_NS).remove(expected.find('w:body/w:sectPr', _production_spacing_NS))
    expected.find('w:body', _production_spacing_NS).append(deepcopy(section))
    if _lo_context_canon(expected) != _lo_context_canon(root) or _production_spacing_critical(before, count) != _production_spacing_critical(root, count) or _layout_rows_drawing_payloads(before) != _layout_rows_drawing_payloads(root):
        raise ValueError('Page-area edit changed content or graphics')
    if profile != 'prior-control':
        parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        with ZipFile(target, 'w') as z:
            for info in infos:
                z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any((a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml')):
            raise ValueError('Non-document part changed')
    meta.update(profile=profile, copy_sha256=_production_spacing_digest(target), empty_footer_parts_verified=footer_parts, section_before=_row_metrics_section_metrics(before), section_after=_row_metrics_section_metrics(root), critical_tables_identical_to_body_flow_front_control=count + 1, page_area_edit={'prior-control': 'none', 'footer-distance-zero': 'pgMar.footer 680 -> 0', 'footer-references-off': 'remove two empty footer references; parts/rels retained', 'bottom-margin-zero': 'pgMar.bottom 283 -> 0'}[profile])
    if profile != 'prior-control':
        meta['declared_losses'].append(meta['page_area_edit'])
    return meta


# parity_content: COLORS
_parity_content_COLORS = [(223, 38, 56), (25, 168, 103), (32, 79, 200), (255, 240, 36)]


# parity_content: photo_signature
def _parity_content_photo_signature(rgb, page_mm=(210, 297)):
    arr = np.asarray(rgb.convert('RGB'), dtype=np.int16)
    distances = np.max(np.abs(arr[:, :, None, :] - np.array(_parity_content_COLORS)), axis=3)
    labels = np.where(distances.min(2) < 18, distances.argmin(2) + 1, 0)
    y, x = np.where(labels > 0)
    if len(x) < 40:
        return {'visible': False, 'pixels': int(len(x))}
    x0, x1, y0, y1 = (int(x.min()), int(x.max()), int(y.min()), int(y.max()))
    crop = labels[y0:y1 + 1, x0:x1 + 1]
    grid = []
    for ys in np.array_split(crop, 8, axis=0):
        for cell in np.array_split(ys, 8, axis=1):
            count = np.bincount(cell.flatten(), minlength=5)
            grid.append(int(count.argmax()))
    h, w = labels.shape
    return {'visible': True, 'pixels': int(len(x)), 'bbox_mm': [round(x0 / w * page_mm[0], 3), round(y0 / h * page_mm[1], 3), round((x1 - x0 + 1) / w * page_mm[0], 3), round((y1 - y0 + 1) / h * page_mm[1], 3)], 'grid': grid, 'colors': {str(i): int((crop == i).sum()) for i in range(1, 5)}}


# parity_content: compact
def _parity_content_compact(text):
    return ''.join((c for c in unicodedata.normalize('NFKD', text.casefold()) if c.isalnum()))


# production_spacing: blank_native_page
def _production_spacing_blank_native_page(text, rgb):
    """Only empty text plus an entirely white raster may bypass OCR."""
    return not _parity_content_compact(text) and all((low == high == 255 for low, high in rgb.convert('RGB').getextrema()))


# production_spacing: tsv_origins
def _production_spacing_tsv_origins(text, expected, page, page_mm, pixel_size):
    lines = defaultdict(list)
    for row in csv.DictReader(io.StringIO(text), delimiter='\t'):
        if row.get('text', '').strip():
            lines[row['block_num'], row['par_num'], row['line_num']].append(row)
    found = {}
    for rows in lines.values():
        for m in expected:
            for start in range(len(rows)):
                for length in range(1, min(4, len(rows) - start) + 1):
                    selected = rows[start:start + length]
                    if _parity_content_compact(''.join((r['text'] for r in selected))) != _parity_content_compact(m):
                        continue
                    x = min((int(r['left']) for r in selected))
                    y = min((int(r['top']) for r in selected))
                    found[m] = {'page': page, 'top_left_mm': [round(x / pixel_size[0] * page_mm[0], 3), round(y / pixel_size[1] * page_mm[1], 3)]}
    return found


# parity_content: marker_pages
def _parity_content_marker_pages(texts, markers):
    normalized = [_parity_content_compact(t) for t in texts]
    return {marker: [i + 1 for i, text in enumerate(normalized) if _parity_content_compact(marker) in text] for marker in markers}


# production_spacing: spans
def _production_spacing_spans(texts, count):
    pages = [_parity_content_compact(t) for t in texts]
    combined = ''.join(pages)
    ends = []
    total = 0
    for t in pages:
        total += len(t)
        ends.append(total)

    def page_at(pos):
        return next((i + 1 for i, end in enumerate(ends) if 0 <= pos < end), None)
    result = []
    all_markers = _production_spacing_markers(count)
    for i, m in enumerate(all_markers[:-1]):
        start = combined.find(_parity_content_compact(m))
        limit = combined.find(_parity_content_compact(all_markers[i + 1]), start + len(_parity_content_compact(m))) if start >= 0 else -1
        end = combined.find('arbeitsschritte', start) if start >= 0 else -1
        if end < 0 or (limit >= 0 and end >= limit):
            end = -1
        first = page_at(start)
        last = page_at(end + len('arbeitsschritte') - 1) if end >= 0 else None
        result.append({'marker': m, 'start_page': first, 'end_page': last, 'complete': first is not None and last is not None, 'split': first is not None and last is not None and (first != last)})
    return result


# production_spacing: content
def _production_spacing_content(texts, count):
    found = _parity_content_marker_pages(texts, _production_spacing_markers(count))
    entries = _production_spacing_spans(texts, count)
    reference = all((_parity_content_compact(s) in _parity_content_compact(''.join(texts)) for s in ['Klassenlehrer', '079 555 12 34']))
    missing = [m for m, pages in found.items() if len(pages) != 1]
    complete = sum((e['complete'] for e in entries))
    return {'status': 'PASS' if not missing and complete == count and reference else 'FAIL', 'marker_pages': found, 'missing_or_nonunique': missing, 'entries': entries, 'complete_entries': complete, 'split_entries': [e['marker'] for e in entries if e['split']], 'reference_body_present': reference}


# production_spacing: measure
def _production_spacing_measure(pdf, folder, label, count, *, native_blank_pages=False):
    texts = []
    photos = []
    images = []
    origins = {}
    methods = []
    pixels = []
    with fitz.open(pdf) as doc:
        producer = doc.metadata.get('producer')
        for i, page in enumerate(doc):
            page_mm = [page.rect.width * 25.4 / 72, page.rect.height * 25.4 / 72]
            pix = page.get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), alpha=False)
            rgb = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
            image = folder / f'{label}-{i + 1}.png'
            rgb.save(image)
            images.append(image)
            pixels.append(hashlib.sha256(rgb.tobytes()).hexdigest())
            photos.append(_parity_content_photo_signature(rgb, page_mm))
            text = page.get_text()
            method = 'PDF text layer'
            if native_blank_pages and _production_spacing_blank_native_page(text, rgb):
                text = ''
                method = 'Blank native PDF page: no text and every RGB pixel white'
            elif len(_parity_content_compact(text)) < 20:
                raster = folder / f'{label}-{i + 1}-ocr.png'
                high = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
                high.save(raster)
                base = raster.with_suffix('')
                proc = subprocess.run(['tesseract', str(raster), str(base), '--psm', '11', 'txt', 'tsv'], capture_output=True, text=True, timeout=30)
                if proc.returncode:
                    raise RuntimeError('OCR failed: ' + proc.stderr[-200:])
                text = base.with_suffix('.txt').read_text()
                method = 'OCR visible pixels (English; diacritics normalized)'
                origins.update(_production_spacing_tsv_origins(base.with_suffix('.tsv').read_text(), _production_spacing_markers(count), i + 1, page_mm, [high.width, high.height]))
            else:
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines', []):
                        value = _parity_content_compact(''.join((s['text'] for s in line['spans'])))
                        for m in _production_spacing_markers(count):
                            if value == _parity_content_compact(m):
                                origins[m] = {'page': i + 1, 'top_left_mm': [round(v * 25.4 / 72, 3) for v in line['bbox'][:2]]}
            texts.append(text)
            methods.append(method)
    return ({'pages': len(texts), 'content': _production_spacing_content(texts, count), 'photos': photos, 'title_positions': origins, 'pixel_sha256': pixels, 'text_methods': methods, 'producer': producer}, images)


# parity_content: compare_photo
def _parity_content_compare_photo(expected, actual, *, tolerance_mm=2.0):
    if not expected.get('visible') or not actual.get('visible'):
        return {'status': 'FAIL', 'reason': 'calibration photo missing from App or DOCX PDF'}
    deltas = [round(abs(a - b), 3) for a, b in zip(expected['bbox_mm'], actual['bbox_mm'])]
    agreement = sum((a == b for a, b in zip(expected['grid'], actual['grid']))) / 64
    ok = max(deltas) <= tolerance_mm and agreement >= 0.9
    return {'status': 'PASS' if ok else 'FAIL', 'bbox_delta_mm': deltas, 'max_allowed_mm': tolerance_mm, 'pattern_agreement': round(agreement, 4), 'min_pattern_agreement': 0.9}


# production_spacing: compare
def _production_spacing_compare(app, actual, count, mirrored):
    expected = _production_spacing_markers(count)
    ac = app['content']
    lc = actual['content']
    page_changes = [m for m in expected if ac['marker_pages'][m] != lc['marker_pages'][m]]
    span_changes = [e['marker'] for e, f in zip(ac['entries'], lc['entries']) if (e['start_page'], e['end_page']) != (f['start_page'], f['end_page'])]
    geometry = []
    for m in expected:
        a = app['title_positions'].get(m)
        b = actual['title_positions'].get(m)
        geometry.append({'marker': m, 'app': a, 'lo': b, 'delta_mm': [round(y - x, 3) for x, y in zip(a['top_left_mm'], b['top_left_mm'])] if a and b and (a['page'] == b['page']) else None})
    geo_ok = all((g['delta_mm'] is not None and max((abs(v) for v in g['delta_mm'])) <= 2.0 for g in geometry))
    photo = _parity_content_compare_photo(app['photos'][0], actual['photos'][0])
    side = 'right' if mirrored else 'left'
    photo['expected_side'] = side
    if any((('right' if p.get('bbox_mm', [0])[0] > 105 else 'left') != side for p in [app['photos'][0], actual['photos'][0]])):
        photo.update(status='FAIL', side_mismatch=True)
    if any((p.get('visible') for p in app['photos'][1:] + actual['photos'][1:])):
        photo.update(status='FAIL', repeated_on_continuation=True)
    layout_ok = app['pages'] == actual['pages'] and (not page_changes) and (not span_changes) and (not lc['split_entries']) and geo_ok
    accepted = ac['status'] == lc['status'] == 'PASS' and layout_ok and (photo['status'] == 'PASS')
    return {'status': 'PASS' if accepted else 'FAIL', 'content_status': lc['status'], 'layout_status': 'PASS' if layout_ok else 'FAIL', 'photo': photo, 'pages_match': app['pages'] == actual['pages'], 'title_page_changes': page_changes, 'entry_span_changes': span_changes, 'title_geometry': geometry, 'title_geometry_status': 'PASS' if geo_ok else 'FAIL', 'title_geometry_tolerance_mm': 2.0}


# parity_content: docx_text
def _parity_content_docx_text(path):
    with ZipFile(path) as pkg:
        names = [n for n in pkg.namelist() if re.fullmatch('word/(document|[^/]*(?:header|footer)[^/]*)\\.xml', n)]
        return ' '.join((t.text or '' for n in names for t in ET.fromstring(pkg.read(n)).iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t')))


# reference_anchor: line_pixels
def _reference_anchor_line_pixels(rgb):
    """Require a long continuous dark run, rather than counting text-like marks."""
    rgb = rgb.convert('RGB')
    pixels = rgb.load()
    longest = 0
    best_y = None
    if rgb.width < 1 or rgb.height < 1:
        raise ValueError('Empty reference-line crop')
    for y in range(rgb.height):
        run = 0
        for x in range(rgb.width):
            pixel = pixels[x, y]
            dark = sum(pixel) / 3 < 195 and min(pixel) < 180
            run = run + 1 if dark else 0
            if run > longest:
                longest = run
                best_y = y
    fraction = longest / rgb.width
    return {'status': 'PASS' if fraction >= 0.85 else 'FAIL', 'longest_dark_run_fraction': round(fraction, 6), 'required_fraction': 0.85, 'best_row': best_y, 'pixel_size': [rgb.width, rgb.height]}


# reference_anchor: reference_line
def _reference_anchor_reference_line(pdf, crop_path=None):
    with fitz.open(pdf) as doc:
        found = []
        for number, page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    if ''.join((s['text'] for s in line['spans'])).strip().upper() == 'REFERENZEN':
                        found.append((number, line['bbox']))
        if len(found) != 1:
            return {'status': 'FAIL', 'reason': 'Reference heading missing or nonunique', 'heading_count': len(found)}
        number, bbox = found[0]
        mm = 72 / 25.4
        rect = fitz.Rect(bbox[0] + 30 * mm, bbox[1] - 0.5 * mm, bbox[0] + 60 * mm, bbox[3] + 0.5 * mm)
        if not doc[number].rect.contains(rect):
            return {'status': 'FAIL', 'reason': 'Reference-line crop outside page'}
        pix = doc[number].get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect, alpha=False)
        rgb = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        result = _reference_anchor_line_pixels(rgb)
        result.update(page=number + 1, crop_mm=[round(v / mm, 3) for v in rect], heading_count=1)
        if crop_path:
            rgb.save(crop_path)
        return result


# entry_rows: reference_group
def _entry_rows_reference_group(line, actual):
    pages = actual['content']['marker_pages']['P202Endreferenz']
    ok = line.get('heading_count') == 1 and len(pages) == 1 and (line.get('page') == pages[0])
    return {'status': 'PASS' if ok else 'FAIL', 'heading_page': line.get('page'), 'body_pages': pages}


# body_flow: LABELS
_body_flow_LABELS = ['FAMILIE', 'SCHULBILDUNG', 'PRAKTIKA & SCHNUPPERTAGE', 'REFERENZEN']


# body_flow: section_lines
def _body_flow_section_lines(pdf):
    found = {label: [] for label in _body_flow_LABELS}
    results = {}
    mm = 72 / 25.4
    with fitz.open(pdf) as doc:
        for i, page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    label = ' '.join(''.join((s['text'] for s in line['spans'])).upper().split())
                    if label in found:
                        found[label].append((i, line['bbox']))
        for label, occurrences in found.items():
            if len(occurrences) != 1:
                results[label] = {'status': 'FAIL', 'reason': 'Heading missing or nonunique', 'heading_count': len(occurrences)}
                continue
            page, bbox = occurrences[0]
            rect = fitz.Rect(bbox[2] + 5 * mm, bbox[1] - 0.5 * mm, bbox[2] + 20 * mm, bbox[3] + 0.5 * mm)
            if not doc[page].rect.contains(rect):
                results[label] = {'status': 'FAIL', 'reason': 'Probe outside page'}
                continue
            pix = doc[page].get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect, alpha=False)
            result = _reference_anchor_line_pixels(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
            result.update(page=page + 1, heading_count=1, crop_mm=[round(v / mm, 3) for v in rect])
            results[label] = result
    return results


# detached_main: page_edges
def _detached_main_page_edges(pdf):
    rows = []
    with fitz.open(pdf) as doc:
        for page in doc:
            crops = [fitz.Rect(0, 0, page.rect.width, 45 * 72 / 25.4), fitz.Rect(0, 292 * 72 / 25.4, page.rect.width, page.rect.height)]
            hashes = [hashlib.sha256(page.get_pixmap(matrix=fitz.Matrix(96 / 72, 96 / 72), clip=crop, alpha=False).samples).hexdigest() for crop in crops]
            rows.append({'header_sha256': hashes[0], 'bottom_sha256': hashes[1]})
    return rows


# converter_poc: run_conversion
def _converter_poc_run_conversion(command, target, log, timeout):
    target.unlink(missing_ok=True)
    timing = log.with_suffix('.resources.json')
    timed = ['/usr/bin/time', '-f', '{"max_rss_kib":%M,"elapsed_seconds":%e,"exit_code":%x}', '-o', str(timing), *command] if Path('/usr/bin/time').exists() else command
    start = time.monotonic()
    try:
        with log.open('w') as stream:
            proc = subprocess.Popen(timed, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
            usage = None
            while True:
                pid, status, current = os.wait4(proc.pid, os.WNOHANG)
                if pid:
                    proc.returncode = os.waitstatus_to_exitcode(status)
                    usage = current
                    break
                if time.monotonic() - start > timeout:
                    import signal
                    os.killpg(proc.pid, signal.SIGKILL)
                    proc.wait()
                    raise subprocess.TimeoutExpired(command, timeout)
                time.sleep(0.05)
        result = {'returncode': proc.returncode, 'seconds': round(time.monotonic() - start, 3), 'max_rss_kib': usage.ru_maxrss, 'cpu_seconds': round(usage.ru_utime + usage.ru_stime, 3)}
        if timing.exists():
            for line in timing.read_text().splitlines():
                if line.startswith('{'):
                    result.update(json.loads(line))
        if proc.returncode or not target.is_file() or target.stat().st_size < 1000:
            raise RuntimeError(f'No usable PDF; exit={proc.returncode}; see {log.name}')
        with fitz.open(target) as pdf:
            if not pdf.page_count:
                raise RuntimeError('Empty PDF')
        return result
    except (OSError, subprocess.TimeoutExpired, RuntimeError) as exc:
        if isinstance(exc, subprocess.TimeoutExpired):
            log.write_text(str(exc))
        return {'status': 'BLOCKED', 'error': str(exc), 'seconds': round(time.monotonic() - start, 3)}

make_candidate_core = _row_metrics_make_copy
make_native_control = _body_flow_make_copy
measure = _production_spacing_measure
compare = _production_spacing_compare
content = _production_spacing_content
digest = _production_spacing_digest
docx_text = _parity_content_docx_text
reference_line = _reference_anchor_reference_line
reference_group = _entry_rows_reference_group
section_lines = _body_flow_section_lines
page_edges = _detached_main_page_edges
run_conversion = _converter_poc_run_conversion
