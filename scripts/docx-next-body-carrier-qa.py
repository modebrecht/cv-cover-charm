"""One bounded whole body-carrier counterprobe; stop at the first ordered-text failure."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

import fitz
from docx_next_story_qa import native_stories, sha, visible_story

REPO = Path(__file__).resolve().parent.parent
DOCS = REPO / 'docs/docx-next'
spec = importlib.util.spec_from_file_location('transfer', REPO / 'scripts/docx-next-owner-transfer-qa.py')
transfer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transfer)


def audit(root, binding_directory):
    folder = root / 'body-carrier'
    name = 'body-carrier-left-both-long'
    source = folder / (name + '.docx')
    fixture = json.loads((folder / (name + '.json')).read_text())
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    assert before == fixture['sourceSha256']
    expected = transfer.boundary.controls(source)
    assert len(expected) == 382
    old_source = root / 'carrier-story/carrier-story-left-both-long.docx'
    old_controls = transfer.boundary.controls(old_source)
    assert expected == old_controls, 'Body composition changed semantic control text or order'
    owners = {label: {'table': 0, 'row': 0, 'cell': cell} for label, cell in fixture['declaredStoryCells'].items()}
    original_stories = native_stories(old_source, [row['fieldId'] for row in fixture['nativeParagraphs']], owners)
    assert not original_stories['errors']
    request = {'fixture': name, 'phase': 'source', 'path': str(source.resolve()), 'sha256': before,
               'canonicalOwnerFieldIds': [row['fieldId'] for row in fixture['nativeParagraphs']]}
    engine = Path(os.environ.get('DOCX_NEXT_LO_ROOT', root / 'setup/runtime')).resolve()
    binding = (binding_directory / 'binding').resolve()
    with tempfile.TemporaryDirectory(prefix='docx-next-body-carrier-import-') as temporary:
        request_path = Path(temporary) / 'request.json'; request_path.write_text(json.dumps([request]))
        process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-owner-boundary-worker.py'), str(request_path)],
                                 env=transfer.native_environment(engine, binding), capture_output=True, text=True, timeout=60)
        assert process.returncode == 0, process.stderr
        observation = json.loads(process.stdout)
    (folder / 'source-import-observation.json').write_text(json.dumps(observation, indent=2) + '\n')
    case = observation['cases'][0]
    assert case['readOnly'] is True and case['modified'] is False
    actual = {row['tag']: row for row in case['finalControls']}
    assert list(actual) == list(expected), 'Missing, duplicate or reordered native semantic control'
    assert all(actual[tag]['text'].replace('\n', '').replace('\t', '') == expected[tag]['text'].replace('\n', '').replace('\t', '') for tag in actual)
    transfer.boundary.require_stable_control(case)
    registration_event = case['events'][case['paragraphDisposalRegistration']['eventIndex']]['event']
    assert registration_event == 'end'
    assert not any(row['event'] == 'live-control' for row in case['controlLifetime'])
    first = actual['cv.section.person.heading']
    assert first['text'] == 'Kontakt' and first['table'] is not None and first['cell'] == 'A1'
    native_stories_report = {}
    for label in ('main', 'side'):
        declared = original_stories['stories'][label]
        assert [row['textSha256'] for row in declared] == [sha(value) for value in fixture[label + 'Text']]
        native_order = [row['tag'] for row in case['finalControls'] if row['tag'] in {field['fieldId'] for field in declared}]
        assert native_order == [row['fieldId'] for row in declared]
        # Nested entry tables own some controls; direct story paragraphs must retain the carrier cell.
        for field in declared:
            if len(field['owners']) == 1:
                assert actual[field['fieldId']]['table'] == first['table']
                assert actual[field['fieldId']]['cell'] == ('A1' if owners[label]['cell'] == 0 else 'C1')
        native_stories_report[label] = {'paragraphs': len(declared), 'wholeTextAndOrder': 'pass',
                                      'fieldOrderSha256': transfer.digest(native_order)}
    pdf_path = folder / (name + '-source.pdf')
    with tempfile.TemporaryDirectory(prefix='docx-next-body-carrier-pdf-') as temporary:
        directory = Path(temporary); copy = directory / source.name; target = directory / pdf_path.name
        shutil.copyfile(source, copy)
        process = subprocess.run([str(engine / 'lo-kit'), directory.as_uri(), copy.as_uri(), target.as_uri(), 'pdf'],
                                 capture_output=True, text=True, timeout=60)
        assert process.returncode == 0 and target.is_file(), process.stderr
        shutil.copyfile(target, pdf_path)
    visible, school_order, page_text = {}, [], []
    with fitz.open(pdf_path) as pdf:
        pages = len(pdf)
        for label in ('main', 'side'):
            lane = fixture[label + 'Lane']; margins = fixture['margins']; mm = 72 / 25.4
            clip = fitz.Rect((lane['leftMm'] - .5) * mm, (margins['top'] - 3) * mm,
                             (lane['rightMm'] + .5) * mm, pdf[2].rect.height - (margins['bottom'] - 3) * mm)
            visible[label] = visible_story(fixture[label + 'Text'], [page.get_text(clip=clip) for page in pdf[2:]])
        for index, page in enumerate(pdf):
            words = page.get_text('words')
            page_text.append({'page': index + 1, 'wordsSha256': transfer.digest(words)})
            if index >= 2:
                for i, word in enumerate(words[:-1]):
                    if word[4] == 'Schule' and words[i + 1][4].isdigit():
                        school_order.append({'number': int(words[i + 1][4]), 'page': index + 1,
                                             'x': word[0], 'y': word[1]})
                page.get_pixmap(alpha=False).save(str(folder / f'{name}-page-{index + 1}.png'))
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    # Separate read-only cause measurement on the same unchanged source after the PDF stop.
    request['nativeStoryCells'] = {'main': 'C1', 'side': 'A1'}
    with tempfile.TemporaryDirectory(prefix='docx-next-body-nodes-') as temporary:
        request_path = Path(temporary) / 'request.json'; request_path.write_text(json.dumps([request]))
        process = subprocess.run([sys.executable, str(REPO / 'scripts/docx-next-body-node-worker.py'), str(request_path)],
                                 env=transfer.native_environment(engine, binding), capture_output=True, text=True, timeout=60)
        assert process.returncode == 0, process.stderr
        nodes = json.loads(process.stdout)
    (folder / 'source-node-observation.json').write_text(json.dumps(nodes, indent=2) + '\n')
    node_case = nodes['cases'][0]
    assert node_case['readOnly'] is True and node_case['modified'] is False
    assert node_case['finalControls'] == case['finalControls']
    node_stories = {}
    for label, paragraphs in node_case['nativeStoryNodes'].items():
        node_stories[label] = {'nativeParagraphNodes': len(paragraphs),
                              'nonemptyParagraphNodes': sum(bool(row['text']) for row in paragraphs),
                              'completeNativeNodeText': visible_story(fixture[label + 'Text'], [row['text'] for row in paragraphs])}
    node_schools = [{'number': int(row['text'].split()[1]), 'ownerPath': row['ownerPath']}
                    for row in node_case['nativeStoryNodes']['main']
                    if row['text'].startswith('Schule ') and row['text'].split()[1].isdigit()]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before
    result = {'fixture': name, 'sourceSha256': before, 'serializedControls': len(expected),
              'nativeControls': len(actual), 'nativeStories': native_stories_report,
              'canonicalControlLifetime': case['controlLifetime'], 'firstFinalControl': first,
              'canonicalLifetimeCoverage': 'final-only; earlier lifetime unobserved',
              'pdfPages': pages, 'visibleStories': visible, 'visibleSchoolOrder': school_order,
              'nativeNodeStories': node_stories, 'nativeNodeSchoolOrder': node_schools,
              'pageWordDigests': page_text, 'newPreparedSources': 1, 'newReadonlyNativeLoads': 2,
              'newNativePdfExports': 1, 'newNativeDocxExports': 0, 'newSavedImports': 0,
              'stoppedAt': 'first source PDF ordered main story', 'candidateAccepted': False,
              'geometryAcceptance': 'unaccepted', 'productionAcceptance': 'blocked', 'microsoftWordAccepted': 0}
    return result


def contract(report):
    assert report['fixture'] == 'body-carrier-left-both-long'
    assert report['serializedControls'] == report['nativeControls'] == 382
    assert report['nativeStories']['main']['paragraphs'] == 279 and report['nativeStories']['side']['paragraphs'] == 73
    assert all(row['wholeTextAndOrder'] == 'pass' for row in report['nativeStories'].values())
    transfer.boundary.require_stable_control({'controlLifetime': report['canonicalControlLifetime']})
    assert report['canonicalLifetimeCoverage'] == 'final-only; earlier lifetime unobserved'
    assert report['canonicalControlLifetime'] == [{'event': 'registered', 'canonicalTag': 'cv.section.person.heading'},
                                                {'event': 'final-control', 'sameRegisteredInterface': True}]
    assert report['firstFinalControl']['tag'] == 'cv.section.person.heading' and report['firstFinalControl']['text'] == 'Kontakt'
    assert report['firstFinalControl']['cell'] == 'A1'
    assert report['pdfPages'] == 11 and len(report['pageWordDigests']) == 11
    main, side = report['visibleStories']['main'], report['visibleStories']['side']
    assert main['status'] == 'fail' and main['actualCharacters'] == main['authoredCharacters'] == 8809
    assert main['authoredSha256'] != main['actualSha256']
    assert side['status'] == 'pass' and side['actualCharacters'] == side['authoredCharacters'] == 5311
    assert side['authoredSha256'] == side['actualSha256']
    actual = [row['number'] for row in report['visibleSchoolOrder']]
    assert actual == list(range(1, 6)) + list(range(12, 18)) + list(range(6, 12)) + list(range(18, 66))
    assert actual != list(range(1, 66)) and sorted(actual) == list(range(1, 66))
    assert [(row['number'], row['page']) for row in report['visibleSchoolOrder'][:6]] == [(i, 3) for i in range(1, 6)] + [(12, 4)]
    assert [row['number'] for row in report['nativeNodeSchoolOrder']] == list(range(1, 66))
    for label, total, nonempty in [('main', 419, 279), ('side', 74, 73)]:
        story = report['nativeNodeStories'][label]
        assert story['nativeParagraphNodes'] == total and story['nonemptyParagraphNodes'] == nonempty
        text = story['completeNativeNodeText']
        assert text['status'] == 'pass' and text['authoredSha256'] == text['actualSha256']
    for key, value in [('newPreparedSources', 1), ('newReadonlyNativeLoads', 2), ('newNativePdfExports', 1),
                       ('newNativeDocxExports', 0), ('newSavedImports', 0), ('microsoftWordAccepted', 0)]:
        assert type(report[key]) is int and report[key] == value
    assert report['stoppedAt'] == 'first source PDF ordered main story' and report['candidateAccepted'] is False
    assert report['geometryAcceptance'] == 'unaccepted' and report['productionAcceptance'] == 'blocked'
    return {'nativeCompleteIdentityAndOrder': 'pass', 'canonicalObjectLifetime': 'unobserved before final registration',
            'actualNativeNodeTextOrder': 'pass',
            'sideVisibleCompleteOrder': 'pass', 'mainVisibleCompleteOrder': 'fail',
            'candidateAccepted': False, 'saveReopen': 'unexecuted after source stop'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--binding', type=Path, required=True)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    result = audit(args.directory.resolve(), args.binding.resolve())
    (args.directory / 'body-carrier-report.json').write_text(json.dumps(result, indent=2) + '\n')
    summary = contract(result)
    if args.baseline:
        assert result == json.loads(args.baseline.read_text())['local'], 'Changed whole body-carrier counterexample'
    print(json.dumps(summary))
