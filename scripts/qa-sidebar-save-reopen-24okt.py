"""Read actual synthetic Sidebar Save/Reopen files; never manufacture an Office PASS."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
from zipfile import ZipFile

import fitz
from PIL import Image

spec = importlib.util.spec_from_file_location(
    'reader', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(text):
    return ''.join(c for c in text if c.isalnum()).casefold()


def asset_by_hash(path, fingerprint):
    with ZipFile(path) as archive:
        for name in archive.namelist():
            if name.startswith('word/media/'):
                data = archive.read(name)
                if hashlib.sha256(data).hexdigest() == fingerprint:
                    return Image.open(io.BytesIO(data)).convert('RGBA')
    raise ValueError('Missing expected image asset')


def inspect_case(folder, basename):
    source = folder / basename
    before = reader.inspect(source)
    record = json.loads((folder / 'writer-save-results.json').read_text())
    assert record['sourceUnchanged'] and record['originalSha256'] == sha(source)
    assert len(record['rounds']) == 2 and all(r['state'] == 'COMPLETED' for r in record['rounds'])
    proof = json.loads((folder / 'proof.json').read_text())
    photos = [p for p in before['pictures'] if 'cv.person.photo' in p['owners']]
    assert len(photos) == 1 and photos[0]['pixels'] == proof['picture']['source']
    assert proof['picture']['source'] == proof['picture']['normalized']
    assert photos[0]['embeddedFileSha256'] == proof['picture']['normalizedFileSha256']
    self_test = reader.compare(source, source)
    assert all(r['matchStatus'] == 'MATCHED' and r['fieldTokensUnchanged'] and r['controlNestingUnchanged']
               for r in self_test['instances'])
    paths = [source] + [folder / ('writer-save-'+str(n)) / basename for n in [1, 2]]
    rows = []
    texts = [f['plainText'] for records in before['fields'].values() for f in records if compact(f['plainText'])]
    for index, path in enumerate(paths):
        current = reader.inspect(path)
        comparison = reader.compare(source, path)
        pdf_path = path.parent / 'native-render' / (path.stem + '.pdf')
        render = json.loads((path.parent / 'render-result.json').read_text())
        assert render['state'] == 'COMPLETED' and render['pdfExists'] and render['docxSha256'] == sha(path)
        with fitz.open(pdf_path) as pdf:
            visible = compact(''.join(page.get_text() for page in pdf))
            missing_pdf = sum(compact(text) not in visible for text in texts)
            header_checks = []
            header_metrics = proof.get('interiorMetrics', {}).get('headers', {}).get('cv')
            if header_metrics:
                for n, page in enumerate(list(pdf)[2:]):
                    m = header_metrics['first' if n == 0 else 'continuation']
                    region = fitz.Rect(0, 0, page.rect.width, (m['heightMm'] + 1) * 72 / 25.4)
                    header = compact(page.get_text(clip=region))
                    fields = [r for f in m['frames'] for p in f['paragraphs'] for r in p['runs'] if r.get('fieldId')]
                    header_checks.append({'cvPage': n + 1,
                                          'allExpectedContactTextInHeader': all(compact(r['text']) in header for r in fields)})
            pages = len(pdf)
        assert missing_pdf == 0
        assert all(r['allExpectedContactTextInHeader'] for r in header_checks)
        xml = compact(current['plainText'])
        missing_xml = sum(compact(text) not in xml for text in texts)
        assert missing_xml == 0
        instances = comparison['instances']
        row = {'save': index, 'docxSha256': sha(path), 'pdfSha256': sha(pdf_path),
               'declaredApplication': current['declaredApplication'], 'dossierPages': pages,
               'tagKeys': len(current['fields']),
               'taggedControlOccurrences': sum(len(r) for r in current['fields'].values()),
               'sourceOccurrencesMatched': sum(r['matchStatus'] == 'MATCHED' for r in instances),
               'sourceOccurrencesMissingOrMoved': sum(r['matchStatus'].startswith('MISSING') for r in instances),
               'sourceOccurrencesAmbiguous': sum(r['matchStatus'].startswith('AMBIGUOUS') for r in instances),
               'matchedOccurrencesWithExactTextTokens': sum(r['fieldTokensUnchanged'] for r in instances),
               'matchedOccurrencesWithSameNesting': sum(r['controlNestingUnchanged'] for r in instances),
               'allSourceTaggedTextInXml': True, 'allSourceTaggedTextInRenderedDossier': True,
               'perPageContactHeaderChecks': header_checks,
               'photo': comparison['pictures'],
               'sourceContentKinds': dict(Counter(f['contentKind'] for records in before['fields'].values() for f in records)),
               'duplicateNativeSdtIds': current['duplicateNativeSdtIds']}
        if index:
            assert record['rounds'][index-1]['savedSha256'] == sha(path)
            row['actualSaveSeconds'] = record['rounds'][index-1]['elapsedSeconds']
        rows.append(row)
    assert len({r['dossierPages'] for r in rows}) == 1
    auto_crop = None
    if photos[0]['pixels']['width'] == 120 and photos[0]['pixels']['height'] == 180:
        a = asset_by_hash(source, photos[0]['embeddedFileSha256'])
        b = asset_by_hash(paths[1], rows[1]['photo'][0]['saved']['embeddedFileSha256'])
        auto_crop = a.crop((0, 15, 120, 165)).tobytes() == b.tobytes()
    return {'case': folder.name, 'sourceUnchanged': True, 'comparisonBaselineAlwaysSaveZero': True,
            'sourcePhoto': proof['picture']['source'], 'firstSavedAssetEqualsOriginalCropY15To165': auto_crop,
            'phases': rows}


def historical_word(original, returned):
    result = reader.compare(original, returned)
    before, after = reader.inspect(original), reader.inspect(returned)
    return {'scope': 'HISTORICAL_MODERN_CONTACT_CLASSIC_CV_WITHOUT_PHOTO',
            'sourceSha256': sha(original), 'returnedSha256': sha(returned),
            'declaredApplications': result['declaredApplications'],
            'sourceTagKeys': result['sourceFields'], 'returnedTagKeys': result['savedFields'],
            'sourceOccurrences': len(result['instances']),
            'matchedOccurrences': sum(r['matchStatus'] == 'MATCHED' for r in result['instances']),
            'sameStoryRoles': sum(r['canonicalStoryRolesUnchanged'] for r in result['instances']),
            'sameNesting': sum(r['controlNestingUnchanged'] for r in result['instances']),
            'sameTextTokens': sum(r['fieldTokensUnchanged'] for r in result['instances']),
            'changedTextKeys': sorted({r['field'] for r in result['instances'] if not r['fieldTokensUnchanged']}),
            'sourceControlsWithNumericIds': sum(f['nativeSdtId'] is not None for records in before['fields'].values() for f in records),
            'returnedControlsWithNumericIds': sum(f['nativeSdtId'] is not None for records in after['fields'].values() for f in records),
            'returnedIdCollisions': after['duplicateNativeSdtIds'],
            'photoCount': len(result['pictures']), 'currentSidebarAcceptance': 'NOT_ESTABLISHED',
            'metadataAloneProvesApplication': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('automatic', type=Path)
    parser.add_argument('free', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--reader-tests-log', required=True, type=Path)
    parser.add_argument('--historical-word-original', type=Path)
    parser.add_argument('--historical-word-returned', type=Path)
    args = parser.parse_args()
    if args.report.suffix.lower() != '.json' or any(
        args.report.resolve().is_relative_to(folder.resolve()) for folder in [args.automatic, args.free]
    ):
        parser.error('Write a JSON report outside the read-only input case directories')
    tests = args.reader_tests_log.read_text()
    count = re.search(r'Ran (\d+) tests', tests)
    assert count and tests.rstrip().endswith('OK')
    cases = [inspect_case(args.automatic, 'Candidate.docx'),
             inspect_case(args.free, '06-Sidebar-rechts-Foto-frei.docx')]
    report = {'productBase': '9e7579c08527310d8b21bba2807924fb0c8de463',
              'branch': 'fix/docx-next-shared-integration-22okt',
              'sourcePictures': 'CHECKED_SYNTHETIC_FIXTURES_ONLY',
              'readerTestsPassed': int(count.group(1)), 'cases': cases,
              'currentWordAcceptance': 'UNVERIFIED', 'exactGeometryGate': 'NOT_RERUN',
              'productSidebarGuard': 'CLOSED', 'productCodeChanged': False}
    if args.historical_word_original and args.historical_word_returned:
        report['historicalWord'] = historical_word(args.historical_word_original, args.historical_word_returned)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'readerTests': int(count.group(1)), 'saveReopenCases': len(cases),
                      'phases': sum(len(c['phases']) for c in cases),
                      'renderedDossierPages': sum(p['dossierPages'] for c in cases for p in c['phases']),
                      'wordAcceptance': 'UNVERIFIED'}))


if __name__ == '__main__':
    main()
