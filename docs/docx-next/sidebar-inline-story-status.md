# Complete inline main-story owner — 2026-10-08

## Primary contract and bounded scope

This continues freshly fetched clean `dev` `d78986a01a7f9964557d7facf004676928a534a7`. Its final M6/application 37826017773 (all eight browser groups), stable 37826018011 and gallery 37826017673 are successful. The downloaded final artifact 11571278216 has verified SHA-256 `c2a69801c8157c5194b8142eaca2f10ef15f08752ef4bb1d791c3386ba18f7b9`; both strict baselines, all 24 sources, eight saved packages and 96 original RGBA PNG digests match. Its archived complete-story report exactly matches the independent baseline. No predecessor CI remains pending.

Microsoft's [table-row continuation contract](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.donotbreakconstrainedforcedtable?view=openxml-3.0.1) describes automatic splitting of a row longer than one page around a floating table when `cantSplit` and `doNotBreakConstrainedForcedTable` do not prevent it. This supplies a native multi-paragraph owner mechanism; it does not promise this application's simultaneous story openings.

The [actual lateral wrapping implementation](https://github.com/LibreOffice/core/commit/868140fcc1311259b9d5f666637b33d226511a53) lays out an inline table beside a splittable floating table when there is enough space. The [right-side correction](https://github.com/LibreOffice/core/commit/6e3ad6ca0ae6cf62056610ddae9097973a887d99) retains inline content on the left when it already fits. The unchanged primary reference packages have verified original Git blob hashes and SHA-256 values in the [evidence](sidebar-inline-story-evidence.json). Each reference contains two tables with two paragraphs each; its test checks single-page lateral positioning. Neither reference asserts concurrent long-story continuation. The [nested-case rollback](https://github.com/LibreOffice/core/commit/2da4acdbf8c5a8ba3ef51e5f5dc3439716e71a91) restricts this wrapping behavior to top-level floating owners; this diagnostic leaves its side story top-level. These scope limits are retained, rather than claiming upstream acceptance of a dossier.

## One complete native owner, no renderer change

The diagnostic wraps the original **complete main block sequence** in one inline table's automatically splittable cell. It retains each original paragraph, ID, paragraph rule and nested entry table. It introduces no fixed height, page count estimate, linked frame, semantic splitting, visible-text ID matching or source/saved XML repair. The generic renderer/model and production exporter are unchanged; both ordinary and JSON-restored candidate exports require the existing diagnostic opt-in.

Six sources are declared before execution: left then right, short / side-long / both-long. A matched original source is generated only for read-only source comparison, never natively rendered as a new matrix. Every original source hash matches the previous pinned continuation inventory. All package parts except `document.xml` are byte-identical. Read-only native comparison proves that the wrapper's child block subtrees equal the original main block subtrees, including native paragraph properties and entry-table structure. Empty native helper paragraphs remain unowned and contain no semantic text.

The new QA applies the complete-story contract to actual source/saved XML order, full paragraphs, canonical IDs, every cell ancestor and raw native text. It separately checks every CV table's exact width, grid, indent, row splitting and cell widths, the existing floating geometry/policy, all nine main opening positions, exact visible lane sequences, text multiplicity, bounds and every RGBA page pixel. Original table captions remain a separate failed gate. Source/native audit cannot replace caption identity, photo/chrome checks or Microsoft Word execution.

## Actual development result: rejected

| Actual source | Dossier pages | Nine main opening positions | Complete native order/text/owners | Exact native tables | Complete visible sequences |
| --- | --- | --- | --- | --- | --- |
| Left short | 3 | 1,1,1,1,1,1,1,1,1 | pass | pass | pass before/after Save/Reopen |
| Left side-long | 9 | 7,7,7,7,7,7,7,7,7 | pass | pass | pass before/after Save/Reopen |

Both actual cases preserve **26 whole main paragraphs and six original native entry tables**. The short has 21 side paragraphs; the long has 73. No visible title duplication occurs. The main story nevertheless starts only on the floating table's last CV page in the long case. **Stop after two actual cases / 12 dossier pages**, plus native Save/Reopen and second PDFs. All 24 PNG instances are audited. The other four sources remain explicitly unrendered; no right/both-long extension follows this rejection. All original captions are still lost.

Eleven adversarial tests reject flattening equal visible text, reordering equal paragraphs, changed original flags, extra unowned text, nonsplittable/fixed-height/floating or duplicate main owners, and changed strict native/source/geometry/visible/pixel/stop evidence. The 18 existing complete-story tests remain. Native/PDF files are only read for auditing. An actual report is saved before baseline comparison can reject it; the workflow archives diagnostics even on failure.

Independent stable execution of this exact published source is pending. The development result is recorded separately and is never assumed to equal stable pixels. The first bounded stable run observes actual failures without acceptance; after downloading/verifying its artifact, its exact result becomes the required independent strict baseline. All older strict baselines remain unchanged.

## Next gate

The complete owner solves native ownership scope, but does not move the main story ahead of the existing floating anchor's final page. Do not extend this rejected wrapper matrix, retry paragraph flags/widths/crops, remove native helpers by guessing, or flatten the story into one anchor paragraph. The next step is to inspect the primary native attachment/anchor lifecycle of a complete owner before declaring another candidate. Production remains blocked: **29/39 configured, 0/39 Word accepted**. Legacy/V2, application/PDF/portable JSON, `main`, `render`, deployments and promotion are unchanged.

```sh
bun scripts/docx-next-inline-story-probe.ts /tmp/docx-next-inline-story
python scripts/docx-next-inline-story-test.py
python scripts/docx-next-inline-story-qa.py /tmp/docx-next-inline-story --observe
```
