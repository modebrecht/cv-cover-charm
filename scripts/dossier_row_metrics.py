#!/usr/bin/env python3
"""P2-24: isolate empty-footer/page-area constraints on frozen diagnostic copies."""
import argparse
from copy import deepcopy
import json
from pathlib import Path, PurePosixPath
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz

import dossier_entry_rows as entries
from dossier_body_flow import make_copy as body_copy, leaves, section_lines
from dossier_detached_main import page_edges
from dossier_layout_rows import word_values, drawing_payloads
from dossier_lo_context import W, NS, canon, parse_part
from dossier_production_spacing import critical, digest, markers

P223_SHA256 = 'a55793da0a3349f88f46b221324460fa33e74c592f407993952a699a2cd01a58'
PROFILES = ['prior-control', 'footer-distance-zero', 'footer-references-off', 'bottom-margin-zero']
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def empty_footers(parts, root):
    refs = root.findall('w:body/w:sectPr/w:footerReference', NS)
    if len(refs) != 2 or {n.get(W+'type') for n in refs} != {'default', 'first'}:
        raise ValueError('Expected exactly first/default footer references')
    rels = parse_part(parts['word/_rels/document.xml.rels'])
    result = []
    for ref in refs:
        matches = [n for n in rels if n.get('Id') == ref.get(R+'id')]
        if len(matches) != 1 or matches[0].get('TargetMode') == 'External':
            raise ValueError('Missing or external footer relationship')
        rel = matches[0]
        if not rel.get('Type', '').endswith('/footer'):
            raise ValueError('Unexpected footer relationship type')
        name = str(PurePosixPath('word') / rel.get('Target'))
        if '..' in PurePosixPath(name).parts:
            raise ValueError('Unexpected footer path')
        footer = parse_part(parts[name])
        allowed = {W+n for n in ['ftr', 'p', 'pPr', 'spacing']}
        if footer.tag != W+'ftr' or any(n.tag not in allowed for n in footer.iter()) or any(t.strip() for t in footer.itertext()):
            raise ValueError('Footer is not the verified empty-paragraph fixture')
        if len(footer.findall('w:p', NS)) != 1:
            raise ValueError('Expected one empty footer paragraph')
        result.append(name)
    return result


def section_metrics(root):
    section = root.find('w:body/w:sectPr', NS)
    size, margin = section.find('w:pgSz', NS), section.find('w:pgMar', NS)
    return {'page_twips': {k.split('}')[-1]: int(v) for k, v in size.attrib.items()},
            'margin_twips': {k.split('}')[-1]: int(v) for k, v in margin.attrib.items()},
            'footer_reference_count': len(section.findall('w:footerReference', NS)),
            'nominal_body_bottom_mm': round((int(size.get(W+'h'))-int(margin.get(W+'bottom')))*25.4/1440, 3),
            'effective_native_body_bottom': 'NOT_MEASURED: PDF text ink does not expose Writer row/page-area boxes'}


