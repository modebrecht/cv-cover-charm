# CV Web/PDF parity migration

Authoritative branch: `dev`. Start: `da7d3da122b82aa7fd8bc730ce9e2e61167e0894`.
The starting working tree was clean; M6 Release Candidate and all browser/Web
gallery checks were successful. `main` and `render` are outside this migration.

## Package 1 — local theme contract

`dossierThemeCssVariables()` derives all 28 existing custom properties without
reading or changing the document. `applyDossierTheme()` retains its legacy API
and applies that same contract globally. `CvCanvas` supplies the contract in its
initial React style props, inherited by measurement, preview and export pages.
Explicit font choices remain authoritative. No theme mutation is necessary for
hidden CV rendering.

Validation: 1,091 unit tests; 128 browser tests from `cv-pdf`,
`cv-m9-pagination`, `templates-layout`, `fresh-dossier-templates`, and
`dossier-flow`; typecheck, lint, production build, and changed-file formatting
all passed. Unit coverage compares all family contracts to legacy writes and
renders a hidden CV while rejecting global dossier-theme writes.

Next dependency: CV template rules still activate through
`html[data-dossier-template]`; layout/photo getters still write global
presentation state. Packages 2 and 3 own those migrations.

## Package 2 — local template CSS

Migrated 514 stylesheet selectors in 37 files plus seven inline artwork
selectors. The audit includes `html:is(...)`, `html:root[...]`, shared chrome,
shared Cover/CV motif groups, density, and explicit typography overrides.
CV rules use `data-cv-template` on the semantic document or its immediate
controls scope. The `div` type and repeated attributes deliberately retain the
original specificity; import order and declarations stay unchanged.

Shared Cover/CV groups now have separate selector branches. Global selectors
are retained only for Cover/Letter compatibility, with explicit document
boundaries for shared Human/Warm backgrounds. They cannot style a CV through
the global template identity.

Removed 17 redundant measurement-only branches whose extra selector
specificity could select a different horizontal content box from the visible
page. Gallery exposed this existing bug: measurement used 20 mm on the right,
while the visible page used 36 mm. Measurement now follows the visible rule.
First-page content and custom rubric offsets also include the measure page.

Architectural browser coverage compares typography, main boxes, sections and
photo styles for Studio 2/3, Ledger, Ribbon, Gallery, Prism, Orbit, Cove,
Warm/Friendly, Warm 2/3 and Citrus with both wrong and absent html identity.
It compares first-page and measure-page content boxes. The test is included
in the existing `cv-pdf` CI group. A repository-wide unit guard covers template
CSS and legacy inline artwork CSS.

The Package 1 CI fresh-template job exposed a fixture autosave race
(`Missing saved demo CV`). Its test setup now waits for persisted school data
before navigating; no product assertions or timeouts were weakened.

Validation: 1,092 unit tests; all 129 relevant browser regressions; the full
39-template Web gallery; typecheck, lint, production build and changed-file
formatting passed. All 39 CV screenshots and 39 cover screenshots are
pixel-identical to the Package 1 baseline. Letter screenshots are identical
apart from 0.0011% transient pixels in Studio 2, with no geometry change.
The final shared-background adjustment was rechecked in gallery batches 2/6
and the local-scope/sidebar browser tests.

Next dependency: CV variant, mirrored/info side, photo styling and spacing
still have global presentation selectors and getter side effects. Package 3
will provide an explicit per-instance presentation snapshot.

## Package 3 — local presentation state

Started from clean, freshly fetched `24109a6adbdffde6488e1c2a10ec7eafda7f71b3`;
all Package 2 CI checks passed. `CvPresentation` separates the editor-store
adapter from the base renderer. Explicit per-instance props override the store.
The base renderer receives the resolved layout, info side, photo treatment and
placement, section placement/gap, title spacing, continuation margin, page
margins and body alignment. Geometry and cached pagination rows consume that
same snapshot.

The semantic CV root carries variant, layout, mirrored/info side, photo shape
and custom-gap markers. Crop, frame colour, gap and document-title spacing are
local custom properties in the initial React style. All 53 root presentation
selectors were localized with their original specificity. The CV imports the
shared theme/layout styles itself, rather than waiting for a picker route.

Layout, photo-style and photo-placement getters no longer apply DOM state.
CV visual policy uses the pure family lookup. Existing setters/storage event
compatibility writes remain for legacy controls; no CV selector needs them.
Storage keys, legacy photo shape, executive-to-sidebar resolution, mirrored
fallback and continuation-gap migration stay compatible.

`pinCvSidebarMainGeometry()` remains necessary: historical horizontal
`!important` rules still compete with calculated user margins and adjustable
rails. It now receives the instance's margins and only pins its own subtree.
Sidebar-left/right, 22% rails, persisted margins, measurement and PDF cases
cover that contract. Removing the competing declarations is a later geometry
cleanup, not required for local ownership.

