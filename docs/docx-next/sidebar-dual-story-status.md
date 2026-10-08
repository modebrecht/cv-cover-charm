# Two complete adjacent floating owners — 2026-10-08

Continued from clean `dev` `9f4e586e`: all eight browser groups/M6 and all three stable jobs passed. Final artifact 11575177496 has verified SHA-256 `331aa5be4d50fb987425f256f1dfa3b895b96d9d0c01bef0fcd1b636d7c3290f`; the strict inline/continuation/anchor and full-story baselines are intact.

## Primary mechanism and its scope

The [DOCX importer fix](https://github.com/LibreOffice/core/commit/01ad8ec4bb5425446e95dbada81de435646824b4) inserts a native dummy paragraph when a floating table immediately follows another floating table. Each owner receives its own anchor. The [zero-height anchor correction](https://github.com/LibreOffice/core/commit/441aed20b95ee40dec1df72fb8e8167d0e48c0c4) retains the real anchor while eliminating its visible line height. The [split-anchor guard](https://github.com/LibreOffice/core/commit/5b0256f30ee154edb28b999bc4faba2453fc32b8) explicitly states that multiple multi-page floating tables sharing one paragraph are unsupported; distinct split anchors must not be joined. The existing `GetNextFlyLeaf` mechanism automatically creates floating table follow frames. These primary mechanisms justify a bounded test of two separate complete floating owners; none promises simultaneous long-story openings.

Both unchanged original DOCX references were downloaded, verified against their exact original Git blob and SHA-256, and rendered read-only. Each produces one page. The first contains two adjacent outer tables and one nested table; its test checks retained table count. The second contains two short floating tables; its test checks vertical placement. These are not long-story acceptance evidence. Exact provenance is in [the evidence](sidebar-dual-story-evidence.json).

## One generic diagnostic declaration

The main owner retains all original complete block subtrees from the preceding inline-owner diagnostic, including all 26 main paragraphs and six nested native entry tables. It becomes a second native floating table at the original main-lane position, without fixed height. The side owner retains its complete original cell and properties. `position.nextFloatingTableId` is a generic diagnostic declaration: the named table must be the immediately following top-level positioned table, and a paragraph anchor cannot be declared simultaneously. The renderer omits exactly the unowned separator between these two declared floating owners to invoke the documented importer mechanism. Other table boundaries are byte-identical. No semantic text/paragraph splitting, templates in renderer, stored XML edits, saved XML repair or estimated page capacity is introduced.

Normal and JSON-restored exports still reject these positioned models even if issues are cleared. Six sources are predeclared, left/right × short/side-long/both-long. Six matched inline-owner controls are generated solely for read-only source comparison, with hashes equal to the earlier pinned inventory; they are not natively executed. All non-document package parts remain byte-identical. The optional explicit two-owner whole-story audit preserves the old one-floating-owner default and its exact baselines. It resolves canonical IDs and full native table/row/cell ancestry before any visible-text comparison. Escaped fields, unknown text, duplicates and native reordering fail independently of identical visible values.

## Development result: stopped after first failure

| Actual source | Dossier pages | All nine main opening positions | Whole native stories | All table geometry | Whole visible sequences |
| --- | --- | --- | --- | --- | --- |
| Left short | 3 | 1,1,1,1,1,1,1,1,1 | pass | pass | pass before/after Save/Reopen |
| Left side-long | 9 | 7,7,7,7,7,7,7,7,7 | pass | pass | pass before/after Save/Reopen |

Both complete floating owners and all native paragraphs/rules/full ancestry survive Save/Reopen. The side has 21 short or 73 long paragraphs; the main has 26 paragraphs and six entry tables in both cases. No visible title duplication occurs. Distinct native import anchors nevertheless do not make the main story start concurrently: it remains on CV page 7 in the long case. Original table captions still fail separately. Stop at two actual cases / 12 dossier pages, plus Save/Reopen and second PDFs; all 24 PNG instances are audited. Four prepared sources remain explicitly unrendered. Do not extend this rejected mechanism or retry old flags/widths/anchors/crops.

Twelve adversarial Python checks cover full owner preservation, adjacency, automatic splitting, exact original native text structure, explicit independent ownership, native ID ordering and strict evidence. Three application unit tests cover malformed/missing/nonadjacent/conflicting anchors, restored-model export blocking and exact single-boundary/non-document byte preservation over all six sources. The old 18 story and 11 inline checks remain unchanged. Independent stable observation and downloaded-artifact verification are pending in this checkpoint; no development report is substituted for stable evidence.

Production DOCX Next remains blocked. Registry is 29/39 configured and 0/39 Microsoft Word accepted. Legacy/V2/PDF/portable JSON, original photo/chrome/caption and Word gates remain. All changes publish only to dev; main/render are untouched. Next: establish a primary mechanism with actual concurrent automatic continuation, then test its complete native stories without extending either rejected owner matrix.
