#!/usr/bin/env python3
"""Observable content/photo gates for production Next and LibreOffice.

Markers are checked independently in source XML, App PDF and converted PDF.
Photo raster signatures catch lost, moved, reversed and incorrectly cropped
calibration images. SSIM remains observational, not a Word fidelity claim.
"""
from __future__ import annotations
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unicodedata
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz
import numpy as np
from PIL import Image
from dossier_visual_parity import save_normalized_rgb, analysis_arrays, structural_similarity
from dossier_converter_poc import run_conversion, check_builder_watermark

from dossier_parity_content import compact, marker_pages, docx_text, photo_signature, compare_photo


def inspect_pdf(path, out, base):
    texts, photos, images, ocr = [],[],[],[]
    with fitz.open(path) as doc:
        for i,page in enumerate(doc):
            pix=page.get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False)
            rgb=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            image=out/f'{base}-{i+1}.png';save_normalized_rgb(rgb,image);images.append(image)
            photos.append(photo_signature(rgb,(page.rect.width*25.4/72,page.rect.height*25.4/72)))
            text=page.get_text();method='PDF text layer'
            if len(compact(text)) < 20:
                if not shutil.which('tesseract'):raise RuntimeError('Raster PDF requires tesseract; cannot certify visible markers')
                target=out/f'{base}-{i+1}-ocr.png'
                page.get_pixmap(matrix=fitz.Matrix(2,2),alpha=False).save(target)
                r=subprocess.run(['tesseract',str(target),'stdout','--psm','11'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=20)
                if r.returncode:raise RuntimeError('OCR failed: '+r.stderr[-200:])
                text=r.stdout;method='OCR visible pixels (English, diacritics normalized)'
                target.with_suffix('.txt').write_text(text)
            texts.append(text);ocr.append(method)
        metadata=doc.metadata
    return {'page_count':len(images),'texts':texts,'text_methods':ocr,'photos':photos,'metadata':metadata},images


def write_summary(out,report):
    lines=['# P2-02 — production DOCX Next / App PDF / LibreOffice','',f"Source SHA: `{report['sha']}`",'', 'PASS requires source markers, App and DOCX visible/text markers, matching page count, long-CV continuation, and matching photo geometry/pattern where applicable.','Unsupported templates stay BLOCKED; SSIM is observational.','', '| Case | Status | App / LO pages | Missing markers | Photo | RGB SSIM |','|---|---|---:|---:|---|---:|']
    for row in report['cases']:
        lines.append(f"| {row['id']} | {row['status']} | {row.get('app_pages','-')} / {row.get('lo_pages','-')} | {len(row.get('missing',[]))} | {row.get('photo',{}).get('status','n/a')} | {row.get('rgb_ssim','n/a')} |")
    counts=Counter(r['status'] for r in report['cases']);lines += ['',f'Cases: {dict(counts)}','',f"Catalog: {report['catalog'].get('eligible',0)}/39 ELIGIBLE; {report['catalog'].get('blocked',0)}/39 BLOCKED. Availability is not 39-template export acceptance."]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')


def main():
    p=argparse.ArgumentParser();p.add_argument('--source-dir',type=Path,required=True);p.add_argument('--out-dir',type=Path,required=True);p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true',help='Use existing converted PDFs without changing timings')
    a=p.parse_args();a.source_dir=a.source_dir.resolve();a.out_dir=a.out_dir.resolve();a.out_dir.mkdir(parents=True,exist_ok=True)
    rendered=a.out_dir/'rendered';rendered.mkdir(exist_ok=True)
    catalog=json.loads((a.source_dir/'CATALOG.json').read_text())
    report={'sha':catalog['sha'],'exporter':'production DOCX Next; guarded UI downloads','catalog':{'eligible':sum(r['status']=='ELIGIBLE' for r in catalog['rows']),'blocked':sum(r['status']=='BLOCKED' for r in catalog['rows']),'scope':catalog['scope']},'cases':[], 'thresholds':{'photo_geometry_mm':2.0,'photo_pattern_min':.90},'limitations':['Photo thresholds are explicit trial gates; no Microsoft Word fidelity claim.','Gray/raster text not covered by marker extraction still needs visual inspection.']}
    for path in sorted(a.source_dir.glob('*.json')):
        if path.name=='CATALOG.json':continue
        source=json.loads(path.read_text()); row={'id':source['id'],'part':source['part'],'status':'OPEN','source_status':source['status']};report['cases'].append(row)
        try:
            if source['sha']!=report['sha']:raise ValueError('Mixed source SHAs')
            if source['status']!='EXPORTED':row.update(status='BLOCKED',reason=source.get('visibleError') or source.get('reason'));continue
            for f in source['files']:
                if hashlib.sha256((a.source_dir/f['filename']).read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Source hash mismatch: '+f['filename'])
            docx=a.source_dir/f"{source['id']}.docx";app=a.source_dir/f"{source['id']}.pdf";lo=a.out_dir/'libreoffice'/f"{source['id']}.pdf";lo.parent.mkdir(exist_ok=True)
            if not a.audit_only:
                profile=lo.parent/f"profile-{source['id']}"
                row['resources']=run_conversion([a.libreoffice,'--headless','--nologo','--nodefault','--nofirststartwizard',f'-env:UserInstallation={profile.as_uri()}','--convert-to','pdf','--outdir',str(lo.parent),str(docx)],lo,lo.with_suffix('.log'),90)
                shutil.rmtree(profile,ignore_errors=True)
                if row['resources'].get('status')=='BLOCKED':row.update(status='BLOCKED',reason=row['resources']['error']);continue
            expected=marker_pages([docx_text(docx)],source['markers'])
            app_f,app_i=inspect_pdf(app,rendered,source['id']+'-app');lo_f,lo_i=inspect_pdf(lo,rendered,source['id']+'-lo')
            app_m=marker_pages(app_f['texts'],source['markers']);lo_m=marker_pages(lo_f['texts'],source['markers'])
            row['missing']=[{'marker':m,'source_xml':bool(expected[m]),'app':app_m[m],'lo':lo_m[m]} for m in source['markers'] if not expected[m] or not app_m[m] or not lo_m[m]]
            row.update(app_pages=app_f['page_count'],lo_pages=lo_f['page_count'],app_text_methods=app_f['text_methods'],lo_text_methods=lo_f['text_methods'],app_marker_pages=app_m,lo_marker_pages=lo_m,app_photo=app_f['photos'],lo_photo=lo_f['photos'],producer=lo_f['metadata'].get('producer'))
            unique_markers=all(len(app_m[m])==len(lo_m[m])==1 for m in source['markers'] if m.startswith('P202'))
            continuation=not source['long'] or app_f['page_count']>=2
            pages_match=app_f['page_count']==lo_f['page_count']
            if source['photo']:
                row['photo']=compare_photo(app_f['photos'][0],lo_f['photos'][0])
                # A mirrored CV means sidebar/photo on the other page side.
                expected_side='right' if source['mirrored'] else 'left'
                side=lambda photo:'right' if photo.get('bbox_mm',[0])[0]>105 else 'left'
                row['photo']['expected_side']=expected_side
                if any(side(photo)!=expected_side for photo in [app_f['photos'][0],lo_f['photos'][0]]):row['photo'].update(status='FAIL',side_mismatch=True)
                if any(p.get('visible') for p in app_f['photos'][1:]+lo_f['photos'][1:]):row['photo'].update(status='FAIL',repeated_on_continuation=True)
            watermark=check_builder_watermark(lo);row['watermark']=watermark['detected']
            scores=[]
            if pages_match:
                for l,r in zip(app_i,lo_i):
                    la,_=analysis_arrays(l);ra,_=analysis_arrays(r);scores.append(float(structural_similarity(la,ra,data_range=255,channel_axis=2)))
                row['rgb_ssim']=round(sum(scores)/len(scores),4)
            row['checks']={'pages_match':pages_match,'long_continuation':continuation,'unique_synthetic_markers':unique_markers,'no_watermark':not row['watermark']}
            ok=not row['missing'] and all(row['checks'].values()) and row.get('photo',{}).get('status','PASS')=='PASS'
            row['status']='PASS' if ok else 'FAIL'
            # Compact page pairs for visual review; retain full rasters too.
            sheet=Image.new('RGB',(680,481*max(len(app_i),len(lo_i))), '#ddd')
            for col,paths in enumerate([app_i,lo_i]):
                for index,image in enumerate(paths):
                    with Image.open(image) as im:sheet.paste(im.resize((340,481)),(col*340,index*481))
            sheet.save(a.out_dir/f"{source['id']}-comparison.jpg",quality=88)
        except Exception as exc:row.update(status='BLOCKED',reason=str(exc))
    if len(report['cases'])!=8:report['error']='Expected eight case manifests; incomplete source set'
    write_summary(a.out_dir,report)
    return 1 if report.get('error') or any(r['status']!='PASS' for r in report['cases']) else 0

if __name__=='__main__':raise SystemExit(main())
