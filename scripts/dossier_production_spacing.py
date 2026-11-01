#!/usr/bin/env python3
"""P2-08: compare untouched production downloads and one-attribute copies.

Experiment execution is distinct from content/layout acceptance. Never changes
the exporter or substitutes diagnostic copies for the original parity baseline.
"""
from __future__ import annotations
import argparse
from collections import defaultdict
from copy import deepcopy
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz
from PIL import Image

from dossier_converter_poc import run_conversion
from dossier_lo_isolation import attribute_diff
from dossier_lo_minimal import inspect as inspect_control
from dossier_lo_spacing import read_root
from dossier_parity_content import compact,compare_photo,docx_text,marker_pages,photo_signature

W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS={'w':W[1:-1]}


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def markers(count):return [f'P202Praxis{i:02}' for i in range(1,count+1)]+['P202Endreferenz']


def critical(root,count):
    result=[]
    for table in root.findall('.//w:tbl',NS):
        text=''.join(t.text or '' for t in table.iter(W+'t'))
        if not table.findall('.//w:tbl',NS) and any(m in text for m in markers(count)):
            result.append(hashlib.sha256(ET.canonicalize(ET.tostring(table,encoding='unicode')).encode()).hexdigest())
    if len(result)!=count+1:raise ValueError('Unexpected station/reference table count')
    return result


def change_gap(source,target,count):
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite original download')
    root=read_root(source);before=deepcopy(root)
    cells=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)
    mains=[c for c in cells if 'P202Praxis06' in ''.join(t.text or '' for t in c.iter(W+'t'))]
    if len(mains)!=1:raise ValueError('Expected one main cell with authored entry 06')
    main=mains[0];tables=[n for n in main.findall('w:tbl',NS) if 'P202Praxis06' in ''.join(t.text or '' for t in n.iter(W+'t'))]
    if len(tables)!=1:raise ValueError('Entry 06 must have one direct main-cell table')
    index=list(main).index(tables[0])+1;gap=main[index]
    if gap.tag!=W+'p' or any(t.text for t in gap.iter(W+'t')):raise ValueError('Expected an empty paragraph after entry 06')
    spacing=gap.find('w:pPr/w:spacing',NS)
    if spacing is None or spacing.get(W+'after')!='1':raise ValueError('Expected after=1 at entry 06 gap')
    spacing.set(W+'after','0');edits=attribute_diff(before,root)
    if len(edits)!=1 or edits[0]['attribute']!=W+'after':raise ValueError('Unexpected attribute change')
    if critical(before,count)!=critical(root,count):raise ValueError('Critical table payload changed')
    with ZipFile(source) as pkg,ZipFile(target,'w') as out:
        for info in pkg.infolist():out.writestr(info,ET.tostring(root,encoding='utf-8',xml_declaration=True) if info.filename=='word/document.xml' else pkg.read(info))
    with ZipFile(source) as a,ZipFile(target) as b:
        if a.namelist()!=b.namelist() or any(a.read(n)!=b.read(n) for n in a.namelist() if n!='word/document.xml'):
            raise ValueError('Other package parts changed')
    if docx_text(source)!=docx_text(target):raise ValueError('Visible source text changed')
    return {'source_sha256':digest(source),'copy_sha256':digest(target),'attribute_edits':edits,
        'main_cell_index':cells.index(main),'gap_main_child_index':index,'critical_tables_identical':count+1,
        'visible_text_identical':True,'all_non_document_parts_identical':True}


