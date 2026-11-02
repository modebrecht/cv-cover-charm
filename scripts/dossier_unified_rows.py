#!/usr/bin/env python3
"""P2-20: one protected-entry structure with a bounded prelude-gap counterprobe."""
from copy import deepcopy
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import dossier_entry_rows as entries
from dossier_photo_frame import make_copy as photo_copy
from dossier_lo_context import W, NS, canon, parse_part
from dossier_layout_rows import word_values
from dossier_lo_isolation import attribute_diff
from dossier_production_spacing import critical, digest

PROFILES = ['guarded-line20', 'guarded-prelude-line1']
P219_SHA256 = 'cefb4ea23416455ae11da353eeb6d03caefe0084e748575c638da59a4506642d'
P218_SHA256 = '35576f8737db1a66af9ba37b38dbf54dab094b6dd9cc753ba849fff5c6e48f41'


def make_copy(source, target, profile):
    if profile not in PROFILES:
        raise ValueError('Unknown unified-row profile')
    with ZipFile(source) as z:
        source_root = parse_part(z.read('word/document.xml'))
    count = len(re.findall(r'P202Praxis\d{2}', ''.join(word_values(source_root))))
    margins = source_root.find('w:body/w:sectPr/w:pgMar', NS)
    frame = 'margin-equivalent' if int(margins.get(W + 'left')) else 'original-photo'
    meta = photo_copy(source, target, frame, layout='entry-rows-nosplit', count=count)
    meta.update(profile=profile, photo_control_profile=frame, prelude_line_attribute_edits=[])
    if profile == 'guarded-line20':
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    cells = root.find('w:body/w:tbl/w:tr', NS).findall('w:tc', NS)
    mains = [c for c in cells if 'P202Praxis01' in ''.join(word_values(c))]
    if len(mains) != 1:
        raise ValueError('Expected one original prelude main cell')
    main = mains[0]
    initial = main.find('w:p', NS)
    gaps = [n for n in main if n.tag == W + 'p' and n is not initial and not word_values(n)]
    if len(gaps) != 7:
        raise ValueError('Expected exactly seven original empty prelude gaps')
    for gap in gaps:
        spacing = gap.find('w:pPr/w:spacing', NS)
        if spacing is None or spacing.get(W + 'line') != '20' or spacing.get(W + 'lineRule') != 'exact' or spacing.get(W + 'after') != '0':
            raise ValueError('Unexpected prelude paragraph spacing')
        spacing.set(W + 'line', '1')
    edits = attribute_diff(before, root)
    if len(edits) != 7 or any(e['attribute'] != W + 'line' or e['before'] != '20' or e['after'] != '1' for e in edits):
        raise ValueError('Unexpected prelude edit set')
    if critical(before, count) != critical(root, count) or word_values(root) != word_values(before):
        raise ValueError('Critical payload or text changed')
    old_cells = before.find('w:body/w:tbl/w:tr', NS).findall('w:tc', NS)
    if any(canon(a.find('w:p', NS)) != canon(b.find('w:p', NS)) for a, b in zip(old_cells, cells)):
        raise ValueError('Original cell leading paragraph changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    meta.update(copy_sha256=digest(target), prelude_line_attribute_edits=edits,
                main_story_blocks_identical=False, main_story_text_identical=True,
                declared_prelude_change='Seven empty paragraphs exact line20 to line1, excluding original cell-leading paragraph')
    return meta


def load_cases(root):
    report, original = entries.load_cases(root)
    paths = {c['id']: src for c, src in original}
    manifest = json.loads((root / 'tests/fixtures/lo-import-p2-20/SOURCES.json').read_text())
    for row in manifest['files']:
        path = root / 'tests/fixtures/lo-import-p2-20' / row['filename']
        if digest(path) != row['sha256']:
            raise ValueError('New retained source checksum mismatch')
        paths[row['source_id']] = path
    if len(paths) != 8:
        raise ValueError('Expected all eight P2-17 source families')
    result = []
    for case in report['cases']:
        path = paths[case['id']]
        if digest(path) != next(f['sha256'] for f in case['source_files'] if f['format'] == 'DOCX'):
            raise ValueError('Source differs from actual P2-17 download')
        result.append((case, path))
    return report, result


def main():
    root = Path(__file__).resolve().parents[1]
    previous = {}
    for phase, expected in [('p2-18', P218_SHA256), ('p2-19', P219_SHA256)]:
        path = root / f'docs/qa/{phase}-native-results.json'
        if digest(path) != expected:
            raise ValueError('Pinned earlier native report changed')
        previous[phase] = json.loads(path.read_text())
    def baseline(row, source):
        if row['profile'] != 'guarded-line20' or source['entry_count'] != 18:
            return
        prior = next(c for c in previous['p2-18']['cases'] if c['source_id'] == source['id'] and c['profile'] == 'entry-rows-nosplit')
        actual, old = row['actual'], prior['actual']
        row['baseline_main_metrics_match_p218'] = all(actual[k] == old[k] for k in ['pages', 'content', 'title_positions'])
        row['baseline_continuation_pixels_match_p218'] = actual['pixel_sha256'][1:] == old['pixel_sha256'][1:]
        photo = next(c for c in previous['p2-19']['cases'] if c['source_id'] == source['id'] and c['profile'] == row['package']['photo_control_profile'])
        row['baseline_photo_metrics_match_p219'] = actual['photos'] == photo['actual']['photos']
        if not all(row[k] for k in ['baseline_main_metrics_match_p218', 'baseline_continuation_pixels_match_p218', 'baseline_photo_metrics_match_p219']):
            raise ValueError('Unified baseline differs from prior measured layout/photo controls')
    return entries.main(profiles=PROFILES, builder=make_copy, case_loader=load_cases, case_check=baseline,
                        title='P2-20 — unified protected rows and seven prelude gaps',
                        scope='Eight actual P2-17 Next sources: 17/18/19 ordinary and 18 varied, both sides. Same protected-entry structure for all inputs, left original/right equivalent-margin photo; line20 vs line1 on seven prelude empty paragraphs. Frozen App metrics, no product/x39/Word acceptance.',
                        extra_evidence={'p218_report_sha256': P218_SHA256, 'p219_report_sha256': P219_SHA256})


if __name__ == '__main__':
    raise SystemExit(main())
