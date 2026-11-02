#!/usr/bin/env python3
"""Fixed Modern LibreOffice QA: original baseline and guarded diagnostic copy.

This never changes product exports. A failing original stays FAIL even when
its synthetic QA candidate passes. Only candidate regressions and invalid
inputs block this bounded suite; 39-template Next approval remains BLOCKED.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata
from zipfile import BadZipFile, ZipFile
from xml.etree.ElementTree import ParseError

from PIL import Image, ImageDraw
import dossier_qa_core as core

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / 'tests/fixtures/dossier-qa'
MANIFEST_SHA256 = 'f71e0dc361aafabbfb21f517cc1c3e72348e8638292d8348d67e4a5ded7033d1'
SCOPE = 'Synthetic Modern 17/18/19 entries only; QA copies, no product fix or Word approval. 39-Next: BLOCKED (Modern eligible, 38 blocked).'


def compact(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if c.isalnum())


def expected_ids(suite, fresh=False):
    ids = {'cv-crop-left', 'cv-crop-right'}
    if suite == 'full':
        ids |= {f'cv-{n}-{s}' for n in [17, 18, 19] for s in ['left', 'right']}
        ids |= {f'cv-18-varied-{s}' for s in ['left', 'right']}
    return ids | {'cover', 'letter'} if fresh else ids


def load_frozen(suite):
    path = FIXTURES / 'MANIFEST.json'
    if core.digest(path) != MANIFEST_SHA256:
        raise ValueError('Frozen QA manifest hash differs')
    rows = json.loads(path.read_text())['cases']
    if {r['id'] for r in rows} != expected_ids('full'):
        raise ValueError('Frozen ten-case matrix differs')
    for row in rows:
        docx = FIXTURES / (row['id'] + '.docx')
        if core.digest(docx) != row['source_docx_sha256']:
            raise ValueError('Frozen source hash differs: ' + row['id'])
        if row.get('app_pdf_sha256') and core.digest(FIXTURES / (row['id'] + '.pdf')) != row['app_pdf_sha256']:
            raise ValueError('Frozen App PDF hash differs: ' + row['id'])
    return [(r, FIXTURES / (r['id'] + '.docx'), None) for r in rows if r['id'] in expected_ids(suite)]


def load_fresh(source, suite, implementation_sha):
    if not re.fullmatch(r'[a-f0-9]{40}', implementation_sha):
        raise ValueError('An exact implementation SHA is required')
    catalog = json.loads((source / 'CATALOG.json').read_text())
    if catalog.get('sha') != implementation_sha:
        raise ValueError('Mixed source/implementation SHA')
    availability = catalog.get('rows', [])
    if len(availability) != 39 or len({r['id'] for r in availability}) != 39 or [r['id'] for r in availability if r['status'] == 'ELIGIBLE'] != ['modern'] or sum(r['status'] == 'BLOCKED' for r in availability) != 38:
        raise ValueError('39-Next availability guard changed')
    ids = expected_ids(suite, fresh=True)
    paths = {p.stem: p for p in source.glob('*.json') if p.name != 'CATALOG.json'}
    if set(paths) != ids:
        raise ValueError('Missing or unexpected fresh sources')
    rows = []
    for tag, path in sorted(paths.items()):
        row = json.loads(path.read_text())
        if row.get('id') != tag or row.get('sha') != implementation_sha or row.get('status') != 'EXPORTED' or row.get('exporter') != 'production DOCX Next':
            raise ValueError('Invalid fresh manifest: ' + tag)
        files = row.get('files', [])
        if len(files) != 2 or {f['format'] for f in files} != {'PDF', 'DOCX'}:
            raise ValueError('Missing source pair: ' + tag)
        for f in files:
            if f['filename'] != tag + '.' + f['format'].lower() or core.digest(source / f['filename']) != f['sha256']:
                raise ValueError('Source pair hash/path differs: ' + tag)
        if row.get('intent', {}).get('template') != 'modern':
            raise ValueError('Unsupported template')
        expected_part = tag if tag in ['cover', 'letter'] else 'cv'
        if row.get('part') != expected_part:
            raise ValueError('Source document part differs')
        row['entry_count'] = row.get('entryCount', 0)
        row['varied_text'] = row.get('variedText', False)
        if row['part'] == 'cv':
            side = 'right' if row['mirrored'] else 'left'
            if not tag.endswith(side) or row['intent'].get('sidebarSide') != side or row.get('long') is not True:
                raise ValueError('Source side/length differs')
            wanted_count = 18 if tag.startswith('cv-crop') or 'varied' in tag else int(tag.split('-')[1])
            wanted_crop = ((2.0, 65, 35) if row['mirrored'] else (1.6, 30, 70)) if tag.startswith('cv-crop') else (1, 50, 50)
            if row['entry_count'] != wanted_count or tuple(row.get(k) for k in ['zoom', 'x', 'y']) != wanted_crop or row['varied_text'] != ('varied' in tag):
                raise ValueError('Synthetic fixture intent differs')
        rows.append((row, source / (tag + '.docx'), source / (tag + '.pdf')))
    return rows


def make_candidate(source, target, count):
    if source.resolve() == target.resolve():
        raise ValueError('Cannot overwrite an original export')
    if count not in [17, 18, 19] or core.content([core.docx_text(source)], count)['status'] != 'PASS':
        raise ValueError('Incomplete or unsupported synthetic source')
    # Verify footers before creating even an intermediate copy.
    with ZipFile(source) as pkg:
        parts = {n: pkg.read(n) for n in pkg.namelist()}
    core._row_metrics_empty_footers(parts, core._lo_context_parse_part(parts['word/document.xml']))
    try:
        return core.make_candidate_core(source, target, 'footer-distance-zero', count=count)
    except Exception:
        target.unlink(missing_ok=True)
        raise


def visible_text(pdf, folder, label='render'):
    """Reuse OCR produced by measure; blank App PDFs cannot pass marker gates."""
    import fitz
    texts = []
    with fitz.open(pdf) as doc:
        for number, page in enumerate(doc, 1):
            text = page.get_text()
            ocr = folder / f'{label}-{number}-ocr.txt'
            if len(compact(text)) < 20 and ocr.is_file():
                text = ocr.read_text()
            texts.append(text)
    return compact(''.join(texts))


def simple_document_result(app_text, native_text, source_text, markers, pages_match):
    missing = {label: [m for m in markers if compact(m) not in text]
               for label, text in [('app', app_text), ('native', native_text), ('source', compact(source_text))]}
    return {'status': 'PASS' if pages_match and not any(missing.values()) else 'FAIL',
            'pages_match': pages_match, 'missing_markers': missing}


def evaluate(app, actual, count, mirrored, pdf, control_edges=None, varied=False):
    comparison = core.compare(app, actual, count, mirrored)
    reference = core.reference_line(pdf)
    group = core.reference_group(reference, actual)
    lines = core.section_lines(pdf)
    edges = core.page_edges(pdf)
    missing = []
    if varied:
        import fitz
        with fitz.open(pdf) as doc:
            visible = compact(''.join(p.get_text() for p in doc))
        missing = [f'P217Zusatz{i:02}' for i in range(1, count + 1) if compact(f'P217Zusatz{i:02}') not in visible]
    gates = {
        'content_layout_photo': comparison['status'],
        'reference_line': reference['status'], 'reference_group': group['status'],
        'four_section_lines': 'PASS' if len(lines) == 4 and all(r['status'] == 'PASS' for r in lines.values()) else 'FAIL',
        'header_bottom': 'PASS' if control_edges is not None and edges == control_edges else 'FAIL',
        'varied_description_markers': 'FAIL' if missing else 'PASS',
    }
    return {'status': 'PASS' if all(v == 'PASS' for v in gates.values()) else 'FAIL',
            'gates': gates, 'comparison': comparison, 'reference_line': reference,
            'reference_group': group, 'section_lines': lines, 'page_edges': edges,
            'missing_description_markers': missing, 'actual': actual}


def acceptance(rows):
    # Execution success alone can never override failed candidate gates.
    return bool(rows) and all(r.get('candidate', r.get('original', {})).get('status') == 'PASS' for r in rows)


def contact_sheet(folder, target):
    groups = [('App', folder / 'app'), ('Original LO', folder / 'original'), ('QA candidate', folder / 'candidate')]
    images = [(label, sorted(f for f in p.glob('render-*.png') if re.fullmatch(r'render-\d+\.png', f.name))) for label, p in groups]
    pages = max((len(v) for _, v in images), default=0)
    if not pages:
        return
    sheet = Image.new('RGB', (900, 30 + pages * 425), '#ddd')
    draw = ImageDraw.Draw(sheet)
    for col, (label, paths) in enumerate(images):
        draw.text((col * 300 + 8, 8), label, fill='black')
        for i, path in enumerate(paths):
            with Image.open(path) as im:
                sheet.paste(im.resize((300, 425)), (col * 300, 30 + i * 425))
    sheet.save(target, quality=85)


def write_report(out, report):
    (out / 'RESULTS.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    lines = ['# Bounded Modern QA', '', SCOPE, '',
             '| Case | Original LO baseline | QA candidate |', '|---|---|---|']
    lines += [f"| {r['id']} | {r.get('original', {}).get('status', 'BLOCKED')} | {r.get('candidate', {}).get('status', 'N/A')} |" for r in report['cases']]
    lines += ['', 'Suite acceptance: **' + report['status'] + '**',
              'Native conversions: ' + str(len(report['conversions'])),
              'Implementation: `' + report['implementation_sha'] + '`',
              'Known original FAIL results remain failures; candidate PASS releases no product export.']
    if report.get('error'):
        lines += ['', report['error']]
    (out / 'SUMMARY.md').write_text('\n'.join(lines) + '\n')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path)
    parser.add_argument('--suite', choices=['smoke', 'full'], default='smoke')
    parser.add_argument('--out-dir', type=Path, required=True)
    parser.add_argument('--frozen', action='store_true')
    parser.add_argument('--libreoffice', default='libreoffice')
    args = parser.parse_args(argv)
    out = args.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    sha = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report = {'status': 'BLOCKED', 'scope': SCOPE, 'implementation_sha': sha,
              'suite': args.suite, 'source_kind': 'frozen' if args.frozen else 'fresh same-SHA UI downloads',
              'cases': [], 'conversions': []}

    def convert(docx, folder):
        pdf = folder / (docx.stem + '.pdf')
        profile = folder / 'lo-profile'
        resource = core.run_conversion([args.libreoffice, '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
            '-env:UserInstallation=' + profile.as_uri(), '--convert-to', 'pdf', '--outdir', str(folder), str(docx)],
            pdf, folder / 'conversion.log', 90)
        shutil.rmtree(profile, ignore_errors=True)
        report['conversions'].append({'id': str(folder.relative_to(out)), **resource})
        if resource.get('status') == 'BLOCKED':
            raise RuntimeError(resource['error'])
        return pdf

    try:
        if args.frozen == bool(args.source_dir):
            raise ValueError('Select exactly one of --frozen and --source-dir')
        sources = load_frozen(args.suite) if args.frozen else load_fresh(args.source_dir.resolve(), args.suite, sha)
        if len(sources) != len(expected_ids(args.suite, fresh=not args.frozen)):
            raise ValueError('Incomplete planned case set')
        report['converter_version'] = subprocess.check_output([args.libreoffice, '--version'], text=True, timeout=10).strip()
        for meta, docx, app_pdf in sources:
            count = meta.get('entry_count', 0) if meta['part'] == 'cv' else 0
            folder = out / meta['id']
            folder.mkdir(exist_ok=True)
            app_folder = folder / 'app'
            app_folder.mkdir(exist_ok=True)
            if app_pdf:
                app, _ = core.measure(app_pdf, app_folder, 'render', count)
            else:
                app = meta['app']
                retained_pdf = FIXTURES / (meta['id'] + '.pdf')
                if meta.get('app_pdf_sha256'):
                    # Retained actual App rasters are for human review. The frozen
                    # measured reference is hash-bound by the manifest as well.
                    core.measure(retained_pdf, app_folder, 'render', count)
            row = {'id': meta['id'], 'source_sha256': core.digest(docx), 'origin': meta.get('origin', {'source_export_sha': sha}), 'app': app}
            report['cases'].append(row)
            variants = ['original', 'control', 'candidate'] if count else ['original']
            control_edges = None
            for variant in variants:
                dest = folder / variant
                dest.mkdir(exist_ok=True)
                copy = dest / 'document.docx'
                if variant == 'original':
                    shutil.copyfile(docx, copy)
                elif variant == 'control':
                    core.make_native_control(docx, copy, 'body-flow-nosplit-front', count=count)
                else:
                    row['declared_qa_changes'] = make_candidate(docx, copy, count)
                    if args.frozen and core.digest(copy) != meta['expected_candidate_sha256']:
                        raise ValueError('Candidate differs from verified research: ' + meta['id'])
                pdf = convert(copy, dest)
                actual, _ = core.measure(pdf, dest, 'render', count)
                if count:
                    if variant == 'control':
                        control_edges = core.page_edges(pdf)
                        row['control'] = {'role': 'matching native header/bottom control', 'page_edges': control_edges}
                        continue
                    row[variant] = evaluate(app, actual, count, meta['mirrored'], pdf,
                        control_edges=core.page_edges(pdf) if variant == 'original' else control_edges,
                        varied=meta.get('varied_text', False))
                else:
                    # Covers and letters have no synthetic CV markers/photo.
                    row['original'] = simple_document_result(
                        visible_text(app_pdf, app_folder), visible_text(pdf, dest),
                        core.docx_text(docx), meta['markers'], actual['pages'] == app['pages'])

            contact_sheet(folder, folder / 'comparison.jpg')
            print(meta['id'], 'original', row['original']['status'], 'candidate', row.get('candidate', {}).get('status', 'N/A'), flush=True)
        report['status'] = 'PASS' if acceptance(report['cases']) else 'FAIL'
    except (OSError, ValueError, RuntimeError, KeyError, TypeError, BadZipFile, ParseError, subprocess.SubprocessError) as exc:
        report['status'] = 'BLOCKED'
        report['error'] = str(exc)
    finally:
        write_report(out, report)
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
