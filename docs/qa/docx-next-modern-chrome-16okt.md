# Modern compact chrome correction after screenshot review

**Later screenshot triage:** [Pill display and right-edge investigation](docx-next-modern-edge-review-16okt.md) records the user's Word Print screen and two PDF-renderer checks. The exact Word PDF is still unavailable; no additional product change was made.

**PARTIAL. The bounded Modern app candidate now follows the actual Web compact header/footer geometry. Supplementary visual and regression checks pass. New desktop Microsoft Word acceptance remains UNVERIFIED.** This follow-up stays on `investigate/docx-next-design-fidelity-16okt`, after the four-template investigation commit `13145d71e34f85ba07af68d9be125bec2627e459`. Remote dev remains `8901a830a792d75e9e792345c5180827218b4e1e`.

## User evidence and corrected assessment

The user supplied a three-page screenshot and reported a pale badge background and an unacceptable Letter/CV footer. The local screenshot was inspected. Its date/name/layout resemble the normal fixture, but no corresponding DOCX, Word version, Word-generated PDF or saved project accompanied it. Exact source equivalence and Word print output cannot be established from this screenshot alone.

The previous report proved that adjacent pages were unchanged. That is a regression property, not evidence that those pages already reproduce the Web design. The footer was visibly poor before this correction and should not have received an implied design acceptance.

| Finding | Evidence and cause | Action |
| --- | --- | --- |
| Badge looks pale in Word's editing view | Badge paint is anchored in the cover header, while its editable text lives in body frames. Screenshot fill RGB `(250,189,200)` equals the prior native rendered fill `(245,123,144)` blended 50% with white, within rounding. Microsoft's Word guidance describes inactive header/footer dimming and full color in print preview. This is a strong display-effect explanation, not verified Word PDF evidence. | Preserve authored badge colors. Do not compensate for UI dimming by changing document paint or moving the proven frames. Check Word File → Print and a Word PDF next. |
| Excessive footer height | Actual same-project Web capture measures approximately **4 mm**, with no text. The previous native model paints **16.7333 mm** because it adds the 12 mm Word story distance to a text-derived height. | Paint the source's visual height independently of Word story distance. |
| Tiny invented footer name | Native chrome injects the contact name when no custom fields exist. Compact Web chrome only paints a strip unless custom content is enabled. | Empty compact footers stay empty. Applicant names remain native editable text in Letter/CV bodies. |
| Full-page border and missing compact top strip | Web applies the border to horizontal band edges. Native generation turns it into `w:pgBorders` and omits the source-sized compact header strip. | Use existing decorative rectangle primitives for both compact bands and their edge rules; remove this candidate's full-page border. |

Microsoft source: https://learn.microsoft.com/en-us/answers/questions/5148107/header-and-footer-blurry-in-microsoft-word . The associated answer explains inactive-story dimming and that print/PDF are unaffected. No quotation is needed to reproduce the repository diagnosis.

## Small bounded implementation

`compactChromeComposition: "source-bands"` is a separate explicit model option. Only Modern declares the reusable compact-band policy. The real Modern opt-in app entry selects it; ordinary DOCX Next and Brief do not. Activation remains `/?docx-next-design-qa=1` → dossier dialog → **Modern DOCX Next testen**. The dialog states the supported empty compact bands.

The pure model helper consumes resolved saved chrome options and the existing shared geometry functions. It uses existing decorative shapes and the unchanged native renderer. Header/footer heights, resolved palette, opacity and horizontal edge thickness come from the same source contract as the Web. The default footer is 4 mm, with 0.92 surface/edge opacity. Header paint starts at page top. Paint contains no semantic text. No XML patch, spacer chain, image of semantic text, new Word shape engine or production default is introduced.

Body blocks, body page geometry, native semantic text, cover composition, crop settings and controls remain unchanged. Existing conservative body reservations are retained to protect pagination; this does not claim full Web/Word Letter/CV parity.

This candidate accepts empty compact solid-color header/footer bands. Other chrome modes, enabled header/footer custom text and unsupported gradient/geometry states fail visibly before a download. No custom text is silently removed. These additional restrictions are deliberate until a measured native text-layout proof exists. They apply only to the Modern opt-in candidate.

The first additional render showed that clearing the existing empty native header carrier let opaque paper cover the Letter text in supplementary Writer rendering, despite extractable text and unchanged body models. That candidate was rejected. Keeping the renderer's existing empty header carrier resolved the visible defect. The tests now preserve that carrier. No engine or renderer change was made. This is further evidence that model/text completeness alone is not a visual gate.

## Verified results

