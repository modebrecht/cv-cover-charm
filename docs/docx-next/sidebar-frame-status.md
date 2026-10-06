# Sidebar native paragraph frames — early-stop checkpoint

Continued by the [native cell-ending checkpoint](sidebar-cell-ending-status.md): idle/all cell-ending attachment does not improve the opening and regresses the tightest tested boundary. That declarative diagnostic is blocked from normal export.

Starting remote `dev`: **`4502951df7be3857b584945b1a75c62077a5e008`**, freshly fetched and matched to a clean checkout. This follows the [independent floating-table investigation](sidebar-floating-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Result

Automatic-height native paragraph frames (`w:framePr`) keep short Sidebar and main text on CV page 1 in either orientation. Long Sidebar frames do not continue onto another page in the available LibreOffice engine: **53 complete Sidebar fields are absent from the PDF**, and **nine visible side-text spans exceed the body bottom boundary**. Source and saved DOCX still contain every declared field and its full original text. Reopening the saved DOCX repeats exactly the same missing field IDs and bounds.

| Structural control     | Cases | Dossier pages per case | Main / side opening | Missing complete side fields |
| ---------------------- | ----- | ---------------------- | ------------------- | ---------------------------- |
| Short side, left/right | 2     | 3                      | CV 1 / CV 1         | 0                            |
| Long side, left/right  | 2     | 3                      | CV 1 / CV 1         | 53 — blocker                 |

The **four controls / 12 rendered dossier pages** stop this architecture experiment early, as required by the preceding checkpoint. Passing the opening-page check alone would hide the clipped tail. No boundary/photo/chrome/inset matrix or application composition is built on this failed structural hypothesis. Word's behavior and the exact LibreOffice implementation cause remain unverified.

## Retained diagnostic primitive

`ParagraphFrameBlock` declares page-relative X/Y, explicit width and an ordered array of native paragraphs. It has no fixed height or page-height estimate. The generic renderer emits identical auto-height frame properties on adjacent native paragraphs. Inline content controls retain canonical field IDs without separating those paragraphs into different block wrappers. This follows Microsoft's primary [frame-properties contract](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.frameproperties?view=openxml-3.0.1); the contract does not establish multi-page acceptance.

**Normal export rejects every paragraph frame**, including a JSON-restored model with an empty issues list. The existing `allowUnacceptedModelIssues` option is required for these diagnostic packages. Invalid page geometry, narrow/empty frames, nested frames and paragraph indents outside the frame are rejected. `walkBlocks` includes the framed paragraphs, so semantic identity, typography and numbering validation still apply.

The neutral fixture reuses the preceding declarative main/side widths, paragraphs, runs, field IDs and source order. Side cell padding becomes the frame's physical text inset. Original section/entry wrappers and rail paint are outside this paragraph-only structural proof; their acceptance is not claimed. No builder or template descriptor emits the primitive. No template-ID rendering, text lookup in the renderer, semantic rasterization, exported-package repair or fixed-height clipping is introduced.

## Validation and limits

- **4 frame controls / 12 pages:** source/saved package integrity and all declared field data/identities pass. Two short controls display all text; two long controls reproduce the same 53 missing full fields and nine out-of-body spans before and after save/reopen. These are explicit product counterexamples.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes. All source packages are byte-identical to the starting checkpoint under the same explicit image adapter.
- **20 earlier floating-table packages:** fresh generation, default export guards and immutable model JSON roundtrips pass; all source packages are byte-identical to the prior block. Their documented long-side failures remain unresolved.
- **4 frame native model JSON roundtrips**, **31 Sidebar model roundtrips**, mirrored-picture rejection, **two actual portable project/photo restorations**, seven Python flow tests, Python compilation and formatting/whitespace checks pass.
- Three new units protect default rejection, frame geometry/nesting/indent validation, complete paragraph equality, adjacent native frame ownership, canonical inline controls, native lists and deterministic packages. They join `test:docx-next` and the full publication suite.

Local engine: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Stable 25.8.7.3 and Microsoft Word were unavailable. Supported photos use explicit Pillow normalization; browser decoding was not repeated locally. Bun and the frozen-lock dependency installation are unavailable in this workspace. Local TypeScript has no changed DOCX Next file diagnostics but remains blocked by cache dependency mismatches elsewhere. Commit-specific CI supplies locked units/TypeScript/lint/build and browser/PDF/dossier regressions, reported separately. [Machine evidence](sidebar-frame-evidence.json) records each field-level counterexample.

Existing production DOCX, template registrations, all Sidebar guards, Legacy, `main` and `render` remain outside this block. No manual deployment, promotion or mass migration occurs.

## Reproduce

```sh
bun scripts/docx-next-frame-probe.ts /tmp/docx-next-frame
python scripts/docx-next-frame-qa.py /tmp/docx-next-frame --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

Use `--require-stable` when a stable engine is available. Changed field visibility or bounds require review; negative controls never unlock export automatically.

## Exact next task

Return to the existing generic native table composition and isolate **paragraph attachment arbitration across its main, empty side and gutter cells**. Inspect the six matched ownership boundaries and native paragraph terminators, including idle-cell attachment flags. Test a declarative shared attachment contract using the same paragraphs and physical lanes; do not infer heights, split user text, lock oversized entries or add template-specific paths. Start with the small boundary matrix and stop early if it cannot improve attachment without losing any text. Only then extend to populated long-both-tracks and photo/span ordering. This is an unproven hypothesis, not an identified engine defect. The separate-table and paragraph-frame alternatives remain blocked; stable/Word comparison is useful but does not block continued candidate development.
