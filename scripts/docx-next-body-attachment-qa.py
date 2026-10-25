"""Compare matched native ownership controls; counterexamples never enable Sidebar support."""
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

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice')
renderer.add_argument('--libreofficekit')
parser.add_argument('--require-stable', action='store_true')
parser.add_argument('--observe', action='store_true', help='Record engine differences without accepting them or changing baseline gates')
args = parser.parse_args()
executable = args.libreofficekit or args.soffice
with tempfile.TemporaryDirectory(prefix='docx-next-body-version-') as profile:
    command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing LibreOffice version'
if args.libreofficekit:
    info = json.loads(version)
    version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable LibreOffice required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-body-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-body-output-') as output:
        exported = Path(output) / (source.stem + '.' + format)
        command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [
            executable, '-env:UserInstallation=' + Path(profile).as_uri(),
            '--headless', '--convert-to', format, '--outdir', output, str(source.resolve()),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stderr + result.stdout
        destination.write_bytes(exported.read_bytes())


def check_result(pdf, fixture):
    scale = 72 / 25.4
    with fitz.open(pdf) as document:
        assert len(document) >= 3, 'Missing dossier parts'
        if not args.observe:
            assert len(document) == 10, fixture['fixture'] + ': changed page count; review required'
        margins = fixture['parts'][-1]['contentBoxMm']
        lane = fixture['lane']
        clips = [fitz.Rect((lane['leftMm'] - .5) * scale, (margins['top'] - 3) * scale,
                          (lane['rightMm'] + .5) * scale, page.rect.height - (margins['bottom'] - 3) * scale)
                 for page in document[2:]]
        texts = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
        for value in fixture['cvSemanticText']:
            assert compact(value) in ''.join(texts), fixture['fixture'] + ': lost owning-lane semantic text'
        positions, metrics = [], []
        for index, field in enumerate(fixture['openingFields']):
            matches = [i for i, text in enumerate(texts) if compact(field['text']) in text]
            assert matches, fixture['fixture'] + ': missing opening field ' + field['fieldId']
            if index != len(fixture['openingFields']) - 1:
                assert len(matches) == 1, 'Ambiguous metadata field ' + field['fieldId']
                boxes = document[matches[0] + 2].search_for(field['text'], clip=clips[matches[0]])
                assert len(boxes) == 1, 'Changed metadata wrapping ' + field['fieldId']
                metrics.append({'fieldId': field['fieldId'], 'leftPt': boxes[0].x0, 'widthPt': boxes[0].width})
            positions.append(matches[0] + 1)
        if not args.observe:
            assert positions == fixture['expectedCvPages'], fixture['fixture'] + ': attachment boundary changed; review required ' + str(positions)
        for page, clip in zip(document[2:], clips):
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip(): continue
                        box = fitz.Rect(span['bbox'])
                        if box.y1 < clip.y0 or box.y0 > clip.y1: continue
                        assert box.x0 >= lane['leftMm'] * scale - 2 and box.x1 <= lane['rightMm'] * scale + 2, 'Text exceeds owning lane'
                        assert box.y0 >= margins['top'] * scale - 4 and box.y1 <= page.rect.height - margins['bottom'] * scale + 4, 'Text exceeds body height'
        document[positions[0] + 1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
        return {'pages': len(document), 'semanticTextPreserved': True, 'openingCvPages': positions,
                'baselineMatches': len(document) == 10 and positions == fixture['expectedCvPages'],
                'openingAttachment': 'pass' if len(set(positions)) == 1 else 'known-negative', 'metadataMetrics': metrics}


def same_metrics(left, right):
    assert [field['fieldId'] for field in left] == [field['fieldId'] for field in right]
    for a, b in zip(left, right):
        assert abs(a['leftPt'] - b['leftPt']) < .6 and abs(a['widthPt'] - b['widthPt']) < .6, 'Owning-lane position or glyph width changed: ' + a['fieldId']


def check_field_data(source, fixture):
    word = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    fields = {}
    for node in root.iter(word + 'sdt'):
        tag = node.find(word + 'sdtPr/' + word + 'tag')
        if tag is not None:
            identity = tag.get(word + 'val')
            assert identity not in fields, 'Duplicate field identity ' + identity
            fields[identity] = compact(''.join(text.text or '' for text in node.iter(word + 't')))
    assert len(fixture['openingFields']) == len(fixture['cvSemanticText']), 'Changed field inventory'
    for field, text in zip(fixture['openingFields'], fixture['cvSemanticText']):
        assert fields.get(field['fieldId']) == compact(text), 'Changed complete field ' + field['fieldId']


cases = json.loads((args.directory / 'body-attachment-manifest.json').read_text())
assert len(cases) == 24, 'Bounded ownership matrix changed'
report = []
for value in cases:
    name = value['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['diagnostic'] == value
    source = args.directory / (name + '.docx')
    saved = args.directory / (name + '-saved.docx')
    pdf = args.directory / (name + '-render.pdf')
    reopened = args.directory / (name + '-reopened.pdf')
    check_package(source)
    check_field_data(source, fixture)
    convert(source, pdf, 'pdf')
    convert(source, saved, 'docx')
    check_package(saved, next_package=False)
    check_field_data(saved, fixture)
    convert(saved, reopened, 'pdf')
    before, after = check_result(pdf, fixture), check_result(reopened, fixture)
    assert {k: v for k, v in before.items() if k != 'metadataMetrics'} == {k: v for k, v in after.items() if k != 'metadataMetrics'}, name + ': save/reopen changed attachment'
    same_metrics(before['metadataMetrics'], after['metadataMetrics'])
    record = {'fixture': name, 'diagnostic': value, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'package': 'pass', 'saveReopenPackage': 'pass', 'render': before, 'saveReopen': after}
    report.append(record)
    print(json.dumps(record), flush=True)
for lead in sorted(set(case['leadMm'] for case in cases)):
    group = [case for case in report if case['diagnostic']['leadMm'] == lead]
    assert len(group) == 4
    for case in group[1:]:
        same_metrics(group[0]['render']['metadataMetrics'], case['render']['metadataMetrics'])
        same_metrics(group[0]['saveReopen']['metadataMetrics'], case['saveReopen']['metadataMetrics'])
if not args.observe:
    assert sum(case['render']['openingAttachment'] == 'known-negative' for case in report) == 10
result = {'libreOfficeVersion': version, 'libreOfficeInterface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI',
          'cases': report, 'architectureAcceptance': 'observation-only: differences require review; no export enablement' if args.observe else 'multi-cell context remains blocked; matched single-column and native-body controls pass',
          'productionChange': 'none; default Sidebar and picture-before-later-span guard unchanged', 'microsoftWord': 'pending'}
(args.directory / 'body-attachment-report.json').write_text(json.dumps(result, indent=2) + '\n')
print(result['architectureAcceptance'], flush=True)
