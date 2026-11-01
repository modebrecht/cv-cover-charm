#!/usr/bin/env python3
"""P2-10: isolate active story/drawing context and unused package participation.

Diagnostic reductions only. Critical 18-entry/reference payloads stay intact.
The matrix crosses context reductions with original/all-zero paragraph gaps.
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
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from PIL import Image

from dossier_converter_poc import run_conversion
from dossier_lo_boundaries import change_gaps,load_inputs
from dossier_lo_minimal import bare_inner,compact_package,facts,fill_cell,inspect as inspect_control,paragraph,remove_drawings
from dossier_lo_spacing import read_root
from dossier_production_spacing import W,NS,critical,compare,content,digest,measure

WP='{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
CONTEXTS=['original','no-background','no-photo','sidebar-min','no-header-footer','reduced-context','reduced-context-compact']
OUTER_CONTEXTS=['original','outer-controls','main-heading-paint','outer-controls-and-main-paint']
MAIN_PAINT={'cv.section.custom:familie.heading.flow-paint','cv.section.schule.heading.flow-paint',
    'cv.section.erfahrung.heading.flow-paint','cv.section.referenzen.heading.flow-paint'}
GAPS=list(range(2,18))+['school-gap','reference-gap']
P209_SHA256='6e1bb797be6896bd3e631eea86d11e8406fcfde016425605abca49148e50e6f4'


def canon(node):return ET.canonicalize(ET.tostring(node,encoding='unicode'))


def parse_part(raw):
    for _,pair in ET.iterparse(io.BytesIO(raw),events=['start-ns']):ET.register_namespace(*pair)
    return ET.fromstring(raw)


def named_drawings(root):
    return [p.get('name') for p in root.iter(WP+'docPr')]


def remove_named(root,predicate):
    removed=[]
    for parent in root.iter():
        for node in list(parent):
            if node.tag!=W+'drawing':continue
            prop=node.find('.//'+WP+'docPr');name=prop.get('name') if prop is not None else ''
            if predicate(name):parent.remove(node);removed.append(name)
    return removed


def cells_of(root):
    cells=root.find('w:body/w:tbl/w:tr',NS).findall('w:tc',NS)
    mains=[i for i,c in enumerate(cells) if 'P202Praxis06' in ''.join(t.text or '' for t in c.iter(W+'t'))]
    if len(cells)!=3 or len(mains)!=1 or mains[0] not in [0,2]:raise ValueError('Unexpected main/sidebar cells')
    return cells,mains[0],2-mains[0]


def protected_entry(node):
    return node.tag==W+'tbl' and not node.findall('.//w:tbl',NS) and any(m in ''.join(t.text or '' for t in node.iter(W+'t')) for m in ['P202Praxis','P202Endreferenz'])


def unwrap_outer_controls(parent):
    """Retain every SDT inside the 19 protected innermost payload tables."""
    if protected_entry(parent):return
    for child in list(parent):
        if child.tag==W+'sdt':
            contents=child.find('w:sdtContent',NS)
            if contents is None:raise ValueError('SDT without contents')
            unwrap_outer_controls(contents);index=list(parent).index(child);parent.remove(child)
            for i,node in enumerate(list(contents)):parent.insert(index+i,node)
        else:unwrap_outer_controls(child)


def reduce_context(source,target,context,zero_gaps):
    if context not in set(CONTEXTS)|set(OUTER_CONTEXTS):raise ValueError('Unknown context')
    if source.resolve()==target.resolve():raise ValueError('Cannot overwrite source fixture')
    if zero_gaps:spacing=change_gaps(source,target,GAPS)
    else:shutil.copyfile(source,target);spacing={'attribute_edits':[]}
    with ZipFile(target) as pkg:
        infos=pkg.infolist();parts={n:pkg.read(n) for n in pkg.namelist()}
    root=parse_part(parts['word/document.xml']);before=deepcopy(root)
    cells,main_index,sidebar_index=cells_of(root);expected_main=deepcopy(cells[main_index])
    before_critical=critical(root,18);removed_drawings=[];removed_refs=[];header_parts=[]
    sidebar_removed='';minimal=context.startswith('reduced-context')
    first_properties=[canon(c.find('w:p/w:pPr',NS)) for c in cells]
    if context in ['outer-controls','outer-controls-and-main-paint']:
        unwrap_outer_controls(root.find('w:body',NS));unwrap_outer_controls(expected_main)
    if context in ['main-heading-paint','outer-controls-and-main-paint']:
        removed_drawings=remove_named(cells[main_index],lambda n:n in MAIN_PAINT)
        remove_named(expected_main,lambda n:n in MAIN_PAINT)
        if set(removed_drawings)!=MAIN_PAINT or len(removed_drawings)!=4:raise ValueError('Expected four main heading drawings')
    if context in OUTER_CONTEXTS and [n.text for n in before.iter(W+'t')]!=[n.text for n in root.iter(W+'t')]:
        raise ValueError('Outer-factor probe changed visible text')
    if context=='no-photo':
        removed_drawings=remove_named(root,lambda n:n=='cv.person.photo')
        remove_named(expected_main,lambda n:n=='cv.person.photo')
        if removed_drawings!=['cv.person.photo']:raise ValueError('Expected exactly one photo anchor')
    if context=='no-header-footer' or minimal:
        for section in root.findall('.//w:sectPr',NS):
            for node in list(section):
                if node.tag in [W+'headerReference',W+'footerReference']:
                    removed_refs.append({'kind':node.tag.split('}')[-1],'attributes':dict(node.attrib)});section.remove(node)
        if len(removed_refs)!=4:raise ValueError('Expected four active header/footer references')
    if minimal:
        removed_drawings=named_drawings(root);unwrap_outer_controls(root.find('w:body',NS));remove_drawings(root.find('w:body',NS))
        unwrap_outer_controls(expected_main);remove_drawings(expected_main)
    if context=='sidebar-min' or minimal:
        sidebar=cells[sidebar_index];sidebar_removed=''.join(t.text or '' for t in sidebar.iter(W+'t'))
        first=deepcopy(sidebar.find('w:p',NS));width=int(sidebar.find('w:tcPr/w:tcW',NS).get(W+'w'))
        if not minimal:removed_drawings=[n for n in named_drawings(sidebar) if n not in named_drawings(first)]
        fill_cell(sidebar,[first,bare_inner('P204SIDEBAR',width),paragraph()])
    if before_critical!=critical(root,18):raise ValueError('Critical table payload/order changed')
    if canon(expected_main)!=canon(cells[main_index]):raise ValueError('Unexpected main-story change')
    if first_properties!=[canon(c.find('w:p/w:pPr',NS)) for c in cells]:raise ValueError('Cell-start paragraph properties changed')
    # Serialize document before parsing any header, keeping its own namespace map.
    if context not in ['original','no-background']:
        parts['word/document.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    if context=='no-background':
        for name,raw in list(parts.items()):
            if not name.startswith('word/') or not name.endswith('.xml') or 'header' not in name:continue
            header=parse_part(raw);texts=''.join(t.text or '' for t in header.iter(W+'t'))
            removed=remove_named(header,lambda n:n.startswith('cv.page-paint.'))
            if removed:
                if texts!=''.join(t.text or '' for t in header.iter(W+'t')):raise ValueError('Header text changed')
                header_parts.append(name);removed_drawings+=removed
                parts[name]=ET.tostring(header,encoding='utf-8',xml_declaration=True)
        if len(header_parts)!=2 or len(removed_drawings)!=2:raise ValueError('Expected first/continuation background drawings')
    if context!='original':
        with ZipFile(target,'w') as pkg:
            for info in infos:pkg.writestr(info,parts[info.filename])
    compaction=compact_package(target) if context.endswith('-compact') else None
    allowed={'word/document.xml'}|set(header_parts)
    if compaction:allowed|={'[Content_Types].xml','word/_rels/document.xml.rels'}
    with ZipFile(source) as a,ZipFile(target) as b:
        removed=sorted(set(a.namelist())-set(b.namelist()));added=set(b.namelist())-set(a.namelist())
        if added or removed!=(compaction['removed_parts'] if compaction else []):raise ValueError('Unexpected package membership changes')
        changed=[n for n in b.namelist() if a.read(n)!=b.read(n)]
        if not set(changed)<=allowed:raise ValueError('Unrelated package parts changed')
        hashes=[{'path':n,'before_sha256':hashlib.sha256(a.read(n)).hexdigest(),
            'after_sha256':hashlib.sha256(b.read(n)).hexdigest() if n in b.namelist() else None} for n in changed+removed]
    losses={'original':[],'no-background':['page-background drawings'],
        'outer-controls':['outer content-control metadata; visible text/drawings retained'],
        'main-heading-paint':['four main-section heading drawings'],
        'outer-controls-and-main-paint':['outer content-control metadata','four main-section heading drawings'],
        'no-photo':['calibration photo'],'sidebar-min':['sidebar text/tables/line artwork'],
        'no-header-footer':['all active header/footer contents including page backgrounds'],
        'reduced-context':['all active header/footer contents','all body drawings','sidebar story','outer SDT wrappers; critical inner SDTs retained'],
        'reduced-context-compact':['all active header/footer contents','all body drawings','sidebar story','outer SDT wrappers; critical inner SDTs retained','unreachable package parts']}
    return {'source_sha256':digest(source),'copy_sha256':digest(target),'context':context,'zero_gaps':zero_gaps,
        'spacing_attribute_edits':spacing['attribute_edits'],'critical_tables_identical':19,
        'main_cell_index':main_index,'sidebar_cell_index':sidebar_index,'main_story_expected_only':True,
        'cell_start_properties_identical':True,'declared_losses':losses[context],
        'removed_drawing_names':removed_drawings,'removed_section_references':removed_refs,
        'removed_sidebar_text_characters':len(sidebar_removed),'sidebar_text_sha256':hashlib.sha256(sidebar_removed.encode()).hexdigest() if sidebar_removed else None,
        'changed_parts':changed,'removed_parts':removed,'part_hashes':hashes,'compaction':compaction,
        'document_before':facts(before),'document_after':facts(root)}


def main():
    root=Path(__file__).resolve().parents[1]
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out-dir',type=Path,required=True)
    p.add_argument('--libreoffice',default='libreoffice');p.add_argument('--audit-only',action='store_true');a=p.parse_args()
    source=root/'tests/fixtures/lo-import-p2-08';reference_path=root/'docs/qa/p2-08-production-results.json'
    _,reference=load_inputs(source,reference_path);p209_path=root/'docs/qa/p2-09-closing-results.json'
    if digest(p209_path)!=P209_SHA256:raise ValueError('Pinned P2-09 reference hash mismatch')
    p209=json.loads(p209_path.read_text());out=a.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    old=json.loads((out/'RESULTS.json').read_text()) if a.audit_only else None
    report={'implementation_sha':old['implementation_sha'] if old else os.environ.get('GITHUB_SHA'),
        'source_export_sha':reference['sha'],'app_reference_sha256':digest(reference_path),'p209_reference_sha256':digest(p209_path),
        'scope':'Diagnostic context removals, not alternate exports or Word/x39 product acceptance. App reference reused from P2-08.',
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
        p206=root/'tests/fixtures/lo-import-p2-06';p207=root/'tests/fixtures/lo-import-p2-07'
        m206=json.loads((p206/'MANIFEST.json').read_text());m207=json.loads((p207/'MANIFEST.json').read_text())
        for tag,src,expected in [('small-original',p206/'long-gap-original.docx',m206['fixtures'][0]),('small-minimum',p207/m207['filename'],m207)]:
            if digest(src)!=expected['sha256']:raise ValueError('Small control source mismatch')
            folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
            if old:
                if digest(docx)!=digest(src):raise ValueError('Saved small source mismatch')
            else:shutil.copyfile(src,docx)
            prior=next(c for c in old['controls'] if c['id']==tag) if old else None
            pdf,res=convert(docx,folder,prior);actual,_=inspect_control(pdf,folder)
            row={'id':tag,'docx_sha256':digest(docx),'pdf_sha256':digest(pdf),'resources':res,'pixel_sha256':actual['pixel_sha256'],
                'pixels_match_persisted':actual['pixel_sha256']==expected['observed']['pixel_sha256']};report['controls'].append(row)
            if not row['pixels_match_persisted']:raise ValueError('Small control pixels changed')
        for side in ['left','right']:
            ref=next(c for c in reference['cases'] if c['id']==f'cv-18-{side}')
            for zero in [False,True]:
                for context in CONTEXTS:
                    tag=f'{side}-'+('zero-' if zero else 'raw-')+context;folder=out/tag;folder.mkdir(exist_ok=True);docx=folder/(tag+'.docx')
                    src=source/f'cv-18-{side}-original.docx'
                    if old:
                        with tempfile.TemporaryDirectory() as tmp:
                            package=reduce_context(src,Path(tmp)/docx.name,context,zero)
                            if digest(docx)!=package['copy_sha256']:raise ValueError('Saved diagnostic DOCX mismatch')
                    else:package=reduce_context(src,docx,context,zero)
                    if content([''.join(t.text or '' for t in read_root(docx).iter(W+'t'))],18)['status']!='PASS':raise ValueError('Critical authored data incomplete')
                    prior=next(c for c in old['cases'] if c['id']==tag) if old else None
                    pdf,res=convert(docx,folder,prior);actual,images=measure(pdf,folder,'lo',18,native_blank_pages=True);comparison=compare(ref['app'],actual,18,side=='right')
                    row={'id':tag,'side':side,'context':context,'zero_gaps':zero,'package':package,'conversion_status':'PASS',
                        'pdf_sha256':digest(pdf),'resources':res,'actual':actual,'app_metric_comparison':comparison,
                        'product_status':'FAIL' if context!='original' else comparison['status']};report['cases'].append(row)
                    if context=='original':
                        previous=next(c for c in p209['cases'] if c['id']==side+('-all-gaps-zero' if zero else '-original'))
                        row['baseline_input_match_p209']=package['copy_sha256']==previous['package']['copy_sha256']
                        row['baseline_pixels_match_p209']=actual['pixel_sha256']==previous['actual']['pixel_sha256']
                        if not row['baseline_input_match_p209'] or not row['baseline_pixels_match_p209']:raise ValueError('Full P2-09 baseline changed')
                    sheet=Image.new('RGB',(340,481*len(images)),'#ddd')
                    for i,image in enumerate(images):
                        with Image.open(image) as im:sheet.paste(im.resize((340,481)),(0,481*i))
                    sheet.save(folder/'pages.jpg',quality=90)
                    print(tag,actual['content']['status'],actual['content']['complete_entries'],'/18',actual['pages'],'pages',flush=True)
        report['execution_status']='PASS' if len(report['cases'])==28 and len(report['controls'])==2 else 'FAIL'
    except (OSError,ValueError,RuntimeError,KeyError,subprocess.TimeoutExpired) as exc:
        report['execution_status']='FAIL';report['error']=str(exc)
    report['native_conversion_count']=len(report['conversion_attempts'])
    (out/'RESULTS.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    lines=['# P2-10 — flow context and package participation','',report['scope'],'',
        '| Copy | Conversion | Critical content | Complete entries | Pages | Product |','|---|---|---|---:|---:|---|']
    for c in report['cases']:lines.append(f"| {c['id']} | {c['conversion_status']} | {c['actual']['content']['status']} | {c['actual']['content']['complete_entries']}/18 | {c['actual']['pages']} | {c['product_status']} |")
    lines+=['','Execution: '+report['execution_status']]
    if report.get('error'):lines+=['',report['error']]
    (out/'SUMMARY.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
    return 0 if report['execution_status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
