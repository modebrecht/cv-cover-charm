# Remaining template run — 2026-10-08

Dedicated branch: `docx-next/template-final-run-20261008`. Fetched authoritative `dev` base: **`b677051d166a2b0f41221ac849e5e03edc149d2d`**, rather than assuming the earlier `67ff63a9` checkpoint was current. The user's subsequent instruction authorized assessing all remaining templates in this run, superseding the original three-template stop condition. No merge, deployment, history rewrite or push to `dev`, `main` or `render` is part of this work.

## Inventory and result

The fetched registry contained **29/39** active picker templates. Its configured IDs were Brief, Warm/Freundlich, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe, Ledger, Ribbon, Sunrise, Forest Flow, Violet Pulse, Studio 3, Warm 2, Warm 3, Verlauf 2, Verlauf 3, Diagonal, Klassisch/Editorial, Edel, Seriös, Colorful, Blockig, Welle/Horizont, Modern, Pastell/Rahmen and Sonne. Retired Warm 4/5 are excluded from the active count.

All ten missing active templates were assessed. This branch ends at **36/39 configured candidates; 0/39 Microsoft Word accepted**. Five previously published configurations were consolidated unchanged and verified afresh; Kolumne and Citrus were newly completed here. Historical ledgers retain their original bytes and provenance in [template-final-imports.json](template-final-imports.json); the current run has a separate [fresh evidence ledger](template-final-run-evidence.json).

| Initially missing ID   | Design family                                        | Result using existing primitives                                                                                                 |
| ---------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `edelDark`             | Dark executive stationery                            | Imported published descriptor; native semantic composition, photo and frames verified                                            |
| `studio`, `studio2`    | Dark editorial rails and signal panels               | Imported published descriptors; solid growing native surfaces and shared CV compositions verified                                |
| `edge`, `gallery`      | Angular / portrait editorial                         | Imported published descriptors; existing paths, rounded motifs, gradients and editable rows verified                             |
| `terracotta` — Kolumne | Editorial contact column                             | Newly configured: solid native contact-cell surface, repeated interior rails, shared CV flow                                     |
| `citrus`               | Warm gradient surround and light card                | Newly configured: existing single-contour gradient paths expose native paper; solid editable rows and declarative rubric default |
| `neon`, `verlauf`      | Opaque background with translucent foreground shapes | Stopped: required foreground shapes/lines disappear in prior bounded native evidence                                             |
| `aurora`               | Growing rounded gradient hero                        | Stopped: native growing cover surfaces currently accept solid unbordered rectangles only                                         |

Reviewed app/PDF sources include `src/components/cover/layouts-base.ts`, `template-decorations.ts`, cover/Dossier sheet background and existing palette functions. Actual editor/browser covers and native source/saved output were inspected. No template-specific branch was added to the renderer, model, layout or pagination implementation.

## New configurations and explicit Word flow adaptations

**Kolumne:** the authored `decor-side-column` becomes an editable solid native contact-cell surface. The inset cover row uses widths **70 / 12 / 94 mm** inside the 176 mm body, with a 14 mm left margin. Photo, contacts, recipient and date remain semantic fields; the right hero remains editable flow. This changes a full-page absolute painted column into an inset growing contact column. Existing 17 mm interior rails and source colors remain. All 60 contact lines retain their visible column color across two cover pages, before and after Save/Reopen. Narrow and edge-aligned alternatives were rejected by existing text/page/paper checks; their proposals and actual negative hashes are retained. [Kolumne evidence](terracotta-final-run-evidence.json), [native preview](template-final-previews/terracotta.png).

**Citrus:** a single connected contour, with a zero-width return bridge, draws the existing gradient around an opening onto native paper. It uses the current one-`M` path grammar and its existing raster adapter; no path parser or renderer change. This avoids an opaque gradient covering a second foreground card. Letter and continuation CV frames retain their inset rounded openings; the opening CV uses the existing warm header and rounded transition. Editable cover rows use solid rectangular native cells inside a fixed rounded frame. Native rubric shading is rectangular and has no CSS capsule padding/radius. These are declared candidate adaptations, not pixel-parity approval or a new growing rounded-gradient surface. Saved photo geometry remains authoritative, including the 56 mm cover portrait; shared Classic, Timeline and Magazin compositions remain unchanged. [Citrus evidence](citrus-final-run-evidence.json), [native preview](template-final-previews/citrus.png).

Citrus depends on the **already published** optional rubric-default change from `34a3e2674db0816b534c2b77cdf1a990e0b514f2`. It is imported as a separate commit, not authored as another badge task or counted as a template. Its production delta is one optional descriptor setting, the shared resolver's optional fallback, and the existing model call passing that fallback; rendering still uses the existing editable run shading. Saved current and historic `false` choices take precedence. Review/cherry-pick this dependency only if current `dev` does not already contain it. No Sidebar or native identity changes are included.

The first Citrus layered-card attempt passed text/package/Save-Reopen but failed visual review because the large light card disappeared. The multiple-contour attempt failed existing grammar before creating a DOCX. Neither is counted as successful evidence. The accepted contour passes checks of both exposed gradient and light paper in source and saved renders.

## Current-run verification

