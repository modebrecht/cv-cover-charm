# Cove / Glow / Horizon batch — 2026-10-05

The batch started from freshly fetched, clean remote `dev` at `8d03bb3974990626ae4d4e4d10f5fb9f18ed70b8`, with M6 Release Candidate SUCCESS. Three coherent feature commits implement Cove, Glow and Horizon. Their final tested source is the commit containing this report. Per user instruction they are published together, with CI checked once at the final batch head; verify that head's GitHub checks after publication.

**8/39 configured candidates; 0/39 Microsoft Word accepted migrations.** Brief, Warm (`freundlich`), Prism, Human, Orbit, Cove, Glow and Horizon are isolated candidates. Microsoft Word acceptance: **pending**.

| Candidate | Stable LibreOffice 25.8.7.3 render/save-reopen | Evidence                                       |
| --------- | ---------------------------------------------- | ---------------------------------------------- |
| Cove      | 13 fixtures / 94 pages passed                  | [Cove ledger](cove-stress-evidence.json)       |
| Glow      | 13 fixtures / 94 pages passed                  | [Glow ledger](glow-stress-evidence.json)       |
| Horizon   | 13 fixtures / 94 pages passed                  | [Horizon ledger](horizon-stress-evidence.json) |

All 39 new cases/282 pages pass structural packages, semantic text/media, paint ownership, body bounds, long flow and save/reopen checks. Actual browser designs and representative native cover/photo, letter, rich content and continuation pages were visually inspected. References are candidates, not Word or visual approval.

- 862 isolated unit tests passed, 0 failed (182 files). Targeted Next: 160 passed, 0 failed (20 files). TypeScript, production build, changed-file/release formatting passed. Lint: 0 errors, 21 existing warnings.
- All 137 prior candidate packages remain byte-identical to committed SHA256 ledgers. Final cached fixture generation also matches the 26 LibreOffice-validated Cove/Glow packages.
- Five prior normal cases (Brief, Warm, Prism, Human, Orbit), 20 pages, pass the stricter paint-layer scope guard through stable render/save-reopen. All 13 Cove cases pass that guard again. A deliberately absent same-bound paint layer fails the negative control.
- Raster pixel checks prove independent rounded corners and radial opacity fading. QA caches identical nonsemantic paint across fixtures using the renderer's complete asset key, preserving output hashes.
- Each new candidate passes actual editor rename/reload, portable JSON save/load, explicit snapshot and independent Next export, plus the existing combined production PDF download. Each PDF has three visibly nonempty pages and searchable edited CV text. The existing full semantic editor/custom/header/footer styling and JSON/PDF regression also passes.

Prism remains clean and declarative; Warm is the existing remote candidate, unchanged. No stale local Warm work was restored. New generic primitives are independent rectangle corners, header-off fallback motif policies and radial color-to-transparency fills. Horizon adds no further renderer primitive. The single Word renderer is unchanged. No per-template renderer, template-ID branch in generic rendering, visible-text/occurrence styling or XML repair was introduced. The source adapter still selects neutral authored data and imports no PDF pagination geometry.

Word adaptations remain explicit: native pictures preserve authored size/crop rather than CSS transforms, semantic content flows and may gain pages, badges use growing rectangular Word cells, blurred paint uses radial fades, and editable footer content remains native. See each coverage ledger for template differences.

Only `dev` changes. `main`/`render`, Legacy/V2 and production DOCX selection remain unchanged; no manual deployment or branch promotion occurred. PDF and portable JSON production paths remain functional.

Remaining blockers: actual Microsoft Word open/edit/save/reopen acceptance and approved references, outstanding settings coverage, first-class Modern/sidebar composition (explicitly unsupported). Recommended next bounded candidate: **Mono Luxe (`monoLuxe`)**; assess its typography/frame using shared primitives, with separate Word acceptance. This three-template checkpoint ends here.

To reproduce: create synthetic image inputs with `scripts/docx-next-fixture-images.py`, generate fixtures using `scripts/docx-next-fixtures.ts OUT --cove|--glow|--horizon`, then run `scripts/docx-next-render-qa.py OUT --roundtrip --require-stable --libreofficekit PATH`. The shared live editor script accepts `DOCX_NEXT_EDITOR_TEMPLATE=cove|glow|horizon` and `OUT IMAGES_JSON`; each invocation owns its Vite server. Stable runtime preparation and manifests remain in [LibreOffice QA](libreoffice-qa.md).
