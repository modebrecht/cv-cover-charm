# Sidebar native logical paragraph anchor — 2026-10-08

This follows the independently executed [document-level continuation rule](sidebar-floating-continuation-status.md) from remote `dev` source `b874ade828b7c9393286e8051e4521fa5ae40eaf`, with M6 37792658238 and all three stable jobs 37792658159 successful. The flag-only long-side case stays negative on both engines despite preserving the setting.

## Separate declared native owner hypothesis

The primary [floating-table position contract](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tablepositionproperties?view=openxml-3.0.1) identifies the following regular paragraph as the logical native anchor. The [actual LibreOffice layout implementation](https://github.com/LibreOffice/core/commit/7d7ca347fafa7a06094b00e8fb0d0452c4c81366) applies all-pages wrapping to that anchor paragraph's contents. Read-only source/saved XML inspection establishes an empty unowned helper paragraph immediately after the previous floating table. This supports a bounded owner hypothesis; it does not prove a complete independent multi-paragraph main story.

`TableBlock.position.anchorParagraphId` explicitly declares the next whole semantic paragraph as the native logical anchor. Validation requires the exact following top-level paragraph ID; missing, wrong, nested and nonadjacent owners are rejected. The single generic table serializer omits its unowned separator only for this declared native owner. All paragraph content, native fields/flags, positions, widths, paint and other package parts are unchanged. The all-pages setting stays true in both matched cases. The source-package test proves that exactly the separator before that declared semantic ID is removed; no visible text is matched and no exported or saved XML is repaired.

Normal export still rejects the model, including cleared issues and JSON restoration with the document policy removed. No builder, descriptor or application path emits the new property. All previous source hashes, original caption gates, picture pixels/crops and normal output remain protected.

## Actual local counterexample

A twelve-source plan is fixed before rendering: right then left, short / side-long / both-long, empty separator versus following paragraph. The four actual Dev cases total **24 dossier pages**, plus Save/Reopen. Short pairs retain all nine first main fields on CV page 1. In the long control they all start on CV page 7. With the semantic paragraph anchor their opening pages become **1,7,7,7,7,7,7,7,7**: only the title moves. It is also visibly repeated **seven times** although its native ID and complete paragraph occur once. Complete text surviving is not acceptance. Both failures survive native Save/Reopen; the other eight sources stay prepared but unrendered.

All 77 short / 129 long tagged fields, all 47 short / 99 long whole CV paragraphs, authored keepNext / keepLines / widowControl, exact native table/row/cell/body owners, the declared logical anchor, and exact floating width/grid/X/Y/anchor/distances survive. Complete native and owning-lane PDF text and physical bounds pass. Each source/reopened page has identical RGBA bytes within this runtime. Original table captions remain lost and full Save/Reopen identity remains blocked. The empty control hashes exactly match the preceding independently published continuation sources.

The read-only PDF audit checks all nine first main fields and paragraph-text multiplicity against the authored lane, including authored repetitions. Thus title-only progress and visible duplicates are separate explicit stop reasons. It never resolves native ownership from visible text. All **48 source/reopened PNGs / 18 distinct images** are byte-audited and visually reviewed; the title repeats visibly on the first six side-only pages and remains at the final main opening.

Five Python adversarial tests retain strict source/native/geometry/pixel/stop gates, permit only the engine version and saved ZIP metadata exclusions, and reject detached openings and duplicated titles even when native fields survive. Three new units cover exact anchor ownership rejection, the restored-model export guard, and all twelve immutable whole-story packages. Full local release checks pass: **1015 units**, type/format/lint/build. Independent stable execution of this separate anchor plan is pending publication and will be recorded separately.

## Reproduce and next task

```sh
bun scripts/docx-next-floating-anchor-probe.ts /tmp/docx-next-floating-anchor
python scripts/docx-next-floating-continuation-test.py
python scripts/docx-next-floating-continuation-qa.py /tmp/docx-next-floating-anchor --anchor-owner --observe
```

Use the pinned independent stable engine via `--libreofficekit PATH --require-stable`, then require its actual `--baseline` report. [Machine evidence](sidebar-floating-anchor-evidence.json) distinguishes the engines and strict unrendered stop inventory.

Next: verify the exact published anchor source on stable and pin its real native/PDF/pixel evidence. Then use the upstream native all-pages layout regression to distinguish one anchor paragraph's continuation from automatic continuation of a main story containing multiple complete paragraphs. Do not extend either rejected fixture or repeat paragraph-flag, width, crop, ellipse or normalization guesses. Keep complete paragraphs editable and native; no template-specific renderer or segmentation. Original captions, exact geometry, long opening attachment, photos, chrome and Microsoft Word acceptance remain separate requirements. **29/39 configured, 0/39 Word accepted; production DOCX remains blocked.**
