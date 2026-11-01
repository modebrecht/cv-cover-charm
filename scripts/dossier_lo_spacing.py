#!/usr/bin/env python3
"""P2-07: bounded native search over 18 empty-paragraph after attributes.

Synthetic persisted copies only. Content recovery is not product layout acceptance.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz

from dossier_converter_poc import run_conversion
from dossier_lo_isolation import attribute_diff, body_heading, entry_spans
from dossier_lo_minimal import NS, W, inspect
from dossier_lo_preamble import MARKERS, digest, marker_origin, payloads
from dossier_parity_content import compact, marker_pages


def read_root(source):
    with ZipFile(source) as pkg:raw=pkg.read('word/document.xml')
    for _,pair in ET.iterparse(io.BytesIO(raw),events=['start-ns']):ET.register_namespace(*pair)
    return ET.fromstring(raw)


def gaps(root):
    main=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
    rows=[]
    for index,node in enumerate(main):
        if node.tag!=W+'p' or any(t.text for t in node.iter(W+'t')):continue
        spacing=node.find('w:pPr/w:spacing',NS)
        if spacing is None or spacing.get(W+'after') in [None,'0']:continue
        preceding=''.join(t.text or '' for t in main[index-1].iter(W+'t'))
        markers=[m for m in MARKERS if m in preceding]
        tag=('entry-gap-'+markers[-1][-2:]) if markers else 'school-gap'
        if tag=='entry-gap-18':tag='reference-gap'
        rows.append({'id':tag,'main_child_index':index,'after_twips':int(spacing.get(W+'after'))})
    if len(rows)!=18 or len({r['id'] for r in rows})!=18:raise ValueError('Expected 18 unique source gaps')
    return rows


def load_fixtures(folder):
    manifest=json.loads((folder/'MANIFEST.json').read_text())
    for row in manifest['fixtures']:
        source=folder/row['filename']
        with ZipFile(source) as pkg:
            import hashlib
            xml_hash=hashlib.sha256(pkg.read('word/document.xml')).hexdigest()
        if digest(source)!=row['sha256'] or xml_hash!=row['document_xml_sha256']:
            raise ValueError('Source fixture hash mismatch: '+row['filename'])
    return manifest


def make_copy(source,target,selected):
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite source fixture')
    root=read_root(source);before=deepcopy(root);rows=gaps(root);known={r['id'] for r in rows}
    selected=set(selected)
    if not selected<=known:raise ValueError('Unknown gap ID')
    main=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
    for row in rows:
        if row['id'] in selected:main[row['main_child_index']].find('w:pPr/w:spacing',NS).set(W+'after','0')
    edits=attribute_diff(before,root)
    if len(edits)!=len(selected) or any(e['attribute']!=W+'after' or e['after']!='0' for e in edits):
        raise ValueError('Unexpected XML changes')
    if payloads(before)!=payloads(root):raise ValueError('Critical table payload changed')
    if ''.join(t.text or '' for t in before.iter(W+'t'))!=''.join(t.text or '' for t in root.iter(W+'t')):
        raise ValueError('Visible text changed')
    if not selected:shutil.copyfile(source,target)
    else:
        changed=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        with ZipFile(source) as pkg,ZipFile(target,'w') as out:
            for info in pkg.infolist():out.writestr(info,changed if info.filename=='word/document.xml' else pkg.read(info))
    with ZipFile(source) as left,ZipFile(target) as right:
        if left.namelist()!=right.namelist() or any(left.read(n)!=right.read(n) for n in left.namelist() if n!='word/document.xml'):
            raise ValueError('Non-document parts changed')
    return {'source_sha256':digest(source),'copy_sha256':digest(target),'attribute_edits':edits,
        'critical_tables_identical':19,'visible_text_identical':True,'all_non_document_parts_identical':True}


def search(ids,oracle):
    """All singletons first; then bounded, non-monotonic-safe deletion minimization.

    Oracle owns caching/budget and raises on unusable conversions. A 1-minimal
    result only excludes its immediate subsets, not smaller disjoint solutions.
    """
    ids=list(ids);original=oracle([]);all_zero=oracle(ids)
    if original or not all_zero:raise ValueError('Original/all-zero control behavior changed')
    groups=[[i for i in ids if i.startswith('entry-gap-')],['school-gap','reference-gap']]
    successes=[ids]
    for group in groups:
        if oracle(group):successes.append(group)
    singles=[i for i in ids if oracle([i])]
    if singles:return {'selected':[singles[0]],'all_sufficient_singletons':singles,
        'minimum_cardinality':1,'minimum_proven':True,'one_minimal':True}
    best=min(successes,key=len)
    if len(best)==2:return {'selected':best,'all_sufficient_singletons':[],
        'minimum_cardinality':2,'minimum_proven':True,'one_minimal':True}
    # Chunk deletion accelerates the search; do not infer monotonicity.
    width=max(1,len(best)//2)
    while width:
        changed=False
        for start in range(0,len(best),width):
            trial=best[:start]+best[start+width:]
            if trial and oracle(trial):best=trial;changed=True;break
        if not changed:width=width//2
        else:width=min(width,max(1,len(best)//2))
    return {'selected':best,'all_sufficient_singletons':[],
        'minimum_cardinality':len(best),'minimum_proven':len(best)==2,'one_minimal':True}


def pdf_content(pdf):
    with fitz.open(pdf) as doc:
        texts=[page.get_text() for page in doc];producer=doc.metadata.get('producer')
    found=marker_pages(texts,MARKERS);entries=entry_spans(texts)
    missing=[m for m in MARKERS if not found[m]]
    reference_body=all(compact(s) in compact(''.join(texts)) for s in ['Klassenlehrer','079 555 12 34'])
    splits=[e['marker'] for e in entries if e['split']]
    recovery=len(texts)==3 and not missing and all(e['complete'] for e in entries) and not splits and reference_body
    return {'pages':len(texts),'producer':producer,'marker_pages':found,'missing':missing,
        'complete_entries':sum(e['complete'] for e in entries),'split_entries':splits,
        'reference_body_present':reference_body,'content_status':'PASS' if recovery else 'FAIL',
        'first_station':marker_origin(pdf,'P202Praxis01'),'body_heading_origin_mm':body_heading(pdf)}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fixture-dir',type=Path,default=Path('tests/fixtures/lo-import-p2-06'))
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice')
    p.add_argument('--audit-only',action='store_true');p.add_argument('--max-conversions',type=int,default=64);a=p.parse_args()
    source=a.fixture_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    manifest=load_fixtures(source);original=source/'long-gap-original.docx';descriptors=gaps(read_root(original))
    ids=[r['id'] for r in sorted(descriptors,key=lambda r:(r['after_twips'],r['main_child_index']))]
    old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
        'fixture_manifest_sha256':digest(source/'MANIFEST.json'),'gaps':descriptors,'cases':[],
        'scope':'18 after attributes in one persisted synthetic fixture; content recovery is not App/Word layout parity.',
        'converter_version':old['converter_version'] if old else subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip()}
    cache={};by_mask={tuple(sorted(c['zeroed'])):c for c in old['cases']} if old else {}

    def oracle(selected):
        key=tuple(sorted(selected))
        if key in cache:return cache[key]['content_status']=='PASS'
        if len(cache)>=a.max_conversions:raise RuntimeError('Native conversion budget exhausted; minimum not proven')
        tag=f'trial-{len(cache):02}';folder=out/tag;folder.mkdir(exist_ok=True)
        docx=folder/(tag+'.docx');pdf=folder/(tag+'.pdf')
        if old:
            prior=by_mask[key]
            if prior['id']!=tag or digest(docx)!=prior['package']['copy_sha256'] or digest(pdf)!=prior['pdf_sha256']:
                raise ValueError('Audit trial hash/order mismatch')
            package=prior['package'];resources=prior['resources']
        else:
            package=make_copy(original,docx,selected)
            # All-zero control is the exact persisted successful file.
            if len(selected)==18:
                shutil.copyfile(source/'long-gap-zero.docx',docx);package['copy_sha256']=digest(docx)
            profile=folder/'profile'
            resources=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
                '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
            shutil.rmtree(profile,ignore_errors=True)
        row={'id':tag,'zeroed':list(key),'package':package,'resources':resources}
        report['cases'].append(row);cache[key]=row
        row['conversion_status']='BLOCKED' if resources.get('status')=='BLOCKED' else 'PASS'
        if row['conversion_status']!='PASS':raise RuntimeError('Unusable conversion '+tag)
        row.update(pdf_content(pdf));row['pdf_sha256']=digest(pdf)
        print(tag,','.join(key) or 'original',row['content_status'],row['complete_entries'],flush=True)
        return row['content_status']=='PASS'

    try:
        report['search']=search(ids,oracle)
        chosen=cache[tuple(sorted(report['search']['selected']))]
        for row in [cache[()],cache[tuple(sorted(ids))],chosen]:
            folder=out/row['id'];actual,_=inspect(folder/(row['id']+'.pdf'),folder)
            row['pixel_sha256']=actual['pixel_sha256']
        controls=[cache[()],cache[tuple(sorted(ids))]]
        for row,fixture in zip(controls,manifest['fixtures']):
            row['baseline_pixels_match_p206']=row['pixel_sha256']==fixture['observed']['pixel_sha256']
        report['baseline_controls_pass']=all(r['baseline_pixels_match_p206'] for r in controls)
        report['execution_status']='PASS' if report['baseline_controls_pass'] else 'FAIL'
    except (ValueError,RuntimeError,KeyError) as e:
        report['execution_status']='FAIL';report['error']=str(e)
    report['native_conversion_count']=len(report['cases']) if not old else 0
    report['audit_only']=a.audit_only
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-07 — empty-paragraph spacing subset','',report['scope'],'',
        '| Trial | Zeroed gap IDs | Content | Complete entries | Pages |','|---|---|---|---:|---:|']
    for r in report['cases']:lines.append(f"| {r['id']} | {', '.join(r['zeroed']) or 'original'} | {r.get('content_status','BLOCKED')} | {r.get('complete_entries','-')} | {r.get('pages','-')} |")
    lines+=['','Execution: '+report['execution_status'],'','Search: '+json.dumps(report.get('search',report.get('error')),ensure_ascii=False)]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
