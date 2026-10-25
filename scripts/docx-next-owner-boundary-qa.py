"""Targeted native identity regression for the declared body boundary; never unlock Sidebar geometry."""
import argparse
import hashlib
import importlib.util
import json
import os
import shutil
from pathlib import Path
import subprocess
import sys
import tempfile
from zipfile import ZipFile
import fitz

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / 'docs/docx-next'
spec = importlib.util.spec_from_file_location('owner', REPO / 'scripts/docx-next-native-owner-qa.py')
owner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(owner)
boundary = owner.pop.cache.state.stack.imports.boundary
W = boundary.W


def controls(path):
    return boundary.package_controls(boundary.history.document(path))


def require_stable_control(phase):
    lifetime = phase['controlLifetime']
    assert lifetime[-1]['sameRegisteredInterface'] is True
    assert lifetime[-1] == {'event': 'final-control', 'sameRegisteredInterface': True}
    assert not any(row['event'] == 'control-disposing' for row in lifetime), 'Canonical control destroyed during import'


def validate_case(phases, expected):
    assert [row['phase'] for row in phases] == ['source', 'saved', 'saved2']
    reference = phases[0]['finalControls']
    assert len(reference) == len(expected) and len({row['tag'] for row in reference}) == len(reference)
    assert set(row['tag'] for row in reference) == set(expected)
    first = phases[0]['canonicalOwnerFieldIds'][0]
    first_reference = next(row for row in reference if row['tag'] == first)
    assert first_reference['table'] is not None and first_reference['cell'] in ('A1', 'C1') and first_reference['text'] == expected[first]['text']
    for phase in phases:
        assert phase['readOnly'] is True and phase['modified'] is False
        assert phase['finalControls'] == reference, 'Changed live ID/text/order/table/cell on Save/Reopen'
        lifetime = phase['controlLifetime']
        assert lifetime[0] == {'event': 'registered', 'canonicalTag': first}
        assert lifetime[-1]['event'] == 'final-control'
        assert type(lifetime[-1]['sameRegisteredInterface']) is bool
        if not any(row['event'] == 'live-control' for row in lifetime):
            # Some original DOCX paths emit only a final canonical snapshot.
            assert phase['events'][phase['paragraphDisposalRegistration']['eventIndex']]['event'] == 'end'
        assert all(row['event'] in ('registered', 'live-control', 'control-disposing', 'final-control') for row in lifetime)
        assert all(row.get('sameRegisteredInterface') is True for row in lifetime[1:-1])
        disposals = [row for row in lifetime if row['event'] == 'control-disposing']
        assert len(disposals) <= 1
        assert (len(disposals) == 0) == lifetime[-1]['sameRegisteredInterface'], 'Lifetime conclusion disagrees with actual disposal'
        assert phase['events'][-1]['tags'] == [row['tag'] for row in reference]
        assert all('error' not in event for event in phase['events'])
        samples = [event['firstControl'] for event in phase['events'] if event.get('firstControl')]
        assert samples, 'No live canonical owner observed during import'
        assert all(sample['text'] == first_reference['text'] and
                   sample['paragraphText'] == first_reference['text'] for sample in samples), 'Canonical control attached to empty/wrong paragraph'
        assert all((sample['table'], sample['cell']) in ((None, None),
                   (first_reference['table'], first_reference['cell'])) for sample in samples), 'Wrong native owner during table conversion'
        for tag, value in expected.items():
            # Serialized tags resolve identities; native strings are compared across all three imports.
            # Paragraph breaks/tabs may occur in a semantic field, so normalize only XML's omitted separators here.
            actual = next(row['text'] for row in phase['finalControls'] if row['tag'] == tag)
            assert actual.replace('\n', '').replace('\t', '') == value['text'].replace('\n', '').replace('\t', '')
    return {'firstControl': first_reference, 'completeControls': len(reference),
            'phases': 3, 'completeNativeTextOrderAndAncestry': 'pass',
            'controlDisposalsDuringImport': [sum(row['event'] == 'control-disposing' for row in phase['controlLifetime']) for phase in phases],
            'sameLiveControlAtImportEnd': [phase['controlLifetime'][-1]['sameRegisteredInterface'] for phase in phases],
            'liveControlChecks': [sum(row['event'] == 'live-control' for row in phase['controlLifetime']) for phase in phases],
            'earlyParagraphWrapperDisposals': [sum(row['event'] == 'first-paragraph-disposing' for row in phase['events']) for phase in phases]}


