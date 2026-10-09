"""Bounded complete-cell floating carrier experiment; no source/saved XML repair or acceptance inference."""
import argparse
import copy
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
from docx_next_package_qa import check_package
from docx_next_raster_qa import pixel_digest
from docx_next_story_qa import native_stories, compare_native_stories, visible_story, text_value, sha

spec = importlib.util.spec_from_file_location('continuation', Path(__file__).with_name('docx-next-floating-continuation-qa.py'))
continuation = importlib.util.module_from_spec(spec); spec.loader.exec_module(continuation)
W = continuation.W


def document(path):
    with ZipFile(path) as archive:
        return ET.fromstring(archive.read('word/document.xml'))


def source_structure(control, source, owner_id, story_cells):
    before, after = document(control), document(source)
    original = list(before.find(W + 'body')); current = list(after.find(W + 'body'))
    side = next(node for node in original if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblpPr') is not None)
    matches = [node for node in current if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblCaption') is not None and node.find(W + 'tblPr/' + W + 'tblCaption').get(W + 'val') == owner_id]
    assert len(matches) == 1, 'Missing or duplicated declared complete floating carrier'
    carrier = matches[0]; rows = carrier.findall(W + 'tr')
    assert carrier.find(W + 'tblPr/' + W + 'tblpPr') is not None, 'Carrier must be floating'
    assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 3 and rows[0].find(W + 'trPr/' + W + 'cantSplit') is None and rows[0].find(W + 'trPr/' + W + 'trHeight') is None, 'Carrier must have one automatically splitting row and three cells'
    assert set(story_cells) == {'side', 'main'} and set(story_cells.values()) == {0, 2}, 'Invalid declared carrier cell stories'
    cells = rows[0].findall(W + 'tc')
    def semantic(nodes):
        return [ET.tostring(node) for node in nodes if node.tag not in (W + 'sectPr', W + 'tcPr') and not (node.tag == W + 'p' and not text_value(node) and not any(node.iter(W + 'drawing')) and not any(node.iter(W + 'sdt')))]
    assert not semantic(list(cells[1])), 'Gap cell cannot contain semantic story content'
    assert semantic(list(side.find(W + 'tr/' + W + 'tc'))) == semantic(list(cells[story_cells['side']])), 'Changed original complete side block structure'
    main = original[original.index(side) + 1:]
    assert semantic(main) == semantic(list(cells[story_cells['main']])), 'Changed original complete native main block structure'
    index = list(after.iter(W + 'tbl')).index(carrier)
    return {'status': 'pass', 'originalMainTables': sum(1 for node in main for _ in node.iter(W + 'tbl')),
            'originalMainParagraphs': sum(bool(text_value(p)) for node in main for p in node.iter(W + 'p')),
            'mainOwnerTableIndex': index, 'storyOwners': {label: {'table': index, 'row': 0, 'cell': cell} for label, cell in story_cells.items()},
            'sharedAutomaticFloatingCarrier': True}


def native_result(path, fixture, story_owners):
    root = document(path); tables = list(root.iter(W + 'tbl')); body = list(root.find(W + 'body'))
    floating = [table for table in tables if table.find(W + 'tblPr/' + W + 'tblpPr') is not None]
    assert len(floating) == 1 and {owner['table'] for owner in story_owners.values()} == {tables.index(floating[0])}, 'Changed complete floating carrier inventory'
    table = floating[0]; assert table in body, 'Lost top-level floating carrier'
    rows = table.findall(W + 'tr')
    assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 3 and rows[0].find(W + 'trPr/' + W + 'cantSplit') is None and rows[0].find(W + 'trPr/' + W + 'trHeight') is None, 'Lost automatically splitting carrier row'
    parents = {child: parent for parent in root.iter() for child in parent}
    controls = {}
    for node in root.iter(W + 'sdt'):
        tag = node.find(W + 'sdtPr/' + W + 'tag')
        if tag is not None:
            key = tag.get(W + 'val'); assert key not in controls, 'Duplicate native semantic ID'
            controls[key] = node
    paragraphs = []
    for field in fixture['nativeParagraphs']:
        marker = controls.get(field['fieldId']); assert marker is not None, 'Missing native paragraph ID'
        content = list(marker.iter(W + 'p'))
        if not content:
            ancestor = parents.get(marker)
            while ancestor is not None and ancestor.tag != W + 'p': ancestor = parents.get(ancestor)
            content = [] if ancestor is None else [ancestor]
        assert len(content) == 1, 'Fragmented native semantic paragraph'
        flags = {key: continuation.explicit_flag(content[0].find(W + 'pPr'), key) for key in field['flags']}
        assert flags == field['flags'], 'Changed explicit native paragraph policy'
        paragraphs.append({'fieldId': field['fieldId'], 'flags': flags, 'paragraphCount': 1})
    pr = table.find(W + 'tblPr'); position = pr.find(W + 'tblpPr')
    carrier = {'tableIndex': tables.index(table), 'position': {key: position.get(W + key) for key in ('tblpX', 'tblpY', 'vertAnchor', 'horzAnchor')},
               'distances': {key: int(position.get(W + key, '0')) for key in ('leftFromText', 'rightFromText', 'topFromText', 'bottomFromText')},
               'overlap': pr.find(W + 'tblOverlap').get(W + 'val') if pr.find(W + 'tblOverlap') is not None else None}
    with ZipFile(path) as archive: settings = ET.fromstring(archive.read('word/settings.xml'))
    policy = [node for node in settings.findall(W + 'compat/' + W + 'compatSetting') if node.get(W + 'name') == 'allowTextAfterFloatingTableBreak']
    assert len(policy) == 1 and policy[0].get(W + 'uri') == 'http://schemas.microsoft.com/office/word' and policy[0].get(W + 'val') in ('true', '1', 'on'), 'Changed native continuation setting'
    return {'paragraphs': paragraphs, 'carrier': carrier, 'storyOwners': story_owners, 'allPages': True}


def native_geometry(path):
    root = document(path); body = list(root.find(W + 'body'))
    side = next(node for node in body if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblpPr') is not None)
    tables = [table for block in body[body.index(side):] for table in block.iter(W + 'tbl')]
    return [{'width': int(table.find(W + 'tblPr/' + W + 'tblW').get(W + 'w')),
             'grid': [int(node.get(W + 'w')) for node in table.find(W + 'tblGrid')],
             'indent': int(table.find(W + 'tblPr/' + W + 'tblInd').get(W + 'w')) if table.find(W + 'tblPr/' + W + 'tblInd') is not None else 0,
             'rows': [{'cantSplit': row.find(W + 'trPr/' + W + 'cantSplit') is not None,
                       'cells': [int(cell.find(W + 'tcPr/' + W + 'tcW').get(W + 'w')) for cell in row.findall(W + 'tc')]} for row in table.findall(W + 'tr')]}
            for table in tables]


def failure_reasons(row):
    failures = continuation.candidate_failures(row)
    if row['wholeNativeStories']['status'] != 'pass': failures.append('whole-native-stories')
    if row['sourceGeometry'] != row['savedGeometry']: failures.append('all-native-table-exact-geometry')
    for phase in ('render', 'saveReopen'):
        if any(value['status'] != 'pass' for value in row['wholeVisibleStories'][phase].values()): failures.append(phase + '-whole-visible-stories')
    return failures


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for item in (a, b):
        item.pop('libreOfficeVersion', None); item.pop('stableComparison', None)
        for row in item['cases']: row.pop('savedDocxSha256', None)
    assert a == b, 'Changed complete-story source/native/pagination/pixel evidence or stop inventory'
    return {'status': 'pass', 'changedCases': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice'); engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true'); parser.add_argument('--baseline', type=Path)
    parser.add_argument('--observe', action='store_true')
    args = parser.parse_args(); executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='carrier-version-') as profile:
        version = subprocess.run([executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else []), capture_output=True, text=True, check=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version); version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    if args.require_stable: assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'
    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='carrier-profile-') as profile, tempfile.TemporaryDirectory(prefix='carrier-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())
    manifest = json.loads((args.directory / 'carrier-story-manifest.json').read_text())
    assert [(row['orientation'], row['kind']) for row in manifest] == [(orientation, kind) for orientation in ('left', 'right') for kind in ('left', 'side-long', 'both-long')]
    report = {'libreOfficeVersion': version, 'preparedSources': manifest, 'cases': [], 'earlyStop': None,
              'architectureAcceptance': 'blocked; original captions, geometry, opening, original-photo/chrome and Word gates remain', 'microsoftWord': 'pending'}
    for case in manifest:
        name = case['name']; source = args.directory / (name + '.docx'); control = args.directory / (name + '-control.docx')
        fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert fixture['diagnostic'] == {key: case[key] for key in fixture['diagnostic']}
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case['docxSha256']
        assert hashlib.sha256(control.read_bytes()).hexdigest() == case['controlDocxSha256']
        structure = source_structure(control, source, fixture['carrierOwnerId'], fixture['declaredStoryCells'])
        saved, pdf, reopened = [args.directory / (name + suffix) for suffix in ('-saved.docx', '-render.pdf', '-reopened.pdf')]
        check_package(source); source_native = native_result(source, fixture, structure['storyOwners'])
        geometry = native_geometry(source)
        widths = fixture['nativeColumnWidths']
        assert geometry[0]['grid'] == widths and geometry[0]['rows'][0]['cells'] == widths and geometry[0]['width'] == sum(widths), 'Changed declared original native lane edges'
        ids = [row['fieldId'] for row in fixture['nativeParagraphs']]
        source_stories = native_stories(source, ids, structure['storyOwners'])
        assert not source_stories['errors']
        for label in ('main', 'side'):
            assert len(source_stories['stories'][label]) > 1, 'Single paragraph cannot establish a complete independent story'
            assert [field['textSha256'] for field in source_stories['stories'][label]] == [sha(text) for text in fixture[label + 'Text']], 'Changed complete authored source story text/order'
        assert all(row['owners'][-1] == structure['storyOwners']['main'] for row in source_stories['stories']['main']), 'Main field escaped its complete owner'
        convert(source, pdf, 'pdf'); convert(source, saved, 'docx'); check_package(saved, next_package=False); convert(saved, reopened, 'pdf')
        saved_stories = native_stories(saved, ids, structure['storyOwners'])
        row = {'fixture': name, 'diagnostic': fixture['diagnostic'], 'docxSha256': case['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'sourceStructure': structure,
               'sourceNative': source_native, 'savedNative': native_result(saved, fixture, structure['storyOwners']),
               'sourceStories': source_stories, 'savedStories': saved_stories,
               'wholeNativeStories': compare_native_stories(source_stories, saved_stories),
               'sourceGeometry': geometry, 'savedGeometry': native_geometry(saved),
               'nativeIdentity': continuation.identity.audit(source, saved),
               'render': continuation.pdf_result(pdf, fixture), 'saveReopen': continuation.pdf_result(reopened, fixture),
               'wholeVisibleStories': {}, 'rasterPages': {}}
        for phase, path in [('render', pdf), ('saveReopen', reopened)]:
            row['rasterPages'][phase] = []; row['wholeVisibleStories'][phase] = {}
            with fitz.open(path) as pages:
                for label in ('main', 'side'):
                    lane = fixture[label + 'Lane']; margins = fixture['margins']; mm = 72 / 25.4
                    texts = [page.get_text(clip=fitz.Rect((lane['leftMm'] - .5) * mm, (margins['top'] - 3) * mm, (lane['rightMm'] + .5) * mm, page.rect.height - (margins['bottom'] - 3) * mm)) for page in pages[2:]]
                    row['wholeVisibleStories'][phase][label] = visible_story(fixture[label + 'Text'], texts)
                for index, page in enumerate(pages):
                    image = args.directory / f'{name}-{phase}-page-{index + 1:02}.png'; page.get_pixmap(alpha=False).save(image)
                    row['rasterPages'][phase].append(pixel_digest(image))
        row['candidateFailures'] = failure_reasons(row); report['cases'].append(row)
        print(json.dumps({'fixture': name, 'pages': row['render']['pages'], 'mainOpening': row['render']['tracks']['main']['openingCvPages'], 'wholeNative': row['wholeNativeStories']['status'], 'wholeVisible': row['wholeVisibleStories'], 'candidateFailures': row['candidateFailures']}), flush=True)
        if row['candidateFailures']:
            report['earlyStop'] = {'fixture': name, 'reasons': row['candidateFailures'], 'unrenderedCases': [pending['name'] for pending in manifest[len(report['cases']):]]}; break
    report['actualCases'] = len(report['cases']); report['actualDossierPages'] = sum(row['render']['pages'] for row in report['cases'])
    target = args.directory / 'carrier-story-report.json'; target.write_text(json.dumps(report, indent=2) + '\n')
    if args.baseline:
        report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
        target.write_text(json.dumps(report, indent=2) + '\n')
    elif not args.observe:
        assert report['earlyStop'] is None, 'Rejected complete-story candidate; actual evidence retained, matrix stopped'


if __name__ == '__main__': main()
