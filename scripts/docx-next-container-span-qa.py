"""Read-only multirow carrier proof; original caption and opening failures stay separate."""
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


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


container = load('container', 'docx-next-container-identity-qa.py')
populated = load('populated', 'docx-next-populated-row-qa.py')
identity, W = container.identity, container.W


def owner_result(path, fixture):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    parents = {child: parent for parent in root.iter() for child in parent}
    markers = [node for node in root.iter(W + 'sdt')
               if (tag := node.find(W + 'sdtPr/' + W + 'tag')) is not None
               and tag.get(W + 'val') == fixture['tableId']]
    if len(markers) != 1:
        return {'status': 'fail', 'reason': 'missing-or-duplicate-container-marker'}
    marker = markers[0]
    if list(marker.iter(W + 't')) or list(marker.iter(W + 'drawing')) or list(marker.iter(W + 'sdt')) != [marker]:
        return {'status': 'fail', 'reason': 'container-marker-has-content'}
    cell = parents.get(marker)
    while cell is not None and cell.tag != W + 'tc':
        cell = parents.get(cell)
    row = parents.get(cell)
    table = parents.get(row)
    if cell is None or row is None or table is None or row.tag != W + 'tr' or table.tag != W + 'tbl':
        return {'status': 'fail', 'reason': 'marker-outside-native-table-cell'}
    rows = table.findall(W + 'tr')
    cells = row.findall(W + 'tc')
    first = rows[0] is row and cells[0] is cell
    last = list(cell)[-1]
    ending = last is marker or marker in list(last.iter(W + 'sdt'))
    owned = [[[tag.get(W + 'val') for tag in item.iter(W + 'tag')
               if tag.get(W + 'val') != fixture['tableId']] for item in native_row.findall(W + 'tc')]
             for native_row in rows]
    grid = table.find(W + 'tblGrid')
    width = table.find(W + 'tblPr/' + W + 'tblW')
    merges, flags = [], []
    for native_row in rows:
        merge_row, ending_row = [], []
        for item in native_row.findall(W + 'tc'):
            merge = item.find(W + 'tcPr/' + W + 'vMerge')
            merge_row.append(None if merge is None else merge.get(W + 'val', 'continue'))
            paragraph = list(item)[-1]
            if paragraph.tag == W + 'sdt':
                paragraph = paragraph.find(W + 'sdtContent/' + W + 'p')
            keep = paragraph.find(W + 'pPr/' + W + 'keepNext') if paragraph is not None else None
            ending_row.append(None if keep is None else keep.get(W + 'val', '1') not in ('0', 'false', 'off'))
        merges.append(merge_row)
        flags.append(ending_row)
    valid = first and ending and owned == fixture['rowFields']
    return {'status': 'pass' if valid else 'fail', 'reason': None if valid else 'changed-container-owner',
            'firstCell': first, 'cellEnding': ending, 'rowFields': owned, 'verticalMerges': merges,
            'rowKeepTogether': [item.find(W + 'trPr/' + W + 'cantSplit') is not None for item in rows],
            'cellEndKeepNext': flags,
            'tableWidthTwips': None if width is None or width.get(W + 'type') != 'dxa' else int(width.get(W + 'w')),
            'gridTwips': [] if grid is None else [int(node.get(W + 'w')) for node in grid]}


def compare_render(before, after):
    assert {k: v for k, v in before.items() if k != 'tracks'} == {k: v for k, v in after.items() if k != 'tracks'}, 'Changed populated product gate'
    assert len(before['tracks']) == len(after['tracks']) == 2
    for old, new in zip(before['tracks'], after['tracks']):
        assert {k: v for k, v in old.items() if k != 'metadataMetrics'} == {k: v for k, v in new.items() if k != 'metadataMetrics'}, 'Changed complete text/opening evidence'
        populated.same_metrics(old['metadataMetrics'], new['metadataMetrics'])


def native_grids(path):
    """Inventory geometry independently of semantic identity; never resolve IDs through this list."""
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    result = []
    for table in root.iter(W + 'tbl'):
        grid = table.find(W + 'tblGrid')
        width = table.find(W + 'tblPr/' + W + 'tblW')
        result.append({'tableWidthTwips': None if width is None or width.get(W + 'type') != 'dxa' else int(width.get(W + 'w')),
                       'gridTwips': [] if grid is None else [int(node.get(W + 'w')) for node in grid]})
    return result


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    for old, new in zip(a['fixtures'], b['fixtures']):
        for phase in ['render', 'saveReopen']:
            if phase in old and phase in new:
                compare_render(old[phase], new[phase])
                for track in old[phase]['tracks'] + new[phase]['tracks']:
                    del track['metadataMetrics']
    container.compare_baseline(a, b)


