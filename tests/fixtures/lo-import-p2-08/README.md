# P2-08 — full production Next negative counterprobes

Four synthetic DOCX files from native run 41316674034, implementation
`b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6`. Both original files are actual UI
downloads from the unchanged production Next exporter. Each has 18 authored
entries, one reference and a generated four-colour calibration photo.

| Files | Role | Native content result |
|---|---|---|
| cv-18-left-original.docx | untouched download, left sidebar | FAIL: 14/18 complete |
| cv-18-left-gap06-zero.docx | only gap after entry 06 has after=0 | FAIL: 14/18 complete |
| cv-18-right-original.docx | untouched download, right sidebar | FAIL: 14/18 complete |
| cv-18-right-gap06-zero.docx | only gap after entry 06 has after=0 | FAIL: 14/18 complete |

Every file renders to three pages in the tested LibreOffice 24.2.7.2 build.
Entry 15 is incomplete, entries 16–18 and reference are absent. The gap change
does not repair either source. Left photo gates pass; right photo has an
additional x displacement of 19.844 mm from App-PDF. No fixture is accepted as
a product-export repair. The positive P2-07 minimal repro remains separate.

[MANIFEST.json](MANIFEST.json) binds each file, document.xml and every embedded
image by SHA256, plus exact attribute edits and observed page pixel signatures.
Each package has the generated 120x180 calibration image, seven line decorations
and one page background. All ten unique PNG payloads across both sides were
visually inspected. No private photo or local Word document is included.

For replay on a LO/Python Linux host, use a fresh per-file profile:

```bash
libreoffice --headless --nologo --nodefault --nofirststartwizard \
  -env:UserInstallation=file:///tmp/p208-left-original-profile \
  --convert-to pdf --outdir /tmp/p208-output \
  tests/fixtures/lo-import-p2-08/cv-18-left-original.docx
```

Use a different profile/output basename for other files. This is a conversion
example, not a replacement for the full comparison script. In the existing
workflow, `production_spacing` regenerates all six 17/18/19-entry App-PDF/DOCX
pairs and compares their originals and copies. It also rechecks both pinned
P2-06/07 pixel controls. The full retained artifact includes all App/LO PDFs,
other source lengths, rasters and measurements for 14 days. Committed fixtures,
JSON results, hashes and representative comparisons persist.

[Full report and next experiment](../../../docs/qa/p2-08-production-spacing.md).
