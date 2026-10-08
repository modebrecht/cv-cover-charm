"""Read-only documented native continuation policy. Original caption and geometry gates stay closed."""
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
from docx_next_attachment_qa import explicit_flag
from docx_next_package_qa import check_package
from docx_next_raster_qa import pixel_digest

spec = importlib.util.spec_from_file_location('identity', Path(__file__).with_name('docx-next-native-identity-qa.py'))
identity = importlib.util.module_from_spec(spec); spec.loader.exec_module(identity)
W, compact = identity.W, identity.compact


def native_result(path, fixture):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        settings = ET.fromstring(archive.read('word/settings.xml'))
    parents = {child: parent for parent in root.iter() for child in parent}
    tables = [table for table in root.iter(W + 'tbl') if table.find(W + 'tblPr/' + W + 'tblpPr') is not None]
    assert len(tables) == 1, 'Changed native floating table inventory'
    table = tables[0]
    rows = table.findall(W + 'tr')
    assert len(rows) == 1 and len(rows[0].findall(W + 'tc')) == 1, 'Changed continuous native side owner'
    controls = {}
    for node in root.iter(W + 'sdt'):
        tag = node.find(W + 'sdtPr/' + W + 'tag')
        if tag is not None:
            key = tag.get(W + 'val')
            assert key not in controls, 'Duplicate native semantic ID'
            controls[key] = node
    paragraphs = []
    for field in fixture['nativeParagraphs']:
        marker = controls.get(field['fieldId'])
        assert marker is not None, 'Missing native paragraph ID'
        content = list(marker.iter(W + 'p'))
        if not content:
            ancestor = parents.get(marker)
            while ancestor is not None and ancestor.tag != W + 'p': ancestor = parents.get(ancestor)
            content = [] if ancestor is None else [ancestor]
        assert len(content) == 1, 'Fragmented native semantic paragraph'
        paragraph = content[0]
        flags = {key: explicit_flag(paragraph.find(W + 'pPr'), key) for key in field['flags']}
        assert flags == field['flags'], 'Changed explicit native paragraph policy'
        owner = parents.get(paragraph)
        while owner is not None and owner.tag not in (W + 'tc', W + 'body'): owner = parents.get(owner)
        assert owner is not None, 'Missing native story owner'
        paragraphs.append({'fieldId': field['fieldId'], 'flags': flags, 'paragraphCount': 1,
                           'owner': 'side-cell' if owner.tag == W + 'tc' else 'body'})
    pr = table.find(W + 'tblPr'); position = pr.find(W + 'tblpPr')
    assert position is not None, 'Lost native floating position'
    geometry = {'width': int(pr.find(W + 'tblW').get(W + 'w')),
                'grid': [int(node.get(W + 'w')) for node in table.find(W + 'tblGrid')],
                'position': {key: position.get(W + key) for key in ('tblpX', 'tblpY', 'vertAnchor', 'horzAnchor')},
                'distances': {key: int(position.get(W + key, '0')) for key in ('leftFromText', 'rightFromText', 'topFromText', 'bottomFromText')}}
    policy = settings.findall(W + 'compat/' + W + 'compatSetting')
    policy = [node for node in policy if node.get(W + 'name') == 'allowTextAfterFloatingTableBreak']
    assert len(policy) <= 1, 'Duplicate document continuation policy'
    if policy:
        assert policy[0].get(W + 'uri') == 'http://schemas.microsoft.com/office/word'
        value = policy[0].get(W + 'val')
        assert value in ('true', 'false', '1', '0', 'on', 'off')
        enabled = value in ('true', '1', 'on')
    else: enabled = False
    assert enabled == (fixture['diagnostic']['policy'] == 'all-pages'), 'Changed native continuation setting'
    return {'paragraphs': paragraphs, 'geometry': geometry, 'allPages': enabled}


def pdf_result(path, fixture):
    mm = 72 / 25.4
    with fitz.open(path) as document:
        tracks = {}
        for label in ('main', 'side'):
            lane = fixture[label + 'Lane']; margins = fixture['margins']
            clips = [fitz.Rect((lane['leftMm'] - .5) * mm, (margins['top'] - 3) * mm,
                               (lane['rightMm'] + .5) * mm, page.rect.height - (margins['bottom'] - 3) * mm) for page in document[2:]]
            texts = [compact(page.get_text(clip=clip)) for page, clip in zip(document[2:], clips)]
            expected = fixture[label + 'Text']
            missing = [index for index, text in enumerate(expected) if compact(text) not in ''.join(texts)]
            first = next((index + 1 for index, text in enumerate(texts) if expected and compact(expected[0]) in text), None)
            outside = 0
            for page, clip in zip(document[2:], clips):
                for block in page.get_text('dict', clip=clip)['blocks']:
                    for line in block.get('lines', []):
                        for span in line['spans']:
                            if not span['text'].strip(): continue
                            x0, y0, x1, y1 = span['bbox']
                            outside += int(x0 < lane['leftMm'] * mm - 2 or x1 > lane['rightMm'] * mm + 2 or
                                           y0 < margins['top'] * mm - 4 or y1 > page.rect.height - margins['bottom'] * mm + 4)
            tracks[label] = {'firstCvPage': first, 'missingParagraphs': missing, 'outsideBody': outside,
                             'fullOwningLaneText': not missing}
        return {'pages': len(document), 'tracks': tracks,
                'allTextAndBounds': all(not row['missingParagraphs'] and not row['outsideBody'] for row in tracks.values()),
                'expectedControlPages': len(document) == fixture['expectedPages'] if fixture['diagnostic']['policy'] == 'default' else None,
                'openingMatches': all(tracks[label]['firstCvPage'] == fixture['expected' + label.capitalize() + 'FirstPage'] for label in tracks)}


