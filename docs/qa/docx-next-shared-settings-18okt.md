# Shared CV and Letter reading settings

**PARTIAL. The shared settings and restore-safety implementation passes its engineering gates on five template families. It is not full design fidelity, desktop Word acceptance or all-39 acceptance.**

Branch: `fix/docx-next-shared-fidelity-18okt`. Product implementation commit: `5a3a6c94812413fab2b076409d6077b85089d2aa`. The final report/evidence commit follows it without changing product code. The complete branch diff is listed in [all changes](docx-next-shared-settings-18okt/changed-files.json); checkpoint lists are in [code changes](docx-next-shared-settings-18okt/code-changed-files.json) and [checkpoint changes](docx-next-shared-settings-18okt/checkpoint-changed-files.json).

The branch continues published investigation `719e6da6c1c6117ea111129d5af65b56ed47ae87`, which contains re-fetched remote dev `8901a830a792d75e9e792345c5180827218b4e1e`. Opening checkpoint: `6550e3eec0a562839b0606e794b6c2bd8f01139a`. Historical candidate 06 and its 41 prepared files are preserved separately at `ec8ac3bca9e6e1e8063444c01c57f5c5e4d41360`, tree `15d47d6dc9f58b06e731f46d7978619384000ba6`. The detached baseline checkout used that identical tree. No published history is rewritten.

## What changed and why

The user expanded the mandate from Modern-specific repairs to shared solutions. This checkpoint implements the first common workstream: reading defaults, authored-setting precedence, first/continuation body starts and safe project restoration. It does not implement the other 38 cover compositions or promote a new export engine.

| Confirmed cause                                                                                                                                       | Consequence                                                                            | Shared correction                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CV continuation fallback was 10 mm; Letter used separate 16/18-mm and header-dependent offsets; the pending improvement was limited to Modern/classic | The same missing setting produced different document/layout behaviour                  | One pure settings policy: 20-mm unconfigured content starts and 14-px CV rubrics in flowing layouts; existing Letter body remains 10.5 pt = 14 px                  |
| Web and native construction independently resolved body starts and chrome reservations                                                                | A correct source margin did not reliably become the same native body start             | Capture pure resolved first/continuation starts once, before measurement keys; native construction consumes those immutable numbers                                |
| The CV page-margin control supplied an already reserved content box to a physical-margin store                                                        | Enabling custom margins could add the header reserve again                             | Reuse the existing inverse conversion, `cvDefaultPageMargins`; the five-template round-trip test proves that enabling those defaults does not move the content box |
| Cover/CV hydration set a mutable `restored` ref before loaded React state committed                                                                   | The initial empty render's autosave could write a Brief/empty draft over imported data | Gate autosave with committed state, matching the Letter editor's existing hydration approach                                                                       |

The restore defect was observed during the Neon saved/reset/reload case: the imported five-entry Neon CV became a zero-entry Brief CV, making the dossier templates inconsistent. The [pre-fix state](docx-next-shared-settings-18okt/observed-pre-fix-neon-state.json) and [input](docx-next-shared-settings-18okt/observed-pre-fix-neon-input.json) are retained. That observation came from a pre-fix working tree, not an immutable release commit. Separately, deterministic **early-timer fault injection** reproduces the unsafe first empty write in both Cover and CV on the historical baseline, and prevents it with the state gate. This injection deliberately fires the autosave callback before pending hydration state commits; it is not represented as ordinary browser timing. The complete ordinary import/reset/reload matrix subsequently passes with the fix.

## Shared settings contract

`src/lib/dossier-reading-settings.ts` owns the units and bounds. Missing values select defaults; saved numeric values, including the former 10-mm value and legacy CV keys, remain authoritative. The export resolves effective typography into its snapshot without rewriting the saved design. Invalid/empty continuation values do not become an accidental zero.

- CV classic, minimal, timeline and editorial use the same 20-mm / 14-px starting policy, regardless of template name. The Sidebar renderer and its modern/executive aliases retain their frozen 10-mm/template-typography baseline. Saved explicit typography remains intact.
- Letter uses the same continuation control. A numeric `continuationTopMarginMm` is an authored content start; `null` means the common default after Reset. A missing field preserves the meaning of existing saved physical page margins, then uses the shared default. This distinction prevents old projects from losing their chosen margins.
- Visible continuation headers receive a proposed **4-mm minimum clearance**, composed once with structural floors. Hidden headers own no phantom gap. The requested value stays visible in the control; a larger protected effective start is shown separately. This clearance passes engineering/browser checks; its new Word editing/roundtrip acceptance is still open.
- Unconfigured first pages have a 20-mm minimum content start. Existing taller first-page headers, Warm's masthead, recipient placement and frame constraints remain source-owned. Thus hiding a header no longer creates the otherwise unrepresentable implicit 18-mm first page / 20-mm continuation combination. Explicit saved smaller first-page margins are retained.
- The existing single-section first-page lead expresses a greater first-page start. A smaller first-page start than the requested continuation start **fails clearly before download**, for both CV and Letter. There is no silent clipping, forced saved-margin change or alternative visibly incorrect export.

