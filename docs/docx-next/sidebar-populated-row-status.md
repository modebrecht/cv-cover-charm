# Sidebar populated outer rows — orientation counterexamples

Continued by [the opening-ending scope counterproof](sidebar-main-ending-status.md): main-only attachment leaves the left failure unchanged and preserves the positive right control. The next task at the end of this historical checkpoint has been completed.

Starting remote `dev`: **`d2ea095ad00bc375971e082f661b3f0a743cad5e`**, freshly fetched and matched to a clean checkout. This follows the [six-boundary selective-row proof](sidebar-selective-row-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

The selective outer-row proof does not yet generalize to populated independent tracks. Four matched dossiers put one complete, multi-page native description in each track at the authored 220 mm boundary. The right Sidebar selective control passes full text, opening attachment and body/lane bounds. The left Sidebar selective control preserves both texts but detaches the main description from its metadata. The original right grid loses description text in both tracks and places one visible span outside the body. These are real product failures, not missing acceptance assertions.

| Sidebar side | Ownership             | Dossier pages | Main opening CV pages | Main / side complete PDF text | Visible bounds |
| ------------ | --------------------- | ------------- | --------------------- | ----------------------------- | -------------- |
| Left         | Original grid         | 21            | 1, 1, 1, 1, 2         | pass / pass                   | pass           |
| Left         | Selective opening row | 21            | 1, 1, 1, 1, 2         | pass / pass                   | pass           |
| Right        | Original grid         | 5             | 2, 2, 2, 2, 2         | **fail / fail**               | **fail**       |
| Right        | Selective opening row | 21            | 2, 2, 2, 2, 2         | pass / pass                   | pass           |

Tuples are heading/date/title/place/description opening. Side openings all remain on CV page 1; the positive right control therefore preserves different authored opening positions in the two tracks. The **four controls / 68 pages** repeat after save/reopen. All ten complete native fields remain in both source and saved DOCX even where the PDF omits text. Source data integrity alone is insufficient for acceptance. One control passes the tested product gates; three fail. Further boundaries, side entry collections, photos, picture/span ordering and chrome were stopped at this counterexample set.

The same five main paragraphs are retained from the prior proof. The side source declares its own semantic IDs and five paragraphs, with a single complete flowing description. Mirroring changes physical columns, vertical span declarations and boundary paint without changing any paragraph/run/property/ID. Exact physical lanes match between grid and selective policies; metadata X positions and glyph widths match before and after save/reopen. The mirrored failing grid and corrected positive selective PNGs were inspected. An initial scratch mirror mutated a shared decoration array twice; the lane-equality assertion caught it before publication. The retained fixture copies mirrored arrays and verifies equal widths and unchanged semantic paragraphs. This scratch outcome is not used as evidence.

The orientation asymmetry implicates native multi-cell/span context but does not identify a LibreOffice source-code defect. The positive right case is limited to one boundary and does not establish general right Sidebar support or Word acceptance.

## Retained diagnostic work

- A neutral fixture/probe preserves complete paragraphs across policies and both orientations, checks immutable deterministic model JSON packages and keeps selective native endings blocked from default/JSON export.
- A dedicated four-case QA script requires every native source/saved field and exact row ownership/endings. It records complete text visibility separately for each physical lane, field opening pages, visible-text character counts/hashes, glyph geometry, body/lane violations and save/reopen invariance. Reviewed failures remain explicit `productGates: fail`; they are never relabeled as acceptance.
- The original supported-fixture and cell-ending QA gates remain unchanged. The new failure recorder is restricted to these four diagnostic cases. Changed text visibility, bounds or openings require review; a matching input hash is mandatory before comparing engines.
- The existing bounded `dev`-only pinned stable workflow adds these controls to its 54 previous controls and checks the actual source-identical failure evidence against the [development baseline](sidebar-populated-row-evidence.json). Its exact-commit stable result and application regressions are reported separately from publication CI. Artifacts retain all source/saved packages, PDFs, PNGs and actual reports, including failures.

No file under `src/`, application descriptor or template registration changes. Existing generic table, vertical-span and guarded cell-ending primitives are reused. No template-specific renderer, visible-text renderer matching, semantic text segmentation, fixed-height clipping or package repair is introduced. Existing Sidebar and production export guards remain active.

## Validation

- **Four controls / 68 pages:** fresh package and source/saved field integrity, per-lane PDF observations, geometry and save/reopen invariance pass. Product outcome remains **one pass / three failures**, as declared above.
- **31 existing Sidebar fixtures / 253 pages:** fresh supported package/render/save-reopen gates pass; every source DOCX is byte-identical to the starting checkpoint under the same explicit Pillow image adapter.
- **31 immutable Sidebar model roundtrips**, unsupported mirrored-picture rejection and **two actual portable project/photo restorations** pass.
- Seven flow tests, seven prior comparison tests and four new evidence regressions pass. Two new units protect physical widths, complete paragraphs/field IDs, span ownership, mirror aliasing, export guards and deterministic JSON packages. Python compilation, formatting and whitespace checks pass. Full locked units, TypeScript/lint/build and eight browser/PDF/dossier groups come from commit-specific publication CI.

Local engine: LibreOfficeDev 26.8.0.0.alpha0, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Stable verification uses the existing hash-pinned LibreOffice 25.8.7.3 CI runtime. Microsoft Word remains unverified. No manual deployment, promotion, production DOCX switch, Legacy deletion or template migration.

## Reproduce

```sh
bun scripts/docx-next-populated-row-probe.ts /tmp/docx-next-populated-row
python scripts/docx-next-populated-row-qa.py /tmp/docx-next-populated-row --soffice /path/to/soffice
python scripts/docx-next-populated-row-qa.py /tmp/docx-next-populated-row --libreofficekit /path/to/lo-kit --require-stable --baseline docs/docx-next/sidebar-populated-row-evidence.json
python scripts/docx-next-populated-row-test.py
bun run test:docx-next
```

## Exact next task

Isolate the **scope of the short opening row's cell-ending attachment** with the same populated sources and both orientations at 220 mm. Compare the current all-cell opening endings against attachment of only the main cell ending, with the gutter and spanning-side continuation endings explicitly detached. Reuse `cellEndKeepNext`; preserve all rows, spans, native paragraphs, physical lanes and complete descriptions. Require both-track full text, body bounds, opening attachment and save/reopen on both engines. Stop if the positive right control regresses or text is lost. Only a positive matched result justifies the remaining boundaries and side entry collections. This is an unproven generic native paragraph-ownership hypothesis; no application enablement, template migration or template-specific branch.