def spans(texts,count):
    pages=[compact(t) for t in texts];combined=''.join(pages);ends=[];total=0
    for t in pages:total+=len(t);ends.append(total)
    def page_at(pos):return next((i+1 for i,end in enumerate(ends) if 0<=pos<end),None)
    result=[];all_markers=markers(count)
    for i,m in enumerate(all_markers[:-1]):
        start=combined.find(compact(m));limit=combined.find(compact(all_markers[i+1]),start+len(compact(m))) if start>=0 else -1
        end=combined.find('arbeitsschritte',start) if start>=0 else -1
        if end<0 or (limit>=0 and end>=limit):end=-1
        first=page_at(start);last=page_at(end+len('arbeitsschritte')-1) if end>=0 else None
        result.append({'marker':m,'start_page':first,'end_page':last,'complete':first is not None and last is not None,
            'split':first is not None and last is not None and first!=last})
    return result


def content(texts,count):
    found=marker_pages(texts,markers(count));entries=spans(texts,count)
    reference=all(compact(s) in compact(''.join(texts)) for s in ['Klassenlehrer','079 555 12 34'])
    missing=[m for m,pages in found.items() if len(pages)!=1]
    complete=sum(e['complete'] for e in entries)
    return {'status':'PASS' if not missing and complete==count and reference else 'FAIL',
        'marker_pages':found,'missing_or_nonunique':missing,'entries':entries,'complete_entries':complete,
        'split_entries':[e['marker'] for e in entries if e['split']],'reference_body_present':reference}


def tsv_origins(text,expected,page,page_mm,pixel_size):
    lines=defaultdict(list)
    for row in csv.DictReader(io.StringIO(text),delimiter='\t'):
        if row.get('text','').strip():lines[(row['block_num'],row['par_num'],row['line_num'])].append(row)
    found={}
    for rows in lines.values():
        for m in expected:
            for start in range(len(rows)):
                for length in range(1,min(4,len(rows)-start)+1):
                    selected=rows[start:start+length]
                    if compact(''.join(r['text'] for r in selected))!=compact(m):continue
                    x=min(int(r['left']) for r in selected);y=min(int(r['top']) for r in selected)
                    found[m]={'page':page,'top_left_mm':[round(x/pixel_size[0]*page_mm[0],3),round(y/pixel_size[1]*page_mm[1],3)]}
    return found


def measure(pdf,folder,label,count):
    texts=[];photos=[];images=[];origins={};methods=[];pixels=[]
    with fitz.open(pdf) as doc:
        producer=doc.metadata.get('producer')
        for i,page in enumerate(doc):
            page_mm=[page.rect.width*25.4/72,page.rect.height*25.4/72]
            pix=page.get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False)
            rgb=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            image=folder/f'{label}-{i+1}.png';rgb.save(image);images.append(image)
            pixels.append(hashlib.sha256(rgb.tobytes()).hexdigest());photos.append(photo_signature(rgb,page_mm))
            text=page.get_text();method='PDF text layer'
            if len(compact(text))<20:
                raster=folder/f'{label}-{i+1}-ocr.png';high=page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False);high.save(raster)
                base=raster.with_suffix('')
                proc=subprocess.run(['tesseract',str(raster),str(base),'--psm','11','txt','tsv'],capture_output=True,text=True,timeout=30)
                if proc.returncode:raise RuntimeError('OCR failed: '+proc.stderr[-200:])
                text=base.with_suffix('.txt').read_text();method='OCR visible pixels (English; diacritics normalized)'
                origins.update(tsv_origins(base.with_suffix('.tsv').read_text(),markers(count),i+1,page_mm,[high.width,high.height]))
            else:
                for block in page.get_text('dict')['blocks']:
                    for line in block.get('lines',[]):
                        value=compact(''.join(s['text'] for s in line['spans']))
                        for m in markers(count):
                            if value==compact(m):origins[m]={'page':i+1,'top_left_mm':[round(v*25.4/72,3) for v in line['bbox'][:2]]}
            texts.append(text);methods.append(method)
    return {'pages':len(texts),'content':content(texts,count),'photos':photos,'title_positions':origins,
        'pixel_sha256':pixels,'text_methods':methods,'producer':producer},images


