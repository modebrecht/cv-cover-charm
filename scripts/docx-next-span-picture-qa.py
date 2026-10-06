"""Confirm the known native table failure before and after LibreOffice save/reopen."""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

import fitz

from docx_next_flow_qa import check_first_page_flow, compact

parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('--libreofficekit', required=True)
args = parser.parse_args()
fixture = json.loads((args.directory / 'flow-probe.json').read_text())
source = args.directory / 'native-picture-before-span.docx'
with tempfile.TemporaryDirectory(prefix='docx-next-negative-version-') as profile:
    version = subprocess.run([args.libreofficekit, '--version', Path(profile).as_uri()], capture_output=True, text=True, timeout=30)
assert version.returncode == 0 and version.stdout.strip(), version.stderr


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-negative-lo-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-negative-output-') as output:
        exported = Path(output) / destination.name
        result = subprocess.run([
            args.libreofficekit, Path(profile).as_uri(), source.resolve().as_uri(),
            exported.resolve().as_uri(), format,
        ], capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stderr
        destination.write_bytes(exported.read_bytes())


def expect_rejection(pdf):
    with fitz.open(pdf) as document:
        assert len(document) == sum(part['expectedPages'] for part in fixture['parts'])
        text = compact(''.join(page.get_text() for page in document))
        for probe in fixture['parts'][-1]['firstPageFlowProbes']:
            assert compact(probe['text']) in text, f'Probe lost entirely: {probe["fieldId"]}'
        document[2].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
        try:
            check_first_page_flow(document, fixture)
        except AssertionError as error:
            assert fixture['expectedFailure'] in str(error), str(error)
            return {'pages': len(document), 'expectedRejection': str(error)}
        raise AssertionError('Counterexample unexpectedly passed; inspect and update its acceptance status')


pdf = args.directory / 'native-picture-before-span.pdf'
saved = args.directory / 'native-picture-before-span-saved.docx'
reopened = args.directory / 'native-picture-before-span-reopened.pdf'
convert(source, pdf, 'pdf')
convert(source, saved, 'docx')
convert(saved, reopened, 'pdf')
report = {'libreOfficeVersion': version.stdout.strip(), 'render': expect_rejection(pdf), 'saveReopen': expect_rejection(reopened)}
(args.directory / 'negative-flow-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
