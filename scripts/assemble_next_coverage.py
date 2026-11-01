#!/usr/bin/env python3
"""Assemble one same-SHA Next exported/blocked row per active template."""
import argparse,json
from pathlib import Path

def assemble(root,docx_dir,sha,expected_batches=10,expected_templates=39):
    parts=sorted(root.glob('**/docx/COVERAGE.part-*.json'))
    if len(parts)!=expected_batches:raise ValueError(f'Expected {expected_batches} coverage batches, found {len(parts)}')
    rows=[]
    for part in parts:
        if (part.parent/'SOURCE_SHA.txt').read_text().strip()!=sha:raise ValueError('Mixed gallery source SHAs')
        rows.extend(json.loads(part.read_text()))
    if len(rows)!=expected_templates or len({r['base'] for r in rows})!=expected_templates:raise ValueError('Incomplete/duplicate template coverage')
    if any(r['exporter']!='production DOCX Next' or r['status'] not in ['EXPORTED','BLOCKED'] for r in rows):raise ValueError('Unknown exporter or coverage status')
    if any(r['status']=='BLOCKED' and not r.get('reason') for r in rows):raise ValueError('Blocked template lacks a reason')
    wanted={r['base']+'.docx' for r in rows if r['status']=='EXPORTED'}
    if {p.name for p in docx_dir.glob('*.docx')}!=wanted:raise ValueError('Actual DOCX files differ from explicit exported coverage')
    return {'sha':sha,'exporter':'production DOCX Next','rows':rows}

def main():
    p=argparse.ArgumentParser();p.add_argument('--batch-root',type=Path,required=True);p.add_argument('--docx-dir',type=Path,required=True);p.add_argument('--sha',required=True)
    a=p.parse_args();result=assemble(a.batch_root,a.docx_dir,a.sha)
    (a.docx_dir/'COVERAGE.json').write_text(json.dumps(result,indent=2)+'\n');(a.docx_dir/'SOURCE_SHA.txt').write_text(a.sha+'\n')
    print(f"Next coverage: {sum(r['status']=='EXPORTED' for r in result['rows'])}/39 exported; others BLOCKED")
if __name__=='__main__':main()