def compare(app,actual,count,mirrored):
    expected=markers(count);ac=app['content'];lc=actual['content']
    page_changes=[m for m in expected if ac['marker_pages'][m]!=lc['marker_pages'][m]]
    span_changes=[e['marker'] for e,f in zip(ac['entries'],lc['entries']) if (e['start_page'],e['end_page'])!=(f['start_page'],f['end_page'])]
    geometry=[]
    for m in expected:
        a=app['title_positions'].get(m);b=actual['title_positions'].get(m)
        geometry.append({'marker':m,'app':a,'lo':b,'delta_mm':[round(y-x,3) for x,y in zip(a['top_left_mm'],b['top_left_mm'])] if a and b and a['page']==b['page'] else None})
    geo_ok=all(g['delta_mm'] is not None and max(abs(v) for v in g['delta_mm'])<=2.0 for g in geometry)
    photo=compare_photo(app['photos'][0],actual['photos'][0]);side='right' if mirrored else 'left'
    photo['expected_side']=side
    if any(('right' if p.get('bbox_mm',[0])[0]>105 else 'left')!=side for p in [app['photos'][0],actual['photos'][0]]):photo.update(status='FAIL',side_mismatch=True)
    if any(p.get('visible') for p in app['photos'][1:]+actual['photos'][1:]):photo.update(status='FAIL',repeated_on_continuation=True)
    layout_ok=app['pages']==actual['pages'] and not page_changes and not span_changes and not lc['split_entries'] and geo_ok
    accepted=ac['status']==lc['status']=='PASS' and layout_ok and photo['status']=='PASS'
    return {'status':'PASS' if accepted else 'FAIL','content_status':lc['status'],
        'layout_status':'PASS' if layout_ok else 'FAIL','photo':photo,'pages_match':app['pages']==actual['pages'],
        'title_page_changes':page_changes,'entry_span_changes':span_changes,'title_geometry':geometry,
        'title_geometry_status':'PASS' if geo_ok else 'FAIL','title_geometry_tolerance_mm':2.0}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-dir',type=Path,required=True)
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=a.source_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    catalog=json.loads((source/'CATALOG.json').read_text());sha=os.environ.get('GITHUB_SHA',catalog['sha'])
    if catalog['sha']!=sha:raise ValueError('Mixed implementation/source SHA')
    report={'sha':sha,'scope':'Production Modern Next copies, not x39 or Word acceptance. Execution PASS is separate from candidate parity.',
        'converter_version':old['converter_version'] if old else subprocess.run([a.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip(),
        'cases':[],'controls':[],'conversion_attempts':[],'audit_only':a.audit_only}

    def convert(docx,folder,prior=None):
        pdf=folder/(docx.stem+'.pdf')
        if old:
            if not prior or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved PDF hash mismatch')
            return pdf,prior['resources']
        profile=folder/'profile'
        resource=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard','-env:UserInstallation='+profile.as_uri(),
            '--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
        shutil.rmtree(profile,ignore_errors=True)
        report['conversion_attempts'].append({'docx':str(docx.relative_to(source)) if docx.is_relative_to(source) else str(docx.relative_to(out)),
            'status':'BLOCKED' if resource.get('status')=='BLOCKED' else 'PASS','resources':resource})
        if resource.get('status')=='BLOCKED':raise RuntimeError(resource['error'])
        return pdf,resource

    try:
        root=Path(__file__).resolve().parents[1];p206=root/'tests/fixtures/lo-import-p2-06';p207=root/'tests/fixtures/lo-import-p2-07'
        m206=json.loads((p206/'MANIFEST.json').read_text());m207=json.loads((p207/'MANIFEST.json').read_text())
        for tag,src,expected in [('p207-original',p206/'long-gap-original.docx',m206['fixtures'][0]),('p207-minimum',p207/m207['filename'],m207)]:
            if digest(src)!=expected['sha256']:raise ValueError('Pinned control source mismatch')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=digest(src):raise ValueError('Saved control DOCX changed')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None
            pdf,resources=convert(docx,folder,prior);facts,_=inspect_control(pdf,folder)
            row={'id':tag,'resources':resources,'pdf_sha256':digest(pdf),'docx_sha256':digest(docx),
                'pixel_sha256':facts['pixel_sha256'],'pixels_match_persisted':facts['pixel_sha256']==expected['observed']['pixel_sha256']}
            report['controls'].append(row)
            if not row['pixels_match_persisted']:raise ValueError('Pinned control pixels changed: '+tag)
        paths=sorted(p for p in source.glob('*.json') if p.name!='CATALOG.json')
        expected_ids={f'cv-{n}-{side}' for n in [17,18,19] for side in ['left','right']}
        if {p.stem for p in paths}!=expected_ids:raise ValueError('Expected exactly six production case manifests')
        for path in paths:
            meta=json.loads(path.read_text());count=meta['entryCount'];tag=meta['id'];folder=out/tag;folder.mkdir(exist_ok=True)
            if meta['sha']!=sha or meta['status']!='EXPORTED':raise ValueError('Unusable source export '+tag)
            for f in meta['files']:
                if digest(source/f['filename'])!=f['sha256']:raise ValueError('Source download hash mismatch')
            original=source/(tag+'.docx');copy=folder/(tag+'-gap06-zero.docx')
            if old:
                with tempfile.TemporaryDirectory() as temp:
                    package=change_gap(original,Path(temp)/copy.name,count)
                    if digest(copy)!=package['copy_sha256']:raise ValueError('Saved diagnostic DOCX mismatch')
            else:package=change_gap(original,copy,count)
            if content([docx_text(original)],count)['status']!='PASS':raise ValueError('Authored source data incomplete')
            app,app_images=measure(source/(tag+'.pdf'),folder,'app',count)
            case={'id':tag,'entry_count':count,'mirrored':meta['mirrored'],'source_files':meta['files'],'package':package,'app':app,'variants':[]};report['cases'].append(case)
            for variant,docx in [('original',original),('gap06-zero',copy)]:
                dest=folder/variant;dest.mkdir(exist_ok=True)
                previous=next(c for c in old['cases'] if c['id']==tag) if old else None
                prior=next(v for v in previous['variants'] if v['id']==variant) if previous else None
                pdf,resources=convert(docx,dest,prior);actual,images=measure(pdf,folder,variant,count)
                row={'id':variant,'conversion_status':'PASS','resources':resources,'pdf_sha256':digest(pdf),'actual':actual,
                    'comparison':compare(app,actual,count,meta['mirrored'])};case['variants'].append(row)
                sheet=Image.new('RGB',(680,481*max(len(app_images),len(images))),'#ddd')
                for col,paths2 in enumerate([app_images,images]):
                    for i,image in enumerate(paths2):
                        with Image.open(image) as im:sheet.paste(im.resize((340,481)),(col*340,i*481))
                sheet.save(folder/(variant+'-comparison.jpg'),quality=90)
                print(tag,variant,row['comparison']['status'],'content',actual['content']['complete_entries'],'/',count,'photo',row['comparison']['photo']['status'],flush=True)
        report['execution_status']='PASS' if len(report['cases'])==6 and all(c['app']['content']['status']=='PASS' and len(c['variants'])==2 for c in report['cases']) else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts'])
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-08 — production spacing counterprobe','',report['scope'],'',
        '| Case | Variant | Overall | Content | Complete entries | App/LO pages | Layout | Photo |',
        '|---|---|---|---|---:|---:|---|---|']
    for case in report['cases']:
        for row in case['variants']:
            c=row['comparison'];actual=row['actual']
            lines.append(f"| {case['id']} | {row['id']} | {c['status']} | {c['content_status']} | {actual['content']['complete_entries']}/{case['entry_count']} | {case['app']['pages']}/{actual['pages']} | {c['layout_status']} | {c['photo']['status']} |")
    lines+=['','Execution: '+report['execution_status']]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
