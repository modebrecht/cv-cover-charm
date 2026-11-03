# Review of both CV page-fit buttons — 3 November 2026

## Requested behavior and findings

Both menu buttons were reviewed from the accessible button through request
consumption, live measurements, persistence, reload and actual PDF downloads.

The one-page action already measured the current typography/layout before
reducing text. Its remaining coarse step was compacting every eligible short
rubric together. A small overflow could therefore change more rubrics than
necessary. The new search tries individual adjacent pairs first, then complete
safe groups. Candidates are ordered by the number of changed rubrics and are
measured independently. Existing authored widths/packing stay intact until a
measured overflow requires a change. At most sixteen compact trials are used.

The action now also requires the rendered result to contain one page without
main/Sidebar overflow, in addition to the paginator's measured demand. An
already-fitting CV stays unchanged. Flowing page-two assignments can be brought
back to page one without changing fonts when they fit at the original settings.
Free-positioned content on page two remains protected.

If no compact candidate fits, only the most space-efficient measured candidate
(or the original layout when compacting saved no space) enters the existing
one-percent font search. Relative limits remain 18% body, 14% headings and 10%
name, with the existing minimum scale. Failed attempts remain local and are
discarded; repeated unsuccessful clicks cannot accumulate shrinking.

The two-page action still measures full-width flowing rubrics, independently
balances main and Sidebar with their actual first/continuation capacities,
preserves typography and free coordinates, and verifies the rendered proposal
before saving. Its earlier oversized-rubric continuation correction remains
covered. The common rendered-page guard has identical two-page behavior.

These are bounded, measured layout candidates, not an exhaustive search of
every possible arrangement. Existing authored spacing, images, source content
and native Word export guards are retained.

## Regression checks

Three focused unit cases protect the least-change candidate ordering, source
immutability, untouched chronology/references, free-position boundaries and
already-compact layouts.

Three new browser cases cover:

- Classic and Modern: click the actual named one/two buttons, switch from one
  page to two and back repeatedly, compare complete design/content, require
  ordinary full-width rows again when the original content fits, reload and
  compare exact saved state. Both actual PDF downloads must have the requested
  page counts and semantic markers. Live/canonical geometry must be clean.
- Classic boundary: locate the first real overflow using original body scales
  between 0.80 and 1.00. Fitting must change exactly two of the three short
  rubrics, retain the font scales, preserve all source content, and survive
  repeat/reload. The actual one-page PDF must contain all six experience titles.

Existing cases retain checks for already-fitting custom typography, authored
half widths, necessary packing, small font reductions, mirrored mobile Sidebar,
impossible input, free placement, imported native DOCX and both-page balancing.
No workflow, dependency, lockfile or retained project fixture was changed.

## Verification

Checked code: `59bb457e6bd175a8d8405049232076190a45549e` on dev.
Local full unit suite: **1,505 PASS / 0 FAIL**, 285 files, 27,474 assertions.
Application and QA TypeScript, changed-file lint/format and diff checks pass.

[Measured page-fit CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41592578147/job/125772453188)
passes **46/46 cases**: 13 one-page/button-switch cases, 11 two-page and 22
automatic. Zero skipped, flaky or unexpected results; all first attempt.
Artifact `13211420964`, SHA-256
`158d14200baa4ab2e7e47edafa6668f366f8117eea82e9375a9f94c5d2960270`.

The first-overflow Classic example is one page at body scale 0.92 and two pages
at 0.93. The action retains **0.93**, puts only languages and hobbies beside
each other, and leaves strengths full width. The PDF retains all six entries.
Both short Classic/Modern examples export two pages after the two-page action
and one page after the one-page action. All seven pages from these five actual
PDF downloads were rendered and visually checked, with no clipping or overlap.
The [machine-readable proof](page-fit-buttons-review-proof-2026-11-03.json)
records case outcomes, artifact/PDF hashes and the original/fitted state checks.

[Bounded Modern/Word visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41592578236)
passes both jobs. Template Contact Integrity and Pages pass on the same commit.
[Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41592578209)
passes fast checks, all eleven browser groups and status publication. The
production build and all 1,505 units pass in CI. Its existing opt-in native-print
benchmark remains skipped. All checked runs use the code commit above.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.

Work is directly on dev. Historical branches are left in place; no release
promotion or history rewrite is part of this review.
