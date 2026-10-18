# Modern CV continuation margin and rubric typography

Follow-up: the user approved candidate 05 in Word and supplied a PDF showing a real narrow footer paint gap. The [scoped Web defaults and candidate 06 coverage trial](docx-next-modern-defaults-footer-18okt.md) now supersede the earlier decision to leave defaults unchanged. The original packet below remains immutable; no returned DOCX was supplied for candidate 05.

**Recommendation: use the existing saved controls with a 20-mm continuation top margin and 14-px rubric text (10.5 pt native Word). No production layout code or global default change is needed for this comparison. Overall PARTIAL: the returned candidate 04 passes bounded Word rendering/save checks; new settings candidate 05 still needs Word visual acceptance.**

Branch: `investigate/docx-next-design-fidelity-16okt`. Parent: `df72489a5d5c1fec4daf43309df0f8dfeb1987c0`. Remote dev re-fetched at `8901a830a792d75e9e792345c5180827218b4e1e`. The header/footer dimming request remains cancelled. This work stays on the normal Modern CV; there is no stress/template expansion or default export promotion.

## Returned Microsoft Word evidence

Both returned attachments were available locally and inspected. The [returned Word PDF](docx-next-modern-cv-spacing-settings-18okt/word-return-04.pdf) has Microsoft Word for Microsoft 365 metadata and four A4 pages. All seven native rubric labels are now inside their capsule backgrounds, including the first heading on the CV continuation page. This is actual Word evidence for the previous spacing ownership correction, superseding its earlier unverified rendering state.

The [returned DOCX](docx-next-modern-cv-spacing-settings-18okt/word-return-04.docx) differs from the original download. All 82 native SDT tag IDs are retained in the same order and all 13 original picture byte hashes are preserved, despite Word rewriting the package. The native document title changes from `Lebenslauf` to `Lebenslaufi`; the existing first-page lead control also acquires whitespace. Other semantic control text is unchanged after trimming whitespace. This supports bounded native editing/save feasibility. The exact close/reopen sequence was not directly observed; arbitrary long edits, object manipulation and complete product acceptance remain open.

## Why the continuation looks cramped

The old snapshot explicitly captures `settings.cvContinuationTopMarginMm = 10`. The original and returned DOCX both serialize `w:pgMar/@w:top = 567` twips, approximately 10 mm. The Web continuation policy also treats this as a **physical distance from the paper edge**, independent of the first-page header gap. It is not a 10-mm gap after the header.

The compact header band occupies 4 mm. At the top of a continuation page, the capsule background extends about 0.8 mm above the text-flow origin. Its measured Word top is 9.21 mm, leaving **5.21 mm between header and capsule**. The tight appearance is real and the 10-mm setting was applied. No ignored-setting export defect is demonstrated by this case.

The other control, **Zusätzlicher Abstand nach Header**, applies to CV page 1; its own existing help text says that page 2 uses the separate top-margin control. Adding that gap again in DOCX would change the meaning of the saved settings and diverge from the Web policy.

Relevant paths are `src/components/cv/CvPageMarginsControl.tsx`, `src/components/cv/layout.ts`, `src/components/cv/archetype.ts`, `src/components/cv/portable-state.ts`, `src/lib/docx-next/continuation-margin.ts` and the model builder. The default is 10 mm, not an unrecorded Word fallback. For this compact-header design I recommend 20 mm as the visual comparison; this report does not silently migrate other projects or change the global default.

## Typography and exact comparison settings

The returned Word PDF uses 12-pt Arial Bold for the pills, matching the measured/quantized source style. There is no Word-specific enlargement in this evidence. The existing Web control can reduce it:

| Editor location                               | Existing control       | Comparison value           |
| --------------------------------------------- | ---------------------- | -------------------------- |
| Lebenslauf → Layout → Seitenränder & Abstände | Oberer Rand ab Seite 2 | 20 mm                      |
| Lebenslauf → Schrift → Rubriktitel gestalten  | Schriftgrösse          | 14 px, exported as 10.5 pt |

These are the only two deliberately authored changes to the saved QA project. The rubric-size control also reduces the generic native Kontakt heading; body text, name and document title retain their previous typography. Capsule geometry is freshly measured for the selected size.

