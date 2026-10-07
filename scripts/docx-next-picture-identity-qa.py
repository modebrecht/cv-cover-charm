"""Read-only minimal picture/context comparison; negative cases stop the native experiment."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile
from zipfile import ZipFile, ZIP_DEFLATED
import fitz

spec = importlib.util.spec_from_file_location('identity', Path(__file__).with_name('docx-next-native-identity-qa.py'))
identity = importlib.util.module_from_spec(spec)
spec.loader.exec_module(identity)
MM = 72 / 25.4


def pdf_result(path, fixture):
    failures = []
    with fitz.open(path) as document:
        if len(document) != fixture['expectedPages']:
            failures.append('page-count')
        text = identity.compact(''.join(page.get_text() for page in document))
        for field in fixture['fields']:
            if identity.compact(field['text']) not in text:
                failures.append('pdf-text:' + field['fieldId'])
        pictures = [(page.number, item) for page in document for item in page.get_image_info()]
        expected = 1 if fixture['photo'] else 0
        if len(pictures) != expected:
            failures.append('picture-count')
        for page_number, image in pictures:
            rect = fitz.Rect(image['bbox'])
            geometry = fixture['pictureGeometry']
            if page_number != 2 or abs(rect.width / MM - geometry['widthMm']) > 0.5 or abs(rect.height / MM - geometry['heightMm']) > 0.5:
                failures.append('picture-geometry')
            left = fixture['margins']['left']
            if fixture['owner'] == 'right':
                left += fixture['cellWidthMm']
            if abs(rect.x0 / MM - left) > 0.5:
                failures.append('picture-cell-origin')
            if rect.x1 / MM > left + fixture['cellWidthMm'] + 0.5:
                failures.append('picture-cell-bounds')
        if len(document) >= 3:
            page = document[2]
            margins = fixture['margins']
            for block in page.get_text('dict')['blocks']:
                if block['type'] != 0:
                    continue
                for line in block['lines']:
                    for span in line['spans']:
                        rect = fitz.Rect(span['bbox'])
                        if rect.x0 / MM < margins['left'] - 0.7 or rect.x1 / MM > page.rect.width / MM - margins['right'] + 0.7 or rect.y0 / MM < margins['top'] - 3 or rect.y1 / MM > page.rect.height / MM - margins['bottom'] + 3:
                            failures.append('text-body-bounds')
            # Every actual page is retained for visual inspection, including rejected cases.
        return {'status': 'fail' if failures else 'pass', 'pages': len(document), 'failures': sorted(set(failures)), 'pictures': [{'page': number + 1, 'boundsMm': [round(v / MM, 3) for v in item['bbox']]} for number, item in pictures]}


def source_check(source, fixture):
    fields, captions, _ = identity.inventory(source)
    for field in fixture['fields']:
        assert (field['fieldId'], identity.compact(field['text'])) in fields, 'Source lost complete field ' + field['fieldId']
    assert (fixture['pictureId'], '') in fields if fixture['photo'] else all(name != fixture['pictureId'] for name, _ in fields)
    assert captions == (set() if fixture['owner'] == 'body' else {'cv.identity.container'})
    assert hashlib.sha256(source.read_bytes()).hexdigest() == fixture['docxSha256'], 'Source package changed'


def stop_reason(result):
    if result['native']['completeNativeText'] != 'pass':
        return 'complete-native-text'
    if result['native']['fieldIdentity'] != 'pass':
        return 'field-identity'
    if any(result[key]['status'] != 'pass' for key in ['render', 'saveReopen']):
        return 'pdf-text-or-geometry'
    # Container captions have their own unresolved requirement; do not mask field results.
    return None


def run(directory, executable, kit=False, require_stable=False, observe=False, replay=False):
    with tempfile.TemporaryDirectory(prefix='identity-version-') as profile:
        version = subprocess.check_output([executable, '--version'] + ([Path(profile).as_uri()] if kit else []), text=True, timeout=30).strip()
    if kit:
        data = json.loads(version)
        version = f'{data["ProductName"]} {data["ProductVersion"]}{data["ProductExtension"]} {data["BuildId"]}'
    if require_stable:
        assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable engine required'

    def convert(source, destination, format):
        with tempfile.TemporaryDirectory(prefix='identity-profile-') as profile, tempfile.TemporaryDirectory(prefix='identity-export-') as output:
            exported = Path(output) / (source.stem + '.' + format)
            command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if kit else [executable, '-env:UserInstallation=' + Path(profile).as_uri(), '--headless', '--convert-to', format, '--outdir', output, str(source.resolve())]
            result = subprocess.run(command, capture_output=True, text=True, timeout=60)
            assert result.returncode == 0 and exported.is_file(), result.stdout + result.stderr
            destination.write_bytes(exported.read_bytes())

    manifest = json.loads((directory / 'picture-identity-manifest.json').read_text())
    assert [(row['owner'], row['photo']) for row in manifest] == [(owner, photo) for owner in ['body', 'single', 'left', 'right'] for photo in [False, True]]
    # Validate all prepared source packages; this does not claim that all were rendered.
    for fixture in manifest:
        source_check(directory / (fixture['name'] + '.docx'), fixture)
    rows, stopped = [], None
    for fixture in manifest:
        if stopped:
            rows.append({'fixture': fixture['name'], 'execution': 'unrendered', 'reason': 'stopped after ' + stopped})
            continue
        source = directory / (fixture['name'] + '.docx')
        qa = directory / (fixture['name'] + '-qa')
        qa.mkdir(exist_ok=True)
        pdf, saved = qa / 'source.pdf', qa / source.name
        convert(source, pdf, 'pdf')
        convert(source, saved, 'docx')
        saved_pdf = qa / 'saved.pdf'
        convert(saved, saved_pdf, 'pdf')
        result = {'fixture': fixture['name'], 'execution': 'rendered', 'sourceDocxSha256': fixture['docxSha256'], 'savedDocxSha256': hashlib.sha256(saved.read_bytes()).hexdigest(), 'native': identity.audit(source, saved), 'render': pdf_result(pdf, fixture), 'saveReopen': pdf_result(saved_pdf, fixture)}
        for label, path in [('source', pdf), ('saved', saved_pdf)]:
            with fitz.open(path) as document:
                for page in document:
                    page.get_pixmap(matrix=fitz.Matrix(1.4, 1.4), alpha=False).save(qa / f'{label}-page-{page.number + 1}.png')
        rows.append(result)
        reason = stop_reason(result)
        if reason:
            stopped = fixture['name'] + ':' + reason
    actual = [row for row in rows if row['execution'] == 'rendered']
    report = {'runtime': version, 'interface': 'LibreOfficeKit' if kit else 'soffice CLI', 'plannedCases': len(rows), 'actualCases': len(actual), 'pages': sum(row['render']['pages'] for row in actual), 'stoppedAfter': stopped, 'fieldIdentityFailures': sum(row['native']['fieldIdentity'] == 'fail' for row in actual), 'tableIdentityFailures': sum(row['native']['tableIdentity'] == 'fail' for row in actual), 'architectureAcceptance': 'blocked; minimal diagnostics do not enable export or certify Word', 'fixtures': rows}
    (directory / 'picture-identity-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
    if replay:
        buffer = io.BytesIO()
        with ZipFile(buffer, 'w', compression=ZIP_DEFLATED) as archive:
            for name in ['picture-identity-manifest.json', 'picture-identity-report.json', 'canonical-photo.png'] + [fixture['name'] + '.docx' for fixture in manifest]:
                archive.writestr(name, (directory / name).read_bytes())
        data = buffer.getvalue()
        print(json.dumps({'pictureIdentityReplaySha256': hashlib.sha256(data).hexdigest(), 'pictureIdentityReplayBase64': base64.b64encode(data).decode()}))
    assert observe or not stopped, 'Stopped native identity experiment; actual evidence retained'
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    engine = parser.add_mutually_exclusive_group()
    engine.add_argument('--soffice', default='soffice')
    engine.add_argument('--libreofficekit')
    parser.add_argument('--require-stable', action='store_true')
    parser.add_argument('--observe', action='store_true')
    parser.add_argument('--replay', action='store_true')
    args = parser.parse_args()
    run(args.directory, args.libreofficekit or args.soffice, bool(args.libreofficekit), args.require_stable, args.observe, args.replay)
