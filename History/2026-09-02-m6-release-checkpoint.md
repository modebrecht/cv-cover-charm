# M6 Release Checkpoint — 2026-09-02

Repository: `modebrecht/cv-cover-charm`  
Branch: `letter-m1-m2`

## Status

**M6 — Release-Candidate CI Truth: DONE**

Validated release-candidate SHA:

`a646f1ace6b9d6170b7510143052763410a3e1f8`

This file is a historical checkpoint. The validated SHA above is the immutable M6 proof point; later documentation or M7 commits do not replace it.

## Exit-gate proof

The exact same SHA completed two full release verification attempts without code changes between attempts.

### Static gates — 2× green

- [x] unit regressions
- [x] non-mutating release formatting check
- [x] TypeScript typecheck
- [x] ESLint
- [x] production build

### Browser regression matrix — 2× green

- [x] dossier-flow
- [x] letter-m1-m5
- [x] cv-pdf
- [x] templates-layout
- [x] fresh-dossier-templates
- [x] final `M6 Release Candidate` status published successfully

### Complete PDF gallery — 2× green

- [x] gallery fast checks
- [x] typography regression
- [x] complete example dossier E2E
- [x] 10/10 complete-PDF batches
- [x] 39/39 PDFs aggregated
- [x] 39/39 outputs verified unique
- [x] final gallery ZIP uploaded

### Deployment status

- [x] Vercel status green for validated SHA
- [x] `M6 Release Candidate` commit status green

## M6 hardening completed

During M6, CI exposed test-infrastructure problems that had previously hidden the true state of the release candidate. They were fixed without weakening product assertions:

- regression workflow made part of the release-candidate truth surface;
- release formatting changed to a non-mutating check;
- explicit TypeScript typecheck added;
- semantic lint and release formatting separated;
- visual/template browser work split so one oversized job no longer hits the 30-minute ceiling;
- fresh-template tests changed from stale global side-channel waits to actual rendered document/template selectors;
- gradient edge smoke made deterministic using rendered cover/CV selectors;
- Blockig cleanup regression updated from obsolete pseudo-element inspection to the current shared `DossierSheetBackground` geometry;
- gallery trigger paths aligned with visual-regression changes;
- local release verification script added.

## M6 conclusion

M6 is complete. The release-candidate code at `a646f1ace6b9d6170b7510143052763410a3e1f8` is reproducibly green across static validation, browser regression, complete dossier rendering, PDF generation and deployment status.

No unresolved flaky gate remains in the M6 verification surface.

## Next active milestone

**M7 — Dossier Consistency & State Integrity**

First hard gate:

Create and verify a complete three-document roundtrip:

1. title page;
2. CV;
3. motivation letter;
4. customize document-specific state;
5. reload;
6. save complete dossier project;
7. clear/reload state;
8. import/load project;
9. verify all three documents and shared design state;
10. verify legacy `cover + cv` projects remain compatible and do not erase unrelated current state.
