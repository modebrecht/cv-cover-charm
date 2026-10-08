# Continuous native cells regress the positive right opening

Continued from freshly fetched clean remote `dev` at `9f4e286a7754ce084f5c9051034d7ad417c137a7`. M6/application 37743779167 and all three stable jobs 37743779154 are verified successful before this continuation. The [main-lead ending result](sidebar-lead-main-ending-status.md) calls for a different native composition rather than more paragraph-flag or width guessing. This bounded diagnostic consolidates each track's existing paragraphs into one continuous, splittable native cell, removing the three outer rows and side vertical merge. It retains the complete 220 mm lead, all ten complete paragraphs and their explicit flags, canonical IDs, per-track order, original table ID, exact declared widths, physical text lanes, paint and terminal insets. The new single row has detached required empty endings. Existing generic table primitives author the composition; no renderer/application change or package repair is involved.

Four sources are prepared in the declared order: original right control, right continuous owner, original left control, left continuous owner. Both original control package hashes equal the preceding independently executed main-lead controls. Immutable model/JSON package restoration and default export rejection are verified for every prepared source. The candidate changes native row/cell ownership and its associated required endings; it does not split a semantic description or measure pages.

| Right composition | Main opening CV pages | Side opening CV pages | Complete native/PDF text | Dossier pages | Product result |
| --- | --- | --- | --- | --- | --- |
| Original three rows | 2,2,2,2,2 | 1,1,1,1,1 | pass | 21 | bounded render pass |
| Continuous cells | 1,1,1,1,2 | 1,1,1,1,1 | pass | 21 | main description detached |

Local Dev 26.8 / CLI executes **two actual cases / 42 pages**, plus native Save/Reopen and second PDFs. The candidate regresses the positive right opening: the metadata moves onto CV page 1 while its complete description starts on CV page 2. The side opening stays attached. All 41 canonical fields, ten whole native paragraphs, exact authored row/cell/spacer owners and explicit paragraph/ending policy survive Save/Reopen. All complete PDF text and physical body/lane bounds pass, and Save/Reopen repeats the same opening pages. The original caption disappears in both saved cases; both exact grids change `[6508,340,2789]` to `[6508,340,2790]`, with table width 9638 twips unchanged. Both failures remain separate blocked gates.

The right candidate triggers the strict stop. **Both left sources remain explicitly unrendered.** Removing the side merge and keeping a complete paragraph chain in one main cell is therefore insufficient for this populated right specimen. It does not prove the full editor cause, universal table failure or Microsoft Word behavior. No follow-on photo/chrome/boundary matrix is built on it.

All **84 actual source/saved page PNGs** are audited using dimensions and every RGBA byte (52 unique local variants). The candidate's first two CV pages are visually reviewed and show the detached description. Source versus saved pixels differ on all 19 CV pages in both controls; preserved text/owners and the repeated opening observations do not imply pixel or geometry invariance. Twelve adversarial baseline tests protect source hashes, complete text, explicit policy/owners, caption failure, one-twip grids, the right split, exact stopped/unrendered sources and all CV channel bytes. Same-runtime raster comparison covers every page; cross-runtime comparison retains cover/letter variants as actual observations and requires every CV digest exactly. Native/layout results and source hashes remain strict; only saved ZIP metadata hashes and the existing metadata-glyph tolerance are exempted.

[Actual evidence](sidebar-continuous-cell-evidence.json) initially records Dev CLI; the stable workflow independently executes the exact source packages and strict stopped plan. Stable/Word results are not inferred from the local engine. Counts remain **29/39 configured, 0/39 Word accepted**. Production DOCX, PDF/portable JSON, Legacy/V2, `main`, `render` and all photo gates remain unchanged.

```sh
bun scripts/docx-next-continuous-cell-probe.ts /tmp/continuous-cell
python scripts/docx-next-continuous-cell-qa.py /tmp/continuous-cell
# Stops with the retained actual right regression.
python scripts/docx-next-continuous-cell-qa.py /tmp/continuous-cell --baseline docs/docx-next/sidebar-continuous-cell-evidence.json
python scripts/docx-next-continuous-cell-test.py
```

Next: verify the independently published stable artifact and exact-commit application CI. Do not extend this rejected composition or resume flag/width/crop variants. A next architecture proposal must explain a native continuation mechanism for both editable stories before authoring another matrix. Ordinary native columns are sequential flow, and linked text boxes describe a pre-existing story chain; those contracts alone do not establish automatically generated independent continuation pages. Primary references: [Word column flow](https://support.microsoft.com/en-us/word/insert-a-column-break), [native linked-story identifiers](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-odrawxml/bddd410e-b5a3-4af0-b5ac-96074a6d25e8), [Writer linked-frame constraints](https://books.libreoffice.org/en/WG262/WG26206-FormattingPagesAdvanced.html). This is a feasibility constraint, not an executed linked-box result or a Word acceptance claim.
