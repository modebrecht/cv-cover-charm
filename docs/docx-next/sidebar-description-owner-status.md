# Moving the description into the opening cell loses visible text

Published source revision `e7e03c26`: [stable 25.8.7.3 comparison](https://github.com/modebrecht/cv-cover-charm/actions/runs/37615545128) and [full application regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/37615545185) were verified successful. Stable reproduces the exact stopped right counterexample with identical source packages and zero changed cases. The [next handoff](next-handoff.md) records the complete verified result and bounded follow-up.

After the [lead window](sidebar-lead-window-status.md) narrowed the left failure to a sampled page boundary, compare only the main description's native owning cell at the original 220 mm lead. The tail-cell control owns four metadata paragraphs in row 1 and the complete description in row 2. The opening-cell variant moves that same description paragraph into row 1 and leaves row 2 empty. All three rows, side text/ownership/spans, widths, semantic IDs/text and paragraph/row/empty-ending flags remain unchanged. In particular row 1 retains `cantSplit=true` and becomes oversized in the moved variant. This is authored through the existing generic table primitive; no renderer or XML repair changes.

| Sidebar | Main description owner | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate                                       |
| ------- | ---------------------- | --------------------- | --------------------- | ------------- | -------------------------------------------------- |
| Right   | tail cell              | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass                                       |
| Right   | opening cell           | 2,2,2,2,2             | 1,1,1,1,1             | 15            | both PDF descriptions incomplete; body bounds fail |
| Left    | tail cell              | not rendered          | not rendered          | not rendered  | stopped                                            |
| Left    | opening cell           | not rendered          | not rendered          | not rendered  | stopped                                            |

**Two actual cases / 36 dossier pages**, also rendered after Save/Reopen. The right control regresses, so both left cases remain unrendered. All four source packages pass immutable JSON package identity and normal-export rejection. Both rendered source/saved packages preserve all ten complete native fields. Rendered right CV page 1 and the final CV page were visually inspected. The moved variant preserves the five-field opening positions but loses complete visible description text in both lanes and reports one body-bounds failure. Save/Reopen retains these failures. The control is byte-identical to the previous positive right main-only package. Source QA verifies every main field's row ownership, the side source owner, lead SDT/exact line and every ending/row flag.

The cell-local owner alone is rejected with these unchanged flags. This does not establish that every cell-local architecture fails, or that the engine's cause is proven. It does not justify a production change. The [actual evidence](sidebar-description-owner-evidence.json) uses LibreOfficeDev 26.8.0.0.alpha0; pinned stable 25.8.7.3 CI must reproduce the exact package, visible failures and two-case stop. Green diagnostics never accept lost PDF text. Gates remain closed, 29/39 configured and 0/39 Word accepted; Microsoft Word remains pending.

```sh
bun scripts/docx-next-description-owner-probe.ts /tmp/description-owner
python scripts/docx-next-populated-row-qa.py /tmp/description-owner --matrix description-owner --observe
# Exploration exits with the retained positive-control failure.
python scripts/docx-next-populated-row-qa.py /tmp/description-owner --matrix description-owner --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-description-owner-evidence.json
```

Next bounded hypothesis: compare description owners with the opening row explicitly splittable in both controls. The original tail-cell/false-row package already has a positive right control in the [short-row experiment](sidebar-row-together-status.md). Holding that false flag constant would isolate ownership without an oversized `cantSplit` row. Keep the 220 mm lead, side span/text, all paragraph and empty-ending flags unchanged; stop on right regression or text/bounds/Save-Reopen failure. No combined change should be presented as a proven cause or production repair.
