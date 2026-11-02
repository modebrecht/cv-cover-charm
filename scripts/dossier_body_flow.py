#!/usr/bin/env python3
"""P2-23: direct main-body blocks, leaf-row guards and paint-layer counterprobe."""
import argparse
from collections import Counter
from copy import deepcopy
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile
import fitz
from PIL import Image

import dossier_entry_rows as entries
from dossier_detached_main import make_copy as detached_copy, page_edges
from dossier_layout_rows import word_values, drawing_payloads
from dossier_lo_context import W, WP, NS, MAIN_PAINT, canon, parse_part
from dossier_production_spacing import critical, digest, markers
from dossier_reference_anchor import line_pixels

P222_SHA256 = '2ac502e50ad0109cf4ec54e3cedddf039e2f20311dd0ef9d372c227f816a066a'
PROFILES = ['frame-control', 'body-flow', 'body-flow-nosplit', 'body-flow-nosplit-front']
LABELS = ['FAMILIE', 'SCHULBILDUNG', 'PRAKTIKA & SCHNUPPERTAGE', 'REFERENZEN']


def leaves(root, count=18):
    result = [t for t in root.findall('.//w:tbl', NS) if not t.findall('.//w:tbl', NS)
              and any(m in ''.join(word_values(t)) for m in markers(count))]
    if len(result) != count + 1:
        raise ValueError('Expected one critical leaf table per entry plus reference')
    return result


def neutral_tables(root, count=18):
    result = []
    for table in leaves(root, count):
        table = deepcopy(table)
        for row in table.findall('w:tr', NS):
            props = row.find('w:trPr', NS)
            if props is not None:
                for node in props.findall('w:cantSplit', NS):
                    props.remove(node)
                if not len(props) and not props.attrib:
                    row.remove(props)
        result.append(canon(table))
    return result


def make_copy(source, target, profile, *, count=18):
    if profile not in PROFILES:
        raise ValueError('Unknown body-flow profile')
    meta = detached_copy(source, target, 'detached-frame', count=count)
    if profile == 'frame-control':
        meta.update(profile=profile)
        return meta
    with ZipFile(target) as z:
        infos = z.infolist()
        parts = {n: z.read(n) for n in z.namelist()}
    root = parse_part(parts['word/document.xml'])
    before = deepcopy(root)
    body = root.find('w:body', NS)
    tables = [t for t in body.findall('w:tbl', NS) if (p := t.find('w:tblPr/w:tblCaption', NS)) is not None and p.get(W+'val') == 'ccc.detached-main']
    if len(tables) != 1:
        raise ValueError('Expected one detached outer main table')
    table = tables[0]
    blocks = [n for row in table.findall('w:tr', NS) for n in row.find('w:tc', NS) if n.tag != W+'tcPr']
    original_blocks = [canon(n) for n in blocks]
    index = list(body).index(table)
    body.remove(table)
    for i, node in enumerate(blocks):
        body.insert(index+i, node)
    if [canon(n) for n in list(body)[index:index+len(blocks)]] != original_blocks:
        raise ValueError('Direct body transfer changed original blocks')
    guard_edits = 0
    existing_guards = sum(row.find('w:trPr/w:cantSplit', NS) is not None for leaf in leaves(root, count) for row in leaf.findall('w:tr', NS))
    if profile != 'body-flow':
        for leaf in leaves(root, count):
            for row in leaf.findall('w:tr', NS):
                props = row.find('w:trPr', NS)
                if props is None:
                    props = ET.Element(W+'trPr')
                    row.insert(0, props)
                existing = props.find('w:cantSplit', NS)
                if existing is not None:
                    if existing.get(W+'val', '1') not in ['1', 'true', 'on']:
                        raise ValueError('Unexpected explicitly disabled source guard')
                    continue
                ET.SubElement(props, W+'cantSplit')
                guard_edits += 1
        if guard_edits + existing_guards != count + 1:
            raise ValueError('Expected all leaf rows guarded after preserving source guards')
    paint_edits = []
    if profile == 'body-flow-nosplit-front':
        for d in root.iter(W+'drawing'):
            prop = d.find('.//'+WP+'docPr')
            if prop is not None and prop.get('name') in MAIN_PAINT:
                anchor = d.find(WP+'anchor')
                if anchor is None or anchor.get('behindDoc') != '1':
                    raise ValueError('Unexpected main-paint anchor')
                anchor.set('behindDoc','0')
                paint_edits.append(prop.get('name'))
        if set(paint_edits) != MAIN_PAINT:
            raise ValueError('Expected exactly four main-section paint edits')
    if neutral_tables(before, count) != neutral_tables(root, count):
        raise ValueError('Critical content changed beyond declared leaf split guards')
    if Counter(word_values(root)) != Counter(word_values(before)) or len(root.findall('.//w:sdt', NS)) != len(before.findall('.//w:sdt', NS)):
        raise ValueError('Text or content-control payload changed')
    a,b = drawing_payloads(before),drawing_payloads(root)
    if set(a) != set(b) or any(a[n] != b[n] for n in a if n not in paint_edits):
        raise ValueError('Undeclared drawing change')
    for da,db in zip(before.iter(W+'drawing'),root.iter(W+'drawing')):
        p=db.find('.//'+WP+'docPr')
        if p.get('name') in paint_edits:
            expected=deepcopy(da);expected.find(WP+'anchor').set('behindDoc','0')
            if canon(expected)!=canon(db):raise ValueError('Paint edit exceeded behindDoc flag')
    if canon(before.find('w:body/w:sectPr',NS)) != canon(root.find('w:body/w:sectPr',NS)):
        raise ValueError('Body frame changed')
    parts['word/document.xml'] = ET.tostring(root, encoding='utf-8', xml_declaration=True)
    with ZipFile(target,'w') as z:
        for info in infos:z.writestr(info,parts[info.filename])
    with ZipFile(source) as a,ZipFile(target) as b:
        if a.namelist()!=b.namelist() or any(a.read(n)!=b.read(n) for n in a.namelist() if n!='word/document.xml'):
            raise ValueError('Unrelated ZIP part changed')
    same = sum(x == y for x,y in zip(critical(before,count),critical(root,count)))
    meta.update(profile=profile,copy_sha256=digest(target),main_outer_table_removed=True,
                main_table_columns=0,main_table_rows=0,layout_rows=0,continuation_rows_cant_split=False,
                reference_heading_body_grouped=False,source_reference_keep_next_preserved=True,
                main_story_blocks_identical=not guard_edits,main_story_text_identical=True,
                critical_tables_identical=same,critical_tables_except_cant_split_identical=count+1,
                added_leaf_row_cant_split=guard_edits,existing_leaf_row_cant_split=existing_guards,
                main_paint_foreground_edits=paint_edits,
                drawing_payloads_identical=8-len(paint_edits)-(1 if meta['photo_control_profile']=='margin-equivalent' else 0),
                declared_losses=meta['declared_losses']+['Outer main table removed; original leaf blocks now direct body flow']+
                ([f'Leaf table formatting changed only by {guard_edits} missing cantSplit additions; existing guards retained'] if guard_edits else [])+
                (['Four main-section drawing behindDoc flags changed to foreground'] if paint_edits else []))
    return meta


