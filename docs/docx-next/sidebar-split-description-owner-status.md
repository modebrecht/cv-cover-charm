# Splittable opening cell still loses complete PDF descriptions

Published source `8059c16b` has verified successful [stable 25.8.7.3 comparison](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549458) and [full application regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549317). Stable reproduces both source packages and the exact stopped PDF/bounds/Save-Reopen observations with zero changed cases. Green diagnostics do not accept the text loss.

Compare the main description's native owner at 220 mm while holding the opening row explicitly splittable in both controls. This follows the [same comparison with cantSplit=true](sidebar-description-owner-status.md). Main-only empty-ending attachment, all three rows, side owner/span/text, semantic IDs, widths and every paragraph/other row/ending flag remain unchanged. The existing generic native table primitive authors the change; no renderer or XML repair changes.

| Sidebar | Description owner | Opening cantSplit | Dossier pages | Result                                                    |
| ------- | ----------------- | ----------------- | ------------- | --------------------------------------------------------- |
| Right   | tail cell         | false             | 21            | bounded pass                                              |
| Right   | opening cell      | false             | 15            | both PDF descriptions incomplete; one body-bounds failure |
| Left    | tail cell         | false             | unrendered    | stopped                                                   |
| Left    | opening cell      | false             | unrendered    | stopped                                                   |

**Two actual cases / 36 dossier pages**, each also rendered after Save/Reopen. All four generated packages preserve immutable JSON package identity and reject normal exports. Both rendered source/saved packages preserve all ten complete native fields. Main opening pages remain 2,2,2,2,2 and side opening pages remain 1,1,1,1,1. Moving the description still loses complete visible description text in both lanes, with one body-bounds failure. Right runs first and stops on that regression; left remains unrendered.

Both render and Save/Reopen observations are identical to the true-row comparison, despite different source packages. The false-row tail-cell control is byte-identical to the earlier positive [short-row control](sidebar-row-together-status.md). Splitting the oversized opening row alone does not repair this bounded composition; the engine's full cause is not established. No production change is justified.

[Actual evidence](sidebar-split-description-owner-evidence.json): LibreOfficeDev 26.8.0.0.alpha0. Pinned stable 25.8.7.3 compares source identity, exact stopped plan and all visible/native observations. Green diagnostics do not accept lost text. Experimental gates stay closed, 29/39 configured and 0/39 Word accepted; Microsoft Word remains pending.

```sh
bun scripts/docx-next-split-description-owner-probe.ts /tmp/split-description-owner
python scripts/docx-next-populated-row-qa.py /tmp/split-description-owner --matrix split-description-owner --observe
# Exploration exits with the retained right regression.
python scripts/docx-next-populated-row-qa.py /tmp/split-description-owner --matrix split-description-owner --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-split-description-owner-evidence.json
```

Next bounded hypothesis: retain the original main description in its tail cell and isolate a generic nested side table inside the unchanged outer spanning side cell. Require unchanged complete native/PDF text, semantic IDs, widths, opening attachment, bounds and Save/Reopen; right controls run first and stop on regression. No production enablement.
