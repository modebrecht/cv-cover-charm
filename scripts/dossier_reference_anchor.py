#!/usr/bin/env python3
"""P2-13: retain the reference line while isolating its anchor properties.

Full synthetic source copies only. Text recovery, line visibility and App
layout/photo parity are separate outcomes; normal exports remain unchanged.
"""
from __future__ import annotations
import argparse
from copy import deepcopy
import hashlib
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
from dossier_lo_boundaries import load_inputs
from dossier_lo_context import NS,W,WP,canon,cells_of,critical,named_drawings,parse_part,read_root,reduce_context
from dossier_lo_minimal import facts,inspect as inspect_control
from dossier_production_spacing import compare,digest,measure

A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
REFERENCE='cv.section.referenzen.heading.flow-paint'
P212_SHA256='e479a8e22fda52691f8858ed74461ac5529f545cea39a97327a53986dfa0c685'
PROFILES=['original','delete-reference','outside-cell','foreground','no-overlap','paragraph-y','paragraph-y-outside-cell','inline']


def reference_drawing(root):
    found=[d for d in root.iter(W+'drawing') if (p:=d.find('.//'+WP+'docPr')) is not None and p.get('name')==REFERENCE]
    if len(found)!=1:raise ValueError('Expected one reference heading drawing')
    return found[0]


def change_anchor(drawing,profile):
    anchor=drawing.find(WP+'anchor')
    if anchor is None:raise ValueError('Expected original reference anchor')
    if profile in ['outside-cell','paragraph-y-outside-cell']:
        if anchor.get('layoutInCell')!='1':raise ValueError('Unexpected layoutInCell')
        anchor.set('layoutInCell','0')
    if profile=='foreground':
        if anchor.get('behindDoc')!='1':raise ValueError('Unexpected behindDoc')
        anchor.set('behindDoc','0')
    if profile=='no-overlap':
        if anchor.get('allowOverlap')!='1':raise ValueError('Unexpected allowOverlap')
        anchor.set('allowOverlap','0')
    if profile in ['paragraph-y','paragraph-y-outside-cell']:
        position=anchor.find(WP+'positionV')
        if position is None or position.get('relativeFrom')!='line':raise ValueError('Unexpected vertical anchor')
        position.set('relativeFrom','paragraph')
    if profile=='inline':
        inline=ET.Element(WP+'inline',{k:anchor.get(k,'0') for k in ['distT','distB','distL','distR']})
        for name in [WP+'extent',WP+'effectExtent',WP+'docPr',WP+'cNvGraphicFramePr',A+'graphic']:
            node=anchor.find(name)
            if node is None:raise ValueError('Missing inline payload '+name)
            inline.append(deepcopy(node))
        drawing.remove(anchor);drawing.append(inline)


