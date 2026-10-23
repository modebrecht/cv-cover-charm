"""Read fresh Sidebar packages. Writer rendering is never Microsoft Word acceptance."""
import argparse
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path

import fitz

spec = importlib.util.spec_from_file_location(
    'acceptance_reader', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(value):
    return ''.join(c for c in value if c.isalnum()).casefold()


def inspect_case(folder, docx, proof, native_pdf, app_pdf, app_pages, aborted):
    package = reader.inspect(docx)
    counts = Counter((field['story'], key)
                     for key, fields in package['fields'].items() for field in fields)
    assert all(n == 1 for n in counts.values()), counts
    # Canonical source keys can repeat in separate first/running header stories.
    # This is not a globally unique-field pass or evidence of synchronized edits.
    repeated = {key: [field['story'] for field in package['fields'][key]]
                for key in package['duplicates']}
    picture = proof.get('picture')
    if picture:
        assert picture['source'] == picture['normalized']
        owners = [p for p in package['pictures'] if 'cv.person.photo' in p['owners']]
        assert len(owners) == 1
        assert len(package['fields']['cv.person.photo']) == 1
        assert package['fields']['cv.person.photo'][0]['typedPicture']
        assert owners[0]['pixels'] == picture['source']
        assert owners[0]['embeddedFileSha256'] == picture['normalizedFileSha256']
    else:
        owners = []
    with fitz.open(app_pdf) as app:
        assert len(app) == app_pages + 2
    result = {
        'case': folder.name, 'docxSha256': sha(docx), 'appPdfSha256': sha(app_pdf),
        'appCvPages': app_pages, 'modelCvPagination': proof['model']['cv']['layout']['pagination'],
        'sourceContinuationOverridePresent': 'cvContinuationTopMarginMm' in proof['snapshot']['settings'],
        'uniqueFieldTags': len(package['fields']), 'controls': sum(counts.values()),
        'uniquePerStoryAndTag': True, 'repeatedCanonicalTagsAcrossStories': repeated,
        'photoControls': owners, 'adjacentPartsModelUnchanged': proof['adjacentPartsUnchanged'],
        'persistedParagraphIdentity': 'UNASSESSABLE_WITHOUT_SOURCE_PARAGRAPH_IDS_AND_WORD_SAVE',
    }
    if native_pdf.exists():
        with fitz.open(native_pdf) as native:
            visible = compact(''.join(page.get_text() for page in native))
            missing = [key for key, fields in package['fields'].items()
                       if any(compact(field['plainText']) not in visible for field in fields)]
            assert not missing, (folder.name, missing)
            assert len(native) == app_pages + 2, (folder.name, len(native), app_pages + 2)
            result.update({'writerStatus': 'RENDERED', 'writerCvPages': len(native) - 2,
                           'allControlTextPresentInRenderedDossier': True,
                           'writerPdfSha256': sha(native_pdf)})
    else:
        assert folder.name in aborted, 'Missing render requires an explicitly recorded aborted import'
        result.update({'writerStatus': 'ABORTED_HUNG_IMPORT',
                       'allControlTextPresentInRenderedDossier': 'UNVERIFIED',
                       'writerCvPages': None})
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('zoom', type=Path)
    parser.add_argument('regression', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--aborted-writer-case', action='append', default=[],
                        help='Case whose hung import was observed and manually aborted; never inferred from a missing PDF')
    args = parser.parse_args()
    results = json.loads((args.candidate / 'results.json').read_text())
    cases = []
    for app_result in results:
        folder = args.candidate / app_result['id']
        proof = json.loads((folder / 'proof.json').read_text())
        assert app_result['productGuardPreserved'] and app_result['pixelsPreserved']
        assert app_result['pdfDownloaded'] and not app_result['jsErrors']
        assert all(p['clearanceMm'] >= 19.9 for p in app_result['pageStarts'])
        row = inspect_case(folder, folder / 'Candidate.docx', proof,
                           folder / 'native-render' / 'Candidate.pdf', folder / 'App.pdf',
                           len(app_result['pageStarts']), args.aborted_writer_case)
        row.update({k: app_result[k] for k in
                    ['photoClearanceMm', 'pageStarts', 'nativeContactFrames', 'productGuardPreserved']})
        assert not row['sourceContinuationOverridePresent']
        expected = (24 if app_result['id'].endswith('compact') else
                    46 if app_result['id'].endswith('inline') else 52)
        assert row['modelCvPagination']['firstTopMarginMm'] == expected
        assert row['modelCvPagination']['continuationTopMarginMm'] == (
            38 if app_result['id'].endswith('reduced') else expected)
        cases.append(row)
    assert len(cases) == 8
    zoom = []
    for name in ['left-contact-inline', 'right-contact-reduced']:
        normal, scaled = args.candidate / name / 'Candidate.docx', args.zoom / name / 'Candidate.docx'
        assert normal.read_bytes() == scaled.read_bytes()
        zoom.append({'case': name, 'deviceScaleFactor': 2, 'outerCssZoom': .75,
                     'docxByteIdentical': True, 'sha256': sha(normal)})
    regression = []
    for row in json.loads((args.regression / 'results.json').read_text()):
        assert row['productGuardPreserved'] and row['savedStateUnchanged'] and not row['jsErrors']
        assert row['primaryPdfDownloaded'] and row['adjacentPartsUnchanged']
        folder = args.regression / row['id']
        proof = json.loads((folder / 'proof.json').read_text())
        package = reader.inspect(folder / (row['id'] + '.docx'))
        photos = [p for p in package['pictures'] if 'cv.person.photo' in p['owners']]
        if proof.get('picture'):
            assert len(photos) == 1 and photos[0]['pixels'] == proof['picture']['source']
        regression.append({key: row[key] for key in
                           ['id', 'webCvPages', 'productGuardPreserved', 'savedStateUnchanged',
                            'primaryPdfDownloaded', 'adjacentPartsUnchanged', 'docxSha256']})
    assert len(regression) == 3
    report = {'baseCommit': '4521a8451dd04273a9788cba5dc3feefda134d48',
              'branch': 'fix/docx-next-shared-integration-22okt',
              'sourcePhoto': 'CHECKED_SYNTHETIC_FIXTURE_ONLY',
              'wordAcceptance': 'UNVERIFIED', 'saveReopen': 'NOT_RUN',
              'exactGeometryGate': 'NOT_RUN', 'productSidebarGuard': 'CLOSED',
              'writer': 'LibreOfficeDev 26.8 alpha0; seven renders, one aborted hung import',
              'unitTests': {'passed': 528, 'failed': 0, 'files': 75, 'expectations': 9206},
              'focusedStrictTypeScript': 'PASS', 'cases': cases,
              'displayScaleChecks': zoom, 'existingSavedAppRegression': regression}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'cases': len(cases), 'writerRenders': sum(r['writerStatus'] == 'RENDERED' for r in cases),
                      'zoomChecks': len(zoom), 'regressions': len(regression),
                      'wordAcceptance': report['wordAcceptance']}))


if __name__ == '__main__':
    main()
