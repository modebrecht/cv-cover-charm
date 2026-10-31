#!/usr/bin/env python3
"""Three-case converter experiment within dossier-visual-parity, not a product exporter."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import tempfile
from zipfile import ZipFile

import fitz
import numpy as np
import PIL
import skimage
from PIL import Image

from dossier_visual_parity import (
    PAGE_KINDS, TemplateCase, convert_all_docx_to_pdf, pair_scores, rasterize_pdf,
)

VERSION = '10.0.0'
ARCHIVE_SHA256 = '194f348429239fbcee4d1c29861550127885facdbb700706c7bb1429a21b33e4'
CASES = {'01-normal': False, '02-inline-photo': True, '03-word-free-photo': True}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def binding(path):
    return {'file': str(path), 'sha256': sha(path)}


def sources(directory):
    manifest = json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    rows = manifest['cases']
    if (manifest.get('schemaVersion') != 1
            or not re.fullmatch(r'[0-9a-f]{40}', manifest.get('sourceCommit', ''))
            or len(rows) != 3 or {row['id'] for row in rows} != set(CASES)):
        raise ValueError('Exactly three version-bound DOCX Next cases are required')
    for row in rows:
        if (row['file'] != row['id'] + '.docx'
                or row.get('expectedPhoto') is not CASES[row['id']]):
            raise ValueError('Unexpected source filename or photo expectation')
        path = directory / row['file']
        if path.is_symlink() or sha(path) != row['sha256']:
            raise ValueError('Source hash changed: ' + row['id'])
        with ZipFile(path) as package:
            if 'word/document.xml' not in package.namelist():
                raise ValueError('A real Word package is required')
    return manifest


def engine_binding(archive, builder):
    if sha(archive) != ARCHIVE_SHA256:
        raise ValueError('Unexpected ONLYOFFICE release archive digest')
    components = []
    with tarfile.open(archive) as package:
        for name in ('docbuilder', 'libdoctrenderer.so', 'x2t'):
            local = builder.parent / name
            member = package.extractfile('opt/onlyoffice/documentbuilder/' + name)
            if member is None or hashlib.sha256(member.read()).hexdigest() != sha(local):
                raise ValueError('Installed engine differs from pinned archive: ' + name)
            components.append(binding(local))
    return {'version': VERSION, 'archive': binding(archive), 'components': components,
            'freeEditionWatermarkNotMasked': True}


def command(args, log, cwd=None):
    with log.open('w', encoding='utf-8') as stream:
        subprocess.run([str(x) for x in args], cwd=cwd, stdout=stream,
                       stderr=subprocess.STDOUT, check=True, timeout=180)


def builder_script(source, output):
    # Static arguments use JSON string quoting; never interpolate a path as JS code.
    lines = [f'builder.SetTmpFolder({json.dumps(str(output / "temp"))});']
    current = source
    for phase in ('source', 'saved1', 'saved2'):
        lines += [f'builder.OpenFile({json.dumps(str(current))}, "");',
                  f'builder.SaveFile("pdf", {json.dumps(str(output / (phase + ".pdf")))});']
        if phase != 'saved2':
            following = output / ('saved1.docx' if phase == 'source' else 'saved2.docx')
            lines += [f'builder.SaveFile("docx", {json.dumps(str(following))});']
            current = following
        lines += ['builder.CloseFile();']
    return '\n'.join(lines) + '\n'


def photo_control(pdf):
    """Detect the known synthetic red/blue photo, never a generic photo classifier."""
    with fitz.open(pdf) as document:
        if len(document) != 3:
            raise ValueError('Expected three dossier pages: ' + str(pdf))
        pix = document[2].get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        rgb = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
        red = int(((rgb[:, :, 0] > 150) & (rgb[:, :, 1] < 100) & (rgb[:, :, 2] < 100)).sum())
        blue = int(((rgb[:, :, 2] > 140) & (rgb[:, :, 0] < 100) & (rgb[:, :, 1] < 140)).sum())
        return {'redPixelsCv': red, 'bluePixelsCv': blue,
                'knownPhotoVisible': red > 1000 and blue > 1000}


def reference_pdf(source, out, lo_kit):
    if lo_kit:
        with tempfile.TemporaryDirectory(prefix='onlyoffice-lo-control-') as profile:
            command([lo_kit, Path(profile).as_uri(), source.as_uri(),
                     (out / 'reference.pdf').as_uri(), 'pdf'], out / 'reference.log')
        return out / 'reference.pdf'
    case = TemplateCase(source.stem, source.stem, {})
    return convert_all_docx_to_pdf(source.parent, [case], out / 'libreoffice')[source.stem]


def run(sourcedir, output, builder, archive, lo_kit=None):
    if output.exists():
        raise ValueError('Use a fresh output directory; existing evidence is not overwritten')
    manifest = sources(sourcedir)
    engine = engine_binding(archive, builder)
    if lo_kit:
        reference = {'kind': 'existing isolated LibreOfficeKit', 'adapter': binding(lo_kit)}
        library = lo_kit.parent / 'usr/lib/libreoffice/program/libmergedlo.so'
        if library.is_file():
            reference['library'] = binding(library)
    else:
        reference = {'kind': 'LibreOffice CLI', 'version': subprocess.check_output(
            ['libreoffice', '--version'], text=True).strip()}
    output.mkdir(parents=True)
    report = {'scope': 'Three real DOCX Next files; converter experiment only',
              'sources': manifest, 'onlyoffice': engine,
              'referenceEngine': reference,
              'runtimeVersions': {'python': sys.version, 'pymupdf': fitz.VersionBind,
                                  'numpy': np.__version__, 'pillow': PIL.__version__,
                                  'scikitImage': skimage.__version__},
              'sharedParityScript': binding(Path(__file__).with_name('dossier_visual_parity.py')),
              'ssimIsObservational': True, 'nativeDesktopWordAcceptanceGranted': False,
              'normalProductExportChanged': False, 'cases': []}
    for spec in manifest['cases']:
        row = {'id': spec['id'], 'completed': False}
        report['cases'].append(row)
        folder = output / spec['id']
        folder.mkdir()
        source = (sourcedir / spec['file']).resolve()
        try:
            control = reference_pdf(source, folder, lo_kit)
            script = folder / 'roundtrip.js'
            script.write_text(builder_script(source, folder), encoding='utf-8')
            command([builder, script], folder / 'onlyoffice.log', cwd=builder.parent)
            for name in ('saved1.docx', 'saved2.docx'):
                with ZipFile(folder / name) as package:
                    package.read('word/document.xml')
            pages = {'libreoffice': rasterize_pdf(control, folder / 'png' / 'libreoffice', spec['id'])}
            photos = {'libreoffice': photo_control(control)}
            artifacts = [binding(control)]
            for phase in ('source', 'saved1', 'saved2'):
                pdf = folder / (phase + '.pdf')
                pages[phase] = rasterize_pdf(pdf, folder / 'png' / phase, spec['id'])
                photos[phase] = photo_control(pdf)
                artifacts.append(binding(pdf))
            metrics = []
            for kind in PAGE_KINDS:
                scores = pair_scores(pages['libreoffice'][kind], pages['source'][kind], pages['saved2'][kind])
                saves = pair_scores(pages['source'][kind], pages['saved1'][kind], pages['saved2'][kind])
                metrics.append({'page': kind, 'libreoffice_vs_onlyoffice': scores['web_pdf'],
                                'libreoffice_vs_onlyoffice_saved2': scores['web_docx'],
                                'onlyoffice_source_vs_saved2': scores['pdf_docx'],
                                'onlyoffice_source_vs_saved1': saves['web_pdf'],
                                'onlyoffice_saved1_vs_saved2': saves['pdf_docx'],
                                'onlyoffice_layout_source_vs_saved2': scores['pdf_docx_layout']})
                thumbs = []
                for phase in ('libreoffice', 'source', 'saved2'):
                    with Image.open(pages[phase][kind]) as im:
                        thumb = im.convert('RGB'); thumb.thumbnail((397, 562)); thumbs.append(thumb)
                sheet = Image.new('RGB', (1191, 562), 'white')
                for i, thumb in enumerate(thumbs):
                    sheet.paste(thumb, (i * 397, 0))
                sheet.save(folder / (kind + '-lo-oo-oo2.png'))
            row.update(completed=True, metrics=metrics, photoControls=photos,
                       expectedPhotoPreserved=not spec['expectedPhoto'] or all(
                           photos[p]['knownPhotoVisible'] for p in ('source', 'saved1', 'saved2')),
                       artifacts=artifacts + [binding(folder / name) for name in ('saved1.docx', 'saved2.docx')])
        except Exception as error:
            row['error'] = str(error)
        finally:
            if sha(source) != spec['sha256']:
                row.update(completed=False, error='Original source changed during conversion')
        print(json.dumps({'case': spec['id'], 'completed': row['completed'], 'error': row.get('error')}), flush=True)
    report['completedCases'] = sum(row['completed'] for row in report['cases'])
    report['photoFailures'] = [row['id'] for row in report['cases'] if row.get('expectedPhotoPreserved') is False]
    report['sourceHashesStillMatch'] = sources(sourcedir) == manifest
    (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    lines = ['# ONLYOFFICE DOCX Next PoC (three cases)', '',
             f'Source commit: `{manifest["sourceCommit"]}`. ONLYOFFICE {VERSION}.',
             'Free-edition watermark is retained; SSIM is observational, not product acceptance.',
             'Sheets: left LibreOffice source, middle ONLYOFFICE source, right ONLYOFFICE save 2.', '',
             '| Case | Completed | Photo preserved | Mean LO/OO SSIM | Mean OO/save2 SSIM |',
             '|---|---|---|---:|---:|']
    for row in report['cases']:
        if row['completed']:
            lo = sum(x['libreoffice_vs_onlyoffice'] for x in row['metrics']) / 3
            stability = sum(x['onlyoffice_source_vs_saved2'] for x in row['metrics']) / 3
            lines.append(f'| {row["id"]} | yes | {row["expectedPhotoPreserved"]} | {lo:.6f} | {stability:.6f} |')
        else:
            lines.append(f'| {row["id"]} | no | unknown | - | - |')
            lines += ['', row['error'], '']
    (output / 'SUMMARY.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return 0 if report['completedCases'] == 3 and not report['photoFailures'] else 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--onlyoffice', type=Path, required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--lo-kit', type=Path, help='Existing isolated local LOKit adapter; CI uses LibreOffice CLI')
    args = parser.parse_args()
    return run(args.sources.resolve(), args.out.resolve(), args.onlyoffice.resolve(),
               args.archive.resolve(), args.lo_kit.resolve() if args.lo_kit else None)


if __name__ == '__main__':
    raise SystemExit(main())
