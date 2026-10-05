# DOCX Next checkpoint — 2026-10-05

**Latest Mono Luxe batch step:** 9/39 configured candidates, 0/39 Word accepted. [Evidence](mono-luxe-stress-report.md): 13 fixtures/105 pages pass stable LibreOffice render/save-reopen. CI deferred to batch end. Microsoft Word acceptance: pending.

**Latest Horizon batch step:** 8/39 configured candidates, 0/39 Word accepted. [Evidence](horizon-stress-report.md): 13 fixtures/94 pages pass stable LibreOffice render/save-reopen. CI deferred to the batch end. Microsoft Word acceptance: pending.

**Latest Glow batch step:** 7/39 configured candidates, 0/39 Word accepted. [Evidence](glow-stress-report.md): 13 fixtures/94 pages pass stable LibreOffice render/save-reopen. CI deferred to the batch end. Microsoft Word acceptance: pending.

**Latest Cove batch step:** 6/39 configured candidates, 0/39 Word accepted. [Evidence](cove-stress-report.md): 13 fixtures/94 pages pass stable LibreOffice render/save-reopen. CI deferred to the batch end. Microsoft Word acceptance: pending.

**Latest Orbit candidate:** freshly fetched `dev` at `9f594db3ae765e27759846fff2dd317e12e837af`, green M6 CI and clean tree. [Orbit evidence](orbit-stress-report.md): 5/39 configured candidates, 0/39 Word accepted. Thirteen fixtures/95 pages pass stable LibreOfficeKit 25.8.7.3 render/save-reopen. All 124 prior candidate DOCX files regenerate byte-identically. Outline motifs and source-aware native field alignment are shared primitives; the neutral adapter and single renderer remain intact. Microsoft Word acceptance: pending.

**Latest Human candidate:** freshly fetched `dev` at `e91a9e1f96908d53df91611fbef66ec0903713b8`. [Human coverage](human-feature-coverage.md): 4/39 configured candidates, 0/39 Word accepted. Twelve Human fixtures/99 pages pass stable LibreOfficeKit render/save-reopen. All 112 prior candidate DOCX files regenerate byte-identically. The neutral adapter and single renderer remain intact; production DOCX stays Legacy/V2. Microsoft Word acceptance: pending.

**Latest Prism stress checkpoint:** [Prism evidence and gates](prism-stress-report.md), freshly fetched `4a397ca`: 3/39 configured candidates, 0/39 Word accepted. All 112 fixtures/676 pages pass structural, stable render and save/reopen QA; 838 isolated units and all 70 dossier-flow tests pass. Human candidate work is recorded above; acceptance remains pending.

**Latest Warm stress checkpoint:** see [Warm evidence and gates](warm-stress-report.md): freshly fetched `081a5db`, 2/39 configured candidates, 0/39 Word-accepted migrations. All 13 Warm/109 pages and 85 Brief/472 pages pass stable LibreOffice render/save-reopen; Word and visual approval remain pending. Historical counts below describe their own checkpoints.

**Previous stabilization:** see [the report from freshly fetched `d664317`, continued from freshly fetched `32a3e8b`](stabilization-report.md). Its test counts, dossier-flow fix, source boundary and Word-review readiness supersede the historical checkpoint evidence below. Stable LibreOffice 25.8.7.3 now passes all 85 fixtures/472 pages through its official Kit API; [reproduction and limits](libreoffice-qa.md). Microsoft Word and approved visual references remain pending; no migrated-template or production status changed. Older pending-stable statements below describe historical checkpoints.

This is a continued reference implementation, **not the completed rebuild**. Progress: **9/39 configured candidates (Brief, Warm, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe), 0/39 Word-accepted migrations**. The independent foundation is implemented through Gate 4; [Brief coverage](brief-feature-coverage.md) records the remaining inputs and acceptance work. The latest continuation started from freshly fetched `dev` commit `a4690bd713368e3dc1e0c2577e3e17311756a04b`. Normal export still calls legacy DOCX. No production UI was switched, no legacy module was removed and no deployment/branch promotion was performed.

## Architecture evidence

