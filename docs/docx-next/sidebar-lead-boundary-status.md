# The left opening failure depends on the lead boundary

Following the rejected [padding representation](sidebar-lead-padding-status.md), use the original main spacer paragraph and change only its authored height: 220 mm versus 0 mm, right controls first. Native identity, three-row ownership/spans, all semantic text, widths, main-only opening attachment and detached side tails stay fixed. A zero-height spacer retains its SDT and emits the existing minimum one-twip exact line; it is not removed from the model. Package QA verifies its owning cell, identity and exact line height.

| Sidebar | Authored main lead | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate          |
| ------- | ------------------ | --------------------- | --------------------- | ------------- | --------------------- |
| Right   | 220 mm             | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | 0 mm               | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |
| Left    | 220 mm             | 1,1,1,1,2             | 1,1,1,1,1             | 21            | main opening detached |
| Left    | 0 mm               | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |

Four actual cases / 84 dossier pages, also rendered after Save/Reopen. Every source/saved field and complete PDF description survives. Body/lane bounds, immutable JSON package identity and Save/Reopen pass. Both 220 mm packages and observations match the previous main-only controls. Rendered left CV page 1 was visually inspected in both variants. The zero-lead metadata starts at 28.5 mm; the 220 mm heading starts at 248.48 mm, with the place ending at 272.39 mm, close to the 277 mm body bottom. This demonstrates a lead-dependent boundary failure in this fixture, not an orientation failure present at every lead height.

Removing a requested user lead is not a repair. No production renderer, model builder, template or application flow changes; experimental gates remain closed. Microsoft Word remains pending. Local LibreOfficeDev 26.8.0.0.alpha0 [evidence](sidebar-lead-boundary-evidence.json) is compared with stable 25.8.7.3 in exact-commit CI.

```sh
bun scripts/docx-next-lead-boundary-probe.ts /tmp/lead-boundary
python scripts/docx-next-populated-row-qa.py /tmp/lead-boundary --matrix lead-boundary --observe
python scripts/docx-next-populated-row-qa.py /tmp/lead-boundary --matrix lead-boundary --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-lead-boundary-evidence.json
```

The next [bounded lead-height window](sidebar-lead-window-status.md) samples 205/210/215 mm around the retained 220 mm control. The samples cannot be generalized into a renderer threshold or a hardcoded pagination policy.
