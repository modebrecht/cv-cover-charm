# DOCX Next Warm stress checkpoint — 2026-10-04

Freshly fetched starting `dev` HEAD: `081a5dbee9761dbde4d033f60dfa4ac4ba4d0d20`. The final source is the Git revision containing this report; the review package records its full SHA. **2/39 configured candidates (Brief, Warm); 0/39 Microsoft-Word-accepted migrations.** Work stayed on `dev`. No `main`/`render` mutation, branch promotion, manual deployment, normal DOCX-button change or Legacy/V2 removal occurred. Prism/Human and further migrations were not started.

## Result and architecture

Warm (`freundlich`) is a declarative descriptor in the existing registry. It configures native cover rows, centered photo, dossier font ownership, default 44 mm contact chrome/4 mm gap, compact sender composition and first/continuation bands with organic circles. Unknown templates still reject explicitly; Modern/sidebar is not mapped to Classic.

The architecture remains explicit snapshot → neutral authored source → DossierDocModel → shared primitives → one Word renderer → WordPackage → validation/render QA. Templates generate no XML. Generic `page-artwork.ts` owns repeat scope, first-header creation and page intersection. `template-composition.ts` owns native compact sender and band composition; shared authored-text reservation belongs to `layouts.ts`. The renderer owns native text/tables/pictures/stories and media relationships, with no template-ID branch or Legacy dependency.

Off-page circles exposed a real generic paint gap. Original geometry remains in the semantic model; the decoration rasterizer renders only its explicit visible viewport and native DrawingML stays within the page. Native source crop alone rendered correctly but still exposed off-page image bounds in LibreOffice, so paint is clipped before package creation. Only nonsemantic decoration is rasterized. User text stays native and photographs retain native crop/frame primitives. First/default header stories reuse assets with their own valid relationships; first-page motifs do not leak onto continuation pages. No post-export repair is used.

Native sender cells grow with text and preserve readable fill beyond decorative masthead height. Cover groups flow in native cells rather than fixed browser-positioned text containers. The source boundary still excludes measured pagination/DOM/PDF rectangles. These adaptations require human Word acceptance; [coverage and exact flow policies](warm-feature-coverage.md).

## Gaps found and closed

- Disabled headers/footers now ignore dormant height values, while sender content remains in native body flow. This shared policy also benefits Brief.
- Short pure-text flow boxes keep text, terminal paragraph and padding together. Conservative authored-text estimates up to 80 mm use native `cantSplit`; longer/image boxes keep their existing splittable behavior. Actual QA rejected a blank padding-only continuation; the corrected custom cover continuation contains editable text and its complete frame. The long Brief box retains its eight-page dossier contract.
- Word auto spacing for serif fonts consumes natural font-line metrics rather than nominal point height. Warm configures a conservative 1.4 line-metric factor for chrome reservation, preserving its default 44 mm contact contract. Render QA now checks header ink against its applicable band on every page before and after save/reopen. A negative control with insufficient paint correctly fails. The long signed-offset continuation case has eight letter pages, with healthy wrapped contact text.
- Custom cover fields remain independently tagged after source adaptation. Saved sender role/field styles win over automatic compact ink and sizes. Light chrome palettes use readable automatic ink; explicitly authored cover/CV field colors remain user-controlled.

Ambiguous anonymous typography, free CV section positioning, continuation margins larger than the initial margin, translucent semantic images, unknown fonts, enabled embedding and Modern/sidebar remain explicit failures. The other 37 selectable templates remain unregistered. All model issues still block normal candidate export. No silently dropped semantic content, text rasterization or visible-value styling was introduced.

## Application regression status

The original dossier-flow regression was fixed before this starting HEAD: measurement probes lost font/template CSS because they remove the export-page marker that styling previously used. A permanent canvas marker and an in-canvas probe restore authored typography; the physical overflow assertion remains intact. The associated test waits for the saved long body, measured pages and authored font sizes. [Exact original assertion and diagnosis](dossier-flow-regression.md).

The current local browser run passes **all 70 dossier-flow tests plus five PDF text/selection checks**: 75 passed, 0 failed, 0 flaky, 0 skipped, 287.440 seconds, Chromium 140 / Playwright 1.55.0. No test or assertion was removed/weakened. GitHub branch CI runs independently after the commit; its current status belongs to the commit checks, not an assumed permanent result.

