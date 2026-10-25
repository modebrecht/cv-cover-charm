# Complete native story contract — 2026-10-08

## Published predecessor verified

Freshly fetched remote `dev` is `d6f044aec1e15e911b3d74009ef2ce8734100a8e`; the initial working tree is clean. Final application run 37796642031, all eight browser groups, stable run 37796641996 and gallery run 37796641733 are successful. Final artifact 11558449910 is independently downloaded; SHA-256 `d023cfbeb0c4df0c1df20f43a3828fe661179b87a686448b1d5364da9296f8d9` matches GitHub. Both strict pinned continuation/anchor baselines reproduce with zero changes. All 24 prepared source packages, eight actual saved native packages and 96 RGBA PNG digests are checked against their actual files. No pending predecessor CI remains.

## Contract for a complete editable story

An independent main story must retain **every ordered whole semantic paragraph**, including native nested entry tables, alongside the complete side story. A future mechanism must automatically continue both stories as content grows, without inferred page heights, fragmenting descriptions, merging user paragraphs, fixed linked-frame capacity, repeated visible anchors, semantic rasterization or a saved-XML repair. Native identity must be resolved from field tags and ancestry before checking PDF content. Microsoft Word execution remains a separate acceptance gate.

The executed short fixtures contain **26 main and 21 side paragraphs**. The executed side-long fixtures contain **26 main and 73 side paragraphs**. Six main entry tables coexist with ordinary body paragraphs. The declared following anchor controls only one of the 26 main paragraphs. This scope observation does not establish that all such Word mechanisms are impossible; it describes these actual native packages. The primary [LibreOffice layout change](https://github.com/LibreOffice/core/commit/7d7ca347fafa7a06094b00e8fb0d0452c4c81366) and [two verified upstream fixtures](sidebar-floating-upstream-scope-evidence.json) exercise continuation of a single anchor TextNode. Microsoft's [document compatibility contract](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-docx/1a912d7b-20e4-4d29-9c29-613793be0319) describes document content after a floating table. The execution result, rather than the broad specification alone, determines this candidate's rejection.

`docx_next_story_qa.py` implements reusable read-only checks:

- Resolve each declared native field exactly once and require one complete native paragraph. A control containing fragments, or owning only part of an inline paragraph, fails.
- Read actual XML paragraph order instead of replaying the fixture's expected order into the result. Equal visible values cannot conceal reordered native IDs.
- Record the complete ordered table/row/cell ancestry and raw native text hash for each field. Block-to-inline SDT conversion is permitted only when whole text, IDs, order and ownership remain identical.
- Reject undeclared nonempty native paragraphs in the CV story, including unknown tagged text. Required empty native helper paragraphs remain permitted.
- Compare the complete visible authored sequence in each physical lane, across page boundaries. Authored repetitions and soft hyphenation remain permitted; reordering, omission, additional text and duplicate titles fail. PDF text checks never determine native field identity or ownership.

`docx-next-story-contract-qa.py` consumes the **already executed** floating-continuation and floating-anchor packages/PDFs. It rechecks exact original/saved package hashes and recomputes the existing PDF observations before recording this new contract. It generates no DOCX, exports no native document and repairs no XML. Original caption, opening, geometry, raster, picture and Word gates remain independent and closed. The complete identity gate still fails on every original caption; the new native paragraph contract cannot substitute for it.

## Executed read-only result

| Existing matrix | Actual cases | Whole native order/text/owners | Whole visible main sequence | Continuation result |
| --- | --- | --- | --- | --- |
| Document setting | 4 | all pass | all pass in both phases | long main still starts CV page 7 |
| Following native anchor | 4 | all pass | long candidate fails in render and Save/Reopen | nine opening positions 1,7,7,7,7,7,7,7,7; title occurs seven times |

The source title exists once; the extra 60 normalized visible characters are six extra ten-character title copies. The side sequence remains exact in all eight cases and both phases. **Zero new native executions** or new long/boundary/photo sources are created. The existing stopped inventories retain their eight unrendered sources per plan. [Strict whole-story evidence](sidebar-whole-story-contract-evidence.json) is pinned from the downloaded independent final stable artifact, rather than assuming a local result equals CI.

Eighteen adversarial Python tests protect native reorder with equal values, missing/duplicated IDs, paragraph fragmentation, partial inline ownership, unknown/unowned native text, changed ancestry/story/text, visible reordering/duplicates and authored page-spanning repetitions. The actual JSON report is written before strict baseline comparison and archived even when that comparison rejects changed evidence. Two additional adversarial tests protect this failure path and exact baseline acceptance. The stable workflow runs these tests and strictly compares the new read-only report after its existing native executions. All previous baselines and editor work remain unchanged. Local release checks pass: 1015 units, release formatting, typecheck, lint and build. Exact successor CI is checked separately after publication.

## Next mechanism gate

The new contract establishes how to test a complete main story; it does **not** supply a pagination repair. A next composition needs primary evidence for an automatically continuing multi-paragraph owner before any new matrix. Evaluate a complete native story owner with the original nested entry structure preserved; require short positive controls and long concurrent main/side openings, exact ordered native paragraphs and exact visible story sequences. Do not extend the rejected flag-only or single-anchor plans, retry paragraph flags/widths/crops, or turn one paragraph's continuation into a whole-story acceptance claim. The existing shared table's boundary attachment, exact geometry, original captions and photo/Word requirements remain blocked.

```sh
python scripts/docx-next-story-contract-test.py
python scripts/docx-next-story-contract-qa.py /path/to/downloaded-stable-artifact \
  --baseline docs/docx-next/sidebar-whole-story-contract-evidence.json
```

Production DOCX remains blocked: **29/39 configured candidates, 0/39 Word accepted**. No model, renderer, descriptor, normal exporter, Legacy/V2, PDF/portable JSON, `main` or `render` changes, deployment or promotion.
