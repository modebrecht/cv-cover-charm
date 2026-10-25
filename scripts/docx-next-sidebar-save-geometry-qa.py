"""Audit exact within-artifact save geometry independently of content acceptance."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from xml.etree import ElementTree as ET
from zipfile import ZipFile

import fitz

REPO = Path(__file__).resolve().parent.parent


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


app = module('docx-next-sidebar-body-qa')
history = module('docx-next-grid-history-qa')
native_qa = module('docx-next-native-grid-qa')
W = history.W
PHASES = ('source', 'saved', 'saved2')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_table(root, canonical):
    assert canonical and len(canonical) == len(set(canonical)), 'Invalid complete owner inventory'
    matches = [table for table in root.iter(W + 'tbl') if history.ids(table) == canonical]
    assert len(matches) == 1, 'Missing, reordered or ambiguous complete table owner'
    return matches[0]


def grid_record(table):
    geometry = history.geometry(table)
    assert geometry['grid'] and all(width > 0 for width in geometry['grid']), 'Invalid serialized grid'
    assert all(len(row) == len(geometry['grid']) for row in geometry['cellWidths']), 'Incomplete serialized row'
    return dict(geometry, sourceGridConsistent=(
        sum(geometry['grid']) == geometry['preferredWidthTwips'] and
        all(row == geometry['grid'] for row in geometry['cellWidths'])))


def nested_grids(table):
    records = []
    for nested in table.iter(W + 'tbl'):
        canonical = history.ids(nested)
        assert canonical and len(canonical) == len(set(canonical)), 'Invalid nested canonical table'
        records.append({'canonicalOwnerFieldIds': canonical, 'geometry': grid_record(nested)})
    assert len({tuple(row['canonicalOwnerFieldIds']) for row in records}) == len(records), 'Ambiguous nested owners'
    return records


def compare_pdf(before_path, after_path):
    with fitz.open(before_path) as before, fitz.open(after_path) as after:
        result = {'pageCountsUnchanged': len(before) == len(after),
                  'wordSequenceUnchanged': True, 'changedWordPages': [], 'changedPixelPages': [],
                  'changedWords': 0, 'maxAbsDxMm': 0.0, 'maxAbsDyMm': 0.0,
                  'renderScale': 2, 'pdfMetadataCompared': False}
        if len(before) != len(after):
            result['wordSequenceUnchanged'] = False
        for index, (a, b) in enumerate(zip(before, after)):
            aw, bw = a.get_text('words', sort=False), b.get_text('words', sort=False)
            same_text = [row[4] for row in aw] == [row[4] for row in bw]
            result['wordSequenceUnchanged'] &= same_text
            if not same_text or [row[:4] for row in aw] != [row[:4] for row in bw]:
                result['changedWordPages'].append(index + 1)
            if same_text:
                for x, y in zip(aw, bw):
                    if x[:4] != y[:4]:
                        result['changedWords'] += 1
                    result['maxAbsDxMm'] = max(result['maxAbsDxMm'], abs(x[0] - y[0]) * 25.4 / 72,
                                               abs(x[2] - y[2]) * 25.4 / 72)
                    result['maxAbsDyMm'] = max(result['maxAbsDyMm'], abs(x[1] - y[1]) * 25.4 / 72,
                                               abs(x[3] - y[3]) * 25.4 / 72)
            ap, bp = a.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False), b.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
            if (ap.width, ap.height, ap.n, hashlib.sha256(ap.samples).digest()) != (
                    bp.width, bp.height, bp.n, hashlib.sha256(bp.samples).digest()):
                result['changedPixelPages'].append(index + 1)
        result['exactVisibleGeometry'] = (result['pageCountsUnchanged'] and result['wordSequenceUnchanged'] and
                                          not result['changedWordPages'] and not result['changedPixelPages'])
        return result


def verify_pdf_content(path, fixture, attested):
    assert 'pdfSha256' in attested, 'Content proof must bind exact PDF bytes'
    assert sha(path) == attested['pdfSha256'], 'PDF bytes differ from content proof'
    with fitz.open(path) as pdf:
        assert len(pdf) == attested['pdfPages'], 'PDF page count differs from content proof'
        for label in ('main', 'side'):
            lane = fixture[label + 'Lane']
            margins = fixture['margins']
            clip = fitz.Rect((lane['leftMm'] - .5) * app.MM, (margins['top'] - .75) * app.MM,
                             (lane['rightMm'] + .5) * app.MM, (297 - margins['bottom'] + .75) * app.MM)
            actual = app.visible_story(fixture[label + 'Text'], [page.get_text(clip=clip) for page in pdf[2:]])
            assert actual['status'] == 'pass' and actual == attested['visibleStories'][label], 'PDF content differs from complete story proof'


def measure_native(path, canonical, engine, binding):
    before = sha(path)
    with tempfile.TemporaryDirectory(prefix='docx-next-app-grid-request-') as temporary:
        request = Path(temporary) / 'request.json'
        request.write_text(json.dumps({'path': str(path.resolve()), 'sha256': before,
                                       'canonicalOwnerFieldIds': canonical}))
        process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-native-grid-worker.py'), str(request)],
                                 env=app.entry.native_environment(engine, binding), capture_output=True, text=True, timeout=40)
        assert process.returncode == 0, process.stderr
        assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US'), process.stderr
        result = json.loads(process.stdout)
    assert sha(path) == before, 'Read-only geometry load changed input bytes'
    native_qa.validate_snapshot(result, canonical, before)
    assert result['ownerResolution'] == {'status': 'pass'}, 'Complete native owner must resolve before geometry'
    return result


def audit(folder, engine, binding):
    content_path = folder / 'app-body-report.json'
    content = json.loads(content_path.read_text())
    assert content['contentRoundtripAcceptance'] == 'pass', 'Complete content gate has not passed'
    assert json.loads((folder / 'manifest.json').read_text()) == app.NAMES, 'Incomplete matrix'
    assert [row['fixture'] for row in content['cases']] == app.NAMES, 'Incomplete content report'
    report = {'scope': 'Exact source→saved→saved2 geometry on the actual shared application artifacts',
              'contentReportSha256': sha(content_path), 'nativeWorkerSha256': sha(REPO / 'scripts/docx-next-native-grid-worker.py'),
              'newReadonlyNativeLoads': 0, 'newPreparedSources': 0, 'newNativeExports': 0,
              'completeCanonicalOwnersRequired': True, 'twipGeometryInferredFromPublicWidth': False,
              'liveImportExportIntermediateStagesMeasured': False,
              'sourceGridConsistencyAcceptance': 'pending', 'exactVisibleGeometryAcceptance': 'pending',
              'exactSerializedGeometryAcceptance': 'pending', 'exactPublicGridStabilityAcceptance': 'pending',
              'geometryAcceptance': 'unaccepted', 'productionAcceptance': 'blocked',
              'importObjectLifetime': 'unmeasured', 'microsoftWordAccepted': 0, 'cases': []}
    report_path = folder / 'app-save-geometry-report.json'

    def retain():
        report_path.write_text(json.dumps(report, indent=2) + '\n')

    retain()
    try:
        for name, content_case in zip(app.NAMES, content['cases']):
            fixture = json.loads((folder / (name + '.json')).read_text())
            source = folder / (name + '.docx')
            assert sha(source) == fixture['sourceSha256'] == content_case['sourceSha256'], 'Changed shared source'
            root = history.document(source)
            declared = [table for table in root.iter(W + 'tbl')
                        if (caption := table.find(W + 'tblPr/' + W + 'tblCaption')) is not None
                        and caption.get(W + 'val') == 'cv.sidebar']
            assert len(declared) == 1, 'Missing declared shared source owner'
            canonical = history.ids(declared[0])
            canonical_table(root, canonical)
            expected_body, expected_all = app.package_controls(source)
            old_native = json.loads((folder / (name + '-native.json')).read_text())
            assert len(old_native['cases']) == 3 and content_case['contentRoundtripAcceptance'] == 'pass'
            case = {'fixture': name, 'canonicalOwnerFieldIds': canonical, 'phases': [], 'comparisons': []}
            report['cases'].append(case)
            assert len(content_case['phases']) == 3, 'Incomplete phase proof'
            for phase, observed_content, attested in zip(PHASES, old_native['cases'], content_case['phases']):
                path = source if phase == 'source' else folder / (name + '-' + phase + '.docx')
                pdf = folder / (name + '-' + phase + '.pdf')
                assert observed_content['phase'] == phase and observed_content['inputSha256'] == sha(path), 'Changed native content input'
                assert attested['phase'] == phase, 'Reordered content phase proof'
                verify_pdf_content(pdf, fixture, attested)
                actual_body, actual_all = app.package_controls(path)
                assert actual_body == expected_body and list(actual_body) == list(expected_body) and actual_all == expected_all, 'Changed package identity/text/order'
                table = canonical_table(history.document(path), canonical)
                native = measure_native(path, canonical, engine, binding)
                report['newReadonlyNativeLoads'] += 1
                case['phases'].append({'phase': phase, 'inputSha256': sha(path), 'pdfSha256': sha(pdf),
                                       'serializedRoot': grid_record(table), 'serializedTables': nested_grids(table),
                                       'native': native})
                retain()
            for index in range(2):
                a, b = case['phases'][index:index + 2]
                comparison = dict(compare_pdf(folder / (name + '-' + a['phase'] + '.pdf'), folder / (name + '-' + b['phase'] + '.pdf')),
                                  fromPhase=a['phase'], toPhase=b['phase'],
                                  exactSerializedRoot=a['serializedRoot'] == b['serializedRoot'],
                                  exactSerializedTables=a['serializedTables'] == b['serializedTables'],
                                  exactPublicGrid=(a['native']['widthMm100'] == b['native']['widthMm100'] and
                                                   a['native']['relativeSum'] == b['native']['relativeSum'] and
                                                   a['native']['tableSeparators'] == b['native']['tableSeparators'] and
                                                   a['native']['rowSeparators'] == b['native']['rowSeparators']))
                case['comparisons'].append(comparison)
            retain()
        report['sourceGridConsistencyAcceptance'] = 'pass' if all(table['geometry']['sourceGridConsistent'] for case in report['cases'] for table in case['phases'][0]['serializedTables']) else 'fail'
        report['exactVisibleGeometryAcceptance'] = 'pass' if all(row['exactVisibleGeometry'] for case in report['cases'] for row in case['comparisons']) else 'fail'
        report['exactSerializedGeometryAcceptance'] = 'pass' if all(row['exactSerializedTables'] for case in report['cases'] for row in case['comparisons']) else 'fail'
        report['exactPublicGridStabilityAcceptance'] = 'pass' if all(row['exactPublicGrid'] for case in report['cases'] for row in case['comparisons']) else 'fail'
        # Collection success is never production/Word or native-lifetime acceptance.
        report['collectionStatus'] = 'pass'
        retain()
        return report
    except Exception as error:
        report['collectionStatus'] = 'fail'
        report['failure'] = type(error).__name__ + ': ' + str(error)
        retain()
        raise


def require_stable(report):
    assert report.get('collectionStatus') == 'pass', 'Incomplete geometry collection'
    assert all(report[key] == 'pass' for key in ('sourceGridConsistencyAcceptance', 'exactVisibleGeometryAcceptance',
                                                'exactSerializedGeometryAcceptance', 'exactPublicGridStabilityAcceptance')), 'Exact Save/Reopen geometry is not stable'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--engine', type=Path, required=True)
    parser.add_argument('--binding', type=Path, required=True)
    parser.add_argument('--require-stable', action='store_true', help='Reject any source contradiction or save geometry change; no tolerance waiver')
    args = parser.parse_args()
    result = audit(args.directory.resolve(), args.engine.resolve(), (args.binding / 'binding').resolve())
    print(json.dumps({key: result[key] for key in ('collectionStatus', 'sourceGridConsistencyAcceptance',
                                                  'exactVisibleGeometryAcceptance', 'exactSerializedGeometryAcceptance',
                                                  'exactPublicGridStabilityAcceptance', 'geometryAcceptance')}))
    if args.require_stable:
        require_stable(result)
