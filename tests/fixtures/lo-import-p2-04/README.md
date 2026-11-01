# Standalone LibreOffice regressions — P2-04

Four synthetic diagnostic DOCX packages, collected from native run 41291094020,
implementation `f840040d7ec2781aa9dd22e187fe72c6ed692519`.
They need no app build, browser, user files, Windows or Word session to replay.

| Fixture | Observed in tested LO 24.2 | Meaning |
|---|---|---|
| photo-table-mode15.docx | photo +19.844 mm vs App reference | positive position-defect repro |
| photo-paragraph-mode15.docx | photo -0.258 mm vs App reference | paragraph-host control |
| long-coupled.docx | station titles 17/18 and final reference absent; station 16 incomplete | positive truncation repro |
| long-detached.docx | all 18 entries complete and final reference present | one-attribute control |

The long pair's document story differs only in physical cell 0's keepNext flag.
The full attribute diff, file/part hashes and observed PDF pixel signatures are
in MANIFEST.json. Both photo packages contain only the 120x180 four-color
calibration PNG. Both long packages contain no image parts. Names/text are from
the existing synthetic application fixture, never private Word documents.

These are intentionally failing test cases plus controls. They are not approved
product exports, universal rendering references, Microsoft Word acceptance or a
reason to change compatibilityMode globally. All four retain compatibilityMode=15.
The standalone compact packages rendered pixel-identically to their larger story
counterparts in the tested native run. They retain styles/settings/font/numbering
parts while removing unused relationship targets and compressing the ZIP.

Tested: Ubuntu 24.04, LibreOffice package 4:24.2.7-0ubuntu0.24.04.7, Liberation fonts.
A simple bounded Linux replay from repository root:

```bash
p204_profile="$(mktemp -d)"
p204_output="$(mktemp -d)"
timeout 90s libreoffice --headless \
  "-env:UserInstallation=file://$p204_profile" \
  --convert-to pdf --outdir "$p204_output" \
  tests/fixtures/lo-import-p2-04/*.docx
```

Confirm four nonempty PDFs and inspect all pages. A zero LO exit code alone is
insufficient. The main workflow's runner checks output existence/validity and
retains failures. The native report is docs/qa/p2-04-minimal-repro.md.
