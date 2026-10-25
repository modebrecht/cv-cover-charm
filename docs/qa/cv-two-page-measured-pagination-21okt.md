# CV COVER CHARM — Two-page CV pagination, Modern + Brief (21 Oct 2026)

**Branch:** `fix/docx-next-shared-fidelity-18okt` (no merge or deploy)

## Reproduced issue

In new Word acceptance cases `02-Modern-Zwei-CV-Seiten` and `12-Brief-Zwei-CV-Seiten`, the **Alles auf 2 Seiten** action left `Praktika & Schnuppertage` at the top of page two. Page one stopped after `Schulbildung`, despite significant remaining space. The existing pure planner minimized differences between heuristic **text weights**, which do not reflect the real rendered heights of rows and headers.

## Shared correction

1. Reuse the existing offscreen unpaginated CV measurement sheet (`[data-cv-measure-page]`). Read each real row height before persisting the page-fit action; support both `h-*` and `layout-*` section identifiers and person/header rows. Empty or incomplete measurements use the original deterministic text-weight estimator.
2. For a two-page action, choose the section boundary closest to 55% of the measured content on the first page. Do not split a section, change section order, truncate text or insert filler. Both page-fit modes retain their existing allowed widths and saved typography semantics.
3. Respect explicitly **free-positioned** sections rather than overwriting their manually authored x/y/page/width data. Flow-page preferences created by prior actions are intentionally recomputed when the user explicitly presses the page-fit button again; no reliable old-version provenance exists for distinguishing other stored flow-page settings.
4. Synchronize the 12-case QA runner with the same measured-height plan, wait for the React paginator to settle after reload, and save a **fitted-project.json** containing the _actual_ stored post-action CV data/design, in addition to the unchanged source fixture.

## Targeted verification

- Case **02 / Modern**: 2 CV pages, page one contains **person, Familie, Schulbildung, Praktika**; page two contains **Sprachen, Hobbys, Stärken, Referenzen**. DOCX + app PDF regenerated; app restore/reload and download/state checks PASS.
- Case **12 / Brief**: same grouping; 2 CV pages; DOCX + app PDF regenerated; app restore/reload and download/state checks PASS. An early test encountered asynchronous pagination during capture; the QA runner now waits for the settled number of pages instead of accepting the interim DOM.
- Relevant unit tests including measured row IDs, missing/invalid height fallbacks, manual free-position protection, one-page behavior, and native DOCX row/content invariance: **22 PASS**.
- TypeScript and production build: **PASS**.
- Full suite on base `561babf` plus the pagination changes: **1,287 PASS, 6 FAIL** (all six in `docx-next-cover-photo-placeholder.test.ts`, the unrelated parallel native-avatar work). Those exact six were reproduced on the unchanged base with a clean git working tree: **14 PASS, 6 FAIL**, confirming they were not caused by pagination.
- Desktop Microsoft Word open, save/reopen, and real pagination: **UNVERIFIED**. Browser counts and package generation do not replace Word acceptance.

## Important visual limitation

These demos have relatively little content for two full A4 CV pages. The improvement moves the two Praktika entries onto the previously underfilled first page; both sheets necessarily retain large white areas. Padding pages with artificially oversized fonts or meaningless whitespace would not be a sound professional CV default. The one-page preset remains available for sparse material.

## Acceptance instructions

Open **only the freshly generated 02 and 12 DOCX** in desktop Microsoft Word. Confirm the Praktika section ends on CV page one, Sprachen begins on CV page two, all entries remain intact, no unexpected additional CV page appears, and save/reopen preserves the result. If necessary, export each to PDF for side-by-side comparison. Other color/pill/header preferences and JSON backward-compatibility are out of scope for this batch.
