#!/usr/bin/env python3
"""P2-12: exhaust all four main-heading drawing subsets, with all-zero gaps.

Full synthetic Next sources retain text, SDTs, sidebar, photo and page chrome.
Diagnostic drawing deletion never implies an accepted visual/product export.
"""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from dossier_converter_poc import run_conversion
from dossier_lo_boundaries import load_inputs
from dossier_lo_context import MAIN_PAINT,reduce_context,read_root,NS
from dossier_lo_minimal import inspect as inspect_control
from dossier_production_spacing import compare,digest,measure

P211_SHA256='172a739de85052569340601a4de000ff1a8cd6259280166ba9730e332597f266'
HEADINGS=[('family','cv.section.custom:familie.heading.flow-paint'),
    ('school','cv.section.schule.heading.flow-paint'),
    ('experience','cv.section.erfahrung.heading.flow-paint'),
    ('reference','cv.section.referenzen.heading.flow-paint')]


def selected(mask):
    if not isinstance(mask,int) or isinstance(mask,bool) or not 0<=mask<16:raise ValueError('Mask outside four-drawing domain')
    return {name for bit,(_,name) in enumerate(HEADINGS) if mask&(1<<bit)}


def make_copy(source,target,mask):
    names=selected(mask)
    if not names:return reduce_context(source,target,'original',True)
    return reduce_context(source,target,'main-heading-paint',True,paint_names=names)


def summarize(rows):
    """Report finite-domain minima only after every subset was actually measured."""
    result={}
    for side in ['left','right']:
        cases=[c for c in rows if c['side']==side];masks=[c['mask'] for c in cases]
        if len(masks)!=16 or set(masks)!=set(range(16)):raise ValueError('Incomplete or duplicated subset domain')
        good=sorted(c['mask'] for c in cases if c['actual']['content']['status']=='PASS')
        minimum=min((m.bit_count() for m in good),default=None)
        common=set.intersection(*(selected(m) for m in good)) if good else set()
        result[side]={'tested_masks':16,'content_pass_masks':good,'minimum_deleted_drawings':minimum,
            'minimum_masks':[m for m in good if m.bit_count()==minimum],
            'inclusion_minimal_masks':[m for m in good if not any(n!=m and n&m==n for n in good)],
            'drawings_in_every_successful_deletion':sorted(common),
            'nonmonotonic_success_to_failure':[{'pass_mask':m,'failed_superset':n} for m in good for n in range(16) if m&n==m and n not in good]}
    return result


