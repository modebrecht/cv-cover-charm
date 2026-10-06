# Sidebar body attachment — native ownership checkpoint

Continued by the [independent native floating-table checkpoint](sidebar-floating-status.md): short side content preserves attachment, but long side content still postpones the main flow. The positioned-table experiment is explicitly blocked from normal export.

Starting remote `dev`: **`73423cdaf05bf5eb17486617e95583130dc46aa9`**, freshly fetched and verified against a clean checkout. This continues the [heading/metadata prefix checkpoint](sidebar-heading-prefix-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

The native multi-cell row context contributes to the remaining attachment failure. A matched 24-case matrix compares six authored page boundaries in four structures: the existing grid, the same grid without vertical cell merges, a single-column native table at the same main-track position, and ordinary native body flow using the same text lane.

Each structure contains exactly the same five semantic paragraphs: heading, date, title, place and oversized description. Every paragraph property, run, ID, attachment flag and source order is identical. The heading and three metadata paragraphs have `keepNext: true`; the description has `keepNext: false` and remains one flowing native paragraph. The entire description survives in all 24 cases. Neither text segmentation nor a page measurement is used to build the models.

Native single-column table and body-flow controls attach all five opening fields at all six boundaries, before and after save/reopen. The multi-cell controls can split the metadata itself; removing vertical cell merges does not improve their results. Rendered metadata X positions and glyph widths match across all four structures, also after save/reopen. Equal model geometry alone is therefore not the basis for this comparison.

The following tuples give the CV page of **heading, date, title, place, description opening**, in that order:

| Authored lead | Multi-cell grid / unmerged grid | Single-column table / body flow |
| ------------- | ------------------------------- | ------------------------------- |
| 220 mm        | 1, 1, 1, 1, 2                   | 2, 2, 2, 2, 2                   |
| 224 / 226 mm  | 1, 1, 1, 2, 2                   | 2, 2, 2, 2, 2                   |
| 228 / 230 mm  | 1, 1, 2, 2, 2                   | 2, 2, 2, 2, 2                   |
| 234 mm        | 2, 2, 2, 2, 2                   | 2, 2, 2, 2, 2                   |

This is evidence that native paragraph attachment works in the matched single-column contexts and fails in the multi-cell context in the available engine. The precise LibreOffice implementation cause remains an inference, not an identified source-code defect. These neutral controls contain an empty opposite track; they do not establish support for an independently flowing populated Sidebar, photos or running headers.

## Rejected attempts and retained work

Putting the complete heading/entry into one nested row, adding an independent nested flowing table, and moving semantic content controls from paragraph scope to run scope did not solve the multi-cell boundary set. Atomic nested rows also showed an unexpected pagination change at the tightest boundary. These model/renderer experiments were reverted. No new production primitive is accepted from them.

The retained work is diagnostic only:

- `tests/fixtures/docx-next/sidebar-body-attachment.ts` declares the matched ownership matrix and explicit field/page expectations. Ownership changes retain the same main-track text width and physical position.
- `scripts/docx-next-body-attachment-probe.ts` verifies complete paragraph equality, lane equality, model immutability and byte-identical native packages after JSON roundtrip.
- `scripts/docx-next-body-attachment-qa.py` checks package structure, owning-lane full text, each opening field's actual page, the earliest occurrence of the repeating description opening, text bounds and matching metadata glyph geometry. It uses fresh converter profiles and checks DOCX save/reopen. Expected counterexamples stop being accepted automatically if their outcome changes.
- Two unit tests protect the isolation contract and all 24 deterministic native model/package roundtrips.

No file under `src/`, template descriptor or default application export changes. The earlier generic prefix remains opt-in. The mirrored-picture guard stays active. No template-specific rendering, visible-text renderer matching, semantic rasterization or exported-package repair is introduced.

## Validation and limits

- **24 ownership controls / 240 dossier pages:** package, full text, lane geometry, render and save/reopen gates pass with **14 attached controls and 10 documented counterexamples**. Those counterexamples are product blockers, not accepted behavior.
- **19 prior prefix diagnostics / 115 pages:** fresh package/render/save-reopen repeats the two earlier expected description failures. All 19 source packages remain byte-identical to the starting checkout.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes; all 31 source packages remain byte-identical under the same explicit image adapter.
- **24 native model JSON package roundtrips**, **31 immutable Sidebar model roundtrips**, mirrored-photo rejection, **two actual portable project/photo restorations**, seven Python flow tests, Python compilation, formatting and whitespace checks pass.

Local engine: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`, supplied CLI. Pinned stable 25.8.7.3 and Microsoft Word were unavailable. Supported Sidebar images use explicit Pillow normalization; the browser decoder was not repeated locally. [Machine evidence](sidebar-body-attachment-evidence.json) records the limits and per-case results.

The offline dependency cache is not the frozen-lock installation and Bun is unavailable locally. Commit-specific publication CI supplies the full Bun suite, locked TypeScript/lint/build and browser/PDF/dossier regressions; the final result is reported separately. No manual deployment, branch promotion or production DOCX switchover is part of this block.

## Reproduce

```sh
bun scripts/docx-next-body-attachment-probe.ts /tmp/docx-next-body-attachment
python scripts/docx-next-body-attachment-qa.py /tmp/docx-next-body-attachment --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

Use `--libreofficekit /path/to/lo-kit --require-stable` for pinned stable comparison when available. Outcome changes require review; they never unlock application support automatically.

## Exact next task

Prototype a **generic composition of independently flowing native main and side containers**, starting from the successful one-column main control. Keep its heading, metadata and description in native paragraph flow. Determine how a separately positioned native side container handles short and multi-page side content without putting the main flow back into a shared multi-cell row. Use the same declarative track definitions for both orientations and every template. Require the six boundary controls, long-both-tracks, photo opening flow, headers, insets and save/reopen before enabling an application path. Keep all current guards and do not begin template migration. A pinned stable comparison of this matrix remains pending; unavailable Word does not block candidate development.
