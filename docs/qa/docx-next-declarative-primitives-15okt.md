# DOCX Next Package 13 — Shared Declarative Design Primitives

## Decision

**Item 13: PASS — NO CODE CHANGE REQUIRED for production. Local verification and remote CI both succeed.**

The current primitives are sufficient for the 39 configured templates. No new primitive,
template engine, renderer, schema version or template-specific repair is justified by this
bounded audit. Changes comprise a reproducible audit harness, its machine evidence, this
report, existing CI registration and an explicit feature-branch deployment prohibition.

This is Item **13** of the canonical **36-item Masterliste 11OKT**. Its numbering and other
item definitions are unchanged. This verdict is not Sidebar, desktop Word or product-release
acceptance. Work stops here for senior review.

## Provenance and pre-change checks

- Authoritative remote `dev`, fetched before changes: `8901a830a792d75e9e792345c5180827218b4e1e`.
- Clean checkout; root `AGENTS.md` read. No subordinate `AGENTS.md` exists in this checkout.
- Working branch: `fix/docx-next-declarative-primitives-15okt`, based directly on that SHA.
- Live open-PR search: none. Remote branch inventory and primitive-name search found no existing
  Item 13 branch; the requested branch did not exist. No other worker was started.
- Item 11 is present through [merged PR #182](https://github.com/modebrecht/cv-cover-charm/pull/182),
  merge `5301dff892c741fe9fcb460a637a874673b89b40`; its
  [acceptance report](docx-next-model-gate-15okt.md) records the model/renderer gate and
  [successful CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/38629873048).
- Item 12 is present through [merged PR #184](https://github.com/modebrecht/cv-cover-charm/pull/184),
  at the fetched `dev` HEAD; its [acceptance report](docx-next-pdf-print-boundary-15okt.md)
  and [dedicated CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/38636695750)
  establish the runtime independence gate.
- On that exact merged `dev`, [Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/38666878136),
  [Web Gallery](https://github.com/modebrecht/cv-cover-charm/actions/runs/38666878274) and
  [Contact Integrity](https://github.com/modebrecht/cv-cover-charm/actions/runs/38666878195) succeed.
  The separate [Sidebar workflow](https://github.com/modebrecht/cv-cover-charm/actions/runs/38666878073)
  fails at its known sampler investigation. It was not rerun, diagnosed or modified here.

The linked Vercel project was read: `cv-cover-charm`, project
`prj_Ip4lHR688tFQ4QZXCrOZ4OfXo6Im`, account `team_bgCMPzd6v634brLp9mvGrngl`.
The project read does not expose its full Git integration settings. The effective repository
deployment control is therefore checked directly: `vercel.json` already contains `"*": false`
and only `main` enabled; this branch adds its exact name with `false` as a further explicit
prohibition. [Vercel's Git configuration contract](https://vercel.com/docs/project-configuration/git-configuration)
defines this setting as disabling automatic deployments for that branch. No deployment API,
deploy hook, production branch or export availability switch is used. The selected Actions
workflow only checks, builds and uploads QA artifacts; it does not deploy or build a native engine.

## Existing-primitives inventory

All requested source files were audited. The complete per-template inventory is in
[machine evidence](docx-next-declarative-primitives-15okt-evidence.json).

| Existing typed contract / source                                                                  | Authored meaning and generic implementation                                                                                     | Actual reuse / defaults and limits                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TemplateMotif`, `templates.ts`; `template-motifs.ts`                                             | Page-width-relative X/width, physical top/height, rectangle/circle/bounded path, fill/stroke, optional first/continuation scope | 37 templates have motifs. Missing height follows the caller's band, otherwise zero and invalid geometry is rejected. Opacity defaults to 1; repeat defaults to first in direct conversion. Color slots use the existing normalized fallback.                                                                                         |
| `cornerRadiiMm`, `DecorativeShape`; `decoration.ts`                                               | Independent clockwise rectangle corners; outlines retain transparent centers                                                    | 18 templates declare corners; five declare motif outlines. Cove/Glow/Horizon/Studio 3 reuse the corner schema; Orbit/Klassisch/Edel/Pastell/Edel Dark reuse outlines. Invalid corners or unsupported shape/corner combinations fail validation.                                                                                      |
| `endSlot`, `gradientStops`, `radialFade`; `decoration.ts`, `artwork.ts`                           | Nonsemantic linear paint, ordered multi-stop ramps and color-to-transparency blooms                                             | Nine templates declare two-color motif gradients, three declare multi-stop motifs, seven radial fades. Glow/Horizon, Verlauf 2/3 and Neon are existing consumers. Shape gradients default to 135 degrees; solid/vertical `DecorativeArtwork` has its own compact deterministic PNG service. Ambiguous or invalid ramps are rejected. |
| `pageMotifs`, `paintLayer`, `pagePaintOrder`, `pagePaintComposition`; `page-artwork.ts`           | Story-scoped page paint, explicit stacking, clipping and optional decorative composition                                        | Ten templates declare motif layers; Neon/Verlauf/Aurora use single-asset composition. No text or semantic photo enters composite paint. Absent ordering preserves existing serialization; absent repeat applies to both stories at page-paint selection. Mixed explicit/implicit motif layers fail.                                  |
| `TemplateDefinition.cover.rows`, semantic fields, `flowingRules`; `cover-composition.ts`          | Group named fields into growing native cells; retain stable IDs, readable surfaces and native separator rules                   | 38 templates have rows. Seriös/Pastell use flowing rules. Width weights and optional cell fills are data; explicit user style/visibility has precedence. Solid growing surfaces are guarded against unsupported gradient/rounded containers.                                                                                         |
| `fieldSpaceBeforeMm`, hero leads and field alignments; `cover-composition.ts`, `layouts.ts`       | Named semantic spacing/alignment in native flow, independent of browser measurement                                             | 16 templates declare per-field leads. No generic absolute text-positioning engine is introduced. Missing field lead retains current hero/default spacing. Existing conservative text reservation is shared native policy.                                                                                                            |
| `chrome.band`, `compactMasthead`, `keepTailTogether`; `template-composition.ts`, `build-model.ts` | First/default contact stories, optional quiet header-off paint, native sender/tail flow                                         | 38 templates have band configuration. The masthead's one configured consumer is Warm; that fact is not misrepresented as multi-template reuse. Existing custom header surfaces and saved chrome choices remain authoritative. No template-ID dispatch.                                                                               |
| `TextStyle`, semantic run/paragraph IDs; `elements.ts`, `styles.ts`, `colors.ts`                  | Editable native font, size, underline, emphasis, capitalization, tracking, shading and composited opaque text color             | Shared Cover/custom CV text mapping, Letter/CV run resolution and native style/font tables. Literal authored colors and canonical field overrides retain precedence. No text-shadow rasterization or new named-style system.                                                                                                         |
| `CV_FLOW_LAYOUTS`, `datedEntryBlocks`; `layouts.ts`, `build-model.ts`                             | Existing layout configuration independently supplies native gaps/date rails                                                     | Classic/Minimal/Timeline/Editorial are exercised for every template. The Sidebar entry and its algorithms are untouched and not newly accepted.                                                                                                                                                                                      |
| `model.ts`, `validation.ts`; `template-slots.ts`                                                  | Portable typed semantic model, real model/package checks, pure palette metadata                                                 | Existing version 1, exactly 39 IDs, copied palette slots, font/color policy and native relationship ownership are retained. No UI/CSS registration prerequisite is added.                                                                                                                                                            |

Counts describe descriptor usage, not Word acceptance or the number of visible shapes after
applying saved settings. In particular, Warm's declarative circle list is a separate existing
right-edge placement policy; it feeds the same decorative shape model without new rendering logic.

## Repetition analysis and architecture decision

Two possible reductions were evaluated; **zero new primitives were selected**.

1. **Motif presets / factories:** repeated rectangle/circle/path literals occur across Cover,
   Letter and CV. They already use the same typed `TemplateMotif` and generic converter, paint
   adapter, clipping and story ownership. Sizes, slots, repeat scopes and corners encode each
   authored design. A `corner()`, `gradient()` or new anchor DSL would wrap existing data rather
   than remove duplicated rendering behavior. It would add default/override precedence and
   migration obligations without an identified correctness defect. Retain the existing schema.
2. **Common stationery / Letter policy defaults:** 37 descriptors currently have identical
   `letter` policy objects (all except Brief and Warm). Many descriptors also repeat Letter/CV
   page motif arrays. This is declarative value repetition, not 37 implementations of the
   Letter algorithm. Hoisting shared mutable objects or adding inherited presets would make
   local design intent and future overrides less explicit. The shared composition already
   executes once. No demonstrated maintenance defect justifies this refactor now.

Existing schemas meet the suggested corner, edge, rule, gradient, background, spacing, chrome,
text-decoration and motif-positioning needs of the configured designs. This does not promise
that arbitrary future designs need no new primitive. A future extension still requires two
concrete consumers, clear typed semantics, saved-state precedence and independent regression proof.

There is **no saved-configuration migration**: source data, template identifiers, optional
defaults, canonical model version, fonts, palettes, field IDs and single Word renderer are
unchanged. No proposed new schema or fallback is needed because no primitive is introduced.

## Before/after compatibility proof

`scripts/docx-next-primitives-audit.ts` imports the actual selected worktree modules. It uses
existing `graphicCandidateFixture` data and the production `rasterizeDecoration` bundled into
a real Chromium canvas. It does not imitate the painter or create an alternative document renderer.

- Two independent processes run against the fetched base in a detached worktree and this candidate.
- Each process checks **39 templates × four existing CV layouts = 156 cases**: Classic, Minimal,
  Timeline and Editorial. Each case includes Cover, Letter, CV and authored semantic image input.
- Frozen source, independently cloned source and JSON-restored source must build equal models;
  the source stays unchanged. The real model validator runs. Both the frozen model and frozen
  JSON-restored model generate actual validated DOCX packages; their SHA-256 values must match.
- **312 package generations per worktree, 624 total**, pass. The two complete comparison
  manifests are byte-identical: all 156 model hashes, 156 package hashes, descriptor inventory
  and **164 actual decorative PNG hashes/geometries** agree. The committed evidence adds only
  provenance to that comparison manifest.
- Semantic-image normalization is an explicit deterministic PNG adapter. This checks native
  package ownership/framing paths, not browser decoding fidelity or original-photo preservation
  after an application's save. Existing image/semantic/package negative controls remain in the suites.
- Relevant native geometry, colors, type, spacing, chrome and paint goldens pass in the unchanged
  template/unit suites. Exact package and asset equality proves unchanged candidate output for
  the compared inputs; no new desktop render or universal pixel-parity claim is made.

No production file under `src/`, existing test, fixture, dependency or lockfile differs from
the fetched base. This is stronger than merely approving new screenshots. A new Word-oriented
gallery approval is unnecessary when its inputs and output packages are byte-identical.

## Verification results

Local tooling: Bun **1.4.3**, Node **24.19.0**, pinned Playwright **1.55.0**, Chromium
**140.0.7339.16**. Locked application dependencies are restored after installing the test runner.

| Check                                                                  | Actual result                                                     |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `bun run test:docx-next`                                               | **359 PASS, 0 FAIL; 55 files; 5,720 assertions**                  |
| `bun test tests/unit`                                                  | **1,172 PASS, 0 FAIL; 245 files; 22,801 assertions**              |
| Model/portable/real-paint parity harness, each worktree                | **156 cases, 312 packages, 164 decorative assets PASS**           |
| Base versus candidate complete manifest comparison                     | **Byte-identical**                                                |
| Existing browser chrome-content and saved-state roundtrip integrations | **3 PASS, 0 FAIL**, 28.6 seconds                                  |
| `bun run typecheck`                                                    | PASS                                                              |
| `bun run lint`; new harness lint                                       | PASS; **0 errors, 21 inherited warnings** in unchanged components |
| `bun run format:check:release`; changed-file Prettier                  | PASS                                                              |
| `bun run format:check` (repository-wide source/tests)                  | **FAIL: 151 pre-existing files**; all are byte-identical to base  |
| `bun run build`                                                        | PASS; inherited inlineDynamicImports/codeSplitting build warning  |
| `git diff --check`                                                     | PASS                                                              |

The global formatting failure is reported rather than hidden or repaired through unrelated
formatting churn. It does not constitute a candidate regression: none of that command's source
or test inputs changed. The repository's explicit applicable release-format gate succeeds.
Browser assertions pass despite an existing Letter SSR hydration warning, also observed in
Item 12. This package does not claim to repair it.

The existing focused workflow registers this branch. It runs the dedicated DOCX and complete
unit suites, runtime-boundary negative controls, typecheck, lint, release/changed formatting,
production build, the three existing browser integrations and the exact base/candidate parity
comparison. Documentation-only result updates do not trigger another run.

**Remote CI: SUCCESS.** [Run 38707821118](https://github.com/modebrecht/cv-cover-charm/actions/runs/38707821118)
verifies execution commit **`31e6f3f18af59aaf5fea2c71fbe18b022df36af2`**.

- [Model/runtime job 116331508082](https://github.com/modebrecht/cv-cover-charm/actions/runs/38707821118/job/116331508082):
  SUCCESS; 359 DOCX tests / 5,720 assertions and 1,172 complete unit tests / 22,801 assertions,
  followed by typecheck, lint, release/changed formatting and build.
- [Browser/parity job 116331986105](https://github.com/modebrecht/cv-cover-charm/actions/runs/38707821118/job/116331986105):
  SUCCESS; three integrations pass in 22.2 seconds. Base and candidate each produce
  156 cases, 312 packages and 164 real decorative assets, followed by successful exact `cmp`.
- The subsequent report-only commit records this completed result. It changes no executable
  inputs; it does not claim that a separate run checked its own future commit SHA.

Exact changed files:

1. `scripts/docx-next-primitives-audit.ts` — read-only inventory and parity harness.
2. `docs/qa/docx-next-declarative-primitives-15okt-evidence.json` — measured local hashes and provenance.
3. `docs/qa/docx-next-declarative-primitives-15okt.md` — audit, decision and acceptance report.
4. `.github/workflows/docx-next-model-gate.yml` — bounded branch registration and parity check.
5. `vercel.json` — exact branch deployment prohibition.

After publication the Vercel branch deployment listing is empty. No merge, deployment,
export enablement or Sidebar workflow dispatch occurred. `src/` has the same tree object
`3dbd331089e2de798ec31d6ea6df152517ddde9c` on the base and execution commit.

## Architectural invariants and senior review

- **39 active templates / retired IDs:** unchanged registry; full existing registry and model matrix pass.
- **Template/layout/side orthogonality:** no runtime or descriptor edits; four supported layouts
  pass across all templates. Existing Sidebar unit guards execute as ordinary suite coverage;
  no geometry matrix, native sampler or acceptance experiment is started.
- **Editable native text / semantic fields:** existing canonical field/tag, rich-text, run-style
  and duplicate-identity negative tests pass; models and native package bytes are unchanged.
- **Images / decorations:** real model/package validation and existing relationship guards pass;
  canvas artwork is exclusively nonsemantic. No photo source/crop ownership algorithm changes.
- **Deep model ownership / JSON restoration:** existing Item 11/12 tests pass; the new harness
  independently freezes all compared source and model inputs and checks exact portable packages.
- **Model/renderer and PDF/Print boundary:** existing cold-process loader/global poisoning and
  compiler-aware graph guards pass. The harness's fixture factory may read existing historical
  snapshot helpers upstream; it is not imported by the production native pipeline.
- **No bypasses / abstractions:** no new template-ID branch, OOXML patch, semantic rasterization,
  PDF geometry conversion, second renderer, new primitive or runtime dependency.
- **Scope:** no `main`, `render` or remote `dev` update; no merge, deployment, export enablement,
  font-branch change, native binary/build, Sidebar composition or threshold change.

Senior diff review finds only verification/reporting and the explicit branch deployment guard.
No unrelated cleanup or product changes are required.

## Limits, Sidebar freeze and next item

Native Sidebar remains **frozen / NO-GO**, including Agent A's PopSdt/sampling investigation.
The prior separate result remains 22/22 semantic content, 18/22 exact geometry and four mirrored
failures. Original-image/editing-structure loss is established for **LibreOffice Writer**;
this must not be attributed to Microsoft Word without an actual test. Word acceptance is
**UNVERIFIED**. A later separately authorized Word triage may begin with the four problem
cases; final Sidebar acceptance still requires the full **22-case matrix**.

Recommended next candidate is **#14 — Stresstemplates und Grenzfälle prüfen**: first consolidate
existing non-Sidebar stress/long-content evidence and identify real gaps, rather than creating
more abstraction or restarting the frozen experiments. This recommendation is not execution.
No #14 work, product switchover or desktop Word acceptance is included in Item 13.
