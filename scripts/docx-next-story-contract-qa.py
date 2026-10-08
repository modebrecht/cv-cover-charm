"""Audit complete multi-paragraph stories on already executed native packages. Never exports or repairs XML."""
import argparse
import importlib.util
import json
from pathlib import Path

import fitz
from docx_next_story_qa import compare_native_stories, native_stories, sha, visible_story, write_story_report

spec = importlib.util.spec_from_file_location('continuation', Path(__file__).with_name('docx-next-floating-continuation-qa.py'))
continuation = importlib.util.module_from_spec(spec); spec.loader.exec_module(continuation)


def audit_matrix(directory, matrix):
    report = json.loads((directory / (matrix + '-report.json')).read_text())
    results = []
    for row in report['cases']:
        name = row['fixture']
        fixture = json.loads((directory / (name + '.json')).read_text())
        source, saved = directory / (name + '.docx'), directory / (name + '-saved.docx')
        assert continuation.hashlib.sha256(source.read_bytes()).hexdigest() == row['docxSha256'], 'Changed original native source'
        assert continuation.hashlib.sha256(saved.read_bytes()).hexdigest() == row['savedDocxSha256'], 'Changed actual saved native package'
        fields = [field['fieldId'] for field in fixture['nativeParagraphs']]
        original, reopened = native_stories(source, fields), native_stories(saved, fields)
        for label in ('main', 'side'):
            assert len(original['stories'][label]) > 1, 'Single paragraph does not establish a multi-paragraph story contract'
            assert [field['textSha256'] for field in original['stories'][label]] == [sha(value) for value in fixture[label + 'Text']], 'Changed complete source story text/order'
        phases = {}
        for phase, suffix in (('render', '-render.pdf'), ('saveReopen', '-reopened.pdf')):
            pdf = directory / (name + suffix)
            # Recompute existing evidence too; a stale JSON report cannot authorize new content evidence.
            assert continuation.pdf_result(pdf, fixture) == row[phase], 'Actual PDF differs from executed report'
            tracks = {}
            with fitz.open(pdf) as document:
                for label in ('main', 'side'):
                    lane, margins = fixture[label + 'Lane'], fixture['margins']
                    texts = []
                    for page in document[2:]:
                        clip = fitz.Rect((lane['leftMm'] - .5) * 72 / 25.4, (margins['top'] - 3) * 72 / 25.4,
                                         (lane['rightMm'] + .5) * 72 / 25.4, page.rect.height - (margins['bottom'] - 3) * 72 / 25.4)
                        texts.append(page.get_text(clip=clip))
                    tracks[label] = visible_story(fixture[label + 'Text'], texts)
            phases[phase] = tracks
        native = compare_native_stories(original, reopened)
        reasons = list(row['candidateFailures'])
        if native['status'] != 'pass': reasons.append('whole-native-story-contract')
        for phase, tracks in phases.items():
            if any(track['status'] != 'pass' for track in tracks.values()): reasons.append(phase + '-whole-visible-story-sequence')
        if row['nativeIdentity']['tableIdentity'] != 'pass': reasons.append('original-container-caption-identity')
        results.append({'fixture': name, 'docxSha256': row['docxSha256'], 'native': native,
                        'sourceStories': original['stories'], 'savedStories': reopened['stories'], 'visible': phases,
                        'logicalAnchorFieldIds': row['sourceNative']['logicalAnchor']['fieldIds'],
                        'mainOpeningCvPages': {phase: row[phase]['tracks']['main']['openingCvPages'] for phase in phases},
                        'blockedReasons': reasons, 'acceptance': 'blocked' if reasons else 'bounded contract pass; Word pending'})
    return {'matrix': matrix, 'preparedSources': report['preparedSources'], 'earlyStop': report['earlyStop'],
            'actualCases': len(results), 'cases': results, 'architectureAcceptance': 'blocked; no mechanism establishes complete independent main continuation',
            'microsoftWord': 'pending', 'newNativeExecutions': 0}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('--baseline', type=Path)
    args = parser.parse_args()
    result = {'matrices': [audit_matrix(args.root / matrix, matrix) for matrix in ('floating-continuation', 'floating-anchor')]}
    write_story_report(result, args.root / 'whole-story-contract-report.json', args.baseline)
    print(json.dumps({'actualCases': sum(matrix['actualCases'] for matrix in result['matrices']),
                      'nativeStoryFailures': sum(case['native']['status'] != 'pass' for matrix in result['matrices'] for case in matrix['cases']),
                      'visibleSequenceFailures': sum(track['status'] != 'pass' for matrix in result['matrices'] for case in matrix['cases'] for phase in case['visible'].values() for track in phase.values()),
                      'architectureAcceptance': 'blocked', 'newNativeExecutions': 0}))


if __name__ == '__main__': main()
