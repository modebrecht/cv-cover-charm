# P2-01 — Cloud DOCX Next converter trial

Scope: additional renderer only. Base `dev` = `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`.
Research reference `work/31okt-word-practical` = `c685bf4308235ac5fcc38957d45d9c9bf508eb21`.
No research-branch changes merged. No normal export changes. No Windows/Word access.

## Infrastructure findings

- Existing workflow: `.github/workflows/dossier-visual-parity.yml`; retained.
- Existing analysis: `scripts/dossier_visual_parity.py`; unchanged, its A4
  normalization and SSIM analysis reused by `dossier_converter_poc.py`.
- Existing x39 DOCX gallery calls the legacy `createDossierDocxBlob` export.
  Production DOCX Next is a distinct guarded entry: `createSavedDossierDocxNext`.
  It currently accepts Modern, sans, CV sidebar, contact header, compact footer.
  Therefore a 3-document Next trial cannot certify 39 Next templates.
- New optional lane in the same workflow, with one Ubuntu runner. A push to
  `work/01nov-p2-01-onlyoffice` runs only this lane; a manual `converter_poc=true`
  does likewise. Normal render/x39 behavior retained.

## Reproducible trial

`tests/e2e/dossier-converter-poc.spec.ts` imports the repository's synthetic
Modern demo, replaces the CV image with a generated asymmetric RGB card,
clears cover/letter images, checks the Next guard and uses each editor's actual
DOCX and PDF downloads. No local/private Word document or personal photo is used.
Six source files and their SHA256 hashes are recorded with the checked-out SHA.

Each converter runs twice per document, limited to 90 seconds per conversion.
PDF page count, active first-page XML text, photo visibility, raster repeatability,
RGB/layout SSIM and wall time/max RSS are recorded. Malformed outputs and stale
PDFs cannot pass merely because a converter returned zero. Rendered comparison
sheets remain necessary: text layers and SSIM alone do not prove visual fidelity.

## Initial local Linux evidence

- Actual browser downloads: PASS, all 3 DOCX + 3 App PDFs (22.9 seconds).
- Existing Next export unit file: 25 PASS, 0 FAIL.
- Converter failure-contract checks: 4 PASS.
- Official legacy AppImage SHA256:
  `42663c159fcf1e1755bb047a72b01207737bf50165c519b13481e24805631047`.
  PDF metadata identifies **ONLYOFFICE/7.2.0.204**, not current 10.0.0.
  82,977,984-byte download; about 189 MiB engine directory.
- Legacy 7.2 needs its supplied wrapper/font configuration: direct binary invocation
  without font setup produced a JavaScript error and no PDF despite exit zero.
  Proper wrapper succeeds twice for every document, one page each, 100% active
  XML token recall, visible CV card. This is historical evidence, not a current
  engine recommendation. App/OO RGB SSIM: cover .960, letter .972, CV .833.
- App cover is raster-only; visible text checked on the rendered page and via
  Tesseract OCR. Lack of an extractable text layer is not missing visible text.
- Local latest SDK 10.0.0 download and the vendor DEB endpoint were blocked by
  this environment's proxy CONNECT timeout. No further installation attempts.
- Local LibreOffice packages required extraction because privileged apt install
  is unavailable here; a relocatable install currently fails UNO bootstrap.
  Its local comparison is BLOCKED, not a converter fidelity failure.

## Current-engine CI

`scripts/setup_onlyoffice_poc.sh` downloads official SDK **v10.0.0** once, with
90-second cap and SHA256 from the official release metadata:
`194f348429239fbcee4d1c29861550127885facdbb700706c7bb1429a21b33e4`.
No `latest`, Docker, PostgreSQL, RabbitMQ or external conversion service.
A version/content change cannot silently replace the pinned build.
The GitHub runner installs normal distro LibreOffice and shared fonts.

## Final decision — NO-GO for the unlicensed SDK as a visual reference

