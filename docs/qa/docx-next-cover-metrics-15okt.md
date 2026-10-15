# Item 37 Brief font metrics correction

**PARTIAL. The reproduced 115% displacement and multiline leading defect are corrected in the guarded Brief candidate under a declared font profile. Seven Brief composition checks PASS. Desktop Word acceptance remains UNVERIFIED; the thin placeholder outline and production capture integration remain open. No all-39 expansion or production promotion.**

This continues commit `e51b1b739b003cc8149c0243674c020a5d5a8f42` on `investigate/docx-next-cover-fidelity-15okt`. Remote dev was fetched and remains `8901a830a792d75e9e792345c5180827218b4e1e`. Root `AGENTS.md` was read; published history is preserved. The [independent review](docx-next-cover-independent-review-15okt.md) and [first guarded candidate](docx-next-cover-brief-fix-15okt.md) remain historical evidence, including the rejected 38/39 floating-table experiment. No native Sidebar, Agent A, Items 14/38, native engine, PDF exporter or Legacy DOCX changes.

## Independent reassessment of the remaining failure

The preceding report correctly identified differing realized fonts but did not isolate their contribution from the candidate's own character-count estimate. That distinction matters: replacing fonts alone does not repair the candidate's vertical geometry.

The QA browser now loads the four Liberation Sans files shipped with the supplementary renderer under the existing Helvetica Neue/Helvetica/Arial aliases. This changes test font availability only; no application stylesheet, saved font key or production font mapping is changed. Each file hash and the browser's actual platform-font result are recorded. The native PDF reports LiberationSans/LiberationSans-Bold. This controlled profile is not proof of the user's original Web font or of desktop Word's Arial realization.

| Observation                  | Before                                                                                                                   | Isolated result / root cause                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Uncontrolled 115% comparison | Browser used DejaVu Sans Bold and wrapped the profession to two lines; native PDF used LiberationSans-Bold and kept one. | Different realized fonts make that comparison insufficient to identify the estimator defect alone.                                                                                                                                                                   |
| Matched-font 115% comparison | Both Web and native actually use one title line. The old candidate still puts the name at Y167.6705mm.                   | The character estimate `width / (pt × 25.4/72 × 0.6)` predicts two lines. Existing Web font measurement predicts one. Correct name Y is 152.33525mm; the unnecessary reservation is **15.33525mm**. Confirmed model-construction defect, independent of Save/Reopen. |
| Two-line long profession     | CSS asks for 36pt × 1.26 leading; native `lineRule=auto` applies 1.26 times the font's normal line calculation.          | CSS em leading and Word's multiple-of-normal leading are different quantities. Old native baseline advance is about 18.397mm versus Web 16.002mm.                                                                                                                    |
| Corrected long profession    | Explicit minimum leading expresses the intended point quantity while allowing growth.                                    | Native baseline advance differs from the captured Web value by **−0.003526mm** in the supplementary PDF. No exact frame or exact line height is imposed.                                                                                                             |

Microsoft documents `auto` as a multiple of normal line height and `atLeast` as a minimum line height, with absolute line values expressed in twentieths of a point: [SpacingBetweenLines.Line](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.spacingbetweenlines.line?view=openxml-3.0.1), [LineSpacingRuleValues](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.linespacingrulevalues?view=openxml-3.0.1). These definitions justify the representation; they do not establish candidate rendering or Word acceptance.

## Bounded architectural change

The earlier recommendation to use existing native automatic-height paragraph frames still holds. Neither a new text story nor another floating-table mechanism would solve the demonstrated metric/leading errors.

1. `captureCoverTextMetrics()` captures the **existing** Web resolver's fitted point sizes and line counts after fonts have loaded. It introduces no new wrapping algorithm and captures no DOM rectangles, CSS styles, page fragments or Y coordinates.
2. A small JSON-compatible `CoverTextMetrics` packet contains point sizes/line counts, a declared profile and an exact source key. The key covers authored text, styles, user-style precedence, element identity and scale; image bytes are excluded. Changed text, width or scale invalidates the packet. Missing, nonfinite, impossible or over-budget measurements are rejected.
3. The pure builder accepts that packet only with the already guarded `coverComposition: "authored-frames"`. It computes linked/bottom positions through the shared anchor resolver. The renderer reads only the detached canonical model. Source snapshot types and the production capture/export path are unchanged.
4. The canonical paragraph gains optional `minimumLineHeightPt`, serialized by the existing single renderer as native `atLeast` spacing. The existing relative rule is byte-identical when the property is absent. Model validation rejects invalid values. Automatic frame height and text editability remain intact; larger text can grow. Growth after editing may still collide with neighboring frames and requires Word testing.

The old unmeasured diagnostic mode remains available for comparison and remains unaccepted. The improved path requires an explicitly supplied measurement packet; it is **not wired into the product export UI**. A production implementation must establish and record a supported Web/Word font profile, capture fresh metrics at the existing snapshot boundary, handle unavailable fonts explicitly and pass Word growth/Save-Reopen gates before enabling this path. A descriptive profile string and a fresh source key do not prove font equivalence by themselves.

