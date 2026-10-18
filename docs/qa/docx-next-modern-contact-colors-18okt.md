# Modern contact header colours and plain separators

**PARTIAL. The bounded colour/sync/symbol correction passes engineering and supplementary rendering checks. Two revised actual app downloads are ready. Desktop Microsoft Word visual, editing and Save/Reopen acceptance of these revised bytes remains UNVERIFIED.**

Branch: `investigate/docx-next-design-fidelity-16okt`. Parent: `c0ee86028f020e6948f0bb44826ac129f2eca34b`. Remote dev was re-fetched; it remains `8901a830a792d75e9e792345c5180827218b4e1e`. No dev/main/render write, merge, deployment, PR, workflow dispatch or export-default promotion.

## Evidence and diagnosis

The user supplied an actual four-page PDF whose creator and producer are **Microsoft Word for Microsoft 365**, and a screenshot of the inactive header. Both files were available and inspected. The returned DOCX was **not** supplied; this evidence does not establish editing/Save/Reopen acceptance or equivalence to every value of an unseen saved project.

The [input colour record](docx-next-modern-contact-colors-18okt/user-word-color-evidence.json) preserves exact file hashes, metadata and sampled pixels. The immutable input [Word PDF](docx-next-modern-contact-colors-18okt/user-word-before.pdf) and [screenshot](docx-next-modern-contact-colors-18okt/user-word-before.png) are retained for reproduction.

| Observation | Confirmed cause | Correction or limit |
| --- | --- | --- |
| Screenshot header is grey `#888C93`; the Word PDF Letter header is dark `#111827` | The screenshot RGB equals the rounded 50% blend of the actual dark header and white. This is Word's inactive-header display, not a pale exported header asset | Keep genuine native headers. Do not darken the actual output or move repeated semantic content into the body to disguise an editor display state. Activate the header or use Print Preview to see actual colours |
| Word PDF Letter header is `#111827`, CV headers are approximately `#244A61` | Sync shared the nullable colour options, then each document resolved `null` against its own palette. The test Letter has primary `#111827`; the CV lacks that primary and resolves its contact surface from a different palette | For the bounded Modern contact-header pair, resolve automatic shared header/footer/border colours once from the Letter design and pass the explicit result to both documents |
| Footer has a real lighter paint even in the PDF | Shared compact footer used CSS opacity `0.92`, compositing the same surface differently over Letter `#FAFAFA` and CV white. Word PDF samples are `#35586D` and `#33566B` respectively, including normal image-codec rounding | Modern contact-header compact footers now use opacity `1`. Header `#111827` and footer `#244A61` are the source colours in both scopes |
| Phone/mail shapes look like tiny icons | The saved `icons` separator selected Lucide Smartphone/Mail in the actual Web component. The measured DOCX faithfully captured those small decorative images | Remove the icon rendering. Old stored `icons` is normalized to `dot`; even directly supplied legacy options render plain separators. Explicit dot/slash/pipe/space choices remain supported |

Microsoft's [header/footer display explanation](https://learn.microsoft.com/en-us/answers/questions/5148107/header-and-footer-blurry-in-microsoft-word) confirms that inactive headers/footers are dimmed on screen and Print Preview shows normal output. This document cannot disable that Word UI treatment. There is no remaining justification for making the actual file's colour artificially darker.

## Smallest integration

`resolveSynchronizedContactChrome` is a pure, bounded colour policy used by the existing immutable export snapshot resolver and the editor hook. The hook supplies the live design and the other saved design, memoizes derived options and performs no store writes or effects. The existing automatic-border calculation is shared without changing its candidate order. Explicit shared surface/gradient/text/border values win; document data, themes, typography and geometry are not rewritten.

The automatic colour unification is deliberately restricted to **sync on, Modern in both documents, contact header selected**. The Letter is the deterministic visual authority, consistent with the existing chrome migration from saved Letter settings. This means changing only the CV body palette does not recolour the shared contact bands. Sync off continues to respect independently authored colours. Compact-only treatment and the other template families retain their previous surface policy. Removing the already deprecated mail/phone separator icons applies wherever shared contact chrome consumes an old icon selection, as explicitly requested; this is not a design-fidelity implementation for other templates.

No new layout model, renderer branch, XML repair, rasterized semantic text or default export switch is introduced. Fresh browser measurements, native paragraph frames, field SDTs, the native renderer and decorative page asset are reused. PDF/Print and Legacy exporter implementations, frozen Sidebar geometry/engine work and Agent A are untouched. Shared Web presentation intentionally changes in the requested Modern contact case so editor, Print/PDF view and DOCX do not disagree.

## Actual checks

