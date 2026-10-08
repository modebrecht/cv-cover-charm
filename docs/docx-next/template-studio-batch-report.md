# Isolated Studio template batch — 2026-10-08

The dedicated branch `docx-next/template-batch-studio-20261008` starts from freshly fetched remote `dev` at `2d4b4d7896801ea47a3c726c8014c70897193606`. It configures **Studio and Studio 2**, bringing this branch from **29/39 to 31/39**. **Kolumne (`terracotta`) is stopped and remains unregistered.** Microsoft Word acceptance remains **0/39**. No production, Sidebar or photo gate is expanded.

The previous isolated Edel Dark branch is not part of this base. Cherry-picking that separate completed migration as well would bring the combined count to 32/39; this report does not claim it has reached `dev`.

## Inventory at the fetched base

Already configured: Brief, Freundlich, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe, Ledger, Ribbon, Sunrise, Forest Flow, Violet Pulse, Studio 3, Warm 2, Warm 3, Verlauf 2, Verlauf 3, Diagonal, Klassisch, Edel, Seriös, Colorful, Blockig, Welle, Modern, Pastell and Sonne. The registry has 29 entries. The picker has 39 active templates; hidden Warm 4/5 are excluded from the denominator.

| Remaining ID at base        | Family / feasibility assessment                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `studio2`                   | Studio split hero; shares Studio 3's native composition and chrome. Completed.                                                                                                                                  |
| `studio`                    | Strong cover column, yellow banner and quiet interior rails; existing native cover cells and page motifs. Completed.                                                                                            |
| `terracotta`                | Kolumne cover column and warm stationery. Existing ordinary and layered declarations fail visible continuation/foreground paint. Stopped.                                                                       |
| `edelDark`                  | Light/dark Edel pair. Existing generic descriptors suffice; completed on the previous separate branch.                                                                                                          |
| `edge`, `gallery`, `citrus` | Editorial/graphic surfaces, portrait arrangements and restrained stationery. Next batch candidates, subject to source-design and actual-render verification. No new primitive is established by this inventory. |
| `neon`, `verlauf`           | Gradient/backdrop family. Previous isolated proposals stopped on hidden foreground artwork; require reliable generic paint ordering.                                                                            |
| `aurora`                    | Gradient hero. Prior inventory identifies a growing gradient surface requirement; existing native flowing surfaces are solid. Defer to architecture track.                                                      |

After this batch, the registry still excludes `terracotta`, `edelDark`, `edge`, `gallery`, `citrus`, `neon`, `verlauf` and `aurora`.

## Source design and declarative mapping

Read `AGENTS.md`, the current checkpoint/handoff and the actual registry before implementation. Inspected the existing app/PDF layouts and background refinements in `src/components/cover/layouts-base.ts`, `layouts.ts`, `template-decorations.ts`, `fresh-template-registry.ts`, `CoverBackground.tsx`, `studio-rework.css`, `templatefix-27-28.css`, and the dossier/letter background and stationery refinements. The actual editor captures and downloaded production PDFs verify the current rendered source design rather than relying on old CSS experiments.

Studio 2 reuses Studio 3's editable native hero and contact/continuation chrome. Its descriptor declares a 96 mm navy hero, an 86 mm yellow counter-field at x=124 mm with a rounded lower-left corner, and a 58 mm signal panel on interior stationery. Native flow deliberately adapts absolute app positions; text is editable. Existing photo width, ratio and radius remain authoritative.

Studio uses one native cover row with photo/contact, an empty gutter and a profession/name/attachments lane. The authored 72 mm column, yellow banner, soft circle and footer stay authored decorations. Explicit field styles retain precedence. Palette-bound contact text stays light on the column. Native cover continuation motifs repeat the column; separate 20 mm interior rails and the 24 mm letter accent preserve the quieter stationery design. CVs use the existing shared compositions, including the supported timeline and editorial variants. Experimental Sidebar is not exercised or enabled.

Only descriptor/registry, template fixtures, template-oriented coverage and this standalone evidence/documentation change. All 29 previously configured descriptors are deep-equal to the fetched base. Renderer/model, planning/pagination, native identity, pictures/crop, XML/package repair, production routing, Legacy/V2, PDF/JSON architecture and active architecture handoff files are unchanged.

## Actual verification

| Candidate       | Fixtures | Dossier pages | Matching saved native fields |
| --------------- | -------: | ------------: | ---------------------------: |
| Studio 2        |       13 |            94 |                1,580 / 1,580 |
| Studio          |       15 |           107 |                1,695 / 1,695 |
| Total completed |       28 |           201 |                3,275 / 3,275 |