def main():
    repo=Path(__file__).resolve().parents[1]
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out-dir',type=Path,required=True)
    p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');args=p.parse_args()
    source=repo/'tests/fixtures/lo-import-p2-08';app_path=repo/'docs/qa/p2-08-production-results.json'
    _,reference=load_inputs(source,app_path);prior_path=repo/'docs/qa/p2-11-outer-results.json'
    if digest(prior_path)!=P211_SHA256:raise ValueError('Pinned P2-11 evidence changed')
    previous=json.loads(prior_path.read_text());out=args.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    old=json.loads((out/'RESULTS.json').read_text()) if args.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
        'source_export_sha':reference['sha'],'app_reference_sha256':digest(app_path),'p211_reference_sha256':digest(prior_path),
        'scope':'All 16 drawing-deletion subsets on two full Modern 18-entry sources, all 18 gaps zero; not x39/product/Word acceptance.',
        'heading_bits':[{'bit':bit,'label':label,'drawing_name':name} for bit,(label,name) in enumerate(HEADINGS)],
        'converter_version':old['converter_version'] if old else subprocess.run([args.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip(),
        'controls':[],'cases':[],'conversion_attempts':[],'audit_only':args.audit_only}

    def convert(docx,folder,prior):
        pdf=folder/(docx.stem+'.pdf')
        if old:
            if not prior or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved PDF hash mismatch')
            return pdf,prior['resources']
        profile=folder/'profile';res=run_conversion([args.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
            '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
        shutil.rmtree(profile,ignore_errors=True);report['conversion_attempts'].append({'id':folder.name,'resources':res})
        if res.get('status')=='BLOCKED':raise RuntimeError(res['error'])
        return pdf,res

    try:
        controls=[]
        for tag,relative in [('small-original','lo-import-p2-06/long-gap-original.docx'),('small-minimum','lo-import-p2-07/long-gap06-zero.docx')]:
            c=next(c for c in previous['controls'] if c['id']==tag)
            controls.append((tag,repo/'tests/fixtures'/relative,c['docx_sha256'],c['pixel_sha256']))
        for side in ['left','right']:
            c=next(c for c in previous['cases'] if c['id']==side+'-raw-original')
            controls.append((side+'-raw-original',source/f'cv-18-{side}-original.docx',c['package']['copy_sha256'],c['actual']['pixel_sha256']))
        for tag,src,expected_hash,expected_pixels in controls:
            if digest(src)!=expected_hash:raise ValueError('Pinned control source mismatch')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=expected_hash:raise ValueError('Saved control DOCX changed')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None
            pdf,res=convert(docx,folder,prior);facts,_=inspect_control(pdf,folder)
            row={'id':tag,'docx_sha256':digest(docx),'pdf_sha256':digest(pdf),'resources':res,
                'pixel_sha256':facts['pixel_sha256'],'pixels_match_p211':facts['pixel_sha256']==expected_pixels}
            report['controls'].append(row)
            if not row['pixels_match_p211']:raise ValueError('Control pixel baseline changed')
        for side in ['left','right']:
            ref=next(c for c in reference['cases'] if c['id']==f'cv-18-{side}')
            for mask in range(16):
                tag=f'{side}-zero-mask{mask:02}';folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx');src=source/f'cv-18-{side}-original.docx'
                if old:
                    with tempfile.TemporaryDirectory() as temp:
                        package=make_copy(src,Path(temp)/docx.name,mask)
                        if digest(docx)!=package['copy_sha256']:raise ValueError('Saved diagnostic DOCX changed')
                else:package=make_copy(src,docx,mask)
                if len(read_root(docx).findall('.//w:sdt',NS))!=107:raise ValueError('Body controls changed')
                prior=next(c for c in old['cases'] if c['id']==tag) if old else None
                pdf,res=convert(docx,folder,prior);actual,_=measure(pdf,folder,'lo',18,native_blank_pages=True);comparison=compare(ref['app'],actual,18,side=='right')
                row={'id':tag,'side':side,'mask':mask,'removed_labels':[label for bit,(label,_) in enumerate(HEADINGS) if mask&(1<<bit)],
                    'package':package,'body_sdts_retained':107,'conversion_status':'PASS','pdf_sha256':digest(pdf),'resources':res,
                    'actual':actual,'app_metric_comparison':comparison,'trial_status':'FAIL' if mask else comparison['status'],
                    'visible_drawing_loss':bool(mask),'product_acceptance':'NOT_ACCEPTED'}
                report['cases'].append(row)
                if mask in [0,15]:
                    old_id=side+'-zero-'+('original' if mask==0 else 'main-heading-paint');baseline=next(c for c in previous['cases'] if c['id']==old_id)
                    row['endpoint_input_match_p211']=package['copy_sha256']==baseline['package']['copy_sha256']
                    row['endpoint_pixels_match_p211']=actual['pixel_sha256']==baseline['actual']['pixel_sha256']
                    if not row['endpoint_input_match_p211'] or not row['endpoint_pixels_match_p211']:raise ValueError('Pinned subset endpoint changed')
                print(tag,','.join(row['removed_labels']) or 'none',actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages','layout',comparison['layout_status'],flush=True)
        report['subset_findings']=summarize(report['cases'])
        report['execution_status']='PASS' if len(report['cases'])==32 and len(report['controls'])==4 else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts'])
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-12 — four main heading drawing subsets','',report['scope'],'',
        '| Copy | Removed | Content | Complete | Pages | Layout | Photo | Trial |','|---|---|---|---:|---:|---|---|---|']
    for c in report['cases']:
        v=c['app_metric_comparison'];lines.append(f"| {c['id']} | {','.join(c['removed_labels']) or 'none'} | {c['actual']['content']['status']} | {c['actual']['content']['complete_entries']}/18 | {c['actual']['pages']} | {v['layout_status']} | {v['photo']['status']} | {c['trial_status']} |")
    lines+=['','Execution: '+report['execution_status'],'','Subset findings: '+json.dumps(report.get('subset_findings',{}),sort_keys=True)]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
