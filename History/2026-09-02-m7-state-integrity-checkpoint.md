# M7 — Dossier Consistency & State Integrity

Date: 2026-09-02

Status: **IMPLEMENTED / FINAL CI RERUN BLOCKED BY GITHUB RUNNER AVAILABILITY**

M7 is not marked DONE yet. The functional implementation is in place and the core full-dossier roundtrip is browser-proven, but the final isolation suite has not received a GitHub-hosted runner on the latest head.

## Implemented

- [x] Portable CV sidecar state is embedded in newly saved dossier projects when real sidecar state exists.
- [x] Portable CV sidecars are restored through the existing CV state/storage layer on dossier import.
- [x] Legacy dossier/CV projects without `portableState` remain compatible and do not overwrite current sidecars.
- [x] Portable snapshot reads persisted browser storage directly rather than stale module caches.
- [x] Empty/default-only sidecar state is not added to legacy-style dossier saves.
- [x] Full browser roundtrip covers title page + motivation letter + CV.
- [x] Roundtrip covers save → clear all browser storage → reload → import → restore.
- [x] Roundtrip restores representative CV layout, mirror, placement, photo crop and free-photo placement sidecars.
- [x] Roundtrip waits for real autosave completion rather than using arbitrary sleeps.
- [x] Existing transfer regressions continue to cover targeted transfer, source priority, photo sync, local extra elements, design and font propagation.
- [x] Isolation E2E now defines that resetting the motivation letter must not mutate title-page or CV storage.
- [x] Isolation E2E now defines that changing a motivation-letter template may change design but must preserve user data exactly.
- [x] Isolation E2E is part of the `dossier-flow` regression group.
- [x] Regression and 39-PDF gallery concurrency now deduplicate push/PR validation for the same head SHA.

## Proven green functional checkpoint

Exact SHA:

`3dde9b06ace980b315c47c2990d1e440a22b84fa`

Regression run:

`33650049739`

Passed on that exact SHA:

- [x] 60 unit tests
- [x] non-mutating format check
- [x] TypeScript typecheck
- [x] ESLint
- [x] production build
- [x] `dossier-flow`
- [x] `letter-m1-m5`
- [x] `cv-pdf`
- [x] `templates-layout`
- [x] `fresh-dossier-templates`

Most importantly, `dossier-flow` passed the new full save → clear browser state → import roundtrip on this SHA.

No product/runtime code changed after this functional checkpoint. Later commits add only M7 isolation tests and CI workflow hardening.

## Later M7 test / CI commits

- `ca88854cb520c6185edead346e0ee26e3d6dd8e4` — add reset/template isolation E2E.
- `e913d712078af66969fac5e54e3c41ea6844d523` — gate isolation E2E inside `dossier-flow`.
- `2e8d9c4e68cec381bd5509cab0ac6ba858494a50` — dedupe regression push/PR runs by head SHA.
- `01b8a37f64b4adea85ebc39c662f114cf766b242` — dedupe 39-PDF gallery push/PR runs by head SHA.

## Current exact head before this History commit

`01b8a37f64b4adea85ebc39c662f114cf766b242`

Vercel deployment status on that SHA: success.

GitHub Actions behavior on the latest head:

- Push and PR duplicate runs now correctly share a head-SHA concurrency group; the duplicate push runs are cancelled instead of consuming a second full validation run.
- The surviving Regression and PDF Gallery jobs fail before executing any step.
- GitHub reports `runner_id: 0` and an empty `steps` list for these jobs.
- Therefore no unit, lint, build or browser assertion is failing in those latest jobs; the jobs never start on a runner.

GitHub public status reported Actions operational with no incident on 2026-09-02, so this remains an external/account/repository runner-availability or Actions-quota issue until a hosted runner can execute the jobs again.

## M7 exit gate still open

- [ ] Run the final `dossier-flow` on one exact current SHA with `dossier-state-roundtrip.spec.ts` and `dossier-state-isolation.spec.ts` both green.
- [ ] Run the complete Regression workflow green on that exact SHA.
- [ ] Run/confirm the release PDF gallery gate as required by the release-candidate process.
- [ ] Only then mark M7 DONE and activate M8.

## Working rule

Do not weaken or remove the M7 tests to obtain green CI. When GitHub-hosted runner execution is available again, rerun the current validation gates and fix only genuine test/product failures.
