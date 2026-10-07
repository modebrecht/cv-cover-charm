# DOCX Next handoff — 2026-10-07

Verified implementation/QA source: `8059c16bc9d1bf403fada00e1bf649090ca51d84`. The exact-source replay helper is the successor `3f23bcdd6b21461b9243ae910ab6ba618cb3ba60`; production, renderer, model, templates and application exports remain identical. This handoff is a documentation follow-up. Work stays only on `dev`, with no promotion, force push or manual deployment. `main` remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; `render` remains `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`. Do not cherry-pick historical `2aa6c7c` again.

## Verified CI and validation

- [Stable run 37621549458](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549458), exact source `8059c16b`: both jobs complete successfully. LibreOffice 25.8.7.3 reproduces every committed diagnostic source package, full-text/bounds/opening result, Save/Reopen and explicit stopped plan with zero changed cases. Green diagnostics do not accept the negative product results.
- Its supported job freshly renders **31 existing Sidebar fixtures / 253 pages**, with the canonical browser decoder, six synthetic image inputs, browser decoration pixel checks and immutable portable input/model JSON package restoration including photos. Complete native/PDF text, geometry/images, expected pages/opening flow and actual Save/Reopen pass. All tagged field IDs survive stable native Save/Reopen; table captions disappear in all 31. [Actual supported evidence](sidebar-supported-stable-evidence.json).
- [Application run 37621549317](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549317), same exact source: 1007 unit tests across 214 files, format/type/lint/build and all eight browser groups pass. Lint has 21 existing warnings, zero errors. Latest documentation publication CI is checked separately.
- Local: **64 Python integrity/evidence tests** pass (43 populated evidence, seven stable comparison, eight supported summary, six native identity). Diagnostic executables preserve immutable model/JSON package identity and reject normal exports. Local Bun/full TypeScript success is not claimed; locked full checks come from CI.

## Actual bounded comparisons

| Comparison                                        | Actual cases | Dossier pages | Result                                                                                                                          |
| ------------------------------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Empty spanning side ending                        | 4            | 84            | No false/true effect; left main opening remains detached                                                                        |
| Lead row cantSplit                                | 4            | 84            | No true/false effect; left remains detached                                                                                     |
| Paragraph versus cell top padding                 | 2            | 44            | Right side opening regresses; two left cases unrendered                                                                         |
| 220 versus zero main lead                         | 4            | 84            | Zero lead attaches all five main fields in both orientations                                                                    |
| 205/210/215/220 mm lead window                    | 8            | 168           | Both pass at 205/210; left detaches description at 215/220 while right moves the whole opening to page 2                        |
| Tail versus opening-cell owner, opening row true  | 2            | 36            | Right loses complete PDF descriptions in both lanes and fails body bounds; left unrendered                                      |
| Tail versus opening-cell owner, opening row false | 2            | 36            | Exactly the same render/Save-Reopen failures as true; left unrendered                                                           |
| Direct versus inner-table side paragraphs         | 2            | 31            | Right inner table clips side description to 790/18,444 visible characters; main complete, openings/bounds pass; left unrendered |

Total: **28 actual diagnostic cases / 567 dossier pages**, each also rendered after Save/Reopen. The additional hour adds four cases / 67 pages. All source/saved native text fields survive these diagnostics; moved descriptions and nested side content lose complete visible PDF text. Stop plans and unrendered cases stay explicit. No accepted architecture or production repair follows from these results.

## Native identity finding

The read-only [local native audit](sidebar-native-identity-status.md) checks the 31 earlier supported packages and saves. Dev 26.8/soffice CLI preserves complete saved native text, but 11 photo cases lose 1,462 tagged fields and all 31 lose container captions. Source packages, input/model JSON and restored photos retain their IDs. This narrows prior green render claims: complete visible/native text alone did not establish every saved field/container identity.

The [exact-source browser package replay](sidebar-engine-replay-evidence.json) removes the adapter difference for `sidebar-photo-main`: source SHA-256 `60e8e210395f1715b92cefff606f9089c40da1f89c338edf1aa16e12675d2fd2`, copied unchanged from the completed supported job in [run 37622625200](https://github.com/modebrecht/cv-cover-charm/actions/runs/37622625200). Stable 25.8.7.3/LibreOfficeKit preserves 78/78 tags; Dev 26.8/soffice CLI preserves 51/78, losing 27. Both preserve complete native/PDF text, image and four pages after Save/Reopen, while losing two table captions. No image renormalization or source package patch occurs. The different verified runtime combinations behave differently; the engine/interface cause is unproven.

The native identity audit is now independent of text/layout gates and stays explicitly blocked for lost captions. Experimental Sidebar gates remain closed. Counts stay **29/39 configured and 0/39 Word accepted**; Microsoft Word and approved snapshots remain pending. There are no production renderer, model builder, template or export changes.

## Next bounded task

Build a minimal native picture/field identity control in ordinary body flow, a one-cell table and mirrored two-cell tables, using the same complete paragraphs, canonical picture ID/source/crop/frame and zero-inset geometry. Avoid nested photo zones in the first control. Check complete native/PDF text, every source field ID after native Save/Reopen and picture geometry with both runtime/interface combinations. This isolates picture/cell context without relying on template details or a long boundary specimen; stop immediately on text, identity or geometry regression. Container-caption preservation remains a separate unresolved identity requirement.

The original left long-opening failure also remains unresolved. Do not infer a universal lead threshold, combine flags into a claimed repair, split semantic descriptions, patch XML, add template renderer branches or enable production export.

Key files: [splittable owner status](sidebar-split-description-owner-status.md), [inner side status](sidebar-nested-side-status.md), [native identity status](sidebar-native-identity-status.md), [stable supported status](sidebar-supported-stable-status.md), `scripts/docx-next-populated-row-qa.py`, `scripts/docx-next-native-identity-qa.py`, `scripts/docx-next-supported-summary.py` and `scripts/docx-next-engine-replay.py`.

Before continuing, fetch the actual current remote `dev`, confirm its head and a clean tree, read `AGENTS.md`, and inspect exact-commit CI. Published checkpoints are evidence, not assumptions about the latest remote head. Every commit in this block is published with an identical local/remote source tree; the final clean head is reported after the documentation publication and its application CI.
