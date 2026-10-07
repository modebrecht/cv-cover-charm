"""Bounded native cell-ending counterexamples; negative outcomes never unlock export."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz

from docx_next_flow_qa import compact
from docx_next_package_qa import check_package

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice')
renderer.add_argument('--libreofficekit')
parser.add_argument('--require-stable', action='store_true')
parser.add_argument('--observe', action='store_true', help='Record engine differences without accepting them or changing baseline gates')
args = parser.parse_args()
executable = args.libreofficekit or args.soffice
with tempfile.TemporaryDirectory(prefix='docx-next-cell-version-') as profile:
    command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing LibreOffice version'
if args.libreofficekit:
    info = json.loads(version)
    version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable LibreOffice required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-cell-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-cell-output-') as output:
        exported = Path(output) / (source.stem + '.' + format)
        command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [
            executable, '-env:UserInstallation=' + Path(profile).as_uri(),
            '--headless', '--convert-to', format, '--outdir', output, str(source.resolve()),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
        destination.write_bytes(exported.read_bytes())


def package_result(source, fixture, saved=False):
    check_package(source, next_package=not saved)
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    fields = {}
    for node in root.iter(W + 'sdt'):
        tag = node.find(W + 'sdtPr/' + W + 'tag')
        if tag is not None:
            identity = tag.get(W + 'val')
            assert identity not in fields, 'Duplicate field identity ' + identity
            fields[identity] = compact(''.join(text.text or '' for text in node.iter(W + 't')))
    for field in fixture['completeFields']:
        assert fields.get(field['fieldId']) == compact(field['text']), 'Changed complete field ' + field['fieldId']
    if not saved:
        tables = [table for table in root.iter(W + 'tbl')
                  if (caption := table.find(W + 'tblPr/' + W + 'tblCaption')) is not None
                  and caption.get(W + 'val') == fixture['tableId']]
        assert len(tables) == 1, 'Changed native table ownership'
        rows = tables[0].findall(W + 'tr')
        assert len(rows) == len(fixture['cellEndKeepNext'])
        for row, flags in zip(rows, fixture['cellEndKeepNext']):
            cells = row.findall(W + 'tc')
            assert len(cells) == len(flags)
            for cell, flag in zip(cells, flags):
                ending = list(cell)[-1]
                assert ending.tag == W + 'p' and not list(ending.iter(W + 't')), 'Changed required empty cell ending'
                keep = ending.find(W + 'pPr/' + W + 'keepNext')
                assert (keep is None) if flag is None else (keep is not None and keep.get(W + 'val') == str(int(flag))), 'Changed cell-ending attachment'
    return {'allDeclaredFieldDataPreserved': True, 'nativeCellEndingFlags': 'pass' if not saved else 'source-only'}


def render_result(pdf, fixture):
    scale = 72 / 25.4
    with fitz.open(pdf) as document:
        assert len(document) >= 3, 'Missing dossier parts'
        if not args.observe:
            assert len(document) == 10, 'Changed page count; review required: ' + fixture['fixture']
        margins, lane = fixture['parts'][-1]['contentBoxMm'], fixture['lane']
        clips = [fitz.Rect((lane['leftMm'] - .5) * scale, (margins['top'] - 3) * scale,
                          (lane['rightMm'] + .5) * scale, page.rect.height - (margins['bottom'] - 3) * scale)
                 for page in document[2:]]
        texts = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
        assert all(compact(text) in ''.join(texts) for text in fixture['cvSemanticText']), 'Lost owning-lane full text'
        positions, metrics = [], []
        for index, field in enumerate(fixture['openingFields']):
            matches = [i for i, text in enumerate(texts) if compact(field['text']) in text]
            assert matches, 'Lost opening ' + field['fieldId']
            if index < len(fixture['openingFields']) - 1:
                assert len(matches) == 1, 'Ambiguous metadata ' + field['fieldId']
                boxes = document[matches[0] + 2].search_for(field['text'], clip=clips[matches[0]])
                assert len(boxes) == 1, 'Changed metadata wrapping'
                metrics.append({'fieldId': field['fieldId'], 'leftPt': boxes[0].x0, 'widthPt': boxes[0].width})
            positions.append(matches[0] + 1)
        if not args.observe:
            assert positions == fixture['expectedCvPages'], 'Changed attachment; review required: ' + fixture['fixture'] + ' ' + str(positions)
        for page, clip in zip(document[2:], clips):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip():
                            continue
                        box = fitz.Rect(span['bbox'])
                        if box.y1 < clip.y0 or box.y0 > clip.y1:
                            continue
                        assert box.x0 >= lane['leftMm'] * scale - 2 and box.x1 <= lane['rightMm'] * scale + 2, 'Text exceeds lane'
                        assert box.y0 >= margins['top'] * scale - 4 and box.y1 <= page.rect.height - margins['bottom'] * scale + 4, 'Text exceeds body height'
        document[positions[0] + 1].get_pixmap(matrix=fitz.Matrix(1, 1)).save(pdf.with_suffix('.png'))
        return {'pages': len(document), 'fullTextVisible': True, 'openingCvPages': positions,
                'baselineMatches': len(document) == 10 and positions == fixture['expectedCvPages'],
                'openingAttachment': 'pass' if len(set(positions)) == 1 else 'known-negative', 'metadataMetrics': metrics}


def same_metrics(left, right):
    assert [field['fieldId'] for field in left] == [field['fieldId'] for field in right]
    for a, b in zip(left, right):
        assert abs(a['leftPt'] - b['leftPt']) < .6 and abs(a['widthPt'] - b['widthPt']) < .6, 'Changed lane or glyph geometry'


cases = json.loads((args.directory / 'cell-ending-manifest.json').read_text())
assert len(cases) == 12, 'Early-stop matrix changed'
report = []
for case in cases:
    name = case['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['diagnostic'] == case
    source, saved = args.directory / (name + '.docx'), args.directory / (name + '-saved.docx')
    pdf, reopened = args.directory / (name + '-render.pdf'), args.directory / (name + '-reopened.pdf')
    package = package_result(source, fixture)
    convert(source, pdf, 'pdf')
    convert(source, saved, 'docx')
    saved_package = package_result(saved, fixture, saved=True)
    convert(saved, reopened, 'pdf')
    before, after = render_result(pdf, fixture), render_result(reopened, fixture)
    assert {k: v for k, v in before.items() if k != 'metadataMetrics'} == {k: v for k, v in after.items() if k != 'metadataMetrics'}, 'Save/reopen changed attachment'
    same_metrics(before['metadataMetrics'], after['metadataMetrics'])
    report.append({'fixture': name, 'diagnostic': case, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'package': package, 'saveReopenPackage': saved_package, 'render': before, 'saveReopen': after})
    print(json.dumps({'fixture': name, 'openingCvPages': before['openingCvPages'], 'fullText': 'pass', 'saveReopen': 'pass'}), flush=True)
for lead in sorted({case['leadMm'] for case in cases}):
    group = [case for case in report if case['diagnostic']['leadMm'] == lead]
    assert len(group) == 4
    for case in group[1:]:
        same_metrics(group[0]['render']['metadataMetrics'], case['render']['metadataMetrics'])
        same_metrics(group[0]['saveReopen']['metadataMetrics'], case['saveReopen']['metadataMetrics'])
if not args.observe:
    assert sum(case['render']['openingAttachment'] == 'known-negative' for case in report) == 10
result = {'libreOfficeVersion': version, 'libreOfficeInterface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI', 'cases': report,
          'architectureAcceptance': 'observation-only: differences require review; no export enablement' if args.observe else 'blocked: cell-ending attachment gives no improvement and regresses the 234 mm boundary',
          'earlyStop': '12 cases, three boundaries; remaining boundaries/populated tracks/photos/chrome not expanded',
          'microsoftWord': 'pending'}
(args.directory / 'cell-ending-report.json').write_text(json.dumps(result, indent=2) + '\n')
print(result['architectureAcceptance'], flush=True)
