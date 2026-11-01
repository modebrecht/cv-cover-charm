# P2-08 — full production Next spacing counterprobe

Completed: **the gap-after-entry-06 intervention fails in all six full
production cases**. App-PDFs and source DOCX data are complete. Both untouched
LO conversions and diagnostic copies retain only 14 complete entries, with
entry 15 incomplete and the remaining tail/reference absent. The P2-07 small
positive control still reproduces exactly. Do not promote this intervention
to the product exporter.

Branch `work/01nov-p2-08-production-spacing`, base
`35408748d14cd9eb7614a3dc96b416c43244032a`.
Tested implementation `b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6`.

[Native run 41316674034](https://github.com/modebrecht/cv-cover-charm/actions/runs/41316674034)
uses the existing semantic-parity job in dossier-visual-parity.yml.
No second workflow or job, no product exporter changes.

## Controlled source matrix

Six fresh synthetic dossiers: 17, 18 or 19 authored practice entries, each with
left or right sidebar and the same 120x180 four-colour calibration photo.
The unchanged project importer and actual PDF/DOCX menu items produce same-SHA
App-PDF and production DOCX Next downloads. JSON sidecars bind every file hash,
intent, source SHA and entry count. Cover/letter pictures are cleared before
import; the CV picture is replaced by the generated calibration PNG.

Each untouched source DOCX is converted once. A separate copy changes only
w:spacing/@w:after from 1 to 0 in the direct empty main-cell paragraph after
P202Praxis06. The selector locates authored content, independently of sidebar
side, XML byte offset and physical cell number. Original downloads remain
unchanged; all non-document.xml ZIP parts are byte-identical, all visible text
and the canonical innermost entry/reference tables remain identical. No mode,
keepNext, cantSplit, photo-anchor, crop or section-margin edits are combined.

The unchanged P2-07 failing original and successful one-gap control are also
converted. All six decoded page pixel signatures must match their persisted
P2-06/07 observations before production-case findings are accepted.

## Checks and interpretation

47 Python controls passed locally: 10 new production-spacing, 10 spacing-search,
9 semantic/photo, 10 earlier isolation and 8 minimal-repro controls.
Playwright test selection lists six exports and one x39 availability guard.
The default eight-document test selection remains available.

Content checks require every unique entry/reference marker, completed authored
entry descriptions and reference role/phone. A title alone cannot hide a lost
or split description. The App-PDF text is obtained by visible-pixel OCR where
its PDF text layer is empty; OCR TXT/TSV and page rasters are retained.

Separate comparison checks cover page counts, entry start/end pages, title and
reference pages, observed entry splits, calibration-photo side/bounding box/
pattern and absence of repeated continuation photos. Photo tolerance remains
2 mm and pattern agreement 0.90. Common title positions are compared using
App OCR token boxes versus LO PDF text boxes, with an explicit 2 mm trial gate.
These two measurement methods are not font-metric equivalents; the geometry
numbers support the visual review and do not establish Word fidelity.

Execution PASS requires pinned pixel controls, complete source/App data,
finished native conversions, invariant-preserving copies and the full six-case
matrix. Individual content/layout/photo parity may still be FAIL. Converter
failures abort with explicit error and attempted-conversion resources instead
of being counted as valid negative content findings.

## Verified native results

Ubuntu 24.04, LibreOffice `24.2.7.2 420(Build:2)`, native job `124878076545`:
**14/14 conversions, 47/47 Python controls and 7/7 browser tests pass**.
Fourteen converted PDFs have 42 pages; six App-PDFs add 18 pages, **60 PDF
pages** examined. Both pinned controls reproduce all six stored page signatures.
All six App-PDFs use their existing PDF text layers; the OCR fallback was not
needed. All original DOCX and App-PDF markers, entry descriptions and reference
contact are present. The guarded catalog remains 1/39 ELIGIBLE (Modern), 38/39
BLOCKED; that is availability coverage, not 39-template export acceptance.

| Production document | App complete | LO original complete | LO gap06-zero complete | App/LO pages | Photo gate, both LO copies | Candidate overall |
|---|---:|---:|---:|---:|---|---|
| 17 entries, left sidebar | 17/17 | 14/17 | 14/17 | 3/3 | PASS | FAIL |
| 17 entries, right sidebar | 17/17 | 14/17 | 14/17 | 3/3 | FAIL | FAIL |
| 18 entries, left sidebar | 18/18 | 14/18 | 14/18 | 3/3 | PASS | FAIL |
| 18 entries, right sidebar | 18/18 | 14/18 | 14/18 | 3/3 | FAIL | FAIL |
| 19 entries, left sidebar | 19/19 | 14/19 | 14/19 | 3/3 | PASS | FAIL |
| 19 entries, right sidebar | 19/19 | 14/19 | 14/19 | 3/3 | FAIL | FAIL |

Original and modified production variants are **12 FAIL, 0 PASS, 0 BLOCKED**
under the stated combined comparison gates. These are valid negative findings,
not conversion failures hidden by a green experiment-execution job.

Entry 15 has a title but no completed description. Entries 16 through the
authored last entry and the reference marker/contact are absent in LO.
The third page retains the dossier header/background/footer decoration but
has no CV body. No completed entry is observed spanning pages; that does not
make an incomplete or missing entry acceptable.

All six three-column page sheets were directly inspected: App-PDF, original
LO and gap06-zero LO. Original/copy decoded RGB pixels are equal on pages 1
and 3 in every case; page 2 changes slightly without restoring content.
The selector finds physical main cell 2 for left sidebar and cell 0 for right,
the same semantic gap at direct child index 22. Its one attribute edit leaves
18/19/20 innermost critical tables intact for the 17/18/19-entry cases,
respectively. Unlike P2-07's reduced fixture, a raw one-byte XML change is not
claimed for these reserialized full production packages.

## Converter and layout comparison

P2-07's small coupled source places entry 06 at the end of LO page 1.
In these full production exports, App-PDF still places entry 06 on page 1,
whereas LO already moves it to page 2. Setting the following gap to zero does
not move it back or recover the tail. This observed contextual difference
supports a boundary-sensitive follow-up; it does not establish a universal
rule or an instrumented importer root cause.

For the representative 18-entry pair, title 01's measured LO/App x offset is
0.078 mm left and 0.068 mm right; y offset is 2.366 mm. Title 07's y offset is
26.396 mm originally and 26.379 mm after the gap edit. Entry/title page and
span differences remain, so layout fails independently of the missing text.
The explicit 2 mm common-title trial threshold was not loosened.

Photo pattern agreement is **1.0 in every case**, with no calibration photo
repeated on continuation pages. Left-photo x/y matches App; LO width/height
differs by 1.059/1.323 mm, within the existing 2 mm gate. Right-photo x is
**19.844 mm farther right**, unchanged by the spacing edit. Representative
right bboxes [x,y,width,height] in mm are App
[155.253,52.101,26.713,33.323] versus LO
[175.097,52.101,27.772,34.646]. Side alone would not catch this displacement.
This stage uses zoom=1 calibration images; additional zoom/crop variants from
P2-02 were not rerun, and no broader cropping acceptance is inferred.

Representative durable sheets:
[18-entry left](p2-08-cv-18-left.jpg),
[18-entry right](p2-08-cv-18-right.jpg).
[Full native results](p2-08-production-results.json) contain every case's input
file hashes, exact attribute edits, text/page spans, photo grids, title geometry,
page signatures and native resources.
[Four full synthetic DOCX fixtures and manifest](../../tests/fixtures/lo-import-p2-08/README.md)
preserve both original 18-entry downloads and their unsuccessful copies for
future low-cost native probes. Original DOCX file hashes still match their
browser download sidecars. Every other package part is identical within each
pair. The generated calibration image, line decorations and page backgrounds
were inspected; no private photographs or local Word files are added.

## Evidence and resources

Artifact `13088315121`, size **20,623,575 bytes**, ZIP SHA256
`d83f9db90763deabb3e829d21076a37123cae24e524734db51f3c9ded59810e2`;
download hash verified. Committed native RESULTS.json is copied verbatim,
SHA256 `ad882abd27c87cb8b73cc255ec26011c8ce22cfbc08d9b07b5849e0b2109c167`.
The artifact retains all original/copy DOCX files, App/LO PDFs, rasters and
measurements for 14 days; the committed fixtures, results and figures persist.

[Audit-only replay](p2-08-audit-replay.json) passes: every saved DOCX/PDF hash
and all six case results/comparisons reproduce exactly, both controls match,
and native timings/RSS are preserved. Replay makes **zero** new native
conversions. P2-08 contains one native matrix, not two independent engine runs.

Measured job-log duration: **445.23 seconds (7 min 25 s)**, UTC
14:32:13.297–14:39:38.525 on 1 November 2026 (15:32–15:39 Europe/Zurich).
Browser tests take **53.2 seconds**. LO conversion child timings total
**255.665 seconds**, peak RSS **238.49 MiB** (244,212 KiB). Full production
left originals/copies take 16.55–16.80 s each; right 24.52–25.52 s. The two
small persisted controls take 3.371 and 1.605 s. These are observed timings
for different packages, not a measured explanation of the speed difference.

The existing semantic job uses Bun, Node 22, Chromium, LibreOffice, fonts,
Tesseract and pinned Python analysis dependencies. Each LO conversion has a
private profile and 90-second timeout; job cap is 20 minutes. Whole-runner,
browser and Python peak memory were not measured; the 238.49 MiB value must
not be used as a whole-job memory budget. A follow-up using persisted DOCX
fixtures can avoid reinstalling/building the app/browser export path.

## Decision and P2-09 handoff

**Reject the hardcoded gap-after-six product workaround.** Its demonstrated
minimum in one reduced fixture remains true, but it is not portable to the
six tested full documents. Keep the original negative baselines and the small
positive control. Do not normalize production spacing or replace LibreOffice.
ONLYOFFICE's earlier watermark rejection is unchanged; no new vendor run is
counted here. Cover/letter and the full 39-template matrix were not rerun.

P2-09 should use the persisted full 18-entry left/right downloads to isolate
the actual LO boundaries: the first page ends after entry 05 and entry 15 is
incomplete at the second boundary. Test gaps after 05, 14 and 15 separately,
plus a collective small-gap-zero control and the unchanged/gap06-zero cases.
Retain the complete table payloads, photo intent, margins and mode 15. Start
with this bounded native-only matrix, not a global exporter rewrite. A
successful candidate still needs the neighboring lengths and same-SHA App
comparison before product acceptance.

Product source, export code, dependency manifests/lockfile and all P2-04/06/07
source fixtures remain unchanged. No merge, deployment, vendor message,
custom-engine installation or manual Word/desktop approval. Protected refs:

- dev: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- render: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- main: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`
