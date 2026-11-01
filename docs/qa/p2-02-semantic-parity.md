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
of the captured Next side. The verified closing run below records the rerun and native CI outcome.

Nine negative/control tests pass: missing text, lost/moved/reversed/wrong-crop
photo, unchanged photo, missing/reasonless coverage and mixed-SHA batches.
TypeScript, changed-file ESLint, YAML parse, shell syntax and diff checks pass.

Unsupported availability is not a passed export or a 39-template acceptance.
ONLYOFFICE remains opt-in research; this lane uses LibreOffice only.

## First native CI findings (implementation `372086f`)

[Run 41276078265](https://github.com/modebrecht/cv-cover-charm/actions/runs/41276078265)
completed the nine browser cases and nine negative controls. Real conversion
acceptance is **4 PASS / 4 FAIL**, not a release approval:

| Case          | Result | Observed defect                                            |
| ------------- | ------ | ---------------------------------------------------------- |
| cover         | PASS   | none in these gates                                        |
| letter        | PASS   | none in these gates                                        |
| cv-left       | PASS   | none in these gates                                        |
| cv-crop-left  | PASS   | none in these gates                                        |
| cv-right      | FAIL   | photo x differs by 19.844 mm                               |
| cv-crop-right | FAIL   | photo x differs by 19.844 mm                               |
| cv-long-left  | FAIL   | last 3 station markers + final reference not visible in LO |
| cv-long-right | FAIL   | missing tail + photo x differs by 19.844 mm                |

All long App/LO PDFs contain three pages. LO's third page has header/footer but
no body content. Source XML contains the missing station/reference text; the
App's third page shows it. This is a rendered-content defect, not lost JSON data.
Visual inspection of the original CI comparison sheets confirms both findings.

For the right photo, source XML declares `positionH relativeFrom=page` with
`posOffset=5580000` EMU = **155 mm**. App colored-photo x = **155.253 mm**;
LO colored-photo x = **175.097 mm**. The discrepancy therefore needs converter
anchor investigation before changing a Word exporter previously checked in Word.
No normal exporter change or tolerance relaxation is made in this task.

Original artifact `13070887987`, ZIP SHA256
`0e0d0d926f1a80b50b72dde464c5567d42b5527c3fcb652518a870e9d2f919c8`.
The final auditor was reapplied to those exact CI PDFs and reproduced 4/4,
preserving original converter time/RSS measurements.

## Gallery pilot repair

The original demo also selected classic CV structure and a non-Sans font.
The shared synthetic gallery helper now explicitly selects the approved
Modern/sidebar/Sans/contact/compact profile for Modern, for ALL three source
formats together. Product defaults remain unchanged.

Real batch-0 pilot after repair: **1 EXPORTED (Modern), 3 BLOCKED**. Modern's
baseline DOCX passes the ZIP and 3-section checks. Custom letter margins are
still unsupported by `sourceLetterFlowInputIssue`; the pilot asserts their real
UI disabled state and records custom-margin BLOCKED, without weakening the guard.
Other supported profiles still run their existing margin-preservation assertions.

The closing CI run below verifies the repaired pilot and repeats the actual failure
matrix. The full 39-template source
matrix has not been rerun; 10-batch coverage assembly was verified separately
with one exported and 38 blocked rows and mixed-SHA negative controls.

## Bounded diagnosis and next cloud step

The mirrored DOCX section has left margin `1134` twips = **20.003 mm**;
the left-sidebar section has zero left margin. The mirrored photo is explicitly
page-relative at 155 mm with `layoutInCell=0`, yet LO places it at about 175 mm.
This matches the section-margin size within raster precision. **Inference:** LO
adds the section's left margin to this anchored picture. A controlled one-property
probe is still needed; no source/Word renderer fix follows from this alone.

Next P2-03 can stay cloud-only: isolate page-relative picture handling with
synthetic copies, and independently reduce the long table story that leaves LO's
third page empty. First compare the research branch's relevant opt-in changes;
do not duplicate or merge them into production by assumption.

Long-CV conversion also takes **16.7 / 25.2 seconds** in the first measured CI,
versus about 1.4–1.7 seconds for short documents; peak child RSS stays around
238 MiB. These are observations from that run, not capacity guarantees.

Durable evidence: [machine results](p2-02-semantic-results.json),
[short mirrored CV](p2-02-cv-right-comparison.jpg),
[long mirrored CV, all three pages](p2-02-cv-long-right-comparison.jpg).
Comparisons show App on the left and LibreOffice on the right.

## Verified closing run

[Run 41276666543](https://github.com/modebrecht/cv-cover-charm/actions/runs/41276666543),
implementation `1433ca6e8512bc3d99e89a1e83acd5aa67b3af09`:

- 9/9 real browser cases passed (59.6 s), plus gallery pilot passed (16.0 s).
- Pilot produced Modern's genuine baseline DOCX; 3 other batch-0 templates and
  Modern's unsupported custom-letter-margin setting remain explicitly BLOCKED.
- 9/9 negative/control tests passed. Existing Next app export unit file: 25 PASS;
  previous converter-contract tests: 4 PASS. TypeScript and changed-file checks pass.
- Actual LO acceptance repeats **4 PASS / 4 FAIL** exactly, including identical
  photo measurements and missing-marker sets. CI is therefore correctly **red**.
- 16/16 source file hashes and all case source SHAs verified after download.
- Original artifact `13071825710`, ZIP SHA256
  `829adfcfa02ef8144d28e2eaea33bf6cec1f4ea77007744943807f1ce90876ce`.
- Full cold workflow duration: **4 min 11 s**. No new renderer installation beyond LO.

The machine result accompanying this report uses this second run. The durable
comparison images show the same reproduced first-run defects. No product code,
export rules or thresholds were changed to make the four cases pass.

P2-02 is complete as an implemented, verified regression-checking step. The two
underlying rendering defects remain for the isolated P2-03 investigation above.
The full x39 source/visual matrix still needs its own end-to-end run before any
x39 visual-coverage claim; the current supported Next profile stays Modern only.
