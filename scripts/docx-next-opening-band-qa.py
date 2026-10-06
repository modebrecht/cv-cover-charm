"""Record native opening-band counterexamples without claiming Sidebar acceptance."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

import fitz

from docx_next_flow_qa import check_first_page_flow, compact
from docx_next_package_qa import check_package

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice')
renderer.add_argument('--libreofficekit')
parser.add_argument('--require-stable', action='store_true')
args = parser.parse_args()
executable = args.libreofficekit or args.soffice
with tempfile.TemporaryDirectory(prefix='docx-next-opening-version-') as profile:
    command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing LibreOffice version'
if args.libreofficekit:
    info = json.loads(version)
    version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable LibreOffice required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-opening-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-opening-output-') as output:
        exported = Path(output) / (source.stem + '.' + format)
        command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [
            executable, '-env:UserInstallation=' + Path(profile).as_uri(),
            '--headless', '--convert-to', format, '--outdir', output, str(source.resolve()),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stderr + result.stdout
        destination.write_bytes(exported.read_bytes())


def check_counterexample(pdf, fixture):
    with fitz.open(pdf) as document:
        assert len(document) == 4, f'{fixture["fixture"]}: changed pagination; review required'
        text = compact(''.join(page.get_text() for page in document))
        for value in fixture['cvSemanticText']:
            assert compact(value) in text, f'{fixture["fixture"]}: lost semantic text {value}'
        # Opening fields pass; continuation fields still fail in their owning body lane.
        checked = copy.deepcopy(fixture)
        checked['parts'][-1]['expectedPages'] = 2
        opening = checked['parts'][-1]['firstPageFlowProbes'][:-2]
        continuation = checked['parts'][-1]['firstPageFlowProbes'][-2:]
        checked['parts'][-1]['firstPageFlowProbes'] = opening
        check_first_page_flow(document, checked)
        rejections = []
        for probe in continuation:
            checked['parts'][-1]['firstPageFlowProbes'] = [probe]
            try:
                check_first_page_flow(document, checked)
            except AssertionError as error:
                assert str(error).endswith('first-page flow detached: ' + probe['fieldId']), str(error)
                rejections.append(str(error))
            else:
                raise AssertionError('Counterexample unexpectedly passed; inspect before changing acceptance')
        document[2].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
        return {'pages': len(document), 'openingFieldsPresent': len(opening), 'continuationRejections': rejections, 'semanticTextPreserved': True}


report = []
control_name = 'opening-band-supported-control'
control = json.loads((args.directory / (control_name + '.json')).read_text())
control_source = args.directory / (control_name + '.docx')
control_saved = args.directory / (control_name + '-saved.docx')
control_pdf = args.directory / (control_name + '-render.pdf')
control_reopened = args.directory / (control_name + '-reopened.pdf')
check_package(control_source)
convert(control_source, control_pdf, 'pdf')
convert(control_source, control_saved, 'docx')
check_package(control_saved, next_package=False)
convert(control_saved, control_reopened, 'pdf')
for pdf in [control_pdf, control_reopened]:
    with fitz.open(pdf) as document:
        assert len(document) == 4, 'Supported control pagination changed'
        check_first_page_flow(document, control)
        document[2].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
for mode in ['span', 'rows', 'span-separate', 'rows-separate']:
    name = 'opening-band-short-' + mode
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    source = args.directory / (name + '.docx')
    pdf = args.directory / (name + '-render.pdf')
    saved = args.directory / (name + '-saved.docx')
    reopened = args.directory / (name + '-reopened.pdf')
    check_package(source)
    convert(source, pdf, 'pdf')
    convert(source, saved, 'docx')
    check_package(saved, next_package=False)
    convert(saved, reopened, 'pdf')
    report.append({
        'fixture': name, 'architecture': fixture['architecture'],
        'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'package': 'pass', 'saveReopenPackage': 'pass',
        'render': check_counterexample(pdf, fixture),
        'saveReopen': check_counterexample(reopened, fixture),
    })
result = {'libreOfficeVersion': version, 'libreOfficeInterface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI', 'cases': report,
          'supportedControl': {'package': 'pass', 'render': 'pass', 'saveReopen': 'pass', 'firstPageFields': 6},
          'architectureAcceptance': 'rejected; shared Sidebar guard unchanged',
          'longAndChromeCases': 'not run; required short case failed', 'microsoftWord': 'pending'}
(args.directory / 'opening-band-report.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2), flush=True)
