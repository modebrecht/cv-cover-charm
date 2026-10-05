# Mono Luxe / Ledger / Ribbon batch — 2026-10-05

The batch started from freshly fetched, clean remote `dev` at `0c803de088f86afdc6fc12185acae4273956a51f`, with M6 Release Candidate SUCCESS. Three coherent local feature commits implement Mono Luxe, Ledger and Ribbon. Per user instruction they are published together; CI is checked once at the final batch head. The final tested source is the commit containing this report. Verify that published head's GitHub checks; the session's closing report records their actual result.

**11/39 configured isolated candidates; 0/39 Microsoft Word accepted migrations. Microsoft Word acceptance: pending.** Frame is not an active template in the 39-template registry, so this batch uses Ledger and Ribbon after Mono Luxe.

| Candidate | Stable LibreOffice 25.8.7.3 render/save-reopen | Evidence                                 |
| --------- | ---------------------------------------------- | ---------------------------------------- |
| Mono Luxe | 13 fixtures / 105 pages passed                 | [Ledger](mono-luxe-stress-evidence.json) |
| Ledger    | 13 fixtures / 95 pages passed                  | [Ledger](ledger-stress-evidence.json)    |
| Ribbon    | 13 fixtures / 94 pages passed                  | [Ledger](ribbon-stress-evidence.json)    |

All 39 cases/294 pages pass package/XML/relationship, native semantic text/media, page bounds, long-flow, paint ownership and LibreOffice save/reopen checks. Actual browser designs and representative covers, photos, letters, custom rich content, long CV and continuation/off-header pages were visually inspected. References remain candidates; none establishes Microsoft Word acceptance.

- 877 isolated unit tests passed, 0 failed (185 files); 175 targeted Next tests passed, 0 failed (23 files). TypeScript, production build and release/changed-file formatting pass. Lint: 0 errors, 21 existing warnings.
- All 176 pre-batch candidate packages regenerate byte-identically. After the final shared color-default change, all 202 previous packages including Mono Luxe and Ledger remain byte-identical to committed SHA256 ledgers.
- Nine previous normal candidates/36 pages pass the updated paper/paint ownership guard through stable render/save-reopen. A deliberately wrong paper color under a known decorative rail fails the negative control. Paper samples use exposed paper beside declared geometry; strict per-layer image counts remain unchanged.
- Each candidate passes actual editor rename/reload, portable JSON save/load, explicit snapshot and independent Next export, plus the existing combined production PDF download. Each candidate PDF has three visibly nonempty pages and searchable edited CV text. The full existing semantic selection/repeated-value/custom/header/footer editor, JSON and production PDF smoke also passes.

Prism remains clean and declarative. Warm is the existing remote candidate, unchanged; no stale local code was restored. The source adapter selects neutral authored app data without PDF/browser pagination geometry. There is one Word renderer entry point, unchanged in this batch. No template-specific renderer, generic template-ID branch, visible-text/occurrence styling or XML repair was found or introduced.

New shared primitives are motif-only running chrome with native contact ink on paper and declarative semantic cover-field palette defaults. Ledger and Ribbon reuse native cover columns/gutters, growing filled cells, per-part scoped motifs, independent corners, native pictures/date rows and first/continuation chrome. See each coverage document for explicit Word flow differences. The real visibility review caught Ribbon's white contact defaults on paper; field palette defaults resolve the issue before rendering while preserving user overrides.

Only `dev` changes. `main`/`render`, Legacy/V2 and production DOCX selection remain unchanged; no manual deployment, merge or branch promotion occurs. Existing PDF and portable JSON remain functional.

Remaining blockers: actual Microsoft Word acceptance and approved visual references, outstanding settings coverage, first-class Modern/sidebar composition (explicitly unsupported), production comparison/switchover and eventual legacy removal. Recommended next bounded batch/task: **Sunrise (`sunrise`) first**, inspect its current broad lower wave and implement it only as a shared path/motif primitive if needed; then assess Forest Flow and Violet Pulse. This three-template checkpoint stops after final CI.

Reproduce by preparing images with `scripts/docx-next-fixture-images.py`, generating with `scripts/docx-next-fixtures.ts OUT --monoLuxe|--ledger|--ribbon`, then `scripts/docx-next-render-qa.py OUT --roundtrip --require-stable --libreofficekit PATH`. The live candidate editor script accepts `DOCX_NEXT_EDITOR_TEMPLATE=monoLuxe|ledger|ribbon` plus `OUT IMAGES_JSON`. Stable runtime preparation/manifests remain in [LibreOffice QA](libreoffice-qa.md). Local QA tools/artifacts use the work directory so a temporary environment restart does not discard evidence.