- The inventory maps 88 relevant modules and 42 DOCX test files, including production entry points, recipe/family fallbacks, postprocessors, V2 ownership, fonts, images, chrome, margins, columns, typography and pagination. Each module has a disposition.
- Explicit app snapshots produce deterministic Word-independent semantic fields and blocks. Identical visible values retain independent identity/style. Current editor controls and preview fields share stable IDs with the model; list identities survive reorder/delete and portable JSON. Older anonymous saved styles still require explicit migration.
- Brief is a declarative descriptor. One isolated renderer produces paragraphs, runs, native tables, pictures, pagination controls, headers/footers, section properties and its own package/relationships/content types. It imports no legacy/V2 DOCX module and applies no rendered-text styling patches.
- The internal Next API is independently callable; an integrated comparison UI and normal-export switchover remain pending.

## Automated validation

| Check                                                                                                  | Result                                                                                        |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Full unit suite                                                                                        | 811 passed, 0 failed; 174 files (Bun `--isolate`)                                             |
| Next model/package tests                                                                               | 109 passed, including editor identity, geometry, deterministic models and dependency boundary |
| Typecheck                                                                                              | Passed                                                                                        |
| ESLint                                                                                                 | 0 errors; 21 existing warnings                                                                |
| Production build                                                                                       | Passed                                                                                        |
| Independent Brief fixtures                                                                             | 84 generated; 468 rendered pages                                                              |
| ZIP CRC, XML, required parts/content types/relationships, planned physical sections                    | All 84 passed                                                                                 |
| LibreOffice conversion, expected page count, text/media preservation, blank pages, text bounds/overlap | All 71 passed                                                                                 |
| Browser image normalization                                                                            | Transparent PNG, RGB/ICC/CMYK/EXIF/large JPEG; corrupt-input failure passed                   |
| LibreOffice save/reopen                                                                                | All 84 fixtures saved as DOCX and reopened; package/text/page-count/column checks passed      |
| Microsoft Word open/edit/save/reopen                                                                   | **Pending**; no Windows/macOS Word environment available                                      |
| Approved visual snapshots                                                                              | **Pending**; generated images are candidates                                                  |
| Modern/sidebar fixture and 39-template Next gallery                                                    | **Pending**; intentionally blocked before those migration gates                               |

The reference render used LibreOfficeDev `26.8.0.0.alpha0` and Chromium `153`. Stable LibreOffice and Microsoft Word results must also be recorded before acceptance. Synthetic profile/orientation fixtures do not establish behavior for an unavailable original problematic user JPEG.

The fixture set includes minimal/normal content, 70 letter paragraphs, 65 CV entries, long values, no photo, repeated values, absent optional content, 12 custom sections, six image inputs, first/continuation chrome, half-width sections, rich native letter blocks, nested/ragged tables, all four list markers, left/right/free letter images and seven native CV photo placement/frame/crop cases, including long-name and 65-entry CV combinations, plus five native column-flow cases and two repeated-value custom chrome cases. The latter include two/three columns, long flow and first/continuation chrome. Minimal/empty dossiers have 3 pages; ordinary fixtures 4; custom sections 5; long letter 12 and long CV 12. These counts are candidate QA expectations, not approved Word snapshots.

Representative cover, letter, continuation CV, chrome, half-width, long-value, rich-text and photo pages were visually inspected. Real rendering exposed overlapping nested container controls and shifted separate picture anchors; those were fixed in the generic renderer, not by patching exported XML.

## Gate status and remaining risks

Gate 0 is complete. Contract/model/template foundations and the independent Gate 4 package are implemented. **Gates 5/6 remain open; 0/39 templates are accepted as migrated.** No diverse-template migration, sidebar implementation, switchover or legacy deletion is certified.

Before Brief acceptance, finish older anonymous-style migration and outstanding Word-oriented settings/acceptance coverage. Saved custom text, pictures and nonsemantic artwork now use shared model primitives; source absolute positions/heights map to the documented Word flow policy rather than fixed text containers. Native photo placement/framing/cropping, list variants and table-cell paragraph/nested-table structure are implemented and tested. Mapped unsupported features fail visibly rather than being silently accepted. Sidebar requests always fail explicitly. Complete mapping for the remaining settings is still necessary.

All eight declared fallback faces now have actual LibreOffice render/save-reopen evidence. Installed/unavailable-font behavior in Microsoft Word and any future enabled-embedding implementation still need acceptance. LibreOffice text/bounds checks cannot prove all Word editing behavior or OOXML schema conformance. Complete the checklist in `word-smoke-test.md`, approve Word-oriented reference snapshots, then advance through the user's remaining gates.

