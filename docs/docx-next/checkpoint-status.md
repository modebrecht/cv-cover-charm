# DOCX Next checkpoint — 2026-10-03

This is a continued reference implementation, **not the completed rebuild**. Work began from the freshly fetched `dev` commit `e8b59047b031f3902d0d3fcc72baf303a0a43f50`. Normal export still calls legacy DOCX. No production UI was switched, no legacy module was removed and no deployment/branch promotion was performed.

## Architecture evidence

- The inventory maps 88 relevant modules and 42 DOCX test files, including production entry points, recipe/family fallbacks, postprocessors, V2 ownership, fonts, images, chrome, margins, columns, typography and pagination. Each module has a disposition.
- Explicit app snapshots produce deterministic Word-independent semantic fields and blocks. Identical visible values retain independent identity/style. Current editor controls and preview fields share stable IDs with the model; list identities survive reorder/delete and portable JSON. Older anonymous saved styles still require explicit migration.
- Brief is a declarative descriptor. One isolated renderer produces paragraphs, runs, native tables, pictures, pagination controls, headers/footers, section properties and its own package/relationships/content types. It imports no legacy/V2 DOCX module and applies no rendered-text styling patches.
- The internal Next API is independently callable; an integrated comparison UI and normal-export switchover remain pending.

## Automated validation

| Check                                                                                                  | Result                                                                                       |
| ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Full unit suite                                                                                        | 757 passed, 0 failed; 167 files                                                              |
| Next model/package tests                                                                               | 55 passed, including editor identity, geometry, deterministic models and dependency boundary |
| Typecheck                                                                                              | Passed                                                                                       |
| ESLint                                                                                                 | 0 errors; 21 existing warnings                                                               |
| Production build                                                                                       | Passed                                                                                       |
| Independent Brief fixtures                                                                             | 32 generated; 153 rendered pages                                                             |
| ZIP CRC, XML, required parts/content types/relationships, planned physical sections                    | All 32 passed                                                                                |
| LibreOffice conversion, expected page count, text/media preservation, blank pages, text bounds/overlap | All 32 passed                                                                                |
| Browser image normalization                                                                            | Transparent PNG, RGB/ICC/CMYK/EXIF/large JPEG; corrupt-input failure passed                  |
| LibreOffice save/reopen                                                                                | All 32 fixtures saved as DOCX and reopened; package/text/page-count/column checks passed     |
| Microsoft Word open/edit/save/reopen                                                                   | **Pending**; no Windows/macOS Word environment available                                     |
| Approved visual snapshots                                                                              | **Pending**; generated images are candidates                                                 |
| Modern/sidebar fixture and 39-template Next gallery                                                    | **Pending**; intentionally blocked before those migration gates                              |

The reference render used LibreOfficeDev `26.8.0.0.alpha0` and Chromium `153`. Stable LibreOffice and Microsoft Word results must also be recorded before acceptance. Synthetic profile/orientation fixtures do not establish behavior for an unavailable original problematic user JPEG.

The fixture set includes minimal/normal content, 70 letter paragraphs, 65 CV entries, long values, no photo, repeated values, absent optional content, 12 custom sections, six image inputs, first/continuation chrome, half-width sections, rich native letter blocks, nested/ragged tables, all four list markers, left/right/free letter images and seven native CV photo placement/frame/crop cases, including long-name and 65-entry CV combinations, plus five native column-flow cases. The latter include two/three columns, long flow and first/continuation chrome. Minimal/empty dossiers have 3 pages; ordinary fixtures 4; custom sections 5; long letter/CV 11 each. These counts are candidate QA expectations, not approved Word snapshots.

Representative cover, letter, continuation CV, chrome, half-width, long-value, rich-text and photo pages were visually inspected. Real rendering exposed overlapping nested container controls and shifted separate picture anchors; those were fixed in the generic renderer, not by patching exported XML.

## Gate status and remaining risks

Gate 0 is complete. Contract/model/template foundations and the independent Gate 4 package are implemented. **Gates 5/6 remain open; 0/39 templates are accepted as migrated.** No diverse-template migration, sidebar implementation, switchover or legacy deletion is certified.

Before Brief acceptance, finish older anonymous-style migration and remaining settings coverage: paper/decorative artwork, signed chrome/recipient offsets and semantic ownership of custom chrome fields. Native photo placement/framing/cropping, list variants and table-cell paragraph/nested-table structure are implemented and tested. Mapped unsupported features fail visibly rather than being silently accepted. Sidebar requests always fail explicitly. Complete mapping for the remaining settings is still necessary.

Font substitution is documented and deterministic, but installed/unavailable-font behavior and an approved embedding policy need final acceptance. LibreOffice text/bounds checks cannot prove all Word editing behavior or OOXML schema conformance. Complete the checklist in `word-smoke-test.md`, approve Word-oriented reference snapshots, then advance through the user's remaining gates.

The application-level smoke test passed: style two identical CV values independently, rename, reload, save/parse portable project JSON, create an independent Next package and download the production combined PDF. Its edited CV text remains searchable across all three PDF pages. The shared saved CV adapter now retains previously dropped title/heading/chrome settings; PDF/JSON regressions remain green. Continue to work only on `dev`, without manual deployment or promotion.

## Continued checkpoint from `43853f6`

The app data and render model now share `dossier-semantic-fields.ts`. Canonical controls never inherit another field's style by matching visible text. Legacy context/occurrence metadata is retained only for the temporary production legacy exporter. New additive list-ID arrays preserve existing JSON formats; reference contact/email/extra data is separated once before rendering.

The single renderer adds native picture source crops, frame geometry, outlines and page/content anchors. Pure geometry tests and actual PDF pixel/bounds checks verify crop, circular clipping, frame dimensions and page coordinates. Cover/CV still reuse one normalized media part. Native central numbering now covers bullet/dash/plus/dot markers; table cells retain independent paragraphs and nested tables, and short rows are padded safely. No template-specific renderer, XML repair pass or legacy dependency was introduced.

The browser CLI daemon could not start in this environment; the scripted Playwright verification used the same Chromium engine and verified page load, controls, absence of error overlays, editor actions and actual downloads. Microsoft Word remains unavailable. The generated reference snapshots remain candidates; neither Gate 5/6 nor any migrated-template status is certified by these automated results.

## Continued checkpoint from `cc61588`

Balanced letter columns now use a semantic `column-flow` block and a pure physical-section planner. The same Word renderer emits equal-width native columns and continuous section boundaries, restores full width for subsequent paragraphs/CV and reuses known header/footer package parts. The old heuristic division of child text into table cells was removed. No XML repair pass or template exception was added.

Five new fixtures render across 25 pages: two/three columns, long content, chrome and long content with chrome. Actual page geometry confirms independent columns and full-width paragraphs before/after. Contact chrome occurs only on the first letter page; compact continuation chrome survives column transitions and does not leak into the CV. Automated LibreOffice save/reopen checks run for all 32 fixtures. Their text extraction checks logical body regions independently of running headers/footers; trailing blank glyph advances do not count as clipping.

The real editor/portable-JSON/Next/production-PDF smoke test was rerun successfully. Word editing, stable LibreOffice and approved snapshots remain unverified. These results close the implementation gap for native column flow; they do not certify Gates 5/6 or authorize later template migration.
