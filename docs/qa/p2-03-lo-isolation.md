# P2-03 — isolated LibreOffice experiments

Completed: two native cloud runs reproduce **4 PASS / 4 FAIL** for the original
eight production exports. Controlled copies explain the margin response and
first-cell dependency, but **all 12 candidates FAIL** the final combined gates.
No product correction is accepted.

Branch: `work/01nov-p2-03-lo-isolation`, base
`d15eaf0ee8476d955f5d124920414a3bdeae92aa`.

No product/exporter changes. The existing visual parity workflow generates the
same eight synthetic production downloads. Its P2-03 mode first runs the unchanged
semantic auditor, then converts twelve diagnostic copies. Baseline failures are
expected controls and must remain visible in the report. A green experiment job
means completed measurements with those original defects reproduced; it does not
mean the eight production documents pass or approve any change for Word.

## Controlled variables

- Right short CV: section left margin 0 / half, layoutInCell=1, horizontal
  reference page -> column. Each is one attribute edit. Margin probes deliberately
  change page layout and cannot be used as product fixes.
- Long left/right CV: detach both first cell paragraphs / main only / sidebar
  only by keepNext=0; independently disable nested cantSplit flags.
- Every probe retains semantic text, all media and every package part except
  word/document.xml. A structural comparator rejects text or node changes and
  records each changed attribute with its XML path and previous/new values.
- The detach-both operation isolates the two-value XML effect of the research
  branch's bodyBoundaryKeepNext=false, read directly from
  `c685bf4308235ac5fcc38957d45d9c9bf508eb21`. Its experimental direct-picture,
  rich-text and tile variants are separate research and are not imported.

Conversion is bounded to 90 seconds per copy with isolated LO profiles.
The original App PDF remains the measurement reference, with the P2-02 photo
thresholds unchanged. The report retains original production failures alongside
copy measurements and conversion time/RSS. No Windows or manual Word step.

## First native CI and visual review

