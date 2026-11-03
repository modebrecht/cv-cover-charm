# Two-page CV fitting: continue oversized rubrics — 3 November 2026

## User-visible problem and correction

This addresses one reproducible part of [issue #205](https://github.com/modebrecht/cv-cover-charm/issues/205).
A rubric taller than a continuation page was treated as an indivisible block.
The measured planner put it on page two, leaving room unused on page one and
requiring a third page. The rendered-trial guard then rejected the requested
fit, even when the entries could fit across the first two pages.

The planner now accounts for natural continuation in the main column and
Sidebar when an individual rubric exceeds the continuation-page capacity.
The existing row paginator can start that rubric on page one and continue its
entries onto page two. It can also accept the all-first-page assignment when
that oversized content naturally produces the requested second page. Ordinary
rubric balancing keeps the existing cost calculation.

The rendered-trial guard still decides whether the proposal can be saved. No
font scaling, free-position coordinates, renderer, PDF implementation or native
Word guard was changed. Content that cannot fit still leaves the original
state intact. This is a targeted correction, not complete closure of #205 or
a guarantee that every possible two-page arrangement will be found.

## Regression evidence

Two new unit regressions fail against the previous planner. The main-column
case invokes the actual pure row paginator: the old page-two assignment makes
three pages, while the corrected page-one assignment makes two with every row
present in source order and no source mutation. The second case checks the
same oversized-rubric decision in the Sidebar.

Two new browser cases exercise Classic and Modern with ten synthetic experience
entries, distinct end markers and nondefault body/heading/title scales. Each
starts with the rubric explicitly on page two. They require three source pages,
then two pages after the menu action, exact content/design preservation,
identical saved state after a repeat action and reload, no geometry issues in
both live and canonical export DOM, and all twenty markers in the actual
editor-downloaded two-page PDF.

The existing browser suite also checks ordinary balancing, prior Masonry,
long Sidebar/photo placement, authored continuation spacing, impossible input,
free-positioned page-two content, and the native DOCX explicit-page guard.
The existing one-job page-fit workflow runs these cases plus the automatic and
one-page fitting regressions. No workflow, dependency, lockfile or retained project
fixture source was added or changed for this correction.

## Verification

Checked code: `f5771fcd27135e8ec09b7318979cacddcbe7f420`.
Local full unit suite: **1,502 PASS / 0 FAIL**, 284 files, 27,454 assertions.
Application and QA TypeScript, changed-file ESLint/Prettier and diff checks pass.

The first browser run found that the new synthetic fixture exceeded two-page
capacity: Classic measured 1,902.98 px plus 150.78 px personal data, and Modern
measured 2,459.52 px plus 91.53 px personal data. The rendered guard correctly
rejected the Classic proposal; Modern already rendered four source pages.
All nine existing two-page cases passed. Only the new fixture length was
reduced, from seven to four repetitions per entry, to exercise a genuinely
feasible two-page continuation. No source-code or acceptance guard changed.

[Measured page-fit CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41586317402/job/125752531834)
passes **43/43 browser cases**: 11 two-page, 22 automatic and 10 one-page.
All pass on the first attempt; zero skipped, flaky or unexpected results.
The downloaded artifact is `13208157487`, SHA-256
`77b34158329274f925f09ba96ab63372fd4e49bfdc08d0904808e7b76426357a`.

The calibrated Classic rubric measures 1,355.95 px; Modern measures 1,730.14 px.
Both render three source pages and two fitted pages. Each actual editor PDF
contains all twenty title/end markers and exactly two pages. All four PDF pages
were rendered and visually inspected: no clipping, overlapping text, missing
entries or orphan heading. The [machine-readable proof](cv-two-page-continuation-proof-2026-11-03.json)
records report/PDF hashes, case outcomes and source/design-preservation checks.

[Bounded Modern/Word visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41586317415)
passes both jobs on the same checked commit. Contact Integrity passes on the
implementation commit, and the subsequent fixture-only commit changes no
application code. [Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41586317403)
passes on the same checked commit: fast checks, all eleven browser groups and
status publication. Its full production build and all 1,502 units pass. The
existing opt-in native-print benchmark remains skipped. Pages also passes.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`. Historical branches are left in place
as requested. Work is committed directly to dev without rewriting history.
