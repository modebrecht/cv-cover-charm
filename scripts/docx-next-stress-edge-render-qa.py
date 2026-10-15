"""Local Item 14 render evidence. Prerelease runtimes require explicit diagnostic mode.

Never opens Sidebar fixtures, changes an engine or certifies Microsoft Word.
"""
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz
from PIL import Image
from docx_next_package_qa import check_package

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def compact(text):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', text).replace('\u00ad', ''))


def fields(path):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        result = {}
        for control in root.iter(W + 'sdt'):
            tag = control.find(W + 'sdtPr/' + W + 'tag')
            if tag is None:
                continue
            identity = tag.get(W + 'val')
            assert identity not in result, f'Duplicate native field: {identity}'
            result[identity] = compact(''.join(node.text or '' for node in control.iter(W + 't')))
        return result


def convert(source, folder, kind, executable):
    folder.mkdir(parents=True, exist_ok=True)
    output = folder / (source.stem + ('.pdf' if kind == 'pdf' else '.docx'))
    assert output.resolve() != source.resolve()
    with tempfile.TemporaryDirectory(prefix='docx14-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx14-output-') as temporary:
        run = subprocess.run([executable, '-env:UserInstallation=' + Path(profile).as_uri(),
                              '--headless', '--invisible', '--norestore', '--convert-to',
                              kind, '--outdir', temporary, str(source.resolve())],
                             text=True, capture_output=True, timeout=90)
        assert run.returncode == 0, run.stdout + run.stderr
        generated = Path(temporary) / output.name
        assert generated.is_file(), run.stdout + run.stderr
        generated.replace(output)
    return output


def color_counts(image):
    raw = image.convert('RGB').tobytes()
    pixels = list(zip(raw[0::3], raw[1::3], raw[2::3]))
    return (sum(r > 180 and g < 100 and b < 100 for r, g, b in pixels),
            sum(b > 180 and r < 100 and g < 100 for r, g, b in pixels))


def check_photo_regions(pdf, regions):
    for region in regions:
        page = pdf[region['page']]
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), clip=fitz.Rect(region['bbox']), alpha=False)
        with Image.frombytes('RGB', [pix.width, pix.height], pix.samples) as image:
            red, blue = color_counts(image)
        assert red > 5 and blue > 5, f'Visible synthetic portrait missing from page {region["page"] + 1}'


