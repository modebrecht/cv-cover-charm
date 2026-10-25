"""Separate native frame transfer from lost dummy owners; audit already exported long text."""
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unicodedata

import fitz
from docx_next_story_qa import visible_story, native_stories, sha

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / 'docs/docx-next'


def module(name):
    spec = importlib.util.spec_from_file_location(name, REPO / 'scripts' / ('docx-next-' + name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


boundary = module('owner-boundary-qa')
elf = module('native-stack-elf')
symbols = module('native-symbol-qa')


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def normalize(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', value).replace('\u00ad', ''))


def unchanged_transfer(case, prior):
    observed = copy.deepcopy(case)
    disposals = [row for row in observed['controlLifetime'] if row['event'] == 'control-disposing']
    assert len(disposals) == 1 and disposals[0]['sameRegisteredInterface'] is True
    frames = disposals[0].pop('nativeFrames')
    # Native saved ZIP metadata varies; each current input is separately hash verified.
    for value in (observed, prior):
        value.pop('inputSha256', None)
    assert observed == prior, 'Transfer observer changed the complete prior native observation'
    assert case['controlLifetime'][-1] == {'event': 'final-control', 'sameRegisteredInterface': False}
    assert len(case['finalControls']) == 77
    first = next(row for row in case['finalControls'] if row['tag'] == case['canonicalOwnerFieldIds'][0])
    assert first['text'] == 'Kontakt' and first['table'] is not None and first['cell'] == 'A1'
    assert len(frames) == 48 and all(set(row) == {'library', 'returnOffset'} for row in frames)
    return digest(observed), frames


def resolve_frames(frames, root, engine, binding):
    manifest = json.loads((DOCS / 'stable-native-stack.json').read_text())
    images, functions, provenance = {}, {}, {}
    pinned_symbols = json.loads((DOCS / 'stable-native-symbols.json').read_text())['stable']['libraries']
    for name, pin in manifest['libraries'].items():
        path = (engine if pin['scope'] == 'engine' else binding) / 'usr/lib/libreoffice/program' / name
        image = elf.Elf(path)
        assert image.sha256 == pin['sha256'] and image.build_id == pin['buildId']
        images[name] = image
        functions[name] = image.functions
        if name in ('libswlo.so', 'libsw_writerfilterlo.so'):
            folder = root / 'native-symbols' / name
            data = {section: (folder / filename).read_bytes() for section, filename in symbols.SECTIONS.items()}
            for section, value in data.items():
                expected = pinned_symbols[name]['sections'][section]
                assert len(value) == expected['size'] and hashlib.sha256(value).hexdigest() == expected['sha256']
            functions[name] = symbols.parse_symbols(data['.symtab'], data['.strtab'], data['.note.gnu.build-id'], image.build_id, image.functions)
            provenance[name] = {'sha256': image.sha256, 'buildId': image.build_id,
                                'sections': {section: hashlib.sha256(value).hexdigest() for section, value in data.items()}}
    resolved = []
    for frame in frames:
        assert frame['library'] in images and type(frame['returnOffset']) is int
        matches = [function for function in functions[frame['library']]
                   if function['value'] <= frame['returnOffset'] - 1 < function['value'] + function['size']]
        resolved.append({**frame, 'functions': matches})
    return resolved, provenance


def visible_existing(root):
    folder = root / 'owner-boundary'
    name = 'owner-boundary-left-both-long'
    fixture = json.loads((folder / (name + '.json')).read_text())
    assert len(fixture['nativeParagraphs']) == 352
    owners = {label: {'table': 0, 'row': 0, 'cell': cell} for label, cell in fixture['declaredStoryCells'].items()}
    native = native_stories(folder / (name + '.docx'), [row['fieldId'] for row in fixture['nativeParagraphs']], owners)
    assert not native['errors']
    result = []
    for kind, pages in [('control', 4), ('boundary', 6)]:
        path = folder / (name + ('-control-source.pdf' if kind == 'control' else '-source.pdf'))
        with fitz.open(path) as pdf:
            assert len(pdf) == pages
            cv_text = normalize(''.join(page.get_text() for page in pdf[2:]))
            stories = {}
            for label in ('main', 'side'):
                lane = fixture[label + 'Lane']; margins = fixture['margins']; mm = 72 / 25.4
                clip = fitz.Rect((lane['leftMm'] - .5) * mm, (margins['top'] - 3) * mm,
                                 (lane['rightMm'] + .5) * mm, pdf[2].rect.height - (margins['bottom'] - 3) * mm)
                authored = fixture[label + 'Text']
                actual = [page.get_text(clip=clip) for page in pdf[2:]]
                missing, duplicates, seen = [], [], set()
                assert [row['textSha256'] for row in native['stories'][label]] == [sha(value) for value in authored]
                for paragraph, original_text in zip(native['stories'][label], authored):
                    text = normalize(original_text)
                    expected_count = sum(normalize(value) == text for value in authored)
                    found_count = cv_text.count(text) if text else expected_count
                    if found_count == 0 and expected_count > 0:
                        missing.append({'fieldId': paragraph['fieldId'], 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                                        'authoredOccurrences': expected_count, 'wholeCvPdfOccurrences': found_count})
                    elif 0 < found_count < expected_count and text not in seen:
                        # Repeated text cannot identify which particular field is absent from PDF.
                        duplicates.append({'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                                           'authoredOccurrences': expected_count, 'wholeCvPdfOccurrences': found_count,
                                           'missingOccurrences': expected_count - found_count})
                    seen.add(text)
                stories[label] = {'completeLaneText': visible_story(authored, actual),
                                  'paragraphsAbsentFromWholeCvPdf': missing,
                                  'incompleteDuplicateGroups': duplicates}
            result.append({'kind': kind, 'pages': pages, 'pdfSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                           'stories': stories})
    return result


def native_environment(engine, binding):
    env = os.environ.copy()
    env.update(LD_LIBRARY_PATH=':'.join((str(engine / 'usr/lib/libreoffice/program'), str(engine / 'usr/lib/x86_64-linux-gnu'),
                                       str(Path(sys.executable).resolve().parent.parent / 'lib'))),
               PYTHONPATH=':'.join((str(binding / 'usr/lib/libreoffice/program'), str(binding / 'usr/lib/python3/dist-packages'))),
               DOCX_NEXT_LO_ROOT=str(engine), DOCX_NEXT_UNO_BINDING=str(binding), SAL_USE_VCLPLUGIN='svp',
               LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    return env


def audit(root, binding_directory):
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    binding = (binding_directory / 'binding').resolve()
    before = {}
    prior_report = json.loads((root / 'owner-boundary-report.json').read_text())
    boundary.contract(prior_report)
    prior = prior_report['observation']['cases'][1]
    path = root / 'owner-boundary/owner-boundary-left-left-saved.docx'
    before[path] = hashlib.sha256(path.read_bytes()).hexdigest()
    assert before[path] == prior['inputSha256']
    transfer_request = {key: prior[key] for key in ('fixture', 'phase', 'canonicalOwnerFieldIds')}
    transfer_request.update(path=str(path.resolve()), sha256=before[path])
    placement_folder = root / 'control-placement'
    manifest = json.loads((placement_folder / 'control-placement-manifest.json').read_text())
    assert len(manifest) == 6
    first = manifest[0]
    placement_path = placement_folder / (first['name'] + '.docx')
    before[placement_path] = hashlib.sha256(placement_path.read_bytes()).hexdigest()
    assert before[placement_path] == first['docxSha256']
    fixture = json.loads((placement_folder / (first['name'] + '.json')).read_text())
    placement_request = {'fixture': first['name'], 'phase': 'source', 'path': str(placement_path.resolve()),
                         'sha256': before[placement_path], 'canonicalOwnerFieldIds': [row['fieldId'] for row in fixture['nativeParagraphs']]}
    with tempfile.TemporaryDirectory(prefix='docx-next-transfer-') as temporary:
        folder = Path(temporary); helper = folder / 'capture.so'; request = folder / 'request.json'
        subprocess.run(['gcc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror', '-o', str(helper),
                        str(REPO / 'scripts/docx-next-native-state-capture.c')], check=True, timeout=20)
        observations = []
        for current, worker, extra in [(transfer_request, 'owner-transfer-worker', ['--helper', str(helper)]),
                                       (placement_request, 'owner-boundary-worker', [])]:
            request.write_text(json.dumps([current]))
            process = subprocess.run([sys.executable, str(REPO / 'scripts' / ('docx-next-' + worker + '.py')), str(request), *extra],
                                     env=native_environment(engine, binding), capture_output=True, text=True, timeout=45)
            assert process.returncode == 0, process.stderr
            assert process.stderr.strip() in ('', 'Allowlisted languages: de-DE en-US')
            observations.append(json.loads(process.stdout))
            target = root / ('owner-transfer-observation.json' if worker == 'owner-transfer-worker' else 'control-placement/first-observation.json')
            target.write_text(json.dumps(observations[-1], indent=2) + '\n')
    original_digest, frames = unchanged_transfer(observations[0]['cases'][0], copy.deepcopy(prior))
    resolved, provenance = resolve_frames(frames, root, engine, binding)
    placement = observations[1]['cases'][0]
    expected = boundary.controls(placement_path)
    actual = {row['tag']: row for row in placement['finalControls']}
    missing = sorted(set(expected) - set(actual))
    assert len(expected) == 77 and len(actual) == 76 and missing == ['cv.section.person.heading']
    assert set(actual) <= set(expected)
    assert all(actual[tag]['text'].replace('\n', '').replace('\t', '') == expected[tag]['text'].replace('\n', '').replace('\t', '') for tag in actual)
    for original_path, sha in before.items():
        assert hashlib.sha256(original_path.read_bytes()).hexdigest() == sha
    report = {'version': 1, 'transfer': {'inputSha256': before[path], 'unchangedPriorObservationSha256': original_digest,
              'canonicalControlSurvives': False, 'completeFinalControls': 77, 'firstFinalText': 'Kontakt',
              'finalSemanticInventoryMatchesPrior': True, 'resolvedFrames': resolved, 'symbolProvenance': provenance},
              'placement': {'preparedSources': 6, 'executedImports': 1, 'unexecutedSources': 5,
                            'sourceSha256': before[placement_path], 'serializedControls': 77, 'nativeControls': 76,
                            'missingTags': missing, 'controlLifetime': placement['controlLifetime'],
                            'stoppedAt': 'first source import', 'candidateAccepted': False},
              'longVisibility': visible_existing(root), 'newReadonlyNativeLoads': 2, 'newNativeExports': 0,
              'historicalPackagesModified': 0, 'engineFilesModified': 0, 'newPdfExports': 0,
              'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0}
    return report


def contract(report):
    assert report['version'] == 1
    transfer = report['transfer']
    assert transfer['canonicalControlSurvives'] is False and transfer['finalSemanticInventoryMatchesPrior'] is True
    assert transfer['completeFinalControls'] == 77 and transfer['firstFinalText'] == 'Kontakt'
    for key in ('inputSha256', 'unchangedPriorObservationSha256'):
        assert re.fullmatch('[a-f0-9]{64}', transfer[key])
    prior = json.loads((DOCS / 'sidebar-owner-boundary-evidence.json').read_text())['local']['observation']['cases'][1]
    prior.pop('inputSha256')
    assert transfer['unchangedPriorObservationSha256'] == digest(prior)
    frames = transfer['resolvedFrames']
    assert len(frames) == 48
    required = ['SwXContentControl4Impl6Notify', 'DeleteAndJoinImpl', 'SwDoc14MakeFlyAndMove',
                'SwXFrame13attachToRange', 'SwXText18convertToTextFrame', 'DomainMapperTableHandler8endTable']
    names = '\n'.join(function['name'] for frame in frames for function in frame['functions'])
    assert all(name in names for name in required), 'Missing actual frame transfer caller'
    assert 'RemoveDummyParaForTableInSection' not in names, 'Dummy-owner cleanup substituted for frame transfer'
    manifest = json.loads((DOCS / 'stable-native-stack.json').read_text())
    pinned_symbols = json.loads((DOCS / 'stable-native-symbols.json').read_text())['stable']['libraries']
    for frame in frames:
        assert frame['library'] in manifest['libraries'] and type(frame['returnOffset']) is int
        for function in frame['functions']:
            assert function['value'] <= frame['returnOffset'] - 1 < function['value'] + function['size']
    for name in ('libswlo.so', 'libsw_writerfilterlo.so'):
        pin = transfer['symbolProvenance'][name]
        assert pin['sha256'] == manifest['libraries'][name]['sha256'] and pin['buildId'] == manifest['libraries'][name]['buildId']
        assert pin['sections'] == {section: value['sha256'] for section, value in pinned_symbols[name]['sections'].items()}
    placement = report['placement']
    assert placement['preparedSources'] == 6 and placement['executedImports'] == 1 and placement['unexecutedSources'] == 5
    assert placement['serializedControls'] == 77 and placement['nativeControls'] == 76
    assert placement['missingTags'] == ['cv.section.person.heading'] and placement['candidateAccepted'] is False
    assert placement['stoppedAt'] == 'first source import'
    assert placement['controlLifetime'] == [{'event': 'final-control', 'sameRegisteredInterface': False}]
    assert [(row['kind'], row['pages']) for row in report['longVisibility']] == [('control', 4), ('boundary', 6)]
    for row in report['longVisibility']:
        for label, authored in [('main', 8809), ('side', 5311)]:
            story = row['stories'][label]; text = story['completeLaneText']
            assert text['status'] == 'fail' and text['authoredCharacters'] == authored
            assert 0 < text['actualCharacters'] < authored
            assert text['authoredSha256'] != text['actualSha256']
            assert story['paragraphsAbsentFromWholeCvPdf']
            assert all(value['wholeCvPdfOccurrences'] == 0 < value['authoredOccurrences'] for value in story['paragraphsAbsentFromWholeCvPdf'])
            for value in story['incompleteDuplicateGroups']:
                assert 0 < value['wholeCvPdfOccurrences'] < value['authoredOccurrences']
                assert value['missingOccurrences'] == value['authoredOccurrences'] - value['wholeCvPdfOccurrences']
    for key, value in [('newReadonlyNativeLoads', 2), ('newNativeExports', 0), ('historicalPackagesModified', 0),
                       ('engineFilesModified', 0), ('newPdfExports', 0), ('microsoftWordAccepted', 0)]:
        assert type(report[key]) is int and report[key] == value
    assert report['productionAcceptance'] == 'blocked'
    return {'frameTransfer': 'observed copy/delete path with complete final semantics',
            'originalDummyOwnerLoss': 'distinct previously confirmed cause', 'inlinePlacement': 'rejected',
            'longControlVisibleText': 'fail', 'longBoundaryVisibleText': 'fail', 'productionAcceptance': 'blocked'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--binding', type=Path, required=True)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    result = audit(args.directory.resolve(), args.binding.resolve())
    (args.directory / 'owner-transfer-report.json').write_text(json.dumps(result, indent=2) + '\n')
    summary = contract(result)
    if args.baseline:
        expected = json.loads(args.baseline.read_text())['local']
        # Saved DOCX/PDF metadata carries producer times; all substantive measured data stays exact.
        comparable = copy.deepcopy(result); expected = copy.deepcopy(expected)
        for value in (comparable, expected):
            value['transfer'].pop('inputSha256')
            for row in value['longVisibility']:
                row.pop('pdfSha256')
        assert comparable == expected, 'Changed native transfer/placement/complete visibility evidence'
    print(json.dumps(summary))
