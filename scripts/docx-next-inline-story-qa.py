"""Bounded complete inline-story experiment; no source/saved XML repair or acceptance inference."""
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
    body = before.find(W + 'body'); siblings = list(body)
    side = next(node for node in siblings if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblpPr') is not None)
    owners = [node for node in after.find(W + 'body') if node.tag == W + 'tbl' and node.find(W + 'tblPr/' + W + 'tblCaption') is not None and node.find(W + 'tblPr/' + W + 'tblCaption').get(W + 'val') == owner_id]
    assert len(owners) == 1, 'Missing or duplicated declared complete main owner'
    owner = owners[0]; rows = owner.findall(W + 'tr')
    assert owner.find(W + 'tblPr/' + W + 'tblpPr') is None, 'Main owner must be inline'
    assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 1 and rows[0].find(W + 'trPr/' + W + 'cantSplit') is None and rows[0].find(W + 'trPr/' + W + 'trHeight') is None, 'Main story must have one automatically splittable cell'
    def semantic(nodes):
        return [ET.tostring(node) for node in nodes if node.tag not in (W + 'sectPr', W + 'tcPr') and not (node.tag == W + 'p' and not text_value(node))]
    original = siblings[siblings.index(side) + 1:]
    current = list(rows[0].find(W + 'tc'))
    assert semantic(original) == semantic(current), 'Changed original complete native main block structure'
    return {'status': 'pass', 'originalMainTables': sum(1 for node in original for _ in node.iter(W + 'tbl')),
            'originalMainParagraphs': sum(1 for node in original for p in node.iter(W + 'p') if text_value(p)),
            'mainOwnerTableIndex': list(after.iter(W + 'tbl')).index(owner)}


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
    with tempfile.TemporaryDirectory(prefix='inline-version-') as profile:
        version = subprocess.run([executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else []), capture_output=True, text=True, check=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version); version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    if args.require_stable: assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'
    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='inline-profile-') as profile, tempfile.TemporaryDirectory(prefix='inline-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())
    manifest = json.loads((args.directory / 'inline-story-manifest.json').read_text())
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
        check_package(source); source_native = continuation.native_result(source, fixture)
        ids = [row['fieldId'] for row in fixture['nativeParagraphs']]
        source_stories = native_stories(source, ids)
        assert not source_stories['errors']
        for label in ('main', 'side'):
            assert len(source_stories['stories'][label]) > 1, 'Single paragraph cannot establish a complete independent story'
            assert [field['textSha256'] for field in source_stories['stories'][label]] == [sha(text) for text in fixture[label + 'Text']], 'Changed complete authored source story text/order'
        assert all(row['owners'][-1]['table'] == structure['mainOwnerTableIndex'] for row in source_stories['stories']['main']), 'Main field escaped its complete owner'
        convert(source, pdf, 'pdf'); convert(source, saved, 'docx'); check_package(saved, next_package=False); convert(saved, reopened, 'pdf')
        saved_stories = native_stories(saved, ids)
        row = {'fixture': name, 'diagnostic': fixture['diagnostic'], 'docxSha256': case['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'sourceStructure': structure,
               'sourceNative': source_native, 'savedNative': continuation.native_result(saved, fixture),
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
    target = args.directory / 'inline-story-report.json'; target.write_text(json.dumps(report, indent=2) + '\n')
    if args.baseline:
        report['stableComparison'] = compare_baseline(json.loads(args.baseline.read_text())['stable'], report)
        target.write_text(json.dumps(report, indent=2) + '\n')
    elif not args.observe:
        assert report['earlyStop'] is None, 'Rejected complete-story candidate; actual evidence retained, matrix stopped'


if __name__ == '__main__': main()
