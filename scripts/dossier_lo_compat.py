#!/usr/bin/env python3
"""P2-05: one-attribute compatibilityMode counterprobe on persisted fixtures.

No source document or product exporter is changed. Execution PASS certifies
completed measurements and unchanged mode-15 controls, not product acceptance.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from dossier_converter_poc import run_conversion
from dossier_lo_isolation import attribute_diff, body_heading, entry_spans
from dossier_lo_minimal import inspect
from dossier_parity_content import compare_photo, docx_text, marker_pages

W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
WP='{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
FILENAMES={'photo-table-mode15.docx','photo-paragraph-mode15.docx','long-coupled.docx','long-detached.docx'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def mode_node(raw):
    nodes=[n for n in ET.fromstring(raw).iter(W+'compatSetting') if n.get(W+'name')=='compatibilityMode']
    if len(nodes)!=1 or nodes[0].get(W+'val')!='15':raise ValueError('Expected one source compatibilityMode=15')
    return nodes[0]


def package_delta(source, target, mode):
    if mode not in [14,15]:raise ValueError('Only modes 14 and 15 are in this counterprobe')
    with ZipFile(source) as left,ZipFile(target) as right:
        if left.namelist()!=right.namelist():raise ValueError('Package members changed')
        for name in left.namelist():
            if name!='word/settings.xml' and left.read(name)!=right.read(name):
                raise ValueError('Unrelated part changed: '+name)
        before,after=left.read('word/settings.xml'),right.read('word/settings.xml')
        mode_node(before)
        edits=attribute_diff(ET.fromstring(before),ET.fromstring(after))
        if mode==15:
            if source.read_bytes()!=target.read_bytes():raise ValueError('Mode 15 must be a byte-identical original')
        elif (len(edits)!=1 or edits[0]['attribute']!=W+'val' or edits[0]['before']!='15' or edits[0]['after']!='14'):
            raise ValueError('Mode 14 must change only compatibilityMode')
        changed=sum(a!=b for a,b in zip(before,after))
        if len(before)!=len(after) or changed!=(1 if mode==14 else 0):raise ValueError('Unexpected settings byte changes')
    return {'settings_attribute_edits':edits,'settings_bytes_changed':changed,
            'all_other_parts_identical':True,'source_sha256':digest(source),'copy_sha256':digest(target)}


def mode_copy(source, target, mode):
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite fixture source')
    if mode not in [14,15]:raise ValueError('Only modes 14 and 15 are in this counterprobe')
    if mode==15:
        shutil.copyfile(source,target)
    else:
        with ZipFile(source) as pkg:
            raw=pkg.read('word/settings.xml');mode_node(raw)
            tags=[m for m in re.finditer(rb'<w:compatSetting\b[^>]*>',raw) if b'w:name="compatibilityMode"' in m[0]]
            if len(tags)!=1 or tags[0][0].count(b'w:val="15"')!=1:raise ValueError('Unexpected pinned settings serialization')
            match=tags[0];changed=raw[:match.start()]+match[0].replace(b'w:val="15"',b'w:val="14"')+raw[match.end():]
            with ZipFile(target,'w') as out:
                for info in pkg.infolist():out.writestr(info,changed if info.filename=='word/settings.xml' else pkg.read(info))
    return package_delta(source,target,mode)


def fixtures(folder):
    manifest=json.loads((folder/'MANIFEST.json').read_text())
    if len(manifest['fixtures'])!=4 or {f['filename'] for f in manifest['fixtures']}!=FILENAMES:
        raise ValueError('Expected exactly four pinned P2-04 fixtures')
    for row in manifest['fixtures']:
        path=folder/row['filename']
        if digest(path)!=row['sha256']:raise ValueError('Fixture hash mismatch: '+row['filename'])
        with ZipFile(path) as pkg:
            mode_node(pkg.read('word/settings.xml'))
            for name,key in [('word/document.xml','document_xml_sha256'),('word/settings.xml','settings_xml_sha256')]:
                if hashlib.sha256(pkg.read(name)).hexdigest()!=row[key]:raise ValueError('Fixture part hash mismatch')
    return manifest


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fixture-dir',type=Path,default=Path('tests/fixtures/lo-import-p2-04'))
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice')
    p.add_argument('--prepare-only',action='store_true');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=a.fixture_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    manifest=fixtures(source);old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else {}
    report={'implementation_sha':old.get('implementation_sha') if a.audit_only else os.environ.get('GITHUB_SHA'),
            'fixture_source_run':manifest['source_run_id'],'fixture_manifest_sha256':digest(source/'MANIFEST.json'),
            'source_hashes_verified':4,'cases':[],'scope':'Persisted synthetic copies only; no product export or Word acceptance.'}
    if a.audit_only:report['converter_version']=old.get('converter_version')
    elif not a.prepare_only:
        version=subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10)
        report['converter_version']=version.stdout.strip()
    for fixture in manifest['fixtures']:
        stem=Path(fixture['filename']).stem.removesuffix('-mode15')
        for mode in [14,15]:
            ident=stem+'-mode'+str(mode);folder=out/ident;folder.mkdir(exist_ok=True)
            docx=folder/(ident+'.docx');original=source/fixture['filename']
            if not a.audit_only:changes=mode_copy(original,docx,mode)
            else:
                changes=package_delta(original,docx,mode)
                prior=next(r for r in old['cases'] if r['id']==ident)
                if changes['copy_sha256']!=prior['package']['copy_sha256']:raise ValueError('Audit DOCX hash mismatch')
            row={'id':ident,'fixture':fixture['filename'],'stem':stem,'mode':mode,'package':changes}
            report['cases'].append(row)
            if a.prepare_only:row['conversion_status']='PREPARED';continue
            pdf=folder/(ident+'.pdf')
            if a.audit_only:row['resources']=prior['resources']
            else:
                profile=folder/'profile'
                row['resources']=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
                    '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
                shutil.rmtree(profile,ignore_errors=True)
            if row['resources'].get('status')=='BLOCKED':row['conversion_status']='BLOCKED';continue
            actual,images=inspect(pdf,folder)
            markers=['P204BODY'] if stem.startswith('photo-') else [f'P202Praxis{i:02}' for i in range(1,19)]+['P202Endreferenz']
            found=marker_pages(actual['texts'],markers);authored=marker_pages([docx_text(docx)],markers)
            row.update(conversion_status='PASS',pages=actual['pages'],producer=actual['producer'],
                       pixel_sha256=actual['pixel_sha256'],marker_pages=found,source_markers_present=all(authored.values()),
                       missing=[m for m in markers if not found[m]],entry_spans=entry_spans(actual['texts']) if stem.startswith('long-') else [])
            row['content_status']='PASS' if not row['missing'] and all(e['complete'] for e in row['entry_spans']) else 'FAIL'
            if stem.startswith('long-'):row['body_heading_origin_mm']=body_heading(pdf)
            if stem.startswith('photo-'):
                row['photo_signature']=actual['photos'][0]
                with ZipFile(docx) as pkg:
                    root=ET.fromstring(pkg.read('word/document.xml'))
                    row['requested_x_mm']=int(root.find('.//'+WP+'positionH/'+WP+'posOffset').text)/36000
                if actual['photos'][0].get('visible'):
                    row['photo_x_mm']=actual['photos'][0]['bbox_mm'][0]
                    row['photo_offset_from_requested_mm']=round(row['photo_x_mm']-row['requested_x_mm'],3)
            if mode==15:row['baseline_pixels_match_p204']=actual['pixel_sha256']==fixture['observed']['pixel_sha256']
            from PIL import Image
            sheet=Image.new('RGB',(340,481*len(images)),'white')
            for i,path in enumerate(images):
                with Image.open(path) as im:sheet.paste(im.resize((340,481)),(0,481*i))
            sheet.save(folder/'pages.jpg',quality=90)
            print(ident,row['content_status'],row.get('photo_x_mm'),row['pages'],'pages',flush=True)
    by={(r['stem'],r['mode']):r for r in report['cases']}
    if a.prepare_only:report['execution_status']='PREPARED'
    else:
        for row in report['cases']:
            if row['conversion_status']!='PASS':continue
            baseline=by[row['stem'],15]
            row['pixel_identical_to_mode15']=row['pixel_sha256']==baseline.get('pixel_sha256')
            if row.get('body_heading_origin_mm') and baseline.get('body_heading_origin_mm'):
                row['body_heading_delta_vs_mode15_mm']=[round(a-b,3) for a,b in zip(row['body_heading_origin_mm'],baseline['body_heading_origin_mm'])]
            row['marker_page_changes_vs_mode15']={m:{'mode14':v,'mode15':baseline.get('marker_pages',{}).get(m)} for m,v in row['marker_pages'].items() if v!=baseline.get('marker_pages',{}).get(m)} if row['mode']==14 else {}
            if 'photo_signature' in row:
                reference=by['photo-paragraph',row['mode'] if row['stem']=='photo-table' else 15]
                row['photo_vs_paragraph']=compare_photo(reference.get('photo_signature',{}),row['photo_signature'])
        report['mode15_baselines_match_p204']=all(r.get('baseline_pixels_match_p204') is True for r in report['cases'] if r['mode']==15)
        report['execution_status']='PASS' if (len(report['cases'])==8 and report['mode15_baselines_match_p204'] and
            all(r['conversion_status']=='PASS' and r.get('source_markers_present') for r in report['cases'])) else 'FAIL'
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-05 — one-attribute compatibilityMode counterprobe','',
        'Execution PASS certifies completed measurements and matching mode-15 baselines only; no product acceptance.',
        '', '| Case | Mode | Conversion | Text | Pages | Complete entries | Photo x mm | Offset vs requested mm |',
        '|---|---:|---|---|---:|---:|---:|---:|']
    for row in report['cases']:
        lines.append(f"| {row['stem']} | {row['mode']} | {row['conversion_status']} | {row.get('content_status','-')} | {row.get('pages','-')} | {sum(e['complete'] for e in row.get('entry_spans',[])) if row['stem'].startswith('long-') else '-'} | {row.get('photo_x_mm','-')} | {row.get('photo_offset_from_requested_mm','-')} |")
    lines+=['','Execution: '+report['execution_status']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status'] in ['PASS','PREPARED'] else 1


if __name__=='__main__':raise SystemExit(main())
