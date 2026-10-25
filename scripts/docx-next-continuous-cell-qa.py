"""Bounded independent cell owners; exact native/text/geometry gates stay explicit."""
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
from docx_next_attachment_qa import attachment_audit
from docx_next_raster_qa import pixel_digest


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


span = load('span', 'docx-next-container-span-qa.py')
populated, identity, W = span.populated, span.identity, span.W


def native_owners(path, fixture):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    tables = list(root.iter(W + 'tbl'))
    assert len(tables) == 1, 'Changed native table count; no caption identity inferred'
    rows = tables[0].findall(W + 'tr')
    fields = [[[tag.get(W + 'val') for tag in cell.iter(W + 'tag')]
               for cell in row.findall(W + 'tc')] for row in rows]
    assert fields == fixture['rowFields'], 'Changed exact native paragraph/spacer owners'
    merges = [[None if (merge := cell.find(W + 'tcPr/' + W + 'vMerge')) is None
               else merge.get(W + 'val', 'continue') for cell in row.findall(W + 'tc')]
              for row in rows]
    cant_split = [row.find(W + 'trPr/' + W + 'cantSplit') is not None for row in rows]
    assert cant_split == fixture['rowKeepTogether'], 'Changed authored native row policy'
    if fixture['diagnostic']['composition'] == 'continuous-cell':
        assert len(rows) == 1 and merges == [[None, None, None]] and cant_split == [False]
    return {'rowFields': fields, 'verticalMerges': merges, 'rowKeepTogether': cant_split}


def compare_baseline(before, after):
    a, b = copy.deepcopy(before), copy.deepcopy(after)
    cross_runtime = a['libreOfficeVersion'] != b['libreOfficeVersion']
    a.pop('stableComparison', None); b.pop('stableComparison', None)
    a.pop('libreOfficeVersion', None); b.pop('libreOfficeVersion', None)
    assert len(a['cases']) == len(b['cases']), 'Changed actual render/stop inventory'
    for old, new in zip(a['cases'], b['cases']):
        for phase in ('render', 'saveReopen'):
            span.compare_render(old[phase], new[phase])
            for track in old[phase]['tracks'] + new[phase]['tracks']:
                del track['metadataMetrics']
            if cross_runtime:
                # Fixed byte-identical source has one cover and one letter page.
                # Their known runtime raster variants remain in the actual report;
                # every CV channel byte still belongs to this strict comparison.
                assert len(old['rasterPages'][phase]) == len(new['rasterPages'][phase])
                old['rasterPages'][phase] = old['rasterPages'][phase][2:]
                new['rasterPages'][phase] = new['rasterPages'][phase][2:]
        for item in (old, new):
            # Native editor ZIP metadata is nondeterministic. Every actual native
            # identity/owner/grid result and source hash remains exact.
            item.pop('savedDocxSha256')
    assert a == b, 'Changed strict continuous-cell evidence; never accept silently'
    return {'status': 'pass', 'changedCases': 0}


