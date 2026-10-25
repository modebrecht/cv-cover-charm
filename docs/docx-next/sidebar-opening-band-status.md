# Sidebar opening band — bounded feasibility checkpoint

Subsequent checkpoint: [Heading/entry attachment](sidebar-heading-attachment-status.md) isolates the single-entry controls and the additional oversized-heading gate. The evidence below remains historical.

Starting remote `dev`: `426133e6d0d80fcb94959453e2b95f2cd33a2cb7`, freshly fetched and verified. A new clean checkout has the exact remote Git tree. The Sidebar implementation history from shared semantic rows through image zones, portable/editor evidence and the picture/span guard was reviewed before editing. Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

The documented opening-band proposal is **not accepted**. Moving the picture, title, name and first authored main section into an unmerged opening band brings those fields onto the first CV page. The first school entry still moves to the second CV page, leaving a large empty lower body region. The fields survive in the document; this is a native pagination failure, not missing source mapping or only a missing acceptance fixture.

Four bounded variants fail the same continuation expectations before and after save/reopen:

| Opening/continuation container | Rail continuation                    | Opening fields | First continuation entry |
| ------------------------------ | ------------------------------------ | -------------- | ------------------------ |
| One native table               | Vertically spanning cell             | Pass           | Detached                 |
| One native table               | Semantic rows without vertical spans | Pass           | Detached                 |
| Two independent native tables  | Vertically spanning cell             | Pass           | Detached                 |
| Two independent native tables  | Semantic rows without vertical spans | Pass           | Detached                 |

Every specimen has four dossier pages, with two CV pages. A supported unmirrored photo control passes all six initial and continuation field expectations before and after save/reopen. The additional school-field checks therefore detect the regression without imposing an expectation that the existing supported short case cannot satisfy.

This disproves acceptance of these four particular opening-band compositions in the recorded engine. It does **not** establish that native Word Sidebar composition is impossible, that vertical merging is the sole cause, or that a reusable renderer primitive has already been identified. The nonspanning failures mean simply replacing `vMerge` cannot be claimed as the fix. Long and running-header experiments were deliberately not started because the required short case failed.

## Retained work

`scripts/docx-next-opening-band-probe.ts` uses explicit semantic block boundaries to build neutral native-table specimens through the existing generic primitives and the single renderer. It preserves paragraph, image and entry identities and supplies an independent supported control. It never changes the application guard or claims a supported mirrored Sidebar export.

`scripts/docx-next-opening-band-qa.py` checks both source and saved packages, requires opening fields to pass, then requires both first continuation fields to reproduce their exact body-track detachment. It verifies preservation of all semantic text, records the converter version and writes first-CV-page PNGs. An unexpected pass stops for acceptance review. Every conversion uses fresh profiles and outputs.

The existing strict package validator was moved unchanged into `scripts/docx_next_package_qa.py` so both render and diagnostic QA use it. Its function AST is identical to the starting implementation. A fifth Python opening-flow regression test covers an opening band that passes while its following entry is detached.

No application model, Sidebar composition, Word renderer or template registration changed. No template-specific branch, visible-text resolver, page measurement, semantic rasterization, repair pass or Legacy dependency was added. The picture-before-later-span rejection remains active. Generic template/layout orthogonality is unchanged.

## Validation and limits

- **31 supported Sidebar fixtures / 253 pages:** complete native package, semantic/track text, entry attachment, image/frame geometry, bounds, render and DOCX save/reopen checks pass.
- **Four negative specimens:** package checks pass; both continuation fields reproduce detachment before and after save/reopen; every semantic field survives. The supported control passes all six body-track expectations.
- **31 immutable model/JSON roundtrips**, the mirrored-photo rejection and **two actual portable project/photo export–import–storage restorations** pass under Node assertions.
- **Five Python opening-flow tests**, Python compilation, changed TypeScript formatting and whitespace checks pass.

The local converter is **LibreOfficeDev 26.8.0.0.alpha0, `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`**, through its supplied CLI. Stable 25.8.7.3 and Microsoft Word were unavailable for this fresh session. Local supported fixtures used an explicit Pillow PNG adapter with unchanged authored fixture inputs; this does not repeat browser image-decoder acceptance or claim byte identity with the previous browser-generated packages. These qualifications are recorded in [machine evidence](sidebar-opening-band-evidence.json).

Bun and the exact frozen-lock dependency set were unavailable locally. Offline cache versions could run the native fixture/model assertions but could not provide a valid full application typecheck/lint/build result. The existing publication CI must supply the full Bun units, locked TypeScript/lint/build and dossier-flow, state/JSON and PDF/browser regressions. Its final commit-specific status is reported separately. No production DOCX switchover, manual deployment or branch promotion was performed.

## Reproduce

```sh
bun scripts/docx-next-opening-band-probe.ts /tmp/docx-next-opening-band
bun scripts/docx-next-opening-band-probe.ts /tmp/docx-next-opening-band --row-continuation
bun scripts/docx-next-opening-band-probe.ts /tmp/docx-next-opening-band --separate-tables
bun scripts/docx-next-opening-band-probe.ts /tmp/docx-next-opening-band --row-continuation --separate-tables
python scripts/docx-next-opening-band-qa.py /tmp/docx-next-opening-band --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
```

For the pinned stable runtime, replace the last converter option with `--libreofficekit /path/to/lo-kit --require-stable`. A different result requires review; it never automatically changes the application support policy.

## Exact next task

Reduce the detached continuation to **one native entry immediately after the opening band**, with photo/no-photo and right-rail/no-rail controls. Run that minimum specimen in the pinned stable LibreOfficeKit runtime and repeat save/reopen. Determine whether the remaining boundary belongs to nested picture/table flow, paragraph attachment or the native track container before adding a shared continuation primitive. Require the first entry to remain in its owning first-page body lane and require a continuous rail appearance. Keep the current guard until the short control passes; then test long-both-tracks and running-header/continuation cases. Modern Sidebar and further migrations follow only after that generic boundary is resolved. Word availability does not block this development work.
