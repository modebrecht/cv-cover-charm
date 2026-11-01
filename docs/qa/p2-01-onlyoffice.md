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

Final current-engine run ID, statuses, resource measurements and P2-02 decision
will be appended after examining the actual CI artifacts. No current-engine
PASS or 39-template suitability is claimed before that evidence exists.