The runner now accepts `DOCX_NEXT_PROJECT_PATH`, restores that file through the actual app input, visits the CV to settle the app's existing dossier-font synchronization, returns to the dossier page, then clicks the existing explicit QA export button. The route normalizes the Letter's inherited font label from `freundlich` to `sans`; its `fontOverride` was already `sans`. The actual canonical Letter model and rendered page are unchanged. Fresh metrics are keyed to the exact settled export snapshot. After export, opening both editor controls leaves that snapshot unchanged and shows the expected 20/14 values. No measurement packet is reused or altered.

## Actual validation

- One actual app-generated candidate, copied unchanged as **[05-Modern-CV-Pills-Rand20-Schrift14.docx](docx-next-modern-cv-spacing-settings-18okt/05-Modern-CV-Pills-Rand20-Schrift14.docx)**. SHA-256: `702b41475e5a889187dce0ba9fa48d15b3f9681f6c2b8041d7656a9ac6270321`. UI download equals app entry bytes; export leaves saved document stores unchanged.
- The saved project restore, visible 20-mm/14-px editor controls, actual snapshot and fresh metrics agree. Native section top is 1134 twips / 20 mm; the existing first-page lead reduces from 14 to 4 mm, retaining its 24-mm first-page origin. No new layout primitive or page-specific spacer is introduced.
- Four A4 pages, all individually rendered and inspected: one cover, one Letter, two CV pages. All seven supplementary capsule-containment checks pass at 10.5 pt. Header-to-first-capsule clearance on CV page 2 is **15.19 mm**. The page count, semantic content and flow block IDs are retained.
- Cover/Letter canonical models and both complete native page PNGs are identical to the prior candidate. Both corresponding Web captures are byte-identical. CV body run styles are unchanged; only heading sizes, their measured decoration and the requested continuation geometry change.
- **1218 unit tests PASS**, zero failures, 23341 assertions across 253 files. **405 DOCX tests PASS**, zero failures, 6258 assertions across 63 files (overlapping suite). Typecheck, changed-code formatting and the QA runner lint check pass. No production TS/TSX, renderer, PDF/Print, Legacy exporter or dependency file changes; a new production build is unnecessary for this QA-only input change.

The current Web fixture fits on one CV page while native Word requires two. This investigation verifies the existing Web continuation policy and exported settings; it does not invent a same-state visible Web page 2 or claim full Web/native pagination equivalence. LibreOffice results are supplementary, and the new candidate's Word rendering/editing/Save/Reopen remains **UNVERIFIED**.

[Validation](docx-next-modern-cv-spacing-settings-18okt/validation.json), [verification](docx-next-modern-cv-spacing-settings-18okt/verification.json), [hashes](docx-next-modern-cv-spacing-settings-18okt/sha256.json) and [changed files](docx-next-modern-cv-spacing-settings-18okt/changed-files.json) preserve the result. The input project, settled snapshot, fresh metrics, model, app evidence and visible-control record are retained alongside them.

## Reproduction and next gate

Use the same locked Bun/Node/Chromium and Liberation Sans fontconfig environment as the preceding report. Word requests Arial; target-font identity is still bounded by the supplied Word evidence.

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
 DOCX_NEXT_RUBRIC_SPACING=1 DOCX_NEXT_COVER_CASES=cv-pills \
 DOCX_NEXT_PROJECT_PATH=docs/qa/docx-next-modern-cv-spacing-settings-18okt/project.json \
 bun scripts/docx-next-brief-app37c.ts /tmp/modern-cv-settings
```

Activation stays `/?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-rubric-spacing-qa=1`, button **Modern CV-Pills Abstand testen**. Render the app download with `render_docx.py --dpi 120 --emit_pdf`. `scripts/docx-next-cv-settings37d.py APP_CASE PRIOR_PACKET PRIOR_RENDER UPLOADS NEW_RENDER OUTPUT` verifies the returned Word files, source/control equivalence, unchanged adjacent models/pages and the new geometry. It copies untouched packages and never repairs XML.

Next: compare candidate 05 in desktop Word, especially the smaller rubric text and first capsule on CV page 2. If visually acceptable, edit a short heading, save under a new name, close/reopen and return DOCX plus Word PDF. Decide on a template-aware default only after that comparison; preserve explicit saved values. The previous capsule alignment correction now has bounded Word evidence, but this does not approve other templates, stress scenarios or all Item 37 acceptance.

Only the existing investigation branch is fast-forwarded. Exact-branch and wildcard Vercel deployment exclusions and all 16 workflow push filters are checked before publication; protected refs and live branch deployments/runs are checked before/after. No deployment, merge, PR, workflow dispatch or default export switch. Frozen Native Sidebar, Agent A and #14/#25/#38 remain untouched.