def candidate_failures(row):
    failures = []
    if row['nativeIdentity']['fieldIdentity'] != 'pass' or row['nativeIdentity']['completeNativeText'] != 'pass': failures.append('native-fields-or-text')
    if row['sourceNative'] != row['savedNative']: failures.append('native-owners-policy-or-exact-geometry')
    for phase in ('render', 'saveReopen'):
        if not row[phase]['allTextAndBounds']: failures.append(phase + '-text-or-bounds')
        if not row[phase]['openingMatches']: failures.append(phase + '-opening')
    if row['render'] != row['saveReopen']: failures.append('save-reopen-layout')
    if row['rasterPages']['render'] != row['rasterPages']['saveReopen']: failures.append('save-reopen-pixels')
    return failures


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for item in (a, b):
        item.pop('libreOfficeVersion', None); item.pop('stableComparison', None)
        for row in item['cases']: row.pop('savedDocxSha256', None)
    assert a == b, 'Changed exact native/pagination/all-channel evidence or stop inventory'
    return {'status': 'pass', 'changedCases': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice'); engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true'); parser.add_argument('--baseline', type=Path)
    parser.add_argument('--observe', action='store_true')
    args = parser.parse_args(); executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='floating-version-') as profile:
        version = subprocess.run([executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else []), capture_output=True, text=True, check=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version); version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    if args.require_stable: assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'

    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='floating-profile-') as profile, tempfile.TemporaryDirectory(prefix='floating-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())

    manifest = json.loads((args.directory / 'floating-continuation-manifest.json').read_text())
    assert [(row['orientation'], row['kind'], row['policy']) for row in manifest] == [(orientation, kind, policy) for orientation in ('right', 'left') for kind in ('left', 'side-long', 'both-long') for policy in ('default', 'all-pages')]
    report = {'libreOfficeVersion': version, 'preparedSources': manifest, 'cases': [], 'earlyStop': None,
              'architectureAcceptance': 'blocked; original captions, supported opening/geometry/photo/chrome and Word gates remain', 'microsoftWord': 'pending'}
    for case in manifest:
        name = case['name']; source = args.directory / (name + '.docx')
        fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert {key: case[key] for key in fixture['diagnostic']} == fixture['diagnostic']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case['docxSha256']
        saved, pdf, reopened = [args.directory / (name + suffix) for suffix in ('-saved.docx', '-render.pdf', '-reopened.pdf')]
        check_package(source); source_native = native_result(source, fixture)
        convert(source, pdf, 'pdf'); convert(source, saved, 'docx'); check_package(saved, next_package=False); convert(saved, reopened, 'pdf')
        row = {'fixture': name, 'diagnostic': fixture['diagnostic'], 'docxSha256': case['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'sourceNative': source_native,
               'savedNative': native_result(saved, fixture), 'nativeIdentity': identity.audit(source, saved),
               'render': pdf_result(pdf, fixture), 'saveReopen': pdf_result(reopened, fixture), 'rasterPages': {}}
        for phase, path in [('render', pdf), ('saveReopen', reopened)]:
            row['rasterPages'][phase] = []
            with fitz.open(path) as pages:
                for index, page in enumerate(pages):
                    image = args.directory / f'{name}-{phase}-page-{index + 1:02}.png'; page.get_pixmap(alpha=False).save(image)
                    row['rasterPages'][phase].append(pixel_digest(image))
        row['candidateFailures'] = candidate_failures(row); report['cases'].append(row)
        print(json.dumps({'fixture': name, 'render': row['render'], 'nativeIdentity': row['nativeIdentity']['fieldIdentity'], 'captionIdentity': row['nativeIdentity']['tableIdentity'], 'candidateFailures': row['candidateFailures']}), flush=True)
        if case['policy'] == 'all-pages' and row['candidateFailures']:
            report['earlyStop'] = {'fixture': name, 'reasons': row['candidateFailures'], 'unrenderedCases': [pending['name'] for pending in manifest[len(report['cases']):]]}; break
    report['actualCases'] = len(report['cases']); report['actualDossierPages'] = sum(row['render']['pages'] for row in report['cases'])
    target = args.directory / 'floating-continuation-report.json'; target.write_text(json.dumps(report, indent=2) + '\n')
    if args.baseline:
        recorded = json.loads(args.baseline.read_text()); report['stableComparison'] = compare_baseline(recorded.get('stable', recorded), report)
        target.write_text(json.dumps(report, indent=2) + '\n')
    elif not args.observe:
        assert report['earlyStop'] is None, 'Rejected continuation candidate; actual evidence retained, matrix stopped'


if __name__ == '__main__': main()
