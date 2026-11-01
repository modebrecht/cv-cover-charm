#!/usr/bin/env python3
"""P2-17: fixed P2-16 row cuts on fresh 17/18/19-entry and varied-text exports.

Post-export diagnostic copies only. Cuts before entries 06 and 15 are held
constant; this experiment does not infer cuts from the App's expected pages.
"""
import argparse
from collections import Counter
from copy import deepcopy
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from PIL import Image, ImageDraw
from dossier_converter_poc import run_conversion
from dossier_layout_rows import drawing_payloads, partition, word_values
from dossier_lo_context import W, NS, canon, cells_of, parse_part
from dossier_lo_isolation import attribute_diff
from dossier_parity_content import docx_text
from dossier_production_spacing import critical, content, compare, digest, measure
from dossier_reference_anchor import reference_line


def make_copy(source, target, count):
    if source.resolve() == target.resolve():
        raise ValueError('Cannot overwrite source')
    if count not in [17, 18, 19]:
        raise ValueError('Unsupported entry count')
    with ZipFile(source) as package:
        infos = package.infolist()
        parts = {n: package.read(n) for n in package.namelist()}
    root = parse_part(parts['word/document.xml'])
    original = deepcopy(root)
    text = ''.join(word_values(root))
    if re.findall(r'P202Praxis\d{2}', text) != [f'P202Praxis{i:02}' for i in range(1, count + 1)]:
        raise ValueError('Count/marker sequence mismatch')
    protected = critical(root, count)
    cells, mi, si = cells_of(root)
    table = root.find('w:body/w:tbl', NS)
    row = table.find('w:tr', NS)
    if len(table.findall('w:tr', NS)) != 1 or row.find('w:trPr', NS) is not None:
        raise ValueError('Unexpected original layout row')
    main = cells[mi]
    gaps = []
    for entry, offset, expected in [(i, 1, '1') for i in range(2, count)] + [(1, -1, '72'), (count, 1, '72')]:
        found = [n for n in main.findall('w:tbl', NS) if f'P202Praxis{entry:02}' in ''.join(word_values(n))]
        if len(found) != 1:
            raise ValueError('Missing direct boundary table')
        gap = main[list(main).index(found[0]) + offset]
        spacing = gap.find('w:pPr/w:spacing', NS)
        if gap.tag != W + 'p' or word_values(gap) or spacing is None or spacing.get(W + 'after') != expected:
            raise ValueError('Unexpected original empty gap')
        gaps.append(spacing)
    if len({id(n) for n in gaps}) != count:
        raise ValueError('Gap identity collision')
    for gap in gaps:
        gap.set(W + 'after', '0')
    edits = attribute_diff(original, root)
    if len(edits) != count or any(e['attribute'] != W + 'after' or e['after'] != '0' for e in edits):
        raise ValueError('Unexpected spacing changes')
    before_partition = deepcopy(root)
    blocks = [canon(n) for n in main if n.tag != W + 'tcPr']
    sidebar = canon(cells[si])
    initial = [canon(c.find('w:p', NS)) for c in cells]
    new_rows, _ = partition(row, mi, 'rows-5-14')
    table.extend(new_rows)
    rows = table.findall('w:tr', NS)
    moved = [canon(n) for r in rows for n in r.findall('w:tc', NS)[mi] if n.tag != W + 'tcPr']
    if moved != blocks or canon(cells[si]) != sidebar:
        raise ValueError('Main blocks or sidebar changed')
    if Counter(word_values(root)) != Counter(word_values(original)) or critical(root, count) != protected:
        raise ValueError('Critical entry/text payload changed')
    controls = len(original.findall('.//w:sdt', NS))
    drawings = drawing_payloads(original)
    if len(root.findall('.//w:sdt', NS)) != controls or drawing_payloads(root) != drawings:
        raise ValueError('Control or drawing payload changed')
    if initial != [canon(c.find('w:p', NS)) for c in cells]:
        raise ValueError('Cell leading paragraph changed')
    for r in rows:
        for i, c in enumerate(r.findall('w:tc', NS)):
            if canon(c.find('w:tcPr', NS)) != canon(cells[i].find('w:tcPr', NS)):
                raise ValueError('Cell properties changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target, 'w') as package:
        for info in infos:
            package.writestr(info, parts[info.filename])
    with ZipFile(source) as a, ZipFile(target) as b:
        changed = [n for n in a.namelist() if a.read(n) != b.read(n)]
        if a.namelist() != b.namelist() or changed != ['word/document.xml']:
            raise ValueError('Unrelated package parts changed')
    return {'source_sha256': digest(source), 'copy_sha256': digest(target), 'entry_count': count,
            'spacing_attribute_edits': edits, 'critical_tables_identical': len(protected),
            'body_controls_retained': controls, 'drawing_payloads_identical': len(drawings),
            'layout_rows': len(rows), 'main_story_blocks_identical': True,
            'sidebar_payload_identical': True, 'all_non_document_parts_identical': True,
            'global_word_text_order_identical': word_values(before_partition) == word_values(root),
            'row_entry_ranges': [[1, 5], [6, 14], [15, count]],
            'declared_losses': ['Mirrored global XML reading order changes'] if mi == 0 else []}


def contact_sheet(app_images, variants, target):
    groups = [('App PDF', app_images)] + variants
    height = 25 + 396 * max(len(paths) for _, paths in groups)
    sheet = Image.new('RGB', (280 * len(groups), height), '#ddd')
    draw = ImageDraw.Draw(sheet)
    for col, (label, paths) in enumerate(groups):
        draw.text((col * 280 + 8, 7), label, fill='black')
        for i, path in enumerate(paths):
            with Image.open(path) as image:
                sheet.paste(image.resize((280, 396)), (col * 280, 25 + i * 396))
    sheet.save(target, quality=88)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-dir', type=Path, required=True)
    p.add_argument('--out-dir', type=Path, required=True)
    p.add_argument('--libreoffice', default='libreoffice')
    p.add_argument('--audit-only', action='store_true')
    a = p.parse_args()
    source, out = a.source_dir.resolve(), a.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    old = json.loads((out / 'RESULTS.json').read_text()) if a.audit_only else None
    catalog = json.loads((source / 'CATALOG.json').read_text())
    sha = old['implementation_sha'] if old else os.environ.get('GITHUB_SHA', catalog['sha'])
    if catalog['sha'] != sha:
        raise ValueError('Source/implementation SHA mismatch')
    report = {'implementation_sha': sha, 'source_export_sha': catalog['sha'],
              'scope': 'Fresh Modern UI downloads; fixed P2-16 cuts before 06/15, zero empty gaps. No product/x39/Word acceptance.',
              'converter_version': old['converter_version'] if old else subprocess.run([a.libreoffice, '--version'], capture_output=True, text=True, timeout=10).stdout.strip(),
              'audit_only': a.audit_only, 'cases': [], 'conversion_attempts': []}
    expected = {f'cv-{n}-{side}' for n in [17, 18, 19] for side in ['left', 'right']} | {f'cv-18-varied-{side}' for side in ['left', 'right']}
    try:
        paths = [p for p in sorted(source.glob('*.json')) if p.name != 'CATALOG.json']
        if {p.stem for p in paths} != expected:
            raise ValueError('Expected exactly eight fresh source manifests')
        for path in paths:
            meta = json.loads(path.read_text())
            count, tag = meta['entryCount'], meta['id']
            if meta['sha'] != sha or meta['status'] != 'EXPORTED':
                raise ValueError('Incomplete fresh export ' + tag)
            if {f['format'] for f in meta['files']} != {'PDF', 'DOCX'}:
                raise ValueError('Missing source format')
            for file in meta['files']:
                if digest(source / file['filename']) != file['sha256']:
                    raise ValueError('Fresh source checksum mismatch')
            original = source / (tag + '.docx')
            if content([docx_text(original)], count)['status'] != 'PASS':
                raise ValueError('Authored DOCX content incomplete')
            folder = out / tag
            folder.mkdir(exist_ok=True)
            copy = folder / (tag + '-rows-5-14.docx')
            if old:
                with tempfile.TemporaryDirectory() as temp:
                    package = make_copy(original, Path(temp) / copy.name, count)
                if digest(copy) != package['copy_sha256']:
                    raise ValueError('Retained candidate differs from rebuilt copy')
            else:
                package = make_copy(original, copy, count)
            app, app_images = measure(source / (tag + '.pdf'), folder, 'app', count)
            case = {'id': tag, 'entry_count': count, 'varied_text': meta.get('variedText', False),
                    'mirrored': meta['mirrored'], 'source_files': meta['files'], 'package': package,
                    'app': app, 'app_reference_line': reference_line(source / (tag + '.pdf')), 'variants': []}
            report['cases'].append(case)
            images_by_variant = []
            for variant, docx in [('original', original), ('rows-5-14', copy)]:
                dest = folder / variant
                dest.mkdir(exist_ok=True)
                pdf = dest / (docx.stem + '.pdf')
                if old:
                    previous = next(c for c in old['cases'] if c['id'] == tag)
                    prior = next(v for v in previous['variants'] if v['id'] == variant)
                    if digest(pdf) != prior['pdf_sha256']:
                        raise ValueError('Retained native PDF checksum mismatch')
                    resources = prior['resources']
                else:
                    profile = dest / 'profile'
                    resources = run_conversion([a.libreoffice, '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
                                                '-env:UserInstallation=' + profile.as_uri(), '--convert-to', 'pdf', '--outdir', str(dest), str(docx)],
                                               pdf, dest / 'conversion.log', 90)
                    shutil.rmtree(profile, ignore_errors=True)
                    report['conversion_attempts'].append({'id': tag + '-' + variant, 'resources': resources})
                    if resources.get('status') == 'BLOCKED':
                        raise RuntimeError(resources['error'])
                actual, images = measure(pdf, dest, 'native', count, native_blank_pages=True)
                comparison = compare(app, actual, count, meta['mirrored'])
                line = reference_line(pdf, dest / 'reference-line.png')
                extra = [f'P217Zusatz{i:02}' for i in range(1, count + 1)] if case['varied_text'] else []
                # Check every additional description sentinel independently of title presence.
                import fitz
                with fitz.open(pdf) as document:
                    joined = ''.join(page.get_text() for page in document)
                missing = [marker for marker in extra if joined.count(marker) != 1]
                row = {'id': variant, 'conversion_status': 'PASS', 'pdf_sha256': digest(pdf), 'resources': resources,
                       'actual': actual, 'comparison': comparison, 'reference_line': line,
                       'extra_description_markers_missing': missing,
                       'trial_status': 'PASS' if comparison['status'] == line['status'] == 'PASS' and not missing else 'FAIL',
                       'product_disposition': 'NOT_ACCEPTED'}
                case['variants'].append(row)
                images_by_variant.append((variant, images))
                print(tag, variant, row['trial_status'], actual['content']['complete_entries'], '/', count,
                      'pages', app['pages'], actual['pages'], 'layout', comparison['layout_status'], flush=True)
            contact_sheet(app_images, images_by_variant, folder / 'comparison.jpg')
        report['execution_status'] = 'PASS' if len(report['cases']) == 8 and all(len(c['variants']) == 2 for c in report['cases']) else 'FAIL'
    except (OSError, ValueError, RuntimeError, KeyError, subprocess.TimeoutExpired) as exc:
        report['execution_status'] = 'FAIL'
        report['error'] = str(exc)
    report['native_conversion_count'] = len(report['conversion_attempts'])
    (out / 'RESULTS.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    lines = ['# P2-17 — fixed layout rows across content changes', '', report['scope'], '',
             '| Case | Variant | Trial | Complete | App/LO pages | Layout | Photo | Ref line |',
             '|---|---|---|---:|---:|---|---|---|']
    for case in report['cases']:
        for v in case['variants']:
            c = v['comparison']
            lines.append(f"| {case['id']} | {v['id']} | {v['trial_status']} | {v['actual']['content']['complete_entries']}/{case['entry_count']} | {case['app']['pages']}/{v['actual']['pages']} | {c['layout_status']} | {c['photo']['status']} | {v['reference_line']['status']} |")
    lines += ['', 'Execution: ' + report['execution_status']]
    if report.get('error'):
        lines += ['', report['error']]
    (out / 'SUMMARY.md').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))
    return 0 if report['execution_status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
