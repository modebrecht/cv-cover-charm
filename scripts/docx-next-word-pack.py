"""Package already-validated editable candidates; never approve Word or visual references."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

CASES = [
    ('normal', 'Normal dossier'),
    ('long-letter', 'Long letter'),
    ('long-cv', 'Long CV'),
    ('variant-timeline-long', 'Timeline with oversized entry'),
    ('variant-editorial-short', 'Magazin composition and half-width sections'),
    ('icc-jpeg', 'ICC photo'),
    ('elements-images', 'Custom editable fields, captions and images'),
    ('rich-table-lists', 'Rich content, tables and independent lists'),
    ('columns-long-chrome', 'Long columns, first/continuation header/footer'),
    ('pagination-chrome', 'CV continuation margin with contact chrome'),
    ('chrome-custom-stacked', 'Independent styled chrome fields'),
    ('opacity-native', 'Native text opacity over colored paper'),
]
parser = argparse.ArgumentParser()
parser.add_argument('directory', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--source-commit', required=True, help='Commit used to generate the validated candidates')
args = parser.parse_args()
assert len(args.source_commit) == 40 and all(c in '0123456789abcdef' for c in args.source_commit)
reports = {r['fixture']: r for r in json.loads((args.directory / 'render-report.json').read_text())}
manifest = []
with ZipFile(args.output, 'w', ZIP_DEFLATED) as archive:
    for index, (key, purpose) in enumerate(CASES, 1):
        report = reports[key]
        assert all(report[field] == 'pass' for field in ('structural', 'libreoffice', 'libreofficeRoundtrip')), key
        docx = args.directory / (key + '.docx')
        pdf = args.directory / (key + '-qa') / (key + '.pdf')
        assert docx.is_file() and pdf.is_file(), key
        stem = f'{index:02d}-{key}'
        archive.write(docx, 'editable-docx/' + stem + '.docx')
        archive.write(pdf, 'candidate-pdf/' + stem + '.candidate.pdf')
        manifest.append({**report, 'sourceCommit': args.source_commit, 'purpose': purpose, 'docx': 'editable-docx/' + stem + '.docx',
                         'docxSha256': hashlib.sha256(docx.read_bytes()).hexdigest(),
                         'microsoftWord': 'pending', 'visualReferenceApproval': 'pending'})
    archive.writestr('MANIFEST.json', json.dumps(manifest, indent=2))
    archive.writestr('WORD_REVIEW_RECORD.json', json.dumps({'status': 'pending', 'tester': '', 'date': '',
      'os': '', 'wordVersion': '', 'sourceCommit': args.source_commit,
      'cases': [{'fixture': key, 'result': 'pending', 'repairPrompt': None, 'editSaveReopen': None, 'notes': ''}
                for key, _ in CASES]}, indent=2))
    archive.write('docs/docx-next/word-smoke-test.md', 'WORD_CHECKLIST.md')
    archive.write('docs/docx-next/source-boundary.md', 'SOURCE_AND_FLOW_POLICY.md')
    archive.write('docs/docx-next/stabilization-report.md', 'AUTOMATED_EVIDENCE.md')
    archive.write('docs/docx-next/libreoffice-qa.md', 'LIBREOFFICE_QA.md')
    archive.write(args.directory / 'render-report.json', 'ALL_FIXTURES_QA.json')
    archive.writestr('START_HERE.txt',
      'DOCX Next / Brief — editable review candidates, not accepted migrations.\n'
      'Start with editable-docx/01-normal.docx. Then follow WORD_CHECKLIST.md.\n'
      'Candidate PDFs are LibreOffice aids. They are not approved Word references.\n'
      'Record OS, Word version, date, tester and each result in WORD_REVIEW_RECORD.json.\n'
      'Keep the original files; save edited copies, close Word and reopen them.\n'
      'Do not mark Brief migrated or switch production based on this package alone.\n')
print(f'Packed {len(CASES)} editable DOCX + {len(CASES)} candidate PDFs: {args.output}')