The reusable `ContinuationTopMarginControl` handles both document types. No new persistence store, layout engine, negative paragraph offsets or spacer chain was introduced. Native construction reuses one existing first-page-lead primitive per document. Letter geometry's CSS and attachment-default dependencies were separated so snapshot reuse does not pull browser styles into DOCX. The original attachment defaults remain unchanged. PDF/Print and Legacy exporter implementations are untouched.

## Actual verification

The browser gate restores real saved projects through the application's file input. It uses explicit Sans inputs and shared compact chrome, a long Letter and an authored page-2 CV rubric to exercise continuation independently of each template's density. It measures the actual main preview, waits for pagination and saved storage, and compares physical body starts with the captured source within 0.05 mm. It does not count offscreen export duplicates as extra preview pages.

| Template          | Default CV first / continuation | Default Letter first / continuation | Default, saved 12-mm / 18-px, Reset and reload |
| ----------------- | ------------------------------- | ----------------------------------- | ---------------------------------------------- |
| Brief             | 34 / 20 mm                      | 34 / 20 mm                          | PASS                                           |
| Modern            | 34 / 20 mm                      | 34 / 20 mm                          | PASS                                           |
| Warm / Freundlich | 34 / 20 mm                      | 52 / 20 mm                          | PASS                                           |
| Verlauf           | 34 / 23 mm                      | 34 / 20 mm                          | PASS                                           |
| Neon              | 34 / 23 mm                      | 34 / 20 mm                          | PASS                                           |

The 23-mm starts respect existing CV card interiors; they are not exceptions to the shared default. All **10/10** cases retain the exact authored work entries and Letter text. Margin Reset survives reload while the separately saved 18-px rubric setting remains 18 px. The five-family pure geometry tests additionally cover none, compact and contact headers. New measured contact-header Word candidates are not claimed tested in this checkpoint.

All **10 first-page Web images** (five templates × CV/Letter) are pixel-identical to the historical checkout with equivalent explicit 20-mm / 14-px settings. Raw missing-versus-explicit fields differ intentionally; the visible effective design is the comparison basis. The actual default body geometry and font sizes are recorded in the [cohort evidence](docx-next-shared-settings-18okt/cohort-results.json).

There are **three actual UI DOCX exports**: normal Brief, headerless Brief and the current Modern rubric candidate. Each produced four A4 pages in supplementary rendering, and every page was opened and inspected. The headerless case uses 20 / 20 mm without an unsupported default combination. These are fresh restored QA fixtures, not a claim that the original user's `app-body-photo-right.docx` saved editor state has been recovered.

The [new Modern candidate](docx-next-shared-settings-18okt/07-Modern-Gemeinsame-Abstaende.docx) has SHA-256 `d2f2e50fc9881abb5994d5517a154e84f4e8e30a38968efc26b41c5abaedd975`. Relative to candidate 06:

- Only `word/document.xml` changes. The complete cover XML prefix and every other package part remain byte-identical.
- All **86 existing package control tags** retain their order. One new empty `letter.measured.firstPageLead` control carries the Letter's first-page lead; it does not replace any semantic text.
- All **13 media files** remain byte-identical. This fixture has no authored portrait photo; this result does not substitute for the full photo/crop stress matrix.
- All **seven native editable CV rubric labels** remain inside their backgrounds in supplementary rendering. No text was rasterized or grouped into the previously rejected native badge primitive.
- There is one cover page, one Letter page and two native CV pages. The corresponding Web/automatic-PDF CV has one page. Full pagination fidelity remains open.

The [four-page A4 comparison](docx-next-shared-settings-18okt/a4-comparison.pdf) shows the complete cover, Letter, CV first page and native CV continuation, explicitly labelled as supplementary LibreOffice output. It does not present LibreOffice as Microsoft Word.

**Eight actual app rejection gates pass**: unsupported font, substituted font, unavailable measurement context, source changes during capture, source changes during rasterization, unsupported Letter first/continuation relation, the corresponding CV relation, and opt-in off. All download counters remain zero on failures. See [rejections](docx-next-shared-settings-18okt/rejections.json).

**1,230 unit tests PASS**, zero failures, 23,487 assertions / 255 files. **417 DOCX tests PASS**, zero failures, 6,402 assertions / 65 files (overlapping suite). Typecheck, formatting, complete Vite/Nitro build and lint pass; lint retains the existing 21 warnings and zero errors. The runtime dependency-boundary tests and poisoned-ambient-state tests pass. Frozen Sidebar snapshot/model equality is checked for both aliases.

## Same-source PDF and remaining fidelity defects

The actual default **automatic PDF export** was also downloaded through the app from JSON-equivalent source to the Modern DOCX candidate. Saved source is unchanged through export. Its producer is **jsPDF 4.2.1**, with three A4 pages. The [PDF](docx-next-shared-settings-18okt/same-source-primary.pdf) and [app verification](docx-next-shared-settings-18okt/primary-app-verification.json) are retained. This is a read-only check of the existing exporter, not an implementation change or a Native Print promotion.

The complete comparison identifies important work still open:

