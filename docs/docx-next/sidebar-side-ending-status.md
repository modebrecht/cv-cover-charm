# Empty spanning side cell ending has no observed effect

Freshly fetched clean remote `dev`: `69194d912163f52909b31f959000c4b2f5f1a929`. Its [stable sidebar](https://github.com/modebrecht/cv-cover-charm/actions/runs/37607654284) and [application regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/37607654285) workflows were verified successful before this experiment.

Following the stopped [semantic terminal paragraph probe](sidebar-side-terminal-status.md), the last semantic side paragraph stays explicitly detached. Four declarative cases compare only the required empty ending of the spanning side cell, false versus true, at a 220 mm lead. Main-only opening attachment, all semantic text/IDs/properties, rows/spans, widths and paint remain identical. The right controls run first and must pass before left controls are rendered.

| Sidebar | Empty side ending keepNext | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate                    |
| ------- | -------------------------- | --------------------- | --------------------- | ------------- | ------------------------------- |
| Right   | false                      | 2,2,2,2,2             | 1,1,1,1,1             | 21            | pass within this bounded case   |
| Right   | true                       | 2,2,2,2,2             | 1,1,1,1,1             | 21            | pass within this bounded case   |
| Left    | false                      | 1,1,1,1,2             | 1,1,1,1,1             | 21            | fail: main description detached |
| Left    | true                       | 1,1,1,1,2             | 1,1,1,1,1             | 21            | fail: main description detached |

**Four cases / 84 dossier pages**, also rendered after Save/Reopen. Source and saved DOCX preserve all ten complete semantic fields. Both owning PDF lanes preserve complete descriptions, with no body or lane bounds failures. Within each orientation, visible results, opening positions, text hashes and metadata geometry are identical for both ending flags before and after Save/Reopen. The false-ending packages and observations are identical to the previous main-only controls. Every package survives immutable model JSON restoration and normal export remains rejected.

This rules out the empty spanning-side ending alone in these populated tracks. The previously rejected semantic-tail attachment remains false. No production renderer, template descriptor or application export code changed. Experimental gates remain closed; counts stay 29/39 configured and 0/39 Word accepted. Microsoft Word remains pending.

Local engine: LibreOfficeDev 26.8.0.0.alpha0. Twenty populated-evidence and seven stable-comparison Python tests pass. The primary Node runtime runs the probe through the same temporary TypeScript loader; Bun/frozen-lock full application checks come from exact-commit CI, reported separately. The existing 31 supported Sidebar fixtures have not yet been rerun in this block. Stable CI reproduces the [committed observations](sidebar-side-ending-evidence.json) without treating the left failures as acceptance.

```sh
bun scripts/docx-next-side-ending-probe.ts /tmp/side-ending
python scripts/docx-next-populated-row-qa.py /tmp/side-ending --matrix side-ending --observe
python scripts/docx-next-populated-row-qa.py /tmp/side-ending --matrix side-ending --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-side-ending-evidence.json
python scripts/docx-next-populated-row-test.py
```

Next bounded hypothesis: isolate the first/lead outer row's `keepTogether` / native `cantSplit`, true versus false, both orientations. The earlier short-row experiment changed only the second/opening row; the first row still owns the long spanning side content and the authored main spacer. Preserve the short opening row, main-only attachment, detached semantic/empty side tail, all native ownership and complete text. Stop if the positive right case regresses or text/bounds/Save-Reopen changes. No boundary/photo/chrome expansion until a matched positive result exists.

Follow-up: the [lead-row cantSplit comparison](sidebar-lead-together-status.md) also has no observed effect. The subsequent [cell top-padding comparison](sidebar-lead-padding-status.md) stops on a right-side regression.
