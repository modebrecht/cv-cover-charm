# DOCX Next Package 11 — Canonical dossier model gate

## Decision

**Item 11: PASS — local verification and remote CI completed successfully.**

The existing architecture is retained. Three bounded boundary defects were reproduced and corrected. No replacement model, renderer, template-specific exception or export promotion is introduced.

- Repository: `modebrecht/cv-cover-charm`
- Base fetched from remote `dev`: `04beb438c59edefc974a2aa7d43af3d754f5a051`
- Working branch: `fix/docx-next-model-gate-15okt`
- Initial working tree: clean; root `AGENTS.md` read before edits.
- Scope stops at Masterlist Item 11. Native Sidebar acceptance is independent of this decision.

## Confirmed architecture

```text
captureDossierDocxNextSnapshot() / authored DossierAppSnapshot
  → buildDossierDocModel()
  → DossierDocModel
  → renderDossierDocx()
  → validated WordPackage → DOCX Blob
```

| Boundary            | Audit result                                                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source.ts`         | Defines authored Cover, Letter, CV and explicit settings. Cover element coordinates describe saved design intent, rather than measured browser rectangles or print fragments.                                                                                                 |
| `source-adapter.ts` | Explicitly picks and clones authored fields from the historical PDF-named snapshot types. Additional page plans, measurements and preview fields do not enter the canonical source.                                                                                           |
| `snapshot.ts`       | The capture edge reads saved layout, placement, chrome and typography state once. These reads are upstream of model construction and asynchronous export.                                                                                                                     |
| `build-model.ts`    | Pure, synchronous construction from the snapshot and explicit diagnostic options. All three document parts, semantic fields, styles, image sources, shared layout compositions and model issues are resolved here. No Word package is constructed and no Word XML is emitted. |
| `model.ts`          | Portable document data with millimetre/point units, semantic block/run identities, text, styles, layout, image source/frame data, decorative geometry and issues. It contains no package parts or generated XML.                                                              |
| `renderer.ts`       | Receives the model plus explicit image/decoration services. It does not import snapshot capture, editor stores or the model builder. It validates the model, serializes shared blocks and assembles one Word package.                                                         |
| `validation.ts`     | Model validation checks identity, typography, geometry and supported structures. Package validation additionally checks required parts and relationship targets. The package import used for its type is erased at runtime.                                                   |

The renderer's default browser image normalization and decorative rasterization are asset services. Their inputs come from the model; they do not reread editor data. Tests replace these services explicitly to prove portable rendering without a browser. The model preserves semantic images as source strings and authored frame geometry; it deliberately does not decode or generate image bytes during construction.

## Reproduced defects and minimal corrections

### 1. Nested motif data shared mutable references with template configuration

`templateMotifs()` placed `cornerRadiiMm` and `fill.radialFade` directly into models from template policy objects. Two independently built models therefore shared these nested values. Mutating a portable model could affect the template and later identical builds.

**Correction:** copy the tuple and radial-fade object when materializing the motif. Numeric values, template definitions and paint behavior are unchanged. Regression tests check independent ownership and unchanged subsequent builds using both rounded and radial motifs.

### 2. Active Masonry section packing silently became paired rows

The snapshot contains `CvSectionLayout.packing`, while the current model/renderer supports paired half-width rows. Active classic-layout Masonry sections were converted to rows without any issue.

**Correction:** emit `masonry-section-converted-to-rows` with the section's semantic ID for visible, populated, half-width classic flow sections requesting Masonry. Their semantic content stays in the model. Default rendering blocks on the issue, using the existing issue gate. Hidden/empty sections and inactive packing settings are not newly blocked. Masonry rendering is not implemented by this package.

### 3. A declared image with an empty source had no model diagnostic

A Letter image record with `src: "  "` entered the model without an issue and was left for asset normalization to fail later.

**Correction:** emit `missing-image-source` for a modeled image without a nonblank source. Retain the image and its identity for inspection, and reject missing sources during model validation even under diagnostic issue opt-in. Intentionally absent photos and empty optional image placeholders continue to produce no image block and no issue.

Existing explicit diagnostics remain in place, including unresolved legacy typography, free section conversion, continuation-margin uncertainty and unsupported image opacity. Unknown templates/layouts/fonts and malformed structures still fail explicitly. This gate covers the existing supported authored structures and sanitized Letter rich-text grammar; it does not claim support for arbitrary external HTML.

## Verification

The new `tests/unit/docx-next-model-boundary.test.ts` adds 45 tests and is included in `test:docx-next`.

- Negative-control run before production fixes: **41 PASS / 3 FAIL**. The failures reproduced nested motif reference sharing, missing Masonry diagnostics and missing image-source diagnostics. One further renderer isolation test was added subsequently.
- Construction runs in an isolated process with browser/storage/network/Blob access poisoned, clock/randomness access poisoned and Word-package construction poisoned. Identical cloned input yields identical models and leaves the source unchanged.
- Cover text, Letter rich runs and image placement, CV entry field IDs/styles, custom elements and explicit second-page intent are asserted directly.
- A separate renderer process changes the original source after capture and poisons browser/storage/network access. The exported package retains the captured subject and image source and does not mutate its model.
- All **39 registered templates** are built from deeply frozen snapshots, compared against JSON-restored identical sources and checked for object-reference separation from the source.
- All 39 models are then restored through JSON, deeply frozen, validated and rendered through the single renderer with explicit image/decoration services. Word package validation, semantic subject/name controls and image relationships remain valid.
- These are model and package regressions. The injected decorative rasterizer supplies deterministic test pixels; this is not a new visual or native Word/LibreOffice acceptance claim.

| Local check                             | Result                                                |
| --------------------------------------- | ----------------------------------------------------- |
| Focused Item 11 tests                   | **45 PASS / 0 FAIL**, 429 assertions                  |
| `bun run test:docx-next`                | **353 PASS / 0 FAIL**, 54 files, 5,615 assertions     |
| `bun test tests/unit`                   | **1,166 PASS / 0 FAIL**, 244 files, 22,696 assertions |
| `bun run typecheck`                     | PASS                                                  |
| `bun run lint`                          | PASS, 0 errors; 21 warnings in untouched files        |
| `bun run format:check:release`          | PASS                                                  |
| Prettier on changed code/tests/workflow | PASS                                                  |
| `bun run build`                         | PASS                                                  |
| `git diff --check`                      | PASS                                                  |

## CI status

The existing broad regression workflow does not trigger on this working branch. A focused, read-only workflow, `.github/workflows/docx-next-model-gate.yml`, runs the same DOCX suite, complete unit suite, typecheck, lint, formatting and production build on pushes to this branch. It performs no deployment and starts no LibreOffice source build.

**Remote result: SUCCESS.** [DOCX Next canonical model gate — run 38629873048](https://github.com/modebrecht/cv-cover-charm/actions/runs/38629873048) verified implementation commit `74f0a72275a1bcf35cd7650481fb915eacf31846`. The DOCX regressions, complete unit suite, typecheck, lint, formatting and production build all passed on GitHub Actions.

The following report-only commit records this completed result. It changes no code, test or workflow; the focused workflow intentionally does not rerun for a documentation-only push. The implementation and verification inputs remain identical to the successful run.

## Scope and acceptance limits

Changes are limited to model construction/ownership, its missing-source validation, focused regression coverage, test registration, CI verification and this report. `source.ts`, `model.ts`, `renderer.ts`, snapshot capture and the historical compatibility adapter already satisfy their audited responsibilities and require no production rewrite.

No changes are made to native Sidebar architecture, LibreOffice source, PDF rendering, template designs or legacy export paths. The Sidebar gate is not enabled or relaxed. No merge, deployment or Item 12 work is part of this package.