Tests mount Studio 3/Timeline/circle and Gallery/sidebar-right/rectangular
simultaneously, then poison html state and crop/spacing variables. Both retain
their own geometry, typography and photo treatment, without root writes.
Additional cases cover classic, sidebar sides, Timeline, Magazin, all four
photo shapes and a multi-page CV. Old tests now assert the same state on the
CV boundary instead of html; geometry/content assertions were preserved.
The fixture reload waits for the persisted local variant before measuring.

Validation: 1,093 unit tests; the full 39-template Web gallery (all 39 CV
screenshots pixel-identical to Package 2); typecheck, lint and production build.
The full 131-test browser matrix also covers long CVs, standalone PDF selection,
photo compatibility and saved-project persistence.

Next: Package 4 will verify the canonical combined print DOM from a cold home
route, combined-PDF selection boxes and marker/page distribution, and produce
a same-SHA Web/PDF report. CV styling is locally owned; clone-time html template
scoping still exists for legacy Cover/Letter and will explicitly bypass CV.

## Package 4 — canonical print and PDF proof

Started from freshly fetched clean `fd9780ca38f9a5e1c7dd375809ff44b7fff71899`.
Package 3 CI completed successfully. The cold combined-dossier test seeds
synthetic saved documents before the first home-page navigation, with no CV
editor initialization. It removes or deliberately mismatches html template,
variant, mirror, photo and typography state before opening the normal export
dialog and mounting `DossierPdfCanvas`.

Studio 3, Studio 2, Ledger, Ribbon, Gallery, Prism, Neon and Citrus compare page count,
per-page content/section distribution, main/header/sidebar/photo boxes and
font metrics against independent visible and standalone hidden CV instances.
The measurement content box must equal the actual first-page box. Real
combined PDF selection boxes for three text targets use the same 1.5 mm
position / 2 mm size tolerances as the existing standalone test.

Long classic and sidebar-right CVs compare the complete marker-to-page map
between visible preview, standalone hidden DOM, canonical combined print DOM,
standalone PDF and combined PDF. All 18 experience entries, education and
references must occur once; the CV page counts must agree.

The proof exposed two genuine shared-boundary bugs. Saved CVs with no font
field inherited Cabin in the editor but the family font in the combined path.
Both paths now use `migrateCvDesign()`, preserving explicit font choices,
invalid/null template-font choices and legacy background-density migrations.
The second bug was a measurement rail derived only from theoretical geometry:
custom sidebar percentages in a card layout could measure a different width
from the painted rail. Measurement now uses the same instance's actual first
page rail. This is generic geometry ownership, with no template branch or CSS
patch.

CV capture explicitly bypasses `scopeDossierTemplateForHtml2Canvas()`. The
helper remains for legacy Cover/Letter clone scoping. CSS zoom and ICC JPEG
normalization remain export compatibility operations, not theme/layout
suppliers. Unit coverage proves CV capture leaves wrong clone html identity
untouched and that Cover/Letter retain their compatibility scope.

No extra production QA route was added. The normal home export dialog already
mounts the canonical print DOM for DevTools inspection, and the browser tests
inspect that exact DOM. The test-only instance fixture also renders production
components without duplicating renderer logic.

Release validation: 1,099 unit tests; 13 final focused browser checks (combined
PDF/selection, long CVs, all 39 clone geometries and unblurred paint samples);
typecheck; lint (0 errors, 21 existing warnings); production build; release
format check; changed-file format check. The required CI matrix comprises 143
browser tests across cv-pdf, cv-m9-pagination, templates-layout,
fresh-dossier-templates and dossier-flow; the standard workflow also runs the
remaining browser groups and ten Web gallery batches. All predecessor checks
on the resumed b2477e7a checkpoint were green; final results are attached to the
dev commit containing this evidence. See the report linked below.
The full format check was also run: 156 untouched files retain pre-existing
formatting differences (160 before this package). Its scope/configuration was
not weakened. That repository formatting cleanup remains separate from the
renderer migration.

`recordGallerySource()` records the checked-out SHA in both Web/PDF galleries.
`scripts/cv_web_pdf_parity.py` rejects different revisions and reuses the
existing A4 normalization, RGB SSIM and grayscale/layout SSIM pipeline. The
same-SHA gallery results are recorded below after generation. The `render`
branch visual promotion workflow remains the later promotion gate; it was not
triggered by changing or promoting `render`.

