# P2-03 — isolated LibreOffice experiments

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

## Validation pending closing repeat

10 mutation/baseline/layout controls and 9 semantic negative/control tests pass locally. The
retained P2-02 artifact ZIP was hash-verified before preparing twelve test copies.
Native conversion and final findings will be recorded after the Actions run.

## Research scope

The exact requested research commit's `word-practical-acceptance-31okt.md`
accepts one bound synthetic Word example and explicitly rejects the visible
Writer roundtrip. `writer-crop-engine-31okt.md` labels its C++ patches unbuilt,
rejects the crop bypass and does not provide a released engine fix. Those tests
concern picture ownership/crop/save behavior; they do not establish a fix for
these current production page anchors or long-story rendering. No research
picture variant, binary patch or existing Word acceptance is promoted here.
