"""Bounded adjacent complete floating-owner experiment; no source/saved XML repair or acceptance inference."""
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


def source_structure(control, source, owner_id):
    before, after = document(control), document(source)
    a, b = list(before.find(W + 'body')), list(after.find(W + 'body'))
    def declared(nodes, key):
        matches = [node for node in nodes if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblCaption') is not None and node.find(W + 'tblPr/' + W + 'tblCaption').get(W + 'val') == key]
        assert len(matches) == 1, 'Missing or duplicated declared complete native owner'
        return matches[0]
    main_before, main_after = declared(a, owner_id), declared(b, owner_id)
    side_before = next(node for node in a if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblpPr') is not None)
    side_after = declared(b, side_before.find(W + 'tblPr/' + W + 'tblCaption').get(W + 'val'))
    assert ET.tostring(side_before) == ET.tostring(side_after), 'Changed original complete side block structure'
    assert b.index(main_after) == b.index(side_after) + 1, 'Complete floating owners must be directly adjacent'
    for node in (side_after, main_after):
        assert node.find(W + 'tblPr/' + W + 'tblpPr') is not None, 'Each complete owner must be floating'
        rows = node.findall(W + 'tr')
        assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 1 and rows[0].find(W + 'trPr/' + W + 'cantSplit') is None and rows[0].find(W + 'trPr/' + W + 'trHeight') is None, 'Each complete story must have one automatically splittable cell'
    original, current = main_before.find(W + 'tr/' + W + 'tc'), main_after.find(W + 'tr/' + W + 'tc')
    assert ET.tostring(original) == ET.tostring(current), 'Changed original complete native main block structure'
    previous = main_before.find(W + 'tblPr'); present = main_after.find(W + 'tblPr')
    assert [ET.tostring(node) for node in previous] == [ET.tostring(node) for node in present if node.tag not in (W + 'tblpPr', W + 'tblOverlap')], 'Changed original complete owner properties'
    assert ET.tostring(main_before.find(W + 'tblGrid')) == ET.tostring(main_after.find(W + 'tblGrid')), 'Changed original complete owner grid'
    return {'status': 'pass', 'originalMainTables': len(list(original.iter(W + 'tbl'))),
            'originalMainParagraphs': sum(bool(text_value(p)) for p in original.iter(W + 'p')),
            'mainOwnerTableIndex': list(after.iter(W + 'tbl')).index(main_after),
            'storyOwners': {label: list(after.iter(W + 'tbl')).index(node) for label, node in [('side', side_after), ('main', main_after)]},
            'directlyAdjacentFloatingOwners': True}


def native_result(path, fixture, story_owners):
    root = document(path); tables = list(root.iter(W + 'tbl')); body = list(root.find(W + 'body'))
    floating = [table for table in tables if table.find(W + 'tblPr/' + W + 'tblpPr') is not None]
    assert len(floating) == 2 and set(story_owners.values()) == {tables.index(table) for table in floating}, 'Changed declared independent floating owners'
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
    owners = {}
    for label, index in story_owners.items():
        table = tables[index]; assert table in body, 'Lost top-level complete native owner'
        rows = table.findall(W + 'tr')
        assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 1 and rows[0].find(W + 'trPr/' + W + 'cantSplit') is None and rows[0].find(W + 'trPr/' + W + 'trHeight') is None, 'Lost automatically splittable owner'
        pr = table.find(W + 'tblPr'); position = pr.find(W + 'tblpPr')
        owners[label] = {'tableIndex': index, 'position': {key: position.get(W + key) for key in ('tblpX', 'tblpY', 'vertAnchor', 'horzAnchor')},
                         'distances': {key: int(position.get(W + key, '0')) for key in ('leftFromText', 'rightFromText', 'topFromText', 'bottomFromText')},
                         'overlap': pr.find(W + 'tblOverlap').get(W + 'val')}
    with ZipFile(path) as archive: settings = ET.fromstring(archive.read('word/settings.xml'))
    policy = [node for node in settings.findall(W + 'compat/' + W + 'compatSetting') if node.get(W + 'name') == 'allowTextAfterFloatingTableBreak']
    assert len(policy) == 1 and policy[0].get(W + 'uri') == 'http://schemas.microsoft.com/office/word' and policy[0].get(W + 'val') in ('true', '1', 'on'), 'Changed native continuation setting'
    return {'paragraphs': paragraphs, 'owners': owners, 'allPages': True}


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
    with tempfile.TemporaryDirectory(prefix='dual-version-') as profile:
        version = subprocess.run([executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else []), capture_output=True, text=True, check=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version); version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    if args.require_stable: assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'
    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='dual-profile-') as profile, tempfile.TemporaryDirectory(prefix='dual-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())
    manifest = json.loads((args.directory / 'dual-story-manifest.json').read_text())
    assert [(row['orientation'], row['kind']) for row in manifest] == [(orientation, kind) for orientation in ('left', 'right') for kind in ('left', 'side-long', 'both-long')]
    report = {'libreOfficeVersion': version, 'preparedSources': manifest, 'cases': [], 'earlyStop': None,
              'architectureAcceptance': 'blocked; original captions, geometry, opening, original-photo/chrome and Word gates remain', 'microsoftWord': 'pending'}
    for case in manifest:
        name = case['name']; source = args.directory / (name + '.docx'); control = args.directory / (name + '-control.docx')
        fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert fixture['diagnostic'] == {key: case[key] for key in fixture['diagnostic']}
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case['docxSha256']
        assert hashlib.sha256(control.read_bytes()).hexdigest() == case['controlDocxSha256']
        structure = source_structure(control, source, fixture['mainOwnerId'])
        saved, pdf, reopened = [args.directory / (name + suffix) for suffix in ('-saved.docx', '-render.pdf', '-reopened.pdf')]
        check_package(source); source_native = native_result(source, fixture, structure['storyOwners'])
        ids = [row['fieldId'] for row in fixture['nativeParagraphs']]
        source_stories = native_stories(source, ids, structure['storyOwners'])
        assert not source_stories['errors']
        for label in ('main', 'side'):
            assert len(source_stories['stories'][label]) > 1, 'Single paragraph cannot establish a complete independent story'
            assert [field['textSha256'] for field in source_stories['stories'][label]] == [sha(text) for text in fixture[label + 'Text']], 'Changed complete authored source story text/order'
        assert all(row['owners'][-1]['table'] == structure['mainOwnerTableIndex'] for row in source_stories['stories']['main']), 'Main field escaped its complete owner'
        convert(source, pdf, 'pdf'); convert(source, saved, 'docx'); check_package(saved, next_package=False); convert(saved, reopened, 'pdf')
        saved_stories = native_stories(saved, ids, structure['storyOwners'])
        row = {'fixture': name, 'diagnostic': fixture['diagnostic'], 'docxSha256': case['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'sourceStructure': structure,
               'sourceNative': source_native, 'savedNative': native_result(saved, fixture, structure['storyOwners']),
               'sourceStories': source_stories, 'savedStories': saved_stories,
               'wholeNativeStories': compare_native_stories(source_stories, saved_stories),
               'sourceGeometry': native_geometry(source), 'savedGeometry': native_geometry(saved),
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
    target = args.directory / 'dual-story-report.json'; target.write_text(json.dumps(report, indent=2) + '\n')
    if args.baseline:
        report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
        target.write_text(json.dumps(report, indent=2) + '\n')
    elif not args.observe:
        assert report['earlyStop'] is None, 'Rejected complete-story candidate; actual evidence retained, matrix stopped'


if __name__ == '__main__': main()