Each completed fixture passes package validation, complete semantic/native/PDF text, layout bounds, photo/media checks, stable LibreOffice **25.8.7.3 / LibreOfficeKit**, actual Save/Reopen and a second PDF. The 201 pages are rendered again after saving. Existing pixel-probe QA additionally verifies the Studio cover column on every continuation and Studio 2's navy/yellow split, including custom palettes. No QA engine checks are relaxed.

The fixture sets cover normal dossiers, long letter/CV, long values, photo/inline image, custom semantic rich text/tables, contact/compact/disabled headers, first/continuation chrome, timeline, editorial, background visibility and custom colors. Studio additionally has 60 long contact lines across four cover pages and 50 editable continuation lines across two cover pages. The initial pagination estimates were replaced with observed page counts: Studio continuation letter=9, long contact cover=4 and custom long cover=2. No pagination implementation changes occur.

Canonical browser normalization passes six image inputs per fixture build. All **28 portable input/model JSON restorations reproduce byte-identical DOCX packages**, with immutable source/model checks. For both candidates, actual editor rename/reload, portable JSON save/load, explicit Next snapshot and native candidate export pass. Each downloaded production combined PDF has three pages and the edited `Candidate Editor` CV text. App/PDF covers and representative native cover/interior/continuation pages were visually inspected.

The existing read-only native identity audit retains all 3,275 matching tagged fields and complete native text. **All 28 saved packages still lose table captions.** That known architecture requirement is explicitly failed; render success is not container/Word acceptance. No identity repair or crop/original-pixel investigation is undertaken.

Local checks: **1,018 full unit tests pass**, including nine new template tests; existing `test:docx-next` passes **305 tests**. Typecheck, build, changed-file ESLint, Prettier and `git diff --check` pass. All 13 unchanged Studio 3 DOCX packages match the published SHA-256 baseline exactly; its normal four-page dossier freshly passes stable render/Save-Reopen. Existing production/browser flow is checked for the two candidates; no claim is made that all eight repository browser groups ran locally.

Detailed ledgers: [Studio](studio-template-stress-evidence.json), [Studio 2](studio2-template-stress-evidence.json). Dedicated branch CI is not claimed accepted: the existing branch filters target `dev`; no workflow/deployment configuration changes are made.

## Kolumne stop

The ordinary declarative proposal passes the existing structural/text/Save-Reopen checks in 15 fixtures / 107 pages, but visual inspection reveals missing continuation column paint on opaque warm paper. The last contact page still contains semantic text, yet its light text becomes invisible. The long custom cover also loses its column on continuation. This is a visual failure even though the text audit is green.

A bounded second proposal uses only existing `pagePaintOrder: "layer"`, column layer 1 and edge layer 2. Fifteen sources are prepared; the three-case render subset stops on the first normal source because the existing thin-paint checker reports `missing thin paint cover.decor-accent-line on page 1`. No Save/Reopen or later render is claimed for this second proposal. The complete proposed descriptor is retained only as stopped evidence and is not registered.

Required generic capability: reliable authored foreground and repeating column paint above opaque paper in first/continuation native stories, preserving the column behind light editable text and the visible fine separator. The current declarations do not prove this requirement. Whether it needs a new primitive or a compatibility fix remains the architecture agent's decision; no engine cause is inferred. Kolumne, Neon and Verlauf could reuse a reliable generic paint-order capability. No workaround hides/removes the required artwork or accepts invisible text.

See [stopped evidence](kolumne-stopped-evidence.json), [proposal](kolumne-stopped-template.json), [invisible contact continuation](kolumne-stopped-contact-continuation.png) and [missing cover column](kolumne-stopped-cover-continuation.png). The independent stopped matrix is not counted among completed migrations.

## Publication and next bounded batch

Publish only the dedicated template branch. Do not merge, push to `dev`, modify `main`/`render`, rebase/rewrite published history or deploy. Another agent can cherry-pick the coherent descriptor/coverage commit followed by its evidence commit onto the then-current `dev`. The separately published Edel Dark migration stays independent.

Recommended next batch: inventory **Edge / Gallery / Citrus** from freshly fetched `dev`, select only those expressible with current primitives, and stop each failed visual requirement. Leave Kolumne and the gradient paint failures with the architecture track. This batch ends after publication.
