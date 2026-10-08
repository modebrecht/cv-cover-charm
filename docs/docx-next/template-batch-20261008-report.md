# Isolated template batch — 2026-10-08

Branch: `docx-next/template-batch-20261008`.
Authoritative base: freshly fetched remote `dev`, `67ff63a9000b91383579889eac6ceb85f2969d0f`; clean checkout; recent history `67ff63a9`, `e475e06d`, `59b5dcbc`. Base [M6 Release Candidate CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/37735869791) is successful. `AGENTS.md`, checkpoint, handoff and actual registry were read before implementation.

One batch is complete: **Edel Dark delivered; Neon and Verlauf stopped after failed visual verification; Aurora deferred.** Final registry on this branch is **30/39 configured, 0/39 Word accepted**. Do not treat another agent's concurrently advancing `dev` documentation as this branch's migration ledger. This report and template coverage are independent to minimize cherry-pick conflicts.

## Actual initial inventory

The runtime registry has 41 definitions, but the picker excludes `warm4` and `warm5`, leaving 39 active templates. At the base, 29 were configured:

`brief`, `freundlich`, `prism`, `human`, `orbit`, `cove`, `glow`, `horizon`, `monoLuxe`, `ledger`, `ribbon`, `sunrise`, `forestFlow`, `violetPulse`, `studio3`, `warm2`, `warm3`, `verlauf2`, `verlauf3`, `diagonal`, `klassisch`, `edel`, `serioes`, `colorful`, `blockig`, `welle`, `modern`, `pastell`, `sonne`.

| Initially unconfigured active template | Family / available primitives                                                                                            | Batch disposition                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `neon` — Neon                          | Dark cover, gradient ellipses; existing native text, photo rails, gradients and page motifs                              | Stopped: opaque underlay hides source foreground paint in actual stable output                                                         |
| `verlauf` — Verlauf                    | Full-page two-color gradient, soft circles, paper-card interiors; existing gradients, motif layers, native centered hero | Stopped: opaque gradient hides source circles and separator in actual stable output                                                    |
| `edelDark` — Edel Dark                 | Dark executive stationery; existing Edel composition and semantic `sheet` palette                                        | Completed candidate; 14/14 stress fixtures pass                                                                                        |
| `aurora` — Aurora                      | Rounded gradient hero; existing fixed page gradients and rounded geometry                                                | Deferred: exact growing gradient hero would require an additional shared flowing-gradient surface primitive                            |
| `citrus` — Citrus                      | Gradient surround and rounded light text card                                                                            | Existing gradient, rounded paint and solid native cell surfaces are possible starting points; foreground/card layering needs actual QA |
| `studio` — Studio                      | Dark side rail and signal banner                                                                                         | Candidate for existing decorative rails and growing solid native rows; no CV Sidebar gate implied                                      |
| `studio2` — Studio 2                   | Related dark/signal split                                                                                                | Same potential family as Studio; actual migration QA pending                                                                           |
| `terracotta` — Kolumne                 | Decorative side column and inset native text                                                                             | Related rail/column family; shared full-width CV composition remains the allowed starting point                                        |
| `edge` — Edge                          | Angular graphic hierarchy                                                                                                | Existing polygon paint, native hero and photo composition appear sufficient; actual QA pending                                         |
| `gallery` — Gallery                    | Portrait tower and editorial color field                                                                                 | Existing inline photo rails, native fields and solid surfaces appear sufficient; actual QA pending                                     |

Warm 4/5 are retired picker entries, not members of the ten active missing templates. Shared CV flow compositions continue to belong to the existing architecture; this branch adds no new composition or Sidebar support.

## Completed template and verification

[Edel Dark coverage](edel-dark-feature-coverage.md) and [hash ledger](edel-dark-stress-evidence.json) record the bounded result: 14 dossiers / 110 pages with stable native Save/Reopen, complete text, 1,653 retained tagged fields, immutable portable JSON/package restorations, photo-bearing editor smoke and actual combined production PDF. Existing table-caption loss is recorded without acceptance or investigation.

Final local verification: 1,014 full units, 305 existing targeted Next tests plus 5 new candidate tests, TypeScript, changed-file lint/format and production build. 41 prior candidate packages remain byte-identical; three prior normal candidates pass stable render/Save-Reopen. Existing workflows target dev/main/render and do not automatically run for this dedicated branch; branch CI is not claimed green.

## Stopped templates: preserve the real visual requirements

App/PDF source reviewed: `layouts-base.ts`, `template-decorations.ts`, `CoverBackground.tsx`, `DossierSheetBackground.tsx`, the existing palette functions and the generated browser/PDF covers. Neon requires visible gradient bubbles on dark paper; Verlauf requires visible soft circles and a translucent separator over its full-page gradient.

Bounded declarative proposals used only current primitives. Stable normal dossiers retained editable text and package geometry, and actual editor/JSON/combined-PDF smokes passed. Nevertheless, **the foreground decoration pixels are absent in the native rendered covers**. A declared-layer proposal failed the existing thin-line pixel check. A later ordinary paint-order proposal could pass the existing structural/text/geometry checks while still failing visual review. That structural pass is explicitly insufficient and is not migration evidence.

The proposals were removed from `NEXT_TEMPLATES`; neither template is counted as configured or completed. No accepted descriptor hides the required decoration to make QA green. Two normal source dossiers / eight pages and their native saved PDFs were examined; no further stress matrix or engine diagnosis is claimed.

Required shared capability: a validated background-underlay/foreground-paint ordering contract that actually preserves authored translucent shapes and lines over opaque full-page cover paint. **Neon and Verlauf** directly reuse it; opaque gradient/card compositions such as **Citrus** may also benefit. The engine cause and implementation are left to the architecture track. No renderer/XML patch, photo/crop change or new primitive was implemented here.

[Stopped-source hashes and observations](template-batch-20261008-stopped-evidence.json), [Neon observed cover](neon-stopped-cover.png), [Verlauf observed cover](verlauf-stopped-cover.png). These images demonstrate failed proposals, not desired designs or approved references.

Aurora's exact long-hero requirement separately needs a native **flowing gradient surface** that expands with editable fields across pages; existing native growing surfaces accept solid fills only. Aurora and other colored hero candidates could reuse such a primitive. A solid-color adaptation is a design decision for the architecture track, not silently substituted here.

## Handoff

Cherry-pick the template commit and then this evidence/documentation commit onto freshly fetched current `dev`; resolve only the registry append and candidate-fixture lists if the other agent changed them concurrently. Re-run relevant checks there. Do not merge this branch, promote, deploy, or expand production/experimental gates as part of this task.

Next suggested batch: **Studio / Studio 2 / Kolumne (`terracotta`)**, using current decorative rails, solid native rows and supported CV compositions. Check their long editable content before configuration; stop any template that needs a new primitive. This session stops after this single batch.
