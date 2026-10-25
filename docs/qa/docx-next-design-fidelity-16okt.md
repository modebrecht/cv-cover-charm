# Package 37D cover design fidelity

**Latest follow-up:** [Modern grouped pill and interior-layout audit](docx-next-modern-grouped-pill-interiors-16okt.md): separate native pill ownership trial and six requested interior audit cases; no all-template acceptance.

**Current follow-up:** [Modern contact, accent and second Word return](docx-next-modern-contact-accent-16okt.md) records the later Word-confirmed header/footer correction and new controlled contact/pill candidate. The original cohort findings below remain historical evidence, not current acceptance of all templates.

**Follow-up:** The user identified poor existing Letter/CV compact chrome in the first candidate. The current opt-in now includes the bounded correction in [the screenshot-review report](docx-next-modern-chrome-16okt.md). Counts and whole-neighbor equality below describe the original investigation commit; the follow-up reports current body-only regression and deliberate chrome changes.

**PARTIAL. Four remaining templates audited; a bounded Modern cover correction passes actual application, structural and supplementary visual checks. New Microsoft Word visual, editing and Save/Reopen acceptance is UNVERIFIED.** The other three audited templates remain unchanged and disabled in the new path. No all-39 implementation or production export switch is included.

## Baseline and evidence scope

Fetched authoritative remote dev: `8901a830a792d75e9e792345c5180827218b4e1e`. Independent worktree and branch: `investigate/docx-next-design-fidelity-16okt`. Root `AGENTS.md` was read; it prohibits rewriting published history. No subordinate instructions were found. Reference heads were fetched: Brief integration `dcb38f05fd33387d98a3e8ba4c44c4eb22929194` and independent investigation `acb6a115c749982b5408f5a099d2464f1ebd8eb1`.

The Brief integration is not merged into dev. Its 27 prerequisite paths outside the historical QA packets were explicitly reused, including its app entry, shared presentation, font measurement, native frames, fixtures and QA helpers. Historical QA packets and unrelated branches were not copied. [prerequisite-provenance.json](docx-next-design-fidelity-16okt/prerequisite-provenance.json) records paths and reference blobs; [changed-files.json](docx-next-design-fidelity-16okt/changed-files.json) lists the final change. The exact publication SHA is the commit containing this report, reported in the final handoff and recoverable with `git log -1 --format=%H` on the working branch.

The user has subsequently confirmed that the #37C outputs look correct. That is user-reported visual confirmation of Brief, not evidence of editing or reopening the new Modern candidates.

No original private project identifying a unique template for the reported “August 2028” example was supplied for this phase. The same public saved demo project was restored through the app for each selected template, with that date entered explicitly. All four actually display a date badge. This is a reproducible same-state comparison, not a claim to have reconstructed an unseen original user design. The fixtures retain existing Letter/CV settings, including the CV's `freundlich` font key, rather than silently resetting unrelated settings.

## Representative cohort and current defects

| Template | Coverage | Confirmed current export problems |
| --- | --- | --- |
| Modern (`modern`) | Quiet paper, accent circle, circular photo placeholder, left-aligned badge | Compact rounded badge becomes a full-width rectangle; initials disappear; typography and bottom composition differ. |
| Verlauf (`verlauf`) | Full-page gradient, soft circles, centered white badge and circular placeholder | Badge becomes a broad white band; photo/initials disappear; hero and footer move upward. Gradient appearance also differs in supplementary rendering. |
| Neon (`neon`) | Dark paper, bright gradient artwork, left badge, asymmetric picture location | Square bright badge, omitted placeholder, wrong text hierarchy/vertical arrangement; ellipse/capsule mismatch; a separator appears although Web CSS hides it. |
| Warm (`freundlich`) | Large overlapping header shapes, centered picture, segmented profession text and centered badge | Missing picture/initials; broad square badge; extra green surface behind the date; contact and attachment regions no longer align as on the Web page. |

The other three audited Web covers, captured sources and default canonical models were additionally compared with untouched dev and are identical; see [cohort-dev-regression.json](docx-next-design-fidelity-16okt/cohort-dev-regression.json). Modern has its ten-case dev comparison below.

