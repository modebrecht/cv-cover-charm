# Inner side table clips the visible side description

After the [splittable main-owner counterproof](sidebar-split-description-owner-status.md), isolate a generic one-cell inner side table. Retain the original main description in row 2 and the side content in its outer spanning row-0 cell. Only wrap the same five complete side paragraphs in an inner table at their exact original text width, with zero padding/borders and a splittable inner row. Its required empty ending is explicitly detached. Outer rows, spans, text owners, main-only attachment, paragraph flags and all existing cell endings are unchanged. The existing table primitive authors this directly; no renderer changes or XML repair.

| Sidebar | Side composition  | Dossier pages | Complete main PDF text | Complete side PDF text              | Bounds/openings |
| ------- | ----------------- | ------------- | ---------------------- | ----------------------------------- | --------------- |
| Right   | direct paragraphs | 21            | pass                   | pass                                | pass            |
| Right   | inner table       | 10            | pass                   | fail: 790/18,444 characters visible | pass            |
| Left    | direct paragraphs | unrendered    | unrendered             | unrendered                          | stopped         |
| Left    | inner table       | unrendered    | unrendered             | unrendered                          | stopped         |

**Two actual cases / 31 dossier pages**, each also rendered after Save/Reopen. Both rendered source/saved packages preserve all ten complete native fields. The main opening remains 2,2,2,2,2 and the side opening remains 1,1,1,1,1, yet the complete side description is absent from the PDF. Save/Reopen reproduces the same failure. Right runs first and stops on the regression; both left cases remain explicitly unrendered. All four generated source packages reject normal export, preserve immutable model/JSON byte identity and retain all semantic fields. The direct control is byte-identical to the original positive right main-only package.

The inner-table composition is rejected for this bounded spanning-cell context. Complete native text, correct bounds and attached openings alone would conceal the clipped description. This does not identify the engine's full cause or prove every nested composition fails. No production change is justified. [Actual evidence](sidebar-nested-side-evidence.json) uses LibreOfficeDev 26.8.0.0.alpha0; pinned stable 25.8.7.3 CI compares source packages, visibility and the exact stopped plan. Green diagnostics do not accept lost text. Experimental export gates stay closed, 29/39 configured and 0/39 Word accepted; Microsoft Word remains pending.

```sh
bun scripts/docx-next-nested-side-probe.ts /tmp/nested-side
python scripts/docx-next-populated-row-qa.py /tmp/nested-side --matrix nested-side --observe
# Exploration exits with the retained right regression.
python scripts/docx-next-populated-row-qa.py /tmp/nested-side --matrix nested-side --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-nested-side-evidence.json
```
