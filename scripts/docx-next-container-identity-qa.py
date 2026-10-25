"""Read-only native container marker/owner experiment. Caption loss remains a separate failure."""
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
from docx_next_package_qa import check_package

spec = importlib.util.spec_from_file_location('identity', Path(__file__).with_name('docx-next-native-identity-qa.py'))
identity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(identity)
W = identity.W


def owner_result(path, fixture):
    """Resolve the ID through its native carrier, never through visible text or field matching."""
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    parents = {child: parent for parent in root.iter() for child in parent}
    markers = [node for node in root.iter(W + 'sdt')
               if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None
               and tag.get(W + 'val') == fixture['tableId']]
    if len(markers) != 1:
        return {'status': 'fail', 'reason': 'missing-or-duplicate-container-marker', 'markerCount': len(markers)}
    marker = markers[0]
    if list(marker.iter(W + 't')) or list(marker.iter(W + 'drawing')) or list(marker.iter(W + 'sdt')) != [marker]:
        return {'status': 'fail', 'reason': 'container-marker-has-content'}
    ancestor = parents.get(marker)
    while ancestor is not None and ancestor.tag != W + 'tc':
        ancestor = parents.get(ancestor)
    if ancestor is None or parents.get(ancestor) is None or parents[ancestor].tag != W + 'tr':
        return {'status': 'fail', 'reason': 'marker-outside-native-table-cell'}
    row = parents[ancestor]
    table = parents.get(row)
    if table is None or table.tag != W + 'tbl':
        return {'status': 'fail', 'reason': 'marker-outside-native-table-row'}
    rows = table.findall(W + 'tr')
    cells = row.findall(W + 'tc')
    owned = [[tag.get(W + 'val') for tag in cell.iter(W + 'tag')
              if tag.get(W + 'val') != fixture['tableId']] for cell in cells]
    first = len(rows) == 1 and rows[0] is row and cells[0] is ancestor
    last = list(ancestor)[-1]
    ending = last is marker or marker in list(last.iter(W + 'sdt'))
    valid = first and ending and owned == fixture['cellFields']
    grid = table.find(W + 'tblGrid')
    return {'status': 'pass' if valid else 'fail', 'reason': None if valid else 'changed-container-owner',
            'rowCount': len(rows), 'cellCount': len(cells), 'firstCell': first, 'cellEnding': ending,
            'ownedFieldIds': owned,
            'gridTwips': [] if grid is None else [int(node.get(W + 'w')) for node in grid]}


def pdf_result(path, fixture):
    with fitz.open(path) as document:
        text = identity.compact(''.join(page.get_text() for page in document))
        missing = [field['fieldId'] for field in fixture['fields'] if identity.compact(field['text']) not in text]
        missing += [part + '.identity.marker' for part in ['cover', 'letter']
                    if identity.compact(part + ' identity control.') not in text]
        outside = 0
        margins = fixture['margins']
        mm = 72 / 25.4
        for page in document[2:]:
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip():
                            continue
                        x0, y0, x1, y1 = span['bbox']
                        outside += int(x0 < margins['left'] * mm - 2 or x1 > page.rect.width - margins['right'] * mm + 2
                                       or y0 < margins['top'] * mm - 4 or y1 > page.rect.height - margins['bottom'] * mm + 4)
        pictures = sum(len(page.get_image_info()) for page in document)
        return {'status': 'pass' if len(document) == fixture['expectedPages'] and not missing and not outside and not pictures else 'fail',
                'pages': len(document), 'missingFields': missing, 'outsideBody': outside, 'pictures': pictures}


def stop_reason(row, fixture):
    if row['native']['completeNativeText'] != 'pass':
        return 'complete-native-text'
    if row['native']['fieldIdentity'] != 'pass':
        return 'field-or-marker-identity'
    if fixture['carrier'] == 'cell-ending' and row['containerOwner']['status'] != 'pass':
        return 'container-owner'
    if any(row[phase]['status'] != 'pass' for phase in ['render', 'saveReopen']):
        return 'pdf-text-or-bounds'
    # Retain caption failure explicitly. This experiment does not replace that requirement.
    return None