| Candidate | Fixtures | Source pages | Saved pages | Tagged fields retained |
| --------- | -------: | -----------: | ----------: | ---------------------: |
| Edel Dark |       14 |          110 |         110 |                  1,653 |
| Studio    |       15 |          107 |         107 |                  1,695 |
| Studio 2  |       13 |           94 |          94 |                  1,580 |
| Edge      |       13 |           96 |          96 |                  1,580 |
| Gallery   |       15 |          106 |         106 |                  1,725 |
| Kolumne   |       15 |          105 |         105 |                  1,695 |
| Citrus    |       17 |          114 |         114 |                  1,869 |
| **Total** |  **102** |      **732** |     **732** |    **11,797 / 11,797** |

- Verified official stable **LibreOfficeKit 25.8.7.3 580(Build:3)**, all 50 pinned packages and the full existing font manifest. Runtime hashes and every native source/saved DOCX/PDF hash are in the fresh ledger.
- Existing ZIP/XML/relationships, native semantic text, entry attachment, body/image bounds, pagination, first/continuation/off paint and color checks pass before and after saving. Six canonical browser-normalized image inputs per candidate and all 102 immutable input/model/package JSON restorations pass.
- Fixtures cover normal cover/letter/CV, long letter/CV/values, image/photo, custom fields and rich content, compact/off/different-first chrome, Timeline/Magazin, background visibility and custom palettes. Applicable long contacts and covers are included. Citrus adds both current and historic saved-off rubric choices. Experimental Sidebar gates were not expanded.
- All seven actual editors pass rename/reload, portable save/load, explicit independent native snapshot/export and the production combined PDF download. Each actual production PDF has three pages. Export/PDF/portable JSON implementations were not redesigned.
- All **29 base descriptors** remain unchanged; **145 baseline stress models** match exactly and **29 normal DOCX packages** regenerate byte-identically with real canonical decoration assets. All five imported descriptors match their published versions exactly.
- **1,039 isolated unit tests / 221 files**, **305 existing DOCX Next tests**, TypeScript, changed-file lint, release/changed formatting, production build and diff checks pass. The single-process full-suite run ended without a final summary; the complete isolated-file run is the recorded full-suite result. [Per-file results](template-final-unit-results.json).

**Existing identity limitation:** all 102 native saved packages lose table captions. Field tags and complete text pass, but full native identity acceptance remains blocked. The audit is recorded separately; no repair, carrier investigation or acceptance-gate change was performed. Microsoft Word acceptance and user-approved visual parity remain pending. Dedicated-branch CI is not claimed green; existing workflow filters target the protected development/release branches.

## Remaining genuine primitive needs

| Template | Missing visual requirement                                             | Shared capability needed                                                              | Reuse                                                                  |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Neon     | Visible gradient bubbles above dark opaque cover paper                 | Validated foreground/underlay paint ordering preserving translucent foreground shapes | Neon, Verlauf; opaque gradient/card designs may also benefit           |
| Verlauf  | Visible soft circles and separator above its opaque full-page gradient | Same foreground paint-order contract                                                  | Verlauf, Neon                                                          |
| Aurora   | Gradient hero surface expanding with editable long fields              | Native flowing gradient surface, including the authored rounded-surface requirement   | Aurora; gradient hero/card families such as Citrus and related designs |

Neon/Verlauf's prior real native failure evidence is preserved in [template-final-prior-stopped-evidence.json](template-final-prior-stopped-evidence.json), [Neon](neon-stopped-cover.png) and [Verlauf](verlauf-stopped-cover.png). These are **historical failed proposals**, not fresh successful migrations. The relevant production composition, elements, paint/path/renderer and authored source files are unchanged from that assessment; their exact current Git object IDs are recorded in the fresh ledger. Known engine blockers were not investigated again. Aurora is a source/guard assessment, not an executed stress/render matrix.

Next template batch: **Neon + Verlauf**, once the architecture track supplies the shared foreground contract; then **Aurora** once its flowing gradient surface exists. Until then, no remaining template has been silently registered with its required visual feature removed. This authorized all-remaining run stops here. Cherry-pick the isolated commits onto freshly fetched `dev` and resolve concurrent registry/fixture append conflicts there; do not merge or promote this branch as part of template migration.

## Reproduce template QA

```sh
python scripts/docx-next-fixture-images.py "$QA_ROOT/images.json"
bun scripts/docx-next-fixtures.ts "$QA_ROOT" --citrus --verify-json
python scripts/docx-next-render-qa.py "$QA_ROOT" --libreofficekit "$LO_KIT" --require-stable --roundtrip
python scripts/docx-next-native-identity-qa.py "$QA_ROOT"
DOCX_NEXT_EDITOR_TEMPLATE=citrus bun scripts/docx-next-candidate-editor-qa.ts "$EDITOR_ROOT"
```

Use the other candidate's selector in a separate QA directory. For Kolumne, use `--terracotta`, then additionally run `python scripts/docx-next-kolumne-template-qa.py "$QA_ROOT"`. Use the pinned stable engine/full fonts and a supported canonical browser path through `DOCX_NEXT_CHROMIUM_PATH`. Run the new template unit files explicitly alongside `test:docx-next`.
