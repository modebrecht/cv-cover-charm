#!/usr/bin/env python3
"""P2-16: partition one multi-page layout row while retaining every story/graphic.

Boundaries are explicit diagnostics on the frozen 18-entry sources, never a
dynamic product paginator. Main/sidebar text is preserved per story; mirrored
global XML reading order changes when later main chunks follow the sidebar.
"""
from collections import Counter
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import dossier_reference_anchor as anchor
from dossier_lo_context import W,WP,NS,canon,cells_of,critical,named_drawings,parse_part,read_root,reduce_context
from dossier_lo_minimal import facts,paragraph
from dossier_production_spacing import digest

P215_SHA256='e8c326e01c7d9772d24ffb4516101725ec40bb4bc97176bb6c292093e59b879e'
PROFILES=['original','reference-row','rows-5-14','rows-6-15']


def word_values(root):return [n.text for n in root.iter(W+'t')]


def drawing_payloads(root):
    drawings={}
    for d in root.iter(W+'drawing'):
        prop=d.find('.//'+WP+'docPr')
        if prop is None or prop.get('name') in drawings:raise ValueError('Missing or duplicate drawing identity')
        drawings[prop.get('name')]=canon(d)
    return drawings


def partition(row,main_index,profile):
    cells=row.findall('w:tc',NS);main=cells[main_index];nodes=[n for n in main if n.tag!=W+'tcPr']
    if profile=='reference-row':
        cuts=[i for i,n in enumerate(nodes) if ''.join(t.text or '' for t in n.iter(W+'t'))=='Referenzen']
        if len(cuts)!=1:raise ValueError('Expected one direct reference heading')
    else:
        boundaries=[6,15] if profile=='rows-5-14' else [7,16]
        cuts=[]
        for number in boundaries:
            found=[i for i,n in enumerate(nodes) if n.tag==W+'tbl' and f'P202Praxis{number:02}' in ''.join(t.text or '' for t in n.iter(W+'t'))]
            if len(found)!=1:raise ValueError('Expected direct entry boundary')
            cuts.extend(found)
    if cuts!=sorted(set(cuts)) or not cuts or cuts[0]==0:raise ValueError('Invalid row partition')
    positions=[0]+cuts+[len(nodes)];chunks=[nodes[a:b] for a,b in zip(positions,positions[1:])]
    properties=[deepcopy(c.find('w:tcPr',NS)) for c in cells]
    for node in nodes:main.remove(node)
    main.extend(chunks[0]);rows=[]
    for chunk in chunks[1:]:
        new=ET.Element(W+'tr',dict(row.attrib))
        if row.find('w:trPr',NS) is not None:new.append(deepcopy(row.find('w:trPr',NS)))
        for i,properties_node in enumerate(properties):
            cell=ET.SubElement(new,W+'tc');cell.append(deepcopy(properties_node))
            if i==main_index:cell.extend(chunk)
            else:cell.append(paragraph(line=1,keep=False))
        rows.append(new)
    return rows,chunks