All four normal baseline dossiers render as four A4 pages, but their covers fail the supplementary visual comparison. Package validity is not visual acceptance. [Four-page A4 comparison](docx-next-design-fidelity-16okt/cohort-a4-comparison.pdf), [machine-readable findings](docx-next-design-fidelity-16okt/cohort-audit.json), and the `audit/<template>/` saved projects, snapshots, models, actual Web screenshots, baseline PDFs and native package manifests/OOXML preserve the evidence. Native panels are LibreOffice output; actual Word appearance for this cohort has not been observed.

Prioritized causes:

1. **Badge geometry is discarded in model composition.** Web `BlockLayer` paints an inline-block span per authored line. Its width follows the effective text advance plus `padX`; `bgRadius` gives the round ends. `flowingElementBox()` instead creates a table across the authored field/container width, with a solid fill and padding but no radius. Modern's visible badge is about **53.88 mm** wide after A4 screenshot normalization; its old model table is **150 mm** wide. The new font-measured paint is **53.901 mm** wide. The small screenshot/model difference includes the editor's integer-pixel A4 normalization.
2. **The ordinary native composition substitutes flow for saved geometry.** `composeCover()` reorders fields into descriptor rows and leads; authored X/Y and anchor relationships do not drive their final placement. This explains the entire-cover discrepancies, not only attachments. Supplementary Modern stress renders additionally show two cover pages for both long and 115% cases, versus one in the candidate. All body sections still match when aligned after those cover pages.
3. **Effective Web typography is not equivalent to raw saved block style or the native dossier font.** Shared role CSS changes weight, tracking, leading, case and muted opacity. For the same Modern source, the old profession model requests **Trebuchet MS** and tracking **−0.72 pt**, while the visible cover uses the Sans stack with effective weight **650** and tracking **+0.54 pt**. The old dossier font-source policy picks the saved CV font; the candidate uses the measured authored cover font and shared role presentation. LibreOffice's replacement of unavailable Trebuchet with Noto Sans further affects its visible result; that replacement is supplementary-engine evidence, not a claim about installed Word fonts.
4. **No-photo semantic content is omitted.** The ordinary picture branch emits content only when image data exists. Web renders native applicant initials in the saved photo frame. All four baseline models omit those initials; the candidate preserves them as editable controlled text.
5. **Paint and visibility policies differ.** Web muted opacity applies to the whole badge group, including fill. The old table retains a fully saturated fill. Descriptor surfaces can also add paint absent from the Web, such as Warm's date cell. Authored framing must still respect explicitly CSS-hidden decorations. The candidate reuses the existing hidden-decoration declarations and rejects attempts to override that unaccepted CSS visibility state.
6. **Non-square circle primitives have different meanings.** Web `ShapeElement` uses a rectangle with `border-radius: 9999px`; unequal dimensions produce a capsule. The native decorative rasterizer uses `context.ellipse()`. Neon’s first blob is 150 × 130 mm, so these are different contours. The same discrepancy exists for non-square pictures with `radius >= 999`: Web rounding versus native ellipse clipping. Modern’s tested circles are square. The bounded authored path now rejects unequal circle/photo aspect ratios explicitly. A future correction can assess the existing rounded-rectangle primitive; no new geometry engine is implied.

Gradient interpolation/paint realization needs a separate focused diagnosis before enabling Verlauf. Its different appearance is observed, but this phase does not claim a proven interpolation-engine cause. The default picture CSS also applies mild family contrast/saturation effects; native pictures preserve source pixels and crop geometry, not those CSS filters.

## Capability and solution assessment

Saved block geometry, anchors, colors, typography, badge settings, photo crop/radius and visibility reach the snapshot. The ordinary composition preserves text and many image properties, approximates typography/paint, ignores much authored placement, and cannot represent a round inline badge through its table primitive. Template CSS overrides and structural artwork are not fully described by the raw block array. Fresh metrics alone cannot recover missing presentation contracts.

| Approach | Assessment |
| --- | --- |
| Adjust existing flow tables/spacers | Small initial edits, but cannot reproduce freely positioned covers or intrinsic round badges reliably; repeats the wrong abstraction. |
| Existing native paragraph frames plus separate measured decoration | Reuses the proven Brief boundary and renderer; editable semantic text, fresh authored placement and bounded geometry. Chosen for the first Modern proof on solid paper. |
| Native DrawingML text shapes with grouped decoration/autosizing | Could improve direct Word badge resizing, but requires a new renderer primitive and actual Word editing/reopen proof. Not justified as an immediate replacement for the existing proven frame mechanism. |
| Rasterize the cover | Visual shortcut that loses semantic text editability; rejected. |

