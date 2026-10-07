"""Measure four reviewed populated-track failures; green diagnostics never imply product acceptance."""
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
CASES = [(orientation, policy) for orientation in ('left', 'right') for policy in ('grid', 'split-attached')]


def package_result(source, fixture, saved=False):
    check_package(source, next_package=not saved)
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    fields = {}
    for node in root.iter(W + 'sdt'):
        tag = node.find(W + 'sdtPr/' + W + 'tag')
        if tag is not None:
            identity = tag.get(W + 'val')
            assert identity not in fields, 'Duplicate native field ' + identity
            fields[identity] = compact(''.join(text.text or '' for text in node.iter(W + 't')))
    assert len(fixture['completeFields']) == 10
    for field in fixture['completeFields']:
        assert fields.get(field['fieldId']) == compact(field['text']), 'Lost complete native field ' + field['fieldId']
    if not saved:
        tables = [table for table in root.iter(W + 'tbl')
                  if (caption := table.find(W + 'tblPr/' + W + 'tblCaption')) is not None
                  and caption.get(W + 'val') == fixture['tableId']]
        assert len(tables) == 1
        rows = tables[0].findall(W + 'tr')
        assert len(rows) == len(fixture['cellEndKeepNext'])
        main, side = (track['cell'] for track in fixture['tracks'])
        assert main != side and {main, side} == {0, 2}
        for index, row in enumerate(rows):
            assert (row.find(W + 'trPr/' + W + 'cantSplit') is not None) == fixture['rowKeepTogether'][index]
            cells = row.findall(W + 'tc')
            assert len(cells) == 3
            for cell, flag in zip(cells, fixture['cellEndKeepNext'][index]):
                ending = list(cell)[-1]
                assert ending.tag == W + 'p' and not list(ending.iter(W + 't'))
                keep = ending.find(W + 'pPr/' + W + 'keepNext')
                assert (keep is None) if flag is None else (keep is not None and keep.get(W + 'val') == str(int(flag)))
        owned_side = [tag.get(W + 'val') for tag in rows[0].findall(W + 'tc')[side].iter(W + 'tag')]
        assert owned_side == [field['fieldId'] for field in fixture['tracks'][1]['fields']]
        if len(rows) == 3:
            assert [tag.get(W + 'val') for tag in rows[1].findall(W + 'tc')[main].iter(W + 'tag')] == fixture['openingFieldIds']
            assert [tag.get(W + 'val') for tag in rows[2].findall(W + 'tc')[main].iter(W + 'tag')] == [fixture['tracks'][0]['fields'][-1]['fieldId']]
    return {'completeNativeFields': 'pass', 'nativeOwnership': 'source-only' if saved else 'pass'}


def render_result(pdf, fixture, observe=False):
    scale = 72 / 25.4
    with fitz.open(pdf) as document:
        assert len(document) >= 3
        margins = fixture['contentBoxMm']
        tracks = []
        for track in fixture['tracks']:
            lane = track['lane']
            clips = [fitz.Rect((lane['leftMm'] - .5) * scale, (margins['top'] - 3) * scale,
                              (lane['rightMm'] + .5) * scale, page.rect.height - (margins['bottom'] - 3) * scale)
                     for page in document[2:]]
            texts = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
            text = ''.join(texts)
            missing = [field['fieldId'] for field in track['fields'] if compact(field['text']) not in text]
            positions, metrics = [], []
            for index, field in enumerate(track['fields']):
                matches = [i for i, value in enumerate(texts) if compact(field['openingText']) in value]
                assert matches, 'Missing reviewed field opening ' + field['fieldId']
                positions.append(matches[0] + 1)
                if index < 4:
                    assert len(matches) == 1, 'Ambiguous metadata ' + field['fieldId']
                    boxes = document[matches[0] + 2].search_for(field['text'], clip=clips[matches[0]])
                    assert boxes, 'Missing metadata glyphs ' + field['fieldId']
                    metrics.append({'fieldId': field['fieldId'], 'boxes': [{'leftPt': box.x0, 'widthPt': box.width} for box in boxes]})
            if not observe:
                assert missing == track['expectedMissingFields'], 'Changed reviewed full-text failure ' + fixture['fixture'] + ' ' + str(missing)
                assert positions == track['expectedOpeningCvPages'], 'Changed reviewed opening pages ' + fixture['fixture']
            expected = compact(''.join(field['text'] for field in track['fields']))
            tracks.append({'role': track['role'], 'fullTextVisible': not missing, 'missingFields': missing,
                           'openingCvPages': positions, 'openingAttachment': len(set(positions)) == 1,
                           'expectedCharacters': len(expected), 'visibleCharacters': len(text),
                           'visibleTextSha256': hashlib.sha256(text.encode()).hexdigest(), 'metadataMetrics': metrics})
        outside_body, outside_lanes = 0, 0
        for page in document[2:]:
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip(): continue
                        box = fitz.Rect(span['bbox'])
                        outside_body += int(not (box.y0 >= margins['top'] * scale - 4 and box.y1 <= page.rect.height - margins['bottom'] * scale + 4))
                        outside_lanes += int(not any(box.x0 >= track['lane']['leftMm'] * scale - 2 and box.x1 <= track['lane']['rightMm'] * scale + 2 for track in fixture['tracks']))
        if not observe:
            assert len(document) == fixture['expectedPages'], 'Changed reviewed dossier page count'
            assert {'outsideBody': outside_body, 'outsideLanes': outside_lanes} == fixture['expectedBoundsFailures'], 'Changed reviewed visible bounds failures'
        document[tracks[0]['openingCvPages'][0] + 1].get_pixmap().save(pdf.with_suffix('.png'))
        failures = ([{'gate': 'completePdfText', 'role': track['role'], 'missingFields': track['missingFields']} for track in tracks if not track['fullTextVisible']]
                    + [{'gate': 'openingAttachment', 'role': track['role']} for track in tracks if not track['openingAttachment']])
        if outside_body or outside_lanes:
            failures.append({'gate': 'visibleBounds', 'outsideBody': outside_body, 'outsideLanes': outside_lanes})
        return {'pages': len(document), 'tracks': tracks, 'visibleBounds': 'fail' if outside_body or outside_lanes else 'pass',
                'boundsFailures': {'outsideBody': outside_body, 'outsideLanes': outside_lanes},
                'productGates': 'fail' if failures else 'pass', 'failures': failures}


