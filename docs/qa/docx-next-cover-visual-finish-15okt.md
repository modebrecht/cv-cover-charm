# Package 37B — Brief visual finishing and font validation

**PARTIAL / ready for external Word testing.** The apparent light placeholder edge is absent in the supplied genuine Word PDF. No application drawing change is justified. A separate, reproducible typography-contract defect is fixed: measured composition now rejects generic field typography overrides excluded from the captured packet. All seven controlled Brief cases pass again. Three native editable Word candidates and an A4 comparison are provided. Production activation and full Item 37 acceptance remain open.

Fetched branch HEAD: `b2609c694cb436b16920c99c05328f0de9e139da`. Remote dev: `8901a830a792d75e9e792345c5180827218b4e1e`. Work continues on `investigate/docx-next-cover-fidelity-15okt`; no new branch, reset, rebase, discarded work or rewritten history. The final handoff identifies the pushed descendant SHA. Root `AGENTS.md`, branch ancestry, existing implementation and all five requested reports were reviewed. The accepted producer remains `4c0687e0c44bf072fa9225de82e79eb61ae38665`, followed by the three preserved Word-evidence documentation commits.

## Evidence and source equivalence

The supplied `candidate.docx`, two Word-saved copies and two Microsoft Word 365 PDFs were recovered for read-only inspection. The original candidate hash is `6727e12e327672fc2349fd972b6a891a9f0236ceaa839461cc8943879c64f7f7`; it is exactly the published 115% candidate. Original attachments and their personal Word metadata are not republished. The [independent Word report](docx-next-cover-word-115pct-15okt.md) and [hashes/checks](docx-next-cover-word-115pct-15okt-evidence.json) remain authoritative evidence of the observed bounded save sequence: 79/79 semantic controls, 10/10 cover frame coordinates/widths, unchanged PNG, identical Save 1/2 document XML, four A4 pages and four pixel-identical PDF pages. This preserves that PASS; it does not establish practical editing or independently observed closing/reopening.

Seven new actual `CoverCanvas` captures use exactly the frozen snapshots from the accepted producer. They mount the application's real component and existing resolver, with a declared font profile and zero browser errors. They are controlled component references, not recovery of the original user's saved editor project or a tested product-level restore flow. Source JSON equality, new Web hashes, resolver measurements and generation invariants are recorded in [evidence.json](docx-next-cover-visual-finish-15okt/evidence.json) and [web-evidence](docx-next-cover-visual-finish-15okt/web-evidence/). Historical source snapshots/models remain in [the existing packet](docx-next-cover-metrics-15okt/), unchanged.

## A. Placeholder outline — resolved diagnosis, no drawing repair

The authored no-photo Brief placeholder asks for a square, dark, opaque one-CSS-pixel outline. Native paint produces a 416×416 PNG at the saved size and placement. Its outer four pixels are left/right and top/bottom symmetric; alpha is 255 throughout. The Word PDF's decoded image pixels equal the source PNG pixels exactly. Its four visible edges are dark and closed. Native picture extent in the supplied Word PDF is approximately X129.0–181.0 / Y41.0–93.0mm.

The low-resolution supplementary render reproduces the reported lighter right edge. Measurements use a nine-pixel strip around each image edge, excluding corners; the minimum of the column-mean grayscale measures darkness. The integral is a relative sampling measure, not an estimate of physical stroke width.

| PDF / sampling | Left minimum gray | Right minimum gray | Interpretation |
| --- | ---: | ---: | --- |
| Actual Word, 120 dpi | 17 | 17 | Symmetric dark edges |
| Actual Word, 240 dpi | 17 | 17 | Symmetric dark edges |
| Actual Word, 600 dpi | 17 | 17 | Equal ink integrals, 4.667 pixels |
| Supplementary, 120 dpi | 17 | 192 | Reproduces the apparent discrepancy |
| Supplementary, 240 dpi | 17 | 17 | Darkness changes with sampling |

**Confirmed:** this is a discrepancy in the supplementary PDF/rendering/sampling path for this case, not demonstrated bad application artwork or bad Word behavior. **Unresolved hypothesis:** the precise combination of supplementary image resampling, placement and raster grid responsible for the asymmetry. No engine investigation is needed to establish the product decision. Source pixels, opacity, size, crop and Word evidence rule out an arbitrary stroke enlargement as a justified fix.

The [Word crop](docx-next-cover-visual-finish-15okt/outline-word.png), [supplementary crop](docx-next-cover-visual-finish-15okt/outline-supplementary.png), quantitative evidence and final comparison page preserve the result. No decoration/image/native-drawing code changed. Square/circle, saved dimensions, position, opacity, palette, source images and photo crop behavior are preserved by unchanged code and byte-identical valid outputs. This bounded Word observation concerns the supplied square case; it is not a Word acceptance test of every placeholder or photo setting.

