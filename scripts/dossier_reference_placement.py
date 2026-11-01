#!/usr/bin/env python3
"""P2-14: separate inline layout extent from graphic data and absolute anchors.

Coordinates are calibrated only to the frozen P2-13 full 18-entry case. These
diagnostic copies are never dynamic export solutions or product acceptance.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import dossier_reference_anchor as anchor
from dossier_reference_anchor import A,REFERENCE,reference_drawing
from dossier_lo_context import W,WP,NS,canon,cells_of,critical,named_drawings,parse_part,read_root
from dossier_lo_minimal import facts
from dossier_production_spacing import digest

P213_SHA256='26345be9e0ab6b78812e04ba3e32c715a2de0ff7c71873ea706aa511b8f31048'
PROFILES=['original','delete-reference','inline','inline-min-width','inline-min-size','page-y','page-y-outside-cell','simple-position','simple-position-outside-cell']
CALIBRATION={'source':'P2-13 zero-inline reference image bbox, native PDF page 3',
    'y_mm':150.478,'left_x_mm':70.997,'right_x_mm':20.003,
    'scope':'Frozen 18-entry sources only. Absolute coordinates do not follow arbitrary content and are not a general repair.'}


def edit_placement(drawing,profile,side):
    if profile.startswith('inline-min-'):
        extent=drawing.find(WP+'inline/'+WP+'extent')
        if extent is None or extent.get('cx')!='4284000' or extent.get('cy')!='149696':raise ValueError('Unexpected inline extent')
        extent.set('cx','1')
        if profile=='inline-min-size':extent.set('cy','1')
        return
    node=drawing.find(WP+'anchor')
    if node is None:raise ValueError('Expected floating reference anchor')
    if profile.startswith('page-y'):
        position=node.find(WP+'positionV');position.set('relativeFrom','page');position.find(WP+'posOffset').text=str(round(CALIBRATION['y_mm']*36000))
    elif profile.startswith('simple-position'):
        node.set('simplePos','1');position=node.find(WP+'simplePos');position.set('x',str(round(CALIBRATION[side+'_x_mm']*36000)));position.set('y',str(round(CALIBRATION['y_mm']*36000)))
    else:raise ValueError('Unknown placement edit')
    if profile.endswith('-outside-cell'):node.set('layoutInCell','0')


def make_copy(source,target,profile,zero_gaps):
    if profile not in PROFILES:raise ValueError('Unknown reference-placement profile')
    if profile in ['original','delete-reference','inline']:return anchor.make_copy(source,target,profile,zero_gaps)
    base='inline' if profile.startswith('inline-min-') else 'original';meta=anchor.make_copy(source,target,base,zero_gaps)
    with ZipFile(target) as z:infos=z.infolist();parts={n:z.read(n) for n in z.namelist()}
    root=parse_part(parts['word/document.xml']);before=deepcopy(root);cells,main,sidebar=cells_of(root);side='left' if main==2 else 'right'
    expected=deepcopy(before);edit_placement(reference_drawing(expected),profile,side);edit_placement(reference_drawing(root),profile,side)
    if canon(root)!=canon(expected):raise ValueError('Unexpected placement change')
    if critical(before,18)!=critical(root,18) or [t.text for t in before.iter(W+'t')]!=[t.text for t in root.iter(W+'t')]:raise ValueError('Critical text/payload changed')
    if named_drawings(before)!=named_drawings(root) or len(root.findall('.//w:sdt',NS))!=107:raise ValueError('Drawing identity or body controls changed')
    if canon(reference_drawing(before).find('.//'+A+'graphic'))!=canon(reference_drawing(root).find('.//'+A+'graphic')):raise ValueError('Reference graphic data changed')
    ac,_,_=cells_of(before)
    if canon(ac[sidebar])!=canon(cells[sidebar]):raise ValueError('Sidebar changed')
    parts['word/document.xml']=ET.tostring(root,encoding='utf-8',xml_declaration=True)
    with ZipFile(target,'w') as z:
        for info in infos:z.writestr(info,parts[info.filename])
    with ZipFile(source) as a,ZipFile(target) as b:
        if a.namelist()!=b.namelist():raise ValueError('Package membership changed')
        changed=[n for n in a.namelist() if a.read(n)!=b.read(n)]
        if set(changed)-{'word/document.xml'}:raise ValueError('Unrelated package payload changed')
        hashes=[{'path':n,'before_sha256':hashlib.sha256(a.read(n)).hexdigest(),'after_sha256':hashlib.sha256(b.read(n)).hexdigest()} for n in changed]
    meta.update(profile=profile,context='reference-placement/'+profile,copy_sha256=digest(target),changed_parts=changed,part_hashes=hashes,document_after=facts(root),
        reference_graphic_retained=True,placement_calibration=CALIBRATION if profile.startswith(('page-y','simple-position')) else None)
    return meta


def main():
    path=Path(__file__).resolve().parents[1]/'docs/qa/p2-13-native-results.json'
    if digest(path)!=P213_SHA256:raise ValueError('Pinned P2-13 report changed')
    previous=json.loads(path.read_text())

    def baseline(row):
        if row['profile'] not in ['original','delete-reference','inline']:return
        expected=next(c for c in previous['cases'] if c['id']==row['id'])
        row['baseline_input_match_p213']=row['package']['copy_sha256']==expected['package']['copy_sha256']
        row['baseline_pixels_match_p213']=row['actual']['pixel_sha256']==expected['actual']['pixel_sha256']
        row['baseline_line_match_p213']=row['reference_line']==expected['reference_line']
        if not all(row[k] for k in ['baseline_input_match_p213','baseline_pixels_match_p213','baseline_line_match_p213']):raise ValueError('P2-13 baseline changed')

    return anchor.main(profiles=PROFILES,builder=make_copy,case_check=baseline,title='P2-14 — reference placement',
        scope='Full synthetic Modern 18-entry sources; fixed-coordinate/inline-extent diagnostic copies; original/all-zero gaps. Not dynamic export, product, x39 or Word acceptance.',
        extra_evidence={'p213_reference_sha256':digest(path),'placement_calibration':CALIBRATION})


if __name__=='__main__':raise SystemExit(main())