def audit(root, binding_directory):
    folder = root / 'owner-boundary'
    manifest = json.loads((folder / 'owner-boundary-manifest.json').read_text())
    assert [(row['orientation'], row['kind']) for row in manifest] == [(side, kind) for side in ('left', 'right') for kind in ('left', 'side-long', 'both-long')]
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    executable = engine / 'lo-kit'
    requests, packages, input_hashes = [], {}, {}
    def convert(source, target, format):
        with tempfile.TemporaryDirectory(prefix='docx-next-boundary-save-') as profile:
            # Kit may retain file locks until process teardown. Each execution gets
            # private byte-identical input/output paths, including on a QA rerun.
            temporary_source = Path(profile) / source.name
            temporary_target = Path(profile) / target.name
            shutil.copyfile(source, temporary_source)
            process = subprocess.run([str(executable), Path(profile).as_uri(), temporary_source.as_uri(), temporary_target.as_uri(), format], capture_output=True, text=True, timeout=60)
            assert process.returncode == 0 and temporary_target.is_file(), process.stderr
            shutil.copyfile(temporary_target, target)
    previous = json.loads((DOCS / 'sidebar-carrier-story-evidence.json').read_text())['stable']
    for case in manifest:
        name = case['name']
        source = folder / (name + '.docx')
        control = folder / (name + '-control.docx')
        fixture = json.loads((folder / (name + '.json')).read_text())
        old = next(row for row in previous['preparedSources'] if row['name'] == case['controlName'])
        assert hashlib.sha256(source.read_bytes()).hexdigest() == case['docxSha256']
        assert hashlib.sha256(control.read_bytes()).hexdigest() == case['controlDocxSha256'] == old['docxSha256']
        input_hashes[source] = case['docxSha256']
        input_hashes[control] = case['controlDocxSha256']
        with ZipFile(source) as a, ZipFile(control) as b:
            assert a.namelist() == b.namelist()
            for part in a.namelist():
                if part != 'word/document.xml':
                    assert a.read(part) == b.read(part)
        packages[name] = controls(source)
        saved = folder / (name + '-saved.docx')
        saved2 = folder / (name + '-saved2.docx')
        convert(source, saved, 'docx')
        convert(saved, saved2, 'docx')
        for phase, path in [('source', source), ('saved', saved), ('saved2', saved2)]:
            serialized = controls(path)
            assert serialized.keys() == packages[name].keys()
            assert all(serialized[tag]['text'] == packages[name][tag]['text'] for tag in serialized)
            sha = hashlib.sha256(path.read_bytes()).hexdigest()
            input_hashes[path] = sha
            requests.append({'path': str(path.resolve()), 'sha256': sha, 'fixture': name, 'phase': phase,
                             'canonicalOwnerFieldIds': [row['fieldId'] for row in fixture['nativeParagraphs']]})
    binding = (binding_directory / 'binding').resolve()
    program = engine / 'usr/lib/libreoffice/program'
    env = os.environ.copy()
    env.update(LD_LIBRARY_PATH=':'.join((str(program), str(engine / 'usr/lib/x86_64-linux-gnu'), str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(binding / 'usr/lib/libreoffice/program'), str(binding / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(binding), SAL_USE_VCLPLUGIN='svp', LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    with tempfile.TemporaryDirectory(prefix='docx-next-boundary-import-') as temporary:
        request_path = Path(temporary) / 'request.json'
        request_path.write_text(json.dumps(requests))
        process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-owner-boundary-worker.py'), str(request_path)], env=env, capture_output=True, text=True, timeout=90)
        assert process.returncode == 0, process.stderr
        observation = json.loads(process.stdout)
    # Retain the actual native counterexample before any acceptance assertion.
    (root / 'owner-boundary-import-observation.json').write_text(json.dumps(observation, indent=2) + '\n')
    summaries = []
    assert len(observation['cases']) == 18
    for i, case in enumerate(manifest):
        phases = observation['cases'][i * 3:i * 3 + 3]
        assert all(row['fixture'] == case['name'] for row in phases)
        summary = validate_case(phases, packages[case['name']])
        summary['fixture'] = case['name']
        summaries.append(summary)
    # Keep the stopped historical geometry matrix intact. This separate before/after
    # comparison checks the new boundary in each declared identity regression.
    geometry = []
    stopped_geometry = None
    for case in manifest:
        name = case['name']
        control_saved = folder / (name + '-control-saved.docx')
        for phase, suffix in [('source', ''), ('saved', '-saved')]:
            if phase == 'saved':
                convert(folder / (name + '-control.docx'), control_saved, 'docx')
            actual = folder / (name + '-' + phase + '.pdf')
            baseline = folder / (name + '-control-' + phase + '.pdf')
            convert(folder / (name + suffix + '.docx'), actual, 'pdf')
            convert(folder / (name + '-control' + suffix + '.docx'), baseline, 'pdf')
            with fitz.open(actual) as current, fitz.open(baseline) as old:
                if len(current) != len(old):
                    stopped_geometry = {'fixture': name, 'phase': phase, 'candidatePages': len(current),
                                        'controlPages': len(old), 'acceptance': 'fail',
                                        'reason': 'Boundary changed page count'}
                    break
                for index, (a, b) in enumerate(zip(current, old)):
                    assert a.get_text('words') == b.get_text('words'), 'Boundary changed PDF text/order/geometry: ' + name
                    a_pix, b_pix = a.get_pixmap(alpha=False), b.get_pixmap(alpha=False)
                    assert (a_pix.width, a_pix.height, a_pix.samples) == (b_pix.width, b_pix.height, b_pix.samples), 'Boundary changed PDF pixels: ' + name
                    geometry.append({'fixture': name, 'phase': phase, 'page': index + 1,
                                     'pixelSha256': hashlib.sha256(a_pix.samples).hexdigest()})
        if stopped_geometry:
            break
    # Also retain the independently executed historical first-case comparison.
    first = manifest[0]['name']
    raster = []
    for phase, suffix, original_pdf in [('source', '', '-render.pdf'), ('saved', '-saved', '-reopened.pdf')]:
        actual = folder / (first + '-' + phase + '.pdf')
        baseline = root / 'carrier-story' / ('carrier-story-left-left' + original_pdf)
        with fitz.open(actual) as current, fitz.open(baseline) as old:
            assert len(current) == len(old) == 3
            for index, (a, b) in enumerate(zip(current, old)):
                assert a.get_text('words') == b.get_text('words'), 'Changed original first-case PDF text/order/geometry'
                a_pix, b_pix = a.get_pixmap(alpha=False), b.get_pixmap(alpha=False)
                assert (a_pix.width, a_pix.height, a_pix.samples) == (b_pix.width, b_pix.height, b_pix.samples), 'Changed original first-case PDF pixels'
                raster.append({'phase': phase, 'page': index + 1, 'pixelSha256': hashlib.sha256(a_pix.samples).hexdigest()})
    for path, sha in input_hashes.items():
        assert hashlib.sha256(path.read_bytes()).hexdigest() == sha
    assert [row['sameLiveControlAtImportEnd'] for row in summaries] == [
        [True, False, False], [True, False, False], [True, False, False],
        [True, False, False], [True, True, True], [True, True, True]], 'Changed native owner counterexample'
    assert stopped_geometry == {'fixture': 'owner-boundary-left-both-long', 'phase': 'source',
                                'candidatePages': 6, 'controlPages': 4, 'acceptance': 'fail',
                                'reason': 'Boundary changed page count'}, 'Changed stopped boundary geometry counterexample'
    assert len(geometry) == 24
    return {'scope': 'Six separately declared native identity regressions; historical geometry matrix stays stopped',
            'cases': summaries, 'observation': observation, 'preparedSources': manifest,
            'serializedControls': packages,
            'boundaryWorkerSha256': hashlib.sha256((REPO / 'scripts/docx-next-owner-boundary-worker.py').read_bytes()).hexdigest(),
            'newPreparedSources': 6, 'newNativeExports': 24, 'newReadonlyNativeLoads': 18,
            'beforeStopPdfPixels': geometry, 'beforeStopPdfWordCoordinatesChanged': 0,
            'stoppedGeometry': stopped_geometry, 'geometryAcceptance': 'fail',
            'firstOriginalCasePdfPixels': raster, 'firstOriginalCasePdfWordCoordinatesChanged': 0,
            'historicalPackagesModified': 0, 'nativeGeometryAcceptance': 'unchanged fail',
            'semanticRoundtripAcceptance': 'pass', 'ownerLifetimeAcceptance': 'fail',
            'candidateAccepted': False, 'destroyedThenRecreatedCanonicalControls': 8,
            'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0}


def contract(report):
    assert len(report['cases']) == len(report['preparedSources']) == 6
    assert len(report['observation']['cases']) == 18
    for i, case in enumerate(report['cases']):
        assert case['fixture'] == report['preparedSources'][i]['name']
        phases = report['observation']['cases'][i * 3:i * 3 + 3]
        assert all(row['fixture'] == case['fixture'] for row in phases)
        actual = validate_case(phases, report['serializedControls'][case['fixture']])
        actual['fixture'] = case['fixture']
        assert case == actual
    assert [case['completeControls'] for case in report['cases']] == [77, 129, 382] * 2
    assert [case['sameLiveControlAtImportEnd'] for case in report['cases']] == [
        [True, False, False], [True, False, False], [True, False, False],
        [True, False, False], [True, True, True], [True, True, True]]
    assert [(row['fixture'], row['phase'], row['page']) for row in report['beforeStopPdfPixels']] == [
        ('owner-boundary-left-' + kind, phase, page)
        for kind, pages in [('left', 3), ('side-long', 9)]
        for phase in ('source', 'saved') for page in range(1, pages + 1)]
    assert all(len(row['pixelSha256']) == 64 and all(c in '0123456789abcdef' for c in row['pixelSha256'])
               for row in report['beforeStopPdfPixels'])
    assert report['stoppedGeometry'] == {'fixture': 'owner-boundary-left-both-long', 'phase': 'source',
                                        'candidatePages': 6, 'controlPages': 4, 'acceptance': 'fail',
                                        'reason': 'Boundary changed page count'}
    for key, value in [('newPreparedSources', 6), ('newNativeExports', 24), ('newReadonlyNativeLoads', 18),
                       ('beforeStopPdfWordCoordinatesChanged', 0), ('firstOriginalCasePdfWordCoordinatesChanged', 0),
                       ('destroyedThenRecreatedCanonicalControls', 8), ('historicalPackagesModified', 0),
                       ('microsoftWordAccepted', 0)]:
        assert type(report[key]) is int and report[key] == value
    assert report['semanticRoundtripAcceptance'] == 'pass'
    assert report['ownerLifetimeAcceptance'] == report['geometryAcceptance'] == 'fail'
    assert report['candidateAccepted'] is False
    assert report['productionAcceptance'] == 'blocked'
    assert report['nativeGeometryAcceptance'] == 'unchanged fail'
    assert report['boundaryWorkerSha256'] == hashlib.sha256((REPO / 'scripts/docx-next-owner-boundary-worker.py').read_bytes()).hexdigest()
    return {key: value for key, value in report.items() if key not in ('observation', 'serializedControls')}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--binding', required=True, type=Path)
    args = parser.parse_args()
    report = audit(args.root, args.binding)
    contract(report)
    (args.root / 'owner-boundary-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'cases': report['cases'], 'firstCasePdfPixelsIdentical': 6,
                      'candidateAccepted': report['candidateAccepted'],
                      'ownerLifetimeAcceptance': report['ownerLifetimeAcceptance'],
                      'productionAcceptance': report['productionAcceptance']}))