def compare_baseline(before, after):
    for key in ['plannedCases', 'actualCases', 'pages', 'stoppedAfter', 'matrix', 'preparedSources']:
        assert before[key] == after[key], 'Changed container plan/source/stop: ' + key
    assert len(before['fixtures']) == len(after['fixtures'])
    for old, new in zip(before['fixtures'], after['fixtures']):
        assert {key: value for key, value in old.items() if key != 'savedDocxSha256'} == {
            key: value for key, value in new.items() if key != 'savedDocxSha256'}, 'Changed native container observation'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--observe', action='store_true')
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='container-version-') as profile:
        command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
        version = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version)
        version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    assert version
    if args.require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable runtime required'

    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='container-profile-') as profile, tempfile.TemporaryDirectory(prefix='container-export-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())

    manifest = json.loads((args.directory / 'container-identity-manifest.json').read_text())
    assert [(row['owner'], row['carrier']) for row in manifest] == [(owner, carrier) for owner in ['single', 'left', 'right'] for carrier in ['caption-only', 'cell-ending']]
    prepared = []
    for fixture in manifest:
        source = args.directory / (fixture['name'] + '.docx')
        check_package(source)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        assert digest == fixture['docxSha256']
        if fixture['carrier'] == 'cell-ending':
            assert owner_result(source, fixture)['status'] == 'pass', 'Invalid authored native container owner'
        prepared.append({'fixture': fixture['name'], 'sourceDocxSha256': digest})
    rows, stopped = [], None
    for fixture in manifest:
        if stopped:
            rows.append({'fixture': fixture['name'], 'execution': 'unrendered', 'reason': 'stopped after ' + stopped})
            continue
        source = args.directory / (fixture['name'] + '.docx')
        work = args.directory / (fixture['name'] + '-qa')
        work.mkdir(exist_ok=True)
        pdf, saved, saved_pdf = work / 'source.pdf', work / source.name, work / 'saved.pdf'
        convert(source, pdf, 'pdf')
        convert(source, saved, 'docx')
        check_package(saved, next_package=False)
        convert(saved, saved_pdf, 'pdf')
        row = {'fixture': fixture['name'], 'execution': 'rendered', 'sourceDocxSha256': fixture['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'native': identity.audit(source, saved),
               'containerOwner': owner_result(saved, fixture) if fixture['carrier'] == 'cell-ending' else {'status': 'not-declared'},
               'render': pdf_result(pdf, fixture), 'saveReopen': pdf_result(saved_pdf, fixture)}
        if fixture['carrier'] == 'cell-ending' and row['containerOwner']['status'] == 'pass':
            assert owner_result(source, fixture) == row['containerOwner'], 'Changed native owner/width structure'
        for label, path in [('source', pdf), ('saved', saved_pdf)]:
            with fitz.open(path) as document:
                for page in document:
                    page.get_pixmap(alpha=False).save(work / f'{label}-page-{page.number + 1}.png')
        rows.append(row)
        if fixture['carrier'] == 'cell-ending':
            # Read-only exact raster comparison with the preceding caption-only source.
            prior = rows[-2]
            if prior['execution'] == 'rendered':
                original = args.directory / (prior['fixture'] + '-qa')
                equal = all(row[phase]['pages'] == prior[phase]['pages'] == fixture['expectedPages']
                            for phase in ['render', 'saveReopen']) and all(
                            (work / f'{phase}-page-{page}.png').is_file() and (original / f'{phase}-page-{page}.png').is_file()
                            and (work / f'{phase}-page-{page}.png').read_bytes() == (original / f'{phase}-page-{page}.png').read_bytes()
                            for phase in ['source', 'saved'] for page in range(1, fixture['expectedPages'] + 1))
                row['controlRasterIdentity'] = 'pass' if equal else 'fail'
                if not equal:
                    stopped = fixture['name'] + ':control-raster-identity'
        reason = stop_reason(row, fixture)
        if reason:
            stopped = fixture['name'] + ':' + reason
    actual = [row for row in rows if row['execution'] == 'rendered']
    report = {'matrix': 'container-identity', 'runtime': version, 'interface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI',
              'plannedCases': len(rows), 'actualCases': len(actual), 'pages': sum(row['render']['pages'] for row in actual),
              'preparedSources': prepared, 'stoppedAfter': stopped,
              'architectureAcceptance': 'blocked; original caption and Word requirements remain; no export enablement', 'fixtures': rows}
    (args.directory / 'container-identity-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key not in ['fixtures', 'preparedSources']}))
    if args.baseline:
        recorded = json.loads(args.baseline.read_text())
        compare_baseline(recorded.get('stable', recorded), report)
    if not args.observe:
        assert stopped is None, 'Retained native container regression: ' + str(stopped)


if __name__ == '__main__':
    main()