The application-level smoke test passed: style two identical CV values independently, rename, reload, save/parse portable project JSON, create an independent Next package and download the production combined PDF. Its edited CV text remains searchable across all three PDF pages. The shared saved CV adapter now retains previously dropped title/heading/chrome settings; PDF/JSON regressions remain green. Continue to work only on `dev`, without manual deployment or promotion.

## Continued checkpoint from `43853f6`

The app data and render model now share `dossier-semantic-fields.ts`. Canonical controls never inherit another field's style by matching visible text. Legacy context/occurrence metadata is retained only for the temporary production legacy exporter. New additive list-ID arrays preserve existing JSON formats; reference contact/email/extra data is separated once before rendering.

The single renderer adds native picture source crops, frame geometry, outlines and page/content anchors. Pure geometry tests and actual PDF pixel/bounds checks verify crop, circular clipping, frame dimensions and page coordinates. Cover/CV still reuse one normalized media part. Native central numbering now covers bullet/dash/plus/dot markers; table cells retain independent paragraphs and nested tables, and short rows are padded safely. No template-specific renderer, XML repair pass or legacy dependency was introduced.

The browser CLI daemon could not start in this environment; the scripted Playwright verification used the same Chromium engine and verified page load, controls, absence of error overlays, editor actions and actual downloads. Microsoft Word remains unavailable. The generated reference snapshots remain candidates; neither Gate 5/6 nor any migrated-template status is certified by these automated results.

## Continued checkpoint from `cc61588`

Balanced letter columns now use a semantic `column-flow` block and a pure physical-section planner. The same Word renderer emits equal-width native columns and continuous section boundaries, restores full width for subsequent paragraphs/CV and reuses known header/footer package parts. The old heuristic division of child text into table cells was removed. No XML repair pass or template exception was added.

Five new fixtures render across 25 pages: two/three columns, long content, chrome and long content with chrome. Actual page geometry confirms independent columns and full-width paragraphs before/after. Contact chrome occurs only on the first letter page; compact continuation chrome survives column transitions and does not leak into the CV. Automated LibreOffice save/reopen checks run for all 34 fixtures. Their text extraction checks logical body regions independently of running headers/footers; trailing blank glyph advances do not count as clipping.

The real editor/portable-JSON/Next/production-PDF smoke test was rerun successfully. Word editing, stable LibreOffice and approved snapshots remain unverified. These results close the implementation gap for native column flow; they do not certify Gates 5/6 or authorize later template migration.

## Continued checkpoint from `408891e`

Custom header/footer title and text fields now share canonical IDs across editor, preview, portable JSON and the model (`letter.header.title`, `cv.footer.text`, etc.). First/default headers retain the same field identity with separate paragraph IDs. User styles are resolved before rendering; native inline footers preserve independent run styles and stacked footers preserve paragraphs. Custom content replaces automatic footer contact text consistently with the editor.

Real editor testing exposed a letter pagination render loop when opening chrome controls. Pagination readiness is now derived from measured pages rather than synchronized through a second state-setting effect. Page/chrome props and the compatibility callback are stable, unchanged patches do not replace the design, and cancelled measurements do not report stale overflow. All eight custom chrome fields were styled independently, renamed/reloaded, saved through JSON and exported through Next. The production combined PDF still downloads and was visually inspected.

Visual inspection also found first-page footers missing whenever `titlePg` selected a different first header. The renderer now explicitly references the known logical footer for the first page, reusing the same package part. Render QA checks both repeated custom footer values in the footer region of every letter/CV page, initially and after LibreOffice save/reopen.

The full unit suite ran with Bun 1.4.2 `--isolate`: shared-global execution encountered an existing legacy test/mock lifetime issue and exited before its summary. The isolated run completed all 168 files. Stable LibreOffice, Word editing and approved snapshots remain pending; Gates 5/6 remain open.

## Continued checkpoint from `246997e`

Per-part paper colors and solid/vertical-gradient chrome bands now use shared declarative paint rectangles. Tiny sRGB PNGs contain no user text. The existing native picture primitive anchors them behind editable content, and known header stories own their image relationships. Fill assets are reused; first/default headers and continuation pages retain the correct logical part's paint. The old paragraph-only solid shading and pending paper/gradient blockers were removed. Custom cover/CV elements remain explicitly unmapped.

