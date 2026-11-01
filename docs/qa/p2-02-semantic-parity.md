# P2-02 — production Next content, photos and continuation

Work branch: `work/01nov-p2-02-semantic-parity`.
Base: P2-01 `bdc795dc3a76e803f1c611ec749b6e7915ffdc79`, itself based on
unchanged `dev` `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`.
No product exporter/guard changes, Windows access or private documents.

## Correction to P2-01's infrastructure description

The existing `dossier-docx-gallery.spec.ts` clicks `DossierExportDialog`, whose
DOCX handler calls `downloadSavedDossierDocxNext`. It does **not** call the legacy
exporter. P2-01 incorrectly inferred legacy use from the old gallery assumptions
and older library's presence. That historical statement is corrected here.
The real defect is that the gallery still expected 39 successful downloads after
the production UI switched to Next's Modern/sidebar guard. P2-01's observed
converter/watermark findings are unaffected.

## Implemented checks

- Existing x39 workflow retained. The DOCX gallery now records each template as
  EXPORTED or BLOCKED with the actual production availability reason. Its UI
  disabled-state assertion remains real; no guard bypass.
- Same-SHA batch assembly validates complete coverage, unique templates, declared
  exporter and exact correspondence between EXPORTED rows and DOCX files.
- The visual report compares only EXPORTED triplets and explicitly lists blocked
  coverage. Critical canonical markers are checked against DOCX XML and converted
  PDF. A photo-free demo is labelled as not exercising photo parity.
- A dedicated lane in that same workflow exports eight synthetic cases through
  the real menus: cover, letter, CV left/right, two asymmetric crop settings and
  long CV left/right with 18 unique entry markers plus a final reference marker.
- It checks markers in source XML, App PDF and LO PDF; exact page counts; long
  continuation; marker uniqueness; no duplicated photo on continuation; physical
  photo side and bounding box; and the calibration pattern inside the photo.
- Photo trial thresholds are explicit: maximum 2.0 mm box-coordinate drift and
  > =90% agreement on the 8x8 color-pattern grid. No SSIM release threshold.
- Raster-only cover text uses OCR and records that method. Other pages use their
  PDF text layer. Neither approach is a complete visual/Word fidelity oracle.

## Current validation

Initial local browser round: 9/9 passed, including the 39-template availability
guard. The long CV App PDFs have three pages. The fixture was then made explicit
about both sidebar-info position and the legacy mirror value, with an assertion
of the captured Next side. Final rerun/CI result will be appended.

Nine negative/control tests pass: missing text, lost/moved/reversed/wrong-crop
photo, unchanged photo, missing/reasonless coverage and mixed-SHA batches.
TypeScript, changed-file ESLint, YAML parse, shell syntax and diff checks pass.

Unsupported availability is not a passed export or a 39-template acceptance.
ONLYOFFICE remains opt-in research; this lane uses LibreOffice only.
