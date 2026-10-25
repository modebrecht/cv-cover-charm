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
parser.add_argument('--qa-commit', help='Commit containing the QA tools, if different from candidate generation')
parser.add_argument('--runtime-record', type=Path, help='Pinned runtime build evidence to include with stable QA')
parser.add_argument('--warm', action='store_true', help='Package the isolated Warm architecture stress cases')
parser.add_argument('--prism', action='store_true', help='Package the isolated Prism architecture stress cases')
args = parser.parse_args()
assert not (args.warm and args.prism), 'Select one candidate set'
candidate = 'Prism' if args.prism else 'Warm' if args.warm else 'Brief'
prefix = 'prism-' if args.prism else 'warm-' if args.warm else ''
if args.prism:
    CASES = [('prism-' + key, purpose) for key, purpose in [
        ('normal', 'Native two-tone cover and contact chrome'), ('long-letter', 'Long letter'),
        ('long-cv', 'Long CV'), ('compact', 'Thin signature and flowing sender'),
        ('none', 'Disabled interior header'), ('timeline', 'Timeline and oversized entry'),
        ('magazin', 'Magazin and half-width sections'), ('images', 'Native photos and letter image'),
        ('custom', 'Independent custom fields, rich text, list and table'),
        ('continuation', 'Distinct chrome, signed offsets and continuation margin'),
        ('custom-colors', 'Authored light palette and readable foreground'),
        ('custom-surface', 'Explicit gradient surface overrides diagonal template paint'),
        ('long-values', 'Long name, email and recipient'),
        ('columns', 'Native columns with full-width return and attached letter tail'),
    ]]
if args.warm:
    CASES = [('warm-' + key, purpose) for key, purpose in [
        ('normal', 'Default contact masthead'), ('long-letter', 'Long letter'),
        ('long-cv', 'Long CV'), ('compact', 'Compact first-page sender'),
        ('compact-long', 'Compact sender and long letter continuation'), ('none', 'Disabled header'),
        ('timeline', 'Timeline and oversized entry'), ('magazin', 'Magazin and half sections'),
        ('images', 'Circular photo and letter image'), ('custom', 'Custom fields and rich native content'),
        ('continuation', 'Distinct chrome, signed offsets and continuation margin'),
        ('custom-colors', 'Light palette and readable native ink'), ('long-sender', 'Growing sender cell'),
    ]]
assert len(args.source_commit) == 40 and all(c in '0123456789abcdef' for c in args.source_commit)
qa_commit = args.qa_commit or args.source_commit
assert len(qa_commit) == 40 and all(c in '0123456789abcdef' for c in qa_commit)
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
        if args.warm or args.prism:
            for page in range(1, report['pages'] + 1):
                png = pdf.parent / f'page-{page}.png'
                assert png.is_file(), png
                archive.write(png, f'candidate-png/{stem}/page-{page}.candidate.png')
        manifest.append({**report, 'sourceCommit': args.source_commit, 'qaToolCommit': qa_commit, 'purpose': purpose, 'docx': 'editable-docx/' + stem + '.docx',
                         'docxSha256': hashlib.sha256(docx.read_bytes()).hexdigest(),
                         'candidatePdfSha256': hashlib.sha256(pdf.read_bytes()).hexdigest(),
                         'microsoftWord': 'pending', 'visualReferenceApproval': 'pending'})
    archive.writestr('MANIFEST.json', json.dumps(manifest, indent=2))
    archive.writestr('WORD_REVIEW_RECORD.json', json.dumps({'status': 'pending', 'tester': '', 'date': '',
      'os': '', 'wordVersion': '', 'sourceCommit': args.source_commit, 'qaToolCommit': qa_commit,
      'cases': [{'fixture': key, 'result': 'pending', 'repairPrompt': None, 'editSaveReopen': None, 'notes': ''}
                for key, _ in CASES]}, indent=2))
    archive.write('docs/docx-next/word-smoke-test.md', 'WORD_CHECKLIST.md')
    archive.write('docs/docx-next/source-boundary.md', 'SOURCE_AND_FLOW_POLICY.md')
    archive.write('docs/docx-next/prism-stress-report.md' if args.prism else 'docs/docx-next/warm-stress-report.md' if args.warm else 'docs/docx-next/stabilization-report.md', 'AUTOMATED_EVIDENCE.md')
    if args.prism:
        archive.write('docs/docx-next/prism-feature-coverage.md', 'PRISM_COVERAGE.md')
        archive.write('docs/docx-next/prism-stress-evidence.json', 'MACHINE_EVIDENCE.json')
    if args.warm:
        archive.write('docs/docx-next/warm-feature-coverage.md', 'WARM_COVERAGE.md')
        archive.write('docs/docx-next/warm-stress-evidence.json', 'MACHINE_EVIDENCE.json')
    archive.write('docs/docx-next/libreoffice-qa.md', 'LIBREOFFICE_QA.md')
    archive.write('docs/docx-next/stable-lo-packages.json', 'STABLE_LO_PACKAGES.json')
    archive.write('docs/docx-next/stable-lo-fonts.json', 'STABLE_LO_FONTS.json')
    if args.runtime_record:
        archive.write(args.runtime_record, 'STABLE_LO_RUNTIME.json')
    archive.write(args.directory / 'render-report.json', 'ALL_FIXTURES_QA.json')
    archive.writestr('START_HERE.txt',
      f'DOCX Next / {candidate} — editable review candidates, not accepted migrations.\n'
      f'Start with editable-docx/01-{prefix}normal.docx. Then follow WORD_CHECKLIST.md.\n'
      'Candidate PDFs are LibreOffice aids. They are not approved Word references.\n'
      'Record OS, Word version, date, tester and each result in WORD_REVIEW_RECORD.json.\n'
      'Keep the original files; save edited copies, close Word and reopen them.\n'
      'Do not mark any template migrated or switch production based on this package alone.\n')
print(f'Packed {len(CASES)} editable DOCX + {len(CASES)} candidate PDFs: {args.output}')
