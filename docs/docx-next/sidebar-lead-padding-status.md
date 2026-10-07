# Native cell top padding regresses the positive right control

Following the [lead-row cantSplit counterproof](sidebar-lead-together-status.md), compare the same authored 220 mm main lead as a semantic spacer paragraph versus native cell top padding in the empty first main cell. The existing generic spacer and cell-decoration primitives are used without renderer changes or package repair. Three-row ownership, spanning side text, widths, main-only opening attachment and every row/terminal flag remain unchanged. Package QA verifies the exact authored spacer line and native top padding independently.

| Sidebar | Lead representation      | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate          |
| ------- | ------------------------ | --------------------- | --------------------- | ------------- | --------------------- |
| Right   | paragraph, 220 mm        | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | cell top padding, 220 mm | 2,2,2,2,2             | 2,2,2,2,3             | 23            | side opening detached |
| Left    | paragraph, 220 mm        | not rendered          | not rendered          | not rendered  | stopped               |
| Left    | cell top padding, 220 mm | not rendered          | not rendered          | not rendered  | stopped               |

**Two actual cases / 44 dossier pages**, also rendered after Save/Reopen. The positive right control regresses, so the runner stops immediately and records the two unrendered left cases. All four packages were generated and passed immutable model/JSON package identity and normal-export rejection. Source and saved DOCX preserve all ten complete native fields. Both PDF tracks preserve complete descriptions and body/lane bounds; opening attachment alone fails. Save/Reopen preserves the observations within the existing metadata-glyph tolerance. The paragraph package is byte-identical to the prior positive main-only control. Rendered CV pages 1–2 were visually inspected; padding shifts the side heading/date/title/place to CV page 2 and its description to page 3.

This representation is rejected. It does not justify changing the renderer or enabling export. The 220 mm authoring values are equal; their visible pagination is demonstrably different. Local LibreOfficeDev 26.8.0.0.alpha0 evidence is retained in [JSON](sidebar-lead-padding-evidence.json). Stable 25.8.7.3 CI must reproduce this exact stop and source package; its green result means the diagnostic is reproduced. Microsoft Word remains pending; 29/39 configured and 0/39 Word accepted.

```sh
bun scripts/docx-next-lead-padding-probe.ts /tmp/lead-padding
python scripts/docx-next-populated-row-qa.py /tmp/lead-padding --matrix lead-padding --observe
# Exploration exits with the recorded positive-control failure.
python scripts/docx-next-populated-row-qa.py /tmp/lead-padding --matrix lead-padding --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-lead-padding-evidence.json
python scripts/docx-next-populated-row-test.py
```

Next: establish a matched zero-lead negative/positive comparison with the original paragraph representation, preserving all other ownership and attachment flags. This would distinguish an orientation failure already present without the 220 mm lead from a boundary triggered by it. Do not combine rejected tail attachment or padding changes; stop immediately on right regression or lost text/bounds/Save-Reopen. No production architecture choice follows from these rejected isolated controls.

Existing supported Sidebar refresh: [31 fixtures / 253 dossier pages](sidebar-supported-refresh-evidence.json) pass native package, complete PDF text, page counts, bounds/images and actual Save/Reopen on the same local engine. Production sources are unchanged from the fetched checkpoint. Six synthetic images use an explicit Pillow EXIF/ICC/sRGB adapter with the canonical fixture/manifest generator body. Browser image decoding and decoration pixel checks were not rerun; this is a native fixture refresh, not browser decoder acceptance. Twenty-six evidence tests and seven stable-comparison tests pass locally. Locked application/type/unit/browser checks are verified only through exact-commit CI.

Published evidence at `d1bd3ab8f10947fe05493cf063dc0a3299ca9498`: [stable comparison](https://github.com/modebrecht/cv-cover-charm/actions/runs/37613464448) verified successful with identical source packages and zero changed cases; [application regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/37613464420) verified successful, including 1007 unit tests, type/format/lint/build and all eight browser groups. The existing 21 lint warnings remain; no local full TypeScript success is claimed.
