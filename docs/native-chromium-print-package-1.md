# Native Chromium print — Package 1

## Baseline and scope

- Repository: `modebrecht/cv-cover-charm`
- Starting remote `dev`: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`
- Baseline CI: M6 Release Candidate success; 24 completed checks successful.
- Experiment branch: `dev-native-chromium-print`, originally at that same baseline.
- No changes to `dev`, `main` or `render`; no deployment or promotion.

Package 1 adds an experimental desktop Chromium print action. It makes no claim
that native printing improves quality. The 39-template comparison belongs to
Package 2.

## Shared production document

The existing `DossierPdfCanvas` is mounted once in a portal directly under
`document.body`. It remains measurable outside the viewport during screen use.
Both actions use this same canvas, document state and physical page nodes:

- **PDF herunterladen:** existing `downloadCombinedDossierPdf`, html2canvas and
  jsPDF, with automatic download and existing filename/metadata/text layers.
- **Drucken / als PDF speichern:** readiness preparation, print mode and
  `window.print()`. The user chooses Save as PDF in the normal browser dialog.

Preparation waits for `document.fonts.ready`, loaded/decoded images, the existing
Letter readiness/count signals, and existing CV page-count/layout callbacks.
It checks mounted physical page counts and refuses blocking Letter overflow.
After two animation frames it validates the resolved dossier again.
There are no fixed readiness sleeps; a bounded timeout reports failed preparation.

Preparation marks the original Cover, Letter and CV nodes in canonical DOM order.
Print CSS hides the application's other body children, activates the portal,
removes intervening grid/gap wrappers from print flow, and gives each resolved
page one 210 × 297 mm sheet. A4 portrait has zero page margin and exact print
colour adjustment. Only non-final pages force a page break.

Measurement probes retain their geometry, stay fixed and invisible outside the
print area, and never become physical pages. Hiding them with `display: none`
would invalidate measurements used by the live pagination observers.
`afterprint`, print errors and aborts release print mode. Concurrent preparation
cannot activate a second print root.

No templates, pagination algorithms, saved schemas, DOCX Next code, PDF text
layers, raster normalization or existing PDF parity baselines are changed.

## Changed files

- `.github/workflows/dossier-regression.yml`: guard the experiment branch and
  include native print coverage in `cv-pdf`.
- `src/components/dossier/DossierNativePrintRoot.tsx`: single canonical portal.
- `src/components/dossier/dossier-native-print.css`: scoped print geometry.
- `src/components/dossier/useDossierNativePrint.ts`: action lifecycle and errors.
- `src/lib/dossier-native-print.ts`: readiness, page preparation and print call.
- `src/components/dossier/DossierPdfCanvas.tsx`: expose existing CV readiness;
  stabilize unchanged saved Letter input during readiness updates.
- `src/components/dossier/DossierExportDialog.tsx`: clearly labelled second action.
- `src/routes/index.tsx`, `src/routes/lebenslauf.tsx`,
  `src/routes/titelblatt.tsx`, `src/routes/anschreiben.tsx`: connect both workflows
  to the same existing canvas.
- `tests/unit/dossier-native-print.test.ts`: readiness and canonical node contract.
- `tests/e2e/dossier-native-print.spec.ts`: production DOM, print media and native
  PDF page mapping, delayed assets/signals, errors, overflow and automatic fallback.
- `docs/native-chromium-print-package-1.md`: implementation and validation record.

## Validation

The native scenarios are a simple Cover + Letter + CV dossier, a Gallery dossier
with two Letter pages and multiple CV pages, and a structurally difficult Studio 3
CV. PDF extraction verifies every multi-page content marker on its original DOM
page, with no duplicated/missing markers, blank pages or application UI.

The application uses only `window.print()`. The browser tests instrument that
call, simulate the dialog lifecycle and use Playwright's `page.pdf()` solely to
verify Chromium's native renderer. This is not a product API or a dialog bypass.
Headless tests do not inspect the operating system's interactive dialog.

Commands required for this package:

```sh
bun test tests/unit
bun run typecheck
bun run lint
bun run build
bun run format:check:release
npx playwright test tests/e2e/dossier-native-print.spec.ts --reporter=line --workers=1
```

The existing workflow groups `cv-pdf`, `cv-m9-pagination`, `templates-layout`,
`fresh-dossier-templates` and `dossier-flow` are also run with their existing
assertions and PDF parity baselines.

Local results: **1105 unit tests passed; 148 browser tests passed** across those
five required groups, including all five native-print cases. Typecheck, release
formatting, changed-file formatting, lint and production build passed. Lint has
21 pre-existing warnings and zero errors, with no new warnings. A focused native
print run also passed all five cases. Automatic PDF regression coverage is green.

## Chromium limitations and follow-up

The native dialog's destination, scaling, paper size and browser headers/footers
remain user-controlled. The UI asks for A4, 100% scaling and disabled browser
headers/footers. Native PDF naming and metadata follow the browser workflow;
the automatic PDF retains its own existing filename and metadata.

The experiment targets desktop Chromium. Safari/Firefox and the fidelity of
blur, filters, backgrounds and fine rules across all 39 templates are not
certified by these structural tests.

Next: Package 2 — 39-template native Chromium PDF benchmark.
