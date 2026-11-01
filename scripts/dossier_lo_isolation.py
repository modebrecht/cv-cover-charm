#!/usr/bin/env python3
"""P2-03: mutate synthetic DOCX copies, never the production exporter.

Every edit is an attribute operation in word/document.xml. Package parts and
semantic text must stay identical. A green experiment run means reproducible
measurements, not approval of a candidate for Word or the product.
"""
from __future__ import annotations

import argparse
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from dossier_semantic_parity import inspect_pdf
from dossier_converter_poc import run_conversion
from dossier_parity_content import compare_photo, docx_text, marker_pages

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
}
RESEARCH = 'c685bf4308235ac5fcc38957d45d9c9bf508eb21'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def attribute_diff(before, after, path=''):
    """Reject structural/text edits; enumerate all attribute edits by tree path."""
    if (before.tag, before.text, before.tail, len(before)) != (after.tag, after.text, after.tail, len(after)):
        raise ValueError('Unexpected structure or text mutation at '+path)
    edits = []
    for key in sorted(before.attrib.keys() | after.attrib.keys()):
        if before.get(key) != after.get(key):
            edits.append({'path':path, 'attribute':key, 'before':before.get(key), 'after':after.get(key)})
    for i, (left, right) in enumerate(zip(before, after)):
        edits += attribute_diff(left, right, path+'/'+left.tag.split('}')[-1]+f'[{i}]')
    return edits


def mutate(source, target, operation):
    with ZipFile(source) as pkg:
        original = pkg.read('word/document.xml')
        # Keep the declared OOXML prefixes: prefixes referenced in attribute
        # values (e.g. mc:Ignorable) must not silently change during diagnostics.
        import io
        for _, pair in ET.iterparse(io.BytesIO(original), events=['start-ns']):
            ET.register_namespace(*pair)
        root = ET.fromstring(original)
        before = deepcopy(root)
        photo = next(a for a in root.findall('.//wp:anchor', NS)
                     if a.find('wp:docPr', NS).get('name') == 'cv.person.photo')
        margin = root.find('.//w:sectPr/w:pgMar', NS)
        cells = root.find('.//w:body/w:tbl/w:tr', NS).findall('w:tc', NS)
        if operation == 'margin-zero':
            margin.set('{'+NS['w']+'}left', '0')
        elif operation == 'margin-half':
            margin.set('{'+NS['w']+'}left', str(round(int(margin.get('{'+NS['w']+'}left')) / 2)))
        elif operation == 'layout-in-cell':
            photo.set('layoutInCell', '1')
        elif operation == 'horizontal-column':
            photo.find('wp:positionH', NS).set('relativeFrom', 'column')
        elif operation.startswith('detach-'):
            main = 0 if int(margin.get('{'+NS['w']+'}left')) else 2
            indices = {'detach-all':[0,2], 'detach-main':[main], 'detach-sidebar':[2-main]}[operation]
            for index in indices:
                keep = cells[index].find('w:p/w:pPr/w:keepNext', NS)
                if keep is None or keep.get('{'+NS['w']+'}val') != '1':
                    raise ValueError('Source no longer has the expected cell-start coupling')
                keep.set('{'+NS['w']+'}val', '0')
        elif operation == 'allow-inner-row-split':
            for value in root.findall('.//w:cantSplit', NS):
                value.set('{'+NS['w']+'}val', '0')
        else:
            raise ValueError('Unknown operation '+operation)
        edits = attribute_diff(before, root)
        if not edits: raise ValueError('No-op probe '+operation)
        changed = ET.tostring(root, encoding='utf-8', xml_declaration=True)
        with ZipFile(target, 'w') as out:
            for entry in pkg.infolist():
                out.writestr(entry, changed if entry.filename == 'word/document.xml' else pkg.read(entry))
    with ZipFile(source) as left, ZipFile(target) as right:
        names = left.namelist()
        assert names == right.namelist()
        assert all(left.read(n) == right.read(n) for n in names if n != 'word/document.xml')
    assert docx_text(source) == docx_text(target)
    return edits


