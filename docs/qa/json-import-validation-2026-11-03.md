# Dossier JSON: reject damaged settings before replacement — 3 November 2026

## User-visible problem and change

This addresses a concrete part of [P1 issue #207](https://github.com/modebrecht/cv-cover-charm/issues/207).
A project with valid document content but a corrupt settings extension was
accepted as a valid file. For example, `chrome: []`, an invalid margin value,
a typography bucket stored as an array, or `cv.portableState.photoStyle: []`
could be silently omitted or normalized to defaults. Confirming full project
replacement could then replace the existing draft with those incomplete settings.

The file boundary now checks the supplied shared settings and portable CV
settings before any normalization, confirmation, import journal or browser
storage mutation. Wrong structures/types, non-finite numeric input, unsupported
known choices and future versions of versioned settings are rejected. The
existing invalid-file message is shown; the original draft remains intact.

The tolerant browser-storage readers are unchanged. Missing historical v1
extensions, partial supported settings, boolean legacy hyphenation, numeric
chrome/margin strings, the `executive` layout alias, legacy continuation spacing
and the old `icons` separator remain readable through their existing migrations.
Unknown additive fields are still tolerated; this is not a new project version.

## Implementation and regression protection

* `dossier-project-validation.ts`: validation of chrome, margins, typography,
  hyphenation and CV layout/photo extensions.
* `dossier-project.ts`: reject corrupt settings before normalized project
  construction. The safe import API therefore rejects before taking a backup
  or writing any draft data.
* Five focused new unit groups cover 30 corrupt settings variants and supported
  legacy/partial files. The existing typography file test now requires rejection
  instead of silently accepting discarded styles.
* Two browser tests cover the actual file input. The first requires an alert,
  zero confirmation dialogs, unchanged complete localStorage and no import
  journal/database for four representative damaged files. The second explicitly
  confirms a valid file, reloads, downloads Dossier JSON through the CV editor
  menu, and reimports that actual download. It compares shared chrome, margins,
  per-field styles, sidebar/mirroring, text alignment, spacing, photo crop/frame/
  placement, all three original image strings, and unrelated browser data.

The existing one-job `dossier-import-recovery.yml` now also runs on direct dev
pushes affecting the import paths. No new workflow or job was created. It uses
the already established bounded Ubuntu browser setup and the same Playwright
version as before. No application dependency or lockfile changed.

## Validation

The pre-fix reproduction on `0c97867f` accepted the four damaged settings shapes.
The new tests initially failed on that code, then passed with the validation.
Local full unit suite: **1,500 PASS / 0 FAIL** across 284 files. Focused project
checks: 13 groups PASS. TypeScript, changed-file ESLint/Prettier and diff checks
pass. Verified browser CI is recorded below.

The initial dedicated import CI on `a0e0e13` passed 27/27 browser cases and its
full build/type/unit checks. The broader Modern smoke then caught a compatibility
regression: a reviewed project represents automatic section spacing as `null`.
That value is now explicitly retained as the existing automatic/default choice.
The source fixture was not changed. A regression checks the actual reviewed
file, and a cheap parse/hash check covers all 67 already retained project
fixtures. All 67 remain accepted at their original hashes; this does not create
a new historical fixture inventory or repeat native rendering research.

This fix does not claim complete acceptance of every historical project format,
unsupported future settings, arbitrary PDF/Word profiles, or all of issue #207.
No converter research, old-branch cleanup or template-release gate changes are
part of this work. Only synthetic test data is used.


## Verified browser CI

Checked code: `141d05fd32b033313804921407c41ead3616ea3a`.
[Dedicated import workflow](https://github.com/modebrecht/cv-cover-charm/actions/runs/41573029128/job/125710099778):
**27/27 browser cases PASS on the first attempt**, zero skipped/flaky/unexpected
results, 57.7 seconds. The same job passes all 1,500 units, application and QA
TypeScript, lint and the complete production build.

The actual browser report was downloaded and checked: artifact `13202147915`,
SHA-256 `48e7ec1d680a2f747d6fac3d1dab45c2b1fa4ae4c1c2397c400784d28ac1897e`.
The [machine-readable proof](json-import-validation-proof-2026-11-03.json) retains
its report hash, all case titles/outcomes and the initial compatibility finding.
The browser assertions include exact original image data, not merely a visible
photo count or a success notification.

[Bounded Modern/Word visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41573029290)
also passes both jobs on this checked code, with fresh UI imports and exports.
The known original-CV/candidate distinction remains unchanged.


[Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41573029139)
passes on the same checked code: all eleven browser groups, fast checks and
status publication. Template Contact Integrity also passes. The existing opt-in
native-print benchmark stays skipped.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`. Historical branches are left in place
as requested. This is current product work on dev; no branch-cleanup operation
or converter investigation was performed. Dependencies, lockfile and all 67
retained fixture sources remain unchanged.