Signed chrome offsets now become native section distances around the descriptor's 16/12 mm header/footer baselines. Body reservations use actual custom font sizes and conservative line/wrap estimates. Recipient offsets become an exact flowing spacer around a 12 mm baseline before the known recipient group. The full normalized signed range is supported without negative page distances or text boxes. These Word-oriented baselines differ from browser transforms; manual Word editing of extreme running chrome remains pending.

Seven new fixtures cover independent paper with photos, gradient chrome, long painted letter/CV and negative/zero/positive offsets. All 41 fixtures pass ZIP/XML/story relationships, text/media/page/bounds checks, LibreOffice conversion and DOCX save/reopen. QA samples page paint colors on every page and verifies actual signed movement before/after save/reopen. Colored long-letter and long-CV dossiers have 12/13 pages with content on every page; the larger running chrome reservations account for their extra pages. Candidate images were inspected.

The expanded browser smoke passes colors/offsets through portable JSON and independent Next export, while retaining the combined production PDF. Automation now waits for the formatting toolbar's canonical field key before clicking, preventing a stale selection from formatting the previous field. The final renderer generates byte-identical output for all 41 validated fixtures after cleanup. Typecheck/build pass; lint has 0 errors/21 existing warnings; 767 isolated unit tests and 65 targeted Next tests pass. Stable LibreOffice, Microsoft Word and approved snapshots remain pending; Gates 5/6 remain open and 0/39 migrations are accepted.

## Continued checkpoint from `50b02d4`

Cover uppercase, em tracking and line height are resolved before rendering. Native `w:caps` preserves the original editable Unicode text; tracking uses the final user-selected font size unless an explicit point override exists. Rich cover segments retain canonical field identity, color and emphasis. Native paragraph/run formatting carries these settings without text replacement or post-render patches.

Cover lists now use one flowing native paragraph per nonempty source item. A central semantic numbering plan assigns counters before XML: separate cover lists, letter lists and table-cell lists restart independently; contiguous letter items share a group. List markers inherit the item's font, size and color through paragraph-mark properties. Missing/mixed semantic groups fail explicitly. The 55-item cover fixture flows across two cover pages, followed by the letter and CV.

Seven new fixtures cover Unicode casing/emphasis, short/long native lists, tracking and line-height comparisons. All 48 fixtures render across 235 pages and survive LibreOffice DOCX save/reopen. Render QA measures known probe character bounds because native tracking can add spaces to PDF extraction. Tracking expands the probe from about 131 to 201 points, including save/reopen; double line spacing increases the baseline gap. The QA comparison paths were corrected to use actual saved-PDF folders and require their presence when both initial probes exist; signed chrome offsets were rechecked after save/reopen as well.

The expanded editor smoke preserves cover casing/tracking/line-height/list settings through portable JSON and independent Next export, and production combined PDF export still passes. All 773 isolated unit tests and 71 targeted Next tests pass; typecheck/build pass and lint reports 0 errors/21 existing warnings. Candidate pages were visually inspected. Stable LibreOffice, Microsoft Word editing and approved snapshots remain pending; Gates 5/6 stay open and 0/39 migrations are accepted.

## Continued checkpoint from `10f4ed6`

Saved custom cover/CV text now uses stable semantic identity before rendering (`cover.<saved-id>`, `cv.element:<saved-id>`). Repeated values preserve independent typography through native runs, renaming, reload and portable JSON. The floating CV element editor and preview share canonical identity; browser QA exposed that the format toolbar previously excluded this editor because it sits outside the main panel. It now accepts explicitly identified canonical controls there, while leaving unmarked controls outside the panel excluded.

Shared `elements.ts` maps text to editable paragraphs in splittable one-cell flow boxes with source width/indent, fill, padding and borders. Uploaded pictures retain canonical normalization/framing; a text element with a background picture becomes an inline native picture followed by editable caption text. Source Y determines reading order, not an absolute text position, and fixed source height remains metadata. Rounded text cells use rectangular native borders. CV page-2 elements share one continuation break with page-2 sections; the zone starts after main Word flow, potentially on physical page 3 or later. Empty/hidden/disabled elements disappear cleanly.

