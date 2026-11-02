#!/usr/bin/env python3
"""P2-19: page/margin coordinate frames for the mirrored portrait.

QA chooses the previously measured layout per explicit fixture family; no
production selection rule. Equivalent margin coordinates preserve the declared
first-section page x position; this is not a Word-engine verification.
"""
from copy import deepcopy
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import dossier_entry_rows as entries
from dossier_layout_rows import drawing_payloads, word_values
from dossier_lo_context import W, WP, NS, canon, parse_part
from dossier_production_spacing import critical, digest

P218_SHA256 = '35576f8737db1a66af9ba37b38dbf54dab094b6dd9cc753ba849fff5c6e48f41'
PROFILES = ['original-photo', 'margin-equivalent', 'margin-unadjusted', 'page-compensated']


def photo(root):
    found = [d for d in root.iter(W + 'drawing') if (p := d.find('.//' + WP + 'docPr')) is not None and p.get('name') == 'cv.person.photo']
    if len(found) != 1:
        raise ValueError('Expected one portrait drawing')
    return found[0]


def layout_profile(source):
    # Explicit experiment fixtures, not text-length inference or product routing.
    return 'entry-rows-nosplit' if 'varied' in source.name else 'fixed-5-14'


def make_copy(source, target, profile):
    if profile not in PROFILES:
        raise ValueError('Unknown photo-frame profile')
    layout = layout_profile(source)
    meta = entries.make_copy(source, target, layout)
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    drawing = photo(root)
    position = drawing.find(WP + 'anchor/' + WP + 'positionH')
    offset = position.find(WP + 'posOffset') if position is not None else None
    if position is None or position.get('relativeFrom') != 'page' or offset is None:
        raise ValueError('Expected original page-based photo offset')
    margins = root.findall('w:body/w:sectPr/w:pgMar', NS)
    if len(margins) != 1:
        raise ValueError('Expected one final section margin')
    left = int(margins[0].get(W + 'left')) * 635
    x = int(offset.text)
    if profile in ['margin-equivalent', 'margin-unadjusted']:
        position.set('relativeFrom', 'margin')
    if profile in ['margin-equivalent', 'page-compensated']:
        offset.text = str(x - left)
    # The original baseline must remain byte-for-byte unchanged.
    if profile != 'original-photo':
        parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        with ZipFile(target, 'w') as z:
            for info in infos:
                z.writestr(info, parts[info.filename])
    if word_values(root) != word_values(before) or critical(root, 18) != critical(before, 18):
        raise ValueError('Text or critical table changed')
    # Removing the portrait from both trees proves all surrounding XML identical.
    a, b = deepcopy(before), deepcopy(root)
    for tree in [a, b]:
        target_drawing = photo(tree)
        for parent in tree.iter():
            if target_drawing in list(parent):
                parent.remove(target_drawing)
                break
    if canon(a) != canon(b):
        raise ValueError('Non-photo document payload changed')
    old_photo = deepcopy(photo(before))
    old_position = old_photo.find(WP + 'anchor/' + WP + 'positionH')
    old_position.attrib.clear()
    old_position.attrib.update(position.attrib)
    old_position.find(WP + 'posOffset').text = offset.text
    if canon(old_photo) != canon(drawing):
        raise ValueError('Photo edit extended beyond horizontal frame/offset')
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any(a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml'):
            raise ValueError('Unrelated package parts changed')
    declared_x = int(offset.text) + (left if position.get('relativeFrom') == 'margin' else 0)
    changed = canon(drawing) != canon(photo(before))
    meta.update(profile=profile, layout_control_profile=layout, copy_sha256=digest(target),
                photo_frame_before='page', photo_frame_after=position.get('relativeFrom'),
                photo_offset_emu_before=x, photo_offset_emu_after=int(offset.text), section_left_margin_emu=left,
                declared_page_x_emu_before=x, declared_page_x_emu_after=declared_x,
                declared_page_x_equivalent=declared_x == x, photo_horizontal_anchor_only_changed=changed,
                drawing_payloads_identical=7 if changed else 8, photo_graphic_payload_identical=True,
                sidebar_payload_identical=not changed, sidebar_text_and_non_photo_payload_identical=True,
                word_verification='NOT_PERFORMED', declared_losses=meta['declared_losses'] +
                (['Declared OOXML horizontal page position changes; converter-specific diagnostic only'] if declared_x != x else []))
    return meta


def main():
    path = Path(__file__).resolve().parents[1] / 'docs/qa/p2-18-native-results.json'
    if digest(path) != P218_SHA256:
        raise ValueError('Pinned P2-18 native evidence changed')
    previous = json.loads(path.read_text())
    def baseline(row, source):
        if row['profile'] != 'original-photo':
            return
        expected = next(c for c in previous['cases'] if c['source_id'] == row['source_id'] and c['profile'] == row['package']['layout_control_profile'])
        row['baseline_input_match_p218'] = row['package']['copy_sha256'] == expected['package']['copy_sha256']
        row['baseline_pixels_match_p218'] = row['actual']['pixel_sha256'] == expected['actual']['pixel_sha256']
        if not row['baseline_input_match_p218'] or not row['baseline_pixels_match_p218']:
            raise ValueError('P2-18 layout baseline changed')
    return entries.main(profiles=PROFILES, builder=make_copy, case_check=baseline,
                        title='P2-19 — portrait coordinate frames',
                        scope='Frozen actual ordinary/varied Next sources; explicit prior layout control per fixture family, no automatic product routing. Photo horizontal frame/offset only; not Word/x39 acceptance.',
                        extra_evidence={'p218_native_report_sha256': P218_SHA256})


if __name__ == '__main__':
    raise SystemExit(main())
