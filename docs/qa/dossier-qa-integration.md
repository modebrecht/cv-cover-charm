# Bounded Modern QA on dev

The regular QA path now tests synthetic source downloads through the existing
`dossier-visual-parity.yml`, retaining its two job definitions. It changes no
product source, exporter, download menu, package dependency or Next source guard.

## Running it

A relevant dev push runs one source batch: actual cover and letter downloads,
plus the long 18-entry Modern CV on both sides with the proven new crop settings.
Five browser tests include the explicit Modern-eligible/38-blocked catalogue.
Native comparison converts eight documents: cover, letter, and three variants
of each CV. The x39 browser fan-out is not run for these dev pushes. The pre-existing
`dossier-web-gallery.yml` also no longer auto-runs on dev; it remains manually
available there and automatic on its other existing branches.

Manual dispatch `qa_suite=full` exports cover/letter and the ten bounded CV cases
(17/18/19 normal entries left/right, 18 varied left/right, two fresh crops).
It makes 32 native conversions. `qa_suite=gallery` preserves the original
39-template gallery path; render retains that path. This observational gallery
is not a 39-Next export approval.

To check archived CV sources without a browser:

```bash
python scripts/dossier_qa.py --frozen --suite full --out-dir artifacts/frozen-qa
python -m unittest discover -s tests -p test_dossier_qa.py -v
```

Archived sources are ten actual synthetic UI downloads. MANIFEST.json is
SHA256-pinned in the runner, and binds each original DOCX, optional retained App
PDF, frozen App measurements, exact candidate hash, export SHA and research
report hash. App measurements for all eight ordinary/varied cases came from
P2-17; crop measurements came from P2-26. The earlier reports and complete
history remain reachable through the P2-26 archive ref. The four App PDFs for
18-entry ordinary/varied sources were not durably retained by the research;
those cases use the frozen measured references, not newly claimed downloads.

## Outcomes are deliberately separate

* `original`: unmodified exported DOCX imported by LibreOffice. Known lost
  descriptions and mirrored photo displacement remain FAIL.
* `control`: the matching native body-flow copy before the empty-footer edit;
  only its header/bottom rasters are the native frame control.
* `candidate`: guarded QA copy. Every content/layout/photo/line/frame gate must
  pass. Missing input, mixed implementation/source SHA, source hash changes,
  invalid structures or candidate regressions return a nonzero exit code.
* Suite PASS accepts this bounded QA candidate and the cover/letter checks.
  It never turns an original baseline FAIL into a product PASS.

RESULTS.json contains individual gates, original/candidate results, declared
structural changes, implementation/source identities and per-conversion time
and RSS. SUMMARY.md and App/original/candidate contact sheets are retained even
when the native suite fails. Conversion RSS does not measure total job/browser
peak memory.

## Scope and preserved rules

The private mechanics are extracted from the verified P2-26 chain into one
module, with a single public candidate recipe. They still require the exact
synthetic `P202PraxisNN`/reference markers, Modern three-column structure and
17/18/19-entry families. This is not a general CV converter.

The complete recipe preserves spacing normalization, sidebar separation, direct
main-body flow, missing leaf-row split guards, equivalent mirrored photo anchor,
four foreground lines and the verified empty-footer distance edit. All
non-document ZIP parts are preserved byte-for-byte; text, controls and graphics
are checked at each step. Text-, field- and image-bearing footers are rejected
before any copy is created; no populated footer is removed.

Gates retain full titles, description endings, varied text markers and reference
content; equal App page allocation; no split entries; title positions within
2 mm; first-page-only photo on the correct side, BBox within 2 mm and pattern
agreement >=0.90; grouped reference heading/body; reference line and all four
section lines with a dark continuous run >=0.85; matching native header/bottom
rasters. PDF text ink boxes are not Writer row boxes, and pattern agreement is
not complete App pixel identity.

Ubuntu 24.04 / repository-pinned Python raster dependencies / Cabin and
Liberation are used in CI. ONLYOFFICE investigation is closed. No Windows,
manual Word approval, product fix or 39-Next approval is implied.

## Verified integration — 2026-11-02

