"""Measure bounded populated-track controls; green diagnostics never imply product acceptance."""
import argparse
import hashlib
import importlib.util
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
from docx_next_attachment_qa import attachment_audit

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
CASES = [(orientation, policy) for orientation in ('left', 'right') for policy in ('grid', 'split-attached')]
MAIN_ENDING_CASES = [(orientation, scope) for orientation in ('left', 'right') for scope in ('all-cells', 'main-only')]
SIDE_TERMINAL_CASES = [(orientation, variant) for orientation in ('right', 'left')
                       for variant in ('detached', 'semantic-only', 'ending-only')]
SIDE_ENDING_CASES = [(orientation, flag) for orientation in ('right', 'left') for flag in (False, True)]
LEAD_TOGETHER_CASES = [(orientation, flag) for orientation in ('right', 'left') for flag in (True, False)]
LEAD_PADDING_CASES = [(orientation, value) for orientation in ('right', 'left') for value in ('paragraph', 'cell-padding')]
LEAD_BOUNDARY_CASES = [(orientation, height) for orientation in ('right', 'left') for height in (220, 0)]
LEAD_WINDOW_CASES = [(orientation, height) for orientation in ('right', 'left') for height in (220, 205, 210, 215)]
DESCRIPTION_OWNER_CASES = [(orientation, owner) for orientation in ('right', 'left') for owner in ('tail-cell', 'opening-cell')]
MATRICES = {
    'populated-row': ('policy', CASES),
    'main-ending': ('scope', MAIN_ENDING_CASES),
    'row-together': ('keepTogether', [(orientation, flag) for orientation in ('left', 'right') for flag in (True, False)]),
    'side-terminal': ('variant', SIDE_TERMINAL_CASES),
    'side-ending': ('sideEndingKeepNext', SIDE_ENDING_CASES),
    'lead-together': ('leadKeepTogether', LEAD_TOGETHER_CASES),
    'lead-main-ending': ('mainLeadEndingKeepNext', [(orientation, flag) for orientation in ('right', 'left') for flag in (False, True)]),
    'lead-padding': ('leadRepresentation', LEAD_PADDING_CASES),
    'lead-boundary': ('leadMm', LEAD_BOUNDARY_CASES),
    'lead-window': ('leadMm', LEAD_WINDOW_CASES),
    'description-owner': ('descriptionOwner', DESCRIPTION_OWNER_CASES),
    'split-description-owner': ('descriptionOwner', DESCRIPTION_OWNER_CASES),
    'nested-side': ('sideComposition', [(orientation, composition) for orientation in ('right', 'left') for composition in ('direct', 'nested')]),
}
ISOLATED_MATRICES = ('side-terminal', 'side-ending', 'lead-together', 'lead-main-ending', 'lead-padding', 'lead-boundary', 'lead-window', 'description-owner', 'split-description-owner', 'nested-side')


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
        if 'leadTopPaddingMm' in fixture:
            lead_cell = rows[0].findall(W + 'tc')[main]
            top = lead_cell.find(W + 'tcPr/' + W + 'tcMar/' + W + 'top')
            assert top is not None and top.get(W + 'type') == 'dxa'
            assert int(top.get(W + 'w')) == round(fixture['leadTopPaddingMm'] * 1440 / 25.4), 'Changed authored lead cell padding'
            spacers = list(lead_cell.iter(W + 'spacing'))
            lines = [int(node.get(W + 'line', '0')) for node in spacers if node.get(W + 'lineRule') == 'exact']
            expected_line = round(fixture['leadSpacerMm'] * 1440 / 25.4)
            assert (expected_line in lines) if expected_line else all(line < 100 for line in lines), 'Changed authored lead paragraph'
            if 'leadSpacerFieldId' in fixture:
                spacer = [node for node in lead_cell.iter(W + 'sdt') if
                          node.find(W + 'sdtPr/' + W + 'tag').get(W + 'val') == fixture['leadSpacerFieldId']]
                assert len(spacer) == 1, 'Changed lead paragraph ownership'
                spacing = spacer[0].find('.//' + W + 'pPr/' + W + 'spacing')
                assert spacing is not None and spacing.get(W + 'lineRule') == 'exact'
                assert int(spacing.get(W + 'line')) == max(1, expected_line), 'Changed exact lead paragraph height'
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
        if 'sideComposition' in fixture:
            side_cell = rows[0].findall(W + 'tc')[side]
            inner = side_cell.findall(W + 'tbl')
            assert len(inner) == (1 if fixture['sideComposition'] == 'nested' else 0), 'Changed nested side owner'
            if inner:
                assert inner[0].find(W + 'tblPr/' + W + 'tblCaption').get(W + 'val') == fixture['nestedTableId']
                width = inner[0].find(W + 'tblPr/' + W + 'tblW')
                assert width.get(W + 'type') == 'dxa' and int(width.get(W + 'w')) == round(fixture['innerWidthMm'] * 1440 / 25.4)
                inner_rows = inner[0].findall(W + 'tr')
                assert len(inner_rows) == 1 and inner_rows[0].find(W + 'trPr/' + W + 'cantSplit') is None
                inner_cells = inner_rows[0].findall(W + 'tc')
                assert len(inner_cells) == 1
                ending = list(inner_cells[0])[-1]
                assert ending.tag == W + 'p' and not list(ending.iter(W + 't'))
                assert ending.find(W + 'pPr/' + W + 'keepNext').get(W + 'val') == '0'
        if 'sideTerminalFieldId' in fixture:
            terminal = next(node for node in root.iter(W + 'sdt')
                            if node.find(W + 'sdtPr/' + W + 'tag').get(W + 'val') == fixture['sideTerminalFieldId'])
            keep = terminal.find('.//' + W + 'pPr/' + W + 'keepNext')
            assert keep is not None and keep.get(W + 'val') == str(int(fixture['sideSemanticKeepNext'])), 'Changed semantic terminal flag'
        if len(rows) == 3:
            if 'mainNativeFieldRows' in fixture:
                identities = {field['fieldId'] for field in fixture['completeFields']}
                owned_main = [[tag.get(W + 'val') for tag in row.findall(W + 'tc')[main].iter(W + 'tag')
                               if tag.get(W + 'val') in identities] for row in rows]
                assert owned_main == fixture['mainNativeFieldRows'], 'Changed main native field ownership'
            else:
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
    count = len(recorded['cases'])
    if recorded.get('matrix') in ISOLATED_MATRICES:
        assert recorded['matrix'] == observed.get('matrix'), 'Changed terminal matrix identity'
        assert recorded['plannedCases'] == observed.get('plannedCases'), 'Changed planned terminal matrix'
        assert recorded['earlyStop'] == observed.get('earlyStop'), 'Changed terminal stop condition'
        planned = recorded['plannedCases']
        if recorded['matrix'] == 'lead-main-ending' and 'leadMainEndingRasterIdentity' in recorded:
            assert recorded['leadMainEndingRasterIdentity'] == observed.get('leadMainEndingRasterIdentity'), 'Changed main-lead page pixels'
        column, expected = MATRICES[recorded['matrix']]
        assert [(case['orientation'], case[column]) for case in planned] == expected, 'Changed planned terminal matrix'
        if recorded['matrix'] != 'side-terminal':
            assert all(not case['sideSemanticKeepNext'] for case in planned), 'Changed semantic tail attachment'
        assert list(previous) == [case['name'] for case in planned[:count]], 'Changed stopped terminal prefix'
        if isinstance(recorded['earlyStop'], dict):
            assert (1 <= count <= 4 if recorded['matrix'] == 'lead-window' else count == 2), 'Changed terminal stop condition'
            assert recorded['earlyStop']['fixture'] == planned[count - 1]['name'], 'Changed terminal stop condition'
            assert recorded['cases'][-1]['render']['productGates'] == 'fail', 'Lost terminal counterexample'
        else:
            assert recorded['matrix'] != 'side-terminal' and count == len(expected), 'Changed bounded matrix'
    else:
        assert count == 4, 'Changed bounded matrix'
    assert len(previous) == len(current) == len(observed['cases']) == count and previous.keys() == current.keys(), 'Changed bounded matrix'
    for name, now in current.items():
        before = previous[name]
        assert now['diagnostic'] == before['diagnostic'], 'Changed candidate flags ' + name
        assert now['docxSha256'] == before['docxSha256'], 'Changed candidate package ' + name
        if recorded.get('matrix') == 'lead-main-ending':
            assert now['nativeIdentity'] == before['nativeIdentity'], 'Changed native identity/caption evidence'
            assert now['nativeAttachment'] == before['nativeAttachment'], 'Changed native paragraph/attachment evidence'
        for phase in ('render', 'saveReopen'):
            a, b = before[phase], now[phase]
            assert {k: v for k, v in a.items() if k != 'tracks'} == {k: v for k, v in b.items() if k != 'tracks'}, 'Changed product gate ' + name
            assert len(a['tracks']) == len(b['tracks']) == 2
            for old, new in zip(a['tracks'], b['tracks']):
                assert {k: v for k, v in old.items() if k != 'metadataMetrics'} == {k: v for k, v in new.items() if k != 'metadataMetrics'}, 'Changed visible track evidence ' + name
                same_metrics(old['metadataMetrics'], new['metadataMetrics'])
    failed = any(case[phase]['productGates'] == 'fail' for case in observed['cases'] for phase in ('render', 'saveReopen'))
    return {'sameSourcePackages': True, 'changedCases': 0,
            'productGates': 'fail: reviewed failures reproduced' if failed else 'pass: bounded controls only'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--matrix', choices=tuple(MATRICES), default='populated-row')
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

    cases = json.loads((args.directory / (args.matrix + '-manifest.json')).read_text())
    baseline = json.loads(args.baseline.read_text()) if args.baseline else None
    column, expected = MATRICES[args.matrix]
    assert [(case['orientation'], case[column]) for case in cases] == expected
    if args.matrix not in ('lead-boundary', 'lead-window'): assert all(case['leadMm'] == 220 for case in cases)
    if args.matrix == 'main-ending':
        assert all(case['policy'] == 'split-attached' for case in cases)
    assert len({case['name'] for case in cases}) == len(expected)
    report = []
    for case in cases:
        name = case['name']; fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert fixture['diagnostic'] == case
        if args.matrix in ('main-ending', 'row-together', *ISOLATED_MATRICES):
            main_cell = fixture['tracks'][0]['cell']
            opening = [case['scope'] == 'all-cells' or cell == main_cell for cell in range(3)]
            lead = [False] * 3
            if args.matrix in ISOLATED_MATRICES:
                assert case['scope'] == 'main-only' and case['policy'] == 'split-attached'
                assert case['sideSemanticKeepNext'] == (case['variant'] == 'semantic-only')
                assert case['sideEndingKeepNext'] == (case['variant'] == 'ending-only')
                assert fixture['sideSemanticKeepNext'] == case['sideSemanticKeepNext']
                lead[fixture['tracks'][1]['cell']] = case['sideEndingKeepNext']
                if args.matrix == 'lead-main-ending':
                    lead[main_cell] = case['mainLeadEndingKeepNext']
                opening_row = False if args.matrix == 'split-description-owner' else True
                assert fixture['rowKeepTogether'] == [case['leadKeepTogether'] if args.matrix == 'lead-together' else True, opening_row, False]
                if args.matrix == 'split-description-owner': assert case['openingKeepTogether'] is False
                if args.matrix != 'side-terminal': assert not case['sideSemanticKeepNext']
                if args.matrix in ('lead-together', 'lead-main-ending', 'lead-padding', 'lead-boundary', 'lead-window', 'description-owner', 'split-description-owner', 'nested-side'): assert not case['sideEndingKeepNext']
            assert fixture['cellEndKeepNext'] == [lead, opening, [False] * 3]
        if args.matrix == 'lead-padding':
            assert fixture['authoredLeadMm'] == fixture['leadSpacerMm'] + fixture['leadTopPaddingMm'] == 220
            assert fixture['leadTopPaddingMm'] == (220 if case['leadRepresentation'] == 'cell-padding' else 0)
        if args.matrix in ('lead-boundary', 'lead-window'):
            assert fixture['authoredLeadMm'] == fixture['leadSpacerMm'] == case['leadMm']
            assert fixture['leadTopPaddingMm'] == 0
        if args.matrix in ('description-owner', 'split-description-owner'):
            intro = fixture['openingFieldIds']; description = fixture['tracks'][0]['fields'][-1]['fieldId']
            assert fixture['mainNativeFieldRows'] == [[], intro + ([description] if case['descriptionOwner'] == 'opening-cell' else []),
                                                     [] if case['descriptionOwner'] == 'opening-cell' else [description]]
        if args.matrix == 'row-together':
            assert fixture['rowKeepTogether'] == [True, case['keepTogether'], False]
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
        if args.matrix == 'lead-main-ending':
            spec = importlib.util.spec_from_file_location('identity', Path(__file__).with_name('docx-next-native-identity-qa.py'))
            identity = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(identity)
            report[-1]['nativeIdentity'] = identity.audit(source, saved)
            assert report[-1]['nativeIdentity']['fieldIdentity'] == report[-1]['nativeIdentity']['completeNativeText'] == 'pass', 'Native semantic ID/text loss'
            report[-1]['nativeAttachment'] = attachment_audit(source, saved, fixture)
        print(json.dumps({'fixture': name, 'pages': before['pages'], 'productGates': before['productGates'], 'failures': before['failures'], 'completeNativeFields': 'pass', 'saveReopen': 'same'}), flush=True)
        if args.matrix in ISOLATED_MATRICES and case['orientation'] == 'right' and before['productGates'] != 'pass':
            result = {'libreOfficeVersion': version, 'matrix': args.matrix, 'plannedCases': cases, 'cases': report,
                      'architectureAcceptance': 'blocked: positive right control regressed; no export enablement',
                      'earlyStop': {'fixture': name, 'reason': 'positive right control regressed',
                                    'unrenderedCases': [pending['name'] for pending in cases[len(report):]]},
                      'microsoftWord': 'pending'}
            report_file = args.directory / (args.matrix + '-report.json')
            report_file.write_text(json.dumps(result, indent=2) + '\n')
            if baseline:
                result['stableComparison'] = compare_baseline(baseline, result)
            report_file.write_text(json.dumps(result, indent=2) + '\n')
            if baseline:
                print(json.dumps({'architectureAcceptance': result['architectureAcceptance'],
                                  'stableComparison': result['stableComparison'], 'earlyStop': result['earlyStop']}), flush=True)
                return
            raise AssertionError('Positive right control regressed; retained actual evidence and stopped')
        if args.matrix in ISOLATED_MATRICES and baseline and isinstance(baseline['earlyStop'], dict) and name == baseline['earlyStop']['fixture']:
            raise AssertionError('Changed terminal stop condition; expected counterexample did not reproduce')
    for orientation in ('left', 'right'):
        group = [case for case in report if case['diagnostic']['orientation'] == orientation]
        for phase in ('render', 'saveReopen'):
            for candidate in group[1:]:
                for a, b in zip(group[0][phase]['tracks'], candidate[phase]['tracks']): same_metrics(a['metadataMetrics'], b['metadataMetrics'])
    result = {'libreOfficeVersion': version, 'cases': report, 'architectureAcceptance': 'blocked: populated-track opening/text failures; no export enablement', 'earlyStop': 'four cases at 220 mm; further boundaries/photos/spans/chrome not expanded', 'microsoftWord': 'pending'}
    if args.matrix == 'main-ending':
        for orientation in ('left', 'right'):
            group = [case for case in report if case['diagnostic']['orientation'] == orientation]
            for phase in ('render', 'saveReopen'):
                a, b = group[0][phase], group[1][phase]
                assert {k: v for k, v in a.items() if k != 'tracks'} == {k: v for k, v in b.items() if k != 'tracks'}, 'Changed reviewed attachment-scope effect'
                for old, new in zip(a['tracks'], b['tracks']):
                    assert {k: v for k, v in old.items() if k != 'metadataMetrics'} == {k: v for k, v in new.items() if k != 'metadataMetrics'}, 'Changed reviewed scope text/opening evidence'
                if orientation == 'right':
                    assert a['productGates'] == b['productGates'] == 'pass', 'Positive right control regressed'
        result['architectureAcceptance'] = 'blocked: left populated opening remains detached; no export enablement'
        result['attachmentScopeEffect'] = 'none observed: all-cell and main-only endings have identical reviewed visible results'
    if args.matrix == 'row-together':
        for orientation in ('left', 'right'):
            group = [case for case in report if case['diagnostic']['orientation'] == orientation]
            for phase in ('render', 'saveReopen'):
                a, b = group[0][phase], group[1][phase]
                assert {k: v for k, v in a.items() if k != 'tracks'} == {k: v for k, v in b.items() if k != 'tracks'}, 'Changed reviewed cantSplit effect'
                for old, new in zip(a['tracks'], b['tracks']):
                    assert {k: v for k, v in old.items() if k != 'metadataMetrics'} == {k: v for k, v in new.items() if k != 'metadataMetrics'}, 'Changed reviewed row text/opening evidence'
                assert a['productGates'] == ('fail' if orientation == 'left' else 'pass')
        result['architectureAcceptance'] = 'blocked: left populated opening remains detached; no export enablement'
        result['rowTogetherEffect'] = 'none observed: short-row cantSplit has identical reviewed visible results'
    if args.matrix == 'side-terminal':
        result['architectureAcceptance'] = 'blocked: bounded side-terminal experiment; no export enablement'
        result['earlyStop'] = 'six isolated controls at 220 mm; no combined flags or boundary/photo/span/chrome expansion'
        result['sideTerminalEffect'] = {
            orientation: [case['fixture'] for case in report
                          if case['diagnostic']['orientation'] == orientation and
                          any(case[phase] != next(base[phase] for base in report
                              if base['diagnostic']['orientation'] == orientation and base['diagnostic']['variant'] == 'detached')
                              for phase in ('render', 'saveReopen'))]
            for orientation in ('left', 'right')}
    if args.matrix == 'side-ending':
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded empty side-cell ending experiment; no export enablement'
        result['earlyStop'] = 'four controls at 220 mm; semantic side tail remains false; no boundary/photo/span/chrome expansion'
        result['identicalSideEndingObservations'] = {orientation: report[index]['render'] == report[index + 1]['render']
                                    and report[index]['saveReopen'] == report[index + 1]['saveReopen']
                                    for orientation, index in (('right', 0), ('left', 2))}
    if args.matrix == 'lead-together':
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded lead-row cantSplit experiment; no export enablement'
        result['earlyStop'] = 'four lead-row controls at 220 mm; short opening row and terminal flags unchanged'
        result['identicalLeadRowObservations'] = {orientation: report[index]['render'] == report[index + 1]['render']
                                                and report[index]['saveReopen'] == report[index + 1]['saveReopen']
                                                for orientation, index in (('right', 0), ('left', 2))}
    if args.matrix == 'lead-main-ending':
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded main-lead empty-ending diagnostic; caption/grid/Word requirements unchanged'
        result['earlyStop'] = 'four main-lead ending controls at 220 mm; all semantic ownership and other flags unchanged'
        result['identicalMainLeadEndingObservations'] = {orientation: report[index]['render'] == report[index + 1]['render']
                                                       and report[index]['saveReopen'] == report[index + 1]['saveReopen']
                                                       for orientation, index in (('right', 0), ('left', 2))}
        result['leadMainEndingRasterIdentity'] = {}
        for orientation, index in [('right', 0), ('left', 2)]:
            phases = {}
            for phase, suffix in [('render', '-render.pdf'), ('saveReopen', '-reopened.pdf')]:
                with fitz.open(args.directory / (report[index]['fixture'] + suffix)) as before, fitz.open(args.directory / (report[index + 1]['fixture'] + suffix)) as after:
                    same = len(before) == len(after) and all(a.get_pixmap(alpha=False).samples == b.get_pixmap(alpha=False).samples for a, b in zip(before, after))
                phases[phase] = 'pass' if same else 'fail'
            result['leadMainEndingRasterIdentity'][orientation] = phases
    if args.matrix == 'lead-padding':
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded lead representation experiment; no export enablement'
        result['earlyStop'] = 'four equivalent authored 220 mm lead controls; all attachment and row flags unchanged'
        result['identicalLeadRepresentationObservations'] = {orientation: report[index]['render'] == report[index + 1]['render']
                                                            and report[index]['saveReopen'] == report[index + 1]['saveReopen']
                                                            for orientation, index in (('right', 0), ('left', 2))}
    if args.matrix in ('lead-boundary', 'lead-window'):
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = ('blocked: bounded 220/zero lead diagnostic; no export enablement' if args.matrix == 'lead-boundary'
                                            else 'blocked: bounded lead-height window diagnostic; no export enablement')
        result['earlyStop'] = ('four' if args.matrix == 'lead-boundary' else 'eight') + ' lead-height controls; no other paragraph, row, ownership or terminal flags changed'
        result['leadBoundaryGates'] = {orientation: [{
            'leadMm': case['diagnostic']['leadMm'], 'productGates': case['render']['productGates'],
            'mainOpeningCvPages': case['render']['tracks'][0]['openingCvPages'],
            'sideOpeningCvPages': case['render']['tracks'][1]['openingCvPages']}
            for case in report if case['diagnostic']['orientation'] == orientation]
            for orientation in ('right', 'left')}
    if args.matrix in ('description-owner', 'split-description-owner'):
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded main-description ownership diagnostic; no export enablement'
        result['earlyStop'] = 'four ownership controls at 220 mm; all paragraph, row, side span and terminal flags unchanged'
        if args.matrix == 'split-description-owner':
            result['architectureAcceptance'] = 'blocked: bounded split-row main-description ownership diagnostic; no export enablement'
            result['earlyStop'] = 'four ownership controls at 220 mm; opening row false in both controls; all other flags unchanged'
    if args.matrix == 'nested-side':
        result.update(matrix=args.matrix, plannedCases=cases)
        result['architectureAcceptance'] = 'blocked: bounded nested side composition diagnostic; no export enablement'
        result['earlyStop'] = 'four side composition controls at 220 mm; outer span, main owners and all existing flags unchanged'
    if baseline: result['stableComparison'] = compare_baseline(baseline, result)
    (args.directory / (args.matrix + '-report.json')).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: result[key] for key in ('architectureAcceptance', 'stableComparison') if key in result}), flush=True)


if __name__ == '__main__': main()
