# Sidebar selective outer-row attachment — bounded positive proof

Starting remote `dev`: **`5ee977c181220d6a14ed239668deb23b077142d6`**, freshly fetched and matched to a clean checkout. This follows the [stable engine comparison](sidebar-stable-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

The short native opening row can stay attached to the first line of its separately flowing description in the outer three-column table. All six matched boundaries pass in the local development engine, before and after save/reopen. Splitting the row alone improves five boundaries but still detaches the description at 220 mm; selective attachment fixes that remaining counterexample. This is a bounded ownership proof with an empty opposite track, not accepted general Sidebar pagination.

| Authored lead | Original grid | Split rows, detached endings | Split rows, attached opening endings |
| ------------- | ------------- | ---------------------------- | ------------------------------------ |
| 220 mm        | 1, 1, 1, 1, 2 | 1, 1, 1, 1, 2                | 2, 2, 2, 2, 2                        |
| 224 / 226 mm  | 1, 1, 1, 2, 2 | 2, 2, 2, 2, 2                | 2, 2, 2, 2, 2                        |
| 228 / 230 mm  | 1, 1, 2, 2, 2 | 2, 2, 2, 2, 2                | 2, 2, 2, 2, 2                        |
| 234 mm        | 2, 2, 2, 2, 2 | 2, 2, 2, 2, 2                | 2, 2, 2, 2, 2                        |

Tuples are the CV pages of heading/date/title/place/description opening. Every dossier still has ten pages: cover, letter and eight CV pages. The 18 controls total 180 pages, with twelve attached openings and six explicit negative controls. Complete native field IDs/text and all PDF text survive inside their original physical lane. Metadata X positions and glyph widths match across policies and save/reopen. The attached 220 mm opening PNG was inspected.

## Generic composition and gates

The diagnostic fixture declares four opening field IDs from the semantic model. It puts those exact paragraphs in a short outer row with native `cantSplit`; the complete description remains one original, splittable paragraph in the next outer row. Lead and tail cell endings explicitly detach; only the opening row's required empty cell endings attach. Existing vertical spans extend through the extra row without moving physical columns, insets or paint. No native paragraph property, run, ID, text order or typography changes.

This reuses existing native table/row and guarded `cellEndKeepNext` primitives. No new renderer primitive, application builder, template descriptor or registration is introduced. No template ID condition, text lookup, page-height policy, clipping, rasterized semantic text or package repair is used. Normal export and JSON-restored export still reject the diagnostic cell-ending contract. All other Sidebar guards remain active.

The shared QA script gains an explicit `--matrix selective-row` mode. The old twelve-case mode remains the default with its strict expected counterexamples. Both modes require exact case inventories, full native field data, native endings, complete PDF lane/body text, metadata geometry and save/reopen invariance. Selective mode also validates short-row ownership/`cantSplit`, one complete tail field and all six positive opening gates. Outcome changes require review.

The existing **dev-only pinned stable workflow** adds these 18 controls to its 36 unchanged controls. It runs the selective matrix strictly on verified LibreOffice 25.8.7.3, compares identical source hashes and actual measurements against [development evidence](sidebar-selective-row-evidence.json), and retains the source/saved packages, PDFs, PNGs and reports. The complete stable result and locked application/browser checks are reported from commit-specific publication CI separately. A green run proves these bounded gates; it does not enable normal export or establish Word behavior.

## Validation

- **18 controls / 180 pages:** fresh local package/render/save-reopen; all six selectively attached openings pass. Complete native semantic fields and immutable deterministic model JSON packages pass. Default export and JSON export guards pass.
- **31 existing supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen passes; all source DOCX packages are byte-identical to the starting checkpoint under the same explicit Pillow image adapter.
- **31 immutable Sidebar model roundtrips**, mirrored-picture rejection and **two actual portable project/photo restorations** pass.
- Seven existing flow tests, seven evidence-comparison tests, Python compilation and formatting/whitespace checks pass. Two new units protect explicit row ownership, unchanged semantic paragraphs, one complete tail field, export guards and deterministic packages; they join `test:docx-next` and publication CI.

Local engine: LibreOfficeDev 26.8.0.0.alpha0, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Stable runs through the existing hash-pinned CI runtime. Full locked Bun units, TypeScript/lint/build and the eight browser/PDF/dossier groups come from publication CI. Microsoft Word remains unverified. No deployment, branch promotion, production export switch or template migration.

## Reproduce

```sh
bun scripts/docx-next-selective-row-probe.ts /tmp/docx-next-selective-row
python scripts/docx-next-cell-ending-qa.py /tmp/docx-next-selective-row --matrix selective-row --soffice /path/to/soffice
# Or the verified stable runtime, retaining the strict gates:
python scripts/docx-next-cell-ending-qa.py /tmp/docx-next-selective-row --matrix selective-row --libreofficekit /path/to/lo-kit --require-stable
bun run test:docx-next
```

## Exact next task

Stress the **same selective outer-row ownership** with independently populated main/side tracks, beginning with long content in both tracks and both orientations. Declare the semantic opening boundary generically; preserve complete native fields and split only between semantic paragraphs. Establish how the extra short row interacts with an independently flowing opposite track before adding photo/span ordering and chrome. Stop on lost text, changed physical lane or detached opening. A successful small matrix justifies a reusable declarative composition contract and further photo/span coverage; it does not justify bulk migration. Keep all guards until the full acceptance gates pass.
