# Automatic CV fitting: retain a verified single page — 3 November 2026

## User-visible correction

Following the review of the explicit one/two-page buttons, the automatic action
was checked for the same preservation rule. Its conservative ten-percent
planning reserve could select two pages even when the current CV was already a
clean, fully rendered single page. Its short-CV path also rewrote layout values
unnecessarily on an already-fitting page.

The automatic action now first checks the paginator's complete demand together
with the shared one-page rendered-overflow guard. If the current CV fits on one
page at its own settings, the action is consumed without writing CV state. This
also retains the least-compact arrangement previously found by the explicit
one-page action. No font change is needed to retain an already-valid result.

Automatic measurements now wait for loaded fonts and two completed animation
frames, as the explicit buttons do. Cleanup and request-revision checks discard
obsolete scheduled work after a newer click or source/design edit.

The existing ten-percent reserve remains in the planning path for a different
layout. Long or incomplete content still uses the measured two-page trial,
including its final rendered guard and the protected free-positioned content.
No converter, Word-profile, font-default, dependency, workflow or lockfile
changes are part of this correction.

## Regression evidence

Three new browser cases cover Classic desktop, mirrored Sidebar at mobile
width, and the sequence explicit one-page action followed by automatic fitting.
The first two require an already-clean page using more than 90% of its measured
capacity. Complete persisted data/design must remain exactly equal after two
automatic clicks and after reload. Both visible/canonical DOMs must remain one
page with no geometry issues, and actual editor-downloaded PDFs must retain all
experience titles and the reference name. The third case also requires the
minimal pair of compact rubrics to remain unchanged.

This correction does not make the conservative planning estimator an exhaustive
layout solver. The current verified result takes precedence over that estimate;
other planning policies are retained.

## Verification

Checked code: `672f6751d5066a2eef0bd79d605c745e08ecb216` on dev.
Local full suite: **1,505 PASS / 0 FAIL**, 285 files, 27,474 assertions.
Application/QA TypeScript, changed-file format and diff checks pass. Changed-file
ESLint has zero errors and five existing warnings in CvCanvas.

[Page-fit browser CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41603715205/job/125808304462)
passes **49/49 cases**: 25 automatic, 13 explicit one-page/button-switch and 11
two-page. All pass on their first attempt, with zero skipped, flaky or
unexpected results. Downloaded artifact `13215763177`, SHA-256
`9598480d4322714cf35105a2b1c54a9ba87c9fb158d840830ae439f455de9066`.

The retained Classic page uses **99.62%** of measured capacity; the mirrored
mobile Sidebar case uses **97.94%**. Both remain one page with exact data/design
preservation. The minimal pair also survives the subsequent automatic action.
All three actual editor-downloaded PDFs contain every experience title and the
reference name. Their pages were rendered and visually inspected: no clipping,
overlap or missing content. The [machine-readable proof](automatic-fit-preserves-valid-page-proof-2026-11-03.json)
retains case outcomes, demand values and report/state/PDF hashes.

[Bounded Modern/Word visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41603715162)
passes both jobs. Contact Integrity and Pages also pass. [Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41603715163)
passes fast checks, all eleven browser groups and status publication. The full
production build and all 1,505 units pass in CI. The existing opt-in native-print
benchmark remains skipped. Every checked run uses the code commit above.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.

Work is directly on dev. Historical branches are retained, and no release
promotion or published-history rewrite is part of this work.
