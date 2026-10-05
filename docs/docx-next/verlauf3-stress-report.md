# Verlauf 3 checkpoint — 2026-10-05

Freshly fetched clean remote `dev` at `acfa589ad5401f875ed1da53fe81c419b182281f` is the authoritative batch starting point. 19/39 configured candidates; 0/39 Word accepted.

- 14/14 fixtures, 100 pages: stable LibreOfficeKit 25.8.7.3 render/save-reopen passed.
- Native semantic text/media, ZIP/XML/relationships, body bounds, long flow/tails and scoped paint passed. Full-sheet paint has independent analytic composite probes; multi-stop interpolation has actual Chromium pixel checks.
- 218 targeted Next tests and TypeScript passed. Batch validation: 920 full units across 194 isolated files, TypeScript, lint (0 errors/21 existing warnings), production build and release format pass. All 293 prior packages remain byte-identical; 17 prior normal fixtures/68 pages pass stable render/save-reopen.
- Actual editor rename/reload, portable JSON save/load, independent native Next export and existing combined production PDF passed. Browser designs and representative cover/photo, letter, header-off and long/continuation output were visually inspected.
- CI is deferred until all three coherent local commits are published together, per user instruction.

[Coverage](verlauf3-feature-coverage.md), [hash ledger](verlauf3-stress-evidence.json). Microsoft Word acceptance: **pending**. No manual deployment, branch promotion or production DOCX switch.

The added `cover-long` fixture verifies two native cover pages with repeated full-sheet paint and readable editable text after save/reopen. Explicit generic paint layers keep the paper underlay below the gradient in both stories.