def make_copy(source, target, profile):
    if profile not in PROFILES:
        raise ValueError('Unknown row-metrics profile')
    meta = body_copy(source, target, 'body-flow-nosplit-front')
    with ZipFile(target) as z:
        infos = z.infolist(); parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml']); before = deepcopy(root)
    footer_parts = empty_footers(parts, root)
    section = root.find('w:body/w:sectPr', NS)
    margin = section.find('w:pgMar', NS)
    if margin.get(W+'footer') != '680' or margin.get(W+'bottom') != '283':
        raise ValueError('Frozen source page-area settings changed')
    if profile == 'footer-distance-zero':
        margin.set(W+'footer', '0')
    elif profile == 'footer-references-off':
        for node in section.findall('w:footerReference', NS): section.remove(node)
    elif profile == 'bottom-margin-zero':
        margin.set(W+'bottom', '0')
    expected = deepcopy(before)
    expected.find('w:body', NS).remove(expected.find('w:body/w:sectPr', NS))
    expected.find('w:body', NS).append(deepcopy(section))
    if canon(expected) != canon(root) or critical(before, 18) != critical(root, 18) or drawing_payloads(before) != drawing_payloads(root):
        raise ValueError('Page-area edit changed content or graphics')
    if profile != 'prior-control':
        parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        with ZipFile(target, 'w') as z:
            for info in infos: z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any(a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml'):
            raise ValueError('Non-document part changed')
    meta.update(profile=profile, copy_sha256=digest(target), empty_footer_parts_verified=footer_parts,
                section_before=section_metrics(before), section_after=section_metrics(root),
                critical_tables_identical_to_body_flow_front_control=19,
                page_area_edit={'prior-control': 'none', 'footer-distance-zero': 'pgMar.footer 680 -> 0',
                                'footer-references-off': 'remove two empty footer references; parts/rels retained',
                                'bottom-margin-zero': 'pgMar.bottom 283 -> 0'}[profile])
    if profile != 'prior-control': meta['declared_losses'].append(meta['page_area_edit'])
    return meta


def entry_ink(pdf, count=18):
    """Visible text bbox extent only: never called an effective row-box height."""
    with fitz.open(pdf) as doc:
        lines = [(i+1, line) for i, page in enumerate(doc) for block in page.get_text('dict')['blocks'] for line in block.get('lines', [])]
    def value(line): return ''.join(s['text'] for s in line['spans']).strip()
    result = []
    all_markers = markers(count)
    for number, marker in enumerate(all_markers[:-1]):
        hits = [i for i, (_, line) in enumerate(lines) if value(line) == marker]
        if len(hits) != 1: raise ValueError('Missing/nonunique native entry title')
        start = hits[0]
        end = next((i for i in range(start+1, len(lines)) if all_markers[number+1] in value(lines[i][1])), len(lines))
        terminals = [i for i in range(start+1, end) if 'Arbeitsschritte' in value(lines[i][1])]
        if len(terminals) != 1: raise ValueError('Missing/nonunique terminal description line')
        first, last = lines[start], lines[terminals[0]]
        top, bottom = first[1]['bbox'][1]*25.4/72, last[1]['bbox'][3]*25.4/72
        result.append({'marker': marker, 'title_page': first[0], 'terminal_description_page': last[0],
                       'title_ink_top_mm': round(top, 3), 'terminal_ink_bottom_mm': round(bottom, 3),
                       'same_page_ink_extent_mm': round(bottom-top, 3) if first[0] == last[0] else None})
    return result


def source_rules(source):
    with ZipFile(source) as z: root = parse_part(z.read('word/document.xml'))
    tables = leaves(root)[:18]
    rules = []
    for table in tables:
        row = table.find('w:tr', NS)
        rules.append({'row_properties_xml': canon(row.find('w:trPr', NS)) if row.find('w:trPr', NS) is not None else None,
                      'table_properties_xml': canon(table.find('w:tblPr', NS)),
                      'cell_properties_xml': [canon(c.find('w:tcPr', NS)) for c in row.findall('w:tc', NS)],
                      'paragraph_properties_xml': [canon(p.find('w:pPr', NS)) if p.find('w:pPr', NS) is not None else None for p in row.findall('.//w:p', NS)]})
    return {'section': section_metrics(root), 'entries_05_06_14_15': {f'{i+1:02}': rules[i] for i in [4,5,13,14]},
            'all_18_explicit_row_heights': [len(t.findall('w:tr/w:trPr/w:trHeight', NS)) for t in tables],
            'scope': 'Declared OOXML rules; no effective Writer row-box measurement inferred'}


def main():
    root = Path(__file__).resolve().parents[1]
    path = root/'docs/qa/p2-23-native-results.json'
    if digest(path) != P223_SHA256: raise ValueError('Pinned P223 report changed')
    previous = json.loads(path.read_text())
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--out-dir', type=Path, required=True); args, _ = parser.parse_known_args()
    edges = {}
    def check(row, source):
        pdf = args.out_dir.resolve()/row['id']/'copy.pdf'
        row['entry_visible_ink'] = entry_ink(pdf)
        row['page_edge_signatures'] = page_edges(pdf)
        if row['profile'] == 'prior-control':
            expected = next(c for c in previous['cases'] if c['source_id'] == source['id'] and c['profile'] == 'body-flow-nosplit-front')
            row['baseline_input_match_p223'] = row['package']['copy_sha256'] == expected['package']['copy_sha256']
            row['baseline_pixels_match_p223'] = row['actual']['pixel_sha256'] == expected['actual']['pixel_sha256']
            if not row['baseline_input_match_p223'] or not row['baseline_pixels_match_p223']: raise ValueError('P223 control changed')
            edges[source['id']] = row['page_edge_signatures']
        prior = edges[source['id']]
        row['page_edge_status'] = 'PASS' if len(prior) == len(row['page_edge_signatures']) and all(a == b for a, b in zip(prior, row['page_edge_signatures'])) else 'FAIL'
        row['section_lines'] = section_lines(pdf)
        row['section_line_status'] = 'PASS' if all(v['status'] == 'PASS' for v in row['section_lines'].values()) else 'FAIL'
        if row['page_edge_status'] != 'PASS' or row['section_line_status'] != 'PASS': row['trial_status'] = 'FAIL'
    _, cases = entries.load_cases(root)
    return entries.main(profiles=PROFILES, builder=make_copy, case_check=check,
                        title='P2-24 — empty footers and visible entry ink measurements',
                        scope='Four frozen actual 18-entry Next exports, ordinary/varied and both sides. P223 control vs three isolated page-area probes. Native text ink extents and declared OOXML; effective row boxes NOT measured. Original App gates unchanged. No product/x39/Word acceptance.',
                        extra_evidence={'p223_report_sha256': P223_SHA256,
                                        'source_rules': {c['id']: source_rules(s) for c, s in cases},
                                        'page_area_hypothesis': 'Empty active footer may reduce effective native body area; not assumed from nominal margins.'})


if __name__ == '__main__': raise SystemExit(main())