## B. Typography — confirmed contract defect and focused fix

The measurement source key includes authored blocks, text, styles, user-style precedence and scale. It excludes subsequent generic `settings.fieldStyles`. The existing guard checked the resulting size, but a font-only change could still reuse incompatible line counts.

**Reproduction before the fix:** use the scaled fixture and its valid Sans packet, then set `settings.fieldStyles["cover.profession"] = { font: "Courier New" }`. The builder accepted one captured line and placed the name from that reservation. The supplementary renderer actually wrapped the monospaced title to two lines. Its `EFZ` line overlapped `Lea Müller`; extracted glyph bounding boxes intersect by **26.470×7.480mm**. This is a confirmed model-contract defect with a rendered failure, not a font-equivalence hypothesis. Word reproduction of this deliberately unsupported case was not performed. [Rejected crop](docx-next-cover-visual-finish-15okt/rejected-font-override.png) and [measurements](docx-next-cover-visual-finish-15okt/rejected-font-override.json) are retained; the bad DOCX is not presented as a candidate.

**Fix:** measured composition rejects defined generic field overrides for `font`, `sizePt`, `bold`, `italic`, `allCaps` and `trackingPt`, including the native initials field. These properties can change glyph advances or wrapping. The diagnostic identifies the field and properties and instructs callers to apply the edit to the authored cover block and recapture metrics. This conservative rule also rejects equivalent/no-op generic typography overrides; the packet has no evidence that such later values were measured. Color and underline remain allowed. Saved authored-block edits continue to work with a fresh matching capture. Hidden/non-emitted fields do not acquire a new rendering obligation.

This extends validation at the existing pure composition boundary; it adds no browser reads, measurements or font fitter to the model or renderer. No layout algorithm, renderer, canonical type, font mapping or production export path changed. Without a supplied measurement packet, historical diagnostic/default behavior is unchanged. One justified implementation attempt succeeded; no second mechanism was tried.

## Font and typography policy

[font-profile.json](docx-next-cover-visual-finish-15okt/font-profile.json) declares actual measured file hashes, requested native properties, quantization and observed Word fonts. The browser loads the four Liberation Sans faces under Helvetica Neue/Helvetica/Arial aliases; Chromium confirms Liberation Sans for the title. Supplementary PDFs use LiberationSans/LiberationSans-Bold. The supplied Word cover PDF uses ArialMT/Arial-BoldMT. These are distinct realized font environments. Family names, a descriptive profile string and similar geometry do not prove identical font files or future wrapping.

| Property | Native contract / limit |
| --- | --- |
| Family | Existing explicit mapping: sans→Arial, serif→Georgia, times→Times New Roman, humanist→Verdana, freundlich→Trebuchet MS, schmal→Arial Narrow, maschine→Courier New, plakativ→Impact. Unknown keys/families are rejected. No font embedding. |
| Availability | Existing optional supplied-font policy can select declared fallbacks or reject absent primary/fallback. Default resolution depends on the target application. A fallback selection is not proof that the measured profile still applies. |
| Size | Captured fitted point size enters the detached model. Existing Word serialization rounds to 0.5pt, up to 0.25pt error; scaled title 41.4→41.5pt. |
| Weight/emphasis | Native boolean bold uses weight ≥600; italic is preserved. Arbitrary CSS weights/variable-font axes are approximated, not retained exactly. |
| Alignment/tracking | Native paragraph alignment is explicit; tracking is rounded to 0.05pt. Rich text remains native. |
| Leading | Intended point leading is native `atLeast`, rounded to 0.05pt. It allows larger font content to grow; it is not an exact clipping height or a guarantee of future wraps. |
| Linked positions | Existing anchor resolver uses captured line counts/sizes. In this matrix all frame Y deltas from resolver expectations are zero. Long-title native baseline advance differs by −0.003526mm in the declared supplementary profile. |
| Staleness | Changed authored text/style/width/scale invalidates the source key. Missing, impossible or over-budget measurements are rejected. Later generic typography overrides now receive an explicit diagnostic. |
| Target rendering | Font file identity, kerning, glyph ink bounds, target line breaking and post-edit growth remain application dependent. They require observed Word tests. |

**Unsupported for product acceptance:** arbitrary/unavailable font profiles, automatic substitution assumed equivalent to browser measurements, unusual scripts/CSS balancing and arbitrary post-edit text growth. A nonempty profile identifier is descriptive evidence only, not a font attestation. This package does not implement a target-font verifier or silently certify arbitrary profile strings. The declared controlled profile supports this bounded feasibility test; product integration must validate or reject the selected font environment before capture/export.