def section_lines(pdf):
    found={label:[] for label in LABELS};results={};mm=72/25.4
    with fitz.open(pdf) as doc:
        for i,page in enumerate(doc):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines',[]):
                    label=' '.join(''.join(s['text'] for s in line['spans']).upper().split())
                    if label in found:found[label].append((i,line['bbox']))
        for label,occurrences in found.items():
            if len(occurrences)!=1:
                results[label]={'status':'FAIL','reason':'Heading missing or nonunique','heading_count':len(occurrences)}
                continue
            page,bbox=occurrences[0]
            rect=fitz.Rect(bbox[2]+5*mm,bbox[1]-.5*mm,bbox[2]+20*mm,bbox[3]+.5*mm)
            if not doc[page].rect.contains(rect):
                results[label]={'status':'FAIL','reason':'Probe outside page'}
                continue
            pix=doc[page].get_pixmap(matrix=fitz.Matrix(2,2),clip=rect,alpha=False)
            result=line_pixels(Image.frombytes('RGB',(pix.width,pix.height),pix.samples))
            result.update(page=page+1,heading_count=1,crop_mm=[round(v/mm,3) for v in rect])
            results[label]=result
    return results


def main():
    root=Path(__file__).resolve().parents[1];path=root/'docs/qa/p2-22-native-results.json'
    if digest(path)!=P222_SHA256:raise ValueError('Pinned P222 report changed')
    previous=json.loads(path.read_text());parser=argparse.ArgumentParser(add_help=False)
    parser.add_argument('--out-dir',type=Path,required=True);args,_=parser.parse_known_args()
    edges={};body_metrics={}
    def check(row,source):
        pdf=args.out_dir.resolve()/row['id']/'copy.pdf';current=page_edges(pdf)
        row['page_edge_signatures']=current
        if row['profile']=='frame-control':
            expected=next(c for c in previous['cases'] if c['source_id']==source['id'] and c['profile']=='detached-frame')
            row['baseline_input_match_p222']=row['package']['copy_sha256']==expected['package']['copy_sha256']
            row['baseline_pixels_match_p222']=row['actual']['pixel_sha256']==expected['actual']['pixel_sha256']
            if not row['baseline_input_match_p222'] or not row['baseline_pixels_match_p222']:raise ValueError('P222 frame control changed')
            edges[source['id']]=current
        prior=edges[source['id']]
        row['page_edge_status']='PASS' if all(e==prior[min(i,len(prior)-1)] for i,e in enumerate(current)) else 'FAIL'
        row['section_lines']=section_lines(pdf)
        row['section_line_status']='PASS' if all(q['status']=='PASS' for q in row['section_lines'].values()) else 'FAIL'
        if row['page_edge_status']!='PASS' or row['section_line_status']!='PASS':row['trial_status']='FAIL'
        if row['profile']=='body-flow-nosplit':body_metrics[source['id']]=row['actual']
        if row['profile']=='body-flow-nosplit-front':
            old=body_metrics[source['id']]
            row['foreground_main_metrics_identical_to_nosplit']=all(row['actual'][k]==old[k] for k in ['pages','content','title_positions','photos'])
    return entries.main(profiles=PROFILES,builder=make_copy,case_check=check,
                        title='P2-23 — direct body flow and leaf-row split guards',
                        scope='Four frozen actual P217 18-entry sources; P222 frame control vs direct main-body flow, optional completion of missing leaf-row cantSplit guards and four main-paint foreground flags. Same rule for both text lengths. Frozen App metrics; no product/Word/x39 acceptance.',
                        extra_evidence={'p222_report_sha256':P222_SHA256,'all_four_main_heading_lines_gate':'15 mm pixel strip 5 mm after actual text bbox; unchanged 0.85 dark-run threshold, calibrated on retained positive and actual faint-line negative native PDFs'})


if __name__=='__main__':raise SystemExit(main())