The builder's size-override guard rejects cover field sizes not included in the captured measurements. Custom text paint/lists/minimum boxes and oversized image states remain outside this bounded candidate. Existing Word half-point size quantization remains, so arbitrary scaled sizes are approximated by up to 0.25pt. CSS balancing, a font absent in Word, unusual scripts and post-edit growth have not been generalized or accepted.

## Original Word evidence recovered and rechecked

The original three DOCX files and two Word PDFs were recovered for local read-only inspection. No original user attachments are republished. The first report's temporary loss of local originals is no longer a blocker; original project JSON remains unavailable.

- `app-body-photo-right.docx` SHA256 is still `224d4a72efd800e5624bf0abcd88bcc4977d5dbc2127d050b31cb9b42bca85ae`.
- The existing historical generator reproduces the **entire original package byte for byte** with the unchanged frozen Sidebar options. This is fixture/package equivalence, not recovery of the original saved Web project.
- Both supplied Word PDFs remain pixel-identical across all three pages. Their cover fonts are ArialMT/Arial-BoldMT. These Save/Reopen files concern the original output and do not validate the new candidate.
- The current controlled Brief fixtures use an ordinary classic CV and have four pages (cover, letter, two CV pages). They are not numerically compared to the original three-page Sidebar dossier as if only the cover changed.

`original-word-recheck.json` records hashes and actual checks. The original screenshots were already reviewed in the independent audit and are not presented as fresh candidate evidence here.

## Focused Brief validation

The measured candidate was proved on the failed scale case first, then normal and long Brief. The canonical builder produces the same bytes as that bounded feasibility probe. Only then were the other saved-setting variants of **the same Brief template** generated. No other template implementation or all-39 acceptance run was attempted.

| Brief fixture  | Actual result under the declared profile                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| normal         | One profession line, full native text/initials, intended hero and lower lanes. Composition checks PASS; outline/Word visual acceptance open. |
| scaled 1.15    | One profession line in Web and native; name Y152.33525mm. The prior 15.33525mm excess gap is removed. PASS measured composition.             |
| long           | Two profession lines in Web/native; name scaling retained. Baseline advance within 0.004mm of Web. PASS measured composition.                |
| moved          | Authored date X105/Y28/W85 and explicit styles retained; name hidden. PASS measured composition.                                             |
| photo-portrait | Native picture retains saved X/Y/W/H, zoom, crop and mat. PASS composition/content checks; Word image editing unverified.                    |
| photo-circle   | Round image/mat retain saved placement/crop. PASS composition/content checks; Word image editing unverified.                                 |
| hidden         | Disabled attachment fields and hidden photo remain absent. PASS measured composition.                                                        |

For all seven cases:

- All expected native cover text is extracted from page 1, with glyph bounds inside A4. No observed field overlap or clipped semantic text. Four total dossier pages; no extra cover page.
- Profession line counts match the captured existing resolver. Every semantic frame's model Y agrees with that resolver (all reported deltas are zero). This is a model check, not a claim that Word glyph bounds equal browser element bounds.
- All 21 adjacent Letter/CV page PNGs are pixel-identical to same-source baselines.
- All seven default baseline DOCX packages are **byte-identical** to the previous published candidate's baselines. The default export and frozen native geometry have not changed.
- Source JSON/measurement packets are immutable; JSON-restored models produce byte-identical packages; ordinary renderer calls still reject the unaccepted frame composition.
- All seven full covers, the complete normal dossier and the A4 comparison were visually inspected. Fine glyph placement still differs; no full pixel-parity claim.

The remaining thin no-photo placeholder outline has a much lighter right edge in the supplementary render, despite a dark edge in the embedded paint. It is a real unresolved decorative discrepancy. No engine experiment, arbitrary stroke enlargement, XML repair or template-specific workaround is introduced.

## Tests and limitations