## Seven-case results and physical comparison

| Brief case | Result under declared supplementary profile |
| --- | --- |
| Normal | PASS: one title line; full hero/contact/attachments/initials composition. |
| 115% | PASS: one title line, name frame Y152.33525mm; no false extra line reservation. Prior observed Word-save PASS preserved. |
| Long | PASS: two title lines, dependent name frame Y163.670mm; leading within 0.004mm of captured reference. |
| Moved | PASS: saved date X105/Y28/W85, explicit style and hidden name retained. |
| Photo portrait | PASS: native picture/mat, saved position, aspect ratio, zoom/crop retained. Practical Word crop editing unverified. |
| Photo circle | PASS: circular picture/mat and crop retained. Practical Word editing unverified. |
| Hidden | PASS: disabled attachments and hidden photo absent, other content complete. |

All seven have four total dossier pages, all expected cover text on page 1 and all extracted glyph bounds inside A4. Visual review found no semantic clipping or overlap in valid cases. The 21 Letter/CV pages are pixel-identical to their same-source baselines; canonical neighbor models also match. JSON-restored packages match exactly, inputs remain immutable, and the production renderer still rejects the guarded composition without its diagnostic opt-in. All seven baseline DOCX files match the earlier published baselines byte for byte. All seven valid candidate DOCX files match the accepted producer byte for byte.

The seven-page [A4 comparison](docx-next-cover-visual-finish-15okt/brief-before-after-a4.pdf) shows three unchanged-production-flow/candidate pairs, three actual-Web/candidate pairs and the genuine Word/supplementary outline comparison. [physical-geometry.json](docx-next-cover-visual-finish-15okt/physical-geometry.json) records physical frame origins, baseline/candidate glyph bounds and browser element geometry for all seven cases. Frame origins, CSS boxes and glyph ink are deliberately distinguished.

Example physical differences from the existing flow exporter (glyph-top Y, mm):

| Case / field | Production flow | Guarded candidate |
| --- | ---: | ---: |
| Normal title | 28.177 | 130.817 |
| Normal date | 137.087 | 20.565 |
| 115% name | 48.438 | 152.561 |
| Long name | 60.596 | 163.856 |

The major composition improvement is the existing guarded implementation, not a newly invented 37B pixel change. **37B intentionally leaves valid candidate bytes unchanged:** Word already demonstrates the correct contour; this update prevents a demonstrated invalid font state. It would be misleading to claim a fresh cosmetic improvement over `4c0687e`. Fine glyph differences remain visible in Web/native comparisons; no exact Web pixel-parity claim is made.

## Tests actually run

- Full units: **1,182 PASS, 0 FAIL; 22,872 assertions, 246 files**.
- Dedicated DOCX suite: **369 PASS, 0 FAIL; 5,791 assertions, 56 files**. These overlap the full suite and are not added to its count.
- Focused authored-cover suite: **10 PASS, 0 FAIL; 69 assertions**, including twelve typography-override rejection cases and allowed color/underline.
- TypeScript: PASS. Changed-file ESLint: PASS. Full ESLint: exit 0, **0 errors / 21 existing warnings outside changed files**. Production build: PASS. `git diff --check`: PASS.
- Seven fresh Web captures, fourteen native baseline/candidate renders, package equality and all generated comparison pages inspected. [Test summary](docx-next-cover-visual-finish-15okt/test-results.json).
- Chromium 143.0.7499.0; supplementary LibreOfficeDev 26.8 alpha build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. No engine binaries changed and no native-engine investigation restarted.

Desktop Word is unavailable here. The supplied scaled save sequence is a **bounded PASS**. Normal/long Word rendering, practical text/photo editing and independently observed close/reopen are **UNVERIFIED**. Package generation and passing tests do not replace those visual gates.

## Candidate packet and reproduction

All three files are freshly generated native-renderer output, with semantic text in Word paragraphs/content controls. They are not hand-edited DOCX demonstrations.

| Candidate | SHA-256 |
| --- | --- |
| [Normal](docx-next-cover-visual-finish-15okt/brief-normal-word.docx) | `56099ee50a3a9277493d9153a2a9d3abf17e7e3c15d3aa5ab963c07fd308e704` |
| [115%](docx-next-cover-visual-finish-15okt/brief-115pct-word.docx) | `6727e12e327672fc2349fd972b6a891a9f0236ceaa839461cc8943879c64f7f7` |
| [Long title](docx-next-cover-visual-finish-15okt/brief-long-title-word.docx) | `6af9885b695ec13c2fe3d71a63d2c6372520b7021ad87d5ccde3daf1479318f2` |

