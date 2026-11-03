# JSON import: validate CV rubric layouts before replacement — 3 November 2026

## Reproduced problem and correction

This addresses another concrete part of [P1 issue #207](https://github.com/modebrecht/cv-cover-charm/issues/207).
The file boundary checked CV content and portable settings but did not validate
`cv.data.sectionLayouts`. A supplied free experience rubric with `page: 2`,
`x: "broken"` and `y: 44` was accepted as a project. The renderer then read the
broken x coordinate as `null`, changing its placement to the automatic choice.
Confirming that import could replace an intact draft with those broken layouts.

The file boundary now validates the layout map, each supplied rubric entry,
page 1/2, full/half width, flow/free placement, rows/Masonry packing, and finite
numeric coordinates/sizes. Malformed structures, unsupported known choices and
wrong coordinate types are rejected before import confirmation or storage work.
The existing invalid-dossier alert is used.

Missing/partial layouts and null automatic layouts/coordinates remain readable.
Unknown additive properties remain supported. Finite dimensions keep the
existing renderer clamping rules. The tolerant browser-storage normalizer is
unchanged; this is a file boundary correction, not a project-version migration.

## Regression protection

Two new unit groups cover 22 malformed variants, including JSON numeric overflow,
and valid partial/free/custom/Masonry/automatic layouts. The rejection test first
failed against baseline `a51f1ae5f2441eb0e662638658b002b5817d773f`; its valid-layout
group already passed. Both pass after the correction. The independently shown
baseline parser accepted `x: "broken"`, while the renderer returned `x: null`.

The existing frozen catalog of 67 project files remains accepted at its original
hashes. Only that existing compatibility check was used; no historical branch
inventory, fixture edits or converter investigation is part of this correction.

A new real-file-input browser case attempts six representative corrupt layouts.
It requires an alert instead of confirmation, identical complete localStorage,
no import journal and no IndexedDB backup database. The previous draft includes
an authored free position so accidental reset is observable.

The existing confirmed import/reload/editor-JSON-download/reimport test now also
carries a page-two free experience rubric at x 31.25 / y 44.75 mm, 78 x 42 mm,
and a half-width Masonry language rubric. Both original layouts and their actual
content must survive exactly, alongside the existing settings and three-image
preservation checks.

## Verification

Checked code: `6f91977df9d7d4fe43a0a075b5e5a37bcabf4c23` on dev.
Local full unit suite: **1,507 PASS / 0 FAIL**, 286 files, 27,503 assertions.
Fifteen focused project groups pass, including the 67 frozen-file hash/parse
checks. Application and QA TypeScript, changed-file lint/format and diff checks
pass. No workflow, dependency, lockfile or retained source fixture changed.

[Dedicated import CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41623286260/job/125874161971)
passes **28/28 browser cases** on the first attempt: zero skipped, flaky or
unexpected outcomes, 40.4 seconds. This same job passes all 1,507 units,
application/QA types, lint and all three production build phases.

Downloaded artifact `13224717186`, SHA-256
`b8a94f501fe1d9801332bc667634d4ff686f804d2b74d98ed39f4e7079d2ce94`.
The [machine-readable proof](cv-layout-import-validation-proof-2026-11-03.json)
records the report hash and all case outcomes. The real confirmed JSON roundtrip
retains both layouts and their content exactly, together with the original
images and existing project settings. Six invalid layouts trigger six alerts,
zero confirmation dialogs and zero storage/journal/backup changes.

[Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41623286331)
passes fast checks, all eleven browser groups and status publication. The
existing opt-in native-print benchmark remains skipped.
[Bounded Modern/Word visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41623286391)
passes both jobs. Contact Integrity and Pages also pass. All checked runs use
the code commit above.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.

This does not close every historical-format or Word acceptance requirement in
#207. Work is directly on dev; historical branches are retained and release
promotion remains separate.
