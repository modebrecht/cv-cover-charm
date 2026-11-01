#!/usr/bin/env python3
"""P2-04 story reductions from synthetic production exports; no exporter edits.

These copies deliberately change content/layout to isolate importer behavior.
They are reproducers, never alternate product exports or parity baselines.
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
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import fitz
from PIL import Image
from dossier_converter_poc import run_conversion
from dossier_parity_content import marker_pages, photo_signature, compare_photo

NS = {'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'wp':'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'}
W = '{'+NS['w']+'}'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paragraph(text='', line=None, keep=None):
    p=ET.Element(W+'p'); props=ET.SubElement(p,W+'pPr')
    if keep is not None: ET.SubElement(props,W+'keepNext',{W+'val':str(int(keep))})
    if line: ET.SubElement(props,W+'spacing',{W+'line':str(line),W+'lineRule':'exact',W+'after':'0'})
    if text:
        run=ET.SubElement(p,W+'r'); rp=ET.SubElement(run,W+'rPr')
        ET.SubElement(rp,W+'rFonts',{W+'ascii':'Arial',W+'hAnsi':'Arial'})
        ET.SubElement(rp,W+'sz',{W+'val':'20'})
        ET.SubElement(run,W+'t').text=text
    return p


def unwrap_controls(parent):
    for child in list(parent):
        if child.tag==W+'sdt':
            content=child.find('w:sdtContent',NS)
            if content is None: raise ValueError('SDT without content')
            unwrap_controls(content)
            index=list(parent).index(child);parent.remove(child)
            for i,item in enumerate(list(content)):
                parent.insert(index+i,item)
        else: unwrap_controls(child)


def remove_drawings(root):
    for parent in root.iter():
        for child in list(parent):
            if child.tag==W+'drawing':parent.remove(child)


def facts(root):
    return {'nodes':sum(1 for _ in root.iter()),'tables':len(root.findall('.//w:tbl',NS)),
            'controls':len(root.findall('.//w:sdt',NS)),
            'drawings':len(root.findall('.//w:drawing',NS)),
            'text_characters':sum(len(t.text or '') for t in root.iter(W+'t'))}


def fill_cell(cell, children):
    props=deepcopy(cell.find('w:tcPr',NS))
    cell.clear()
    if props is not None:cell.append(props)
    cell.extend(children)


def bare_inner(text, width, height=None):
    table=ET.Element(W+'tbl');props=ET.SubElement(table,W+'tblPr')
    ET.SubElement(props,W+'tblW',{W+'w':str(width),W+'type':'dxa'})
    ET.SubElement(props,W+'tblLayout',{W+'type':'fixed'})
    grid=ET.SubElement(table,W+'tblGrid');ET.SubElement(grid,W+'gridCol',{W+'w':str(width)})
    row=ET.SubElement(table,W+'tr');rp=ET.SubElement(row,W+'trPr');ET.SubElement(rp,W+'cantSplit')
    if height:ET.SubElement(rp,W+'trHeight',{W+'val':str(height),W+'hRule':'atLeast'})
    cell=ET.SubElement(row,W+'tc');cp=ET.SubElement(cell,W+'tcPr')
    ET.SubElement(cp,W+'tcW',{W+'w':str(width),W+'type':'dxa'})
    cell.append(paragraph(text))
    return table


def reduce_story(source, target, operation):
    if operation not in {op for _,op in plan()}:raise ValueError('Unknown reduction '+operation)
    if source.resolve()==target.resolve():raise ValueError('Diagnostic output must not overwrite its source')
    if operation=='original':
        shutil.copyfile(source,target)
        with ZipFile(source) as pkg:raw=pkg.read('word/document.xml')
        original=facts(ET.fromstring(raw))
        return {'before':original,'after':original,'document_xml_bytes_before':len(raw),
                'document_xml_bytes_after':len(raw),'other_package_parts_identical':True}
    with ZipFile(source) as pkg:
        raw=pkg.read('word/document.xml')
        for _,pair in ET.iterparse(io.BytesIO(raw),events=['start-ns']):ET.register_namespace(*pair)
        root=ET.fromstring(raw);before=facts(root)
        body=root.find('w:body',NS)
        if operation!='original':
            section=body.find('w:sectPr',NS)
            for child in list(section):
                if child.tag in [W+'headerReference',W+'footerReference']:section.remove(child)
            if operation.startswith('photo-'):
                table=body.find('w:tbl',NS)
                cells=table.find('w:tr',NS).findall('w:tc',NS)
                anchor_paragraph=deepcopy(cells[0].find('w:p',NS))
                for i,cell in enumerate(cells):
                    fill_cell(cell,[anchor_paragraph if i==0 else paragraph(),paragraph('P204BODY' if i==0 else '')])
                section=deepcopy(section);table=deepcopy(table);body.clear()
                if operation=='photo-paragraph-20':
                    body.extend([anchor_paragraph,paragraph('P204BODY')])
                else:body.append(table)
                body.extend([paragraph(),section])
                margin=section.find('w:pgMar',NS)
                margin.set(W+'left',{'photo-table-0':'0','photo-table-10':'567'}.get(operation,'1134'))
                if operation=='photo-table-in-cell':root.find('.//wp:anchor',NS).set('layoutInCell','1')
            else:
                unwrap_controls(body)
                if operation not in ['long-unwrapped']:remove_drawings(body)
                cells=body.find('w:tbl/w:tr',NS).findall('w:tc',NS)
                if operation in ['long-sidebar-min','long-sidebar-detached','long-bare','long-bare-detached']:
                    start=deepcopy(cells[0].find('w:p',NS))
                    if operation.endswith('detached'):start.find('w:pPr/w:keepNext',NS).set(W+'val','0')
                    width=int(cells[0].find('w:tcPr/w:tcW',NS).get(W+'w'))
                    fill_cell(cells[0],[start,bare_inner('P204SIDEBAR',width),paragraph()])
                if operation in ['long-bare','long-bare-detached']:
                    width=int(cells[2].find('w:tcPr/w:tcW',NS).get(W+'w'))
                    children=[paragraph('P204INTRO',line=4535,keep=False)]
                    for i in range(1,19):
                        children.append(bare_inner(f'P204Entry{i:02} Synthetic station body P204End{i:02}',width,1417))
                        children.append(paragraph(line=20))
                    children.append(paragraph('P204TAIL'))
                    fill_cell(cells[2],children)
        changed=raw if operation=='original' else ET.tostring(root,encoding='utf-8',xml_declaration=True)
        with ZipFile(target,'w') as out:
            for info in pkg.infolist():out.writestr(info,changed if info.filename=='word/document.xml' else pkg.read(info))
    with ZipFile(source) as original, ZipFile(target) as reduced:
        assert original.namelist()==reduced.namelist()
        assert all(original.read(n)==reduced.read(n) for n in original.namelist() if n!='word/document.xml')
    return {'before':before,'after':facts(root),'document_xml_bytes_before':len(raw),
            'document_xml_bytes_after':len(changed),'other_package_parts_identical':True}


def plan():
    return [('cv-right','original')]+[('cv-right',o) for o in [
        'photo-table-20','photo-table-10','photo-table-0','photo-paragraph-20','photo-table-in-cell']]+[
        ('cv-long-left','original'),('cv-long-right','original')]+[
        ('cv-long-left',o) for o in ['long-unwrapped','long-no-image','long-sidebar-min',
                                   'long-sidebar-detached','long-bare','long-bare-detached']]


def inspect(path, folder):
    texts=[];photos=[];images=[]
    with fitz.open(path) as pdf:
        producer=pdf.metadata.get('producer')
        for i,page in enumerate(pdf):
            pix=page.get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False)
            rgb=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            photos.append(photo_signature(rgb,(page.rect.width*25.4/72,page.rect.height*25.4/72)))
            output=folder/f'page-{i+1}.png';rgb.save(output);images.append(output)
            texts.append(page.get_text())
    return {'texts':texts,'photos':photos,'pages':len(texts),'producer':producer},images


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--out-dir',type=Path,required=True)
    p.add_argument('--prepare-only',action='store_true');p.add_argument('--audit-only',action='store_true')
    p.add_argument('--libreoffice',default='libreoffice');a=p.parse_args()
    source=a.source_dir.resolve();out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    catalog=json.loads((source/'CATALOG.json').read_text());count=0
    for path in source.glob('*.json'):
        if path.name=='CATALOG.json':continue
        row=json.loads(path.read_text());assert row['sha']==catalog['sha'] and row['status']=='EXPORTED'
        for f in row['files']:assert digest(source/f['filename'])==f['sha256'];count+=1
    assert count==16,'Expected all 8 production source pairs'
    old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else {}
    report={'implementation_sha':old.get('implementation_sha') if a.audit_only else os.environ.get('GITHUB_SHA'),
            'source_sha':catalog['sha'],'source_hashes_verified':count,'cases':[],
            'scope':'Synthetic story reductions, not product export fixes or parity acceptance.'}
    app_folder=out/'photo-reference';app_folder.mkdir(exist_ok=True)
    reference,_=inspect(source/'cv-right.pdf',app_folder)
    for case,operation in plan():
        ident=case+'--'+operation;folder=out/ident;folder.mkdir(exist_ok=True)
        docx=folder/(ident+'.docx');meta=reduce_story(source/(case+'.docx'),docx,operation)
        row={'id':ident,'source':case,'operation':operation,'source_sha256':digest(source/(case+'.docx')),
             'docx_sha256':digest(docx),'reduction':meta};report['cases'].append(row)
        if a.prepare_only:row['conversion_status']='PREPARED';continue
        pdf=folder/(ident+'.pdf')
        if a.audit_only:
            prior=next(r for r in old['cases'] if r['id']==ident)
            assert prior['docx_sha256']==row['docx_sha256'],'Probe changed during replay'
            row['resources']=prior['resources']
        else:
            profile=folder/'profile'
            row['resources']=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',
                '-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],
                pdf,folder/'conversion.log',90)
            shutil.rmtree(profile,ignore_errors=True)
        if row['resources'].get('status')=='BLOCKED':row['conversion_status']='BLOCKED';continue
        actual,images=inspect(pdf,folder)
        if case=='cv-right':
            markers=['P204BODY'] if operation!='original' else ['Lea Müller','Herr Thomas Weber']
            row['photo']=compare_photo(reference['photos'][0],actual['photos'][0])
            row['photo_signature']=actual['photos'][0]
        else:
            markers=([f'P204Entry{i:02}' for i in range(1,19)]+[f'P204End{i:02}' for i in range(1,19)]+['P204TAIL']
                if operation.startswith('long-bare') else [f'P202Praxis{i:02}' for i in range(1,19)]+['P202Endreferenz'])
        found=marker_pages(actual['texts'],markers)
        row.update(conversion_status='PASS',pages=actual['pages'],producer=actual['producer'],marker_pages=found,
                   missing=[m for m in markers if not found[m]],page_text_characters=[len(t) for t in actual['texts']])
        row['content_status']='FAIL' if row['missing'] else 'PASS'
        sheet=Image.new('RGB',(340,481*len(images)),'#ddd')
        for i,path in enumerate(images):
            with Image.open(path) as im:sheet.paste(im.resize((340,481)),(0,i*481))
        sheet.save(folder/'pages.jpg',quality=88)
        print(ident,row['content_status'],row['pages'],'pages',len(row['missing']),'missing',flush=True)
    by={r['id']:r for r in report['cases']}
    if a.prepare_only:report['execution_status']='PREPARED'
    else:
        tail={'P202Praxis16','P202Praxis17','P202Praxis18','P202Endreferenz'}
        controls=(abs(by['cv-right--original'].get('photo',{}).get('bbox_delta_mm',[0])[0]-20)<.5 and
            by['cv-right--original'].get('pages')==1 and
            all(by[c+'--original'].get('pages')==3 and set(by[c+'--original'].get('missing',[]))==tail
                for c in ['cv-long-left','cv-long-right']))
        report['original_defects_reproduced']=controls
        report['execution_status']='PASS' if controls and all(r['conversion_status']=='PASS' for r in report['cases']) else 'FAIL'
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-04 — synthetic story reductions','',f"Source SHA: `{report['source_sha']}`",
           '', 'Execution PASS means conversions completed and original failures reproduced. No product acceptance.',
           '', '| Reproducer | Conversion | Text | Pages | Missing | XML bytes | Tables | Photo x drift mm |',
           '|---|---|---|---:|---:|---:|---:|---:|']
    for r in report['cases']:
        lines.append(f"| {r['id']} | {r['conversion_status']} | {r.get('content_status','-')} | {r.get('pages','-')} | {len(r.get('missing',[]))} | {r['reduction']['document_xml_bytes_after']} | {r['reduction']['after']['tables']} | {r.get('photo',{}).get('bbox_delta_mm',['-'])[0]} |")
    lines+=['','Execution: '+report['execution_status']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status'] in ['PASS','PREPARED'] else 1


if __name__=='__main__':raise SystemExit(main())
