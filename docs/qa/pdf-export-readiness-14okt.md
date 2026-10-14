# PDF Export Readiness — 14 October 2026

## Scope and provenance
Repository: modebrecht/cv-cover-charm
Base: dev @ 04beb438c59edefc974a2aa7d43af3d754f5a051
Local isolated working branch: fix/pdf-export-readiness-14okt
No merge, no Native promotion, no Vercel deployment, no remote push.

## Baseline
Dossier Regression workflow 38592561124: FAILURE.
Post-Neon workflow 38603645721: COMPLETED / FAILURE (letter-m1-m5 and cv-pdf browser jobs failed; fast-checks passed).
The four failures were reproduced on the above base in an isolated Chromium environment.

## Root causes and corrections
A. Multi-page Edge Letter (tests/e2e/letter-final-qa.spec.ts): Genuine product defect.
The continuation contact header text ("Lea Sophie Müller-Winterberger") rendered about 2.4 physical CSS px above the top of subsequent A4 pages. The physical ink preflight correctly blocked export. Adjusted ONLY the continuation contact transform for Letter to add 3mm vertical inset, keeping user offset. All original clipping checks remain intact. Targeted browser test passes after correction.

B. Letter image placement (tests/e2e/letter-image-placement.spec.ts): Invalid expectation for unsafe test geometry.
The fixture's free and flow image manipulation leaves a rendered image overlapping real contact text ("lea@example.ch"). The physical preflight correctly returns a blocking pagination-unsafe issue. Changed the test to verify that this unsafe layout cannot be downloaded instead of waiting 90s for a download from a disabled action. Kept original image coordinates and all switch/drag/resize/autosave verification. No forced enable or suppressed warning.

C. Multi-page native Dossier (tests/e2e/dossier-native-print.spec.ts): Invalid multi-page fixture.
The long sidebar CV fixture's freely positioned applicant photo overlaps the "Lebenslauf" header on CV page 1. Native and automatic export must not proceed with that clipping. For the *multi pagination and page-order scenario only*, remove that fixture photo; separate gallery and native-photo scenarios retain image coverage. The multi-page native test passes and continues to inspect generated Chromium PDF page sizes, content/order and cleanup.

D. Delayed-image Native preparation (tests/e2e/dossier-native-print.spec.ts): Incorrect test sequencing.
The fixture withheld the image response but the common open() helper awaited a PDF button that correctly remained disabled under preflight issue image-pending. Added an optional no-wait parameter; asserted PDF and Native controls remain disabled while image is pending; then released image, waited for safe export readiness, and checked successful print, error and cleanup. No timing increase or bypass.

## Local validation
- Four original targeted scenarios: 4/4 PASS in Playwright, Chromium.
- TypeScript: PASS (tsc --noEmit).
- Unit suite: 1,121 PASS / 0 FAIL.
- Lint: exit 0, 21 existing warnings, 0 errors.
- Main/dev CI at baseline: FAILURE. No post-fix remote CI (branch not pushed).
- Browser PDF evidence exists for the Native multi scenario via test's actual generated PDF assertions. A standalone multi-page Letter PDF was not separately extracted in this bounded local run.

## Safety controls
Unmodified: src/lib/pdf-preflight.ts, src/components/letter/preflight.ts, src/lib/dossier-pdf.ts, src/lib/dossier-native-print.ts, and DossierExportDialog. Final PDF safety revalidation remains enforced, as do all blocked/pending checks, source-content requirements, and advisory rules. The invalid image overlap is now explicitly tested as blocked.

## Publication boundary and release judgment
Vercel deployment history confirms pushes to fix/ branches create preview deployments; the existing user instruction prohibits unwanted deployment. Thus local changes must NOT be pushed until preview branch protection/ignore policy is safely established without changing global settings. No remote branch or new CI was created.
**Status: PARTIAL** — 4/4 targeted browser checks and local static/unit checks pass; remote CI and the full affected suite remain unverified. Do not merge or promote Native.