`DecorativeShape` and `decoration.ts` describe/rasterize only nonsemantic rectangles, circles, lines and bounded M/L paths. Transparent sRGB assets retain opacity, outlines and gradient angle/stops and reuse identical paint across cover/CV. The single picture primitive anchors them behind known body content only in their logical zone. No user text is rasterized and no template-specific XML repair is added. Optional adapter failure reports omitted IDs, creates no orphan relationship and adds no artwork-only blank continuation page.

Visual review caught adjacent native tables merging in LibreOffice, causing one box to inherit another's width/border. The shared table primitive now emits a native paragraph boundary after every table. Model/package checks and rendered border-width checks cover independent boxes, including a narrow image/caption box followed by a wider text box; save/reopen repeats these checks.

Eight new fixtures cover short/long/repeated editable text, continuation placement, uploaded pictures/captions, shapes over white/colored paper, failed artwork and hidden/disabled elements. All 56 fixtures pass package, text/media/page/bounds checks and LibreOffice DOCX save/reopen across 273 pages. The expanded editor → rename/reload → portable JSON → Next/production PDF smoke passes, including custom CV controls. Candidate pages and editor exports were visually inspected. All 781 isolated unit tests and 79 targeted Next tests pass; typecheck/build pass and lint reports 0 errors/21 existing warnings.

Stable LibreOffice, Microsoft Word editing and approved snapshots remain pending; Gates 5/6 stay open and 0/39 migrations are accepted. The installed browser-verification CLI failed daemon startup even for `about:blank`; the existing scripted Playwright workflow completed the same local app checks with Chromium. No production DOCX switchover, legacy deletion, manual deployment or branch promotion occurred.

## Continued checkpoint from `b63a0af`

Brief now resolves its letter base font from `letter.design.font`, matching its native editor preview instead of implicitly inheriting the CV font. Letter role and canonical field overrides resolve before XML, including rich body/table text and running chrome. The app's existing shared dossier base-font synchronization remains intact. The browser regression selects a separate subject role font through the real editor, then verifies Verdana in Next alongside Times New Roman CV text after reload and portable JSON.

`fonts.ts` now owns registered families, explicit alternatives, family/pitch metadata and deterministic selection evidence in the canonical model. A supplied target-font list selects an available requested/alternative family before rendering; unknown families or absent alternatives fail explicitly. Without such a list, native Word fonts retain their requested family and documented alternate-name hints. The single renderer builds a central font table, explicitly disables embedding, creates no font payload/relationship and requires no font network service. An enabled-embedding policy is unsupported; its failure path is not claimed as implemented.

The reproducible font inventory covers all 39 selectable templates, eight app keys and four distributed Cabin faces. Two retired templates remain registered for old projects. The local OFL license and OS/2 fsType=0 are recorded with hashes; embedding remains disabled pending a separate implementation and Word acceptance. The mapping/fallback/ownership policy is documented in `fonts.md`.

Five new fixtures cover mixed fonts, eight unavailable primary faces, long letter/CV and offline disabled embedding. All 61 Brief fixtures pass package integrity, text/media/page/bounds checks, LibreOffice conversion and DOCX save/reopen across 307 pages. The unavailable-font PDF probes verify actual selected families before and after save/reopen. Restoring Brief's real default font changes four older long-letter/column candidate counts, which were visually inspected. Column chrome QA now uses explicit logical-part page ranges, rather than assuming the CV immediately follows the paragraph after the columns; closing/signature/attachments can legitimately continue to another letter page.

All 793 isolated unit tests and 91 targeted Next tests pass; typecheck/build pass, lint has 0 errors/21 existing warnings. The real browser editor/JSON/Next smoke and production combined PDF download pass. All pages of the five new font fixtures and the final editor Next/PDF exports were inspected. Production PDF still uses its existing mixed text/image export policy; user-positioned cover elements may overlap existing cover content, as before this isolated Next change.

The QA engine is LibreOfficeDev 26.8 alpha, not a stable release. Windows/macOS Word, installed/unavailable-font editing behavior and approved snapshots remain pending; Gates 5/6 stay open and 0/39 migrations are accepted. No new template, sidebar, switchover, legacy deletion, deployment or branch promotion was enabled.

## Continued checkpoint from `d008362`

