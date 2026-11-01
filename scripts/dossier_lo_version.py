#!/usr/bin/env python3
"""P2-15: unchanged long sources, Ubuntu LO versus isolated official LO 26.8.2.

One installation attempt; blocked setup remains explicit. No source patch,
normal export change, engine replacement or x39 acceptance.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess

from dossier_converter_poc import run_conversion
from dossier_lo_boundaries import load_inputs
from dossier_lo_minimal import inspect as inspect_control
from dossier_production_spacing import compare,content,digest,measure
from dossier_reference_anchor import reference_line
from setup_libreoffice_release import vendor_sha256

P213_SHA256='26345be9e0ab6b78812e04ba3e32c715a2de0ff7c71873ea706aa511b8f31048'


def main():
    repo=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--release-root',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=repo/'tests/fixtures/lo-import-p2-08';app_path=repo/'docs/qa/p2-08-production-results.json';_,reference=load_inputs(source,app_path)
    prior_path=repo/'docs/qa/p2-13-native-results.json'
    if digest(prior_path)!=P213_SHA256:raise ValueError('Pinned P2-13 evidence changed')
    previous=json.loads(prior_path.read_text());out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True);old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    setup=old['release_setup'] if old else json.loads((a.release_root/'SETUP.json').read_text()) if (a.release_root/'SETUP.json').exists() else {'status':'BLOCKED','error':'No setup result; bounded installation failed or timed out','installation_attempts':1}
    for name in ['SETUP.json','release.metalink']:
        source_meta=a.release_root/name
        if not old and source_meta.exists():shutil.copyfile(source_meta,out/name)
    if setup['status']=='PASS':
        metadata=out/'release.metalink'
        if digest(metadata)!=setup['metadata_sha256'] or vendor_sha256(metadata.read_bytes())!=setup['archive_sha256'] or setup['official_sha256']!=setup['archive_sha256']:raise ValueError('Saved vendor/archive digest evidence mismatch')
    versions=old['converter_versions'] if old else {'ubuntu':subprocess.run([a.libreoffice,'--version'],text=True,capture_output=True,check=True,timeout=10).stdout.strip(),'official':setup.get('converter_version')}
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),'source_export_sha':reference['sha'],'app_reference_sha256':digest(app_path),'p213_reference_sha256':digest(prior_path),
        'scope':'Two unchanged full synthetic Modern 18-entry sources and two reduced controls, two engine versions. No new browser exports, source patches, engine replacement or x39 acceptance.',
        'release_setup':setup,'converter_versions':versions,'cases':[],'conversion_attempts':[],'audit_only':a.audit_only}
    inputs=[]
    for side in ['left','right']:
        expected=next(c for c in previous['cases'] if c['id']==side+'-raw-original');inputs.append((side,source/f'cv-18-{side}-original.docx',expected['package']['copy_sha256'],expected['actual']['pixel_sha256']))
    for tag,relative in [('small-original','lo-import-p2-06/long-gap-original.docx'),('small-minimum','lo-import-p2-07/long-gap06-zero.docx')]:
        expected=next(c for c in previous['controls'] if c['id']==tag);inputs.append((tag,repo/'tests/fixtures'/relative,expected['docx_sha256'],expected['pixel_sha256']))
    try:
        for engine in ['ubuntu','official']:
            for tag,src,source_hash,expected_pixels in inputs:
                if digest(src)!=source_hash:raise ValueError('Source fixture changed')
                case_id=engine+'-'+tag;row={'id':case_id,'engine':engine,'source_id':tag,'source_sha256':source_hash};report['cases'].append(row)
                if engine=='official' and setup['status']!='PASS':row.update(conversion_status='BLOCKED',error=setup.get('error','Official release unavailable'));continue
                folder=out/case_id;folder.mkdir(exist_ok=True);docx=folder/(case_id+'.docx');pdf=folder/(case_id+'.pdf')
                if old:
                    prior=next(c for c in old['cases'] if c['id']==case_id)
                    if prior['conversion_status']=='BLOCKED':row.update(prior);continue
                    if digest(docx)!=source_hash or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved DOCX/PDF hash mismatch')
                    resources=prior['resources']
                else:
                    shutil.copyfile(src,docx);binary=a.libreoffice if engine=='ubuntu' else setup['converter_path'];profile=folder/'profile'
                    resources=run_conversion([binary,'--headless','--nologo','--nodefault','--nofirststartwizard','-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
                    shutil.rmtree(profile,ignore_errors=True);report['conversion_attempts'].append({'id':case_id,'resources':resources})
                    if resources.get('status')=='BLOCKED':row.update(conversion_status='BLOCKED',error=resources['error'],resources=resources);continue
                if tag in ['left','right']:
                    actual,_=measure(pdf,folder,'pdf',18,native_blank_pages=True);ref=next(c for c in reference['cases'] if c['id']==f'cv-18-{tag}')
                    comparison=compare(ref['app'],actual,18,tag=='right');line=reference_line(pdf,folder/'reference-line.png')
                    row.update(actual=actual,app_metric_comparison=comparison,reference_line=line,trial_status='PASS' if comparison['status']==line['status']=='PASS' else 'FAIL',product_acceptance='NOT_ACCEPTED')
                else:
                    actual,_=inspect_control(pdf,folder);actual['content']=content(actual.pop('texts'),18);row.update(actual=actual,control_observation_only=True)
                row.update(conversion_status='PASS',pdf_sha256=digest(pdf),resources=resources)
                if engine=='ubuntu':
                    row['baseline_pixels_match_p213']=actual['pixel_sha256']==expected_pixels
                    if not row['baseline_pixels_match_p213']:raise ValueError('Ubuntu baseline changed; version contrast not established')
                print(case_id,actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages',flush=True)
        report['execution_status']='BLOCKED' if any(c['conversion_status']=='BLOCKED' for c in report['cases']) else 'PASS' if len(report['cases'])==8 else 'FAIL'
    except (OSError,ValueError,KeyError,subprocess.SubprocessError) as exc:report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts']);(out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-15 — LibreOffice version counterprobe','',report['scope'],'','| Engine / input | Conversion | Complete entries | Pages | Layout | Line | Trial |','|---|---|---:|---:|---|---|---|']
    for c in report['cases']:
        actual=c.get('actual',{});v=c.get('app_metric_comparison',{});lines.append(f"| {c['id']} | {c['conversion_status']} | {actual.get('content',{}).get('complete_entries','—')}/18 | {actual.get('pages','—')} | {v.get('layout_status','—')} | {c.get('reference_line',{}).get('status','—')} | {c.get('trial_status','control only')} |")
    lines+=['','Execution: '+report['execution_status']];(out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines));return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
