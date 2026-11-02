#!/usr/bin/env python3
"""P2-18: isolate continuation entries and group reference heading/body.

Frozen actual UI exports and App metrics from P2-17. No page-driven cuts,
leaf-table edits, fresh App exports, product changes or Word acceptance.
"""
import argparse
from collections import Counter
from copy import deepcopy
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz

from dossier_converter_poc import run_conversion
from dossier_layout_rows import drawing_payloads, word_values
from dossier_lo_context import W, NS, canon, parse_part
from dossier_lo_minimal import paragraph
from dossier_production_spacing import critical, compare, digest, measure
from dossier_reference_anchor import reference_line
from dossier_row_generalization import make_copy as fixed_copy

REFERENCE_SHA256 = 'c48da0d455604efb27521bd8f111db5ea072b9e1b626c608d2da7dbd8b38f327'
PROFILES = ['fixed-5-14', 'entry-rows', 'entry-rows-nosplit']


def make_copy(source, target, profile):
    if profile not in PROFILES:
        raise ValueError('Unknown entry-row profile')
    meta = fixed_copy(source, target, 18)
    if profile == 'fixed-5-14':
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    table = root.find('w:body/w:tbl', NS)
    rows = table.findall('w:tr', NS)
    mi = 0 if 'P202Praxis01' in ''.join(word_values(rows[0].findall('w:tc', NS)[0])) else 2
    cells = rows[0].findall('w:tc', NS)
    nodes = [n for row in rows for n in row.findall('w:tc', NS)[mi] if n.tag != W + 'tcPr']
    blocks = [canon(n) for n in nodes]
    cuts = []
    for number in range(6, 19):
        found = [i for i, n in enumerate(nodes) if n.tag == W + 'tbl' and f'P202Praxis{number:02}' in ''.join(word_values(n))]
        if len(found) != 1:
            raise ValueError('Missing unique direct entry boundary')
        cuts += found
    references = [i for i, n in enumerate(nodes) if ''.join(word_values(n)) == 'Referenzen']
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
        if n.tag != W + 'tcPr':
            cells[mi].remove(n)
    cells[mi].extend(chunks[0])
    for chunk in chunks[1:]:
        row = ET.SubElement(table, W + 'tr')
        if profile == 'entry-rows-nosplit':
            ET.SubElement(ET.SubElement(row, W + 'trPr'), W + 'cantSplit')
        for i, cell in enumerate(cells):
            new = ET.SubElement(row, W + 'tc')
            new.append(deepcopy(cell.find('w:tcPr', NS)))
            if i == mi:
                new.extend(chunk)
            else:
                new.append(paragraph(line=1, keep=False))
    rows = table.findall('w:tr', NS)
    moved = [canon(n) for row in rows for n in row.findall('w:tc', NS)[mi] if n.tag != W + 'tcPr']
    if moved != blocks or critical(root, 18) != critical(before, 18):
        raise ValueError('Main or leaf-table payload changed')
    if Counter(word_values(root)) != Counter(word_values(before)) or drawing_payloads(root) != drawing_payloads(before):
        raise ValueError('Text or graphic payload changed')
    if len(root.findall('.//w:sdt', NS)) != 107:
        raise ValueError('Content-control count changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as z:
        for info in infos:
            z.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        if a.namelist() != b.namelist() or any(a.read(n) != b.read(n) for n in a.namelist() if n != 'word/document.xml'):
            raise ValueError('Unrelated package parts changed')
    meta.update(profile=profile, copy_sha256=digest(target), layout_rows=len(rows),
                continuation_rows_cant_split=profile == 'entry-rows-nosplit',
                row_entry_ranges=[[1, 5]] + [[i, i] for i in range(6, 19)] + [['reference', 'reference']],
                reference_heading_body_grouped=True, first_layout_row_properties_unchanged=True)
    return meta


def reference_group(line, actual):
    pages = actual['content']['marker_pages']['P202Endreferenz']
    ok = line.get('heading_count') == 1 and len(pages) == 1 and line.get('page') == pages[0]
    return {'status': 'PASS' if ok else 'FAIL', 'heading_page': line.get('page'), 'body_pages': pages}


def load_cases(root):
    path = root / 'docs/qa/p2-17-native-results.json'
    if digest(path) != REFERENCE_SHA256:
        raise ValueError('Pinned P2-17 report changed')
    report = json.loads(path.read_text())
    cases = []
    for side in ['left', 'right']:
        for varied in [False, True]:
            tag = f'cv-18-{"varied-" if varied else ""}{side}'
            case = next(c for c in report['cases'] if c['id'] == tag)
            if varied:
                folder = 'lo-import-p2-17' if side == 'left' else 'lo-import-p2-18'
                source = root / f'tests/fixtures/{folder}/{tag}-original.docx'
            else:
                source = root / f'tests/fixtures/lo-import-p2-08/{tag}-original.docx'
            if digest(source) != next(f['sha256'] for f in case['source_files'] if f['format'] == 'DOCX'):
                raise ValueError('Source download hash mismatch')
            cases.append((case, source))
    return report, cases


def main(*, profiles=None, builder=None, case_check=None, title='P2-18 — continuation entry rows', scope=None, extra_evidence=None):
    profiles = PROFILES if profiles is None else profiles
    builder = make_copy if builder is None else builder
    root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out-dir', type=Path, required=True)
    p.add_argument('--libreoffice', default='libreoffice')
    p.add_argument('--audit-only', action='store_true')
    a = p.parse_args()
    previous, cases = load_cases(root)
    out = a.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    old = json.loads((out / 'RESULTS.json').read_text()) if a.audit_only else None
    report = {'implementation_sha': old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
              'source_export_sha': previous['source_export_sha'], 'reference_report_sha256': REFERENCE_SHA256,
              'scope': scope or 'Frozen 18-entry ordinary/varied actual Next exports; unchanged leaf tables. No fresh App export/product/x39/Word acceptance.',
              'converter_version': old['converter_version'] if old else subprocess.run([a.libreoffice, '--version'], capture_output=True, text=True, timeout=10).stdout.strip(),
              'audit_only': a.audit_only, 'cases': [], 'conversion_attempts': []}
    if extra_evidence is not None:
        report['additional_evidence'] = extra_evidence
    try:
        for source_case, source in cases:
            tag = source_case['id']
            for profile in profiles:
                folder = out / (tag + '-' + profile)
                folder.mkdir(exist_ok=True)
                docx = folder / 'copy.docx'
                if old:
                    with tempfile.TemporaryDirectory() as temp:
                        package = builder(source, Path(temp) / 'copy.docx', profile)
                    if digest(docx) != package['copy_sha256']:
                        raise ValueError('Retained DOCX differs from rebuilt copy')
                else:
                    package = builder(source, docx, profile)
                pdf = folder / 'copy.pdf'
                if old:
                    prior = next(c for c in old['cases'] if c['id'] == folder.name)
                    if digest(pdf) != prior['pdf_sha256']:
                        raise ValueError('Retained PDF hash mismatch')
                    resources = prior['resources']
                else:
                    user = folder / 'profile'
                    resources = run_conversion([a.libreoffice, '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
                                                '-env:UserInstallation=' + user.as_uri(), '--convert-to', 'pdf', '--outdir', str(folder), str(docx)], pdf, folder / 'conversion.log', 90)
                    shutil.rmtree(user, ignore_errors=True)
                    report['conversion_attempts'].append({'id': folder.name, 'resources': resources})
                    if resources.get('status') == 'BLOCKED':
                        raise RuntimeError(resources['error'])
                actual, _ = measure(pdf, folder, 'native', 18, native_blank_pages=True)
                comparison = compare(source_case['app'], actual, 18, source_case['mirrored'])
                line = reference_line(pdf, folder / 'reference-line.png')
                group = reference_group(line, actual)
                with fitz.open(pdf) as document:
                    text = ''.join(page.get_text() for page in document)
                missing = [f'P217Zusatz{i:02}' for i in range(1, 19) if text.count(f'P217Zusatz{i:02}') != 1] if source_case['varied_text'] else []
                row = {'id': folder.name, 'source_id': tag, 'profile': profile, 'varied_text': source_case['varied_text'],
                       'mirrored': source_case['mirrored'], 'package': package, 'pdf_sha256': digest(pdf),
                       'resources': resources, 'actual': actual, 'comparison': comparison, 'reference_line': line,
                       'reference_group': group, 'extra_description_markers_missing': missing,
                       'trial_status': 'PASS' if comparison['status'] == line['status'] == group['status'] == 'PASS' and not missing else 'FAIL',
                       'product_disposition': 'NOT_ACCEPTED'}
                if profile == 'fixed-5-14':
                    baseline = next(v for v in source_case['variants'] if v['id'] == 'rows-5-14')
                    row['baseline_docx_match_p217'] = package['copy_sha256'] == baseline['package']['copy_sha256'] if 'package' in baseline else package['copy_sha256'] == source_case['package']['copy_sha256']
                    row['baseline_pixels_match_p217'] = actual['pixel_sha256'] == baseline['actual']['pixel_sha256']
                    if not row['baseline_docx_match_p217'] or not row['baseline_pixels_match_p217']:
                        raise ValueError('P2-17 baseline changed')
                if case_check is not None:
                    case_check(row, source_case)
                report['cases'].append(row)
                print(row['id'], row['trial_status'], 'complete', actual['content']['complete_entries'], 'pages', actual['pages'],
                      'splits', actual['content']['split_entries'], 'reference', group['status'], flush=True)
        report['execution_status'] = 'PASS' if len(report['cases']) == 4 * len(profiles) else 'FAIL'
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired) as exc:
        report['execution_status'] = 'FAIL'
        report['error'] = str(exc)
    report['native_conversion_count'] = len(report['conversion_attempts'])
    (out / 'RESULTS.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    lines = ['# ' + title, '', report['scope'], '',
             '| Case | Trial | Complete | Pages | Layout | Photo | Ref group |', '|---|---|---:|---:|---|---|---|']
    for c in report['cases']:
        lines.append(f"| {c['id']} | {c['trial_status']} | {c['actual']['content']['complete_entries']}/18 | {c['actual']['pages']} | {c['comparison']['layout_status']} | {c['comparison']['photo']['status']} | {c['reference_group']['status']} |")
    lines += ['', 'Execution: ' + report['execution_status']]
    if report.get('error'):
        lines += ['', report['error']]
    (out / 'SUMMARY.md').write_text('\n'.join(lines) + '\n')
    return 0 if report['execution_status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
