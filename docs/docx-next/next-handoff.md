# Continuation — 2026-10-07 17:13 UTC

The user resumed work. The reviewed rectangular-frame measurement correction `31de8c1e579073c6101cbbfdc9bb5cada3141aae` is now published on `dev` after the prior internal GitHub failures cleared. The source/evidence checkpoint below remains the dated handoff at interruption; its unpublished state and application failure describe that time, not a new product result. This successor publishes the same evidence and handoff content, with this explicit continuation note. The local checkpoint tree is compared with the published tree before synchronizing the checkout. Exact successor CI and the stable frame matrix still need verification; no later shape/crop render is claimed yet.

Only dev remains in scope. The next action is to obtain exact browser CI and continue the stable frame matrix from the no-crop rectangular control with the corrected PDF-frame measurement.

---

# Current handoff — 2026-10-07 17:04 UTC

This section supersedes the older handoff below. Work stops at the user's handoff request. Only `dev` is in scope; no production renderer/model/export changes, `main`/`render` edits, deployment, force push or export enablement.

## Published and unpublished state

- Remote `dev`, freshly checked: `2234ced8f4c2dbd76d76ff1c3c7835df75ba5edc` (tree `4b965bb589727964b66672d93d4291b57cc770c6`). This publishes four guarded body-photo frame controls and the pixel-loss stop gate.
- Reviewed measurement correction: commit object `31de8c1e579073c6101cbbfdc9bb5cada3141aae` (tree `07569d94af098e1fe216cf96ea5a1ace273f8d3b`), parent exactly remote `2234ced8`. It is **not published on dev**. GitHub ref updates repeatedly return internal GraphQL errors; a contents update also returns an internal error. A normal CLI push has no credentials. No force push or history rewrite was attempted. The local dev checkpoint includes this correction and this handoff/evidence; fetch/reconcile before any publication.
- Working checkout: `/workspace/scratch/40bfc6bbb930/cv-cover-charm`. The old checkout at `/workspace/scratch/928b54ce08ec/cv-cover-charm` has an unrelated e2e modification; do not touch or publish it.

## Actual results and limits

[Exact evidence](sidebar-picture-frame-evidence.json) contains all source hashes, original/saved native-photo inventories, the actual stable stop, its read-only PDF measurement review, actual Dev replay and explicit unrendered cases.

The first un-cropped rectangular control uses the original 120×180 RGBA pixels, the same eight native field IDs and complete paragraphs. Its frame is 34×51 mm, zero crop, radius zero, original 0.4-mm colored border. The remaining planned cases are uncropped ellipse, cropped rectangle, cropped ellipse. The final calibration source package is byte-identical to the existing body-photo control.

- **Stable 25.8.7.3 / LibreOfficeKit:** one actual case / three pages, native Save/Reopen and second PDF. 8/8 tagged fields, complete native/PDF text, original pixels, zero crop and native rectangular geometry survive. The original PDF QA stops on image dimensions because the border insets the embedded image. Three later cases remain unrendered.
- **Measurement review:** inspect the same actual stable PDFs, without modifying or rerendering them. Their four border strokes have the authored color/thickness, expected rectangular outer dimensions and image inset. Corrected QA passes both PDFs. New code requires every edge and rejects missing edges, wrong stroke thickness and wrong image inset; it does not widen the existing geometry tolerance. This is a measured false negative of the initial gate, **not a completed new stable matrix**.
- **Exact unchanged-source Dev 26.8 / soffice CLI:** one actual case / three pages, Save/Reopen and second PDF. Only 3/8 tags remain: the photo and four following paragraph tags are lost. Complete native/PDF text, original 120×180 pixels, crop and visible geometry pass. It stops immediately on field identity; three later cases remain unrendered. Thus cropping and ellipse shape are not required for the Dev field-loss finding. Engine-versus-interface attribution remains unproven.
- Visual inspection covers all four unique actual page PNGs across stable/Dev source and save. No visible clipping or missing text. A local pinned-stable bootstrap does not produce a usable runtime; do not claim extra local stable renders.

## CI and checks

