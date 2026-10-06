# Sidebar native cell-ending attachment — early stop

Starting remote `dev`: **`0b263c8609ec9f05f0db793ed0f8fc0628ed9d39`**, freshly fetched and matched to a clean checkout. This follows the [paragraph-frame checkpoint](sidebar-frame-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Result

Explicit attachment of the required empty paragraphs in side/gutter cells does **not** repair the heading/metadata/description opening. At the tightest tested boundary it makes attachment worse: the previously attached heading stays on CV page 1 while all entry fields start on CV page 2. Attaching every cell ending has the same regression. Explicitly detaching every cell ending preserves the baseline failure.

| Authored lead | Default / explicit detached endings | Idle or all endings attached |
| ------------- | ----------------------------------- | ---------------------------- |
| 220 mm        | 1, 1, 1, 1, 2                       | 1, 1, 1, 1, 2                |
| 228 mm        | 1, 1, 2, 2, 2                       | 1, 1, 2, 2, 2                |
| 234 mm        | 2, 2, 2, 2, 2                       | 1, 2, 2, 2, 2 — regression   |

Tuples are the CV pages of heading, date, title, place and description opening. All five complete fields remain in source/saved DOCX and in their PDF text lane. Metadata X positions and glyph widths match across policies. The outcomes repeat after save/reopen.

The **12 controls / 120 dossier pages** stop this hypothesis before expanding to all six boundaries, populated tracks, photo/span ordering or chrome. Two controls attach their opening; ten are explicit counterexamples. They are failures of the product acceptance contract, not accepted Sidebar behavior. Idle-cell flags can affect pagination, but their observed effect does not establish the exact LibreOffice implementation cause.

## Retained diagnostic contract

Native tables may declare `row.cellEndKeepNext`, with one Boolean or `null` per physical cell. A Boolean sets `w:keepNext` only on the renderer's required empty closing paragraph; `null` preserves the existing XML. The flag does not rewrite semantic paragraphs, join user text, create an atomic oversized entry or promise attachment across tracks. The native [keep-next contract](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.keepnext?view=openxml-3.0.1) describes paragraph grouping; it is not proof of multi-cell acceptance.

**Normal export rejects any such declaration**, including all-null declarations and JSON-restored models with no issues. The guard also covers nested tables, headers, first headers and footers. Only the existing `allowUnacceptedModelIssues` diagnostic option permits emission. Validation rejects malformed arrays/counts and values other than Boolean or `null`. No application builder or template descriptor emits this contract. Existing native endings remain byte-identical by default.

The neutral fixtures reuse the original three physical columns, vertical spans, exact five paragraphs/runs/IDs/attachment flags, table paint, widths, insets and authored leads. The probe checks equality and immutable deterministic model JSON packages. Package QA verifies complete field text/IDs and the actual native cell-ending flags. PDF QA checks all owning-lane text, opening pages, body/lane bounds and matching glyph geometry before and after save/reopen. Changed expected outcomes require review and never unlock export automatically.

## Validation and limits

- **12 cell-ending controls / 120 pages:** native package/field identity, full-text/lane/bounds, render and save/reopen gates pass; **ten known negative openings**, including two new regressions, remain blockers.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes, with byte-identical source packages under the same explicit image adapter.
- **24 ownership, 20 floating-table and four paragraph-frame controls:** fresh generation/default guards/model JSON roundtrips pass; all 48 packages remain byte-identical to their preceding checkpoints. Their PDF diagnostics were not rerendered in this block.
- **31 immutable Sidebar model roundtrips**, mirrored-picture rejection, **two actual portable project/photo restorations**, seven Python flow tests, Python compilation and formatting/whitespace checks pass.
- Three units cover export guards across stories/JSON, invalid declarations, unchanged semantic paragraphs/geometry and deterministic native cell-ending packages. They join `test:docx-next` and publication CI.

Local engine: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Pinned stable LibreOffice and Microsoft Word remain unavailable locally. Photo normalization uses explicit Pillow inputs; browser decoding is covered separately by publication CI. Bun/frozen-lock dependencies are unavailable locally. The cache TypeScript check has no DOCX Next diagnostics but has dependency errors elsewhere; locked units/TypeScript/lint/build and browser/PDF/dossier checks come from commit-specific CI. [Machine evidence](sidebar-cell-ending-evidence.json) records the outcomes and limits.

## Reproduce

```sh
bun scripts/docx-next-cell-ending-probe.ts /tmp/docx-next-cell-ending
python scripts/docx-next-cell-ending-qa.py /tmp/docx-next-cell-ending --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

Use `--require-stable` for a stable engine comparison. This block does not change template registrations, application exports, the picture-before-later-span guard or Legacy. No deployment/promotion or migration is performed.

## Exact next task

Run a **bounded differential check on pinned stable LibreOffice** of these twelve cell-ending controls and the existing six matched grid/single-column/body boundaries. Obtain the stable engine through a reproducible CI job if local access remains unavailable; cap the setup attempt instead of repeating lengthy downloads. Record actual field pages, full-text visibility, native geometry and save/reopen. A different result requires review of the candidate contract, not automatic export enablement. If stable reproduces the failures, identify a native row/paragraph ownership primitive from that evidence before another prototype. Microsoft Word comparison remains useful and pending. Keep template/layout orthogonality and all current guards; no template migration yet.
