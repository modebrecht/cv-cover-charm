# Edge / Gallery / Citrus template batch — 2026-10-08

Dedicated branch: `docx-next/template-batch-editorial-20261008`. Freshly fetched starting `dev`: `58a27488bc09b04b459d42d27bfd17410bfe9506`. This branch configures **Edge and Gallery**, bringing its registry to **31/39**. Citrus stopped at the descriptor inventory. Microsoft Word acceptance remains **0/39**; visual references remain pending. The previous Edel Dark and Studio batches are separate branches and are not included here.

## Inventory at the fetched base

The actual registry contains 29: Brief, Freundlich, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe, Ledger, Ribbon, Sunrise, Forest Flow, Violet Pulse, Studio 3, Warm 2, Warm 3, Verlauf 2, Verlauf 3, Diagonal, Klassisch, Edel, Seriös, Colorful, Blockig, Welle, Modern, Rahmen (`pastell`) and Sonne. The 39-template picker excludes historical Warm 4/5 entries; runtime entries alone are not the active template count.

| Remaining IDs at base  | Family / current primitive assessment                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `edge`, `gallery`      | Editorial signatures. Existing paths, gradients, independently rounded motifs, first-page paint, native rows and shared CV compositions suffice. Completed in this batch.                 |
| `studio`, `studio2`    | Editorial panels and native surfaces. Existing primitives suffice; already implemented on the separate Studio branch. Do not duplicate that work.                                         |
| `edelDark`             | Dark executive stationery. Existing native photo/contact compositions suffice; already implemented on its separate branch.                                                                |
| `terracotta` (Kolumne) | Editorial column. Previous separate batch stopped on visible paint portability; no attempt or architecture work here.                                                                     |
| `neon`, `verlauf`      | Opaque gradient stationery. Previous separate batch stopped on foreground paint visibility; not straightforward until that shared issue is resolved.                                      |
| `aurora`               | Gradient card/hero. Previous separate batch identified a missing growing native gradient surface; architecture decision remains with the main agent.                                      |
| `citrus`               | Gradient cards and rounded CV rubrics. Gradient/card primitives exist; a template-owned flowing heading surface default is missing. See [stopped assessment](citrus-template-blocked.md). |

## Declarative mapping and review limits

App/PDF defaults, late CSS and actual browser covers/CVs were inspected. Sources include `cover/layouts-base.ts`, `forest-flow-cover-defaults.ts`, `fresh-template-registry.ts`, `signature-templates.css`, `templatefix-32-36.css`, `cv-card-refresh.css`, `dossier/DossierSheetBackground.tsx`, `chrome-policy.css` and `letter/fresh-letter-system.ts` under `src/components`.

Edge uses the 24 mm dark cover band, 5 mm accent stripe and connected gradient corner, plus a 7 mm running rail. Its short interior rule is **24 mm instead of the app's 36 mm**, ending at 31 mm before native text starts at 32 mm. This avoids crossing contact/body text, including header-off stories. Gallery groups editable name/profession/badge opposite the saved portrait and white date; its 138 mm portrait tower and 232 mm grounded plane appear on the opening cover only. Quiet cover continuation paper preserves readable unbounded custom text. The secondary native contact row grows over three cover pages in the 60-line fixture. Letter/CV right rails and lower planes repeat normally.

Absolute fields become editable flowing rows, badges use existing rectangular native shading, and fixed bottom contacts become flowing columns. Saved Gallery photo width remains 60 mm, rather than adopting CSS's visual scale. Source field fonts/colors and saved photo frames retain precedence. These are documented Word flow adaptations, **not approved visual parity**. [Edge comparison](template-editorial-evidence/edge-preview.png), [Gallery comparison](template-editorial-evidence/gallery-preview.png), [continuation comparison](template-editorial-evidence/continuation-preview.png) are reduced review previews; the full-resolution render hashes are in the ledgers.

## Verification

| Check               | Result                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Edge                | 13 fixtures / 96 pages; stable render and Save/Reopen pass                                                                                                                                                   |
| Gallery             | 15 fixtures / 106 pages; stable render and Save/Reopen pass                                                                                                                                                  |
| Runtime             | Verified official LibreOfficeKit 25.8.7.3, 50 packages and complete font manifest                                                                                                                            |
| Package / visual QA | ZIP/XML/relationships, editable semantic text, media, body bounds, pagination, existing layout checks and template-specific paint probes pass before and after Save/Reopen                                   |
| Native identity     | 3,305/3,305 field tags and complete native text retained. All 28 fixtures lose existing table captions; full identity acceptance remains blocked. No carrier/repair investigation or gate change.            |
| Units               | 1,016 full units; 305 existing DOCX Next tests; 30 targeted model/template tests including seven new tests. Zero failures.                                                                                   |
| Static/build        | TypeScript, changed-file ESLint/Prettier, production build and diff checks pass                                                                                                                              |
| Portable JSON       | All 28 immutable input/model/package restorations pass; six browser-normalized image inputs per template. Both actual editors pass rename/reload, portable save/load and independent native snapshot export. |
| Production PDF      | Both actual combined downloads have three visible pages, the existing raster cover and semantic letter/CV with the renamed CV name. PDF implementation unchanged.                                            |
| Prior candidates    | All 29 base descriptors unchanged. Mono Luxe and Cove: 26 regenerated packages byte-identical to their committed ledgers; both normal dossiers pass fresh stable Save/Reopen (eight pages).                  |
| Remote CI           | No CI success claimed for the dedicated branch; existing branch filters omit it. Check publication separately.                                                                                               |

Fixtures cover normal, long letter/CV/values, photos/images, custom fields/rich tables, compact/off/different-first chrome, Timeline, Magazin, background visibility and custom palettes. Gallery additionally covers 60 contact lines and 50 custom cover lines. Sidebar has model coverage only; its experimental acceptance gates are unchanged. Hashes and actual identity results: [Edge ledger](edge-stress-evidence.json), [Gallery ledger](gallery-stress-evidence.json).

Reproduce with the existing fixture-image script, `bun scripts/docx-next-fixtures.ts <directory> --edge/--gallery --verify-json`, then `python scripts/docx-next-render-qa.py <directory> --libreofficekit <stable-lo-kit> --require-stable --roundtrip` and `python scripts/docx-next-native-identity-qa.py <directory>`. Run each candidate editor with `DOCX_NEXT_EDITOR_TEMPLATE=edge/gallery`; run the new template unit file explicitly alongside the existing DOCX Next suite.

Only descriptors/registry, fixture configuration, template tests and evidence/docs changed. Renderer/model, Sidebar, planning/pagination, identity, crop, XML repair, export routing, Legacy/V2, PDF and portable JSON architecture are untouched. No merge, deployment, branch promotion or `dev`/`main`/`render` push occurs.

Next: review/cherry-pick the completed isolated batches. After the main agent resolves the shared foreground-paint blocker, **Neon / Verlauf** are the next coherent template batch. Citrus awaits a generic rubric/default decision; Aurora awaits a growing gradient surface. This batch stops here.