- Complete unit suite: **1,181 PASS, 0 FAIL; 22,859 assertions across 246 files**.
- Dedicated DOCX suite: **368 PASS, 0 FAIL; 5,778 assertions across 56 files**.
- Typecheck, changed-file ESLint and production build: PASS. No deployment command.
- New tests cover the reproduced 115% displacement, stale text/width/scale, missing/invalid metrics, minimum native leading, invalid leading, JSON stability and deterministic construction with browser state, clock, randomness and fetch poisoned.
- Supplementary renderer remains LibreOfficeDev 26.8 alpha build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`; Chromium 143.0.7499.0. No supported-release matrix or new native-engine work.
- **Desktop Microsoft Word rendering, text/photo editing and Save/Reopen of the new candidate are UNVERIFIED.** Supplied Word PDFs do not replace that gate.
- Arbitrary/missing font profiles, long-growth stress beyond these fixtures, all 39 templates and product activation are not accepted.

## Files and reproduction

Code changes: `src/components/cover/text-metrics.ts`, additive capture in `resolve.ts`; optional builder/composer metric input in `src/lib/docx-next/build-model.ts` and `cover-authored.ts`; optional paragraph minimum leading in `model.ts`, `native-text.ts`, `validation.ts`, with reservation support in `layouts.ts`. Default arithmetic/order is retained for all existing paragraphs. Tests extend `docx-next-cover-authored.test.ts` with captured `cover-text-metrics.json`. The existing three Brief QA scripts gain optional declared-font/measurement support; historical packet files remain unchanged.

The new [packet](docx-next-cover-metrics-15okt/) contains [normal DOCX](docx-next-cover-metrics-15okt/normal/candidate.docx), [115% DOCX](docx-next-cover-metrics-15okt/scaled/candidate.docx), [A4 comparison](docx-next-cover-metrics-15okt/brief-a4-comparison.pdf), captured profiles/metrics, models, source snapshots, actual validation and hashes. Normal/scaled full supplementary PDFs and PNGs are retained; other render directories are reproducible intermediates. The earlier packet supplies identical baseline packages.

```sh
bun scripts/docx-next-cover-brief-fix37.ts /tmp/item37-metrics
DOCX_NEXT_MATCHED_FONT_DIR=/path/to/libreoffice/share/fonts/truetype \
  node scripts/docx-next-cover-brief-web37.cjs /tmp/item37-metrics
DOCX_NEXT_COVER_METRICS_DIR=/tmp/item37-metrics \
  bun scripts/docx-next-cover-brief-fix37.ts /tmp/item37-metrics
# Render both baseline.docx and candidate.docx in each of the seven case directories:
python /path/to/render_docx.py /tmp/item37-metrics/scaled/candidate.docx \
  --output_dir /tmp/item37-metrics/scaled/candidate --dpi 120 --emit_pdf
# After all fourteen package renders:
python scripts/docx-next-cover-brief-report37.py /tmp/item37-metrics --measured
bun run test:docx-next
bun test tests/unit
bun run typecheck
bun run build
```

Set the documented Playwright module/executable variables when needed. The declared-font directory must supply Regular/Bold/Italic/BoldItalic LiberationSans TTF files; their hashes are recorded, not assumed from family names. Font binaries are not added to this repository. All new applicant variations remain synthetic public DEMO fixtures.

## Decision and next gates

Investigation and the isolated estimator/leading correction: **PASS**. Controlled-profile Brief composition: **PASS for seven measured cases**. Full Brief visual fidelity: **PARTIAL**. New-candidate desktop Word acceptance: **BLOCKED by unavailable desktop Word**. Final Item 37: **PARTIAL, P1 remains open**.

1. Test normal, scaled and long candidate files in desktop Word with actual fonts recorded. Check every cover field, native text/photo editing, neighbors and two Save/Close/Reopen cycles, exporting PDFs each time.
2. Resolve thin outline and any Word-specific leading/font differences. Establish an explicit supported font/overflow policy; reject unsupported font states. Validate editing growth, long titles/names/contact/attachments and saved font changes.
3. Only after those gates pass, integrate fresh measurement capture with the product snapshot/export lifecycle. Preserve the pure canonical builder and detached renderer; do not import DOM/PDF layout plans. Validate real saved-project round trips separately.
4. Then expand by demonstrated cover capabilities to all 39 and stress scenarios. Keep Sidebar/#14/#38 isolated. Do not promote from unit tests or the matched-font supplementary comparison alone.

Publication remains confined to the requested investigation branch. Exact-branch and wildcard Vercel deployment disabling and workflow filters are checked before branch update; no merge, deployment or workflow dispatch is authorized or performed. The final delivery records the resulting remote commit SHA and post-publication checks.


## Follow-up: real Microsoft Word save evidence (2026-10-15)

After this original controlled-font report, the user supplied the **published 115%-scaled candidate** (SHA-256 `6727e12e327672fc2349fd972b6a891a9f0236ceaa839461cc8943879c64f7f7`), two saved DOCX files and two Word-generated PDFs. Independent OOXML/PDF comparison confirms **79/79 semantic controls**, **10/10 cover frame coordinates/widths** and the original PNG payload preserved; both Word PDF versions have four pages, matching word positions and pixel-identical page rasters. Word's smaller DOCX packages reflect ZIP deflation, not demonstrated image or field loss. This is a **bounded real-Word save-stability PASS for one Brief case**, not a complete Word editability, font, Web pixel-parity or all-39 acceptance. The user-supplied files are not republished in GitHub. Whether Word was actually closed and reopened between saves was not independently observable.

- [Independent Word QA report](docx-next-cover-word-115pct-15okt.md)
- [Machine evidence and hashes](docx-next-cover-word-115pct-15okt-evidence.json)

**Item #37 remains PARTIAL / P1.** Existing experimental guard, non-production status and open product-integration gates are unchanged. This follow-up was evidence-only: no product-code change, CI restart, merge or deployment.
