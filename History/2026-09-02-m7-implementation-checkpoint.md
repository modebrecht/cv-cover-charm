# M7 — Dossier Consistency & State Integrity

Date: 2026-09-02

Status: **IMPLEMENTED / VALIDATION BLOCKED**

M7 is not marked DONE yet. The implementation and test contracts are present, but the final current-head regression execution is externally blocked because GitHub Actions is not assigning a runner (`runner_id: 0`, no job steps executed).

## Implementation state

- [x] deterministic dossier transfer between title page, CV and motivation letter
- [x] transfer preserves document-local content
- [x] main photo can propagate through the intended dossier transfer path
- [x] free/additional images remain document-local
- [x] shared dossier font propagation is deterministic
- [x] design/template family propagation is covered
- [x] switching the motivation-letter template preserves letter user data
- [x] autosave/reload state handling is implemented
- [x] resetting the motivation letter is explicitly covered against title-page/CV storage mutation
- [x] complete dossier save/load roundtrip restores title page, CV and motivation letter
- [x] CV layout/photo sidecars are embedded portably and restored on dossier import
- [x] older dossier project files without motivation letter or portable CV sidecars remain compatible and do not delete newer local state
- [x] older motivation-letter saves without M1–M3 header/footer fields receive safe compact defaults

## Relevant automated contracts

- `tests/e2e/dossier-transfer-regression.spec.ts`
- `tests/e2e/dossier-font-sync.spec.ts`
- `tests/e2e/dossier-state-roundtrip.spec.ts`
- `tests/e2e/dossier-state-isolation.spec.ts`
- `tests/unit/dossier-font-sync.test.ts`
- `tests/unit/dossier-portable-state.test.ts`
- `tests/unit/dossier.test.ts`
- `tests/unit/letter-backwards-compat.test.ts`

## CI hardening completed during M7

- regression now runs once per pushed head instead of duplicate push + PR executions;
- regression supports `workflow_dispatch` for exact-head revalidation without synthetic commits;
- the expensive 39-PDF gallery is manual for release candidates and automatic on `main`;
- pure `History/**` commits do not consume a regression run;
- the 39-PDF gallery remains available as a deliberate release-validation gate and is not removed.

## Current external blocker

The latest attempted GitHub Actions regression jobs terminate before any workflow step starts. GitHub reports:

- `runner_id: 0`
- empty `steps`
- failure within a few seconds

This is not evidence of a failing unit test, typecheck, lint rule, build or browser assertion because none of those commands execute.

Earlier M7 implementation heads already established green product-state evidence including the full dossier save → clear browser state → import → restore roundtrip. The newly added isolation and legacy-compatibility contracts still require one real runner execution on the current code state before the exit gate is closed.

## Exit gate

M7 becomes **DONE** only when a real regression run on the current implementation executes and passes:

- unit tests;
- formatting check;
- TypeScript typecheck;
- ESLint;
- production build;
- browser regression groups, especially `dossier-flow` including state roundtrip and state isolation.

Do not weaken or remove these checks to obtain a green status.

## Next milestone

M8 — Adversarial Content & Edge Cases remains **NOT STARTED** until the M7 validation blocker is cleared or an explicit product decision changes the sequencing rule.