def make_copy(source,target,profile,zero_gaps):
    if profile not in PROFILES:raise ValueError('Unknown reference-anchor profile')
    mode='main-heading-paint' if profile=='delete-reference' else 'original'
    kwargs={'paint_names':{REFERENCE}} if profile=='delete-reference' else {}
    meta=reduce_context(source,target,mode,zero_gaps,**kwargs)
    if profile not in ['original','delete-reference']:
        with ZipFile(target) as z:infos=z.infolist();parts={n:z.read(n) for n in z.namelist()}
        root=parse_part(parts['word/document.xml']);before=deepcopy(root);drawing=reference_drawing(root)
        expected=deepcopy(before);change_anchor(reference_drawing(expected),profile);change_anchor(drawing,profile)
        if canon(root)!=canon(expected):raise ValueError('Unexpected reference-anchor edit')
        if critical(before,18)!=critical(root,18):raise ValueError('Critical table payload changed')
        if named_drawings(before)!=named_drawings(root):raise ValueError('Drawing identity changed')
        if canon(reference_drawing(before).find('.//'+A+'graphic'))!=canon(drawing.find('.//'+A+'graphic')):raise ValueError('Reference graphic changed')
        ac,_,si=cells_of(before);bc,_,_=cells_of(root)
        if canon(ac[si])!=canon(bc[si]):raise ValueError('Sidebar changed')
        parts['word/document.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
        with ZipFile(target,'w') as z:
            for info in infos:z.writestr(info,parts[info.filename])
        meta['context']='reference-anchor/'+profile;meta['copy_sha256']=digest(target);meta['document_after']=facts(root)
    a=read_root(source);b=read_root(target)
    if critical(a,18)!=critical(b,18) or [t.text for t in a.iter(W+'t')]!=[t.text for t in b.iter(W+'t')]:raise ValueError('Source text or payload changed')
    if len(b.findall('.//w:sdt',NS))!=107:raise ValueError('Body controls changed')
    ac,_,si=cells_of(a);bc,_,_=cells_of(b)
    if canon(ac[si])!=canon(bc[si]) or [canon(c.find('w:p/w:pPr',NS)) for c in ac]!=[canon(c.find('w:p/w:pPr',NS)) for c in bc]:raise ValueError('Sidebar or initial paragraph flags changed')
    with ZipFile(source) as x,ZipFile(target) as y:
        if x.namelist()!=y.namelist():raise ValueError('Package membership changed')
        changed=[n for n in x.namelist() if x.read(n)!=y.read(n)]
        if set(changed)-{'word/document.xml'}:raise ValueError('Unrelated package part changed')
        meta['changed_parts']=changed;meta['part_hashes']=[{'path':n,'before_sha256':hashlib.sha256(x.read(n)).hexdigest(),'after_sha256':hashlib.sha256(y.read(n)).hexdigest()} for n in changed]
    meta.update(profile=profile,body_controls_retained=107,all_word_text_identical=True,reference_graphic_retained=profile!='delete-reference')
    return meta


def line_pixels(rgb):
    """Require a long continuous dark run, rather than counting text-like marks."""
    rgb=rgb.convert('RGB');pixels=rgb.load();longest=0;best_y=None
    if rgb.width<1 or rgb.height<1:raise ValueError('Empty reference-line crop')
    for y in range(rgb.height):
        run=0
        for x in range(rgb.width):
            pixel=pixels[x,y];dark=sum(pixel)/3<195 and min(pixel)<180
            run=run+1 if dark else 0
            if run>longest:longest=run;best_y=y
    fraction=longest/rgb.width
    return {'status':'PASS' if fraction>=0.85 else 'FAIL','longest_dark_run_fraction':round(fraction,6),'required_fraction':0.85,'best_row':best_y,'pixel_size':[rgb.width,rgb.height]}


def reference_line(pdf,crop_path=None):
    with fitz.open(pdf) as doc:
        found=[]
        for number,page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    if ''.join(s['text'] for s in line['spans']).strip().upper()=='REFERENZEN':found.append((number,line['bbox']))
        if len(found)!=1:return {'status':'FAIL','reason':'Reference heading missing or nonunique','heading_count':len(found)}
        number,bbox=found[0];mm=72/25.4
        rect=fitz.Rect(bbox[0]+30*mm,bbox[1]-.5*mm,bbox[0]+60*mm,bbox[3]+.5*mm)
        if not doc[number].rect.contains(rect):return {'status':'FAIL','reason':'Reference-line crop outside page'}
        pix=doc[number].get_pixmap(matrix=fitz.Matrix(2,2),clip=rect,alpha=False);rgb=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        result=line_pixels(rgb);result.update(page=number+1,crop_mm=[round(v/mm,3) for v in rect],heading_count=1)
        if crop_path:rgb.save(crop_path)
        return result


def main():
    repo=Path(__file__).resolve().parents[1];p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');args=p.parse_args()
    source=repo/'tests/fixtures/lo-import-p2-08';app_path=repo/'docs/qa/p2-08-production-results.json';_,reference=load_inputs(source,app_path)
    prior_path=repo/'docs/qa/p2-12-native-results.json'
    if digest(prior_path)!=P212_SHA256:raise ValueError('Pinned P2-12 evidence changed')
    previous=json.loads(prior_path.read_text());out=args.out_dir.resolve();out.mkdir(parents=True,exist_ok=True);old=json.loads((out/'RESULTS.json').read_text()) if args.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),'source_export_sha':reference['sha'],
        'app_reference_sha256':digest(app_path),'p212_reference_sha256':digest(prior_path),'scope':'Reference-anchor copies of two full synthetic Modern 18-entry sources; original/all-zero gaps. Not product/x39/Word acceptance.',
        'converter_version':old['converter_version'] if old else subprocess.run([args.libreoffice,'--version'],capture_output=True,text=True,timeout=10).stdout.strip(),
        'controls':[],'cases':[],'conversion_attempts':[],'audit_only':args.audit_only}

    def convert(docx,folder,prior):
        pdf=folder/(docx.stem+'.pdf')
        if old:
            if not prior or digest(pdf)!=prior['pdf_sha256']:raise ValueError('Saved PDF hash mismatch')
            return pdf,prior['resources']
        profile=folder/'profile';res=run_conversion([args.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard','-env:UserInstallation='+profile.as_uri(),'--convert-to','pdf','--outdir',str(folder),str(docx)],pdf,folder/'conversion.log',90)
        shutil.rmtree(profile,ignore_errors=True);report['conversion_attempts'].append({'id':folder.name,'resources':res})
        if res.get('status')=='BLOCKED':raise RuntimeError(res['error'])
        return pdf,res

    try:
        for tag,relative in [('small-original','lo-import-p2-06/long-gap-original.docx'),('small-minimum','lo-import-p2-07/long-gap06-zero.docx')]:
            expected=next(c for c in previous['controls'] if c['id']==tag);src=repo/'tests/fixtures'/relative
            if digest(src)!=expected['docx_sha256']:raise ValueError('Small control source changed')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=digest(src):raise ValueError('Saved small control changed')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None;pdf,res=convert(docx,folder,prior);actual,_=inspect_control(pdf,folder)
            row={'id':tag,'docx_sha256':digest(docx),'pdf_sha256':digest(pdf),'resources':res,'pixel_sha256':actual['pixel_sha256'],'pixels_match_p212':actual['pixel_sha256']==expected['pixel_sha256']};report['controls'].append(row)
            if not row['pixels_match_p212']:raise ValueError('Small control pixels changed')
        for side in ['left','right']:
            ref=next(c for c in reference['cases'] if c['id']==f'cv-18-{side}')
            for zero in [False,True]:
                for profile in PROFILES:
                    tag=side+('-zero-' if zero else '-raw-')+profile;folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx');src=source/f'cv-18-{side}-original.docx'
                    if old:
                        with tempfile.TemporaryDirectory() as temp:
                            package=make_copy(src,Path(temp)/docx.name,profile,zero)
                            if digest(docx)!=package['copy_sha256']:raise ValueError('Saved anchor DOCX changed')
                    else:package=make_copy(src,docx,profile,zero)
                    prior=next(c for c in old['cases'] if c['id']==tag) if old else None;pdf,res=convert(docx,folder,prior)
                    actual,_=measure(pdf,folder,'lo',18,native_blank_pages=True);comparison=compare(ref['app'],actual,18,side=='right');line=reference_line(pdf,folder/'reference-line.png')
                    row={'id':tag,'side':side,'zero_gaps':zero,'profile':profile,'package':package,'conversion_status':'PASS','pdf_sha256':digest(pdf),'resources':res,'actual':actual,
                        'app_metric_comparison':comparison,'reference_line':line,'trial_status':'PASS' if comparison['status']=='PASS' and line['status']=='PASS' and profile!='delete-reference' else 'FAIL','product_acceptance':'NOT_ACCEPTED'}
                    report['cases'].append(row)
                    expected=None
                    if profile=='original':
                        expected=next(c for c in previous['cases'] if c['id']==side+'-zero-mask00') if zero else next(c for c in previous['controls'] if c['id']==side+'-raw-original')
                    elif profile=='delete-reference' and zero:expected=next(c for c in previous['cases'] if c['id']==side+'-zero-mask08')
                    if expected:
                        expected_hash=expected['package']['copy_sha256'] if 'package' in expected else expected['docx_sha256'];expected_pixels=expected['actual']['pixel_sha256'] if 'actual' in expected else expected['pixel_sha256']
                        row['baseline_input_match_p212']=package['copy_sha256']==expected_hash;row['baseline_pixels_match_p212']=actual['pixel_sha256']==expected_pixels
                        if not row['baseline_input_match_p212'] or not row['baseline_pixels_match_p212']:raise ValueError('P2-12 endpoint changed')
                    if profile=='delete-reference' and line['status']!='FAIL':raise ValueError('Reference-line negative control passed')
                    print(tag,actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages','line',line['status'],'layout',comparison['layout_status'],flush=True)
        report['execution_status']='PASS' if len(report['cases'])==32 and len(report['controls'])==2 else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts']);(out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-13 — reference anchor','',report['scope'],'','| Copy | Text | Complete | Pages | Line | Layout | Photo | Trial |','|---|---|---:|---:|---|---|---|---|']
    for c in report['cases']:
        v=c['app_metric_comparison'];lines.append(f"| {c['id']} | {c['actual']['content']['status']} | {c['actual']['content']['complete_entries']}/18 | {c['actual']['pages']} | {c['reference_line']['status']} | {v['layout_status']} | {v['photo']['status']} | {c['trial_status']} |")
    lines+=['','Execution: '+report['execution_status']]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines));return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