Native checked implementation: `2020a560e5d897285e1ee1853423dbe4a446a057`.
[Full native CI run](https://github.com/modebrecht/cv-cover-charm/actions/runs/41497645811):
both source and comparison jobs PASS. Five browser tests passed; all four fresh
UI source pairs were additionally downloaded and their PDF/DOCX SHA256 hashes
rechecked against their manifests. All pairs have the implementation SHA above.

| Case | Original LibreOffice | Guarded QA candidate |
|---|---|---|
| Cover | PASS | Not applicable |
| Letter | PASS | Not applicable |
| 18-entry crop, sidebar left | FAIL: 14/18 complete entries | PASS: 18/18 |
| 18-entry crop, sidebar right | FAIL: 14/18 complete entries; photo shifted | PASS: 18/18 |

Eight conversions produced 20 native pages on LibreOffice 24.2.7.2.
Maximum candidate title-position deviation: 1.665 mm. Both photo pattern
agreements: 1.0, with BBox deviations below the retained 2 mm gate. All reference,
line, page allocation, entry split, header and bottom gates passed for candidates.
Measured peak converter RSS: 243388 KiB (237.7 MiB); this is not total job/browser
peak memory. Original failures remain FAIL in the durable evidence.

Local validation: 12 Python test groups, including exact regeneration of all ten
research candidates, negative content/photo/line/footer/source/App-marker gates,
and a contact-sheet check excluding OCR diagnostic images. The new evaluator
also passed all ten retained native research PDFs without new conversions.
These are overlapping checks, not 22 unique native test cases. The complete
fresh ten-CV native matrix is available manually; it was not rerun in this smoke
integration check.

CI fast checks on the native checked implementation also passed: 1486 product
unit tests, release formatting, TypeScript, lint (21 warnings, 0 errors) and
production build. The larger pre-existing Dossier Regression browser suite has
its own [run](https://github.com/modebrecht/cv-cover-charm/actions/runs/41497645964).

The final display-only contact-sheet correction was tested locally and rebuilt
from the retained native CI page PNGs with zero additional conversions. It
excludes `render-N-ocr.png` from the page list; measured page counts and native
gates were already correct. The three CV/letter sheets are byte-identical to
the initially reviewed rasters; the corrected one-page cover sheet was reviewed
separately. The core transformation/measurement module is unchanged from the
native checked implementation. The complete real results, resource values,
source manifests and raster hashes are retained in
[dossier-qa-integration-proof.json](dossier-qa-integration-proof.json).

### Reviewed native raster sheets

Columns show App, original LibreOffice, and QA candidate. Cover/letter have no
candidate; their last column is intentionally empty.

![CV left](dossier-qa-smoke-2026-11-02/cv-crop-left.jpg)

![CV right](dossier-qa-smoke-2026-11-02/cv-crop-right.jpg)

![Cover](dossier-qa-smoke-2026-11-02/cover.jpg)

![Letter](dossier-qa-smoke-2026-11-02/letter.jpg)

### Branch outcome

[The concrete 26-ref list](p2-branch-cleanup-2026-11-02.md) records exact current
SHAs, GitHub ancestry evidence and preservation decisions. 24 refs are deletion
candidates; P2-26 and the separate P2-14 proof closure remain archive anchors.
All 26 refs still exist; no deletion was performed or authorized. No new branch
was created. render and main remain at their pre-integration SHAs.

This completes the bounded QA integration and cleanup preparation. Product
exports are unchanged, and 39-Next release remains BLOCKED.

## Modern long CV follow-up — 2026-11-19

Two regular Modern CV downloads at `48d391f` use the `cv-crop-left` and
`cv-crop-right` browser fixtures with `p.cv.design.paperColor = "#fafafa"`.
The App PDF and all variants below rendered on three A4 pages per case.
LibreOfficeDev 26.8.0.0.alpha0 (`2c87e51e`) produced the native renders.

| DOCX variant | Visible titles / 18 | End reference | Layout observation |
| --- | ---: | --- | --- |
| Regular download | 15 | Missing | All 18 entries and the reference are in `word/document.xml`. |
| Only change the empty footer distance from 680 to 0 twips | 16 | Missing | The footer setting alone leaves missing content. |
| Add a table row before entry 9 | 18 | Present | Entries 6 and 15 move to the following pages relative to the App PDF. |
| Add the row and set footer distance to 0 | 18 | Present | App page allocation matches. Maximum same-page title deviation is 3.588 mm and the mirrored photo is 19.843 mm off horizontally. |
| Existing body-flow candidate via `make_candidate` | 18 | Present | App page allocation and photo gates pass. Maximum title deviation is 2.265 mm against the 2 mm limit. |

The row test splits the existing outer table at the ninth complete main-column
entry. It moves the following main blocks into a second row at the same widths,
keeps the sidebar in the first row and removes vertical cell padding in the
new row. It adds no page break. This isolates the long outer row from the
footer setting and the guarded candidate's separate photo correction. The
eighth-entry boundary is a diagnostic input for these fixtures. All tested
edits touch only `word/document.xml` and retain the text, all 107 content
control tags and all eight drawing names before any native save.

### Save and reopen

Saving the regular download once through the Writer filter `Office Open XML
Text` leaves 0 of 107 body content controls on the left and 2 of 107 on the
right. The existing candidate retains 0 on both sides. The row split with the
footer edit retains 0 on the left and 2 on the right. The two candidate variants
still show all 18 entries and the reference after two save/reopen cycles on
both sides. Visible text and serialized field identity give different results
in this engine. The photographed cases still need a round trip in the pinned
stable Writer engine and in Desktop Word before a production change is ready.

Source DOCX SHA-256 values for this run:

- Left `f3c7b68dbbf539e0db61161c80a7f93ecd1516f6b604f2baab367cc4c53494a6`
- Right `5061166130fb4317a340d7de230c962276402bccdfaeaa4a02608304e43b2db6`

[LibreOffice QA #202](https://github.com/modebrecht/cv-cover-charm/issues/202) ·
[Desktop Word QA #203](https://github.com/modebrecht/cv-cover-charm/issues/203)

## Pinned Writer roundtrip — 2026-11-19

LibreOfficeKit **25.8.7.3**, build `580(Build:3)`, was reconstructed from the
project's 50 hash-pinned packages and 12 Liberation fonts. The archived Ubuntu
packages also supplied four dependency libraries missing from the Debian host.
The native roundtrip used the same two photographed Modern downloads above and
eight new left/right App downloads with 17, 18 and 19 entries, including both
18-entry cases with varied description lengths. The `src` tree at `58f2561`
matches the product commit `48d391f` used for the original photographs.

| Variant | Before save | After Writer saves |
| --- | --- | --- |
| Regular download | The two original crop cases omit three entries and the end reference. Both varied cases omit entries 10 through 18 and the end reference. | The missing content remains. The two crop cases retain all 107 body field tags and text on both cycles in the stable Kit. The earlier Dev CLI flattened most body controls. |
| Existing detached candidate | Visible entries and reference return. Page allocation matches for varied descriptions. Title deviation reaches 2.291 mm. | The full-page header bitmap paints after the contact text and hides it. The PDF text layer still contains the three rows. The bottom crop is pixel-identical. |
| Compact table, normal picture | All ten cases retain the station text. The ordinary-length cases match pagination with a maximum title shift of 1.913 mm. The varied cases flow to four pages instead of five. | The simple no-zoom picture has a visibly different crop after the first save, in both the regular download and the two candidates. Its image-pattern agreement drops to 0.6875. |
| Combined diagnostic | 10/10 pass content, page allocation, reference, heading line, header and photo checks. | 10/10 pass the same checks after each of two saves and reopens. Every body field tag/value and every decoded source photograph pixel survives all 30 observations. |

The combined diagnostic keeps the three-column grid, its heading owners and
the first table row. For the ordinary fixtures it moves whole entries to a
second native row starting at the middle entry on the second measured page.
This row flows naturally. Splitting at the very first entry of the second
measured page pulled entries 7 and 16 forward in both 18-entry controls.
For the longer cases the diagnostic opens aligned tables at the App PDF's
measured page starts. The fixtures start new pages at entries 4, 9, 14 and
the reference. The table-only variant and extra `cantSplit` flags failed
the measured page allocation check.
The diagnostic removes excess empty spacing before the first experience lead,
normalizes the existing station boundaries and sets the verified empty footer
distance to zero. The mirrored photo uses a margin-relative offset with the
same declared page position. The horizontal displacement in Writer falls
from 19.843 mm to 0.258 mm.

The rounded native picture was isolated separately from the table. A plain
rectangle retains the crop on both saves but changes the frame shape. A custom
rounded path still shows the first-save crop change. In the combined diagnostic
the existing `nativePictureTileGraphic` helper places the original bitmap in a
rounded drawing shape and applies the saved crop via the fill transform. It
preserves all original RGBA pixels and the visual crop. The result has eight
three-page cases and two five-page cases. Across source and two save phases
there are 102 rendered pages. Maximum title displacement is 1.938 mm and the
lowest photo-pattern agreement is 0.9062, with the existing 2 mm and 0.90
limits. The final replay passed 30/30 observations with the default paper
setting and 30/30 with `#fafafa`. Both browser source runs passed 13/13 tests.

The two varied cases also passed a live Writer edit through its native API.
Changing the final title `P202Praxis18` to `P202Einsatz18` in each saved copy
kept five pages, the other 106 body fields, the reference, header/bottom raster
and decoded photo intact. Writer still drops the six header-row wrapper tags
from the saved markup, including with block-level row wrappers. The contact
rows remain visible and the header crops stay pixel-identical.
The final test counts body tags separately and lists missing header tags in
the report. The picture is a filled shape, so the Desktop Word editing and
replacement behaviour still needs its own check. The combined diagnostic
is invoked through the standalone QA script below.

### Repeat the stable proof

For this historical diagnostic, run the full browser suite against the
single-row exporter at `d12fc36475cc609546e01ecef7ec8c220bc1214b` on port 4173.
Include the cover, letter and template catalog so the existing source
validation can check all pairs.

```sh
DOSSIER_QA_SUITE=full SEMANTIC_PARITY_DIR=artifacts/long-proof-source \
  playwright test tests/e2e/dossier-semantic-parity.spec.ts --workers=1
python scripts/docx-next-stable-sidebar-setup.py artifacts/long-proof-engine
python scripts/dossier_qa_long_roundtrip.py \
  --source-dir artifacts/long-proof-source \
  --engine artifacts/long-proof-engine/runtime \
  --out-dir artifacts/long-proof-results
```

The roundtrip script writes QA copies, pinned renders and `RESULTS.json` into
a new output directory. It verifies the input hashes, the live engine version,
the established visual/layout gates, body field values and original RGBA
pixels. It reuses the regular export's first and continuation page crops as
the pixel references for the native header and footer. The report retains
each phase independently so a second successful save cannot cover up a
first-save mismatch.

## Modern CV continuation header — 2026-11-21

The normal Word downloads for a Modern Sidebar CV now read the saved compact
or hidden continuation header when the first page has a contact header. This
applies to the standalone CV and the dossier. The CV and letter can have their
own continuation settings while sharing their first-page header mode.

The first-page portrait keeps its authored position through shorter continuation
margins. Its vertical offset is relative to the section margin and its left or
right placement matches the sidebar grid. It remains an ordinary editable
picture. The browser regression covers both download routes and checks the
continuation paint, native contact fields, end reference and portrait anchor.

Pinned Writer opened all four regular downloads with the expected photo
position, continuation header and complete CV text. Writer 25.8.7.3 changes
the sample's rounded picture crop on saving. The same photo in the existing
contact-only export acquires the same `fillRect` and the same distorted crop.

The three-page check reproduced [#202](https://github.com/modebrecht/cv-cover-charm/issues/202)
with the usual contact continuation and with a compact continuation. Writer
showed 15 of 17 stations and omitted the end reference, although the DOCX
contained every field. The newly supported continuation choices therefore use
the PDF fallback when the measured CV exceeds two pages. Desktop Word
verification is still open.

## Modern CV cropped picture roundtrip — 2026-11-21

The normal Modern Sidebar DOCX download stores one editable picture with its
native crop for Word. The alternate shape fill uses the same full bitmap and
the same drawing anchor. In Writer, it avoids the conversion that replaced the
source bitmap and distorted the visible crop at the first save.

The fill chooses a centre or edge origin to minimise the effect of Writer's
whole-percent offset rounding. The ordinary picture markup remains the sole
rendering when the photo has no crop, has square corners, or would
expose an adjacent tile or exceed the 2 mm photo tolerance. The long-CV
diagnostic reads the native picture choice when it consumes a new download.
[LibreOffice bitmap offset implementation](https://docs.libreoffice.org/oox/html/fillproperties_8cxx_source.html)

Writer 25.8.7.3 (Kit) and 26.8.0.0.alpha0 (CLI) rendered both regular routes
with compact and hidden follow-up heads. Nine additional single-CV downloads
covered contact and compact heads, circle and rounded rectangle, border,
pan and 3× zoom, very tall/wide input, and an uncropped control. All 13
downloads preserved source RGBA pixels, visible text and page count through
two saves and reopens in both engines. The largest measured crop displacement
was 0.88 mm in the very wide 3× zoom control. Browser checks verify that both
representations point to the same image relationship inside one anchor.

Microsoft Word Desktop picture editing and saving still need native review.

## Flowing Modern CV download — 2026-11-22

The standard Sidebar DOCX uses the measured preview to bound native table rows
at whole entries on CVs with three or more pages. The editor can paginate the
rows as text changes. Mixed contact and compact or hidden follow-up heads use
the same flow in the standalone CV and the full dossier. The mirrored Sidebar
portrait uses an offset relative to the left margin to preserve its authored
position in Writer.

Adjacent half-width sections can continue as the same pair of columns. A
four-page school and experience fixture with 18 entries showed all text across
five Writer pages both at first open and after saving.

For fresh downloads, `dossier_qa.py` checks the actual native render for every
station, long-description markers, rubric rules, the final reference and the
portrait. The report includes the measured position and pagination. The
`--frozen` run still replays the historical diagnostic with its original gates.
Writer can flow long descriptions onto a different number of pages than the
App PDF. Desktop Word still needs its own native check.

[LibreOffice QA #202](https://github.com/modebrecht/cv-cover-charm/issues/202) ·
[Desktop Word QA #203](https://github.com/modebrecht/cv-cover-charm/issues/203)
