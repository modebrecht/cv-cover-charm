# Editable heading badge defaults — 2026-10-08

The template descriptor can now declare `cv.headingBadge: true`. This uses the existing editable native run shading for CV rubric headings. Saved `sectionTitlePill` values take precedence, followed by saved legacy `citrusRubricPill` values, then the descriptor default, then `false`. Explicit saved `false` stays off.

The user authorized continuing with the generic badge policy after the bounded Edge/Gallery template batch. This is a small extension beyond template configuration: one optional resolver argument, one descriptor property and one model-builder call. Native rendering, geometry, Sidebar, identity carriers, pictures, pagination and production routing are unchanged. Application/PDF callers retain their existing one-argument resolver behavior. No template-ID conditions were added.

Branch: `docx-next/heading-badges-20261008`. Fetched base dev: `9f4e286a7754ce084f5c9051034d7ad417c137a7`. Dev advanced concurrently to `b677051d`; the branch keeps its original base. Only this dedicated branch is published. The main architecture agent can continue independently. Cherry-pick the badge commits onto current dev when integrating; the single builder/resolver hunks are the only shared application changes.

## Result and limits

All 29 production descriptors on this base remain identical, and none opts into the new default. The count stays **29/39 configured, 0/39 Microsoft Word accepted** on this branch. The separate previously published template branches are not merged here.

The badge is a **rectangular text background**, without added padding or rounded corners. It preserves semantic editable heading text, font/color overrides and field IDs. This resolves the declarative default gap in the previous Citrus assessment. It does not configure Citrus or reproduce its rounded/padded application capsules.

Next bounded template task: configure Citrus using this native rectangular badge adaptation and the existing shared CV compositions, then run the established long-content/photo template matrix. If exact rounded/padded capsules are required, that needs a separate shared surface primitive decision on the architecture track. The other agent need not stop for the declarative Citrus work.

## Verification

[Machine-readable evidence](heading-badges-evidence.json) records source hashes, pinned runtime metadata and artifact hashes. [Native preview](heading-badges-preview.png) shows badge default on (left) and saved off (right).

- Full units: 1,012 pass, 0 fail; 18,000 assertions across 216 files.
- Existing DOCX Next suite: 305 pass, 0 fail; typecheck, changed-file ESLint/Prettier and production build pass. The three new badge tests run through the full unit suite.
- Base comparison: all 29 descriptors and 87 normal model cases (unset/off/on saved flags) identical; nine classic/timeline/editorial model/package comparisons byte-identical.
- Nine text-only native fixtures: classic, timeline and editorial, each with default-on/current saved-off/legacy saved-off. Cover, letter and CV render/package/text checks pass: 30 source pages and 30 reopened pages.
- Pinned stable LibreOfficeKit 25.8.7.3, 50 verified package archives and the full font set. Native Save/Reopen preserves all **480/480 tagged fields**, complete semantic text and shading choices on **42 editable rubric heading fields**.
- Immutable input, model and deterministic package restoration pass for all nine JSON fixture cases.

Existing table captions disappear in all nine native saved packages. The existing identity audit therefore remains failed for table identity and blocks architecture acceptance. This known result was recorded without investigating or repairing it. Microsoft Word remains pending; no export gate is enabled.

The new `--text-only` QA option requires zero expected images and zero actual native media. It skips only the unrelated synthetic image-normalization preflight; default image QA is unchanged. This bounded badge matrix has no photos, long-letter stress or full application browser/PDF export run. Those remain part of the subsequent actual template migration, not evidence claimed here.

## Reproduction

Use the repository's pinned stable LibreOfficeKit setup and full font set, then:

```sh
bun test tests/unit/docx-next-heading-badges.test.ts tests/unit/docx-next-layout-settings.test.ts
bun run test:unit
bun run test:docx-next
bun run typecheck
bun run build
bun scripts/docx-next-heading-badge-fixtures.ts /tmp/heading-badge-qa
python scripts/docx-next-render-qa.py /tmp/heading-badge-qa --libreofficekit /path/to/stable/lo-kit --require-stable --roundtrip --text-only
python scripts/docx-next-native-identity-qa.py /tmp/heading-badge-qa
python scripts/docx-next-heading-badge-qa.py /tmp/heading-badge-qa
```

The QA-only descriptor is inserted synchronously and removed before native rendering or asynchronous operations. It is never part of the application registry or export routing. The shading audit is fixture coverage, not a new engine diagnostic.
