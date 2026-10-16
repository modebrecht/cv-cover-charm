# Modern Word return and shared background candidate

**PARTIAL. The returned normal Word file preserves content, frames and badge paint. The right-edge defect is confirmed in the actual Microsoft Word PDF. A bounded replacement uses the existing shared-background primitive; its new Word acceptance is UNVERIFIED.** No other template is enabled. This follow-up starts at `c9476b3618265c8e9e111c7fd59d0a1e3f38002e`, after fetching remote dev (`8901a830a792d75e9e792345c5180827218b4e1e`) and the own investigation branch. `AGENTS.md` was reread; published history is preserved.

## Actual user evidence

The user returned `modern-pill-body-normal-111.docx` and `modern-pill-body-normal-111.pdf`, and screenshots of the CV contact block and right band edge. Both attached files were inspected directly from the supplied local copies. The PDF identifies Microsoft Word for Microsoft 365 as its creator/producer and has four A4 pages. All four PDF pages were rendered and inspected. Poppler and MuPDF show the same pale pill color and short band edge.

The user reports opening and saving the document and producing the PDF. A separate close/reopen cycle and interactive text edits are not independently documented. The resulting package and Word PDF are real evidence; they do not imply that the complete Word acceptance matrix has passed. The returned files are not republished in this Git repository. [Inspection data](docx-next-modern-word-return-16okt/word-return-inspection.json) records hashes and bounded numerical findings.

| Check on the returned file | Result |
| --- | --- |
| Native semantic controls and values | **82/82 unchanged** versus the original candidate. Every nonempty control's text occurs in the Word PDF after case/whitespace normalization. |
| Cover paragraph frames | **11/11 geometry records unchanged**. Word removes explicit zero spacing and automatic-height defaults; it does not change the stored coordinates or widths. |
| Pill | PNG bytes, page-relative anchor, extent, body-story location and native editable text retained. No body-to-header migration. |
| Sections and pages | Three sections, four A4 PDF pages; one cover, one Letter, two CV. No new cover page or visible cover overlap/clipping. |
| Contact values | Address, postcode/town, phone, email and birth date are present. Birthplace, origin and nationality are empty in this fixture's saved source. The user corrected the initial report of missing contact data: the complaint concerns appearance. |
| Word header/footer edge | **FAIL**: dark fill ends before its rule and the page edge on all three interior pages. |

## Pill color is not identical to the labels

The authored accent is `#F43F5E`. The shared Web presentation classifies `lehrbeginn` as muted and applies Modern's **0.68** group opacity. Heading accent treatment uses **0.96**. Native text composites that latter value against the paper and stores `#F44664` for both KONTAKT and BEILAGEN. The returned DOCX retains those values.

The actual Word PDF renders the pill's dominant interior color as approximately **`#F5798E`**, measured with both PDF renderers; native heading text is **`#F44664`**. Visible output is therefore not the same hex, even though both originate from the same authored accent. Alpha/raster/color conversion can introduce small additional rounding differences. The principal lightening already exists in the Web role settings; moving the pill out of the inactive header did not make it opaque. This candidate does not alter the Web design or compensate by inventing a different DOCX accent. Equal visible colors need a deliberate shared presentation change.

## CV contact design is a distinct fidelity issue

The source Web layout uses `grid-template-columns: max-content minmax(0, 1fr)` and a 2.5-mm gap. It forms a compact contact block below the name. The native model instead creates a full-width contact table with **50/50** tracks and a separate personal-detail table with **30/70** tracks, adds a Kontakt section heading/rule and native paragraph spacing. These choices are made in canonical composition before Word rendering; Save/Reopen did not remove data.

The two native grids place related values on different horizontal alignments and spread short content over the page. This explains the user's screenshot and is a confirmed design mismatch. A later bounded contact correction should reuse native flowing tables and one common measured column edge, handle long addresses/emails and all saved personal-info settings, and compare the actual same-source Web state. An arbitrary smaller percentage or fixed example-specific width is not justified. This change leaves the contact model untouched so the edge trial has one independent variable. Existing CV pagination also differs from the Web's compact layout and is not globally accepted here.

## Right-edge diagnosis from Word output

All compact fill/rule anchors retain `cx=7560000` EMU (210 mm), `x=0`, and identical extents before and after the user's save. Original raster last columns are painted. The Word PDF nevertheless uses different transforms for the independent shallow images:

| Word PDF object | Right edge | Gap to PDF page right edge |
| --- | ---: | ---: |
| Dark header/footer fill | 592.940 pt | **0.840 mm** |
| Horizontal edge rule | 595.000 pt | **0.113 mm** |
| PDF page | 595.320 pt | 0 |

This occurs on Letter and both CV pages. It is materially larger than the earlier nominal A4/twip discrepancy. The [earlier read-only triage](docx-next-modern-edge-review-16okt.md), which lacked the Word PDF, could not reproduce the user's unequal lengths in its native-renderer references. This new evidence rules out a pure viewer/raster-preview explanation for this returned file.

