# P2-06 — generated preamble and lead-wrapper counterprobes

Branch `work/01nov-p2-06-preamble-flow`, base
`e859cf9c7bb18c99aab17cbe1dd70255f3ca5227`.

Target: the separate content-loss failure, independent of the photo/mode result.
Use the same persisted coupled/detached synthetic fixtures, without pictures,
SDTs, app rebuild, Windows or Word approval. No normal exporter changes.

## Planned controlled matrix

11 conversions: two byte-identical originals plus nine diagnostic reductions.
All 18 innermost station tables plus reference (19 critical tables) must remain
canonically identical and in the same order. All package parts other than
word/document.xml remain byte-identical; compatibilityMode stays 15.

- Remove only the empty main-cell starting paragraph.
- Flatten school or experience heading/first-entry wrapper, separately or both.
  Keep their contents and visible text, dropping only the outer one-cell table.
- Disable cantSplit on school or experience wrapper rows, separately or both;
  leave every inner entry-row flag unchanged. Attribute edits are enumerated.
- Replace the pre-experience preamble by a declared 4762-twip (~84 mm) spacer,
  once retaining and once flattening the first-experience wrapper. This changes
  visible preamble data intentionally but keeps every critical entry table.

The spacer is diagnostic, not an App position normalization. Page counts, first
entry baseline and entry spans must be read alongside content recovery: a copy
that simply shrinks to two pages does not prove three-page continuation is fixed.

Execution PASS requires every conversion and both saved P2-04 pixel baselines.
It is not layout/Word/product acceptance of any reduction. Same workflow and
shared lightweight LO/Python job; `preamble_flow` selects this matrix.

Local preparation/control results and native findings follow after execution.
