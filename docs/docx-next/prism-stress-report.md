# DOCX Next Prism stress checkpoint — 2026-10-04

Freshly fetched starting `dev` HEAD: `4a397ca4f51728964503baed16c3ce278ee8506d`. The final source is the Git revision containing this report; the review package records its full source/QA SHA. One continuation commit: `feat(docx-next): add isolated Prism candidate with declarative motifs`. **3/39 configured candidates; 0/39 Microsoft-Word-accepted migrations.** Work stayed on `dev`; no `main`/`render` change, promotion, manual deployment, production DOCX switch or Legacy/V2 deletion. Human and subsequent templates were not started.

## Result and architecture

Prism is a third declarative descriptor in the existing architecture: explicit snapshot → neutral authored source → DossierDocModel → shared primitives → one unchanged Word renderer → WordPackage → structural/render QA. `template-motifs.ts` maps page-width-relative geometry and palette slots into the existing nonsemantic path primitive. Cover cells may group several canonical fields; native text/photos remain independently editable. Header cap geometry follows reserved chrome height and first/continuation scope. No template-ID condition entered the renderer, no XML postprocessing and no Legacy dependency were added.

The geometric stress exposed two reusable flow gaps. A filled badge built at full-page width did not fit its eventual native cell. Cover mapping now resolves the real cell width before composing its flow box; original authored geometry remains metadata and the renderer's overflow rejection stays intact. Long columns could leave only attachments on the next page. A configured short semantic closing/signature/attachment tail now uses native `keepNext`; oversized tails remain splittable. The actual original orphan-tail PDF fails the new check, while its corrected render/save-reopen passes.

Prism's default surface belongs to the descriptor; an automatically resolved browser chrome gradient is no longer mistaken for an explicit user background. Saved backgrounds/gradients still win. The source adapter imports no DOM/PDF rectangles or browser page assignments. Shared semantic contact/content and authored/default font/height values remain usable; [complete policy and limits](prism-feature-coverage.md). All 85 Brief and 13 Warm candidates regenerate **byte-identically** to the published Warm checkpoint.

## Regression and machine evidence

The original `dossier-flow` regression remains resolved: measurement probes previously lost typography/template CSS after stripping the export-page marker. Permanent canvas styling plus the in-canvas measurement probe restored the authored font and page capacity. Its test waits for saved long body, authored font and measured pagination; overflow assertions were not weakened. [Original exact assertion and root cause](dossier-flow-regression.md).

| Check                                | Current local result                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Isolated units                       | 838 passed, 0 failed; 177 files; 13,905 assertions                                                                                  |
| Targeted DOCX Next                   | 136 passed, 0 failed; 15 files; 1,010 assertions; subset of units                                                                   |
| Typecheck                            | Passed                                                                                                                              |
| ESLint                               | 0 errors; 21 existing warnings                                                                                                      |
| Production build                     | Passed                                                                                                                              |
| Release/changed-source formatting    | Passed                                                                                                                              |
| Broad formatting                     | Same 194 pre-existing warnings on starting/current source; 0 new warnings; broad check remains red outside this scope               |
| Browser dossier/PDF                  | 75 passed, 0 failed/flaky/skipped; all 70 dossier-flow plus five CV PDF text/selection checks; 286.922 seconds                      |
| Live Brief + Prism editor            | Real controls, rename/reload, independent styles, portable JSON save/parse/load, explicit snapshot and independent Next export pass |
| Existing production combined PDF     | Actual download and semantic-preview checks pass                                                                                    |
| Prism                                | 14/14 structural/render/save-reopen; 95 pages                                                                                       |
| Brief regression                     | 85/85 structural/render/save-reopen; 472 pages; exact prior DOCX bytes                                                              |
| Warm regression                      | 13/13 structural/render/save-reopen; 109 pages; exact prior DOCX bytes                                                              |
| Stable LibreOffice                   | 25.8.7.3 580(Build:3), official LibreOfficeKit; 112 fixtures / 676 pages                                                            |
| Negative controls                    | Original orphan tail, wrong polygon color, wrong header scope and insufficient paint correctly rejected                             |
| Microsoft Word / approved references | Both pending                                                                                                                        |

Structural checks validate ZIP/XML, required package parts/types/relationships and physical sections. Real render and save/reopen checks retain semantic text, page contracts, native columns/entry attachment, photos/media, bounds/overlap, paint scope, polygon color/opacity, header-ink coverage and attached letter tails. Six browser-normalized image inputs and corrupt-image rejection pass. New Prism page counts were characterized before freezing candidate contracts; no approved visual baseline was changed. [Exact hashes/runtime/results](prism-stress-evidence.json).

The browser CLI daemon again could not initialize; scripted Chromium 140 / Playwright 1.55.0 performs the complete editor/browser checks. The resumed environment lacked Chromium and had damaged/missing files in its old isolated LibreOffice runtime. Chromium was restored; two corrupt package archives were reacquired from the pinned Ubuntu snapshot and all 50 package/font hashes were verified before rebuilding a fresh stable runtime. The rebuilt adapter and package/font manifest hashes equal the prior recorded setup. No machine-global application, socket shim, binary patch or unpinned CI dependency was introduced. [Reproduction](libreoffice-qa.md). GitHub checks belong to the final commit and are reported independently; starting-head checks were all green.

## Acceptance package and gates

The separate Prism package contains fourteen editable DOCX files, fourteen candidate PDFs, all 95 candidate PNG pages, hashes, this evidence, source/flow policy, stable runtime/package/font inventories and a blank Word review ledger. All pages were inspected in contact sheets; readable photo/cover examples and the corrected color/tail cases were also inspected. This does not approve visual references or certify Microsoft Word behavior. Follow the expanded [open/edit/save/close/reopen checklist](word-smoke-test.md).

| Gate                         | Criterion                                          | Status                              |
| ---------------------------- | -------------------------------------------------- | ----------------------------------- |
| 5 — Brief product acceptance | Machine prerequisites for supported configurations | Complete; unsupported choices block |
| 5                            | Microsoft Word acceptance                          | Pending                             |
| 6 — Real render QA           | Structural QA                                      | Complete                            |
| 6                            | LibreOffice render/save-reopen                     | Complete                            |
| 6                            | Stable LibreOffice                                 | Complete: 25.8.7.3, public Kit API  |
| 6                            | Approved visual references                         | Pending                             |
| 6                            | Microsoft Word                                     | Pending                             |

No additional Brief-specific unsupported setting was enabled in this pass; its prerequisites and unchanged candidate bytes were reconfirmed. Brief, Warm and Prism are ready for human Word review of supported configurations. The architecture has handled a third distinct descriptor and is ready for a deliberately scoped Human stress pass when authorized and consistent with acceptance gates. Stop here. Reasons to withhold product acceptance/production release: missing Microsoft Word evidence, no approved references, pending human approval of native flow/color adaptations, and explicit unsupported settings.

Remaining blockers: ambiguous anonymous typography, free CV section positioning, continuation margins above the initial margin, semantic image opacity, unknown fonts, enabled font embedding and Modern/sidebar. Other 36 templates remain unregistered and reject explicitly. No mass migration, silent Classic/sidebar substitution or production switchover is claimed.
