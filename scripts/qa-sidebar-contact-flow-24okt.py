"""Bounded, synthetic DOCX isolation and before/after evidence. Never Word acceptance."""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time
from zipfile import ZipFile, ZIP_DEFLATED

import fitz
from lxml import etree as ET

spec = importlib.util.spec_from_file_location(
    'acceptance', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W = '{' + NS['w'] + '}'
VARIANTS = ['no-cv-header-text', 'splittable-nested-rows', 'no-cv-running-text',
            'cv-header-no-wrap', 'cv-running-no-wrap']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compact(text):
    return ''.join(c for c in text if c.isalnum()).casefold()


def prepare(base):
    source = base / 'right-contact-long' / 'Candidate.docx'
    for variant in VARIANTS:
        folder = base / variant
        folder.mkdir(exist_ok=True)
        changes = {}
        with ZipFile(source) as before, ZipFile(folder / 'Candidate.docx', 'w', ZIP_DEFLATED) as after:
            for name in before.namelist():
                data = before.read(name)
                headers = (['word/cv-header.xml'] if variant in ['no-cv-running-text', 'cv-running-no-wrap']
                           else ['word/cv-header.xml', 'word/cv-header-first.xml'])
                if variant != 'splittable-nested-rows' and name in headers:
                    root = ET.fromstring(data)
                    nodes = root.xpath('./w:p[w:pPr/w:framePr]', namespaces=NS)
                    for node in nodes:
                        if variant.startswith('no-'):
                            root.remove(node)
                        else:
                            node.find('w:pPr/w:framePr', NS).set(W + 'wrap', 'none')
                    changes[name] = len(nodes)
                    data = ET.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
                if variant == 'splittable-nested-rows' and name == 'word/document.xml':
                    root = ET.fromstring(data)
                    nodes = root.find('w:body/w:tbl', NS).findall('.//w:trPr/w:cantSplit', NS)
                    for node in nodes:
                        node.getparent().remove(node)
                    changes[name] = len(nodes)
                    data = ET.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
                after.writestr(name, data)
        (folder / 'variant.json').write_text(json.dumps({
            'sourceSha256': sha(source), 'changes': changes, 'diagnosticOnly': True}, indent=2) + '\n')


def render(path, seconds):
    output = path.parent / 'native-render'
    output.mkdir(exist_ok=True)
    start = time.monotonic()
    with (path.parent / 'render.log').open('w') as log:
        proc = subprocess.Popen([
            os.environ['CODEX_PRIMARY_RUNTIME_PYTHON'],
            '/root/.codex/skills/builtins/documents/render_docx.py', str(path),
            '--output_dir', str(output), '--emit_pdf'],
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = proc.wait(timeout=seconds)
            status = 'COMPLETED' if code == 0 else 'ERROR'
        except subprocess.TimeoutExpired:
            os.killpg(proc.pid, signal.SIGKILL)
            proc.wait()
            code, status = None, 'TIMEOUT'
    result = {'case': path.parent.name, 'docxSha256': sha(path), 'state': status,
              'seconds': round(time.monotonic() - start, 2), 'exitCode': code,
              'pdfExists': (output / (path.stem + '.pdf')).exists()}
    (path.parent / 'render-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result), flush=True)


def evidence(base, fixed, report, unit_log, types_log):
    test_result = re.search(r'(\d+) pass\s+(\d+) fail\s+(\d+) expect\(\) calls\s+Ran \d+ tests across (\d+) files',
                            unit_log.read_text())
    assert test_result, 'A completed test log is required'
    passed, failed, expectations, files = map(int, test_result.groups())
    assert failed == 0 and not types_log.read_text().strip()
    old = {r['case']: r for r in json.loads(Path(
        'docs/qa/docx-next-sidebar-contact-chrome-23okt-evidence.json').read_text())['cases']}
    isolation = []
    for name in ['right-contact-long', 'right-contact-reduced', *VARIANTS]:
        folder = base / name
        result = json.loads((folder / 'render-result.json').read_text())
        result['docxSha256'] = sha(folder / 'Candidate.docx')
        if name in old:
            assert result['docxSha256'] == old[name]['docxSha256']
        else:
            result['diagnosticChanges'] = json.loads((folder / 'variant.json').read_text())['changes']
        isolation.append(result)
    before = reader.inspect(base / 'right-contact-long' / 'Candidate.docx')
    for name in ['cv-header-no-wrap', 'cv-running-no-wrap', 'splittable-nested-rows']:
        actual = reader.inspect(base / name / 'Candidate.docx')
        assert all(before[k] == actual[k] for k in ['fields', 'pictures', 'assets', 'plainText'])
    rows = []
    for app in json.loads((fixed / 'results.json').read_text()):
        folder = fixed / app['id']
        source = json.loads((folder / 'proof.json').read_text())
        package = reader.inspect(folder / 'Candidate.docx')
        photo = [p for p in package['pictures'] if 'cv.person.photo' in p['owners']]
        assert len(photo) == len(package['fields']['cv.person.photo']) == 1
        assert package['fields']['cv.person.photo'][0]['typedPicture']
        assert photo[0]['pixels'] == source['picture']['source'] == source['picture']['normalized']
        assert photo[0]['embeddedFileSha256'] == source['picture']['normalizedFileSha256']
        with ZipFile(folder / 'Candidate.docx') as archive:
            for name in ['word/cv-header.xml', 'word/cv-header-first.xml',
                         'word/letter-header.xml', 'word/letter-header-first.xml']:
                if name not in archive.namelist():
                    continue
                frames = ET.fromstring(archive.read(name)).findall('.//w:framePr', NS)
                assert all(f.get(W + 'wrap') == 'none' for f in frames)
        state = json.loads((folder / 'render-result.json').read_text())
        assert state['state'] == 'COMPLETED' and state['pdfExists']
        with fitz.open(folder / 'native-render' / 'Candidate.pdf') as native, fitz.open(folder / 'App.pdf') as pdf:
            visible = compact(''.join(p.get_text() for p in native))
            assert all(compact(f['plainText']) in visible
                       for fields in package['fields'].values() for f in fields)
            assert len(native) == len(pdf) == len(app['pageStarts']) + 2
            pages = len(native)
            header_checks = []
            for index, page in enumerate(list(native)[2:]):
                if not source.get('interiorMetrics', {}).get('headers', {}).get('cv'):
                    continue
                header = source['interiorMetrics']['headers']['cv'][
                    'first' if index == 0 else 'continuation']
                clip = fitz.Rect(0, 0, page.rect.width, (header['heightMm'] + .5) * 72 / 25.4)
                header_text = compact(page.get_text(clip=clip))
                fields = [run for frame in header['frames'] for paragraph in frame['paragraphs']
                          for run in paragraph['runs'] if run.get('fieldId')]
                assert fields and all(compact(run['text']) in header_text for run in fields)
                ink = page.get_pixmap(clip=fitz.Rect(1, 1, 2, 2), alpha=False).samples[:3]
                # PDF raster color conversion differs by one blue-channel level.
                # This tests presence of the authored paint, not exact color fidelity.
                expected_ink = bytes.fromhex(header['background'])
                assert max(abs(a - b) for a, b in zip(expected_ink, ink)) <= 1
                header_checks.append({'cvPage': index + 1, 'heightMm': header['heightMm'],
                                      'allExpectedFieldsInHeaderBand': True,
                                      'expectedHeaderPaintVisible': True,
                                      'sourceRgb': list(expected_ink), 'observedRgb': list(ink)})
        row = {'case': app['id'], 'docxSha256': sha(folder / 'Candidate.docx'),
               'writer': state, 'dossierPages': pages, 'allControlTextVisible': True,
               'perPageHeaderChecks': header_checks,
               'photoPixelsAndCrop': photo, 'productGuardPreserved': app['productGuardPreserved'],
               'sourceUnchanged': True, 'repeatedCanonicalTagsAcrossStories': package['duplicates']}
        assert app['productGuardPreserved'] and not app['jsErrors'] and app['pdfDownloaded']
        if app['id'].endswith('compact'):
            assert row['docxSha256'] == old[app['id']]['docxSha256']
            row['byteIdenticalToPriorCompact'] = True
        if app['id'] in ['right-contact-long', 'right-contact-reduced']:
            previous = reader.inspect(base / app['id'] / 'Candidate.docx')
            assert all(previous[k] == package[k] for k in ['fields', 'pictures', 'assets', 'plainText'])
            with ZipFile(base / app['id'] / 'Candidate.docx') as a, ZipFile(folder / 'Candidate.docx') as b:
                assert a.namelist() == b.namelist()
                changed = [name for name in a.namelist() if a.read(name) != b.read(name)]
                assert sorted(changed) == sorted(['word/cv-header.xml', 'word/cv-header-first.xml',
                                                  'word/letter-header.xml', 'word/letter-header-first.xml'])
                assert all(b.read(name).replace(b'w:wrap="none"', b'w:wrap="around"') == a.read(name)
                           for name in changed)
            row.update({'onlyHeaderWrapAttributesChanged': True, 'bodyXmlAndImageBytesIdentical': True})
        rows.append(row)
    assert len(rows) == 8
    report.write_text(json.dumps({'baseCommit': 'faacd28a09d0651eb1b4166fa1253a993fb37928',
        'branch': 'fix/docx-next-shared-integration-22okt',
        'isolation': isolation, 'fixedCases': rows,
        'unitTests': {'passed': passed, 'failed': failed, 'files': files, 'expectations': expectations},
        'focusedStrictTypeScript': 'PASS', 'wordSaveReopen': 'UNVERIFIED',
        'productSidebarGuard': 'CLOSED', 'exactGeometryGate': 'NOT_RUN'}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'verifiedFixedCases': len(rows), 'dossierPages': sum(r['dossierPages'] for r in rows)}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('baseline', type=Path)
    parser.add_argument('fixed', type=Path)
    parser.add_argument('report', type=Path)
    parser.add_argument('--prepare-isolation', action='store_true')
    parser.add_argument('--render', choices=['isolation', 'fixed'])
    parser.add_argument('--seconds', type=int, default=60)
    parser.add_argument('--unit-log', type=Path)
    parser.add_argument('--types-log', type=Path)
    args = parser.parse_args()
    if args.prepare_isolation:
        prepare(args.baseline)
    if args.render:
        paths = ([args.baseline / name / 'Candidate.docx' for name in
                  ['right-contact-long', 'right-contact-reduced', *VARIANTS]]
                 if args.render == 'isolation' else sorted(args.fixed.glob('*/Candidate.docx')))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda path: render(path, args.seconds), paths))
    if not args.prepare_isolation and not args.render:
        if not args.unit_log or not args.types_log:
            parser.error('Evidence requires --unit-log and --types-log from completed checks')
        evidence(args.baseline, args.fixed, args.report, args.unit_log, args.types_log)


if __name__ == '__main__':
    main()
