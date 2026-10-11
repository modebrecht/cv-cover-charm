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