| Gate | Result |
| --- | --- |
| Actual saved-project restore → UI button → download | **3/3 PASS**: normal, 115%, long title/name. Every file has four A4 pages: one cover, one Letter, two CV pages. |
| Cover regression | **3/3 whole-cover rasters and canonical cover models identical** to the prior published candidate; Web cover captures identical. |
| Letter/CV body regression | **9/9 content-region rasters and body glyph positions identical**; full body blocks and page geometry identical. Full pages intentionally differ at chrome and the old footer name. |
| Body comparison region | A4 X=10–200 mm, Y=5–275 mm, encompassing these fixtures' unchanged native body content. Whole-page glyph extraction and bounds were also inspected; this region is not a general overflow acceptance rule. |
| Footer/header source comparison | Real Web captures show empty approximately 4-mm compact bands. Candidate uses 4 mm, no implicit footer text, horizontal edges and no full-page border. |
| Explicit app rejections | **3/3 PASS**: enabled custom footer text, details-footer mode, opt-in off; no download. Unit coverage additionally checks modes and saved dimensions/palette. Earlier 14-path evidence remains historical; it was not all rerun for this follow-up. |
| Ordinary DOCX Next | **3/3 baseline packages byte-identical** to the previous same-source dev-verified exports. |
| Brief regression | **1/1 actual normal app export byte-identical** to the prior #37C golden; remaining earlier Brief cases were not rerun here. |
| Full unit suite | **1,191 PASS**, zero failures, 22,967 assertions across 248 files. |
| Dedicated DOCX suite | **378 PASS**, zero failures, 5,886 assertions across 58 files; overlaps the full unit suite. |
| Typecheck, formatting, lint, production build, diff checks | PASS; lint retains 21 existing warnings and no errors. |
| Native rendered visual review | PASS in supplementary LibreOffice. All six distinct page images inspected; nine body-page images are identical across the three cases. |
| Desktop Word editing, visual and Save/Reopen acceptance | **UNVERIFIED** for these corrected files. |

[Validation](docx-next-modern-chrome-16okt/validation.json), actual app evidence and [comparison](docx-next-modern-chrome-16okt/compact-chrome-a4-comparison.pdf) are in the packet. The comparison includes actual Web, prior native and corrected native pages. Its native panels are LibreOffice output, not Word screenshots. The screenshot itself was not republished to the repository.

Primary new candidate: [modern-compact-normal.docx](docx-next-modern-chrome-16okt/modern-compact-normal.docx). Scaled and long variants are included. The original candidates remain preserved in the earlier packet. [Changed files](docx-next-modern-chrome-16okt/changed-files.json) lists this follow-up only.

## Reproduction and next gate

Use the same supported Sans/fontconfig and primary runtime environment as the earlier report. Before/after app capture folders must include models, metrics, actual DOCX downloads and rendered page images. To reconstruct the old side, use a separate checkout of `13145d71e34f85ba07af68d9be125bec2627e459` and its app runner for normal/scaled/long; do not reset this branch.

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_COVER_CASES=normal,scaled,long \
  bun scripts/docx-next-brief-app37c.ts /tmp/modern-compact-app
# Render each actual downloaded candidate.docx with render_docx.py --dpi 120 --emit_pdf
# into its case's rendered/ directory. Render prior candidates into candidate/.
python scripts/docx-next-compact-chrome-qa37d.py /tmp/prior-modern-app \
  /tmp/modern-compact-app /tmp/modern-compact-packet
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_ONLY_NEGATIVES=1 \
  DOCX_NEXT_NEGATIVE_CASES=chrome-content,chrome-mode \
  bun scripts/docx-next-brief-app37c.ts /tmp/modern-compact-negative
bun test tests/unit --timeout 30000
bun run test:docx-next --timeout 30000
bun run typecheck
bun run lint
bun run build
```

Open the new normal candidate in desktop Word. Compare the footer in editing view and File → Print; check the badge in print preview without compensating its authored color. Save/reopen a copy, export a Word PDF and inspect all four pages. Then test scaled and long. Preserve the original downloads. The existing separate badge paint still does not automatically grow after direct Word text edits. Custom semantic chrome needs its own bounded proof before enabling it. Other audited templates and the all-39 matrix remain outside this correction.

## Publication and boundaries

The exact branch remains explicitly disabled in `vercel.json`; existing push workflow filters do not match it. Only this investigation branch is updated with a fast-forward. No merge, deployment, default switch, PDF/Print, Legacy DOCX, Sidebar, Agent A, #14, #25 or #38 changes. The publication SHA is the commit containing this report and is supplied in the handoff. Post-push ref/deployment/CI verification is reported there.