def probe_plan():
    plan = [('cv-right', op) for op in ['margin-zero','margin-half','layout-in-cell','horizontal-column']]
    for case in ['cv-long-left','cv-long-right']:
        plan += [(case, op) for op in ['detach-all','detach-main','detach-sidebar','allow-inner-row-split']]
    return plan


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--out-dir', type=Path, required=True)
    parser.add_argument('--baseline-dir', type=Path)
    parser.add_argument('--prepare-only', action='store_true')
    parser.add_argument('--audit-only', action='store_true')
    parser.add_argument('--libreoffice', default='libreoffice')
    args = parser.parse_args()
    source, out = args.source_dir.resolve(), args.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    baseline = args.baseline_dir or out/'baseline'
    if not args.prepare_only and not args.audit_only:
        run = subprocess.run([sys.executable, str(Path(__file__).with_name('dossier_semantic_parity.py')),
                              '--source-dir', str(source), '--out-dir', str(baseline),
                              '--libreoffice', args.libreoffice], check=False)
        if run.returncode not in [0,1]: raise RuntimeError('Baseline auditor crashed')
    catalog = json.loads((source/'CATALOG.json').read_text())
    prior = json.loads((out/'RESULTS.json').read_text()) if args.audit_only else {}
    report = {'source_sha':catalog['sha'], 'research_reference':RESEARCH,
              'scope':'Synthetic package copies; no product changes; PASS is measured parity only.',
              'cases':[], 'execution_status':'OPEN'}
    for case, operation in probe_plan():
        ident = case+'--'+operation
        manifest = json.loads((source/(case+'.json')).read_text())
        if manifest['sha'] != catalog['sha']: raise ValueError('Mixed source SHAs')
        for entry in manifest['files']:
            if digest(source/entry['filename']) != entry['sha256']: raise ValueError('Source hash mismatch')
        folder = out/'probes'/ident
        folder.mkdir(parents=True, exist_ok=True)
        docx = folder/(ident+'.docx')
        edits = mutate(source/(case+'.docx'), docx, operation)
        row = {'id':ident, 'source_case':case, 'operation':operation,
               'source_sha256':digest(source/(case+'.docx')), 'probe_sha256':digest(docx),
               'edits':edits, 'other_package_parts_identical':True, 'semantic_text_identical':True}
        report['cases'].append(row)
        if args.prepare_only:
            row['status']='PREPARED'
            continue
        pdf = folder/(ident+'.pdf')
        if args.audit_only:
            old = next(r for r in prior['cases'] if r['id']==ident)
            if old['probe_sha256'] != row['probe_sha256']: raise ValueError('Probe changed during audit')
            row['resources']=old['resources']
        else:
            profile = folder/'profile'
            row['resources'] = run_conversion([args.libreoffice, '--headless','--nologo','--nodefault',
                '--nofirststartwizard', '-env:UserInstallation='+profile.as_uri(),
                '--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
            shutil.rmtree(profile,ignore_errors=True)
        if row['resources'].get('status') == 'BLOCKED':
            row.update(status='BLOCKED',reason=row['resources']['error'])
            continue
        rasters = folder/'rendered'; rasters.mkdir(exist_ok=True)
        actual, images = inspect_pdf(pdf,rasters,'lo')
        app, app_images = inspect_pdf(source/(case+'.pdf'),rasters,'app')
        present = marker_pages(actual['texts'],manifest['markers'])
        row.update(page_count=actual['page_count'], app_page_count=app['page_count'],
                   missing=[m for m in manifest['markers'] if not present[m]], marker_pages=present,
                   photo=compare_photo(app['photos'][0],actual['photos'][0]),
                   lo_photo=actual['photos'][0], app_photo=app['photos'][0],
                   repeated_photo=any(p.get('visible') for p in actual['photos'][1:]))
        row['status'] = 'PASS' if (not row['missing'] and row['page_count']==row['app_page_count']
            and row['photo']['status']=='PASS' and not row['repeated_photo']) else 'FAIL'
        from PIL import Image
        sheet = Image.new('RGB',(680,481*max(len(images),len(app_images))),'#ddd')
        for col, paths in enumerate([app_images, images]):
            for index, image in enumerate(paths):
                with Image.open(image) as page: sheet.paste(page.resize((340,481)),(col*340,index*481))
        sheet.save(folder/'comparison.jpg',quality=88)
        print(ident,row['status'],len(row['missing']),'missing',row['photo']['bbox_delta_mm'],flush=True)
    if args.prepare_only:
        report['execution_status']='PREPARED'
    else:
        original = json.loads((baseline/'RESULTS.json').read_text())
        expected = {'cover':'PASS','letter':'PASS','cv-left':'PASS','cv-crop-left':'PASS',
                    'cv-right':'FAIL','cv-crop-right':'FAIL','cv-long-left':'FAIL','cv-long-right':'FAIL'}
        report['baseline'] = [{'id':r['id'],'status':r['status'],'missing':r.get('missing',[]),
            'photo':r.get('photo'),'resources':r.get('resources')} for r in original['cases']]
        valid = (original['sha']==catalog['sha'] and
                 {r['id']:r['status'] for r in original['cases']}==expected and
                 all(r['status']!='BLOCKED' for r in report['cases']))
        report['execution_status']='PASS' if valid else 'FAIL'
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-03 — isolated LibreOffice probes','',f"Source SHA: `{catalog['sha']}`",
           '', 'Execution PASS means completed experiments with reproduced baseline defects. It is not release approval.',
           '', '| Copy / attribute operation | Parity | Pages | Missing | Photo delta mm | Seconds |',
           '|---|---|---:|---:|---|---:|']
    for r in report['cases']:
        lines.append(f"| {r['id']} | {r['status']} | {r.get('page_count','-')} | {len(r.get('missing',[]))} | {r.get('photo',{}).get('bbox_delta_mm','-')} | {r.get('resources',{}).get('seconds','-')} |")
    lines += ['', 'Experiment execution: '+report['execution_status']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n')
    print('\n'.join(lines))
    return 0 if report['execution_status'] in ['PASS','PREPARED'] else 1


if __name__=='__main__':
    raise SystemExit(main())
