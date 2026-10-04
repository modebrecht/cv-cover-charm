# DOCX Next stabilization — 2026-10-04

Freshly fetched starting `dev` HEAD: `d664317b8c67b8af41d593571feb272bf78b0838`.
The final commit is the Git revision containing this report; the downloadable review manifest records its exact SHA. Work stayed on `dev`. No `main`/`render` changes, branch promotion, manual deployment, production DOCX switchover or Legacy/V2 removal occurred. **1/39 configured candidates; 0/39 Microsoft-Word-accepted migrations.**

## P0: application regression

The original CI dossier-flow failure was real and reproducible: the measured long Letter exceeded its physical content area. Measurement probes lost template and user typography because CSS used a physical export-page marker that probes deliberately remove. The permanent `data-letter-canvas` styling hook and an in-canvas height sandbox restore the same typography for measurement and actual pages. The overflow guard remains unchanged. [Exact error, geometry and classification](dossier-flow-regression.md).

## Architectural changes

- Neutral authored source DTOs and an explicit historical PDF-type adapter exclude top-level measured/print state. The [field audit](source-boundary.md) distinguishes saved design intent from browser pagination.
- Cohesive cover composition and continuation-margin policy leave dossier orchestration in `build-model.ts`.
- Generic native text/paragraph/list primitives leave one renderer entry point and one package architecture. No template-ID rendering branches or template-generated OOXML were introduced.
- Explicit typography bindings protect canonical IDs, reject conflicting records and merge compatible independent properties. Visible values never resolve styles.

## Brief gaps and unsupported behavior

Native cover/custom-text opacity now composites editable ink against declared solid paper/cell fill instead of silently disappearing. An exact rendered color probe survives LibreOffice save/reopen. A native image-alpha experiment was ignored by LibreOfficeDev; that implementation was rejected. Authored semantic image opacity now remains in the model and blocks export, including the diagnostic override path, rather than silently becoming opaque.

All model issues block normal candidate rendering. Invalid/unknown fonts and enabled embedding remain explicit failures; requested/available fallback-font behavior is tested. Continuation 0/10/40 mm, real chrome reservation and larger-than-first rejection retain their tested generic policy. Existing free-position requests remain blocked: absolute browser text geometry is not imported into Word. Anonymous styles with known saved-key bindings are supported; ambiguous records still need deliberate user/data migration. No visible-text guess is made.

Remaining unsupported: ambiguous anonymous typography, free CV section positioning, continuation margin larger than first-page margin, translucent semantic images, enabled font embedding, Modern/sidebar and all 38 unregistered templates. Documented native flow adaptations still require human product acceptance. Legacy remains the production DOCX exporter; PDF and portable JSON remain functional.

## Validation

| Check                                            | Result                                                                                                                                                            |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolated unit suite                              | 818 passed, 0 failed; 175 files; 13,697 assertions                                                                                                                |
| Targeted DOCX Next                               | 116 passed, 0 failed; 13 files; 802 assertions                                                                                                                    |
| TypeScript                                       | Passed                                                                                                                                                            |
| ESLint                                           | 0 errors; 21 existing warnings                                                                                                                                    |
| Production build                                 | Passed                                                                                                                                                            |
| Release formatting and changed source formatting | Passed                                                                                                                                                            |
| dossier-flow                                     | 70 passed, 0 failed (4.3 minutes), including the added typography-probe regression                                                                                |
| Additional browser/PDF checks                    | 16 passed; all five V2 shadow checks, real physical-overflow rejection, adversarial/rich PDF and dossier end-to-end                                               |
| Browser/editor smoke                             | Passed: real controls, independent repeated-value/CV/custom/chrome styles, edit/rename/reload, JSON save/load, Next DOCX export, production combined PDF download |
| Independent structural/render fixtures           | 85 passed; 472 pages; normalized PNG/RGB/ICC/CMYK/EXIF/large images and corrupt-input rejection                                                                   |
| LibreOfficeDev conversion and DOCX save/reopen   | 85/85 passed, including package/text/page/column/bounds checks                                                                                                    |
| Stable LibreOffice                               | Pending: 25.8.7.3 version query passes; first representative conversion exits 1, no output; 0/12 converted                                                        |
| Microsoft Word                                   | Pending; no Word environment available                                                                                                                            |
| Approved visual references                       | Pending; all generated PDFs/PNGs remain candidates                                                                                                                |

Counts are this checkpoint's observations, not permanent expected totals. Targeted tests are included within the full unit suite. The additional browser run overlaps dossier-flow's V2 cases; totals must not be added as unique tests. Scripted Playwright/headless Chromium 140 was used because the browser CLI daemon could not start here. No test was removed, skipped or weakened.

## Word review readiness and gates

The review package contains twelve validated editable DOCX cases and matching candidate PDFs: normal dossier, long Letter, long CV, oversized Timeline, Magazin/half-width, ICC photo, custom elements/images, rich lists/tables, long columns/chrome, continuation margins, styled chrome and native text opacity. It includes hashes, source SHA, automated evidence, a blank review ledger and the [complete Word checklist](word-smoke-test.md). Representative cover/Letter/CV/Timeline/Magazin/continuation/column pages were inspected for obvious visual defects; this does not approve visual baselines or Word behavior.

| Gate                         | Criterion                                                | Status                                         |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 5 — Brief product acceptance | Machine prerequisites for supported Brief configurations | Complete; unsupported choices explicitly block |
| 5                            | Microsoft Word acceptance                                | Pending                                        |
| 6 — Real render QA           | Structural QA                                            | Complete                                       |
| 6                            | LibreOffice render/save-reopen                           | Complete on the recorded development build     |
| 6                            | Stable LibreOffice                                       | Pending; native runtime conversion fails here  |
| 6                            | Approved visual references                               | Pending                                        |
| 6                            | Microsoft Word                                           | Pending                                        |

Brief is ready for **human Word review of supported configurations**, not accepted as migrated. The architecture is ready to be stressed with Warm/Prism/Human configuration and independently tested missing generic primitives, after the outstanding acceptance decisions. Do not start another migration phase solely because automation is green. Reasons to pause acceptance/release: no Microsoft Word evidence, no approved references, no successful stable conversion and the explicit unsupported settings above. No further template migration was started in this run.
