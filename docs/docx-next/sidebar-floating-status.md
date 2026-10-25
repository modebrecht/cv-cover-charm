# Sidebar independent native flow — floating-table checkpoint

Continued by the [native paragraph-frame early-stop checkpoint](sidebar-frame-status.md): short frames work, but long frames hide 53 complete side fields in the available engine. Both independent-container experiments remain blocked from normal export.

Starting remote `dev`: **`058e4fc929401a75c8654a9e4abcb39692e4ad0d`**, freshly fetched and checked against a clean checkout. The starting commit's Dossier Regression CI is now confirmed successful, including all browser/PDF groups. Registry remains **29/39 configured candidates, 0/39 Word accepted**. This continues the [matched body ownership investigation](sidebar-body-attachment-status.md).

## Result

A separate native floating Sidebar table (`w:tblpPr`) beside ordinary native main paragraphs preserves the six critical heading/date/title/place/description openings. A short populated Sidebar also starts beside its main content on CV page 1 in either orientation. This is useful candidate evidence, but **does not solve generic Sidebar pagination**.

With a long Sidebar, the available LibreOffice engine postpones the main opening until the final Sidebar page. All expected text survives in its owning lane; the flows are still coupled through pagination. A continuous floating cell postpones the main to CV page 7. Splitting side content into actual semantic table rows postpones it to CV page 9; repeated native row padding also increases side pagination. Both orientations reproduce these counterexamples after native DOCX save/reopen.

| Diagnostic                                           | Cases | Dossier pages per case | Main / side opening CV page |
| ---------------------------------------------------- | ----- | ---------------------- | --------------------------- |
| Body-only boundary control                           | 6     | 10                     | 2 / absent                  |
| Short floating side at the same boundary             | 6     | 10                     | 2 / 1                       |
| Short main and side, either orientation              | 2     | 3                      | 1 / 1                       |
| Long side, either orientation                        | 2     | 9                      | 7 / 1 — blocker             |
| Long main and side, either orientation               | 2     | 17                     | 7 / 1 — blocker             |
| Long main and semantic side rows, either orientation | 2     | 19                     | 9 / 1 — blocker             |

The 20-case matrix renders **216 dossier pages**, with **six documented independent-flow counterexamples**. Boundary controls keep the same complete main paragraphs, IDs, runs, flags, order and text lane. Their rendered metadata X positions and glyph widths match body-only controls and survive save/reopen. They do not prove photo opening flow, running chrome or first/continuation margin support for this new architecture.

## Retained candidate and guard

`TableBlock.position` declares fixed physical-page X/Y and explicit width, with no fixed height. One generic renderer serializes native table positioning directly from this model. Nested positioned tables, missing width, nonzero indentation, nonfinite coordinates and page-edge overflow are rejected. This has no template-ID branches, text lookup, semantic rasterization or exported-package repair.

**Every positioned table is rejected by default**, including a model restored from JSON with an empty issues list. Only the existing `allowUnacceptedModelIssues` diagnostic option permits serialization. This is an unaccepted experiment, not an application composition: no builder, template descriptor or normal export uses it. Experimental packages explicitly allow wrapped tables to break across pages. Models without positioning retain their original package bytes.

Microsoft's primary [table-position specification](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tablepositionproperties?view=openxml-3.0.1) describes the following ordinary paragraph as the logical anchor; the [wrapped-table compatibility setting](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.donotbreakwrappedtables?view=openxml-3.0.1) controls page splitting. Those contracts do not establish that the available engine implements the desired independent flow. The precise engine cause remains unproven.

## Validation and limits

- **20 diagnostics / 216 pages:** package integrity, complete owning-lane text, expected opening pages, boundary glyph geometry, native rendering and save/reopen pass as diagnostic gates; six negative outcomes remain product blockers.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes. All 31 source packages are byte-identical to the starting checkpoint under the same explicit image adapter.
- **20 immutable native model JSON package roundtrips**, **31 Sidebar model roundtrips**, mirrored-picture rejection, **two actual portable project/photo restorations**, seven Python flow tests, Python compilation and formatting/whitespace checks pass.
- Three new units cover the default rejection, geometry/nesting rejection and the full deterministic native package matrix. They are included in `test:docx-next` and the full publication suite.

Local engine: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Stable 25.8.7.3 and Microsoft Word were unavailable. Supported photos use explicit Pillow normalization; the browser decoder was not repeated locally. The offline dependency cache is not the frozen-lock installation, and Bun is unavailable. Local TypeScript reports no diagnostics in the changed files but fails on cache dependency mismatches elsewhere; locked units/TypeScript/lint/build and browser/PDF/dossier regressions therefore come from commit-specific publication CI, reported separately. [Machine evidence](sidebar-floating-evidence.json) records the actual per-case results.

No production DOCX switchover, manual deployment, branch promotion, Legacy deletion or template migration is part of this block. Existing picture/span and other Sidebar guards remain active.

## Reproduce

```sh
bun scripts/docx-next-floating-probe.ts /tmp/docx-next-floating
python scripts/docx-next-floating-qa.py /tmp/docx-next-floating --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

Use `--require-stable` when a stable engine is available. Changed diagnostic outcomes require review and never unlock application support automatically.

## Exact next task

Prototype a separate **native paragraph-frame side container** (`w:framePr`) with automatic height, retaining the successful ordinary main flow and declarative physical track widths. This is a new generic primitive hypothesis, not accepted behavior. Start with short and long side content in both orientations; require both meaningful main and side openings on CV page 1, all owning-lane text and save/reopen. Stop the experiment early if multi-page frame flow fails. Only after those structural controls pass, extend to the six attachment boundaries, long-both-tracks, photo opening, chrome and insets. Stable-engine comparison remains useful but does not block candidate development. Keep all current guards and do not start template migration.