The first same-SHA gallery revealed an existing clone-normalization bug:
replacing CSS zoom with a transform discarded zoom's used width and normal-flow
height. That made later CV rubrics drift downward in the PDF even though the
print DOM was correct. The generic normalization now snapshots all zoomed
boxes before changing any ancestor, keeps their used dimensions and reserves
the original flow footprint through scaled margins. No template/layout identity
is supplied by the clone. Web appearance and pagination are unchanged.

The additional 39-template browser proof compares visible and canonical print
geometry within 0.02 mm, then normalizes a real html2canvas clone and verifies
main/header/section/entry/photo/sidebar boxes within 0.3 mm. Font metrics and
content must agree. This catches clone-induced flow drift separately from
antialiasing, JPEG compression and zoom glyph rounding.

The final paint audit found three additional generic html2canvas limitations:
CSS `filter: opacity(...)` was ignored (including its stacking context), sharp
zero-blur horizontal inset shadows filled their entire box, and physical
lengths inside gradient stops were interpreted as pixel numbers. The capture
clone now converts lone opacity filters to equivalent group opacity, represents
sharp horizontal inset shadows as background stripes, and converts physical
gradient lengths to CSS pixels. Geometry, DOM identity and live styles do not
change. Mixed filters and blurred/spread shadows remain untouched.

A direct RGB browser proof covers Aurora and Ledger's unblurred background
fields, page edges and inset stripes at 14 locations, with a maximum four-unit RGB
channel tolerance. The exploratory Neon check also identified existing CSS blur
raster differences; it is recorded as a limitation rather than represented as
pixel parity. The complete 39-template score report includes those motifs.
No required geometry, pagination, content or selection assertions were relaxed.

## Final same-SHA gallery evidence

Web and combined PDF sources both identify
`d043698c4f5b83db097d3b502a2c40cefc3e0a9d`: 39 templates, 117 Web PNGs and
39 three-page combined PDFs. All 39 Web CV screenshots remain pixel-identical
to Package 3.

| Document      | RGB SSIM mean | Grayscale/layout SSIM mean |
| ------------- | ------------: | -------------------------: |
| Cover         |      0.987325 |                   0.988181 |
| Letter        |      0.991995 |                   0.992846 |
| CV            |      0.953837 |                   0.954503 |
| All 117 pairs |      0.977719 |                   0.978510 |

The pre-zoom CV layout mean was 0.774098; Neon improved from 0.607382 to
0.931309. Geometry divergence is no longer detected by the covered 39-template
fixtures. Native CSS blur and raster text/rule antialiasing still prevent pixel
identity. Scores, observed limitations and the lowest three visual pairs are
recorded in [the parity report](qa/cv-web-pdf-parity-report.md) and
[all 117 scores](qa/cv-web-pdf-parity-scores.csv).

The evidence/documentation commit is the successor of the source SHA above;
it does not change the renderer. This migration was resumed from remote
`b2477e7aea4f3def155dd9d93330cffc445b0341`.

## Release commits and compatibility

| Scope                                           | Commit                                     |
| ----------------------------------------------- | ------------------------------------------ |
| Package 1: local theme                          | `aefd25d490536a35bae4c30a39463831bae72761` |
| Package 2: local template CSS                   | `24109a6adbdffde6488e1c2a10ec7eafda7f71b3` |
| Package 3: local presentation                   | `fd9780ca38f9a5e1c7dd375809ff44b7fff71899` |
| Package 4: canonical print proof                | `3fa085c6c66008e9da25fbb09a7410f2bc630106` |
| Gallery source-directory correction             | `0d0b816cc6c1f9b24036c966f62533d3c25c58b6` |
| Flow-preserving zoom compatibility proof        | `b2477e7aea4f3def155dd9d93330cffc445b0341` |
| Filter, gradient and inset-stripe compatibility | `d043698c4f5b83db097d3b502a2c40cefc3e0a9d` |

The CV theme, identity, presentation and measured geometry are locally owned.
The visible route still applies the legacy dossier theme/template for editor
compatibility. Legacy setters still expose html presentation state for controls;
Cover/Letter clone template scoping also remains. None of these writes supplies
CV rendering correctness. `pinCvSidebarMainGeometry()` remains a local geometry
owner while historical horizontal `!important` rules exist.

No second renderer, template-specific JavaScript workaround or temporary live
html-template switch was introduced around export. Saved-project storage keys
and schemas remain unchanged. No manual deployment or promotion was requested.
`main` and `render` retain their original heads.

## Complete changed-file inventory