def regression(row, fixture, original_owner=None):
    if row['native']['completeNativeText'] != 'pass' or row['native']['fieldIdentity'] != 'pass':
        return 'native-field-or-text-loss'
    if fixture['carrier'] == 'cell-ending':
        if row['containerOwner']['status'] != 'pass':
            return 'container-owner'
        if row['containerOwner'] != original_owner:
            return 'changed-native-owner-structure'
        if row.get('controlRasterIdentity') != 'pass':
            return 'control-raster-identity'
    for phase in ['render', 'saveReopen']:
        result = row[phase]
        if result['pages'] != 21 or result['visibleBounds'] != 'pass' or any(not track['fullTextVisible'] for track in result['tracks']):
            return 'complete-pdf-text-or-bounds'
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--baseline', type=Path)
    declaration = parser.add_mutually_exclusive_group()
    declaration.add_argument('--declared-grid', action='store_true')
    declaration.add_argument('--declared-width', action='store_true')
    args = parser.parse_args()
    executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='span-version-') as profile:
        command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
        version = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version)
        version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    assert version
    if args.require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable runtime required'

    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='span-profile-') as profile, tempfile.TemporaryDirectory(prefix='span-export-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())

    manifest = json.loads((args.directory / 'container-span-manifest.json').read_text())
    assert [(f['orientation'], f['leadMm'], f['carrier']) for f in manifest] == [(orientation, height, carrier) for orientation in ['right', 'left'] for height in [210, 220] for carrier in ['caption-only', 'cell-ending']]
    mode = 'declared-grid' if args.declared_grid else 'declared-width' if args.declared_width else None
    assert all(f.get('gridMode') == mode for f in manifest)
    previous = json.loads(Path('docs/docx-next/sidebar-lead-window-evidence.json').read_text())
    prepared = []
    for fixture in manifest:
        source = args.directory / (fixture['name'] + '.docx')
        check_package(source)
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        assert digest == fixture['docxSha256']
        if fixture['carrier'] == 'cell-ending':
            assert owner_result(source, fixture)['status'] == 'pass', 'Invalid authored carrier owner'
        else:
            populated.package_result(source, fixture)
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
        populated.package_result(saved, fixture, saved=True)
        convert(saved, saved_pdf, 'pdf')
        row = {'fixture': fixture['name'], 'execution': 'rendered', 'sourceDocxSha256': fixture['docxSha256'],
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'native': identity.audit(source, saved),
               'containerOwner': owner_result(saved, fixture) if fixture['carrier'] == 'cell-ending' else {'status': 'not-declared'},
               'render': populated.render_result(pdf, fixture, observe=True),
               'saveReopen': populated.render_result(saved_pdf, fixture, observe=True)}
        row['nativeGridAudit'] = {'source': native_grids(source), 'saved': native_grids(saved)}
        row['nativeGridAudit']['exactGeometry'] = 'pass' if row['nativeGridAudit']['source'] == row['nativeGridAudit']['saved'] else 'fail'
        if fixture['carrier'] == 'cell-ending':
            row['sourceContainerOwner'] = owner_result(source, fixture)
            changed = [key for key in row['sourceContainerOwner'] if row['sourceContainerOwner'][key] != row['containerOwner'].get(key)]
            row['nativeStructure'] = {'status': 'fail' if changed else 'pass', 'changedProperties': changed}
        # Exact old controls retain known left attachment failure; it is never accepted.
        prior = next(item for item in previous['cases'] if item['fixture'] == fixture['originalName'])
        for phase in ['render', 'saveReopen']:
            compare_render(prior[phase], row[phase])
        for label, path in [('source', pdf), ('saved', saved_pdf)]:
            with fitz.open(path) as document:
                for page in document:
                    page.get_pixmap(alpha=False).save(work / f'{label}-page-{page.number + 1}.png')
        if fixture['carrier'] == 'cell-ending':
            control = args.directory / (rows[-1]['fixture'] + '-qa')
            equal = all((work / f'{phase}-page-{page}.png').read_bytes() == (control / f'{phase}-page-{page}.png').read_bytes()
                        for phase in ['source', 'saved'] for page in range(1, 22))
            row['controlRasterIdentity'] = 'pass' if equal else 'fail'
        rows.append(row)
        reason = regression(row, fixture, row.get('sourceContainerOwner'))
        if reason:
            stopped = fixture['name'] + ':' + reason
    actual = [row for row in rows if row['execution'] == 'rendered']
    report = {'matrix': 'container-' + mode if mode else 'container-span', 'runtime': version, 'interface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI',
              'plannedCases': len(rows), 'actualCases': len(actual), 'pages': sum(row['render']['pages'] for row in actual),
              'preparedSources': prepared, 'stoppedAfter': stopped,
              'architectureAcceptance': 'blocked; caption loss and left long-opening failure retained; Word pending', 'fixtures': rows}
    (args.directory / 'container-span-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: value for key, value in report.items() if key not in ['fixtures', 'preparedSources']}))
    if args.baseline:
        recorded = json.loads(args.baseline.read_text())
        if 'matrices' in recorded:
            recorded = recorded['matrices'][report['matrix']]
        compare_baseline(recorded.get('stable', recorded.get('devCli', recorded)), report)
    if not args.baseline:
        assert stopped is None, 'Retained container span regression: ' + str(stopped)


if __name__ == '__main__':
    main()