- **7/7 real app restore/export cases**, not synthetic-only generation: horizontal, stacked, pipe separator, CV pills, moved CV pills, custom shared colours/border and independently coloured sync-off documents. Each UI download equals the app-entry bytes; saved documents remain unchanged. Fresh metrics are keyed to the full captured snapshot. The visible Letter/CV editor pages also assert exact captured colours, opacity `1` and zero contact SVGs.
- **28 native A4 pages** in the supplementary renderer, four per dossier: one cover, one Letter, two native CV pages. Native text remains complete and on-page; all five contact fields appear in every native contact header, including the CV continuation. Native header SDT source IDs appear once per story. Complete cover date `Lehrbeginn August 2028` remains native. No WPS grouped-text trial is reopened.
- Source cover and both adjacent body block models and page geometry match the previous committed packet in all seven cases. Both revised header dossiers have pixel-identical complete covers and six pixel-identical body regions. Those body comparisons explicitly exclude header zones and a **1.5-mm empty-space image-codec fringe above the footer**; a full-page pixel-equality claim would be false because the footer paint changes and LibreOffice PDF image encoding rings near its edge.
- The rubric control DOCX is **byte-identical** to the prior file; its four rendered pages are also pixel-identical. The control is copied into the new packet for reproducibility but does not require a new Word round just for this fix.
- **11/11 actual app rejection cases**, zero downloads: failed grouped-pill entry, mixed trial, unsupported CV/header fonts, header overflow, multiline rubric, mixed modes, unsupported-script rubric, reduced-continuation overflow, divergent contact sources and opt-in off. Existing stale/unavailable metric unit gates pass.
- **1214 unit tests pass**, 0 fail, 23263 assertions / 252 files. **401 DOCX tests pass**, 0 fail, 6180 assertions / 62 files (overlapping suite). Typecheck, changed-code formatting and full Nitro build pass. Lint: 0 errors, 21 pre-existing warnings. React review confirms stable derived options and no new effect/store synchronization loop.
- Both revised handoffs were rendered and every page inspected; contact bands for the pipe/custom/sync-off cases were additionally inspected side by side. Successful OOXML generation is not treated as Word visual acceptance.

[Validation and regression details](docx-next-modern-contact-colors-18okt/validation.json), [verification](docx-next-modern-contact-colors-18okt/verification.json), [rejections](docx-next-modern-contact-colors-18okt/rejections.json), [hashes](docx-next-modern-contact-colors-18okt/sha256.json) and [changed files](docx-next-modern-contact-colors-18okt/changed-files.json) identify the exact result. Projects, snapshots and fresh interior measurements for all seven cases are retained in the same folder.

## Reproduction and Word handoff

Use the existing Bun/Node/Chromium environment and verified Liberation Sans profile; the runtime was restored after workspace maintenance, without changing source dependencies or native engine binaries. The frozen lockfile is unchanged.

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
 DOCX_NEXT_COVER_CASES=header-inline,header-stacked,header-inline-pipe,cv-pills,cv-pills-offset,header-inline-custom-colors,header-inline-unsynced \
 bun scripts/docx-next-brief-app37c.ts /tmp/modern-colours
bun run test:docx-next
bun test tests/unit
```

Render downloaded packages with the established `render_docx.py --dpi 120 --emit_pdf`. Render the previous three committed handoffs into `APP_ROOT/parent/{header-inline,header-stacked,cv-pills}` with the same font/runtime configuration. `scripts/docx-next-modern-colors37d.py APP_ROOT PREVIOUS_PACKET UPLOAD_ROOT OUTPUT_DIR` checks native content/geometry/colours, performs the documented regression comparisons and copies untouched app downloads. It never alters generated packages.

Activation is unchanged: `/?docx-next-design-qa=1&docx-next-interior-qa=1`, then **Modern Header und Rubriken prüfen**. Default production export routing remains unchanged.

Revised human candidates:

1. `01-Modern-Kontakt-waagrecht-Farben-fix.docx`.
2. `02-Modern-Kontakt-untereinander-Farben-fix.docx`.

Open both in desktop Word, activate the header or inspect Print Preview, inspect all pages/right edges, edit representative fields, save, close, reopen and return saved DOCX plus Word-generated PDF for each. The earlier rubric test remains the same bytes. Existing native CV spacing/two-page flow, broader font support and arbitrary Word-side long edits remain outside this colour fix. All-39-template acceptance is not claimed or expanded.

Only the working investigation branch is published by fast-forward. Vercel exact-branch and wildcard deployment exclusions and all 16 workflow branch filters are rechecked before publication; protected refs and live branch deployment/workflow counts are checked before and after. There is no automatic promotion following this report.
