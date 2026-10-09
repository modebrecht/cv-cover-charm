# Final graphics template run — 2026-10-08

This dedicated branch ends at **38/39 active templates configured, 0/39 Microsoft Word accepted**. **Neon and Verlauf are completed candidates. Aurora remains stopped** because its actual long-title rendering loses visible text.

Branch: `docx-next/template-graphics-final-20261008`. Authoritative fetched base: `d6f044aec1e15e911b3d74009ef2ce8734100a8e`. Before publication, remote `dev` had advanced to `d78986a01a7f9964557d7facf004676928a534a7`; this branch was not rebased, merged or moved onto it. Only the dedicated branch is published. No deployment or protected-branch update is included.

## Scope and inventory

Fresh `dev` still had 29 configured active templates. The seven previously completed migrations were cherry-picked unchanged onto this new base: Edel Dark, Studio, Studio 2, Edge, Gallery, Kolumne and Citrus. The remaining IDs were **neon, verlauf, aurora**. The active picker has 39 entries; retired Warm 4/5 are excluded.

The user's follow-up “DO IT” authorized the bounded shared graphics capability needed to continue these remaining assessments. Its changes are explicitly isolated in a separate commit. No Sidebar, main-story pagination/section planning, native identity, picture/crop, XML repair, production routing, Legacy/V2, PDF or portable JSON architecture was changed. No template-ID condition was added to rendering/model/layout architecture.

## Completed candidates

**Neon:** authored dark paper, all three translucent gradient bubbles and the separator survive in source and saved native covers. Letter/CV backgrounds retain dark radial blooms around a light rounded card. Radial canvas fades approximate the app's blurred blooms; this is a declared candidate adaptation, not approved pixel parity. Semantic fields use shared editable rows and CV compositions. Saved photo frames, colors, explicit field styles and background visibility retain precedence.

**Verlauf:** the full-page gradient, both soft circles and the separator remain visible. Letter/CV use the existing palette and a rounded light card. The cover and its continuation pages retain the gradient with editable centered content and shared native contact rows. Native badges retain their existing rectangular editable shading.

The new **opt-in composite page paint** turns only decorative geometry into one behind-text raster asset per first/default header story. Semantic text and photos remain native and independent. The model keeps each original shape and its declared order/scope; the raster adapter clips the composed asset to the page. Missing required composed paint fails export explicitly. Existing standalone assets/serialization remain unchanged. A4 composition uses the existing 8 px/mm scale with a 2400-pixel ceiling, preserving submillimeter separators; it does not expand any semantic photo/crop contract.

## Fresh evidence

| Candidate                | Fixtures | Source pages | Saved pages | Matching semantic fields |
| ------------------------ | -------: | -----------: | ----------: | -----------------------: |
| Neon                     |       16 |          112 |         112 |            1,797 / 1,797 |
| Verlauf                  |       16 |          111 |         111 |            1,781 / 1,781 |
| **Completed total**      |   **32** |      **223** |     **223** |        **3,578 / 3,578** |
| Aurora stopped prototype |       17 |          116 |         116 |            1,869 / 1,869 |

The official stable LibreOfficeKit **25.8.7.3 580(Build:3)** runs with all 50 verified pinned packages and the full pinned font manifest. Existing package/XML/relationship, semantic text, entry/image bounds, pagination, chrome, native Save/Reopen and independent analytic paint checks pass for both completed candidates. Fixtures include cover/letter/CV, long letter/CV/values, long covers/names/contacts, photos/images, custom native text/tables, compact/off/different-first chrome, Classic/Timeline/Magazin, background visibility and custom palettes. Experimental Sidebar gates were not expanded.

All 32 completed cases restore immutable input/model JSON and regenerate identical native packages. Each set exercises six real canonical browser image normalizations. Both actual editors pass rename/reload, portable save/load, independent native snapshot/export and the actual combined production PDF download (three pages each).

**Regression:** all 36 preceding descriptors and 180 stress models match exactly. All 36 normal DOCX packages regenerate byte-identically using the real canonical standalone raster assets. **1,057 complete isolated unit tests across 225 files** pass, including all 305 existing DOCX Next tests and the 12 new graphics tests. TypeScript, changed/new-file lint, release/changed formatting, production build and diff checks pass. The monolithic test command exits without a complete summary; the complete isolated-file run is authoritative.

The seven imported templates' larger 102-fixture run is historical evidence from the preceding branch, not a fresh render claim in this run. [Fresh ledger](template-graphics-final-evidence.json), [per-file unit results](template-graphics-unit-results.json), [completed native previews](template-graphics-previews/neon-source-cover.png), [Verlauf preview](template-graphics-previews/verlauf-source-cover.png).

## Aurora: genuine stopped visual requirement

