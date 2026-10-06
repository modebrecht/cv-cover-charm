"""Observe known native-cell pagination failures without approving a Sidebar export."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unicodedata
from xml.etree import ElementTree as ET
import zipfile

import fitz

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def compact(text):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', text).replace('\u00ad', ''))


def check_package(file):
    with zipfile.ZipFile(file) as package:
        document = ET.fromstring(package.read('word/document.xml'))
        assert len(document.findall('.//' + W + 'sectPr')) == 3, 'Unexpected section count'
        assert not document.findall('.//' + W + 'txbxContent'), 'Semantic text in text boxes'
        for control in document.findall('.//' + W + 'sdt'):
            assert not control.findall('.//' + W + 'sdt'), 'Nested content controls'
        return ''.join(document.itertext())


def convert(kit, source, target, format):
    assert source.resolve() != target.resolve(), 'Never overwrite the native source'
    with tempfile.TemporaryDirectory(prefix='parallel-pagination-profile-') as profile, tempfile.TemporaryDirectory(prefix='parallel-pagination-output-') as output:
        converted = Path(output) / target.name
        result = subprocess.run(
            [str(kit), Path(profile).as_uri(), source.as_uri(), converted.as_uri(), format],
            capture_output=True, text=True, timeout=60,
        )
        assert result.returncode == 0 and not re.search(r'error|warning', result.stderr, re.I), result.stderr
        assert converted.is_file(), 'No conversion output'
        converted.replace(target)


def observe(pdf, case, images=None):
    missing, detached = [], []
    with fitz.open(pdf) as document:
        assert len(document) > 3, 'Long CV did not paginate'
        pages = document[2:]
        for track in case['tracks']:
            clip = fitz.Rect((track['leftMm'] - .5) * 72 / 25.4,
                             (case['topMm'] - 3) * 72 / 25.4,
                             (track['rightMm'] + .5) * 72 / 25.4,
                             (case['page']['heightMm'] - case['page']['margins']['bottom'] + 3) * 72 / 25.4)
            text = compact(''.join(page.get_text(clip=clip) for page in pages))
            missing.extend(p['id'] for p in track['paragraphs'] if compact(p['text']) not in text)
            for entry in track['entries']:
                titles = [(page, rect) for page in pages for rect in page.search_for(entry['title'], clip=clip)]
                if len(titles) != 1:
                    continue
                page, title = titles[0]
                descriptions = page.search_for(entry['descriptionStart'], clip=clip)
                if not any(title.y0 < rect.y0 < title.y1 + 60 for rect in descriptions):
                    detached.append(entry['id'])
        if images:
            images.mkdir(exist_ok=True)
            for index, page in enumerate(document):
                page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(images / f'page-{index + 1}.png')
        return {'pages': len(document), 'missingFields': missing, 'detachedEntries': detached}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--libreofficekit', required=True, type=Path)
    args = parser.parse_args()
    folder, kit = args.directory.resolve(), args.libreofficekit.resolve()
    with tempfile.TemporaryDirectory(prefix='parallel-pagination-version-') as profile:
        result = subprocess.run([str(kit), '--version', Path(profile).as_uri()],
                                capture_output=True, text=True, check=True, timeout=30)
    version = json.loads(result.stdout)
    version_text = version['ProductName'] + ' ' + version['ProductVersion'] + version['ProductExtension']
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version_text, re.I), 'Stable LibreOffice required'
    report = []
    for case in json.loads((folder / 'manifest.json').read_text()):
        source = folder / case['file']
        source_text = check_package(source)
        assert all(compact(p['text']) in compact(source_text)
                   for track in case['tracks'] for p in track['paragraphs']), 'Native source lost text'
        output = folder / (case['id'] + '-qa')
        output.mkdir(exist_ok=True)
        pdf, saved, reopened_pdf = output / 'source.pdf', output / 'saved.docx', output / 'reopened.pdf'
        convert(kit, source, pdf, 'pdf')
        first = observe(pdf, case, output)
        convert(kit, source, saved, 'docx')
        saved_text = check_package(saved)
        convert(kit, saved, reopened_pdf, 'pdf')
        reopened = observe(reopened_pdf, case)
        assert bool(first['missingFields']) == case['missingTail'], 'Counterexample changed; review it'
        assert bool(first['detachedEntries']) == case['detached'], 'Attachment observation changed; review it'
        assert first == reopened, 'Save/reopen changed a diagnostic observation; review it'
        row = {key: case[key] for key in ('id', 'header', 'entry', 'topMm')}
        row['composition'] = case.get('composition', 'independent')
        row.update(source=first, reopened=reopened,
                   sourceContainsAllFields=True,
                   savedContainsAllFields=all(compact(p['text']) in compact(saved_text)
                                              for track in case['tracks'] for p in track['paragraphs']),
                   docxSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                   pdfSha256=hashlib.sha256(pdf.read_bytes()).hexdigest(),
                   reopenedPdfSha256=hashlib.sha256(reopened_pdf.read_bytes()).hexdigest())
        report.append(row)
        print(json.dumps(row), flush=True)
    evidence = {'libreOffice': version, 'microsoftWord': 'pending',
                'purpose': 'diagnostic observations, not Sidebar acceptance', 'cases': report}
    (folder / 'report.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(f'Confirmed {len(report)} observations. No Sidebar acceptance is granted.', flush=True)


if __name__ == '__main__':
    main()
