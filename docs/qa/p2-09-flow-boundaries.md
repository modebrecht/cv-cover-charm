# P2-09 — full production flow-boundary spacing probes

Completed: **all twenty full-production variants fail content and combined
parity**, including the copy with all eighteen tested after values zero.
Every full copy has 14/18 complete entries on three pages. The small positive
P2-07 control still renders its complete tail. These spacing interventions
are not a portable product repair.

Branch `work/01nov-p2-09-flow-boundaries`, base
`336e90f45c00af8cc1644dabd2bb83f967093d84`.
Initial implementation `524964b58d94a3a252feb0f21ca8f2f8a3733eef`.
Closing implementation `1135164b5c5fefbbc1150da49900193fe6af3874`.
[Native run 41320380780](https://github.com/modebrecht/cv-cover-charm/actions/runs/41320380780).

## Source and controlled matrix

The two full 18-entry production DOCX downloads and their known gap06-zero
counterprobes are the committed, hash-pinned P2-08 fixtures. Their source-export
SHA is `b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6`. The reference App-PDF
measurements are reused from the committed P2-08 native report, pinned SHA256
`ad882abd27c87cb8b73cc255ec26011c8ce22cfbc08d9b07b5849e0b2109c167`.
P2-09 does not create new App-PDFs or count historical references as new tests.

For each left/right sidebar source, convert six copies:

- Original, whole-file byte-identical.
- Known gap-after-06 zero, whole-file identical to the P2-08 stored copy.
- Only gap after entry 05 zero: around the first observed LO page boundary.
- Only gap after entry 14 zero: immediately before the incomplete entry 15.
- Only gap after entry 15 zero: after the incomplete entry at the second boundary.
- All sixteen 1-twip inter-entry gaps (02–17) zero, leaving both 72-twip section
  gaps unchanged. This is a collective diagnostic intervention, not normalization
  of the production baseline.

The initial 14-conversion matrix completed with 72 controls. All twelve full
production copies remain FAIL with 14/18 complete entries on three pages. Both
small controls and all four saved full-production baselines reproduce exactly.
Native job duration: 141.68 s; LO child timings total 89.752 s, peak RSS
237.19 MiB. Artifact `13089506013`, ZIP SHA256
`c914643c72ce054189b3a098ff171623dd888299509fdc9365d03788e7c9bc68`,
download hash verified. [Verbatim initial results](p2-09-initial-results.json),
SHA256 `ddc72f8d0c9e9f1765e595100da800a3d55e865ccd5ecf617801363b101d5ae0`.

The remaining section-sized gaps were deliberately unchanged in that matrix.
The closing run adds four cases per side: only the school-to-experience gap
72 -> 0; only the pre-reference gap 72 -> 0; both section gaps zero; and all
18 gaps zero. It reruns all fourteen prior inputs with exact hash/pixel-repeat
gates. This closes the source document's two-group spacing question without an
open-ended search or assumption that the sixteen small gaps suffice.

All changes are after=1 or 72 -> 0 attributes on empty direct main-cell paragraphs.
The main cell is selected semantically for both sides. All 19 innermost entry/
reference tables and ordering, visible text, pictures, media, settings, styles,
headers and every other package part remain identical. No combined edits to
mode 15, keepNext, cantSplit, margins, anchors or crop settings.

Two small P2-06/07 repro controls are also converted, one failing and one
content-complete. Their six page signatures and the twelve signatures of the
four original/gap06 full-production controls must reproduce exactly. Execution
PASS requires those controls plus all 22 usable closing conversions and 14 exact first-matrix repeats. It does not accept
a content/layout/photo failure as a product fix. Native resources and attempted
conversion failures are recorded explicitly.

Same existing workflow and persisted-fixture job; no new workflow/job or app/
browser rebuild. The `boundary_spacing` input selects this bounded matrix.
73 local controls pass: 9 new boundary, 10 production-copy, 8 compatibility,
13 preamble, 10 spacing-search, 9 semantic/photo, 10 earlier isolation and
4 converter-contract tests. Workflow parses and all five job IDs remain.

## Verified closing native matrix

[Closing run 41321091953](https://github.com/modebrecht/cv-cover-charm/actions/runs/41321091953),
job `124891280660`, implementation `1135164b5c5fefbbc1150da49900193fe6af3874`:
**22/22 native conversions, 66 PDF pages and 73/73 Python controls pass**.
Execution PASS verifies the complete experiment and pinned controls. Product
parity remains FAIL for every full-production variant below.

| Main-cell after values zeroed | Attribute edits | Left complete entries | Right complete entries | Pages per copy | Content / overall |
|---|---:|---:|---:|---:|---|
| None: original | 0 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| After 06: known counterprobe | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| After 05: first observed boundary | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| After 14: before incomplete 15 | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| After 15: after incomplete entry | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| All small gaps 02–17 | 16 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| School-to-experience gap, 72 twips | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| Pre-reference gap, 72 twips | 1 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| Both 72-twip section gaps | 2 | 14/18 | 14/18 | 3 | FAIL / FAIL |
| All small and section gaps | 18 | 14/18 | 14/18 | 3 | FAIL / FAIL |

The closing set is **20 full-document FAIL, 0 full-document PASS, 0 BLOCKED**.
The two separate small controls retain their expected negative/positive
behavior and exact page pixels. Every full document still has an incomplete
description for entry 15; entries 16–18 and reference/contact are absent.
Page 3 has dossier chrome but no CV body. An unchanged three-page count or
absence of a detected split is not content acceptance.

All fourteen input-copy hashes and all **42 decoded page signatures** from
the initial matrix repeat in the closing run. The four full original/gap06
baselines also match all twelve P2-08 page signatures. The small controls match
their six persisted P2-06/07 signatures. Therefore neither source drift nor a
changed saved baseline accounts for the negative results.

The all-gaps copy has exactly sixteen 1 -> 0 and two 72 -> 0 after edits.
The section-gap selectors are anchored to the school/experience boundary and
the paragraph immediately after entry 18, not arbitrary XML offsets. All 19
critical table payloads and ordering and all non-document package parts remain
identical; the original downloads and prior source fixtures are untouched.

## Visible text, pictures and layout

The complete App reference still has entries 01–06 on page 1, 07–15 on page 2,
16–18 and reference on page 3. Every LO variant places entry 06 on page 2 and
loses the later tail. Zeroing the school gap moves the first title's top from
139.184 to 137.914 mm, for both sides, yet does not recover content. This
1.270 mm visible shift confirms an actual layout intervention, not a no-op.
The all-gaps copy also retains this shift and the same loss.

All left photo gates PASS. All right photo gates FAIL with the same 19.844 mm
x displacement. Pattern agreement is 1.0 throughout; width/height differences
remain 1.059/1.323 mm under the unchanged 2 mm gate. No calibration photo is
repeated on continuation pages. Main-text geometry/page spans still fail the
stored App comparison, independently of picture placement.

The four section-intervention page sheets for each side were directly inspected,
alongside three-column App/original/all-gaps comparisons. The unchanged gap06
and other first-matrix page signatures repeat exactly. Representative durable
comparisons: [left](p2-09-left-all-gaps.jpg), [right](p2-09-right-all-gaps.jpg).
The App-PDFs used in these figures are the retained P2-08 downloads, verified
against their source sidecar hashes before rendering: left
`d1d2fbe74e513166a82da6171e5a9fab292c0ca6ec84138ea8b0d0d710bf95cc`,
right `75a5e2073d243bee8dc406905cf4721e9a3276d625d67dd1343d859949d16cef`.
They are historical source-matched references, not new browser exports.

[Verbatim closing results](p2-09-closing-results.json) bind every copy, exact
attribute edit, page/text span, photo/grid, title geometry and resource record.
The complete source files remain in the
[P2-08 fixture set](../../tests/fixtures/lo-import-p2-08/README.md); each new
copy is reproducible from that source and its declared selector list. No
additional large DOCX copies are committed for these negative interventions.

## Evidence, replay and resources

Closing artifact `13089796496`, **10,282,806 bytes**, ZIP SHA256
`513d1c5e0e84c5338c7733639d8181edbb74c2b309daa7e0f3578c7381d7b0e4`;
download hash verified. Verbatim closing RESULTS.json SHA256
`6e1bb797be6896bd3e631eea86d11e8406fcfde016425605abca49148e50e6f4`.
Both artifacts retain DOCX copies, converted PDFs, page rasters and resource
logs for 14 days. Committed code, native JSON, figures and P2-08 source fixtures
remain durable.

[Audit-only replay](p2-09-audit-replay.json) verifies saved DOCX/PDF hashes and
exactly reproduces all twenty closing cases, both small controls and all
fourteen first-matrix repeats, preserving native timings/RSS. It performs
**zero new native conversions** and is not another engine run.

For a fresh native replay on a LO/Python Linux host:

```bash
python scripts/dossier_lo_boundaries_test.py
python scripts/dossier_lo_boundaries.py --out-dir /tmp/p209-boundaries
```

For saved outputs, add `--audit-only`; use a complete retained closing artifact
directory. Its script revision and pinned initial/App-reference JSON must match
this implementation. In GitHub Actions use the existing `boundary_spacing`
input; all other jobs are skipped for this working branch.

Closing native job-log time: **473.31 seconds (7 min 53 s)**, UTC
15:24:52.529–15:32:45.834 on 1 November 2026 (16:24–16:32 Europe/Zurich).
LO child wall times total **391.801 s**, peak RSS **237.13 MiB** (242,824 KiB).
Across both P2-09 runs there are **36 actual conversions and 108 rendered PDF
pages**, including the fourteen repeated inputs; **22 distinct input files**,
not 36 distinct test documents. Initial and closing job times total 614.99 s.
The two runs are observational timings on their assigned runners, not a
controlled performance benchmark. Whole-runner/Python memory is unmeasured.

Ubuntu 24.04, LO `24.2.7.2 420(Build:2)`, fonts and pinned Python analysis only;
no Bun, Node, app/browser install or source rebuild. Each conversion has a
private profile and 90-second cap. The shared 10-minute job limit remains;
neither run times out. The closing suite adds one section-gap invariant test
to the initial 72 controls. No second workflow or job was created.

## Decision and P2-10 handoff

Do not promote any tested spacing intervention to the exporter or preprocess
the original parity baseline. The successful reduced P2-07 fixture and failing
full source are genuinely different contexts: even the collective eighteen-gap
zeroing does not transfer. This is a stronger negative counterprobe than the
earlier hardcoded-after-six failure.

These ten interventions are not an exhaustive search of every mixed subset,
nonzero spacing value or engine version. In particular, a failing all-zero
case does not prove monotonicity or that all possible spacing edits fail.
It does remove the practical basis for more blind gap-position guessing.
No instrumented importer root cause or Word fidelity is claimed.

**P2-10:** compare the full source with the still-reproducible reduced positive
case by isolating package/flow context: page-background drawing, photo anchor,
sidebar story and header/footer participation. Keep the 19 innermost main-story
tables canonically identical and retain an unchanged full negative plus small
positive control. Use a bounded native-only matrix, with explicit diagnostic
content/image removals and no normal-export changes. This examines the concrete
context difference rather than trying more arbitrary after values.

LibreOffice remains the existing converter; ONLYOFFICE's prior watermark
rejection is unchanged and no new vendor run is counted. This stage does not
rerun the 17/19-entry browser matrix, cover/letter, zoom/crop variants or the
39-template catalog. Product source, dependency manifests/lockfile and all
P2-04/06/07/08 input fixtures remain unchanged. No desktop/Word step, merge,
deployment or vendor message. Verified protected refs remain:

- dev: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- render: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- main: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`
