# DOCX Next handoff — 2026-10-07

## Authoritative scope and state

Work remains only on `dev`. All formerly local changes are published: the reviewed rectangle measurement is `31de8c1e`; interrupted evidence/handoff is published as `03fb91b3` with an explicit continuation note; actual PDF clip measurement is `77775d9319a6b53284c5b72612049a38ff387487`. Local and remote are synchronized before the following baseline/documentation checkpoint. Exact final publication CI is checked separately; fetch the actual current remote head and clean tree before continuing. Never rewrite published history, change `main`/`render`, manually deploy, patch source XML, add template renderer branches, split semantic paragraphs, or enable blocked exports.

Working checkout: `/workspace/scratch/40bfc6bbb930/cv-cover-charm`. The old checkout `/workspace/scratch/928b54ce08ec/cv-cover-charm` has an unrelated e2e modification; leave it untouched. Main's previously verified head is `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, render's is `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`; verify again rather than assume.

## Latest native shape/crop result

[Detailed status](sidebar-picture-frame-status.md) and [exact chronological evidence](sidebar-picture-frame-evidence.json) replace the initial interrupted handoff. The shared body-photo fixture keeps five complete CV paragraphs, cover/letter markers, eight canonical IDs, full browser-normalized 120×180 RGBA source pixels, and immutable portable-model JSON/package restoration. Only declarative frame shape/crop changes. Diagnostic models reject normal export.

[Stable run 37658539654](https://github.com/modebrecht/cv-cover-charm/actions/runs/37658539654), exact `77775d93`, completes successfully in all three jobs. The corrected frame matrix performs **three actual cases / nine dossier pages**, plus actual native Save/Reopen and second PDFs:

1. Uncropped rectangle (34×51 mm): all 8/8 fields, complete native/PDF text, original pixels, zero crop, native frame and visible geometry pass.
2. Uncropped ellipse (34×51 mm): the same requirements pass. The editor saves an image-fill shape but keeps the full original pixels; that representation alone proves no loss.
3. Cropped rectangle (34×34 mm): all fields, text, original pixels, frame and actual clipped-PDF geometry pass. Native crop `l/t/r/b` changes from `8400/24400/11600/22267` to `8378/24396/11622/22255`. The **strict exact-crop gate remains unchanged**, so the run stops on `native-photo-frame-or-crop`.
4. Cropped ellipse remains explicitly **unrendered in this stopped matrix**.

The fourth source is byte-identical to the separately executed existing body-photo calibration in the eight-case baseline. That control still saves a cropped 96×96 asset and zero crop parameters instead of its original 120×180 photo. Evidence labels it separately; do not inflate the stopped matrix's actual count. Application input/model JSON photo restoration remains passing.

The unchanged no-crop rectangular source is replayed on **Dev 26.8 / soffice CLI**: one actual case / three pages, actual Save/Reopen and second PDF. It retains only 3/8 native tags, losing the photo and four following paragraphs while preserving complete text, full original pixels and visible geometry. It stops immediately; the other three cases stay unrendered. Crop and ellipse are not required for this tag-loss observation. Engine-versus-interface attribution is unproven.

## Measurement fixes and baseline

Rectangular borders inset the PDF image. QA requires all four actual stroke edges with the declared color/width, verifies their image inset and measures the outer frame. Missing edges, wrong width/inset still fail. Cropped rectangles can paint the full source through a clipping rectangle; `docx-next-pdf-picture-qa.py` now reads actual PDF content operations, graphics-state save/restore, matrices, clip intersections, actual image paint and Form BBoxes. It cross-checks raw bounds against PyMuPDF and rejects unsupported nonrectangular/skewed paths. Eight PDF controls cover nested/restored clips, Form transforms, missing clips and crossed/unsupported paths. There are no package/PDF modifications and no relaxed crop, field or geometry gate.

The evidence preserves the initial rectangle measurement stop, the subsequent raw-crop measurement stop, both read-only reviews and the final actual native result. The baseline compares every source hash, native/visible result and exact stopped/unrendered plan, ignoring only nondeterministic saved-package metadata hashes. Diagnostic green does not accept exact-crop or identity failures.

## Application and supported verification

[Application run 37657500954](https://github.com/modebrecht/cv-cover-charm/actions/runs/37657500954), exact evidence checkpoint `03fb91b3`, succeeds fully: **1007 unit tests**, formatting, typecheck, lint/build and **all eight browser groups**. This resolves the missing-browser verification from the older failed `2234ced8` run; the cause of that historical failure is not established. [Exact-source application run 37658539544](https://github.com/modebrecht/cv-cover-charm/actions/runs/37658539544), `77775d93`, succeeds fully on attempt 2. Its first attempt has one existing list-marker assertion failure (69/70 dossier-flow cases pass); the identical-source repeat passes the full group and all other browser groups. No application or browser-test source is changed, and no specific cause is established. The final baseline publication application run is checked separately.

Latest stable supported job freshly verifies **31 fixtures / 253 pages**, canonical browser normalization, decoration pixels, immutable input/model JSON restoration including photos, complete native/PDF text/geometry and Save/Reopen. All source field IDs survive stable; all 31 lose table captions. Historical architecture diagnostic baselines and eight earlier picture controls / 24 pages are unchanged. Local **94 Python tests** pass (43 populated, 7 stable comparison, 8 supported summary, 6 native identity, 17 picture/frame, 8 PDF clip, 5 native photo); local full Bun/TypeScript success is not claimed. App/template/renderer/model and existing e2e sources are unchanged in this block.

## Next bounded task

Inspect native crop-window geometry/precision **read-only**, using the existing source/saved files and zero-crop controls, before any new variant. Quantify the recorded rectangular crop-value changes independently of lost original pixels. Keep the strict exact-crop gate and fourth case's stopped plan intact; do not infer a production repair or editor acceptance. Preserve source pixels, IDs, complete paragraphs and immutable JSON. Any proposed later native experiment must start from an actually verified positive control and stop on text, identity, source-pixel, exact-crop/frame or visible-geometry loss.

Sidebar remains blocked: **29/39 configured, 0/39 Word accepted**. Table-caption identity, original cropped-ellipse photo restoration, left long-opening attachment, Microsoft Word and approved snapshots remain open. Production export gates remain closed.

Key code: `tests/fixtures/docx-next/sidebar-picture-identity.ts`, `scripts/docx-next-picture-identity-probe.ts`, `scripts/docx-next-picture-identity-qa.py`, `scripts/docx-next-pdf-picture-qa.py`, `scripts/docx-next-native-photo-qa.py`. Older details: [minimal native identity](sidebar-picture-identity-status.md), [native identity audit](sidebar-native-identity-status.md), [supported stable](sidebar-supported-stable-status.md), [lead window](sidebar-lead-window-status.md), [split owner](sidebar-split-description-owner-status.md), [nested side](sidebar-nested-side-status.md).