Both live editor smokes pass: real semantic controls, independent formatting, rename/reload, portable JSON save/parse/load, explicit snapshot and independent Next export. Existing production combined PDF download also passes. Warm has a separate actual-editor roundtrip. The browser CLI daemon cannot start in this environment; its attempted initialization and scripted Chromium fallback are recorded. No production PDF/JSON exporter was modified.

## Machine evidence

| Check                                    | Final local result                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Isolated units                           | 828 passed, 0 failed; 176 files; 13,793 assertions                                                           |
| Targeted DOCX Next                       | 126 passed, 0 failed; 14 files; 898 assertions; subset of unit suite                                         |
| Typecheck                                | Passed                                                                                                       |
| ESLint                                   | 0 errors; 21 existing warnings                                                                               |
| Production build                         | Passed                                                                                                       |
| Release/changed source formatting        | Passed                                                                                                       |
| Broad formatting comparison              | 194 existing warnings on both base and current source; no new warning; broad check remains red outside scope |
| Application browser/PDF                  | 75 passed, 0 failed/flaky/skipped; includes all 70 dossier-flow tests                                        |
| Live Brief + Warm editor / portable JSON | Passed; actual production combined PDF download passed                                                       |
| Warm fixtures                            | 13/13 structural, render and DOCX save/reopen; 109 pages                                                     |
| Brief regression fixtures                | 85/85 structural, render and DOCX save/reopen; unchanged 472 pages                                           |
| Normalized pictures                      | Six PNG/RGB/ICC/CMYK/EXIF/large inputs; corrupt image rejection passed                                       |
| Stable LibreOffice                       | 25.8.7.3 580(Build:3), official LibreOfficeKit API; all 98 fixtures / 581 pages                              |
| Microsoft Word                           | Pending                                                                                                      |
| Approved visual references               | Pending; generated PDFs/PNGs are candidates                                                                  |

After the Warm-only line-metric change, all 85 regenerated Brief DOCX files are **byte-identical** to the complete stable render/save-reopen run. Tests/typecheck/lint/build and all Warm renders were rechecked. Structural checks cover XML/ZIP/required parts/content types/relationships; rendering checks cover preserved semantic text, page contracts, blank pages, bounds/overlap, media, columns, native entry attachment, scoped paint and painted-header coverage. Save/reopen repeats applicable text/package/layout/paint checks. The [hash ledger and runtime record](warm-stress-evidence.json) freeze this checkpoint's evidence.

Stable setup verifies 50 pinned Ubuntu archives, font assets and the QA adapter before extraction/use. It is isolated from the global development LibreOffice. The desktop CLI remains unavailable here; public Kit API rendering/save-reopen succeeds without socket shims or binary changes. [Reproduction and environment limits](libreoffice-qa.md). CI does not depend on an unpinned machine-global application.

## Word review and gates

The separate Warm package has thirteen editable DOCX files, thirteen matching PDFs, all 109 candidate PNG pages, hashes, stable runtime/package/font inventories, coverage, this evidence, source/flow policy, a blank review ledger and the expanded [Word checklist](word-smoke-test.md). Every Warm candidate page was inspected in contact sheets; representative cover/photo, contact/compact/continuation, long sender and CV pages were examined at readable scale. This inspection does not approve snapshots or certify Word behavior.

| Gate                         | Criterion                                          | Status                                         |
| ---------------------------- | -------------------------------------------------- | ---------------------------------------------- |
| 5 — Brief product acceptance | Machine prerequisites for supported configurations | Complete; unsupported choices explicitly block |
| 5                            | Microsoft Word acceptance                          | Pending                                        |
| 6 — Real render QA           | Structural QA                                      | Complete                                       |
| 6                            | LibreOffice render/save-reopen                     | Complete                                       |
| 6                            | Stable LibreOffice                                 | Complete: 25.8.7.3, public Kit API             |
| 6                            | Approved visual references                         | Pending                                        |
| 6                            | Microsoft Word                                     | Pending                                        |

Brief remains ready for human Word acceptance of supported configurations. Warm is now ready for its own human Word review. The shared architecture has survived a second, different descriptor; it is ready for the next deliberately scoped Prism/Human stress phase when authorized and consistent with the outstanding acceptance gates. Stop at this checkpoint. Reasons to withhold acceptance/production release: no Microsoft Word evidence, no approved references, explicit unsupported settings and pending human approval of native flow/color adaptations. No migrated-template status or production switchover is claimed.