def make_copy(source,target,profile,zero_gaps):
    if profile not in PROFILES:raise ValueError('Unknown layout-row profile')
    meta=reduce_context(source,target,'original',zero_gaps)
    if profile=='original':return meta
    with ZipFile(target) as z:infos=z.infolist();parts={n:z.read(n) for n in z.namelist()}
    root=parse_part(parts['word/document.xml']);before=deepcopy(root);cells,mi,si=cells_of(root)
    table=root.find('w:body/w:tbl',NS);row=table.find('w:tr',NS)
    if len(table.findall('w:tr',NS))!=1 or len(cells)!=3 or row.find('w:trPr',NS) is not None:raise ValueError('Unexpected original layout row')
    original_main=word_values(cells[mi]);original_sidebar=canon(cells[si]);initial=[canon(c.find('w:p',NS)) for c in cells]
    new_rows,chunks=partition(row,mi,profile)
    for new in new_rows:table.append(new)
    actual_rows=table.findall('w:tr',NS)
    main_text=[value for r in actual_rows for value in word_values(r.findall('w:tc',NS)[mi])]
    if main_text!=original_main or canon(cells[si])!=original_sidebar:raise ValueError('Main or sidebar story changed')
    original_blocks=[canon(n) for n in cells_of(before)[0][mi] if n.tag!=W+'tcPr']
    moved_blocks=[canon(n) for r in actual_rows for n in r.findall('w:tc',NS)[mi] if n.tag!=W+'tcPr']
    if original_blocks!=moved_blocks:raise ValueError('Main story blocks changed')
    if Counter(word_values(root))!=Counter(word_values(before)):raise ValueError('Visible Word text lost or duplicated')
    if critical(before,18)!=critical(root,18):raise ValueError('Critical table payload/order changed')
    if drawing_payloads(before)!=drawing_payloads(root):raise ValueError('Graphic or photo payload changed')
    if len(root.findall('.//w:sdt',NS))!=107:raise ValueError('Body controls changed')
    if initial!=[canon(c.find('w:p',NS)) for c in cells]:raise ValueError('Original cell leading paragraph changed')
    parts['word/document.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    with ZipFile(target,'w') as z:
        for info in infos:z.writestr(info,parts[info.filename])
    with ZipFile(source) as a,ZipFile(target) as b:
        if a.namelist()!=b.namelist():raise ValueError('Package membership changed')
        changed=[n for n in a.namelist() if a.read(n)!=b.read(n)]
        if set(changed)-{'word/document.xml'}:raise ValueError('Unrelated package payload changed')
        hashes=[{'path':n,'before_sha256':hashlib.sha256(a.read(n)).hexdigest(),'after_sha256':hashlib.sha256(b.read(n)).hexdigest()} for n in changed]
    meta.update(context='layout-row/'+profile,profile=profile,copy_sha256=digest(target),changed_parts=changed,part_hashes=hashes,document_after=facts(root),
        main_story_text_identical=True,sidebar_payload_identical=True,body_controls_retained=107,drawing_payloads_identical=8,
        global_word_text_order_identical=word_values(before)==word_values(root),global_drawing_order_identical=named_drawings(before)==named_drawings(root),
        layout_rows=len(actual_rows),chunk_text_characters=[sum(len(t.text or '') for n in chunk for t in n.iter(W+'t')) for chunk in chunks],
        main_story_blocks_identical=True,added_empty_paragraphs=2*len(new_rows),continuation_empty_line_twips=1,continuation_empty_keep_next=False,
        declared_losses=['Mirrored global XML text/drawing order changes when main continuation follows first-row sidebar'] if mi==0 else [])
    return meta


def main():
    path=Path(__file__).resolve().parents[1]/'docs/qa/p2-15-native-results.json'
    if digest(path)!=P215_SHA256:raise ValueError('Pinned P2-15 report changed')
    previous=json.loads(path.read_text())

    def baseline(row):
        if row['profile']!='original' or row['zero_gaps']:return
        expected=next(c for c in previous['cases'] if c['id']=='ubuntu-'+row['side'])
        row['baseline_input_match_p215']=row['package']['copy_sha256']==expected['source_sha256']
        row['baseline_pixels_match_p215']=row['actual']['pixel_sha256']==expected['actual']['pixel_sha256']
        if not row['baseline_input_match_p215'] or not row['baseline_pixels_match_p215']:raise ValueError('P2-15 original changed')

    return anchor.main(profiles=PROFILES,builder=make_copy,case_check=baseline,title='P2-16 — layout row partitions',
        scope='Frozen full Modern 18-entry sources, original/all-zero gaps, four layout-row structures. Preserve all text/graphics per story; mirrored XML reading order changes. Not a dynamic paginator or product/x39/Word acceptance.',
        extra_evidence={'p215_reference_sha256':digest(path),'boundaries':'Reference heading; before entries 06/15 or 07/16. Original leading paragraphs stay unchanged; only empty sidebar/spacer continuation cells get 1-twip uncoupled paragraphs; original main blocks stay exact.'})


if __name__=='__main__':raise SystemExit(main())
