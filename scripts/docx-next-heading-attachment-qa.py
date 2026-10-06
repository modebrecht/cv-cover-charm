"""Keep Sidebar opening flow and oversized heading attachment as simultaneous gates."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

import fitz

from docx_next_flow_qa import check_first_page_flow, check_heading_attachment, compact
from docx_next_package_qa import check_package

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', type=Path)
renderer = parser.add_mutually_exclusive_group()
renderer.add_argument('--soffice', default='soffice')
renderer.add_argument('--libreofficekit')
parser.add_argument('--require-stable', action='store_true')
args = parser.parse_args()
executable = args.libreofficekit or args.soffice
with tempfile.TemporaryDirectory(prefix='docx-next-heading-version-') as profile:
    command = [executable, '--version'] + ([Path(profile).as_uri()] if args.libreofficekit else [])
    version = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30).stdout.strip()
assert version, 'Missing LibreOffice version'
if args.libreofficekit:
    info = json.loads(version)
    version = f'{info["ProductName"]} {info["ProductVersion"]}{info["ProductExtension"]} {info["BuildId"]}'
if args.require_stable:
    assert not re.search(r'Dev|alpha|beta|(?:^|[.\s])rc[0-9]*', version, re.I), 'Stable LibreOffice required: ' + version


def convert(source, destination, format):
    with tempfile.TemporaryDirectory(prefix='docx-next-heading-profile-') as profile, tempfile.TemporaryDirectory(prefix='docx-next-heading-output-') as output:
        exported = Path(output) / (source.stem + '.' + format)
        command = [executable, Path(profile).as_uri(), source.resolve().as_uri(), exported.as_uri(), format] if args.libreofficekit else [
            executable, '-env:UserInstallation=' + Path(profile).as_uri(),
            '--headless', '--convert-to', format, '--outdir', output, str(source.resolve()),
        ]
        result = subprocess.run(command, capture_output=True, text=True, timeout=60)
        assert result.returncode == 0 and exported.is_file(), result.stderr + result.stdout
        destination.write_bytes(exported.read_bytes())


def check_result(pdf, fixture):
    diagnostic = fixture['diagnostic']
    with fitz.open(pdf) as document:
        text = compact(''.join(page.get_text() for page in document))
        for value in fixture['cvSemanticText']:
            assert compact(value) in text, fixture['fixture'] + ': lost semantic text'
        checked = copy.deepcopy(fixture)
        checked['parts'][-1]['expectedPages'] = len(document) - 2
        result = {'pages': len(document), 'semanticTextPreserved': True}
        if diagnostic['kind'] == 'oversized':
            probe = fixture['headingAttachmentProbe']
            positions = {}
            for role, field in probe.items():
                scale = 72 / 25.4
                margins = fixture['parts'][-1]['contentBoxMm']
                clip = fitz.Rect((field['leftMm'] - .5) * scale, (margins['top'] - 3) * scale,
                                 (field['rightMm'] + .5) * scale, document[2].rect.height - (margins['bottom'] - 3) * scale)
                matches = [index for index in range(2, len(document))
                           if compact(field['text']) in compact(document[index].get_text(clip=clip))]
                assert len(matches) == 1, fixture['fixture'] + ': ambiguous or missing attachment field'
                positions[role] = matches[0] - 2
            assert len(document) == 10, 'Oversized diagnostic pagination changed; review required'
            assert positions['entry'] == positions['heading'] + 1, 'Oversized heading orphan no longer reproduces; review required'
            checked['parts'][-1]['headingAttachmentProbes'] = [probe]
            try:
                check_heading_attachment(document, checked)
            except AssertionError as error:
                assert str(error).endswith('entry heading detached: ' + probe['entry']['fieldId']), str(error)
            else:
                raise AssertionError('Oversized heading unexpectedly attached; review required')
            result['headingAttachment'] = 'orphaned'
            result['cvPagePositions'] = positions
        else:
            assert len(document) == (3 if diagnostic['kind'] == 'minimum' else 4), 'Changed pagination; review required'
            fields = checked['parts'][-1]['firstPageFlowProbes']
            if diagnostic['kind'] == 'overflow' and not diagnostic['disableHeadingAttachment']:
                checked['parts'][-1]['firstPageFlowProbes'] = fields[:4]
                check_first_page_flow(document, checked)
                detached = []
                for field in fields[4:]:
                    checked['parts'][-1]['firstPageFlowProbes'] = [field]
                    try:
                        check_first_page_flow(document, checked)
                    except AssertionError as error:
                        assert str(error).endswith('first-page flow detached: ' + field['fieldId']), str(error)
                        detached.append(field['fieldId'])
                    else:
                        raise AssertionError('Overflow control unexpectedly passed; review required')
                result.update(firstPageFieldsPresent=4, detachedFields=detached)
            else:
                check_first_page_flow(document, checked)
                result['firstPageFieldsPresent'] = len(fields)
        document[2].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(pdf.with_suffix('.png'))
        return result


cases = json.loads((args.directory / 'heading-attachment-manifest.json').read_text())
assert len(cases) == 12, 'Bounded diagnostic matrix changed'
report = []
for value in cases:
    name = value['name']
    fixture = json.loads((args.directory / (name + '.json')).read_text())
    assert fixture['diagnostic'] == value, 'Fixture manifest mismatch'
    source = args.directory / (name + '.docx')
    saved = args.directory / (name + '-saved.docx')
    pdf = args.directory / (name + '-render.pdf')
    reopened = args.directory / (name + '-reopened.pdf')
    check_package(source)
    convert(source, pdf, 'pdf')
    convert(source, saved, 'docx')
    check_package(saved, next_package=False)
    convert(saved, reopened, 'pdf')
    before = check_result(pdf, fixture)
    after = check_result(reopened, fixture)
    assert before == after, name + ': save/reopen changed diagnostic result'
    report.append({'fixture': name, 'docxSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                   'package': 'pass', 'saveReopenPackage': 'pass', 'render': before, 'saveReopen': after})
    print(json.dumps(report[-1]), flush=True)
result = {'libreOfficeVersion': version, 'libreOfficeInterface': 'LibreOfficeKit' if args.libreofficekit else 'soffice CLI',
          'cases': report, 'architectureAcceptance': 'rejected: heading-off fixes short overflow but both controls orphan the oversized entry heading',
          'productionChange': 'none; picture-before-later-span guard unchanged', 'microsoftWord': 'pending'}
(args.directory / 'heading-attachment-report.json').write_text(json.dumps(result, indent=2) + '\n')
print(result['architectureAcceptance'], flush=True)
