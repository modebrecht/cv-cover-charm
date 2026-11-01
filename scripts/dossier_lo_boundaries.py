#!/usr/bin/env python3
"""P2-09: bounded flow-boundary spacing probes on persisted production DOCX.

Reuses pinned P2-08 source files and their measured App-PDF reference. No app
rebuild, product export changes, margin/mode changes or Word acceptance.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from PIL import Image

from dossier_converter_poc import run_conversion
from dossier_lo_isolation import attribute_diff
from dossier_lo_minimal import inspect as inspect_control
from dossier_lo_spacing import read_root
from dossier_production_spacing import W,NS,critical,content,compare,digest,measure
from dossier_parity_content import docx_text

REFERENCE_SHA256='ad882abd27c87cb8b73cc255ec26011c8ce22cfbc08d9b07b5849e0b2109c167'
PLAN={'original':[],'gap06-zero':[6],'gap05-zero':[5],'gap14-zero':[14],
    'gap15-zero':[15],'small-gaps-zero':list(range(2,18))}


def gap_map(root):
    cells=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)
    mains=[c for c in cells if 'P202Praxis06' in ''.join(t.text or '' for t in c.iter(W+'t'))]
    if len(mains)!=1:raise ValueError('Expected exactly one main cell')
    main=mains[0];mapping={}
    for entry in range(2,18):
        marker=f'P202Praxis{entry:02}'
        tables=[n for n in main.findall('w:tbl',NS) if marker in ''.join(t.text or '' for t in n.iter(W+'t'))]
        if len(tables)!=1:raise ValueError('Missing unique direct entry table '+marker)
        index=list(main).index(tables[0])+1;gap=main[index]
        if gap.tag!=W+'p' or any(t.text for t in gap.iter(W+'t')):raise ValueError('Nonempty or missing gap after '+marker)
        spacing=gap.find('w:pPr/w:spacing',NS)
        if spacing is None or spacing.get(W+'after')!='1':raise ValueError('Expected source after=1 for '+marker)
        mapping[entry]=(index,spacing)
    return cells.index(main),mapping


def change_gaps(source,target,selected):
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite source fixture')
    selected=list(selected)
    if len(selected)!=len(set(selected)) or not set(selected)<=set(range(2,18)):raise ValueError('Invalid or duplicate gap IDs')
    root=read_root(source);before=deepcopy(root);cell,mapping=gap_map(root)
    for entry in selected:mapping[entry][1].set(W+'after','0')
    edits=attribute_diff(before,root)
    if len(edits)!=len(selected) or any(e['attribute']!=W+'after' or e['before']!='1' or e['after']!='0' for e in edits):
        raise ValueError('Unexpected attribute edits')
    if critical(before,18)!=critical(root,18):raise ValueError('Critical table payload changed')
    if selected:
        raw=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        with ZipFile(source) as pkg,ZipFile(target,'w') as out:
            for info in pkg.infolist():out.writestr(info,raw if info.filename=='word/document.xml' else pkg.read(info))
    else:shutil.copyfile(source,target)
    with ZipFile(source) as a,ZipFile(target) as b:
        if a.namelist()!=b.namelist() or any(a.read(n)!=b.read(n) for n in a.namelist() if n!='word/document.xml'):
            raise ValueError('Non-document package parts changed')
    if docx_text(source)!=docx_text(target):raise ValueError('Visible source text changed')
    return {'source_sha256':digest(source),'copy_sha256':digest(target),'main_cell_index':cell,
        'selected_gaps':selected,'main_child_indices':[mapping[i][0] for i in selected],
        'attribute_edits':edits,'critical_tables_identical':19,'visible_text_identical':True,
        'all_non_document_parts_identical':True}


def load_inputs(folder,reference):
    if digest(reference)!=REFERENCE_SHA256:raise ValueError('Pinned App-reference report hash mismatch')
    report=json.loads(reference.read_text());manifest=json.loads((folder/'MANIFEST.json').read_text())
    expected={f'cv-18-{side}-{variant}.docx' for side in ['left','right'] for variant in ['original','gap06-zero']}
    if {f['filename'] for f in manifest['fixtures']}!=expected:raise ValueError('Expected four full source/control fixtures')
    import hashlib
    for row in manifest['fixtures']:
        path=folder/row['filename']
        if digest(path)!=row['sha256']:raise ValueError('Input file hash mismatch: '+row['filename'])
        with ZipFile(path) as z:
            if hashlib.sha256(z.read('word/document.xml')).hexdigest()!=row['document_xml_sha256']:raise ValueError('Input document part hash mismatch')
            for image in row['media']:
                if hashlib.sha256(z.read(image['path'])).hexdigest()!=image['sha256']:raise ValueError('Input image hash mismatch')
    for side in ['left','right']:
        case=next(c for c in report['cases'] if c['id']==f'cv-18-{side}')
        source=folder/f'cv-18-{side}-original.docx'
        if digest(source)!=next(f['sha256'] for f in case['source_files'] if f['format']=='DOCX'):raise ValueError('Original differs from pinned browser download')
        if case['app']['content']['status']!='PASS' or content([docx_text(source)],18)['status']!='PASS':raise ValueError('Incomplete App/source reference')
    return manifest,report


def main():
    root=Path(__file__).resolve().parents[1]
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fixture-dir',type=Path,default=root/'tests/fixtures/lo-import-p2-08')
    p.add_argument('--reference',type=Path,default=root/'docs/qa/p2-08-production-results.json')
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=a.fixture_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    manifest,reference=load_inputs(source,a.reference);old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
        'source_export_sha':reference['sha'],'reference_report_sha256':digest(a.reference),
        'fixture_manifest_sha256':digest(source/'MANIFEST.json'),'audit_only':a.audit_only,
        'scope':'Full persisted 18-entry production sources and pinned P2-08 App metrics; no fresh App export or Word/x39 acceptance.',
        'converter_version':old['converter_version'] if old else subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip(),
        'controls':[],'cases':[],'conversion_attempts':[]}

    def convert(docx,folder,prior):
        pdf=folder/(docx.stem+'.pdf')
        if old:
            if not prior or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved PDF hash mismatch')
            return pdf,prior['resources']
        profile=folder/'profile'
        resources=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
            '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
        shutil.rmtree(profile,ignore_errors=True)
        report['conversion_attempts'].append({'id':folder.name,'resources':resources,'status':'BLOCKED' if resources.get('status')=='BLOCKED' else 'PASS'})
        if resources.get('status')=='BLOCKED':raise RuntimeError(resources['error'])
        return pdf,resources

    try:
        p206=root/'tests/fixtures/lo-import-p2-06';p207=root/'tests/fixtures/lo-import-p2-07'
        m206=json.loads((p206/'MANIFEST.json').read_text());m207=json.loads((p207/'MANIFEST.json').read_text())
        for tag,src,expected in [('small-original',p206/'long-gap-original.docx',m206['fixtures'][0]),('small-minimum',p207/m207['filename'],m207)]:
            if digest(src)!=expected['sha256']:raise ValueError('Pinned small fixture hash mismatch')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=digest(src):raise ValueError('Saved small DOCX changed')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None
            pdf,resources=convert(docx,folder,prior);facts,_=inspect_control(pdf,folder)
            row={'id':tag,'docx_sha256':digest(docx),'pdf_sha256':digest(pdf),'resources':resources,
                'pixel_sha256':facts['pixel_sha256'],'pixels_match_persisted':facts['pixel_sha256']==expected['observed']['pixel_sha256']}
            report['controls'].append(row)
            if not row['pixels_match_persisted']:raise ValueError('Small control pixels changed')
        for side in ['left','right']:
            source_case=next(c for c in reference['cases'] if c['id']==f'cv-18-{side}')
            for variant,selected in PLAN.items():
                tag=side+'-'+variant;folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
                original=source/f'cv-18-{side}-original.docx'
                if old:
                    with tempfile.TemporaryDirectory() as tmp:
                        package=change_gaps(original,Path(tmp)/docx.name,selected)
                        if digest(docx)!=package['copy_sha256']:raise ValueError('Saved controlled DOCX changed')
                else:package=change_gaps(original,docx,selected)
                if variant=='gap06-zero' and digest(docx)!=digest(source/f'cv-18-{side}-gap06-zero.docx'):raise ValueError('Gap06 control differs from persisted copy')
                prior=next(c for c in old['cases'] if c['id']==tag) if old else None
                pdf,resources=convert(docx,folder,prior);actual,images=measure(pdf,folder,'lo',18)
                row={'id':tag,'side':side,'variant':variant,'package':package,'resources':resources,
                    'pdf_sha256':digest(pdf),'conversion_status':'PASS','actual':actual,
                    'comparison':compare(source_case['app'],actual,18,side=='right')}
                report['cases'].append(row)
                if variant in ['original','gap06-zero']:
                    baseline=next(v for v in source_case['variants'] if v['id']==variant)
                    row['pixels_match_p208']=actual['pixel_sha256']==baseline['actual']['pixel_sha256']
                    if not row['pixels_match_p208']:raise ValueError('Full production baseline pixels changed: '+tag)
                sheet=Image.new('RGB',(340,481*len(images)),'#ddd')
                for i,image in enumerate(images):
                    with Image.open(image) as im:sheet.paste(im.resize((340,481)),(0,i*481))
                sheet.save(folder/'pages.jpg',quality=90)
                print(tag,actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages','overall',row['comparison']['status'],flush=True)
        report['execution_status']='PASS' if len(report['cases'])==12 and len(report['controls'])==2 else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts'])
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-09 — full production flow-boundary counterprobes','',report['scope'],'',
        '| Case | Conversion | Content | Complete entries | Pages | Layout | Photo | Overall |',
        '|---|---|---|---:|---:|---|---|---|']
    for c in report['cases']:
        a=c['actual'];v=c['comparison'];lines.append(f"| {c['id']} | {c['conversion_status']} | {a['content']['status']} | {a['content']['complete_entries']}/18 | {a['pages']} | {v['layout_status']} | {v['photo']['status']} | {v['status']} |")
    lines+=['','Execution: '+report['execution_status']]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