Machine hashes: [candidate-sha256.json](docx-next-cover-visual-finish-15okt/candidate-sha256.json). Reuse existing fixture-generation instructions; set `DOCX_NEXT_MATCHED_FONT_DIR` to the actual four LiberationSans TTF files and `DOCX_NEXT_CHROMIUM_PATH`/Playwright module variables where needed:

```sh
bun scripts/docx-next-cover-brief-fix37.ts /tmp/brief37b
DOCX_NEXT_MATCHED_FONT_DIR=/path/to/libreoffice/share/fonts/truetype \
  node scripts/docx-next-cover-brief-web37.cjs /tmp/brief37b
DOCX_NEXT_COVER_METRICS_DIR=/tmp/brief37b \
  bun scripts/docx-next-cover-brief-fix37.ts /tmp/brief37b
# Render baseline.docx and candidate.docx in all seven case folders:
python /path/to/render_docx.py /tmp/brief37b/normal/candidate.docx \
  --output_dir /tmp/brief37b/normal/candidate --dpi 120 --emit_pdf
# Repeat for the other thirteen packages, then:
python scripts/docx-next-cover-brief-report37.py /tmp/brief37b --measured
python scripts/docx-next-cover-visual-finish37.py /tmp/brief37b \
  /path/to/supplied-word-files /tmp/brief37b-packet
bun test tests/unit/docx-next-cover-authored.test.ts
bun run test:docx-next
bun test tests/unit
bun run typecheck
bun run lint
bun run build
```

The visual-finishing script reads the supplied Word files locally to check image equivalence and create the small synthetic placeholder crops. It never uploads those original files. Its optional fourth argument is the rejected pre-fix render directory, producing the preserved overlap evidence. To reproduce the negative result, build the scaled fixture at the fetched parent using the unchanged scaled packet with the Courier override above; at this commit the corresponding unit regression must throw instead. The older general report helper has historical hardcoded Word/outline-open labels; this report and new evidence file supersede those labels for the supplied scaled Word observation only.

## Word follow-up, integration gate and publication

For **each** candidate preserve the original and record Word Desktop version/build, OS and actual available fonts. Inspect the entire cover against its Web reference; check title/name/date, initials/outline, lower lanes, content completeness and neighboring pages. Export an untouched PDF. In a copy edit a native cover field, first with similar length and then enough text to wrap; observe selection, growth and collisions. Save copy 1, close Word, reopen, save copy 2 and export PDFs at both stages. Keep all DOCX/PDF originals. The three core files use initials; photo/crop editing needs the existing portrait/circle fixture candidates as a separate applicable test, not an invented photo result from these files. A collision after growth is a failed gate, not permission to clip or shrink silently.

Before production integration, establish supported target font profiles and overflow behavior, then capture fresh metrics at the snapshot boundary. Test saved-project restoration, asynchronous capture failure, fallback selection and user-facing errors. Keep `coverComposition: "authored-frames"` and `allowUnacceptedModelIssues` guarded. Only after Brief Word/editing/integration gates pass should cover-capability groups expand toward all 39 templates and relevant stress cases. No all-39 implementation or acceptance is claimed here.

Changed implementation: `src/lib/docx-next/cover-authored.ts` (measured override validation), `src/components/cover/text-metrics.ts` (profile contract comment), `tests/unit/docx-next-cover-authored.test.ts` (regression). Added QA script `scripts/docx-next-cover-visual-finish37.py`, this report and its bounded adjacent packet. Earlier reports/evidence remain intact. No PDF/Print, Legacy DOCX, Sidebar geometry, Agent A, Items 14/38, native engines, production toggles or canonical-model boundaries changed. No alternative layout system was introduced; a diagnostic boundary check is the smallest sound fix.

Before publication the Vercel project and branch-filtered deployments were checked: no deployments for this branch. `vercel.json` still disables both `*` and this exact branch; only `main` is enabled. The project API omits full Git configuration, so repository branch disabling is explicitly inspected rather than inferred from that response. All sixteen workflow push filters were checked and do not match this branch. Publication is a non-force descendant update of this branch only; no PR, merge, deploy or workflow dispatch. Post-publication remote/ref and deployment checks are recorded in the final handoff.

**Verdict:** outline diagnosis PASS for supplied Word case; measured-typography safeguard PASS; seven-case controlled Brief composition PASS; new Word/editing acceptance UNVERIFIED; Package 37B / full Item 37 **PARTIAL**. Recommended next action: execute the three-file desktop Word protocol, then decide the explicit font/growth acceptance policy before product integration.
