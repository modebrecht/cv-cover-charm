#!/usr/bin/env python3
"""P2-21: fresh actual App/Next exports with off-centre portrait crops."""
import argparse
import json
import os
from pathlib import Path
import shutil
from zipfile import ZipFile

import dossier_entry_rows as entries
from dossier_lo_context import W, NS, parse_part
from dossier_parity_content import docx_text
from dossier_photo_frame import make_copy as photo_copy
from dossier_production_spacing import content, digest, measure

IDS = {'cv-crop-left', 'cv-crop-right'}
PROFILES = ['original-source', 'side-aware-photo']


def validate_sources(source, expected_sha=None):
    catalog = json.loads((source / 'CATALOG.json').read_text())
    sha = catalog['sha']
    if expected_sha and sha != expected_sha:
        raise ValueError('Mixed source/catalog implementation SHA')
    paths = [p for p in source.glob('*.json') if p.name != 'CATALOG.json']
    if {p.stem for p in paths} != IDS:
        raise ValueError('Expected exactly two cropped source manifests')
    rows = []
    for path in sorted(paths):
        meta = json.loads(path.read_text())
        if meta['id'] != path.stem or meta['sha'] != sha or meta['status'] != 'EXPORTED' or meta['entryCount'] != 18:
            raise ValueError('Mixed/incomplete fresh cropped export')
        if {f['format'] for f in meta['files']} != {'PDF', 'DOCX'} or len(meta['files']) != 2:
            raise ValueError('Missing or duplicate source format')
        for f in meta['files']:
            if f['filename'] != meta['id'] + '.' + f['format'].lower() or digest(source / f['filename']) != f['sha256']:
                raise ValueError('Source filename/hash mismatch')
        rows.append(meta)
    return sha, rows


def make_copy(source, target, profile):
    if profile not in PROFILES or source.resolve() == target.resolve():
        raise ValueError('Invalid profile or source overwrite')
    if profile == 'original-source':
        shutil.copyfile(source, target)
        return {'entry_count': 18, 'source_sha256': digest(source), 'copy_sha256': digest(target), 'source_bytes_unchanged': True}
    with ZipFile(source) as z:
        root = parse_part(z.read('word/document.xml'))
    left = int(root.find('w:body/w:sectPr/w:pgMar', NS).get(W + 'left'))
    frame = 'margin-equivalent' if left else 'original-photo'
    meta = photo_copy(source, target, frame, layout='fixed-5-14', count=18)
    meta.update(profile=profile, photo_control_profile=frame)
    return meta


def main():
    # The existing native runner owns the shared CLI. Only read its output path here.
    p = argparse.ArgumentParser(add_help=False)
    p.add_argument('--out-dir', type=Path, required=True)
    args, _ = p.parse_known_args()
    out = args.out_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    source = Path(os.environ.get('FRESH_SOURCE_DIR', 'artifacts/semantic-parity/source')).resolve()
    try:
        sha, rows = validate_sources(source, os.environ.get('GITHUB_SHA'))
        inputs = {'source_export_sha': sha, 'catalog_sha256': digest(source / 'CATALOG.json'),
                  'scope': 'Fresh 18-entry ordinary descriptions, left 1.8x crop x20/y80, right 2.2x crop x75/y30; fixed-5-14 QA copies only.', 'cases': []}
        cases = []
        for meta in rows:
            if content([docx_text(source / (meta['id'] + '.docx'))], 18)['status'] != 'PASS':
                raise ValueError('Authored source description content incomplete')
            folder = out / 'app' / meta['id']
            folder.mkdir(parents=True, exist_ok=True)
            app, _ = measure(source / (meta['id'] + '.pdf'), folder, 'app', 18)
            case = {'id': meta['id'], 'entry_count': 18, 'varied_text': False,
                    'mirrored': meta['mirrored'], 'app': app}
            cases.append((case, source / (meta['id'] + '.docx')))
            inputs['cases'].append({'source_manifest': meta, 'manifest_sha256': digest(source / (meta['id'] + '.json')), 'app': app})
        references = out / 'FRESH_INPUTS.json'
        references.write_text(json.dumps(inputs, indent=2, ensure_ascii=False) + '\n')
    except (OSError, ValueError, KeyError) as exc:
        blocked = {'execution_status': 'BLOCKED', 'native_conversion_count': 0, 'error': str(exc)}
        (out / 'RESULTS.json').write_text(json.dumps(blocked, indent=2) + '\n')
        (out / 'SUMMARY.md').write_text('# P2-21 — BLOCKED\n\n' + str(exc) + '\n')
        return 1
    return entries.main(profiles=PROFILES, builder=make_copy,
                        case_loader=lambda root: ({'source_export_sha': sha}, cases),
                        title='P2-21 — fresh off-centre photo crops', reference_hash=digest(references),
                        scope='Fresh matched App/Next crops; original vs fixed-5-14 copy with left original/right equivalent-margin horizontal photo frame. Ordinary 18-entry cases only, no general pagination/product/x39/Word approval.',
                        extra_evidence=inputs)


if __name__ == '__main__':
    raise SystemExit(main())
