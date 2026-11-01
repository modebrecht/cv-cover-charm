# P2-10 — reduced contexts with protected inner controls

Four compact synthetic diagnostic files, derived from the full P2-08 production
Next downloads. All 19 entry/reference tables and their 75 inner SDTs remain
canonically identical to the corresponding full source. Only outer context is
reduced; no photograph, sidebar data or dossier chrome should be expected here.

| Fixture | Paragraph gaps | Critical-content result | Entries | Pages | Product |
|---|---|---|---:|---:|---|
| left-raw-protected-context.docx | original | FAIL | 15/18 | 3 | FAIL |
| left-zero-protected-context.docx | all 18 after values zero | PASS | 18/18 | 3 | FAIL |
| right-raw-protected-context.docx | original | FAIL | 15/18 | 3 | FAIL |
| right-zero-protected-context.docx | all 18 after values zero | PASS | 18/18 | 3 | FAIL |

Content PASS here means the protected CV main story, including entry descriptions
and reference contact, is complete. It does not certify a full export: active
header/footer references, all body drawings and the sidebar story have been
removed; only outer SDTs were unwrapped, and unreachable package parts pruned.
The neutral sidebar label is P204SIDEBAR. First-cell paragraph flow properties,
mode 15, main critical table content and formatting remain intact. All images
are absent; no private image or local Word file is included.

Source export SHA `b11ec0345e999d64f0f3d8fdeba82613ca9cc9f6`.
Native implementation `6b9d04251648efa5708800c447f6294a900407e7`,
run `41325646722`, LibreOffice `24.2.7.2 420(Build:2)` on Ubuntu 24.04.

[MANIFEST.json](MANIFEST.json) binds exact files/document XML, declared losses,
removed parts, expected entry/page observations and decoded page pixel hashes.
The left pair's page pixels exactly match the older P2-06 pair even though
these files retain all 75 inner controls. Compact/uncompacted twins produce
identical pages on both sides, for both gap states.

To rerun the complete bounded matrix in the existing workflow, choose
`fixture_probe: flow-context`. On a LO/Python Linux host:

```bash
python scripts/dossier_lo_context_test.py
python scripts/dossier_lo_context.py --out-dir /tmp/p210-context
```

Add `--audit-only` only with the complete saved closing artifact directory;
replay verifies existing DOCX/PDF hashes without another native conversion.

[Full report and next controlled experiment](../../../docs/qa/p2-10-flow-context.md).