def inspect_pdf(path, fixture, model, reference_photos=None):
    with fitz.open(path) as pdf:
        texts = [page.get_text() for page in pdf]
        letter_start = next(i for i, text in enumerate(texts) if 'BRIEFPROBE001' in compact(text))
        cv_start = next(i for i, text in enumerate(texts) if 'CVPROBE001' in compact(text))
        assert 0 < letter_start < cv_start < len(pdf)
        body = {}
        for scope, start, end, label, other in [('letter', letter_start, cv_start, 'BRIEF', 'CV'),
                                               ('cv', cv_start, len(pdf), 'CV', 'BRIEF')]:
            margin = model[scope]['page']['margins']
            chunks = []
            for page in pdf[start:end]:
                text = compact(texts[page.number])
                assert label + 'KOPF' in text and label + 'FUSS' in text, f'{scope}: missing running chrome on page {page.number + 1}'
                assert other + 'KOPF' not in text and other + 'FUSS' not in text, f'{scope}: foreign chrome'
                clip = fitz.Rect(0, margin['top'] * 72 / 25.4, page.rect.width,
                                 page.rect.height - margin['bottom'] * 72 / 25.4)
                chunks.append(page.get_text(clip=clip))
            body[scope] = compact(''.join(chunks))
        occurrences = Counter()
        for identity, text in fixture['expectedFields'].items():
            if text:
                scope = 'cv' if identity.startswith('cv.') else 'letter'
                assert compact(text) in body[scope], f'Missing rendered content: {identity}'
                occurrences[scope, compact(text)] += 1
        for (scope, text), count in occurrences.items():
            assert body[scope].count(text) >= count, f'Missing repeated {scope} field occurrences: expected {count}'
        regions = []
        for page in pdf:
            assert texts[page.number].strip(), f'Blank PDF page {page.number + 1}'
            for block in page.get_text('dict')['blocks']:
                if block['type'] == 0:
                    for line in block['lines']:
                        for span in line['spans']:
                            if not span['text'].strip():
                                continue
                            x0, y0, x1, y1 = span['bbox']
                            assert x0 >= -0.5 and y0 >= -0.5 and x1 <= page.rect.width + 0.5 and y1 <= page.rect.height + 0.5, f'Off-page text on page {page.number + 1}'
                elif block['type'] == 1 and reference_photos is None:
                    # Existing synthetic portrait has strong red and blue areas; page
                    # decoration in the three selected families is not counted as a photo.
                    with Image.open(io.BytesIO(block['image'])) as image:
                        red, blue = color_counts(image)
                    if red > 5 and blue > 5:
                        regions.append({'page': page.number, 'bbox': list(block['bbox'])})
        regions = regions if reference_photos is None else reference_photos
        assert len(regions) == 3, f'Expected three synthetic portrait regions, found {len(regions)}'
        cv_photo = [region for region in regions if region['page'] >= cv_start]
        assert len(cv_photo) == 1, 'Missing or repeated CV photo'
        assert cv_photo[0]['bbox'][1] >= model['cv']['page']['margins']['top'] * 72 / 25.4 - 0.5, 'Body-flow CV photo intrudes into running header'
        # Save/Reopen may represent the same visible photo as PDF vector/form paint.
        # Pixel verification preserves the three-photo assertion independently of
        # whether the PDF reader exposes a corresponding standalone image object.
        check_photo_regions(pdf, regions)
        return {'pages': len(pdf), 'letterPages': cv_start - letter_start, 'cvPages': len(pdf) - cv_start,
                'photoPlacements': len(regions), 'photoRegions': regions,
                'completeText': 'pass', 'chromeOwnership': 'pass', 'pageBounds': 'pass'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--soffice', default='soffice')
    parser.add_argument('--diagnostic-runtime', action='store_true')
    args = parser.parse_args()
    version = subprocess.run([args.soffice, '--version'], text=True, capture_output=True, check=True).stdout.strip()
    prerequisite = '25.8.7.3' in version and not re.search(r'dev|alpha|beta|rc', version, re.I)
    assert prerequisite or args.diagnostic_runtime, f'Pinned stable runtime unavailable: {version}; diagnostic evidence requires --diagnostic-runtime'
    manifest = json.loads((args.directory / 'manifest.json').read_text())
    results = []
    for fixture in manifest:
        name = fixture['fixture']
        source = args.directory / (name + '.docx')
        folder = args.directory / (name + '-qa')
        row = {'fixture': name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest()}
        try:
            check_package(source)
            before = fields(source)
            for identity, text in fixture['expectedFields'].items():
                assert before.get(identity) == compact(text), f'Initial package field lost: {identity}'
            model = json.loads((args.directory / (name + '.model.json')).read_text())
            first_pdf = convert(source, folder / 'source', 'pdf', args.soffice)
            row['source'] = inspect_pdf(first_pdf, fixture, model)
            saved = convert(source, folder / 'saved', 'docx:Office Open XML Text', args.soffice)
            check_package(saved, next_package=False)
            saved_pdf = convert(saved, folder / 'saved-pdf', 'pdf', args.soffice)
            row['saved'] = inspect_pdf(saved_pdf, fixture, model, row['source']['photoRegions'])
            assert row['source']['pages'] == row['saved']['pages'], 'Save/Reopen page count changed'
            after = fields(saved)
            row['missingTaggedFields'] = [identity for identity, text in before.items() if after.get(identity) != text]
            row['savedFieldIdentity'] = 'fail' if row['missingTaggedFields'] else 'pass'
            row['diagnosticFlow'] = 'pass'
        except (AssertionError, StopIteration, subprocess.SubprocessError) as error:
            row['diagnosticFlow'] = 'fail'
            row['failure'] = str(error) or type(error).__name__
        results.append(row)
        print(json.dumps({key: value for key, value in row.items() if key != 'missingTaggedFields'}), flush=True)
    report = {'runtime': version, 'runtimeVersionMatchesBaseline': prerequisite, 'wordTestPerformed': False,
              'physicalAcceptance': 'NOT_ACCEPTED: diagnostic evidence; pinned runtime/fonts and Word not verified by this runner',
              'fixtures': results}
    (args.directory / 'render-report.json').write_text(json.dumps(report, indent=2) + '\n')
    assert all(row['diagnosticFlow'] == 'pass' and row.get('savedFieldIdentity') == 'pass' for row in results), 'One or more stress diagnostics failed; preserve evidence and investigate before acceptance'


if __name__ == '__main__':
    main()