def same_metrics(left, right):
    assert [field['fieldId'] for field in left] == [field['fieldId'] for field in right]
    for old, new in zip(left, right):
        assert len(old['boxes']) == len(new['boxes']), 'Changed metadata wrapping'
        for a, b in zip(old['boxes'], new['boxes']):
            assert abs(a['leftPt'] - b['leftPt']) < .6 and abs(a['widthPt'] - b['widthPt']) < .6, 'Changed physical glyph geometry'


def compare_baseline(recorded, observed):
    previous = {case['fixture']: case for case in recorded['cases']}
    current = {case['fixture']: case for case in observed['cases']}
    assert len(previous) == len(current) == len(recorded['cases']) == len(observed['cases']) == 4 and previous.keys() == current.keys(), 'Changed bounded matrix'
    for name, now in current.items():
        before = previous[name]
        assert now['docxSha256'] == before['docxSha256'], 'Changed candidate package ' + name
        for phase in ('render', 'saveReopen'):
            a, b = before[phase], now[phase]
            assert {k: v for k, v in a.items() if k != 'tracks'} == {k: v for k, v in b.items() if k != 'tracks'}, 'Changed product gate ' + name
            assert len(a['tracks']) == len(b['tracks']) == 2
            for old, new in zip(a['tracks'], b['tracks']):
                assert {k: v for k, v in old.items() if k != 'metadataMetrics'} == {k: v for k, v in new.items() if k != 'metadataMetrics'}, 'Changed visible track evidence ' + name
                same_metrics(old['metadataMetrics'], new['metadataMetrics'])
    return {'sameSourcePackages': True, 'changedCases': 0, 'productGates': 'fail: reviewed failures reproduced'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--observe', action='store_true', help='Record actual PDF failures; native data gates stay mandatory and product failures stay explicit')
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='docx-next-populated-version-') as profile:
        command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
        version = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    assert version
    if args.libreofficekit:
        info = json.loads(version)
        version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    if args.require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'

    def convert(source, destination, format):
        with tempfile.TemporaryDirectory(prefix='docx-next-populated-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-populated-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            destination.write_bytes(exported.read_bytes())

    cases = json.loads((args.directory / 'populated-row-manifest.json').read_text())
    assert [(case['orientation'], case['policy']) for case in cases] == CASES and all(case['leadMm'] == 220 for case in cases)
    assert len({case['name'] for case in cases}) == 4
    report = []
    for case in cases:
        name = case['name']; fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert fixture['diagnostic'] == case
        source = args.directory / (name + '.docx'); saved = args.directory / (name + '-saved.docx')
        pdf = args.directory / (name + '-render.pdf'); reopened = args.directory / (name + '-reopened.pdf')
        native = package_result(source, fixture); convert(source, pdf, 'pdf'); convert(source, saved, 'docx')
        saved_native = package_result(saved, fixture, saved=True); convert(saved, reopened, 'pdf')
        before, after = render_result(pdf, fixture, args.observe), render_result(reopened, fixture, args.observe)
        for a, b in zip(before['tracks'], after['tracks']):
            same_metrics(a['metadataMetrics'], b['metadataMetrics'])
            assert {k: v for k, v in a.items() if k != 'metadataMetrics'} == {k: v for k, v in b.items() if k != 'metadataMetrics'}, 'Save/reopen changes track evidence'
        assert {k: v for k, v in before.items() if k != 'tracks'} == {k: v for k, v in after.items() if k != 'tracks'}
        report.append({'fixture': name, 'diagnostic': case, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'package': native, 'saveReopenPackage': saved_native, 'render': before, 'saveReopen': after})
        print(json.dumps({'fixture': name, 'pages': before['pages'], 'productGates': before['productGates'], 'failures': before['failures'], 'completeNativeFields': 'pass', 'saveReopen': 'same'}), flush=True)
    for orientation in ('left', 'right'):
        group = [case for case in report if case['diagnostic']['orientation'] == orientation]
        for phase in ('render', 'saveReopen'):
            for a, b in zip(group[0][phase]['tracks'], group[1][phase]['tracks']): same_metrics(a['metadataMetrics'], b['metadataMetrics'])
    result = {'libreOfficeVersion': version, 'cases': report, 'architectureAcceptance': 'blocked: populated-track opening/text failures; no export enablement', 'earlyStop': 'four cases at 220 mm; further boundaries/photos/spans/chrome not expanded', 'microsoftWord': 'pending'}
    if args.baseline: result['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text()), result)
    (args.directory / 'populated-row-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ('architectureAcceptance', 'stableComparison') if key in result}), flush=True)


if __name__ == '__main__': main()