The previous handoff overstated the app source requirement. The actual `CoverBackground.tsx` declares a **fixed 128-mm** rounded gradient hero. A prototype correctly reproduces that fixed geometry. It passes normal/photo/long-CV/long-letter native checks, and all 17 tested packages preserve complete text and field tags.

However, five edited title lines wrap to ten native lines in the existing 118-mm hero lane. The final four white text spans extend below the gradient onto white paper (bottoms roughly **138–179 mm**). They are invisible in both source and saved renders, despite surviving text/package checks. Two independently recorded source/saved contrast failures block migration. No reduced stress input, dark-text/solid-fill substitution or semantic clipping is counted as success. The descriptor is archived only as a QA proposal and is absent from the production registry.

[Actual saved negative preview](template-graphics-previews/aurora-stopped-saved-title.png), [stopped proposal](template-proposals/aurora-fixed-hero-stopped.json). The extra template QA records this negative with `--observe`; its normal strict invocation fails. The earlier Aurora editor/PDF smoke is prototype evidence before the last chrome adjustment, not final migration acceptance.

Required reusable capability: **a gradient/rounded background that follows editable native hero content and defines continuation behavior**, or another explicitly approved visual adaptation. Aurora directly needs this contract; gradient hero/card families could reuse it. No major flowing-gradient primitive was implemented here. The next template batch is **Aurora only after that shared contract is supplied by the architecture track**.

All 49 native saves still lose table captions. Full native identity and Microsoft Word acceptance remain blocked; no repair or acceptance-gate change is included. Dedicated-branch CI is not claimed green. Existing workflow filters target the development/release branches.

## Cherry-pick commits

Apply onto a freshly fetched development branch, reviewing concurrent registry/fixture changes there. The first nine commits consolidate the preceding seven-template branch; skip only changes already present on the destination. The optional rubric default is the previously published dependency, not a separate template task. Code/QA tree hashes and local-to-published mappings are recorded in [the commit ledger](template-graphics-commits.json).

| Published commit                           | Change                                                              |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `098597a33a6c5619ef0fadf9a9840cb617fe87cc` | configure Edel Dark with shared native composition                  |
| `4e5812ae8c696412476bf78324d027486ccc64a3` | configure Studio family with existing native primitives             |
| `723cee9c125af1a9b5b3f5b4d8412e7262f9736e` | configure Edge and Gallery editorial templates                      |
| `398a06767d6364673f32c464f7ccb0afb35f0bc3` | assess Kolumne with existing native contact surfaces                |
| `e0b6fce53296072e81b0f10e4ec71cb12a4638bb` | allow declarative editable heading badge defaults                   |
| `d6d7f84a4ed1079bec1d6ff4b9cea86efdb029b8` | configure Kolumne with an editable native contact column            |
| `7ce4979ddc11db6016cdb1899b0443c872683219` | configure Citrus with existing gradient contours and native rubrics |
| `a9b39685d4818f65993dd00c824e87603d17075c` | record final template inventory and stable migration evidence       |
| `d263d8db0371b5d5092f1710d6c0278a95179a1e` | hand off the three remaining generic template requirements          |
| `00d2f76aa77335493a596583eda700c9ff1cb7ee` | compose opt-in nonsemantic page paint into one asset                |
| `bfe807e22db3b6b9e99e1768b42218884041b17d` | configure Neon and Verlauf with composed page paint                 |
| `d8a340da9f445d93b9e29a43bed212589c07ff8f` | retain Aurora fixed-hero contrast counterexample                    |

The subsequent evidence/documentation commit is the published branch tip. This run stops after publication; it does not merge or begin another batch.

## Reproduce

```sh
python scripts/docx-next-fixture-images.py "$QA_ROOT/images.json"
bun scripts/docx-next-fixtures.ts "$QA_ROOT" --neon --verify-json
python scripts/docx-next-render-qa.py "$QA_ROOT" --libreofficekit "$LO_KIT" --require-stable --roundtrip
python scripts/docx-next-native-identity-qa.py "$QA_ROOT"
DOCX_NEXT_EDITOR_TEMPLATE=neon bun scripts/docx-next-candidate-editor-qa.ts "$EDITOR_ROOT" "$QA_ROOT/images.json"
```

Use `--verlauf` in its own directory for the second completed candidate. To reproduce the **stopped** Aurora assessment, use `scripts/docx-next-template-proposal-fixtures.ts OUTPUT docs/docx-next/template-proposals/aurora-fixed-hero-stopped.json`, then the existing native QA and `python scripts/docx-next-final-graphics-qa.py OUTPUT --observe`. Use the pinned stable runtime/full fonts and `DOCX_NEXT_CHROMIUM_PATH` for the canonical browser.
