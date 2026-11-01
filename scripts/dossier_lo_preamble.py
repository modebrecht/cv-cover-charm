#!/usr/bin/env python3
"""P2-06: isolate generated lead wrappers before a truncating nested CV story.

Diagnostic copies only. Critical innermost station/reference tables must remain
canonically identical, even when the surrounding preamble is deliberately reduced.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
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
from dossier_lo_compat import fixtures
from dossier_lo_isolation import attribute_diff,entry_spans
from dossier_lo_minimal import NS,W,facts,inspect,paragraph
from dossier_parity_content import compact,marker_pages

LEADS={'school':'cv.section.schule.lead','experience':'cv.section.erfahrung.lead'}
OPERATIONS=['baseline-coupled','baseline-detached','drop-main-leading','flatten-school',
    'flatten-experience','flatten-both','allow-school-lead-split','allow-experience-lead-split',
    'allow-both-leads-split','prefix-spacer','prefix-spacer-flatten-experience']
OPERATIONS+=['detach-main-top-level','detach-main-title','detach-reference-heading',
    'prefix-spacer-no-experience-heading','prefix-spacer-no-reference-heading','prefix-spacer-no-headings',
    'entry-only-control']
OPERATIONS+=['entry-only-gap02-one','entry-only-reference-gap72','prefix-spacer-zero-after',
    'main-empty-zero-after','prefix-spacer-dedupe-empty']
MARKERS=[f'P202Praxis{i:02}' for i in range(1,19)]+['P202Endreferenz']


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def payloads(root):
    rows=[]
    for table in root.findall('.//w:tbl',NS):
        text=''.join(t.text or '' for t in table.iter(W+'t'))
        if not table.findall('.//w:tbl',NS) and any(m in text for m in MARKERS):
            normalized=ET.canonicalize(ET.tostring(table,encoding='unicode'))
            rows.append(hashlib.sha256(normalized.encode()).hexdigest())
    if len(rows)!=19:raise ValueError('Expected 18 innermost station tables and reference')
    return rows


def lead(main,which):
    for table in main.findall('w:tbl',NS):
        caption=table.find('w:tblPr/w:tblCaption',NS)
        if caption is not None and caption.get(W+'val')==LEADS[which]:return table
    raise ValueError('Missing expected lead wrapper '+which)


def flatten(main,which):
    table=lead(main,which);cells=table.findall('w:tr/w:tc',NS)
    if len(cells)!=1:raise ValueError('Lead wrapper must have one cell')
    children=[deepcopy(n) for n in cells[0] if n.tag!=W+'tcPr']
    index=list(main).index(table);main.remove(table)
    for i,n in enumerate(children):main.insert(index+i,n)


def direct_heading(main,text):
    matches=[n for n in main.findall('w:p',NS) if ''.join(t.text or '' for t in n.iter(W+'t'))==text]
    if len(matches)!=1:raise ValueError('Expected one direct heading '+text)
    return matches[0]


def max_table_depth(root,depth=0):
    depth+=root.tag==W+'tbl'
    return max([depth]+[max_table_depth(child,depth) for child in root])


def change_story(source,target,operation):
    if operation not in OPERATIONS:raise ValueError('Unknown reduction '+operation)
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite source fixture')
    action={'entry-only-gap02-one':'entry-only-control','entry-only-reference-gap72':'entry-only-control',
        'prefix-spacer-zero-after':'prefix-spacer-no-headings','prefix-spacer-dedupe-empty':'prefix-spacer-no-headings',
        'main-empty-zero-after':'baseline-coupled'}.get(operation,operation)
    with ZipFile(source) as pkg:
        raw=pkg.read('word/document.xml')
        for _,pair in ET.iterparse(io.BytesIO(raw),events=['start-ns']):ET.register_namespace(*pair)
        root=ET.fromstring(raw);before=deepcopy(root);critical=payloads(root)
        main=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)[2]
        if action=='drop-main-leading':
            first=main.find('w:p',NS)
            if ''.join(first.itertext()).strip():raise ValueError('Leading paragraph is not empty')
            main.remove(first)
        elif action.startswith('flatten-'):
            for which in (['school','experience'] if action=='flatten-both' else [action.removeprefix('flatten-')]):flatten(main,which)
        elif action.startswith('allow-'):
            whiches=['school','experience'] if action=='allow-both-leads-split' else [action.removeprefix('allow-').removesuffix('-lead-split')]
            for which in whiches:
                flag=lead(main,which).find('w:tr/w:trPr/w:cantSplit',NS)
                if flag is None:raise ValueError('Expected coupled lead row')
                flag.set(W+'val','0')
        elif action.startswith('detach-'):
            if action=='detach-main-top-level':targets=main.findall('w:p',NS)
            else:targets=[direct_heading(main,'Lebenslauf' if action=='detach-main-title' else 'Referenzen')]
            changed=0
            for paragraph_node in targets:
                flag=paragraph_node.find('w:pPr/w:keepNext',NS)
                if flag is not None and flag.get(W+'val')=='1':flag.set(W+'val','0');changed+=1
            if not changed:raise ValueError('Expected coupled direct paragraph')
        elif action=='entry-only-control':
            entries=[]
            for table in main.findall('.//w:tbl',NS):
                text=''.join(t.text or '' for t in table.iter(W+'t'))
                if not table.findall('.//w:tbl',NS) and any(m in text for m in MARKERS):entries.append(deepcopy(table))
            for n in list(main):
                if n.tag!=W+'tcPr':main.remove(n)
            main.append(paragraph('P206PRELUDE',line=4762,keep=False))
            for table in entries:main.extend([table,paragraph(line=20)])
        elif action.startswith('prefix-spacer'):
            first=lead(main,'experience');index=list(main).index(first)
            for n in list(main)[:index]:
                if n.tag!=W+'tcPr':main.remove(n)
            main.insert(1,paragraph('P206PRELUDE',line=4762,keep=False))
            if action!='prefix-spacer':flatten(main,'experience')
            if action in ['prefix-spacer-no-experience-heading','prefix-spacer-no-headings']:
                main.remove(direct_heading(main,'Praktika & Schnuppertage'))
            if action in ['prefix-spacer-no-reference-heading','prefix-spacer-no-headings']:
                main.remove(direct_heading(main,'Referenzen'))
        pair_before=deepcopy(root)
        if operation in ['entry-only-gap02-one','entry-only-reference-gap72']:
            index=1 if operation=='entry-only-gap02-one' else 17
            table=main.findall('w:tbl',NS)[index]
            gap=list(main)[list(main).index(table)+1]
            gap.find('w:pPr/w:spacing',NS).set(W+'after','1' if index==1 else '72')
        elif operation in ['main-empty-zero-after','prefix-spacer-zero-after']:
            for node in main.findall('w:p',NS):
                if any(t.text for t in node.iter(W+'t')):continue
                spacing=node.find('w:pPr/w:spacing',NS)
                if spacing is not None and spacing.get(W+'after') not in [None,'0']:spacing.set(W+'after','0')
        elif operation=='prefix-spacer-dedupe-empty':
            previous_empty=False
            for node in list(main):
                empty=node.tag==W+'p' and not any(t.text for t in node.iter(W+'t'))
                if empty and previous_empty:main.remove(node)
                previous_empty=empty
        after=payloads(root)
        if critical!=after:raise ValueError('Critical station/reference payload or order changed')
        source_text=''.join(t.text or '' for t in before.iter(W+'t'))
        result_text=''.join(t.text or '' for t in root.iter(W+'t'))
        reduced_text=action.startswith('prefix-spacer') or action=='entry-only-control'
        if not reduced_text and source_text!=result_text:raise ValueError('Unexpected visible-text edit')
        changed=raw if operation.startswith('baseline-') else ET.tostring(root,encoding='utf-8',xml_declaration=True)
        if operation.startswith('baseline-'):shutil.copyfile(source,target)
        else:
            with ZipFile(target,'w') as out:
                for info in pkg.infolist():out.writestr(info,changed if info.filename=='word/document.xml' else pkg.read(info))
    with ZipFile(source) as left,ZipFile(target) as right:
        if left.namelist()!=right.namelist() or any(left.read(n)!=right.read(n) for n in left.namelist() if n!='word/document.xml'):
            raise ValueError('Unrelated package parts changed')
    edits=attribute_diff(before,root) if operation.startswith(('allow-','detach-')) or operation=='main-empty-zero-after' else []
    paired_edits=attribute_diff(pair_before,root) if operation in ['entry-only-gap02-one','entry-only-reference-gap72','prefix-spacer-zero-after','main-empty-zero-after'] else []
    return {'before':facts(before),'after':facts(root),'source_sha256':digest(source),'copy_sha256':digest(target),
        'critical_tables_canonically_identical':True,'critical_table_count':19,'all_other_parts_identical':True,
        'visible_text_identical':source_text==result_text,'attribute_edits':edits,
        'document_xml_bytes':len(changed),'diagnostic_spacer_twips':4762 if reduced_text else None,
        'pair_reference_operation':action if action!=operation else None,'within_pair_attribute_edits':paired_edits,
        'max_table_depth_before':max_table_depth(before),'max_table_depth_after':max_table_depth(root)}


def marker_origin(pdf,marker):
    with fitz.open(pdf) as doc:
        for i,page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    if compact(''.join(s['text'] for s in line['spans']))==compact(marker):
                        return {'page':i+1,'origin_mm':[round(x*25.4/72,3) for x in line['spans'][0]['origin']]}
    return None


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--fixture-dir',type=Path,default=Path('tests/fixtures/lo-import-p2-04'))
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice')
    p.add_argument('--prepare-only',action='store_true');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=a.fixture_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    manifest=fixtures(source);old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else {}
    report={'implementation_sha':old.get('implementation_sha') if a.audit_only else os.environ.get('GITHUB_SHA'),
        'fixture_manifest_sha256':digest(source/'MANIFEST.json'),'cases':[],
        'scope':'Story reductions only, never product export fixes. Content PASS does not establish App/Word layout parity.'}
    if a.audit_only:report['converter_version']=old.get('converter_version')
    elif not a.prepare_only:report['converter_version']=subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip()
    references={f['filename']:f for f in manifest['fixtures']}
    for operation in OPERATIONS:
        filename='long-detached.docx' if operation=='baseline-detached' else 'long-coupled.docx'
        folder=out/operation;folder.mkdir(exist_ok=True);docx=folder/(operation+'.docx')
        if a.audit_only:
            prior=next(c for c in old['cases'] if c['id']==operation)
            if digest(docx)!=prior['package']['copy_sha256']:raise ValueError('Audit input hash mismatch')
            package=prior['package']
        else:package=change_story(source/filename,docx,operation)
        row={'id':operation,'source_fixture':filename,'package':package};report['cases'].append(row)
        if a.prepare_only:row['conversion_status']='PREPARED';continue
        pdf=folder/(operation+'.pdf')
        if a.audit_only:row['resources']=prior['resources']
        else:
            profile=folder/'profile'
            row['resources']=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
                '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
            shutil.rmtree(profile,ignore_errors=True)
        if row['resources'].get('status')=='BLOCKED':row['conversion_status']='BLOCKED';continue
        actual,images=inspect(pdf,folder);entries=entry_spans(actual['texts']);found=marker_pages(actual['texts'],MARKERS)
        row.update(conversion_status='PASS',pages=actual['pages'],producer=actual['producer'],pixel_sha256=actual['pixel_sha256'],
            marker_pages=found,missing=[m for m in MARKERS if not found[m]],entry_spans=entries,
            complete_entries=sum(e['complete'] for e in entries),split_entries=[e['marker'] for e in entries if e['split']],
            first_station=marker_origin(pdf,'P202Praxis01'),third_page_text_characters=len(actual['texts'][2]) if len(actual['texts'])>2 else None)
        row['content_status']='PASS' if not row['missing'] and all(e['complete'] for e in entries) else 'FAIL'
        if operation.startswith('baseline-'):row['baseline_pixels_match_p204']=actual['pixel_sha256']==references[filename]['observed']['pixel_sha256']
        from PIL import Image
        sheet=Image.new('RGB',(340,len(images)*481),'white')
        for i,image in enumerate(images):
            with Image.open(image) as im:sheet.paste(im.resize((340,481)),(0,i*481))
        sheet.save(folder/'pages.jpg',quality=90)
        print(operation,row['content_status'],row['complete_entries'],row['pages'],'pages',flush=True)
    if a.prepare_only:report['execution_status']='PREPARED'
    else:
        controls=[r for r in report['cases'] if r['id'].startswith('baseline-')]
        report['baseline_controls_pass']=len(controls)==2 and all(r.get('baseline_pixels_match_p204') is True for r in controls)
        report['execution_status']='PASS' if report['baseline_controls_pass'] and all(r['conversion_status']=='PASS' for r in report['cases']) else 'FAIL'
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-06 — generated preamble and lead-wrapper counterprobes','',
        'Execution PASS means completed conversions plus unchanged baseline controls. No product acceptance.',
        '', '| Copy | Conversion | Content | Pages | Complete entries | Split entries | Third-page text |',
        '|---|---|---|---:|---:|---:|---:|']
    for r in report['cases']:
        lines.append(f"| {r['id']} | {r['conversion_status']} | {r.get('content_status','-')} | {r.get('pages','-')} | {r.get('complete_entries','-')} | {len(r.get('split_entries',[]))} | {r.get('third_page_text_characters','-')} |")
    lines+=['','Execution: '+report['execution_status']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status'] in ['PASS','PREPARED'] else 1


if __name__=='__main__':raise SystemExit(main())
