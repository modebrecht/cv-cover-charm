#!/usr/bin/env python3
"""P2-25: frozen 17/18/19-entry boundary matrix for the same P224 candidate."""
import argparse
import json
from pathlib import Path
import re
from zipfile import ZipFile

import dossier_entry_rows as entries
from dossier_body_flow import section_lines
from dossier_detached_main import page_edges
from dossier_layout_rows import word_values
from dossier_lo_context import parse_part
from dossier_row_metrics import make_copy as footer_copy, entry_ink, P223_SHA256
from dossier_production_spacing import digest
from dossier_unified_rows import load_cases

P224_SHA256 = '46df7c8b4ddc556e392b18c80a0f33dfedeb09d10cedd21e805888da95d19719'
PROFILES = ['prior-control', 'footer-distance-zero']


def entry_count(source):
    with ZipFile(source) as z: root = parse_part(z.read('word/document.xml'))
    found = re.findall(r'P202Praxis\d{2}', ''.join(word_values(root)))
    count = len(found)
    if count not in [17,18,19] or found != [f'P202Praxis{i:02}' for i in range(1,count+1)]:
        raise ValueError('Expected an exact unique 17/18/19-entry source marker sequence')
    return count


def make_copy(source, target, profile):
    if profile not in PROFILES: raise ValueError('Unknown boundary-check profile')
    return footer_copy(source, target, profile, count=entry_count(source))


def main():
    root = Path(__file__).resolve().parents[1]
    pinned = {}
    for phase, sha in [('p2-23',P223_SHA256),('p2-24',P224_SHA256)]:
        path = root/f'docs/qa/{phase}-native-results.json'
        if digest(path) != sha: raise ValueError('Pinned native report changed: '+phase)
        pinned[phase] = json.loads(path.read_text())
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--out-dir',type=Path,required=True);args,_ = parser.parse_known_args()
    edges = {}
    def check(row, source):
        if row['package']['entry_count'] != source['entry_count']: raise ValueError('Source/candidate count differs')
        pdf = args.out_dir.resolve()/row['id']/'copy.pdf'
        row['entry_visible_ink'] = entry_ink(pdf,source['entry_count'])
        row['section_lines'] = section_lines(pdf)
        row['section_line_status'] = 'PASS' if all(v['status']=='PASS' for v in row['section_lines'].values()) else 'FAIL'
        row['page_edge_signatures'] = page_edges(pdf)
        if source['entry_count'] == 18:
            phase,profile = ('p2-23','body-flow-nosplit-front') if row['profile']=='prior-control' else ('p2-24','footer-distance-zero')
            expected = next(c for c in pinned[phase]['cases'] if c['source_id']==source['id'] and c['profile']==profile)
            row['pinned_control_phase'] = phase
            row['pinned_copy_sha_match'] = row['package']['copy_sha256']==expected['package']['copy_sha256']
            row['pinned_all_page_pixels_match'] = row['actual']['pixel_sha256']==expected['actual']['pixel_sha256']
            if not row['pinned_copy_sha_match'] or not row['pinned_all_page_pixels_match']: raise ValueError('Pinned 18-entry candidate/control changed')
        if row['profile']=='prior-control': edges[source['id']] = row['page_edge_signatures']
        row['page_edge_status'] = 'PASS' if row['page_edge_signatures']==edges[source['id']] else 'FAIL'
        if row['section_line_status']!='PASS' or row['page_edge_status']!='PASS': row['trial_status']='FAIL'
    return entries.main(profiles=PROFILES,builder=make_copy,case_loader=load_cases,case_check=check,
                        title='P2-25 — adjacent pagination boundaries for the P224 candidate',
                        scope='Eight frozen actual Next exports: 17/18/19 ordinary plus 18 varied, both sides. One unchanged candidate rule and a body-flow control. No App-page-driven partitioning, product/exporter edits, fresh-source or x39/Word claim.',
                        extra_evidence={'p223_report_sha256':P223_SHA256,'p224_report_sha256':P224_SHA256,
                                        'planned_native_conversions':16,'new_boundary_sources':4,'pinned_18_entry_trials':8})


if __name__=='__main__':raise SystemExit(main())
