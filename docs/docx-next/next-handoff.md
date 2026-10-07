# DOCX Next handoff — 2026-10-07

Experimental source revision: `e7e03c2668b7e2ed728d34d746d32a78b38ba982`, published on `dev` with an identical local/remote tree and no unpublished work. This handoff and its links are a documentation-only follow-up; production and QA sources remain identical to that verified revision. Work stays on `dev`; no promotion, force push or manual deployment. `main` and `render` retain their prior heads. Do not cherry-pick the historical `2aa6c7c` publication again.

## Verified CI

- [Stable Sidebar run 37615545128](https://github.com/modebrecht/cv-cover-charm/actions/runs/37615545128): completed successfully on the exact source revision. Verified LibreOffice 25.8.7.3 reproduces all committed source packages, visible text/bounds/opening results and Save/Reopen with zero changed cases, including both stopped regressions. Green diagnostics do not accept those product failures.
- [Application run 37615545185](https://github.com/modebrecht/cv-cover-charm/actions/runs/37615545185): completed successfully on the same source revision. All 1007 unit tests across 214 files, format/type/lint/build checks and all eight browser groups pass. Lint retains 21 existing warnings and zero errors.
- Local: 36 evidence tests and seven stable-comparison tests pass. Probe executables preserve immutable model/JSON package identity and reject normal exports. Local Bun/full TypeScript success is not claimed; locked full application checks come from CI.

## Actual bounded experiments

| Comparison                                 | Actual cases | Dossier pages | Result                                                                                                                |
| ------------------------------------------ | ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Empty spanning side ending                 | 4            | 84            | No observed false/true effect; left main opening remains detached                                                     |
| Lead row cantSplit                         | 4            | 84            | No observed true/false effect; left remains detached                                                                  |
| Paragraph versus cell top padding          | 2            | 44            | Right side opening regresses; two left cases unrendered                                                               |
| 220 versus zero main lead                  | 4            | 84            | Zero lead attaches all five main fields in both orientations                                                          |
| 205/210/215/220 mm lead window             | 8            | 168           | Both orientations pass at 205/210; left detaches description at 215/220 while right moves the whole opening to page 2 |
| Tail versus opening-cell description owner | 2            | 36            | Right loses complete PDF descriptions in both lanes and has one body-bounds failure; two left cases unrendered        |

Total: **24 actual diagnostic cases / 500 dossier pages**, each also rendered after Save/Reopen. Stop plans and unrendered cases remain explicit. All generated native source/saved fields survive. The moved-description counterexample loses visible PDF text despite complete native fields; this distinction is mandatory.

The [31 existing supported Sidebar fixtures / 253 pages](sidebar-supported-refresh-evidence.json) are freshly rerun with native package, complete text, pages, images, bounds and actual Save/Reopen checks. All 31 input/model JSON restores retain byte-identical native packages, including photo frames. Six synthetic images use an explicit Pillow EXIF/ICC/sRGB adapter with the canonical fixture/manifest generator body. Browser image decoder and decoration pixel checks were not rerun locally. This refresh and the diagnostic cases together cover 55 native cases / 753 initial pages, also rendered after Save/Reopen; visual snapshot approval remains pending.

Local renderer: LibreOfficeDev 26.8.0.0.alpha0. The new diagnostic observations additionally have the pinned stable comparison above. Production renderer, model builder, template descriptors and application exports are unchanged. Experimental Sidebar export gates stay closed. Counts remain **29/39 configured and 0/39 Word accepted**; Microsoft Word verification remains pending.

## Next bounded comparison

Use the original 220 mm main paragraph lead and compare main description ownership while the opening row is explicitly splittable in **both** controls. The original tail-cell/false-row package has a positive right control in the [short-row evidence](sidebar-row-together-status.md). This holds the false flag constant and isolates moving the same complete description paragraph into the opening cell, without an oversized cantSplit row.

Keep all three rows, side owner/span/text, widths, every semantic ID and paragraph flag, and main-only empty-ending attachment unchanged. Right controls run first. Require complete native/PDF text, correct body/lane bounds, five-field opening attachment and unchanged Save/Reopen. Stop immediately on a right regression; retain actual evidence and label unrendered left cases. Do not infer a universal lead threshold, patch XML, add template renderer branches or enable production export.

Key files: [current owner status](sidebar-description-owner-status.md), [owner evidence](sidebar-description-owner-evidence.json), [lead window](sidebar-lead-window-status.md), `tests/fixtures/docx-next/sidebar-description-owner.ts`, `scripts/docx-next-description-owner-probe.ts`, `scripts/docx-next-populated-row-qa.py` and `scripts/docx-next-populated-row-test.py`.

Before continuing, fetch the actual current remote `dev`, confirm its head and a clean tree, read `AGENTS.md`, and inspect exact-commit application CI. The handoff revision is evidence, not an assumption about the latest remote head.
