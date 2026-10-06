"""Unaccepted native floating tables: preserve and report independent-flow counterexamples."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile

import fitz

from docx_next_flow_qa import compact
from docx_next_package_qa import check_package

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
parser.add_argument('--soffice', default='soffice')
parser.add_argument('--require-stable', action='store_true')
args = parser.parse_args()
version = subprocess.run([args.soffice, '--version'], capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing engine version'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-floating-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-floating-output-') as output:
        result = subprocess.run([args.soffice, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())], capture_output=True, text=True, timeout=60)
        exported = Path(output) / (source.stem + '.' + format)
        assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
        destination.write_bytes(exported.read_bytes())


def result(pdf, fixture):
    scale = 72 / 25.4
    with fitz.open(pdf) as document:
        assert len(document) == fixture['expectedPages'], 'Changed pagination; review required: ' + fixture['fixture']
        margins = fixture['margins']
        lanes = {}
        for label in ['main', 'side']:
            lane = fixture[label + 'Lane']
            clips = [fitz.Rect((lane['leftMm'] - .5) * scale, (margins['top'] - 3) * scale, (lane['rightMm'] + .5) * scale, page.rect.height - (margins['bottom'] - 3) * scale) for page in document[2:]]
            text = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
            expected = fixture[label + 'Text']
            assert all(compact(value) in ''.join(text) for value in expected), 'Lost owning-lane text: ' + fixture['fixture'] + ' ' + label
            first = next((index + 1 for index, value in enumerate(text) if expected and compact(expected[0]) in value), None)
            assert first == fixture['expected' + label.capitalize() + 'FirstPage'], 'Changed opening page; review required: ' + fixture['fixture'] + ' ' + label
            lanes[label] = {'firstCvPage': first, 'fullTextPreserved': True, 'clips': clips, 'text': text}
            for page, clip in zip(document[2:], clips):
                for block in page.get_text('dict', clip=clip)['blocks']:
                    for line in block.get('lines', []):
                        for span in line['spans']:
                            if not span['text'].strip():
                                continue
                            box = fitz.Rect(span['bbox'])
                            assert box.x0 >= lane['leftMm'] * scale - 2 and box.x1 <= lane['rightMm'] * scale + 2, 'Text exceeds owning lane'
                            assert box.y0 >= margins['top'] * scale - 4 and box.y1 <= page.rect.height - margins['bottom'] * scale + 4, 'Text exceeds body height'
        pages, metrics = [], []
        for index, field in enumerate(fixture['openingFields']):
            page = next((i + 1 for i, text in enumerate(lanes['main']['text']) if compact(field['text']) in text), None)
            assert page == 2, 'Detached opening field ' + field['fieldId']
            pages.append(page)
            if index < len(fixture['openingFields']) - 1:
                boxes = document[page + 1].search_for(field['text'], clip=lanes['main']['clips'][page - 1])
                assert len(boxes) == 1, 'Ambiguous metadata geometry'
                metrics.append({'fieldId': field['fieldId'], 'leftPt': boxes[0].x0, 'widthPt': boxes[0].width})
        document[2].get_pixmap(matrix=fitz.Matrix(1, 1)).save(pdf.with_suffix('.png'))
        return {'pages': len(document), 'mainFirstCvPage': lanes['main']['firstCvPage'], 'sideFirstCvPage': lanes['side']['firstCvPage'], 'fullOwningLaneText': True, 'openingCvPages': pages, 'metadataMetrics': metrics,
                'independentFlow': 'known-negative' if fixture['expectedMainFirstPage'] > 1 and not fixture['openingFields'] else 'control-pass'}


def compare_geometry(left, right):
    assert [item['fieldId'] for item in left] == [item['fieldId'] for item in right]
    for a, b in zip(left, right):
        assert abs(a['leftPt'] - b['leftPt']) < .6 and abs(a['widthPt'] - b['widthPt']) < .6, 'Metadata geometry changed'


cases = json.loads((args.directory / 'floating-manifest.json').read_text())
assert len(cases) == 20, 'Bounded matrix changed'
report = []
controls = {}
for case in cases:
    name = case['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['diagnostic'] == case
    source = args.directory / (name + '.docx')
    saved = args.directory / (name + '-saved.docx')
    pdf = args.directory / (name + '-render.pdf')
    reopened = args.directory / (name + '-reopened.pdf')
    check_package(source)
    convert(source, pdf, 'pdf')
    before = result(pdf, fixture)
    convert(source, saved, 'docx')
    check_package(saved, next_package=False)
    convert(saved, reopened, 'pdf')
    after = result(reopened, fixture)
    assert before['pages'] == after['pages'] and before['openingCvPages'] == after['openingCvPages']
    compare_geometry(before['metadataMetrics'], after['metadataMetrics'])
    if case['kind'] == 'boundary':
        if not case['floating']:
            controls[case['leadMm']] = before['metadataMetrics']
        else:
            compare_geometry(controls[case['leadMm']], before['metadataMetrics'])
    item = {'fixture': name, 'diagnostic': case, 'source': before, 'reopened': after, 'package': 'pass', 'saveReopen': 'pass'}
    report.append(item)
    print(name + ': ' + before['independentFlow'] + '; main CV ' + str(before['mainFirstCvPage']) + ', side CV ' + str(before['sideFirstCvPage']), flush=True)
(args.directory / 'floating-report.json').write_text(json.dumps({'engine': version, 'fixtures': len(report), 'renderedPages': sum(item['source']['pages'] for item in report), 'counterexamples': sum(item['source']['independentFlow'] == 'known-negative' for item in report), 'cases': report}, indent=2) + '\n')
