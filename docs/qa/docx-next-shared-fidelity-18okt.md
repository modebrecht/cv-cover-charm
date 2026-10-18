# Shared CV / Letter design fidelity — 18 October

## Mandate and branch

User direction: move from narrow template fixes to shared solutions. Working branch: `fix/docx-next-shared-fidelity-18okt`. Starting commit: `719e6da6c1c6117ea111129d5af65b56ed47ae87`, carrying the reviewed investigation and the latest re-fetched remote `dev`, `8901a830a792d75e9e792345c5180827218b4e1e`. Continue the existing evidence without rewriting its published history. The former investigation branch is not updated.

This opening checkpoint contains the shared work contract, backlog and exact-branch Vercel exclusion only. The 41 previously prepared files for the Modern defaults/footer candidate remain local uncommitted work, preserved for review and reuse. Their earlier test results apply to that bounded candidate, not to a global implementation. They must not be represented as shared product acceptance.

Status: **planning and branch setup complete; shared implementation and visual acceptance pending**. No merge, deployment, production promotion, export-engine-default switch or CI dispatch is part of this checkpoint.

## Shared mechanisms to implement

| Workstream | Shared responsibility | Evidence required before expansion |
| --- | --- | --- |
| Resolved reading settings | One policy for missing/default/explicit/legacy values, consumed by CV and Letter controls, Web rendering and export snapshot; values retain their physical units and text roles | New, saved and restored projects; explicit values and reset; no store mutation during export; fresh metrics reflect resolved values |
| Page geometry | Reuse existing dossier margin/header reserves to derive first and continuation body zones from actual chrome, visible clearance and saved margins | First and subsequent pages with compact, inline-contact, stacked-contact, reduced and hidden headers; no overlaps or double reserves |
| Native rubric surfaces | One semantic heading/pill relationship for supported paragraph flows, sizes and breaks; no new template switch per defect | Short and wrapped labels, preceding paragraphs/tables, page starts, narrow columns; native text remains editable and contained after Word Save/Reopen |
| Decorative page coverage and chrome | One supported native page-grid policy, shared colour/content resolution and consistent source assets | Edge coverage, sync and colours on CV/Letter; returned Word PDF plus saved DOCX; body, photos and boundaries preserved |
| Fonts and authored assets | Existing measured paragraphs, explicit font support, native pictures and crops; capture from the actual saved state | Stale/unavailable metrics and unsupported font substitutions rejected; moved/hidden items and image crops preserved |

The policy applies across supported templates by capability and document role. A template-specific defect must first be traced to one of these mechanisms. A new template-name conditional needs concrete evidence that the authored design requires different geometry; it is not the default repair strategy. Existing authored motifs, font choices and first-page composition remain source data.

## Initial policy inputs, not blanket substitutions

- **20 mm** is the proposed unconfigured continuation-page margin for CV and Letter. It is not permission to place body text inside a taller header. Reuse header reserve composition and prove the visible gap; preserve explicit saved margins while applying the existing collision-safety policy transparently.
- **14 px** is the proposed unconfigured CV rubric size. The Letter body already defaults to **10.5 pt = 14 px**; sender, recipient, subject, header and rubric are separate roles. Do not resize all text to one number.
- Missing data, an explicit default-sized value, a legacy value and Reset are distinct cases. No migration may overwrite an authored value simply because it equals an old default.
- Resolve policy before canonical snapshot metrics keys. Browser capture, Web controls and the exported source must agree. The canonical model and renderer remain browser-independent; no DOM/store reads inside the renderer.
- Shared Web presentation changes requested by the user can affect Web-derived PDF/Print output. Keep existing PDF/Print and Legacy exporter implementations independent and unchanged; verify their output from the same saved source.

## Existing implementation seams to reuse

| Source | Current responsibility / issue to reconcile |
| --- | --- |
| `src/components/cv/layout.ts` and `presentation.ts` | Current and legacy persisted continuation margin plus effective layout; the uncommitted helper currently limits new defaults to Modern/classic |
| `src/components/cv/reading-defaults.ts` (uncommitted) | Temporary scoped default; replace its Modern-only policy with a shared resolution contract once call sites and frozen boundaries are inventoried |
| `src/components/letter/types.ts` | Role-specific saved typography and existing 10.5-pt body default |
| `src/components/letter/layout-system.ts` | Existing header visual/reserve/gap composition and first/continuation geometry. Current no-header top is 18/16 mm; compact/contact offsets differ; Warm owns a real first-page masthead. A constant-only replacement would bypass this composition |
| `src/lib/dossier-page-margins.ts`, `dossier-chrome.ts` | Existing shared margin state, chrome geometry and sync; reuse instead of building another layout engine |
| `src/lib/docx-next/snapshot.ts` | Immutable export-boundary source with effective settings and fresh measurement identity |
| DOCX Next native renderer and existing measured composition | Consume canonical geometry and native editable text; continue explicit QA gating until visual acceptance |

## Execution and acceptance

1. Inventory actual CV/Letter defaults, persistence, reset and geometry call sites. Define one resolver and role/units contract before replacing fallbacks. Record unavoidable capability limitations.
2. Implement the shared resolver and geometry integration without introducing a new layout system. Preserve authored settings and the existing canonical/render boundary.
3. Verify **Brief, Modern, Warm/Freundlich, Verlauf and Neon**, each with CV and Letter. Use the same restored project for Web, existing PDF/Print and actual app-generated DOCX. Include first/continuation pages, relevant headers, pills, saved overrides and missing settings. Failure stops expansion and triggers root-cause diagnosis.
4. Obtain actual Word visual/editing/Save/Reopen evidence for the representative supported layout families. Supplementary LibreOffice and passing unit tests do not grant Word acceptance. Candidate 06 has no final Word acceptance yet.
5. Only after the representative gates pass, expand the test matrix to all 39 templates and the agreed normal/long/115%/moved/hidden/photo stress scenarios. Shared code does not imply universal acceptance.

Frozen Native Sidebar geometry/engine, Agent A and #14/#25/#38 remain untouched. Inventory their interfaces and report any conflict with the common policy as a separate blocker. The wider shared-solutions mandate does not silently remove those freezes. Do not reopen the cancelled inactive Word header/footer dimming request or the rejected grouped-pill primitive.

Full remaining issues and historical evidence: [shared backlog](docx-next-global-fidelity-backlog-18okt.md). The common policy, native fidelity fixes and final all-template acceptance are separate deliverables and must be reported separately.
