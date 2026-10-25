# Bounded lead window reproduces an asymmetric opening split

The [zero/220 mm comparison](sidebar-lead-boundary-status.md) establishes a positive left control without the lead. This follow-up samples only the original paragraph's height at 205, 210, 215 and 220 mm. It retains every source field/ID, row/span, width, main-only ending attachment and detached side tail. All right controls run before the left controls. The 220 mm packages remain identical to the prior main-only source packages.

| Sidebar | Main lead | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate          |
| ------- | --------- | --------------------- | --------------------- | ------------- | --------------------- |
| Right   | 205 mm    | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | 210 mm    | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | 215 mm    | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | 220 mm    | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Left    | 205 mm    | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |
| Left    | 210 mm    | 1,1,1,1,1             | 1,1,1,1,1             | 21            | bounded pass          |
| Left    | 215 mm    | 1,1,1,1,2             | 1,1,1,1,1             | 21            | main opening detached |
| Left    | 220 mm    | 1,1,1,1,2             | 1,1,1,1,1             | 21            | main opening detached |

Eight actual cases / 168 dossier pages, also rendered after Save/Reopen. All complete native/saved fields, both complete PDF descriptions and body/lane bounds pass. Immutable JSON restoration preserves every package. All opening positions survive Save/Reopen. The successful 210 mm and failing 215 mm samples bracket a boundary for these exact populated sources and metrics; no universal threshold is inferred. Right moves the entire main opening to CV page 2 at both failing-left sample heights. This still does not establish the cause in an engine or Microsoft Word.

Local engine: LibreOfficeDev 26.8.0.0.alpha0. Stable 25.8.7.3 CI compares exact source packages and [observations](sidebar-lead-window-evidence.json), including the two left failures. Diagnostic success does not enable export; production renderer/model/template code is unchanged. Microsoft Word remains pending.

```sh
bun scripts/docx-next-lead-window-probe.ts /tmp/lead-window
python scripts/docx-next-populated-row-qa.py /tmp/lead-window --matrix lead-window --observe
python scripts/docx-next-populated-row-qa.py /tmp/lead-window --matrix lead-window --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-lead-window-evidence.json
```

Next bounded ownership hypothesis: move only the main description from the tail cell into the main opening cell. Preserve its semantic ID, complete text and paragraph flags, all three rows, side ownership/spans and the 220 mm lead. This tests a cell-local paragraph chain using existing native primitives. The required empty ending flags remain attached to their original cells; no renderer or XML patch is involved. Stop immediately if the right control regresses or complete text/bounds/Save-Reopen fail.

Follow-up result: the [unchanged-row-flag ownership probe](sidebar-description-owner-status.md) is stopped after a right-side loss of complete visible descriptions and a body-bounds failure.