- `.github/workflows/dossier-regression.yml`
- `docs/cv-web-pdf-parity.md`
- `docs/qa/cv-web-pdf-parity-report.md`
- `docs/qa/cv-web-pdf-parity-scores.csv`
- `docs/qa/cv-web-pdf-parity-worst.png`
- `scripts/cv_web_pdf_parity.py`
- `src/components/cover/CoverBackground.tsx`
- `src/components/cover/cv-card-refresh.css`
- `src/components/cover/final-pdf-polish.css`
- `src/components/cover/fresh-cover-visual-cleanup.css`
- `src/components/cover/fresh-templates.css`
- `src/components/cover/gradient-templates.css`
- `src/components/cover/next-signature-templates.css`
- `src/components/cover/signature-templates.css`
- `src/components/cover/studio-cv-redesign.css`
- `src/components/cover/studio-rework.css`
- `src/components/cover/studio-warm-variants.css`
- `src/components/cover/template-diagonal.css`
- `src/components/cover/templatefix-24-25.css`
- `src/components/cover/templatefix-29-31.css`
- `src/components/cover/templatefix-32-36-cv-masthead.css`
- `src/components/cover/templatefix-32-36.css`
- `src/components/cover/templatefix-glow-density.css`
- `src/components/cover/templatefix-mono-luxe.css`
- `src/components/cover/templatefix-prism.css`
- `src/components/cover/templatefix-studio-pdf-scale.css`
- `src/components/cover/templatefix-violet-pulse.css`
- `src/components/cover/verlauf-2-3.css`
- `src/components/cover/verlauf-pill-fix.css`
- `src/components/cover/warm-4-5.css`
- `src/components/cover/warm-echo-fixes.css`
- `src/components/cover/warm2-redesign.css`
- `src/components/cv/CvCanvas.tsx`
- `src/components/cv/CvCanvasBase.tsx`
- `src/components/cv/archetype.ts`
- `src/components/cv/citrus-rubric.css`
- `src/components/cv/default-pagination-density.css`
- `src/components/cv/design.ts`
- `src/components/cv/document-title-user-override.css`
- `src/components/cv/fresh-modern-sidebar-geometry.css`
- `src/components/cv/full-section-rules.css`
- `src/components/cv/intelligence.ts`
- `src/components/cv/layout-options.css`
- `src/components/cv/layout-variants.css`
- `src/components/cv/layout.ts`
- `src/components/cv/photo-place.ts`
- `src/components/cv/photo.ts`
- `src/components/cv/presentation.ts`
- `src/components/cv/user-typography.css`
- `src/components/dossier/chrome-policy.css`
- `src/components/dossier/header-production-polish.css`
- `src/components/dossier/human-polish.css`
- `src/components/dossier/legacy-template-refinements.css`
- `src/components/dossier/pastell-stationery.css`
- `src/lib/dossier-pdf-document.ts`
- `src/lib/dossier-theme.ts`
- `src/lib/html2canvas-export.ts`
- `src/routes/lebenslauf.tsx`
- `tests/e2e/cv-combined-parity.spec.ts`
- `tests/e2e/cv-gallery-dom-parity.spec.ts`
- `tests/e2e/cv-edge-smoke.spec.ts`
- `tests/e2e/cv-local-presentation.spec.ts`
- `tests/e2e/cv-local-template-scope.spec.ts`
- `tests/e2e/cv-pdf-paint-parity.spec.ts`
- `tests/e2e/cv-pdf-selection-geometry.spec.ts`
- `tests/e2e/cv-section-gap.spec.ts`
- `tests/e2e/dossier-gallery.spec.ts`
- `tests/e2e/dossier-regression.spec.ts`
- `tests/e2e/dossier-web-gallery.spec.ts`
- `tests/e2e/fresh-modern-sidebar-geometry.spec.ts`
- `tests/e2e/support/cv-parity-data.ts`
- `tests/e2e/support/cv-parity-fixture.ts`
- `tests/e2e/support/cv-renderer-fixture.tsx`
- `tests/e2e/support/gallery-source.ts`
- `tests/e2e/support/pdf-selection-boxes.ts`
- `tests/unit/cover-decorations.test.ts`
- `tests/unit/cv-local-css-scope.test.ts`
- `tests/unit/cv-local-theme.test.tsx`
- `tests/unit/cv-pagination-design-invalidation.test.ts`
- `tests/unit/cv-photo-frame.test.ts`
- `tests/unit/cv-saved-design-parity.test.ts`
- `tests/unit/dossier-chrome-renderer-boundary.test.ts`
- `tests/unit/dossier-page-margins.test.ts`
- `tests/unit/final-pdf-polish.test.ts`
- `tests/unit/fresh-modern-sidebar-geometry.test.ts`
- `tests/unit/html2canvas-export.test.ts`
- `tests/unit/legacy-pdf-review-refinements.test.ts`
- `tests/unit/red-dossier-coherence.test.ts`
- `tests/unit/templatefix-32-36-cv-masthead.test.ts`
- `tests/unit/templatefix-kolumne-contact-rail.test.ts`
- `tests/unit/templatefix-neon-cleanup.test.ts`