Implementation `137c72dd1324ca7215f9f1dc25ef165089bd721d`,
[run 41284447354](https://github.com/modebrecht/cv-cover-charm/actions/runs/41284447354):
9 browser cases, gallery pilot, 9 semantic controls, 5 initial mutation controls,
8 original conversions and all 12 probe conversions completed. Baseline exactly
reproduces 4 PASS / 4 FAIL. The green job denotes successful experiments only.

The original artifact is `13074850923`, ZIP SHA256
`ef5b0af5556acc927c465756e1696762205a2693586d55a9e381b23f3b5f3a83`.
Its old copy PASS labels used the initial, limited content/photo gates. After
looking at every kind of page-flow candidate, the final auditor is stricter:

- It records critical marker pages and complete synthetic entry spans, not just
  marker existence. Matching a station title's page can conceal a split body.
- It measures the body name's text baseline origin independently of the photo;
  using glyph boxes instead would conflate different font ascent metrics.
- Maximum body-heading origin drift is 2 mm, an explicit diagnostic threshold.
  It is not a universal typography tolerance or a Word acceptance claim.
- Reauditing the exact same retained PDFs rejects **all 12 copies** under these
  additional gates. Nothing was reconverted or made greener by a new baseline.

### Findings

Section margin 1134 -> 567 -> 0 twips changes the right photo drift from
19.844 -> 9.793 -> 0.258 mm. Predicted vs measured margin response differs by
at most 0.100 mm. `layoutInCell=1` and page -> column leave the original 19.844 mm
photo drift unchanged. The zero-margin copy moves the body heading left by
19.954 mm, so it is not a correct export fix even though the photo now aligns.
This isolates section-margin response in this LO import path, not its C++ root cause.

For both long CVs, detaching **physical cell 0** restores all four missing tail
markers; detaching only physical cell 2 does not. That is sidebar-only for the
left CV and main-only for the mirrored CV. Thus semantic main/sidebar role is
not the controlling distinction in these copies. The research's detach-both
variant includes the effective cell. Conversion drops from roughly 17/24 s to
about 2 s, but entries 06 and 15 move to other pages than in the App PDF.

Disabling all 22 nested cantSplit flags also restores the tail and keeps marker
titles on the same pages. Visual review reveals a different defect: entry 06's
description splits across pages 1/2. The new entry-span gate detects it. Neither
workaround is a faithful general replacement for the original table flow.

## Verified closing repeat

Implementation `60fd5c9e68b1dad9817ee1bf9b5ad94e1b3dc339`,
[run 41285285817](https://github.com/modebrecht/cv-cover-charm/actions/runs/41285285817):

- 10/10 mutation/baseline/layout controls and 9/9 semantic negative controls pass.
- 9/9 real browser cases pass (52.1 s); gallery pilot passes (14.0 s).
- All 8 original and 12 copy conversions complete. The original result remains
  4 PASS / 4 FAIL; all 12 copies FAIL the combined candidate gates as expected.
- Both explicit experiment hypotheses pass; margin dose errors are 0.100/0.050 mm.
- 16/16 source hashes and all source/implementation SHAs verified after download.
- Every case measurement, missing-marker set, entry span, heading origin and
  photo signature repeats. **81/81 decoded PNGs are pixel-identical** between runs.
- Native artifact `13075155870`, ZIP SHA256
  `eaedf97b2d2b6e390a432f925da5a2ee083620fee88295a9db4028a02e7a4807`.

The first ZIP was also verified before its final auditor replay. That replay
retains the original converter measurements; it does not claim a new conversion.
The closing native run executes the stricter auditor directly from its tested SHA.
Local TypeScript, YAML/embedded-shell and whitespace checks pass; 4/4 existing
converter-contract controls pass. No extra product tests are inferred from those.

| Original production case | LO result | Observed failure |
|---|---|---|
| cover | PASS | none in existing gates |
| letter | PASS | none in existing gates |
| cv-left | PASS | none in existing gates |
| cv-crop-left | PASS | none in existing gates |
| cv-right | FAIL | photo +19.844 mm horizontally |
| cv-crop-right | FAIL | photo +19.844 mm horizontally |
| cv-long-left | FAIL | 3 station markers + final reference absent |
| cv-long-right | FAIL | missing tail plus photo shift |

PASS in this table describes the unchanged P2-02 gates, not universal Word or
pixel fidelity. Source XML and App PDFs contain the missing long-CV tail.

Durable evidence: [full machine results](p2-03-lo-isolation-results.json),
[zero-margin copy: corrected photo / displaced body](p2-03-margin-photo-body.jpg),
[row-split copy: recovered tail / split entry](p2-03-long-split-entry.jpg).
Comparison images show App on the left, the diagnostic LO copy on the right.
The runner regenerates these synthetic inputs through the real browser menus;
its opt-in is `lo_isolation` in the existing visual parity workflow. Audit-only
replay uses the retained source and isolation directories with
`scripts/dossier_lo_isolation.py --source-dir SOURCE --out-dir ISOLATION --audit-only`.

## Research scope

The exact requested research commit's `word-practical-acceptance-31okt.md`
accepts one bound synthetic Word example and explicitly rejects the visible
Writer roundtrip. `writer-crop-engine-31okt.md` labels its C++ patches unbuilt,
rejects the crop bypass and does not provide a released engine fix. Those tests
concern picture ownership/crop/save behavior; they do not establish a fix for
these current production page anchors or long-story rendering. No research
picture variant, binary patch or existing Word acceptance is promoted here.

## Decision and next boundary

Keep LibreOffice as the existing, bounded comparator, with its observed defects
visible. Do not apply margin compensation, detach-all or cantSplit suppression
to normal exports or silently to the CI baseline. None of these copies passes
all measured content/photo/body-position/page-flow requirements.

The initial converter decision is unchanged: ONLYOFFICE 10 executed the three
P2-01 documents repeatably, but all three visible PDFs failed because of the
unregistered-version watermark. It remains an opt-in experiment, not a clean
reference or a reason to replace LO. See [P2-01](p2-01-onlyoffice.md).

P2-04 should use these bound cloud regressions to reduce the page-anchor and
first-cell/nested-row interactions before proposing an importer or renderer
change. The minimum acceptance needs full tail text, unsplit entries on the App
pages, body origins and correct photo position/crop together. A package-only
pass, page-count-only pass or one corrected photograph is insufficient.
This handoff introduces no Windows/Word step and does not rebuild a custom engine.

The 39-template catalog check remains availability only: one Modern profile is
eligible and 38 templates are blocked in that snapshot. No x39 visual acceptance
or full browser/gallery source-matrix run is claimed here.

## CI resource scope

Each measured P2-03 run performs 20 LO conversions / 40 converted pages, plus
the eight real App/DOCX downloads and gallery pilot. No additional workflow,
ONLYOFFICE installation, service or paid endpoint. Cold workflow durations: **6 min 04 s / 4 min 21 s**;
peak measured LO child RSS **238.56 / 238.65 MiB** (LibreOffice 24.2 PDFs). This is not a whole-runner memory figure.
Across these runs, short copies take 1.15–1.51 s; pathological long originals/
countercontrols roughly 8–24 s; effective detach copies 1.4–2.0 s, row-split
copies 3.0–5.7 s.
Each conversion has a 90 s timeout and isolated profile; the existing job is
bounded to 20 minutes. These two runs are observations, not a capacity guarantee.

## Protected scope

No `src`, normal product export, dependency manifest or lockfile changes in P2-03.
The work branch is separate. Closing protected refs match the task's originals:

- `dev`: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- `render`: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- `main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`