**Confirmed:** correctly equal stored extents become unequal independent image transforms in Word's PDF output. **Not isolated:** the precise Office scaling/quantization algorithm, or whether the fault already occurs on first open versus being introduced by saving. No XML geometry drift is observed. The user file does not justify blaming the PDF/Print app exporter; that separate exporter was not changed.

## Focused candidate

The existing guarded `composeSourceCompactBands` now selects `part.pagePaintComposition = "single-asset"` for Modern Letter/CV. The existing renderer already implements this generic mode. It composes paper, nonsemantic motifs, bands and rules into one page-sized decorative image per header story, giving the fill and rule one shared native transform. This removes their independent resizing path. Native body text, semantic controls and pictures remain separate. No renderer/engine edit, XML repair, arbitrary bleed/spacer, default switch, new layout system or semantic rasterization.

Flattening these background decorations removes their separate picture handles in Word. It does not flatten semantic text or cover photos. The download grows from about 166 KiB to 307 KiB. The cover, body text and saved design inputs remain unchanged. Residual outer-page rounding must be checked in Word; a one-transform model alone does not prove zero visible edge pixels.

**[modern-shared-edge-normal.docx](docx-next-modern-word-return-16okt/modern-shared-edge-normal.docx)** is an actual saved-project restore → Modern opt-in UI download, copied without package repairs. SHA-256: `08995f810340419b57b9ae56f5a1e99f55c01bfcdeac30b0d4baccb886f6701b`.

| New candidate gate | Result |
| --- | --- |
| First normal actual app export | **PASS**; UI download equals the app entry; saved state unchanged. No broader case expansion before Word proof. |
| Native render | Four A4 pages; all four images inspected. Cover model and full-cover raster identical to prior candidate. |
| Letter/CV text and boundaries | Canonical body/page settings unchanged; **all four pages' native glyph positions identical** to the prior supplementary render. 82 native controls retained; no text rasterized or omitted. |
| Background serialization | One decorative anchor in each Letter/CV first/default header, replacing independent shallow band/rule anchors. Both now share the same transform by construction. |
| Visual/raster limitation | Interior whole-page pixels change with recomposed background paint and antialiasing; no claim of pixel identity for those pages. The text coordinates and semantic models remain identical. |
| Ordinary Next and Web | Normal baseline DOCX byte-identical; all three actual Web page captures byte-identical. |
| Full unit suite | **1,193 PASS**, zero failures, 22,998 assertions, 248 files. |
| DOCX suite | **380 PASS**, zero failures, 5,917 assertions, 58 files; overlaps the full suite. |
| Typecheck, formatting, lint, build, diff | PASS; repository lint has 21 existing warnings, zero errors. |
| New desktop Word edge, editing and Save/Reopen | **UNVERIFIED**. Only the prior returned candidate has Word evidence. |

The [A4 comparison](docx-next-modern-word-return-16okt/shared-edge-a4-comparison.pdf) has four before/after pages, explicitly labelled as supplementary LibreOffice. It does not simulate a new Word result. [Candidate validation](docx-next-modern-word-return-16okt/candidate-validation.json) and actual saved-state evidence accompany the download.

## Reproduction and next steps

Use the previously documented supported Sans/fontconfig, primary runtime and Chromium. First generate just normal with the existing app runner, render the downloaded file into `normal/rendered` with `render_docx.py --dpi 120 --emit_pdf`, then run:

```sh
python scripts/docx-next-word-return-qa37d.py original-pill-body.docx \
  returned-word.docx returned-word.pdf /tmp/prior-pill-app/normal \
  /tmp/shared-edge-app/normal /tmp/shared-edge-packet
```

The review helper only reads input documents. It publishes hashes/measurements, not returned user documents. The prior app reference is from `c9476b3`. Recreating that reference requires its own checkout; do not reset this branch.

Next Word gate: open the **shared-edge** normal file, inspect both right edges on pages 2–4, save as a new R2 copy, close/reopen and export a Word PDF. Retain the R1 pair; do not retest an old file by mistake. Stop if this candidate fails; do not expand its mechanism to other templates.

Other open work: compact native CV contact design; any intentional shared change to pill/heading opacity; Word testing of 115%/long/moved/photo/stress settings after the normal edge proof; then the selected diverse-template cohort and ultimately all 39. Neither this normal return nor this local candidate is full #37D acceptance.

## Publication boundaries

Own branch only: `investigate/docx-next-design-fidelity-16okt`. Exact branch and wildcard Vercel deployment exclusions remain false; workflow push filters do not match this branch. No merge, deployment, production promotion, default switch, PDF/Print, Legacy DOCX, frozen Sidebar, Agent A, #14, #25 or #38 changes. No native-engine investigation restart. [Changed files](docx-next-modern-word-return-16okt/changed-files.json) lists this follow-up. Live deployment/CI queries and protected refs are checked around publication; the handoff supplies the exact commit.