def candidate_failures(row):
    failures = []
    if row['nativeIdentity']['fieldIdentity'] != 'pass' or row['nativeIdentity']['completeNativeText'] != 'pass':
        failures.append('native-field-or-text-loss')
    for phase in ('render', 'saveReopen'):
        if row[phase]['productGates'] != 'pass':
            failures.append(phase + '-complete-text-opening-or-bounds')
    if row['saveReopenInvariant'] != 'pass': failures.append('save-reopen-layout-change')
    if row['exactNativeGrid'] != 'pass': failures.append('exact-native-grid-change')
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    executable = args.libreofficekit or args.soffice
    with tempfile.TemporaryDirectory(prefix='continuous-version-') as profile:
        command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
        version = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    if args.libreofficekit:
        info = json.loads(version)
        version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
    assert version
    if args.require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable runtime required'

    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='continuous-profile-') as profile, tempfile.TemporaryDirectory(prefix='continuous-output-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            target.write_bytes(exported.read_bytes())

    cases = json.loads((args.directory / 'continuous-cell-manifest.json').read_text())
    assert [(row['orientation'], row['composition'], row['leadMm']) for row in cases] == [
        (orientation, composition, 220) for orientation in ('right', 'left')
        for composition in ('three-row', 'continuous-cell')]
    assert len({row['name'] for row in cases}) == 4
    report = {'libreOfficeVersion': version, 'plannedCases': cases, 'cases': [],
              'preparedSources': [{'fixture': row['name'], 'docxSha256': hashlib.sha256((args.directory / (row['name'] + '.docx')).read_bytes()).hexdigest()} for row in cases],
              'architectureAcceptance': 'blocked; captions, exact geometry and Word requirements remain; no export enablement',
              'microsoftWord': 'pending'}
    for case in cases:
        name = case['name']; source = args.directory / (name + '.docx')
        fixture = json.loads((args.directory / (name + '.json')).read_text())
        assert fixture['diagnostic'] == case
        saved = args.directory / (name + '-saved.docx')
        pdf, reopened = args.directory / (name + '-render.pdf'), args.directory / (name + '-reopened.pdf')
        native = populated.package_result(source, fixture)
        source_owner = native_owners(source, fixture)
        convert(source, pdf, 'pdf'); convert(source, saved, 'docx'); convert(saved, reopened, 'pdf')
        saved_native = populated.package_result(saved, fixture, saved=True)
        saved_owner = native_owners(saved, fixture)
        assert source_owner == saved_owner, 'Changed semantic owners/merges/row rules'
        before, after = populated.render_result(pdf, fixture, True), populated.render_result(reopened, fixture, True)
        try:
            span.compare_render(before, after)
            invariant = 'pass'
        except AssertionError:
            invariant = 'fail'
        grids = {'source': span.native_grids(source), 'saved': span.native_grids(saved)}
        row = {'fixture': name, 'diagnostic': case, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
               'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(),
               'package': native, 'saveReopenPackage': saved_native,
               'nativeIdentity': identity.audit(source, saved), 'nativeAttachment': attachment_audit(source, saved, fixture),
               'sourceOwners': source_owner, 'savedOwners': saved_owner, 'nativeGrids': grids,
               'exactNativeGrid': 'pass' if grids['source'] == grids['saved'] else 'fail',
               'render': before, 'saveReopen': after, 'saveReopenInvariant': invariant, 'rasterPages': {}}
        for phase, document in [('render', pdf), ('saveReopen', reopened)]:
            pixels = []
            with fitz.open(document) as pages:
                for index, page in enumerate(pages):
                    image = args.directory / f'{name}-{phase}-page-{index + 1:02}.png'
                    page.get_pixmap(alpha=False).save(image)
                    pixels.append(pixel_digest(image))
            row['rasterPages'][phase] = pixels
        report['cases'].append(row)
        print(json.dumps({'fixture': name, 'pages': before['pages'], 'productGates': before['productGates'],
                          'failures': before['failures'], 'nativeIDs': row['nativeIdentity']['fieldIdentity'],
                          'captionIdentity': row['nativeIdentity']['tableIdentity'], 'exactNativeGrid': row['exactNativeGrid']}), flush=True)
        if case['composition'] == 'continuous-cell' and (failures := candidate_failures(row)):
            report['earlyStop'] = {'fixture': name, 'reasons': failures,
                                   'unrenderedCases': [pending['name'] for pending in cases[len(report['cases']):]]}
            break
    else:
        report['earlyStop'] = None
    report['actualCases'] = len(report['cases'])
    report['actualDossierPages'] = sum(row['render']['pages'] for row in report['cases'])
    report_file = args.directory / 'continuous-cell-report.json'
    report_file.write_text(json.dumps(report, indent=2) + '\n')
    if args.baseline:
        recorded = json.loads(args.baseline.read_text())
        report['stableComparison'] = compare_baseline(recorded.get('stable', recorded), report)
        report_file.write_text(json.dumps(report, indent=2) + '\n')
    elif report['earlyStop'] is not None:
        raise AssertionError('Rejected continuous-cell candidate; retained actual evidence and stopped')


if __name__ == '__main__': main()
