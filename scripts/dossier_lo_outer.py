#!/usr/bin/env python3
"""P2-11: outer controls x main heading drawings, preserving full dossier data.

Cross both factors with original/all-zero gaps. No exporter changes or product
acceptance: a visible drawing deletion stays a diagnostic comparison failure.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from PIL import Image

from dossier_converter_poc import run_conversion
from dossier_lo_boundaries import load_inputs
from dossier_lo_context import OUTER_CONTEXTS,reduce_context,read_root,protected_entry,NS
from dossier_lo_minimal import inspect as inspect_control
from dossier_production_spacing import content,compare,digest,measure,W

P210_SHA256='08aa3fbd9908cb4c28bc0d742c3788a909807476619d6850cb47a8b0bd2fae05'


def main():
    root=Path(__file__).resolve().parents[1]
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out-dir',type=Path,required=True)
    p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=root/'tests/fixtures/lo-import-p2-08';app_path=root/'docs/qa/p2-08-production-results.json'
    _,reference=load_inputs(source,app_path);previous_path=root/'docs/qa/p2-10-closing-results.json'
    if digest(previous_path)!=P210_SHA256:raise ValueError('Pinned P2-10 result hash mismatch')
    p210=json.loads(previous_path.read_text());out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
        'source_export_sha':reference['sha'],'app_reference_sha256':digest(app_path),'p210_reference_sha256':digest(previous_path),
        'scope':'Full persisted Modern source copies. Trial App/LO gates are not Word/x39 acceptance or a product deployment.',
        'converter_version':old['converter_version'] if old else subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip(),
        'controls':[],'cases':[],'conversion_attempts':[],'audit_only':a.audit_only}

    def convert(docx,folder,prior):
        pdf=folder/(docx.stem+'.pdf')
        if old:
            if not prior or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved PDF hash mismatch')
            return pdf,prior['resources']
        profile=folder/'profile';res=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
            '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
        shutil.rmtree(profile,ignore_errors=True);report['conversion_attempts'].append({'id':folder.name,'resources':res})
        if res.get('status')=='BLOCKED':raise RuntimeError(res['error'])
        return pdf,res

    try:
        p206=root/'tests/fixtures/lo-import-p2-06';p207=root/'tests/fixtures/lo-import-p2-07';p210fixtures=root/'tests/fixtures/lo-import-p2-10'
        m206=json.loads((p206/'MANIFEST.json').read_text());m207=json.loads((p207/'MANIFEST.json').read_text());m210=json.loads((p210fixtures/'MANIFEST.json').read_text())
        controls=[('small-original',p206/'long-gap-original.docx',m206['fixtures'][0]),('small-minimum',p207/m207['filename'],m207)]
        for side in ['left','right']:
            f=next(f for f in m210['fixtures'] if f['side']==side and f['zero_gaps']);controls.append(('protected-positive-'+side,p210fixtures/f['filename'],f))
        for tag,src,expected in controls:
            if digest(src)!=expected['sha256']:raise ValueError('Pinned control source mismatch')
            if tag.startswith('small-'):
                previous=next(c for c in p210['controls'] if c['id']==tag);source_hash=previous['docx_sha256'];pixels=previous['pixel_sha256']
            else:
                previous=next(c for c in p210['cases'] if c['id']==expected['native_case']);source_hash=previous['package']['copy_sha256'];pixels=previous['actual']['pixel_sha256']
            if digest(src)!=source_hash or expected['observed']['pixel_sha256']!=pixels:raise ValueError('Control differs from pinned P2-10 native evidence')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=digest(src):raise ValueError('Saved control DOCX changed')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None
            pdf,res=convert(docx,folder,prior);facts,_=inspect_control(pdf,folder)
            row={'id':tag,'docx_sha256':digest(docx),'pdf_sha256':digest(pdf),'resources':res,'pixel_sha256':facts['pixel_sha256'],
                'pixels_match_persisted':facts['pixel_sha256']==expected['observed']['pixel_sha256']};report['controls'].append(row)
            if not row['pixels_match_persisted']:raise ValueError('Control pixel baseline changed')
        for side in ['left','right']:
            ref=next(c for c in reference['cases'] if c['id']==f'cv-18-{side}')
            for zero in [False,True]:
                for context in OUTER_CONTEXTS:
                    tag=side+('-zero-' if zero else '-raw-')+context;folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx');src=source/f'cv-18-{side}-original.docx'
                    if old:
                        with tempfile.TemporaryDirectory() as temp:
                            package=reduce_context(src,Path(temp)/docx.name,context,zero)
                            if digest(docx)!=package['copy_sha256']:raise ValueError('Saved case DOCX changed')
                    else:package=reduce_context(src,docx,context,zero)
                    parsed=read_root(docx);leaves=[n for n in parsed.findall('.//w:tbl',NS) if protected_entry(n)]
                    inner=sum(len(n.findall('.//w:sdt',NS)) for n in leaves)
                    if inner!=75 or content([''.join(n.text or '' for n in parsed.iter(W+'t'))],18)['status']!='PASS':raise ValueError('Critical source data/control changed')
                    prior=next(c for c in old['cases'] if c['id']==tag) if old else None
                    pdf,res=convert(docx,folder,prior);actual,images=measure(pdf,folder,'lo',18,native_blank_pages=True);comparison=compare(ref['app'],actual,18,side=='right')
                    paint=context in ['main-heading-paint','outer-controls-and-main-paint']
                    row={'id':tag,'side':side,'zero_gaps':zero,'context':context,'package':package,'inner_sdts_retained':inner,
                        'conversion_status':'PASS','pdf_sha256':digest(pdf),'resources':res,'actual':actual,'app_metric_comparison':comparison,
                        'trial_status':'FAIL' if paint else comparison['status'],'visible_drawing_loss':paint,'product_acceptance':'NOT_ACCEPTED'}
                    report['cases'].append(row)
                    if context=='original':
                        previous=next(c for c in p210['cases'] if c['id']==tag)
                        row['baseline_input_match_p210']=package['copy_sha256']==previous['package']['copy_sha256']
                        row['baseline_pixels_match_p210']=actual['pixel_sha256']==previous['actual']['pixel_sha256']
                        if not row['baseline_input_match_p210'] or not row['baseline_pixels_match_p210']:raise ValueError('Full P2-10 baseline changed')
                    sheet=Image.new('RGB',(340,481*len(images)),'#ddd')
                    for i,image in enumerate(images):
                        with Image.open(image) as im:sheet.paste(im.resize((340,481)),(0,i*481))
                    sheet.save(folder/'pages.jpg',quality=90)
                    print(tag,actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages','trial',row['trial_status'],flush=True)
        report['execution_status']='PASS' if len(report['cases'])==16 and len(report['controls'])==4 else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts'])
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-11 — outer controls and main heading drawings','',report['scope'],'',
        '| Copy | Critical content | Complete entries | Pages | Main layout | Photo | Trial |',
        '|---|---|---:|---:|---|---|---|']
    for c in report['cases']:
        v=c['app_metric_comparison'];lines.append(f"| {c['id']} | {c['actual']['content']['status']} | {c['actual']['content']['complete_entries']}/18 | {c['actual']['pages']} | {v['layout_status']} | {v['photo']['status']} | {c['trial_status']} |")
    lines+=['','Execution: '+report['execution_status']]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
