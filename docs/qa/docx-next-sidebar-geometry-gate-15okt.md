# DOCX Next native Sidebar geometry decision — 15 October 2026

**NO-GO for production promotion.** The unchanged official 22-fixture matrix reproduces **22/22 content acceptance, 18/22 exact geometry and the same four mirrored failures**, independently in GitHub CI and a fresh local execution. No application correction is justified by the measured cause. `body-stories` stays diagnostic-only and rejects ordinary export without explicit issue opt-in.

## Provenance and bounded scope

- Actual remote `dev`, fetched before work and rechecked after testing: `8901a830a792d75e9e792345c5180827218b4e1e` (Items 11/12 and their QA reports present; PRs #182/#184 merged). Initial checkout clean; root `AGENTS.md` read; no nested `AGENTS.md` found.
- Isolated branch: `fix/docx-next-sidebar-geometry-gate-15okt`. Executed checkpoint: `5c40e60bda42f5f1490e98d94dfa029c8b452854`.
- Runtime: stock Ubuntu LibreOffice **25.8.7.3, 580(Build:3)**, 50 package hashes and the existing Liberation font manifest verified by the established setup. Kit/UNO are the existing headless stock Writer path. No desktop Writer UI or desktop Microsoft Word acceptance is claimed.
- Stock `libswlo.so` SHA-256 before/after local testing: `ecc533cd929a8a044129026b519a87917803e0db7eb1c6bbec84f5511231397b`. No binary changes or engine source builds.
- CI: Ubuntu 24.04, Python 3.12.15, Bun 1.4.3, Node 22, Playwright 1.55.0 / Chromium 140.0.7339.16 (1187). Local: Ubuntu 24.04, Python 3.12.14, Bun 1.3.11, Node 24.19.0, same Playwright/Chromium. Both use **fresh browser normalization**, not Pillow PNG substitution or replayed images.
- All **22 generated source DOCX hashes** match the historical official browser-normalized sources, including all four inputs bound to the earlier live native measurements. The two executions agree on all 66 complete owner inventories, nested grids, native ancestry/public geometry, 44 within-artifact comparisons and the supplemental integrity report. PDF byte hashes across machines are not a gate.

The prior auxiliary 26.2.6.3/Pillow A/B remains a separate experiment. Its 11/22 body geometry and nine unresolved table identities are neither substituted into this official matrix nor reclassified as missing visible photos. The previous paired source build on `fix/docx-next-sidebar-gate-13okt` ended in baseline compilation timeout before CppUnit; that result remains inconclusive about the proposed engine patch. Its [final report](https://github.com/modebrecht/cv-cover-charm/blob/d957153/docs/qa/docx-sidebar-provisioned-source-build-14okt.md) was read, not rerun.

## Exact official source → saved1 → saved2 matrix

`saved` is first save; `saved2` is second save. Triples are physical left-column / gap / right-column widths in twips. Every root preferred width is **9638 twips = 170.003611 mm**; every phase's root cell-width triple equals its grid and sums to the preferred width. Source consistency also passes all nested tables. Owner is the complete ordered original canonical field inventory, never a table name, ordinal, partial ID or visible text. All 66 original table owners resolve uniquely; counts below refer to the root owner. Content passes every row. Exact geometry additionally requires **all nested serialized grids, public native separators, words and pixels** to remain unchanged.

| Fixture (unchanged manifest identity) | Source grid | Saved1 grid | Saved2 grid | Owner fields | Total A4 pages S/1/2 | Exact geometry |
| --- | --- | --- | --- | ---: | --- | --- |
| app-body-both-long | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 352 | 11/11/11 | PASS |
| app-body-both-long-right | `6508,341,2789` | `6507,341,2790` | `6506,341,2791` | 352 | 11/11/11 | FAIL |
| app-body-left | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 47 | 3/3/3 | PASS |
| app-body-right | `6508,341,2789` | `6507,341,2790` | `6506,341,2791` | 47 | 3/3/3 | FAIL |
| app-body-paragraph-long | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 49 | 10/10/10 | PASS |
| app-body-side-paragraph-long | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 49 | 22/22/22 | PASS |
| app-body-side-entries-long | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 300 | 16/16/16 | PASS |
| app-body-side-entries-smaller-body | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 300 | 19/19/19 | PASS |
| app-body-placements | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 50 | 3/3/3 | PASS |
| app-body-styled | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 47 | 3/3/3 | PASS |
| app-body-photo-left | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 48 | 3/3/3 | PASS |
| app-body-photo-right | `6508,341,2789` | `6507,341,2790` | `6506,341,2791` | 48 | 3/3/3 | FAIL |
| app-body-photo-main | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 48 | 3/3/3 | PASS |
| app-body-photo-free-main | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 48 | 4/4/4 | PASS |
| app-body-photo-free-side | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 48 | 3/3/3 | PASS |
| app-body-photo-free-mirrored-side | `6508,341,2789` | `6507,341,2790` | `6506,341,2791` | 48 | 3/3/3 | FAIL |
| app-body-photo-free-low | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 301 | 12/12/12 | PASS |
| app-body-photo-free-portrait | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 48 | 4/4/4 | PASS |
| app-body-photo-free-chrome | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 297 | 13/13/13 | PASS |
| app-body-contact-long | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 296 | 13/13/13 | PASS |
| app-body-chrome-continuation | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 296 | 13/13/13 | PASS |
| app-body-chrome-leading | `2789,340,6509` | `2789,340,6509` | `2789,340,6509` | 296 | 13/13/13 | PASS |

`placements` now passes; the older save-geometry evidence predates the already implemented inherited cumulative rounding for nested tables. No fixture or assertion was changed to obtain this result.

## Physical bounds, imported geometry and visible positions

The following are the identical declarations for each of the four failing root tables. Bounds are three `left:right` column intervals. They are calculated from the serialized CV page margin (1134 twips) and serialized grid, **not measured internal Writer coordinates**. Every fixture/phase's corresponding bounds are retained in the [machine-readable evidence](docx-next-sidebar-geometry-gate-15okt-evidence.json).

| State | Declared column bounds, twips | Declared column bounds, mm | Actual public imported separators / 10000 |
| --- | --- | --- | --- |
| source | `1134:7642, 7642:7983, 7983:10772` | `20.002500:134.796389, 134.796389:140.811250, 140.811250:190.006111` | `[6751, 7105]` |
| saved | `1134:7641, 7641:7982, 7982:10772` | `20.002500:134.778750, 134.778750:140.793611, 140.793611:190.006111` | `[6750, 7104]` |
| saved2 | `1134:7640, 7640:7981, 7981:10772` | `20.002500:134.761111, 134.761111:140.775972, 140.775972:190.006111` | `[6749, 7103]` |

The public native table width is **17000 mm/100 = 170 mm** in all three states. Its public separators/row separators change exactly as shown, after resolving the complete native owner. The public API re-normalizes widths and exposes no exact internal twip getter; its 170 mm width must not be equated with exact twip stability. Historical live sampling on these **same source bytes and stock binary** measured the first imported core grid as `[6507,341,2790]` while the source declares `[6508,341,2789]`. This older internal observation is explicitly separate from the fresh public snapshots.

The four cases change visible CV word positions by up to **0.017656 mm** on the first save and **0.017635 mm** on the second (approximately one twip = 0.017639 mm each). Exact pixel/word comparisons fail even though page counts and text sequence remain unchanged. No tolerance waiver or screenshot-only acceptance is used.

## Four blockers and minimal root cause

| Blocker | Independently reproduced cause and consequence |
| --- | --- |
| `app-body-both-long-right` | Consistent `9638 = 6508+341+2789` source. Writer's relative-boundary conversion loses a twip from the first physical column on each import/save cycle; the long main story moves over multiple CV pages. Complete 352-field root owner remains unique. |
| `app-body-right` | Same right-hand source grid and stock conversion; `[6508,341,2789] → [6507,341,2790] → [6506,341,2791]`. Complete 47-field root owner remains unique. |
| `app-body-photo-right` | Same root conversion, not an extra photo-induced width contradiction. Complete 48-field root owner and named photo's table ancestry survive; text and photo frame positions drift. Separate image serialization limits are below. |
| `app-body-photo-free-mirrored-side` | Same root conversion with the nested free-photo owner. Complete 48-field root owner and named photo's table ancestry survive; free-photo frame shifts about one twip per save. |

`cumulativeColumnTwips()` rounds cumulative shared edges and conserves the declared total. `parallelFlowTable()` derives native weighted track widths and the physical gap. The renderer emits the same cumulative values for `tblGrid` and every `tcW`, with matching `tblW`; the inherited scope already conserves nested grids. There is **no emitted preferred/cell/grid width inconsistency to fix** in this candidate.

The fresh observed serialized transitions match the established relative-separator rounding followed by truncating width mapping on **104/104 nested-table save comparisons**. For the right root, nearest relative boundaries `[6752,7106]` map through integer truncation to `[6507,6848]`, yielding `[6507,341,2790]`. Repeating the path yields the second loss. The original source-backed `SwTable::NewSetTabCols` divisions and prior same-input live samples are retained in [native rounding evidence](../docx-next/sidebar-native-nearest-evidence.json) and [the source proposal](../docx-next/libreoffice-nearest-tabcols-proposal.patch). Arithmetic alone is not presented as a new live trace; current internal transients were not instrumented.

**Application experiments attempted: zero.** Existing consistent widths, byte-identical causally investigated inputs and the unmodified stock engine give no failing-before/passing-after case for a small application correction. Shifting authored widths, compensating future saves, changing native paragraph order, visual RTL tricks, XML repairs or changing fixture data would not satisfy this gate. The earlier engine intervention and failed source-build attempt are historical evidence only; neither was executed here.

## Text, ownership, photos and document isolation

- **PASS:** all canonical field IDs, field text and body order in the packages and native controls; both complete visible/native stories; all 66 uniquely resolved complete table owners and native ancestry snapshots. This is final identity/ancestry evidence, not continuous object-lifetime proof.
- **PASS:** 564 actual A4 PDF pages per execution, stable per-case page counts, zero unexpected empty CV pages, bounds/chrome/first-page lead checks. Cover and letter (first two pages) retain exact word positions and pixels in all 22 cases across both saves; the export probe also verifies shared original Cover/Letter model isolation.
- **PASS for visible presence:** all nine photos render exactly once at every phase with the existing frame-size/track/stroke bounds checks. Each named `cv.person.photo` drawing stays uniquely resolvable and retains the same complete table ancestry as its canonical photo field in all phases.
- **FAIL for original asset identity and SDT containment:** in all nine cases, the first save replaces the source image and the photo SDT no longer encloses its drawing. The canonical SDT tag remains (empty text is still empty) and the named drawing remains in the same table. This is not disappearance of the visible photograph, and is distinct from the auxiliary experiment's unresolved root-table identity.
- **Original crop/XML stability is not accepted:** Writer converts the original picture/`srcRect` encoding to a shape with `fillRect`, changes EMU frame/stroke serialization, and rewrites crop encoding again on save2. Every phase's exact metadata, asset byte hash, decoded RGBA hash, frame boxes and owner ancestry are retained in the evidence. The seven non-mirrored photo cases' full-page pixels remain exact; screenshot similarity does not prove original resolution or editable crop preservation.

| Photo fixture | Source pixels | Saved1 pixels | Saved2 pixels | Visible presence | Original asset identity |
| --- | --- | --- | --- | --- | --- |
| app-body-photo-left | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-right | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-main | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-free-main | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-free-side | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-free-mirrored-side | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-free-low | 120×180 | 96×96 | 96×96 | PASS | FAIL |
| app-body-photo-free-portrait | 120×180 | 73×91 | 73×91 | PASS | FAIL |
| app-body-photo-free-chrome | 120×180 | 96×96 | 96×96 | PASS | FAIL |

For example `photo-right` changes from 120×180 to 96×96 pixels with different decoded RGBA bytes. Frame `cx/cy` changes from `1224000` to `1224280` EMU, stroke from `14400` to `14760`, and `srcRect={8400,24400,11600,22267}` becomes `fillRect` encoding. The first imported rendering already reflects Writer's import behavior; exact subsequent screenshots cannot establish preservation of the original editable image. No photo changes are made in this bounded geometry handoff.

**Microsoft Word: UNVERIFIED.** No actual desktop Microsoft Word runtime is available. Stock Writer results are not attributed to a confirmed Word release.

## Actual validation and artifact links

- [CI run 38697641018](https://github.com/modebrecht/cv-cover-charm/actions/runs/38697641018) / [app-body-content job 116297890577](https://github.com/modebrecht/cv-cover-charm/actions/runs/38697641018/job/116297890577): setup, unchanged generation, content and complete geometry collection PASS; final strict `require_stable()` assertion **FAIL** with `Exact Save/Reopen geometry is not stable`. This is the intended truthful gate result, not a successful production CI claim.
- [Official artifact 11954963277](https://github.com/modebrecht/cv-cover-charm/actions/runs/38697641018/artifacts/11954963277): 6,111,529 bytes; ZIP SHA-256 `908148683752b175eb162d05268c4c639fa836d6e05045a9754a7bb719852d3b`, independently downloaded and verified. Contains all 22 fixtures, 66 DOCX states, 66 PDFs, native/geometry/content reports and runtime/binding records. Expires 14 November 2026.
- [Compact permanent evidence](docx-next-sidebar-geometry-gate-15okt-evidence.json): complete source/save1/save2 table, all hash bindings, exact declared bounds, native public grids, nested tables, photo/crop metadata and original same-input live target records.
- Fresh independent local run: both original harnesses complete; all 22 source bytes, 66 serialized/native geometry/ancestry states, 44 comparison results and supplemental integrity measurements reproduce CI. Each execution renders 564 PDF pages. The existing normal acceptance scripts are unchanged.
- Targeted Bun tests: **11 passed, 0 failed, 715 assertions** (`sidebar-body`, `first-footer`, `table-grid`). Python harness self-tests: **7 passed** for body and **8 passed** for save geometry. Supplemental read-only audit executed independently against both complete matrices; outputs identical.

Reproduce with a fresh established stock runtime/binding and unchanged repository fixtures:

```sh
mkdir -p "$QA_ROOT/fixtures"
python scripts/docx-next-fixture-images.py "$QA_ROOT/fixtures/images.json"
bun scripts/docx-next-sidebar-body-probe.ts "$QA_ROOT/fixtures"
python scripts/docx-next-sidebar-body-qa.py "$QA_ROOT/fixtures" --engine "$QA_ROOT/setup/runtime" --binding "$QA_ROOT/uno-binding"
python scripts/docx-next-sidebar-save-geometry-qa.py "$QA_ROOT/fixtures" --engine "$QA_ROOT/setup/runtime" --binding "$QA_ROOT/uno-binding" --require-stable
# The preceding command fails after retaining the complete 22-case report.
python scripts/docx-next-sidebar-geometry-integrity-qa.py . "$QA_ROOT/fixtures" "$QA_ROOT/integrity-report.json"
```

Local setup first rejected four archive hashes rather than accepting different bytes. Direct downloads of the original snapshot URLs then matched all pinned hashes. The isolated package paths required the setup's existing four symlink relocations to be reapplied; no packaged binary changed. The initial unavailable Playwright runtime was replaced by the workflow's pinned 1.55.0 browser. These provisioning failures are not counted as geometry failures; the separate untouched GitHub runner reproduced all final measurements.

## Code delta, branch safety and next route

No application/model/renderer, existing fixture, assertion, native binary, PDF/print or legacy DOCX code changes. Changes are limited to this report/evidence, a read-only supplemental integrity collector, the isolated branch's access to the existing `app-body-content` workflow, and its explicit strict terminal assertion. Other jobs retain their original branch conditions. The evidence-only follow-up commit uses `[skip ci]`; the original native execution is the explicitly linked `5c40e60b…` checkpoint. The added collector was verified locally against both complete artifact sets.

Vercel project `cv-cover-charm` (`prj_Ip4lHR688tFQ4QZXCrOZ4OfXo6Im`, team `team_bgCMPzd6v634brLp9mvGrngl`) was inspected before publishing the checkpoint. Existing `vercel.json` declares `"*": false` and `"main": true`; this branch also receives an explicit `false` entry before its first remote publication. Branch-filtered Vercel deployment queries before/after publication return zero deployments. No Vercel project-wide setting, merge, deployment or promotion was performed. `dev` remains `8901a830…`; `main` and `render` are untouched.

**Decision: retain the native Sidebar production gate.** The success condition is not met: none of the four mirrored failures was eliminated, and original photo asset/crop editability is not accepted. Partial content acceptance must not promote `body-stories`.

The next technically justified route is an **actual desktop Word version-specific run on this immutable official fixture packet**, checking source/save1/save2 content, complete owner ancestry, exact geometry and photo assets/crop. A Word-only support decision would still need explicit product acceptance and must not imply Writer support. For stock Writer support, an independently released upstream/distributor correction needs the same complete matrix and separate photo-identity/crop acceptance. A separately provisioned native source build would require a new task; do not repeat it or continue application workaround experiments under this handoff. This bounded decision gate stops here.
