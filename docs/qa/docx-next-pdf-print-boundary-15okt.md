# DOCX Next Package 12 — PDF / Print independence

## Decision and provenance

**Item 12: PASS locally. Remote verification is pending the implementation push.**

The existing native pipeline is retained:

`DossierAppSnapshot → buildDossierDocModel() → DossierDocModel → renderDossierDocx() → validated WordPackage → DOCX`.

- Remote `dev` fetched before work: `5301dff892c741fe9fcb460a637a874673b89b40`.
- Initial working tree clean; root `AGENTS.md` read.
- Working branch: `fix/docx-next-pdf-print-boundary-15okt`.
- [PR #182](https://github.com/modebrecht/cv-cover-charm/pull/182) is confirmed merged into `dev`, with merge SHA equal to the fetched base. Its Item 11 implementation and `docs/qa/docx-next-model-gate-15okt.md` are present.
- Item 11's [dedicated CI run](https://github.com/modebrecht/cv-cover-charm/actions/runs/38629873048) succeeded. Post-merge CI is tracked separately below.

## 1. Actual runtime dependency graph

The audit follows the JavaScript emitted by the repository's TypeScript compiler settings. It traverses imports, re-exports, literal dynamic imports and `require()` transitively. Explicit and inferred type-only edges are erased before traversal; this includes type re-exports. Nonliteral or indirect module loading is reported rather than silently skipped.

The complete resulting adjacency graph is committed as [docx-next-pdf-print-runtime-graph-15okt.json](./docx-next-pdf-print-runtime-graph-15okt.json): **67 modules, 124 runtime edges, zero external packages, zero unresolved loaders**. All current edges are static; regression tests exercise transitive dynamic/require edges separately.

| Entry                         | Reachable modules, including entry | Important boundary                                                           |
| ----------------------------- | ---------------------------------: | ---------------------------------------------------------------------------- |
| `docx-next/export.ts`         |                                 56 | Model builder and native renderer; no capture, PDF/Print or editor bootstrap |
| `docx-next/source.ts`         |                                  1 | Types only; no emitted imports                                               |
| `docx-next/source-adapter.ts` |                                  1 | Explicit authored-field picks and clone; historical PDF-named types erased   |
| `docx-next/snapshot.ts`       |                                 19 | Upstream saved-state capture only                                            |
| `docx-next/build-model.ts`    |                                 42 | Semantic data, pure shared helpers and declarative configuration             |
| `docx-next/model.ts`          |                                  1 | Data contracts and recursive block traversal                                 |
| `docx-next/renderer.ts`       |                                 22 | Own Word/XML/package/ZIP modules, native validation and asset services       |
| `docx-next/images.ts`         |                                  1 | Replaceable browser image adapter and cache                                  |
| `docx-next/decoration.ts`     |                                  1 | Nonsemantic geometry and replaceable canvas paint adapter                    |

Counts overlap; they must not be added. No runtime dependency is hidden behind an unexamined npm package because the resulting closure contains no external runtime imports.

Before correction, the union reached 109 local modules/assets, including 29 browser stylesheets and the saved-document/PDF-named adapter module. These were transitive imports, rather than a DOCX rendering pass through jsPDF, html2canvas, Chromium print or a generated PDF. None of those PDF engines was needed by the native renderer before this package either.

## 2. Allowed versus forbidden dependencies

| Dependency                                                                                                                     | Classification and evidence                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cover/CV semantic types, list IDs, contact precedence, palettes, authored geometry, font policy                                | Allowed shared data/helpers; preserve the same existing semantics                                                                                                           |
| `import type` of historical PDF-named snapshot types                                                                           | Allowed; compiler emits no runtime import from `source-adapter.ts` or the corresponding type references in capture/chrome resolution                                        |
| Saved-state getters in `snapshot.ts`                                                                                           | Allowed upstream capture edge; export/model/renderer must not reach back into capture                                                                                       |
| Shared modules containing both constants/pure normalizers and callable store accessors                                         | Import alone is not evidence of a store read. Cold-process tests poison browser state before imports and generation, proving the used path does not execute those accessors |
| `images.ts` / `decoration.ts` default canvas adapters                                                                          | Allowed isolated asset services. They remain replaceable through explicit renderer options and do not enter the semantic model                                              |
| Browser/PDF CSS, saved-document reconstruction reached from the model, module-load storage migrations                          | Removed from the native generation closure                                                                                                                                  |
| PDF generators, native print preparation, PDF pagination/fragments/DOM measurements, PDF corrections, legacy DOCX manipulation | Forbidden runtime infrastructure; absent from the audited closure and unavailable in cold-process tests                                                                     |
| New external packages or unresolved dynamic loading                                                                            | Guard fails closed and requires an explicit boundary review                                                                                                                 |

The model preserves authored image coordinates and section/page intentions. It does not receive measured rectangles, rendered PDF content or print page fragments. Native Word paragraphs, tables and sections retain text flow and pagination responsibility; no browser/PDF pagination pass is invoked.

## 3. Root causes and minimal corrections

### A. Pure contact functions were exported from a mixed saved-state module

Before: `build-model → dossier-resolved-chrome → dossier-contact → dossier-pdf-document / dossier-project`.

`resolveDossierContact()` and the three contact selectors themselves were pure. Their module also implemented `readDossierContact()`, importing saved-document reconstruction and editor storage. Importing the pure functions therefore loaded unrelated runtime infrastructure.

The existing pure functions move unchanged into `dossier-contact-data.ts`. `dossier-resolved-chrome.ts` imports that semantic module directly. `dossier-contact.ts` retains its saved-state reader and re-exports the same pure function implementations for existing callers. Contact precedence and editor/PDF callers keep their behavior.

### B. An unused layout barrel edge loaded browser/PDF correction CSS

Before: `build-model → cover/layouts → fresh-templates → browser styles / PDF correction CSS`.

DOCX only needs `buildCustomBlocks()`, already implemented in `layouts-base.ts`. It now imports that implementation directly. Custom element slot lookup uses `template-slots.ts`, which reads declarative palette data without loading UI registration or styles.

The two standalone template metadata definitions previously embedded in `fresh-templates.ts` move verbatim into this semantic module. UI registration consumes those same definitions in the same order. No palette value, design, CSS, visual rule or template-specific rendering branch is changed. Fresh palette defaults remain available in a fresh process, including for custom CV elements; browser registration is no longer an implicit prerequisite.

### C. Importing CV semantic data executed a storage migration

After removing A/B, a cold-process test exposed `cv/types.ts → normalizeLegacyCvTypeScales()` at module evaluation. This read and potentially rewrote browser storage even when importing the native model after capture.

The unchanged migration moves into `cv/legacy-type-scales.ts`, imported by the existing `cv/design.ts` entry. Shared CV data/functions become safe to import independently. The existing browser design entry still performs the original migration before saved designs are read. A regression verifies both zero store reads on the semantic import and the original 0.75–1.35 clamping/content preservation at the design entry.

No native renderer, package validator, asset normalization algorithm or export interface is replaced or relaxed.

## 4. Evidence of independent native package generation

`tests/unit/docx-next-pdf-print-boundary.test.ts` adds six focused checks:

1. Audit the complete runtime graph from all nine required roots.
2. Preserve the existing saved CV migration at its browser/design boundary.
3. Negative controls prove the guard follows transitive re-exports, dynamic imports and `require()`, rejects unknown loading and capture from the native core, and correctly ignores explicit/inferred type-only dependencies.
4. Three fresh-process cases cover a Fresh template and both relocated standalone palettes: Cove, Diagonal and Edel Dark.

For the fresh-process cases, the parent prepares real existing fixture snapshots and serializes them to JSON. The generation process does **not** import the fixture factory or historical PDF snapshot factory. Before importing any DOCX entry it:

- Installs a loader that rejects jsPDF/html2canvas/PDF-reader modules, PDF/native-print/legacy-DOCX modules and CSS.
- Runs four negative controls proving that the loader actually prevents jsPDF, native print, saved PDF document reconstruction and PDF correction CSS from loading.
- Poisons browser/editor/measurement globals, network access, image construction, clock and randomness.

It then imports all nine roots, builds equivalent models from identical frozen snapshots, validates the real model and generates a real ZIP/Word package using explicit deterministic image/decoration adapters. The cold cases also verify that a deliberately duplicated semantic ID is rejected by the real validator.

The healthy packages retain editable text, native paragraphs, tables and sections; subject/name/custom-field semantic controls; rich Letter table cell text; and resolvable native image relationships. The same semantic image is normalized once for the CV and Letter. Decorative paint uses the explicit asset adapter. No forbidden module load occurs. `renderDossierDocx()` runs its actual `validateWordPackage()` before returning; that path and its validators are not mocked.

## 5. All 39 template configurations

The existing Item 11 matrix in `docx-next-model-boundary.test.ts` is reused rather than duplicated. Its 39 cases now additionally compare pure palette slot keys with the registered UI metadata and exercise an authored custom CV element through frozen snapshot/model restoration and the native renderer.

All 39 retain valid native exports, semantic IDs, editable custom text and image relationships. The matrix retains the existing deterministic/source-immutability checks. The additional cold-process cases specifically prevent warm fixture imports or UI registration from masking unwanted runtime coupling.

## 6. Verification results and CI

| Local check                                                    | Result                                         |
| -------------------------------------------------------------- | ---------------------------------------------- |
| Focused Item 12 tests                                          | 6 PASS / 0 FAIL                                |
| Existing Item 11 model/template matrix                         | 45 PASS / 0 FAIL, including all 39 templates   |
| `bun run test:docx-next`                                       | 359 PASS / 0 FAIL across 55 files              |
| `bun test tests/unit`                                          | 1,172 PASS / 0 FAIL across 245 files           |
| `bun run typecheck`                                            | PASS                                           |
| `bun run lint`                                                 | PASS: 0 errors, 21 warnings in untouched files |
| Release formatting and Prettier on changed code/tests/workflow | PASS                                           |
| `bun run build`                                                | PASS                                           |
| Existing browser integrations, scoped config                   | 3 PASS / 0 FAIL in 34.2 s                      |
| `git diff --check`                                             | PASS                                           |

Browser integrations reuse `dossier-chrome-document-content.spec.ts` and `dossier-state-roundtrip.spec.ts`. They verify document-specific header text, shared geometry, and save/clear/reload restoration of all three documents and CV sidecars. The flow is entirely client-side; no service credentials or deployed backend are required. The development server logged a Letter SSR hydration warning while these assertions passed. That warning is outside the native DOCX gate and is not presented as resolved.

The existing `.github/workflows/docx-next-model-gate.yml` is extended to this branch and the runtime guard. It runs DOCX and complete unit suites, typecheck, lint, formatting and build; a dependent job runs the three existing browser integrations. It neither deploys nor starts LibreOffice source experiments.

**Candidate CI:** pending implementation push; exact run URL and conclusion will be recorded after completion.

**Post-Item-11 merge checks on the actual base:**

- [DOCX Next Stable Sidebar, run 38633733529](https://github.com/modebrecht/cv-cover-charm/actions/runs/38633733529): SUCCESS. This is an inherited check result, not a new Sidebar acceptance from Item 12.
- [Template Contact Integrity, run 38633733659](https://github.com/modebrecht/cv-cover-charm/actions/runs/38633733659): SUCCESS.
- [Dossier Web Gallery, run 38633733785](https://github.com/modebrecht/cv-cover-charm/actions/runs/38633733785): SUCCESS.
- [Dossier Regression, run 38633733545](https://github.com/modebrecht/cv-cover-charm/actions/runs/38633733545): still running at the last audit. The entire application CI is therefore **not** claimed green.

## 7. Limitations and strict scope

- The graph guard analyzes compiler-emitted reachable modules; computed/indirect loading and new external packages are rejected rather than assumed safe. The committed JSON is a historical evidence snapshot; the regression always computes the live graph.
- Deterministic asset adapters provide real PNG bytes for package tests. This verifies replaceability and package structure, not visual parity of every decorative canvas operation.
- Existing browser canvas photo normalization and nonsemantic rasterization remain available unchanged. They are allowed adapters, not PDF rendering dependencies.
- No Microsoft Word compatibility or native pagination acceptance is inferred from unit tests, browser tests or LibreOffice.
- No native Sidebar architecture/policy, LibreOffice source/CppUnit experiment, native Chromium PDF, automatic PDF export, legacy production DOCX export, template visual behavior, production switchover or Legacy/V2 deletion is included.
- No merge or deployment is performed. Work stops after Item 12; Item 13 is not started.
