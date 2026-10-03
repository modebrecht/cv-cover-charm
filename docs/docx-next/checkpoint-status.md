# DOCX Next checkpoint — 2026-10-03

This is an initial reference implementation, **not the completed rebuild**. Work began from the freshly fetched `dev` commit `e8b59047b031f3902d0d3fcc72baf303a0a43f50`. Normal export still calls legacy DOCX. No production UI was switched, no legacy module was removed and no deployment/branch promotion was performed.

## Architecture evidence

- The inventory maps 88 relevant modules and 42 DOCX test files, including production entry points, recipe/family fallbacks, postprocessors, V2 ownership, fonts, images, chrome, margins, columns, typography and pagination. Each module has a disposition.
- Explicit app snapshots produce deterministic Word-independent semantic fields and blocks. Identical visible values retain independent identity/style. The app's anonymous portable typography IDs still require a permanent semantic binding migration.
- Brief is a declarative descriptor. One isolated renderer produces paragraphs, runs, native tables, pictures, pagination controls, headers/footers, section properties and its own package/relationships/content types. It imports no legacy/V2 DOCX module and applies no rendered-text styling patches.
- The internal Next API is independently callable; an integrated comparison UI and normal-export switchover remain pending.

## Automated validation

| Check                                                                                                  | Result                                                                      |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Full unit suite                                                                                        | 737 passed, 0 failed; 164 files                                             |
| Next model/package tests                                                                               | 35 passed, including deterministic models and dependency boundary           |
| Typecheck                                                                                              | Passed                                                                      |
| ESLint                                                                                                 | 0 errors; 21 existing warnings                                              |
| Production build                                                                                       | Passed                                                                      |
| Independent Brief fixtures                                                                             | 19 generated; 89 rendered pages                                             |
| ZIP CRC, XML, required parts/content types/relationships, three sections                               | All 19 passed                                                               |
| LibreOffice conversion, expected page count, text/media preservation, blank pages, text bounds/overlap | All 19 passed                                                               |
| Browser image normalization                                                                            | Transparent PNG, RGB/ICC/CMYK/EXIF/large JPEG; corrupt-input failure passed |
| LibreOffice save/reopen                                                                                | Normal fixture saved as DOCX and reopened to PDF without reported warning   |
| Microsoft Word open/edit/save/reopen                                                                   | **Pending**; no Windows/macOS Word environment available                    |
| Approved visual snapshots                                                                              | **Pending**; generated images are candidates                                |
| Modern/sidebar fixture and 39-template Next gallery                                                    | **Pending**; intentionally blocked before those migration gates             |

The reference render used LibreOfficeDev `26.8.0.0.alpha0` and Chromium `153`. Stable LibreOffice and Microsoft Word results must also be recorded before acceptance. Synthetic profile/orientation fixtures do not establish behavior for an unavailable original problematic user JPEG.

The fixture set includes minimal/normal content, 70 letter paragraphs, 65 CV entries, long values, no photo, repeated values, absent optional content, 12 custom sections, six image inputs, first/continuation chrome, half-width sections, rich native letter blocks and left/right/free images. Minimal/empty dossiers have 3 pages; ordinary fixtures 4; custom sections 5; long letter/CV 11 each. These counts are candidate QA expectations, not approved Word snapshots.

Representative cover, letter, continuation CV, chrome, half-width, long-value, rich-text and photo pages were visually inspected. Real rendering exposed overlapping nested container controls and shifted separate picture anchors; those were fixed in the generic renderer, not by patching exported XML.

## Gate status and remaining risks

Gate 0 is complete. Contract/model/template foundations and the independent Gate 4 package are implemented. **Gates 5/6 remain open; 0/39 templates are accepted as migrated.** No diverse-template migration, sidebar implementation, switchover or legacy deletion is certified.

Before Brief acceptance, finish permanent semantic editor/portable-typography bindings and complete settings coverage: CV photo placement/framing, cropped/round photos, paper/decorative artwork, signed chrome/recipient offsets, exact list variants and complex rich-text grammar. Mapped unsupported features fail visibly rather than being silently accepted. Sidebar requests always fail explicitly. Complete mapping for the remaining settings is still necessary.

Font substitution is documented and deterministic, but installed/unavailable-font behavior and an approved embedding policy need final acceptance. LibreOffice text/bounds checks cannot prove all Word editing behavior or OOXML schema conformance. Complete the checklist in `word-smoke-test.md`, approve Word-oriented reference snapshots, then advance through the user's remaining gates.

PDF export and project JSON sources were not changed; their existing regression suites remain green. An application-level browser PDF/JSON smoke test is still required before production switchover. Continue to work only on `dev`, without manual deployment or promotion.
