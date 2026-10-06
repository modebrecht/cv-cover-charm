"""Bounded native frame diagnostics: clipped long text is a blocker, never acceptance."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile

import fitz

from docx_next_flow_qa import compact
from docx_next_package_qa import check_package

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
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
    with tempfile.TemporaryDirectory(prefix='docx-next-frame-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-frame-output-') as output:
        result = subprocess.run([args.soffice, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())], capture_output=True, text=True, timeout=60)
        exported = Path(output) / (source.stem + '.' + format)
        assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
        destination.write_bytes(exported.read_bytes())


def package_fields(source, fixture, saved=False):
    check_package(source, next_package=not saved)
    with ZipFile(source) as package:
        tree = ET.fromstring(package.read('word/document.xml'))
        fields = {}
        for node in tree.findall('.//' + W + 'sdt'):
            tag = node.find(W + 'sdtPr/' + W + 'tag')
            if tag is None:
                continue
            identity = tag.get(W + 'val')
            assert identity not in fields, 'Duplicate field identity'
            fields[identity] = compact(''.join(child.text or '' for child in node.findall('.//' + W + 't')))
        for field in fixture['mainFields'] + fixture['sideFields']:
            assert fields.get(field['fieldId']) == compact(field['text']), 'Package lost field data: ' + field['fieldId']
        framed = [node for node in tree.findall('.//' + W + 'p') if node.find(W + 'pPr/' + W + 'framePr') is not None]
        assert len(framed) == len(fixture['sideFields']), 'Changed native frame ownership'
        if not saved:
            properties = [node.find(W + 'pPr/' + W + 'framePr').attrib for node in framed]
            assert all(props == properties[0] for props in properties), 'Frame paragraphs no longer share identical geometry'
            assert all(W + 'h' not in props and props.get(W + 'hRule') == 'auto' for props in properties), 'Fixed frame height introduced'
            assert [node.find(W + 'sdt/' + W + 'sdtPr/' + W + 'tag').get(W + 'val') for node in framed] == [field['fieldId'] for field in fixture['sideFields']], 'Inline frame field controls changed order'
        return {'nativeFramedParagraphs': len(framed), 'allDeclaredFieldDataPreserved': True, 'textboxes': 0}


def render_result(pdf, fixture):
    scale = 72 / 25.4
    with fitz.open(pdf) as document:
        assert len(document) == fixture['expectedPages'], 'Changed pagination; review required'
        margins = fixture['margins']
        result = {'pages': len(document)}
        for label in ['main', 'side']:
            lane = fixture[label + 'Lane']
            clips = [fitz.Rect((lane['leftMm'] - .5) * scale, 0, (lane['rightMm'] + .5) * scale, page.rect.height) for page in document[2:]]
            text = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
            fields = fixture[label + 'Fields']
            missing = [field['fieldId'] for field in fields if compact(field['text']) not in ''.join(text)]
            expected = fixture['expectedSideMissingCount'] if label == 'side' else 0
            assert len(missing) == expected, 'Changed full-field visibility; review required: ' + fixture['fixture'] + ' ' + label
            assert missing == (fixture['expectedSideMissingFieldIds'] if label == 'side' else []), 'Changed missing field identities; review required'
            assert next((index + 1 for index, value in enumerate(text) if compact(fields[0]['text']) in value), None) == 1, 'Opening moved from CV page 1'
            outside = 0
            for page, clip in zip(document[2:], clips):
                for block in page.get_text('dict', clip=clip)['blocks']:
                    for line in block.get('lines', []):
                        for span in line['spans']:
                            if not span['text'].strip():
                                continue
                            box = fitz.Rect(span['bbox'])
                            assert box.x0 >= lane['leftMm'] * scale - 2 and box.x1 <= lane['rightMm'] * scale + 2, 'Text exceeds horizontal lane'
                            if box.y0 < margins['top'] * scale - 4 or box.y1 > page.rect.height - margins['bottom'] * scale + 4:
                                outside += 1
            assert outside == (fixture['expectedSideOutsideBodySpans'] if label == 'side' else 0), 'Changed vertical bounds; review required'
            result[label] = {'firstCvPage': 1, 'missingFullFieldIds': missing, 'fullTextVisible': not missing, 'spansOutsideBody': outside}
        result['multiPageFlow'] = 'known-negative' if fixture['expectedSideMissingCount'] else 'short-control-pass'
        document[2].get_pixmap(matrix=fitz.Matrix(1, 1)).save(pdf.with_suffix('.png'))
        return result


cases = json.loads((args.directory / 'frame-manifest.json').read_text())
assert len(cases) == 4, 'Early-stop matrix expanded without architecture review'
report = []
for case in cases:
    name = case['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['diagnostic'] == case and not fixture['accepted']
    source = args.directory / (name + '.docx')
    saved = args.directory / (name + '-saved.docx')
    pdf = args.directory / (name + '-render.pdf')
    reopened = args.directory / (name + '-reopened.pdf')
    source_package = package_fields(source, fixture)
    convert(source, pdf, 'pdf')
    before = render_result(pdf, fixture)
    convert(source, saved, 'docx')
    saved_package = package_fields(saved, fixture, saved=True)
    convert(saved, reopened, 'pdf')
    after = render_result(reopened, fixture)
    assert before == after, 'Frame visibility or bounds changed after save/reopen'
    item = {'fixture': name, 'diagnostic': case, 'sourcePackage': source_package, 'savedPackage': saved_package, 'source': before, 'reopened': after, 'accepted': False}
    report.append(item)
    print(name + ': ' + before['multiPageFlow'] + '; missing complete side fields: ' + str(len(before['side']['missingFullFieldIds'])), flush=True)
(args.directory / 'frame-report.json').write_text(json.dumps({'engine': version, 'fixtures': len(report), 'renderedPages': sum(item['source']['pages'] for item in report), 'counterexamples': sum(item['source']['multiPageFlow'] == 'known-negative' for item in report), 'cases': report}, indent=2) + '\n')