The previous bottom-zone floating-table experiment failed 38/39 native renders and remains rejected. No spacer tuning, post-generation XML repair or native-engine experiment was reused.

The generic addition is a **single-line badge font advance** in the existing measurement packet. Browser capture uses the effective presentation/font and padding; the pure builder validates the packet, computes alignment and round paint, retains editable text in an existing paragraph frame, and includes padding in linked-block reservations. Opacity is applied to fill and text as one Web group against solid paper. Translucent text crossing artwork fails clearly because compositing it against plain paper would be wrong. The native renderer and canonical block vocabulary are unchanged. Only nonsemantic decoration uses the established raster adapter.

The integration allows the effective Modern weights 650/800 only after the existing browser profile verifies their realization against its regular/bold faces. It retains the original narrow Brief policy. This is not an attestation of Word's installed fonts.

## Activation and bounded prototype

On this branch run the app locally and open **`/?docx-next-design-qa=1`**. Restore a Modern dossier, open **Gesamtdossier herunterladen**, then click **Modern DOCX Next testen**. All three parts must use Modern and the CV must use Standard/classic. Other cover templates have no button and the direct entry rejects them. The separate Brief flag and ordinary exports retain their behavior.

The path captures fresh saved state, loads/verifies fonts, captures fresh cover metrics and badge advances, validates native quantization and overflow, builds the canonical model, rejects unrelated model gates, renders through the existing native renderer, then rechecks state and fonts before downloading. There is no fallback export on failure. Decoration-generation failure is fatal.

The native paragraph remains field-width, with padding insets; its painted badge has measured content width. This avoids forcing Word to wrap a sentence into an exact browser-advance-width frame. **The separate badge decoration does not automatically resize when its text is edited inside Word.** A fresh app export recalculates it. Arbitrary Word text growth and direct paint resizing require acceptance; they are not claimed solved by this prototype.

Unsupported cases are explicit: other templates, other CV layouts, custom Modern cover elements, non-square CSS circles/circular picture settings, unaccepted fonts/scripts/italics or mixed run weights, missing/stale measurements, overflow, multiline/overwide badges, text-box borders/minimum heights/lists, translucent text crossing artwork, and unaccepted placeholder opacity or CSS-hidden decoration overrides. Structural/gradient backgrounds in other templates are not silently treated as solid paper.

## Results and limitations

| Gate | Actual result |
| --- | --- |
| Actual app restore and button export | **10/10 PASS**: normal, 115%, long title/name, manually moved metadata, portrait crop, circular crop, hidden attachments/photo/badge, centered square-radius badge, right-aligned pill, long single-line badge. |
| Native cover completeness and geometry | **10/10 PASS** supplementary: four A4 pages, one cover, three sections, all expected cover text/control identities present, glyphs inside A4, badge glyphs inside their paint. No visible clipping or overlap in inspected covers. |
| Letter/CV regression | **30/30 page rasters identical**, plus identical canonical models. For old long/scaled exports, comparison aligns the three body pages after their two-page cover. |
| Modern Web regression | **10/10 pixel-identical to untouched dev**, from equivalent restored saved state. |
| Ordinary DOCX Next regression | **10/10 packages byte-identical to untouched dev** for the same snapshots. |
| Brief regression | **7/7 actual app DOCX files byte-identical to #37C**; **7/7 Web rasters identical**. |
| Negative browser paths | **14/14 PASS**, with no candidate: font, substitution, missing metrics, stale state before capture/after render, overflowing word, mismatched parts, overlong/multiline badge, artwork crossing, placeholder opacity, hidden separator override, noncohort template, flag off. |
| Unit suite | **1,189 PASS**, 0 FAIL; 22,930 assertions across 248 files. |
| Dedicated DOCX suite | **376 PASS**, 0 FAIL; 5,849 assertions across 58 files; overlaps the unit suite. |
| Typecheck, lint, build, diff checks | PASS; lint retains 21 existing warnings and has no errors. |
| Desktop Word visual/edit/reopen | **UNVERIFIED** for these new Modern files. |