- [Stable run 37655462560](https://github.com/modebrecht/cv-cover-charm/actions/runs/37655462560), exact remote `2234ced8`: completed **success**, all three jobs. It preserves historical diagnostic baselines, eight earlier picture controls, and 31 supported fixtures. Observation green records the initial stopped frame case; it does not accept a photo/identity failure.
- [Application run 37655462578](https://github.com/modebrecht/cv-cover-charm/actions/runs/37655462578), exact remote `2234ced8`: completed **failure**. The returned job listing contains only successful `fast-checks`: 1007 unit tests, release formatting, typecheck, lint (0 errors / 21 existing warnings) and build passed. No successful browser-suite result is claimed; inspect the run and resolve/retry before declaring application CI green. Cause is not established.
- Local **86 Python QA tests** pass: 43 populated, 7 stable comparison, 8 supported summary, 6 native identity, 17 picture/frame, 5 native photo. TypeScript probe/fixture formatting was checked before the measurement-only correction. Local full Bun/TypeScript checks are not claimed.

## Next bounded action

Fetch actual remote dev and verify/reconcile with the local unpublished checkpoint. Publish the reviewed measurement correction and evidence without rewriting history; resolve the failed application run and obtain exact-commit browser results. Then run the stable frame matrix with corrected measurement, starting at the rectangular no-crop positive control. Only on its full pass proceed to ellipse/crop controls; stop on any complete-text, field-ID, original-pixel, native crop/frame or visible-geometry loss. Preserve full paragraphs and IDs, canonical browser pixels, JSON immutability, and normal export rejection. No XML patches or renderer special cases.

Sidebar remains blocked, 29/39 configured, 0/39 Word accepted. Table-caption identity, original cropped-photo restoration, left long-opening flow, Word and snapshots remain unresolved. Source/model/input JSON photo restoration still passes. All production export gates stay closed.

---

# DOCX Next handoff — 2026-10-07

Latest rendered/control source: `f5b6df2744ffaf48296e8c4fb15775ad7ced4b2c`; its full application and all three stable jobs pass. The following evidence/native-photo audit checkpoint preserves its generated control packages and all production sources. Earlier comprehensive source `8059c16b` and exact-source replay helper `3f23bcdd` remain historical evidence. Production, renderer, model, templates and application exports remain identical. Work stays only on `dev`, with no promotion, force push or manual deployment. `main` remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; `render` remains `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`. Do not cherry-pick historical `2aa6c7c` again.

## Infrastructure follow-up

Source `1ef6f4db` passes the exact minimal picture/native-photo baseline job. Its historical stable-comparison and supported jobs hit Ubuntu snapshot downloads before document tests; the comparison retry times out again at the prior 150-second package-download limit. This is a setup failure, not a newly observed document regression. The successor adds a shared cache for archives/fonts keyed by the unchanged pinned manifests, verifies all cached hashes again, builds a fresh runtime for each job, and bounds a cold update/download at 180/360 seconds with a 12-minute setup step. No package/version/font pin, native gate, baseline or test is relaxed. Exact successor CI is checked separately.

## Verified CI and validation

- [Stable run 37621549458](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549458), exact source `8059c16b`: both jobs complete successfully. LibreOffice 25.8.7.3 reproduces every committed diagnostic source package, full-text/bounds/opening result, Save/Reopen and explicit stopped plan with zero changed cases. Green diagnostics do not accept the negative product results.
- Its supported job freshly renders **31 existing Sidebar fixtures / 253 pages**, with the canonical browser decoder, six synthetic image inputs, browser decoration pixel checks and immutable portable input/model JSON package restoration including photos. Complete native/PDF text, geometry/images, expected pages/opening flow and actual Save/Reopen pass. All tagged field IDs survive stable native Save/Reopen; table captions disappear in all 31. [Actual supported evidence](sidebar-supported-stable-evidence.json).
- [Application run 37621549317](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549317), same exact source: 1007 unit tests across 214 files, format/type/lint/build and all eight browser groups pass. Lint has 21 existing warnings, zero errors. Latest documentation publication CI is checked separately.
- Latest minimal picture/control source: [stable run 37632467382](https://github.com/modebrecht/cv-cover-charm/actions/runs/37632467382), all three jobs successful; [full application run 37632467368](https://github.com/modebrecht/cv-cover-charm/actions/runs/37632467368), successful. Existing 31 supported fixtures / 253 pages and all historical diagnostic baselines are freshly verified. Eight minimal stable controls / 24 pages preserve all field IDs; two identical Dev CLI controls / six pages stop on five lost IDs in plain body photo flow. Complete text, visible geometry and actual Save/Reopen pass. Six Dev controls remain unrendered. [Detailed evidence](sidebar-picture-identity-status.md).
- Local: **78 Python integrity/evidence tests** pass (43 populated evidence, seven stable comparison, eight supported summary, six native identity, nine minimal-picture QA and five native-photo audit). Diagnostic executables preserve immutable model/JSON package identity and reject normal exports. Local Bun/full TypeScript success is not claimed; locked full checks come from CI.

## Actual bounded comparisons

| Comparison                                        | Actual cases | Dossier pages | Result                                                                                                                          |
| ------------------------------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Empty spanning side ending                        | 4            | 84            | No false/true effect; left main opening remains detached                                                                        |
| Lead row cantSplit                                | 4            | 84            | No true/false effect; left remains detached                                                                                     |
| Paragraph versus cell top padding                 | 2            | 44            | Right side opening regresses; two left cases unrendered                                                                         |
| 220 versus zero main lead                         | 4            | 84            | Zero lead attaches all five main fields in both orientations                                                                    |
| 205/210/215/220 mm lead window                    | 8            | 168           | Both pass at 205/210; left detaches description at 215/220 while right moves the whole opening to page 2                        |
| Tail versus opening-cell owner, opening row true  | 2            | 36            | Right loses complete PDF descriptions in both lanes and fails body bounds; left unrendered                                      |
| Tail versus opening-cell owner, opening row false | 2            | 36            | Exactly the same render/Save-Reopen failures as true; left unrendered                                                           |
| Direct versus inner-table side paragraphs         | 2            | 31            | Right inner table clips side description to 790/18,444 visible characters; main complete, openings/bounds pass; left unrendered |

Total: **28 actual diagnostic cases / 567 dossier pages**, each also rendered after Save/Reopen. The additional hour adds four cases / 67 pages. All source/saved native text fields survive these diagnostics; moved descriptions and nested side content lose complete visible PDF text. Stop plans and unrendered cases stay explicit. No accepted architecture or production repair follows from these results.

## Native identity finding

The read-only [local native audit](sidebar-native-identity-status.md) checks the 31 earlier supported packages and saves. Dev 26.8/soffice CLI preserves complete saved native text, but 11 photo cases lose 1,462 tagged fields and all 31 lose container captions. Source packages, input/model JSON and restored photos retain their IDs. This narrows prior green render claims: complete visible/native text alone did not establish every saved field/container identity.

The [exact-source browser package replay](sidebar-engine-replay-evidence.json) removes the adapter difference for `sidebar-photo-main`: source SHA-256 `60e8e210395f1715b92cefff606f9089c40da1f89c338edf1aa16e12675d2fd2`, copied unchanged from the completed supported job in [run 37622625200](https://github.com/modebrecht/cv-cover-charm/actions/runs/37622625200). Stable 25.8.7.3/LibreOfficeKit preserves 78/78 tags; Dev 26.8/soffice CLI preserves 51/78, losing 27. Both preserve complete native/PDF text, image and four pages after Save/Reopen, while losing two table captions. No image renormalization or source package patch occurs. The different verified runtime combinations behave differently; the engine/interface cause is unproven.

The native identity audit is now independent of text/layout gates and stays explicitly blocked for lost captions. Experimental Sidebar gates remain closed. Counts stay **29/39 configured and 0/39 Word accepted**; Microsoft Word and approved snapshots remain pending. There are no production renderer, model builder, template or export changes.

## Minimal body-picture finding and next bounded task

The [minimal picture/context comparison](sidebar-picture-identity-status.md) removes table ownership entirely from the first negative Dev case. With exactly the stable browser-source DOCX, Dev CLI loses the photo tag and four following paragraph tags in body flow; the plain body control preserves every tag. Stable preserves every field in all eight controls and loses only table captions in its six table controls. A table is therefore not required for this field-loss result. The exact engine/interface cause remains unproven; a local Kit prototype crashes before producing an accepted plain-control result.

A separate read-only native-photo audit finds original decoded pixels and editable crop parameters lost in all four stable photo saves and the one rendered Dev photo save: 120×180 source becomes 96×96 cropped media, picture becomes an image-fill shape, and native crop parameters become zero. Native ellipse/frame geometry and drawing names survive; drawing names cannot substitute for field tags. This concerns restoration from saved native DOCX, **not** the passing application input/model JSON photo restore. The audit recognizes both picture and image-fill representations and distinguishes PNG recompression from changed pixels. Exact baselines record all negative findings independently of visible success.

Next: use stable body flow to compare an uncropped rectangular picture with the existing framed/cropped source, holding complete paragraphs, canonical IDs and original pixels constant. Start with the uncropped control; require complete native/PDF text, every native field ID, visible geometry and original pixel preservation after Save/Reopen. Only then isolate crop versus shape. Stop immediately on regressions; do not patch source packages or enable export.

The original left long-opening failure also remains unresolved. Do not infer a universal lead threshold, combine flags into a claimed repair, split semantic descriptions, patch XML, add template renderer branches or enable production export.

Key files: [minimal picture status](sidebar-picture-identity-status.md), `scripts/docx-next-picture-identity-probe.ts`, `scripts/docx-next-picture-identity-qa.py`, `scripts/docx-next-native-photo-qa.py`, [splittable owner status](sidebar-split-description-owner-status.md), [inner side status](sidebar-nested-side-status.md), [native identity status](sidebar-native-identity-status.md), [stable supported status](sidebar-supported-stable-status.md), `scripts/docx-next-populated-row-qa.py`, `scripts/docx-next-native-identity-qa.py`, `scripts/docx-next-supported-summary.py` and `scripts/docx-next-engine-replay.py`.

Before continuing, fetch the actual current remote `dev`, confirm its head and a clean tree, read `AGENTS.md`, and inspect exact-commit CI. Published checkpoints are evidence, not assumptions about the latest remote head. Every commit in this block is published with an identical local/remote source tree; the final clean head is reported after the documentation publication and its application CI.
