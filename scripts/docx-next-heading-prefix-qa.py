"""Verify opt-in native prefixes and retain the known description-opening boundary."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

import fitz

from docx_next_flow_qa import check_first_page_flow, check_heading_attachment, compact
from docx_next_package_qa import check_package

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice')
renderer.add_argument('--libreofficekit')
parser.add_argument('--require-stable', action='store_true')
args = parser.parse_args()
executable = args.libreofficekit or args.soffice
with tempfile.TemporaryDirectory(prefix='docx-next-heading-version-') as profile:
    command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing LibreOffice version'
if args.libreofficekit:
    info = json.loads(version)
    version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable LibreOffice required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-heading-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-heading-output-') as output:
        exported = Path(output) / (source.stem + '.' + format)
        command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [
            executable, '-env:UserInstallation=' + Path(profile).as_uri(),
            '--headless', '--convert-to', format, '--outdir', output, str(source.resolve()),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stderr + result.stdout
        destination.write_bytes(exported.read_bytes())


def check_result(pdf, fixture):
    diagnostic = fixture['diagnostic']
    with fitz.open(pdf) as document:
        expected = 10 if diagnostic['kind'] == 'oversized' else 3 if diagnostic['kind'] in ('minimum', 'inset') else 4
        assert len(document) == expected, fixture['fixture'] + ': changed pagination; review required'
        text = compact(''.join(page.get_text() for page in document))
        for value in fixture['cvSemanticText']:
            assert compact(value) in text, fixture['fixture'] + ': lost semantic text'
        checked = copy.deepcopy(fixture)
        checked['parts'][-1]['expectedPages'] = len(document) - 2
        check_first_page_flow(document, checked)
        result = {'pages': len(document), 'semanticTextPreserved': True,
                  'firstPageFieldsPresent': len(checked['parts'][-1]['firstPageFlowProbes'])}
        if diagnostic['kind'] == 'oversized':
            checked['parts'][-1]['headingAttachmentProbes'] = [fixture['headingAttachmentProbe']]
            check_heading_attachment(document, checked)
            result['headingAttachment'] = 'pass'
            # Check the earliest description occurrence: its text repeats on later pages.
            entry = fixture['headingAttachmentProbe']['entry']['text']
            entry_pages = [i for i, p in enumerate(document) if compact(entry) in compact(p.get_text())]
            description_pages = [i for i, p in enumerate(document) if 'Eine native editierbare Beschreibung' in p.get_text()]
            assert len(entry_pages) == 1 and description_pages, 'Missing description opening or ambiguous prefix'
            attached = entry_pages[0] == description_pages[0]
            assert attached == diagnostic.get('descriptionAttachmentExpected', True), 'Description attachment boundary changed; review required'
            result['descriptionAttachment'] = 'pass' if attached else 'known-negative'
            result['prefixPage'] = entry_pages[0] + 1
            result['descriptionOpeningPage'] = description_pages[0] + 1
        if fixture.get('insetProbe'):
            probe = fixture['insetProbe']
            heading = document[2].search_for(probe['heading']['text'])
            assert len(heading) == 1, 'Ambiguous inset heading'
            for field in probe['body']:
                boxes = document[2].search_for(field['text'])
                assert boxes and abs((boxes[0].x0 - heading[0].x0) / (72 / 25.4) - probe['mm']) < .6, 'Native prefix lost body inset: ' + field['fieldId']
            result['bodyInsetMm'] = probe['mm']
        if diagnostic['photo']:
            pictures = [(i, image) for i, page in enumerate(document[2:]) for image in page.get_image_info()]
            assert len(pictures) == 1 and pictures[0][0] == 0, 'Picture repeated or moved to continuation'
            bounds = fitz.Rect(pictures[0][1]['bbox'])
            assert abs(bounds.width / (72 / 25.4) - 34) < .6 and abs(bounds.height / (72 / 25.4) - 34) < .6, 'Native circle frame resized'
            result['pictureOpeningPage'] = 'pass'
        if fixture.get('railPaintProbe'):
            paint = fixture['railPaintProbe']
            scale = 72 / 25.4
            color = tuple(int(paint['color'][i:i+2], 16) / 255 for i in (0, 2, 4))
            intervals = sorted((d['rect'].y0, d['rect'].y1) for d in document[2].get_drawings()
                               if d.get('fill') and max(abs(a-b) for a,b in zip(d['fill'], color)) < .01
                               and abs(d['rect'].x0 / scale - paint['leftMm']) < .6
                               and abs(d['rect'].x1 / scale - paint['rightMm']) < .6)
            assert intervals, 'Missing owning-lane rail paint'
            bottom = intervals[0][1]
            for top, end in intervals[1:]:
                assert top <= bottom + .6, 'Rail paint detached between native rows'
                bottom = max(bottom, end)
            field = checked['parts'][-1]['firstPageFlowProbes'][-1]
            boxes = document[2].search_for(field['text'])
            assert boxes and bottom >= max(box.y1 for box in boxes), 'Rail ends before the first continuation entry'
            result['continuousRailPaint'] = 'pass'
        for page in document[2:]:
            margins = checked['parts'][-1]['contentBoxMm']
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip(): continue
                        box = fitz.Rect(span['bbox'])
                        assert box.x0 >= margins['left'] * (72 / 25.4) - 4 and box.x1 <= page.rect.width - margins['right'] * (72 / 25.4) + 4, 'Prefix text exceeds body width'
                        assert box.y0 >= margins['top'] * (72 / 25.4) - 4 and box.y1 <= page.rect.height - margins['bottom'] * (72 / 25.4) + 4, 'Prefix text exceeds body height'
        document[2].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
        return result


cases = json.loads((args.directory / 'heading-prefix-manifest.json').read_text())
assert len(cases) == 19, 'Bounded diagnostic matrix changed'
report = []
for value in cases:
    name = 'prefix-' + value['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['nativePrefix'] and fixture['diagnostic'] == value, 'Fixture manifest mismatch'
    source = args.directory / (name + '.docx')
    saved = args.directory / (name + '-saved.docx')
    pdf = args.directory / (name + '-render.pdf')
    reopened = args.directory / (name + '-reopened.pdf')
    check_package(source)
    convert(source, pdf, 'pdf')
    convert(source, saved, 'docx')
    check_package(saved, next_package=False)
    convert(saved, reopened, 'pdf')
    before = check_result(pdf, fixture)
    after = check_result(reopened, fixture)
    assert before == after, name + ': save/reopen changed diagnostic result'
    report.append({'fixture': name, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'package': 'pass', 'saveReopenPackage': 'pass', 'render': before, 'saveReopen': after})
    print(json.dumps(report[-1]), flush=True)
assert sum(case['render'].get('descriptionAttachment') == 'known-negative' for case in report) == 2
result = {'libreOfficeVersion': version, 'libreOfficeInterface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI',
          'cases': report, 'architectureAcceptance': 'metadata prefix verified on development engine; description attachment blocked at two boundaries',
          'productionChange': 'default composition unchanged; picture-before-later-span guard unchanged', 'microsoftWord': 'pending'}
(args.directory / 'heading-prefix-report.json').write_text(json.dumps(result, indent=2) + '\n')
print(result['architectureAcceptance'], flush=True)