An initial full unit run under concurrent browser/build load hit one existing 5-second timeout in the frozen adjacency tests. No frozen test or implementation was changed. The complete suites were rerun with a 30-second runtime timeout and passed. The first negative test harness also attempted to click a button after changing the project to a noncohort template; correctly the button disappeared. Its final check verifies both absence and explicit direct-entry rejection. These were validation-harness issues, not hidden product passes. An optional second full native generation on untouched dev was interrupted during Neon after Verlauf completed; no engine cause is claimed. Separate real Web/source/model comparisons completed for all three remaining audit templates. The audit runner now has a bounded capture deadline and an explicit Web-only comparison mode; native byte equality is claimed for the ten Modern cases, not this interrupted supplementary run.

All ten candidate covers and the distinct normal/long neighboring pages were visually inspected after rendering. After the final capsule guards, all ten captured app inputs/metrics rebuild exactly the same canonical models. Other neighboring pages share exact raster equality. Every candidate keeps native text, including the date and initials. Picture cases retain identical decoded source pixels and saved crop settings; mild Web-only contrast/saturation remain an approximation. The integer-pixel Web canvas and native half-point/twip quantization also prevent a claim of pixel-identical glyph rendering across applications.

Start human testing with [modern-app-normal.docx](docx-next-design-fidelity-16okt/modern-app-normal.docx) and [the A4 comparison](docx-next-design-fidelity-16okt/modern-app-a4-comparison.pdf). [validation.json](docx-next-design-fidelity-16okt/validation.json), [app-export-evidence.json](docx-next-design-fidelity-16okt/app-export-evidence.json), [rejections.json](docx-next-design-fidelity-16okt/rejections.json) and [candidate-sha256.json](docx-next-design-fidelity-16okt/candidate-sha256.json) preserve the exact inputs/results. Structural tests are not substituted for Word acceptance.

## Reproduce and next gates

Use normal project dependencies, Bun, the supported installed Sans font profile and Chromium/Playwright. The runners own their Vite servers. Supply `CODEX_PRIMARY_RUNTIME_NODE`, `CODEX_PRIMARY_RUNTIME_NODE_MODULES` and, where needed, `DOCX_NEXT_CHROMIUM_PATH` and fontconfig. Do not inject a fake font to bypass rejection.

```sh
bun scripts/docx-next-design37d.ts /tmp/design37d-audit
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_DEV_CHECKOUT=/path/to/untouched-dev \
  bun scripts/docx-next-brief-app37c.ts /tmp/design37d-app
# Render each baseline.docx and candidate.docx with render_docx.py --dpi 120 --emit_pdf.
# Also render each of the four audit baseline.docx files.
python scripts/docx-next-design-qa37d.py /tmp/design37d-audit /tmp/design37d-app /tmp/design37d-packet
bun test tests/unit --timeout 30000
bun run test:docx-next --timeout 30000
bun run typecheck
bun run lint
bun run build
```

For Brief regression use the same app runner without `DOCX_NEXT_QA_TEMPLATE`, set `DOCX_NEXT_COVER_CASES` to the seven Brief cases, and compare candidate bytes with the #37C packet. Source and measurement fixtures are captured data; the model remains pure and detached from DOM rectangles.

Next: inspect normal Modern in desktop Word; record Word/OS/fonts; edit native text, save a copy, close/reopen, save a second copy and export PDFs. Check the entire dossier and explicitly test badge text growth/background resizing. Then test scaled/long and applicable photo/crop cases. Preserve originals. Only after the appropriate Word gate passes should a new bounded change address Verlauf's gradient/opacity and Neon/Warm presentation differences. Complete this representative cohort before proposing the all-39 matrix. Full Item 37 acceptance still requires all templates and stress scenarios.

## Publication safeguards

`vercel.json` disables this exact branch and retains wildcard disabling. The actual Vercel project and branch deployment list were checked; the branch had zero deployments. The project API does not expose its complete Git settings, so the committed exact-branch exclusion is essential. Existing workflow push filters do not match this branch; no workflow dispatch or PR was created. No merge, deployment, production promotion, default switch, PDF/Print, Legacy DOCX, Sidebar, Agent A, #14, #25, #38 or engine changes. Main/render/dev/reference refs are preserved. Post-push verification is recorded in the final handoff.

**Assessment:** independent four-template investigation PASS; bounded Modern feasibility PASS in the tested app/supplementary environment; new Word acceptance UNVERIFIED; Package 37D and full Item 37 PARTIAL. Stop this phase here.