CI [41259328039](https://github.com/modebrecht/cv-cover-charm/actions/runs/41259328039)
executed implementation commit `404ee44d2f0293b566903e3061bc0cef720dccc7`.
Engine metadata: **ONLYOFFICE/10.0.0.170** and **LibreOffice 24.2.7.2**.
The original CI checks were green for structural conversion. Subsequent rendered
inspection found a large **Unregistered Version** watermark on EVERY ONLYOFFICE
PDF. The final acceptance below includes that visible defect.

| Test document                 | App PDF, visually checked | LibreOffice | ONLYOFFICE conversion | ONLYOFFICE visual reference |
| ----------------------------- | ------------------------- | ----------- | --------------------- | --------------------------- |
| Titelblatt                    | PASS                      | PASS        | PASS, 2/2             | **FAIL — watermark**        |
| Motivationsschreiben          | PASS                      | PASS        | PASS, 2/2             | **FAIL — watermark**        |
| CV, Sidebar + synthetic photo | PASS                      | PASS        | PASS, 2/2             | **FAIL — watermark**        |

All are one A4 page. Both engines repeat pixel-identically across two runs.
Cover/letter XML text recall is 100%; CV 99.19% for both engines. The missing
`lebenslauf` token reflects the title's spaced glyph extraction; the heading is
visible in the rendered pages. All four calibration colors and the photo's
orientation are visible in both CVs. The title-page App PDF has no text layer;
its visible text was inspected on the rendered CI comparison, in addition to the
local OCR check. No missing photo, blank output or unexpected extra page.

The SDK draws its license warning as **19 gray vector glyph outlines**, absent
from PDF text extraction. This explains why the initial token-recall gate did
not detect it. The final script recognizes the exact measured glyph-path
signature for this pinned build and fails the trial. It never removes the mark.
Other SDK builds or overlays still require visual review.

The final gate was applied locally to all **12 original CI PDFs**, extracted from
the verified artifact ZIP. It rejects 6/6 ONLYOFFICE PDFs and accepts 6/6
LibreOffice PDFs, returning exit code **1** as expected. Converter times/RSS and
source hashes were preserved. This is an audit of actual CI outputs, not a second
conversion run. The final detector was not rerun as a full GitHub installation.
Four failure-contract tests, the 25 existing export unit tests, TypeScript,
changed-file ESLint, YAML parse, shell syntax and diff checks passed locally.

The vendor's [installation documentation](https://api.onlyoffice.com/docs/document-builder/get-started/installing)
confirms that the free Builder adds watermarks and that a commercial license is
required for unmarked output. This is a documented product limitation, not a
transient Linux crash. No further installation attempts are appropriate here.
The historical 7.2 AppImage is not promoted as a workaround.

## Converter comparison

RGB SSIM from the existing normalization, measured on each whole page:

| Document             | App / LibreOffice | App / ONLYOFFICE | LibreOffice / ONLYOFFICE |
| -------------------- | ----------------: | ---------------: | -----------------------: |
| Titelblatt           |             0.987 |            0.915 |                    0.924 |
| Motivationsschreiben |             0.954 |            0.901 |                    0.934 |
| CV                   |             0.883 |            0.811 |                    0.898 |

**ONLYOFFICE scores are contaminated by its watermark.** They cannot establish
how the unmarked engine compares with LibreOffice. Apart from the watermark,
visible differences include CV body/sidebar spacing, photo size, text wrapping
and section vertical positions. Both converters differ from the App PDF; the
CV has the largest measured difference. We have no Microsoft Word oracle and
make no Word-fidelity claim.

## Measured CI resources

| Measurement                                |               ONLYOFFICE 10 |        LibreOffice 24.2 |
| ------------------------------------------ | --------------------------: | ----------------------: |
| Conversion wall time, each single document |                 0.75–1.05 s |             1.15–1.45 s |
| Child-tree peak RSS                        |                 137–139 MiB |             214–237 MiB |
| SDK download                               | 74,094,512 bytes (70.7 MiB) |         distro packages |
| SDK unpacked size                          |       231,640 KiB (226 MiB) | not measured separately |

One `ubuntu-24.04` runner; no database/server/container required by Builder.
Cold full workflow: **4 min 25 s**, including installation. Browser source test:
24.8 s. Twelve conversions plus rasterization/analysis: 17.9 s before the added
outline detector. Artifact: 4,252,408 bytes, retained until 15 November 2026.
These are a three-document trial's measurements, not an x39 capacity guarantee.

## x39 suitability and resource-saving alternative

**BLOCKED / not established for all 39 templates.** The production Next guard
currently supports Modern/sidebar; the legacy x39 gallery is a different path.
This trial covers 1 template, 3 document types, two runs per engine. It must not
be relabelled as a 39-template Next acceptance. Unlicensed SDK watermark also
prevents using it as a clean visual reference for any of those 39 templates.

Retain **LibreOffice + the existing structural DOCX checks + rendered inspection**.
That alternative was actually exercised here: all six LibreOffice conversions
passed and are watermark-free. It adds no second conversion service or licence.
A full ONLYOFFICE Docs server was deliberately not installed: it is a larger
resource path and would be another experiment, not evidence from this trial.

## P2-02 recommendation

1. Add semantic and photo-presence checks to the existing parity workflow;
   retain conversion status separately from visual-reference acceptance.
2. Make the gallery's exporter identity explicit (Legacy x39 versus Next Modern)
   and report unsupported Next templates as BLOCKED. Keep the production guard.
3. Add a longer Modern/sidebar CV and mirrored/cropped synthetic-photo case to
   the existing Next lane. Compare full page counts and visual regions with LO.
4. Revisit ONLYOFFICE only with an available licensed Builder or a separately
   authorized resource-bounded Docs-server trial. No licence purchase requested.

## Durable evidence and branch safety

- Reviewed machine result: `p2-01-onlyoffice-results.json`.
- Visual comparisons: `p2-01-onlyoffice-cover.png`, `-letter.png`, `-cv.png`.
- Original CI artifact ID: `13064362935`;
  ZIP SHA256 `0d709344a64a60470388b95a39310d82a92cb9570492edab2cdaa0ff88e3cd87`.
- Only `.github/workflows/dossier-visual-parity.yml`, new QA scripts/tests, and
  this report/evidence change. `scripts/dossier_visual_parity.py` and `src/`
  are unchanged. No second workflow, no product export change.
- Protected baseline heads: dev `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`,
  render `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`,
  main `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`.
