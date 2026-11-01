# P2-10 — outer flow context and package participation

Completed: the combined outer-context reduction plus zeroed gaps restores all
18 entries and reference on both sides, **with all 75 inner controls retained**.
Compaction makes no visible difference. None of the four individual context
removals suffices. The four critical-content PASS cases deliberately lose
photo/sidebar/chrome; **no product-export fix is accepted**.

Branch `work/01nov-p2-10-flow-context`, base
`e3cf9af71c7d11b58d6e25cedbf4db9fabc7c770`.
Initial implementation `f8822c01c65f2e0c36482e228c6b7c44f72ef03f`.
Closing implementation `6b9d04251648efa5708800c447f6294a900407e7`.
[Native run 41324889188](https://github.com/modebrecht/cv-cover-charm/actions/runs/41324889188).

## Sources and bounded matrix

Use the pinned, full 18-entry left/right production Next downloads from P2-08,
source export SHA `b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6`. Reuse that
source's complete App-PDF metrics; no fresh browser/App export is counted.
Original/all-zero full baselines must reproduce P2-09's exact input hashes and
12 page pixel signatures. The two separate small P2-06/07 controls must
reproduce their six saved page signatures.

Seven context states per side, each with original paragraph gaps and all 18
after values zero (28 full copies), plus the two small controls (30 native
conversions):

- Original context, no other edits.
- Remove only the two named page-background drawings from first/default
  header XML; keep header text, all references and body XML.
- Remove only the named body photo drawing; keep its paragraph, flow flags,
  relationships and media payload.
- Replace only the sidebar story with the same neutral one-table structure
  used in P2-04. Preserve its starting paragraph and photo if located there.
- Unlink four active first/default header/footer references. Keep their unused
  payloads; this removes their background drawings as well as header text from
  participation, unlike the background-only probe.
- Reduced outer context: unlink header/footer, remove body drawings, reduce
  sidebar and unwrap only outer SDTs. Protect every innermost entry/reference
  table, including its inner SDTs.
- The identical reduced document.xml after removing unreachable package parts.
  This compact/uncompacted twin isolates package participation.

All 19 critical table payloads/order and cell-start paragraph properties stay
identical. Main-story changes outside those payloads are checked against the
explicit drawing/outer-SDT removals; unrelated package parts stay byte-identical.
Compaction is separately enumerated and verifies every retained payload plus
byte-identical document.xml. Reductions deliberately lose pictures, paint or
sidebar/header data and are not alternate product exports. Their product
status is FAIL even if the critical-content or narrow App metric gates pass.

## Preparation finding: protected inner SDTs differ

A strict trial of rebuilding P2-04 exposed that its blanket unwrap also removes
content controls *inside* entry/reference tables. P2-10 does not weaken its
canonical payload guard to allow that extra variable. Instead it protects those
inner controls and limits unwrapping to the outer context. Therefore the reduced
context is explicitly not a claim to recreate P2-04's entire XML exactly.

[Read-only structural comparison](p2-10-structure-compare.json): both full sides
have 75 inner SDTs across 19 protected tables; the old compact P2-04 source has
zero. All corresponding text is identical. Removing only SDT envelopes in
analytical copies makes all 19 table canonical XML strings identical to P2-04,
including the remaining formatting/table structure. This normalization is not a
native test or a source-file edit. P2-10 converted copies retain the 75 inner
controls, so it cannot establish their native causal effect.

83 local controls pass: 10 new context, 8 compatibility, 10 production-copy,
9 boundary, 13 preamble, 10 spacing-search, 9 semantic/photo, 10 earlier isolation,
4 converter-contract tests. All five existing workflow job IDs remain. New
choice `fixture_probe: flow-context` selects the shared persisted-fixture job;
this matrix alone has a 15-minute job cap, others retain 10 minutes. Each LO
conversion has a private profile and 90-second timeout. No second workflow,
app/browser installation, product source or dependency changes.

## Initial measurement failure and bounded correction

The first native attempt completed seven DOCX conversions but failed while
measuring the third page of left-raw-no-header-footer: the page had no text and
every RGB channel was exactly 255, so it was visibly blank. The general App/PDF
measurement fallback had unnecessarily invoked Tesseract, absent from this
lightweight job. This was an analysis error, not a failed DOCX conversion or a
valid negative result for the unmeasured/unrun cases.

Run 41324889188, job 124902656942; artifact 13090918246, ZIP SHA256
`b6f924def6d812834c30b3b12b34f0eec0502d81881776e0ba2aba2558b31a19`.
Downloaded hash verified. [Verbatim partial native report](p2-10-initial-results.json),
SHA256 `080831831cd7313e14e9e9413658dc6d6605a6c50cc26760fb1079e8e13f3ab8`.
Four measured full copies were FAIL at 14/18; later cases were not completed by
that analysis attempt and are not counted as valid negative findings.

The correction adds an opt-in native-page blank check: empty normalized text
and every rendered RGB pixel exactly white. Any non-white pixel, including a
single 254-gray pixel, prevents the bypass. Text-layer content prevents it too.
An empty page still fails the critical-content gate. The default App-PDF path
continues to invoke OCR; no dependency was added and no content threshold was
relaxed. Two real-PDF/sparse-ink controls bring the closing suite to 83 tests.

## Verified closing native results

[Closing run 41325646722](https://github.com/modebrecht/cv-cover-charm/actions/runs/41325646722),
job `124904898401`, implementation `6b9d04251648efa5708800c447f6294a900407e7`:
**30/30 usable DOCX conversions, 90 converted PDF pages, 83/83 Python controls**.
Both small controls reproduce their six page signatures; all four full
original/all-zero baselines reproduce P2-09 input hashes and twelve page
signatures. Execution PASS means completed measurements and those controls,
not approval of the reductions as alternate exports.

The table reports complete protected main-story entries. Every copy has three
pages. PASS/FAIL applies to that critical-content check; all 28 full-document
product statuses remain FAIL because the originals fail parity or diagnostic
copies intentionally remove data/paint.

| Context | Left original gaps | Left all-zero gaps | Right original gaps | Right all-zero gaps |
|---|---|---|---|---|
| Original | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 |
| No page-background drawings | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 |
| No photo drawing | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 |
| Reduced sidebar story | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 | FAIL 14/18 |
| Header/footer references unlinked | FAIL 15/18 | FAIL 15/18 | FAIL 15/18 | FAIL 15/18 |
| Combined reduced outer context | FAIL 15/18 | **PASS 18/18** | FAIL 15/18 | **PASS 18/18** |
| Same reduced document, compact package | FAIL 15/18 | **PASS 18/18** | FAIL 15/18 | **PASS 18/18** |

Thus **4 critical-content PASS, 24 FAIL, 0 BLOCKED** in the closing 28-copy full
matrix; the two small controls retain their separate known negative/positive
behavior. In 14-entry cases, entry 15 is incomplete and entries 16–18/reference
are absent. In 15-entry cases, entry 16 is incomplete and 17–18/reference are
absent. All four 18-entry cases include complete descriptions and reference
role/phone, unique markers and no observed entry split. Their title pages and
entry start/end pages match the stored App reference; the unchanged 2 mm main
title-geometry gate passes. Missing images/chrome/sidebar still prevent full
product parity.

Unlinking header/footer changes the first boundary: entry 06 returns from LO
page 2 to page 1, while title 01 remains at top-left [95.338,139.184] mm in the
left source. That alone still loses the tail. The combined all-zero reduction
has title 01 y 137.914 mm, then entries 01–06 / 07–15 / 16–18 plus reference
across pages 1/2/3. These are observed context effects, not a causal diagnosis
of a particular importer routine.

## What the twin and control comparisons establish

[Package twins](p2-10-package-twins.json): all four compact/uncompacted pairs
have byte-identical document.xml and identical three-page RGB signatures.
Uncompacted files are 206,510–206,515 bytes; compact files 6,267–6,284 bytes.
Pruning unused parts therefore is not needed for recovery in this reduced
context. This does not prove unused parts irrelevant for every possible file.

Both left reduced contexts also match all saved P2-06 page pixels exactly, for
original and zeroed gaps, despite retaining the 75 inner controls that P2-06
had removed. The earlier analytical inner-SDT difference remains true, but
**removing those 75 controls is not required for recovery**. Their interaction
with an unreduced context has not been independently tested; they must not be
presented as the established sole cause.

[Initial-output repeat check](p2-10-initial-repeat.json) verifies all seven
first-attempt input hashes and all 21 actual converted page signatures against
the closing outputs, including the initially unmeasured blank page. The
measurement correction changes no document input or native output layout.

All 19 protected table payloads/order remain identical to the original full
source in every reduction. In particular all 75 inner SDTs remain unchanged.
The first cell-start paragraph properties, including keepNext, stay intact;
mode, margins, styles and critical row flags are not combined with this test.
Changed/deleted package parts and the deliberate losses are enumerated per
case in [verbatim closing results](p2-10-closing-results.json).

## Visible QA and durable fixtures

The three-page App/original/reduced-all-zero comparisons were directly
inspected for both sides: [left](p2-10-left-body.jpg), [right](p2-10-right-body.jpg).
Full descriptions and reference contact are visibly present in the recovered
third pages. Photo, sidebar data and header/footer design are visibly absent
there, as declared. Body recovery is not a polished dossier export.

The background-only probe retains header text in XML, but removing its dark
backdrop can leave white header text unreadable on white. That is an intentional
visual consequence of the reduction, not retained full visible-header parity.
The same declaration prevents narrow marker/photo gates from accepting such
a copy as a product fix. Photo-only removal likewise leaves the image part
unused in the package; only the compact twin removes unreachable parts.

Where calibration pictures remain, the left photo gate passes and the right
retains its 19.844 mm x displacement; calibration pattern agreement remains
1.0. The deliberately photo-free contexts fail the photo gate as expected.
No new zoom/crop or 17/19-entry acceptance is claimed here.

[Four compact protected-context DOCX fixtures](../../tests/fixtures/lo-import-p2-10/README.md)
persist raw/zero negative-positive pairs for both sides, each about 6.3 KB.
Their manifest binds all bytes, document.xml, 19 critical tables, 75 inner
controls, declared omissions and native page/content expectations. These
synthetic image-free files are diagnostic reproducers, not private Word files
or replacement product exports. The unchanged full sources remain in P2-08.

## Evidence, replay and CI resources

Closing artifact `13091222390`, **12,998,928 bytes**, ZIP SHA256
`b33a46adf33ca4b3b7bea39fb72aef432708d707d08fc1fd88d2b21e583e5ea3`;
download hash verified. Verbatim closing RESULTS.json SHA256
`08aa3fbd9908cb4c28bc0d742c3788a909807476619d6850cb47a8b0bd2fae05`.
The artifact retains all DOCX copies, native PDFs, page rasters and resource
logs for 14 days. Committed native JSON, figures, source/compact fixtures and
verification files persist.

[Audit-only replay](p2-10-audit-replay.json) verifies saved DOCX/PDF hashes and
exactly reproduces all 28 cases and both controls while preserving native
timings/RSS. It makes **zero new native conversions** and is not another engine
run. The shared App measurement path retains its old OCR default; only this
native context probe enables the strict blank-page bypass.

LO `24.2.7.2 420(Build:2)`, Ubuntu 24.04, fonts and pinned Python analysis.
Closing job-log duration: **422.43 seconds (7 min 02 s)**, UTC
16:18:29.711–16:25:32.143 on 1 November 2026 (17:18–17:25 Europe/Zurich).
LO child wall times total **327.018 s**; peak child RSS **237.09 MiB**
(242,784 KiB), not whole-runner/Python memory. The 15-minute context-job cap
and per-conversion 90-second cap were not hit. Other persisted probes retain
their 10-minute job cap. No app/browser installation or new workflow/job.

Including the initial analysis failure: **37 actual DOCX conversions, 111
converted PDF pages, 30 distinct inputs**, with seven inputs repeated. The
initial job took 146.88 s; both native jobs total 569.31 s. Historical App-PDF
references, unit-test synthetic PDFs and audit reads are not counted as new
native DOCX conversions. No Tesseract installation was attempted to fix a
genuinely blank page.

## Decision and P2-11 handoff

Keep the normal exporter, LibreOffice baseline and full negative controls
unchanged. No single tested context deletion provides an acceptable source
repair. The successful combined reduction plus zero gaps is a **positive
diagnostic control**: it recovers the critical story and its narrow App layout,
while intentionally destroying other required dossier content/design.

The next experiment should split that successful bundle, retaining the 75
inner controls. Prioritize two factors not tested alone here: **outer SDT
wrappers** and the **four main-section heading flow-paint drawings**. Cross
neither/each/both with original/all-zero gaps, initially retaining full photo,
sidebar and header/footer content. Keep the known full negative and reduced
positive controls. If needed, then separate header and footer participation or
restore individual components to the positive reduction. Use a bounded native
matrix, not further arbitrary gap guessing or automatic package stripping.

This identifies the remaining interaction; P2-10 does not prove which element
is necessary or sufficient in every source. It does not justify removing inner
controls or images from the normal export. Any future non-destructive candidate
still needs neighboring lengths, source-matched App comparison and explicit
coverage before product acceptance.

ONLYOFFICE's earlier watermark rejection remains unchanged; no vendor run,
message or issue is counted. No new full x39/cover/letter run, deployment,
merge, Windows-PC access or manual Word acceptance. Product source, dependency
manifests/lockfile and all earlier input fixtures remain unchanged. Protected
refs verified unchanged:

- dev: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- render: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- main: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`