Brief now maps aligned personal information, colons, paired references, shared rubric offsets/body indents/badges, the portable section gap and three letter separator toggles. All use native paragraphs, runs and tables through the existing single renderer. Known chrome-owned contact fields are pruned from aligned cells before XML, including empty tables/orphan rules. Short heading rules are a generic semantic block aligned with the heading independently of the body indent. No template-specific renderer, XML patch or legacy dependency was added.

Visual inspection exposed short entry descriptions moving away from their metadata at a page boundary. Entry metadata now uses `keepNext` through the description start; the final paragraph remains splittable. Standard long-CV and photo-long-CV fixtures consequently use 12 pages rather than 11. The new combined settings fixture has 18 pages, and an oversized single-entry fixture has 6. Render QA checks description attachment before/after save/reopen, aligned values, paired/stacked references, offset/gap positions, native badges and rule lengths. Converter output and user profiles use isolated temporary directories; stale QA output cannot satisfy an export check.

All 803 isolated unit tests and 101 Next tests pass. Typecheck/build pass; lint has 0 errors/21 existing warnings. All 71 independent fixtures pass structural/render/save-reopen checks across 358 pages. The actual browser verifies portable section-gap/presentation settings, semantic formatting, JSON load/save and independent export; its Next PDF has 5 pages and production PDF 4, with edited native CV/custom text retained. Representative final presentation, overflow and 65-entry/long-reference pages were visually inspected. A Word review pack contains four current DOCX files and candidate renderings (30 pages), plus the manual checklist and explicit coverage gaps.

Microsoft Word, stable LibreOffice and approved snapshots remain pending. Alternate classic variants, continuation-only CV geometry, free positioning acceptance and anonymous historical field binding still need closure. Modern/sidebar and the other 38 templates are later gated work. Production stays on legacy DOCX until comparison/switchover succeeds; PDF and JSON remain functional. This checkpoint does not certify Gate 5/6 or a migrated template.

## Continued checkpoint from `a4690bd`

Standard, Luftig, Timeline and Magazin now map to shared configurations in `layouts.ts`; the snapshot preserves the chosen variant. Modern and retired Executive normalize to an explicit sidebar request rather than silently becoming Standard. Native fixed date tracks retain semantic field identity, including custom and half-width sections. Timeline borders belong to each entry; absolute browser axes/dots are omitted. User spacing and rubric offsets compose with the layout configuration. No additional template or renderer was registered.

Real rendering exposed a detached table entry title. Native `cantSplit` now keeps short dated rows together; oversized entries still flow across pages. Long Timeline/Magazin dossiers have 14 pages, including a 200-repeat description; Luftig has 15. Native date widths, metadata/description attachment, Unicode, media and half-width content survive LibreOffice save/reopen.

Snapshots now capture continuation top margins explicitly. One native section uses the continuation margin; one first-page flow spacer preserves a larger initial margin. Empty header distance is zero so it cannot impose an unrelated body offset. Actual chrome keeps its first/default height reservation. The 0/10 mm stress cases have 11 pages; 40 mm and chrome cases have 12. A continuation margin larger than the initial margin remains an explicit blocking model issue: automatic flowing Word sections cannot preserve that smaller first-page geometry.

All 811 isolated unit tests and 109 Next tests pass; typecheck/build pass and lint reports 0 errors/21 existing warnings. All 84 independent fixtures pass package/render/save-reopen checks over 468 pages. Browser QA verifies all four classic choices and both sidebar aliases through portable JSON and snapshot/model capture. The actual editor/PDF smoke passes: Next has 5 pages, production PDF 4, with renamed CV/custom text present and no empty pages. All four production PDF pages are pixel-identical to the prior `a4690bd` checkpoint. Six canonical-rendered Word-review examples (38 pages) were visually inspected; additional long/continuation and app PDF pages were reviewed. The review pack contains these editable DOCX candidates, PDFs/PNGs and the pending Word checklist.

Gates 5/6 remain open. Windows/macOS Word, stable LibreOffice, approved references, older anonymous typography bindings and accepted Word flow adaptations remain outstanding. Modern/sidebar, other visual templates, production switchover and import-audited legacy deletion remain later gates. Normal PDF/JSON and legacy DOCX production paths are unchanged; only `dev` was modified.
