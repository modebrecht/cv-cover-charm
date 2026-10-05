# Sunrise / Forest Flow / Violet Pulse batch — 2026-10-05

The batch began from freshly fetched, clean remote `dev` at `4724c595c24399d3e0d97ba6918d6103330b3dfe`, the previous green M6 Release Candidate checkpoint. The temporary workspace was automatically pruned before editing; a fresh remote clone was fetched and independently reverified at the same head before any modifications. Stale Warm checkouts were ignored.

Three coherent local feature commits implement the candidates. Per user instruction they are published together and CI is checked once at the final batch head. The tested source is the commit containing this report; the session's closing report records the actual published SHA/check results.

**14/39 configured isolated candidates; 0/39 Microsoft Word accepted migrations. Microsoft Word acceptance: pending.**

| Candidate    | Stable LibreOffice 25.8.7.3 render/save-reopen | Evidence                                        |
| ------------ | ---------------------------------------------- | ----------------------------------------------- |
| Sunrise      | 13 fixtures / 94 pages passed                  | [Hash ledger](sunrise-stress-evidence.json)     |
| Forest Flow  | 13 fixtures / 95 pages passed                  | [Hash ledger](forestFlow-stress-evidence.json)  |
| Violet Pulse | 13 fixtures / 94 pages passed                  | [Hash ledger](violetPulse-stress-evidence.json) |

All 39 new fixtures/283 pages pass package XML/relationships, native text/media, page bounds, long flow, closing groups, scoped paint and save/reopen checks. Actual browser designs and representative cover/photo, letter, header-off and long/continuation pages were visually inspected. The Word flow adaptations are explicit in each coverage document; these are candidate references, not approved pixel parity or Word acceptance.

- 890 isolated unit tests passed in 188 files, zero failures/incomplete files. Each file ran in a separate Bun process, with its own final test summary. The monolithic local `--isolate` invocation exited without a final summary, so it was not counted as full-suite evidence. 188 targeted Next tests pass in 26 files. TypeScript, production build and release/changed-file formatting pass. Lint: zero errors, 21 existing warnings.
- All 215 pre-batch candidate DOCX files regenerate byte-identically to the starting commit's frozen SHA-256 ledgers. Eleven existing normal fixtures/44 pages also pass stable render/save-reopen. Previous template assertions were retained.
- Each candidate passes actual editor rename/reload, portable JSON save/load, explicit snapshot and independent native DOCX, plus existing combined production PDF export. Candidate PDFs each contain three visibly nonempty pages and searchable edited CV text. The full existing semantic/repeated-value/custom/header/footer editor, JSON and production PDF smoke also passes.
- Violet Pulse's first editor smoke timed out during persistence/reload while other checks were running. A fresh isolated full rerun passed. Root cause was not conclusively established from the original log; generic stage/state/screenshot failure diagnostics were added. No assertions or timeouts were relaxed.
- Stable QA was restored from all 50 verified pinned package archives and the recorded fonts. Truncated downloaded/extracted files were detected and restored from original archive bytes. No engine patch, document repair or development engine substitution was used.

The shared additions are bounded absolute cubic contour paint, independent cover gutters, semantic cover-field leads and a dossier-font default for built-in cover roles. The strict app freehand M/L grammar is unchanged. Cubic contours reject arbitrary markup, unsupported commands, extra moves, wrong arity and out-of-range/nonfinite coordinates; real browser pixel checks verify curved fill/transparent boundaries. Forest Flow's native rail composition and Violet Pulse reuse these and the existing columns, photos, independent corners, radial fades, semantic palette defaults and motif-only first/continuation chrome.

A visual check caught Forest Flow's ornament touching contact text and obsolete serif field defaults. Declarative geometry now keeps the ornament outside that text column; shared font defaults match the current browser dossier-font contract while explicit authored/canonical/custom fonts retain precedence.

Prism is clean and declarative; Warm remains the existing unchanged remote candidate. The source adapter selects authored semantic/app data into neutral DTOs without DOM measurements or PDF pagination geometry. There is one Word renderer entry point, unchanged in this batch. No per-template renderer, generic renderer template-ID branch, visible-text/occurrence matching or post-export XML repair was found or introduced. The central builder only gained generic cover margin selection; no unrelated file split/rewrite was needed.

Only `dev` changes. `main`/`render`, Legacy/V2 and production DOCX selection remain untouched. No manual deployment, merge or promotion. Existing PDF and portable JSON remain functional.

Remaining blockers: actual Microsoft Word acceptance and approved visual references, remaining settings coverage, first-class Modern/sidebar composition, production comparison/switchover and eventual legacy removal. Forest Flow's decorative cover rail does not imply accepted CV sidebar support; sidebar still fails explicitly. Recommended next bounded task: **Studio 3 (`studio3`) architecture/design review and candidate**, followed by assessing Warm 2 and Contour if another three-template batch is requested. Studio 2/Modern/sidebar require first-class composition before implementation.

Reproduce: generate images with `scripts/docx-next-fixture-images.py`, fixtures with `scripts/docx-next-fixtures.ts OUT --sunrise|--forestFlow|--violetPulse`, and run `scripts/docx-next-render-qa.py OUT --roundtrip --require-stable --libreofficekit PATH`. Candidate editor QA uses `DOCX_NEXT_EDITOR_TEMPLATE` with `OUT IMAGES_JSON`. Runtime manifests/instructions remain in [LibreOffice QA](libreoffice-qa.md). This batch stops after final CI.