| Priority | Confirmed discrepancy / cause                                                                                                                                                                                                                                                                                                                            | Next shared solution                                                                                                                                                                                                                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | Compact Modern sync still derives Letter header/footer paint from `#111827` but CV paint from `#111111`, despite shared chrome being synced. The normal PDF already contains the difference: sampled Letter header RGB 17/24/40 versus CV 17/17/17; one-channel rounding reflects image compression. The source compact footer also retains 0.92 opacity | Resolve one effective shared chrome palette after template defaults for all supported modes, with explicit saved colours taking precedence and sync-off preserving independent document styles. The existing Modern/contact-only resolver is insufficient. Keep this separate from the cancelled request about inactive Word UI dimming |
| P1       | Native classic CV adds a Kontakt heading, stacks date/title/place paragraphs and flattens visible Web bullet presentation. These differences are already present in canonical construction, before Word                                                                                                                                                  | Reuse existing native semantic row/date-rail and list primitives to reproduce the Web role structure, then prove a representative template before expansion                                                                                                                                                                             |
| P1       | The exact same fixture produces one Web/automatic-PDF CV page and two native CV pages. Correct body starts alone do not fix density, entry rows, list spacing or content hierarchy                                                                                                                                                                       | Align shared role typography and flow compositions with authored source, preserving editability; do not claim success from package validity or arbitrary spacing reductions                                                                                                                                                             |
| P1       | Candidate 06's page-paint rounding correction is inherited unchanged; no Word return for 06/07 exists                                                                                                                                                                                                                                                    | Verify right/bottom coverage in desktop Word, then editing, Save/Close/Reopen and Word PDF before applying the policy more broadly                                                                                                                                                                                                      |
| P1       | Fresh compact-mode settings are proved here; revised contact inline/stacked/reduced modes, other fonts, moved/wrapped pills and picture/crop stress are not fully accepted                                                                                                                                                                               | Run the corresponding shared-mode/stress cases on the five-family cohort before all 39                                                                                                                                                                                                                                                  |

Original cover discrepancies in Warm, Verlauf and Neon remain open in the independent 37D report. They were not silently replaced with the Brief/Modern cover composition. Native Sidebar geometry/engine, Agent A and #14/#25/#38 remain frozen. Their separate gates still prevent full product acceptance.

## Word gate and reproduction

Desktop Microsoft Word is unavailable here. **Candidate 07 visual, editing and Save/Reopen acceptance is UNVERIFIED.** The prior positive Word evidence does not automatically validate its newly resolved body starts. Candidate 07 is a bounded margin/settings handoff and contains the documented existing compact palette discrepancy; it is not a full-design release candidate.

For the Word return, use candidate 07: inspect all four pages and CV continuation clearance, edit native text, save as DOCX, close/reopen and export a Word PDF. Preserve original media/crops and content controls; check the footer edges. Do not use this one return to declare the other templates or stress cases accepted. The next engineering workstream is the common chrome palette/opacity policy and then canonical CV row/list fidelity, rather than another Modern-only cosmetic patch.

Use the same installed Bun, Chromium and Liberation Sans fontconfig environment recorded in the earlier QA packets. No dependencies or native engine binaries were changed.

```sh
FONTCONFIG_FILE=... DOCX_NEXT_CHROMIUM_PATH=... \
 bun scripts/docx-next-shared-settings18okt.ts /tmp/shared-cohort

DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
 DOCX_NEXT_RUBRIC_SPACING=1 DOCX_NEXT_COVER_CASES=cv-pills \
 DOCX_NEXT_PROJECT_PATH=docs/qa/docx-next-modern-defaults-footer-18okt/project.json \
 bun scripts/docx-next-brief-app37c.ts /tmp/shared-modern

DOCX_NEXT_ONLY_NEGATIVES=1 \
 DOCX_NEXT_NEGATIVE_CASES=unsupported-font,substituted-font,missing-measurements,stale-before-capture,stale-after-render,first-page-letter,first-page-cv \
 bun scripts/docx-next-brief-app37c.ts /tmp/shared-rejections
```

`scripts/dossier-hydration-save18okt.ts CHECKOUT PROJECT OUTPUT` reproduces the injected hydration race; set `HYDRATION_EXPECT_LOSS=1` for the historical checkpoint and omit it for the fixed checkout. `scripts/docx-next-shared-web-baseline18okt.ts CHECKOUT PROJECT OUTPUT` captures the equivalent explicit-settings baseline. `scripts/docx-next-shared-primary-pdf18okt.ts MODERN_APP_PACKET OUTPUT` performs the actual same-source default PDF download. `scripts/docx-next-shared-settings18okt.py` validates and packages those inputs; its module docstring lists the arguments. Native output is rendered with the packaged `render_docx.py --dpi 120 --emit_pdf` and inspected page by page.

Only the new 18okt working branch is fast-forwarded. Exact-branch and wildcard Vercel deployment exclusions are false; all 16 workflow push filters exclude this branch. Protected refs and live branch deployment/workflow counts are verified around publication. No merge, deployment, PR, workflow dispatch or production default switch is part of this work.
