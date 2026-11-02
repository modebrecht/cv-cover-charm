#!/usr/bin/env python3
"""P2-26: final bounded fresh-photo check on the unchanged P224/P225 candidate."""
import argparse
import json
import os
from pathlib import Path
import shutil

import dossier_entry_rows as entries
from dossier_body_flow import section_lines
from dossier_detached_main import page_edges
from dossier_photo_crops import validate_sources
from dossier_parity_content import docx_text
from dossier_production_spacing import content, digest, measure
from dossier_row_metrics import make_copy as footer_copy, entry_ink
from dossier_boundary_check import P224_SHA256

PROFILES = ['original-source','footer-distance-zero']
CROPS = {'cv-crop-left': {'mirrored':False,'zoom':1.6,'x':30,'y':70},
         'cv-crop-right': {'mirrored':True,'zoom':2.0,'x':65,'y':35}}


def validate_fresh(source, expected_sha=None):
    sha, rows = validate_sources(source, expected_sha)
    catalog = json.loads((source/'CATALOG.json').read_text())
    availability = catalog.get('rows',[])
    if len(availability)!=39 or [r['id'] for r in availability if r['status']=='ELIGIBLE']!=['modern'] or sum(r['status']=='BLOCKED' for r in availability)!=38:
        raise ValueError('Fresh 39-template availability guard evidence missing')
    for row in rows:
        expected = CROPS[row['id']]
        if any(row.get(k)!=v for k,v in expected.items()) or row.get('cropTrial')!='p2-26-candidate':
            raise ValueError('Fresh candidate crop intent differs or reuses P221 settings')
        intent = row.get('intent',{})
        if row.get('part')!='cv' or row.get('long') is not True or row.get('variedText',False) or intent.get('template')!='modern' or intent.get('sidebarSide')!=('right' if expected['mirrored'] else 'left'):
            raise ValueError('Fresh source template/side/content intent differs')
    return sha,rows


def make_copy(source,target,profile):
    if profile not in PROFILES or source.resolve()==target.resolve(): raise ValueError('Invalid profile or source overwrite')
    if profile=='original-source':
        shutil.copyfile(source,target)
        return {'entry_count':18,'source_sha256':digest(source),'copy_sha256':digest(target),'source_bytes_unchanged':True}
    return footer_copy(source,target,'footer-distance-zero')


def attach_ink(row,pdf):
    if row['actual']['content']['complete_entries']==18:
        row['entry_visible_ink']=entry_ink(pdf)
        row['entry_visible_ink_status']='MEASURED'
    else:
        row['entry_visible_ink']=[]
        row['entry_visible_ink_status']='NOT_MEASURED_INCOMPLETE_NATIVE_TEXT: content gate remains FAIL'


def main():
    root=Path(__file__).resolve().parents[1]
    parser=argparse.ArgumentParser(add_help=False);parser.add_argument('--out-dir',type=Path,required=True);args,_=parser.parse_known_args()
    out=args.out_dir.resolve();out.mkdir(parents=True,exist_ok=True)
    source=Path(os.environ.get('FRESH_SOURCE_DIR','artifacts/semantic-parity/source')).resolve()
    try:
        pinned=root/'docs/qa/p2-24-native-results.json'
        if digest(pinned)!=P224_SHA256:raise ValueError('Pinned P224 report changed')
        previous=json.loads(pinned.read_text())
        sha,rows=validate_fresh(source,os.environ.get('GITHUB_SHA'))
        inputs={'source_export_sha':sha,'catalog_sha256':digest(source/'CATALOG.json'),
                'scope':'Two fresh actual UI exports, ordinary 18-entry text; new crop settings on both sides. Not arbitrary crops or varied 17/19 coverage.','cases':[]}
        cases=[]
        for meta in rows:
            docx=source/(meta['id']+'.docx')
            if content([docx_text(docx)],18)['status']!='PASS':raise ValueError('Authored source content incomplete')
            folder=out/'app'/meta['id'];folder.mkdir(parents=True,exist_ok=True)
            app,_=measure(source/(meta['id']+'.pdf'),folder,'app',18)
            case={'id':meta['id'],'entry_count':18,'varied_text':False,'mirrored':meta['mirrored'],'app':app}
            cases.append((case,docx));inputs['cases'].append({'source_manifest':meta,'manifest_sha256':digest(source/(meta['id']+'.json')),'app':app})
        references=out/'FRESH_INPUTS.json';references.write_text(json.dumps(inputs,indent=2,ensure_ascii=False)+'\n')
    except (OSError,ValueError,KeyError) as exc:
        (out/'RESULTS.json').write_text(json.dumps({'execution_status':'BLOCKED','native_conversion_count':0,'error':str(exc)},indent=2)+'\n')
        (out/'SUMMARY.md').write_text('# P2-26 — BLOCKED\n\n'+str(exc)+'\n');return 1
    controls={}
    def check(row,source_case):
        pdf=out/row['id']/'copy.pdf'
        attach_ink(row,pdf)
        row['section_lines']=section_lines(pdf)
        row['section_line_status']='PASS' if all(v['status']=='PASS' for v in row['section_lines'].values()) else 'FAIL'
        row['page_edge_signatures']=page_edges(pdf)
        if row['profile']=='original-source':controls[source_case['id']]=row['page_edge_signatures']
        row['page_edge_status']='PASS' if row['page_edge_signatures']==controls[source_case['id']] else 'FAIL'
        if row['profile']=='footer-distance-zero':
            side='right' if source_case['mirrored'] else 'left'
            prior=next(c for c in previous['cases'] if c['source_id']=='cv-18-'+side and c['profile']=='footer-distance-zero')
            row['pinned_header_bottom_pixels_match_p224']=row['page_edge_signatures']==prior['page_edge_signatures']
            if not row['pinned_header_bottom_pixels_match_p224']:row['trial_status']='FAIL'
        if row['section_line_status']!='PASS' or row['page_edge_status']!='PASS':row['trial_status']='FAIL'
    return entries.main(profiles=PROFILES,builder=make_copy,case_check=check,
                        case_loader=lambda root:({'source_export_sha':sha},cases),reference_hash=digest(references),
                        title='P2-26 — final fresh crop verification on the P224 candidate',
                        scope='Two fresh ordinary 18-entry Next/App exports; original sources vs the unchanged guarded body-flow/empty-footer candidate. New left 1.6x x30/y70 and right 2.0x x65/y35. No product, arbitrary-photo, x39 or Word approval.',
                        extra_evidence=inputs)


if __name__=='__main__':raise SystemExit(main())
