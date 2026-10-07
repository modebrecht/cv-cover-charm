# Sidebar attachment — pinned stable engine comparison

Starting remote `dev`: **`d70f0482c348dfe3a04aae7fff2671fac035fb58`**, freshly fetched and matched to a clean checkout. This follows the [cell-ending early stop](sidebar-cell-ending-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Result

**Stable LibreOffice 25.8.7.3 reproduces all 36 development-engine controls without a measured difference.** The exact same source packages produce the same dossier page counts, opening-field pages and metadata X positions/glyph widths before and after save/reopen. Every complete native field remains in source/saved DOCX and in its PDF lane. The available development engine alone therefore does not explain the failure. The precise LibreOffice implementation cause and Microsoft Word behavior remain unverified.

| Matrix           | Controls / dossier pages | Stable attached / negative openings | Changed cases versus development |
| ---------------- | ------------------------ | ----------------------------------- | -------------------------------- |
| Cell endings     | 12 / 120                 | 2 / 10                              | 0                                |
| Native ownership | 24 / 240                 | 14 / 10                             | 0                                |
| Total            | 36 / 360                 | 16 / 20                             | 0                                |

The six ownership boundaries retain the original finding: single-column table/body controls attach all five opening fields, whereas the three-column grid and unmerged grid can split metadata and description. The twelve cell-ending controls retain the 234 mm regression when idle/all endings are attached. These are product counterexamples. A green measurement workflow does not turn them into accepted Sidebar behavior. Three representative stable PNGs were inspected: detached description at grid 220 mm, isolated heading at shared-attached 234 mm, and the attached native-body 220 mm control.

## Reproducible runtime and evidence

The new **DOCX Next Stable Sidebar** workflow runs only on `dev`, with a five-minute runtime setup cap, five-minute conversion cap and twelve-minute job cap. It downloads the existing **50 exact Ubuntu package versions**, verifies their recorded SHA-256 and package metadata, and extracts them into an isolated LibreOfficeKit runtime. The manifest uses the immutable Ubuntu snapshot `20260828T000000Z`. The existing public-API adapter and setup are reused; no Word package is repaired after export.

The runtime reports **LibreOffice 25.8.7.3, `580(Build:3)`**. Twelve upstream Liberation 2.1.5 TTF assets are individually hash-verified against the earlier full font inventory. This narrower CI inventory is explicit; it does not claim equality of every cover/letter fallback font. The compared CV metadata glyph metrics match the development evidence. The original setup's full 128-font inventory remains its default.

Both QA scripts now support `--observe`. Their original strict baseline expectations remain active by default. Observation records actual page counts/opening positions, while package structure, complete canonical field data, owning-lane full text/bounds, matching geometry and save/reopen invariants remain mandatory. The comparison rejects changed candidate package hashes, missing/duplicate controls and text loss; it records page/geometry differences without enabling export.

Raw measurements were retrieved from [run 37562139049](https://github.com/modebrecht/cv-cover-charm/actions/runs/37562139049), source **`6d58a946a950285c235e85576a7ca3d7f7849980`**. All 36 engine gates passed; the run subsequently failed in the summary reader because the older ownership checkpoint nests its case report under `diagnostics`. The corrected reader handles both actual checkpoint schemas, has a dedicated regression test, and recomputes **zero differences** from the verified artifact. Publication CI reruns the corrected complete workflow. [Machine evidence](sidebar-stable-evidence.json) retains the runtime record, artifact digest, per-case comparison and limits independent of artifact expiration.

## Validation and scope

- **36 stable controls / 360 pages:** package integrity, complete field IDs/text, native PDF lane/bounds, geometry and DOCX save/reopen pass. All 36 candidate hashes match the committed development baselines. Twenty negative openings remain explicit blockers.
- **36 freshly rendered development controls / 360 pages:** the modified observation pipeline and corrected summary reader reproduce the old evidence with zero changes.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes; every source package is byte-identical to the starting block under the same explicit Pillow adapter.
- **31 immutable Sidebar model JSON roundtrips**, mirrored-picture rejection and **two actual portable project/photo restorations** pass. Both diagnostic generators also verify immutable model JSON package roundtrips.
- Seven evidence-comparison regressions, seven existing Python flow tests, Python compilation, formatting and whitespace checks pass. Locked 1,000 Bun units/TypeScript/lint/build and all eight browser/PDF/dossier groups are supplied by commit-specific publication CI and reported separately.

No application model, Word renderer, template descriptor or registration changes. All unaccepted frame/floating/cell-ending contracts and picture/span guards remain active. Production DOCX, Legacy, `main`, `render`, deployments and bulk template migration remain outside this block.

## Reproduce

```sh
python scripts/docx-next-stable-sidebar-test.py
python scripts/docx-next-stable-sidebar-setup.py /tmp/docx-next-stable/setup
bun scripts/docx-next-cell-ending-probe.ts /tmp/docx-next-stable/cell-ending
bun scripts/docx-next-body-attachment-probe.ts /tmp/docx-next-stable/body
python scripts/docx-next-cell-ending-qa.py /tmp/docx-next-stable/cell-ending --libreofficekit /tmp/docx-next-stable/setup/runtime/lo-kit --require-stable --observe
python scripts/docx-next-body-attachment-qa.py /tmp/docx-next-stable/body --libreofficekit /tmp/docx-next-stable/setup/runtime/lo-kit --require-stable --observe
python scripts/docx-next-stable-sidebar-compare.py /tmp/docx-next-stable
```

Setup requires Ubuntu 24.04 amd64, archive-keyring/apt/dpkg-deb, C compiler and network access. CI retains source/saved DOCX, PDFs, selected PNGs, manifests, runtime record and summaries for 30 days, including failed runs. Changed results always require acceptance review.

## Exact next task

Test **selective attachment of a short opening metadata row to a separate flowing tail row at the outer native track table**. Reuse the existing table/cell-ending diagnostic primitives and declare the semantic opening boundary explicitly. Attach only the opening row's required cell endings; explicitly detach the preceding lead row and the oversized tail row. Keep the heading/date/title/place/description paragraphs, IDs, runs, native paragraph flags and physical text lane unchanged. The complete description stays one splittable paragraph. This differs from the failed all-rows policy and earlier nested two-row attempt; it is an unproven row-ownership hypothesis, not a promised fix. Start with the six matched boundaries on both engines and stop early if text or attachment regresses. Only a successful small proof justifies populated long-both/photo/span expansion. No template-specific renderer or migration.
