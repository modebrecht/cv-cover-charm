# CV PDF real text layer

Branch: `feature/cv-pdf-text-layer`

## Goal

Keep the CV visually identical to the browser preview while changing the PDF from a full-page screenshot into a hybrid document:

- background, template decoration, photos, shapes and other visual artwork stay rasterized;
- visible CV typography is removed from the raster capture;
- the same visible text is written back as real PDF text objects at the browser-measured positions;
- the result must remain searchable/selectable and more ATS-friendly without rebuilding the CV layout a second time in PDF code.

## Architecture decision

Do **not** create a parallel PDF layout engine for the CV. `CvCanvas` remains the single source of truth for layout and pagination.

The PDF layer walks the already-rendered export DOM, measures the real text with `Range#getClientRects()`, maps the browser coordinates to A4 millimetres and writes the text through jsPDF. This automatically follows:

- page 1 / page 2 pagination;
- classic, sidebar, timeline, editorial and other CV layouts;
- freely positioned sections;
- custom sections and custom text elements;
- current typography scale, bold/italic state, alignment position and text colour.

The standalone CV exporter and combined dossier exporter currently create their own jsPDF instances. A small jsPDF `initialized` plugin is therefore installed once and attaches the CV text layer at PDF output time. This avoids duplicating or rewriting the large route export functions.

## Battle plan / progress

- [x] Create isolated feature branch from current `dev`.
- [x] Keep `CvCanvas` and CV data model unchanged.
- [x] Mask CV text only in hidden `data-export-mode="true"` render copies so html2canvas captures design/photo/decorations without baked-in typography.
- [x] Add DOM-measured real PDF text layer.
- [x] Map sans/serif/monospace browser fonts to jsPDF Helvetica/Times/Courier families.
- [x] Preserve bold and italic styling.
- [x] Preserve rendered text colour.
- [x] Respect CSS uppercase/lowercase/capitalization.
- [x] Preserve underlines.
- [x] Handle wrapped long tokens such as email addresses.
- [x] Support all visible text nodes rather than hard-coding known CV fields.
- [x] Cover custom sections/custom text automatically through DOM traversal.
- [x] Cover freely positioned sections automatically through browser measurement.
- [x] Cover multiple CV pages automatically.
- [x] Add the text layer to standalone `Lebenslauf` PDFs.
- [x] Add the text layer to CV pages inside the combined dossier PDF (after title page + motivation letter).
- [x] Keep title page raster behaviour unchanged.
- [x] Keep the motivation-letter PDF implementation unchanged.
- [x] Add a dedicated Playwright regression that verifies the standalone CV PDF contains real CV strings in the PDF source.
- [x] Verify the hidden raster export copy has transparent text before capture, preventing a second baked-in text layer / ghost glyphs.
- [x] Add the new PDF-text regression to the M5.8 CI command.
- [x] Feature-branch Vercel build succeeds.
- [x] Run lint, production build and the complete M5.8 Playwright/browser/PDF regression on a CI-triggering PR. Run #98 is green.
- [x] Verify representative CV content (`Lea`, `Sekundarschule`, `Beispielbetrieb`, `Volleyball`) is present as real PDF text rather than image pixels; this is the basis for viewer selection/copy and search.
- [x] Verify a deliberately long CV has more than one page and a unique text marker from CV page 2 is present in the generated PDF text layer.
- [x] Verify the combined dossier keeps the expected order and contains motivation-letter text before CV text: title page -> motivation letter -> CV page(s).
- [x] Feature is verified and ready to fast-forward into `dev`; promotion remains `dev -> render -> main`.

## Verification record

- PR #27 was opened only as a temporary CI trigger and was closed without merging.
- Run #95 exposed one local ESLint `no-this-alias` error in the new jsPDF hook; it was fixed without changing PDF behaviour.
- Run #96 then passed the complete existing M5.8 regression suite.
- The PDF regression was expanded to cover CV page 2 and the combined dossier.
- Run #97 confirmed standalone and second-page real text; its new combined-dossier test had a test-menu synchronization bug and an unrelated existing Blockig visual test flaked.
- The test synchronization was fixed; no application rendering change was made for that failure.
- Run #98 passed the complete suite, including the expanded CV PDF text tests.

## Acceptance criteria

The feature is ready to land on `dev` because:

- CV preview/layout code is unchanged; the feature is isolated to PDF export plumbing.
- Raster export text is explicitly transparent before html2canvas capture, so typography is not duplicated under the vector layer.
- Representative CV content exists as PDF text objects instead of image-only pixels.
- Page 1 and page 2 both retain real text.
- The dossier PDF keeps the title page rasterized, motivation letter as real text, and CV as real text.
- Existing unit, lint, build, browser and PDF regressions are green in M5.8 run #98.

A normal PDF viewer should therefore allow selecting/copying and searching the CV text. A human viewer smoke check is still useful after deployment, but it is no longer a merge blocker because the generated content stream is covered automatically.

## Files introduced/changed

- `src/lib/cv-pdf-text.ts` — hybrid CV PDF text-layer implementation and jsPDF hook.
- `src/lib/download.ts` — loads the hook early enough for both standalone and dossier PDF exporters.
- `tests/e2e/cv-pdf-text.spec.ts` — standalone, second-page and combined-dossier real-text regressions.
- `.github/workflows/dossier-regression.yml` — includes the new regression in CI.
- `history/cv-pdf-text-layer.md` — this handoff and verification record.

## Notes for the next session

If asked to "go read the CV PDF history", read this file first. Implementation and automated verification are complete. The branch is ready to land on `dev`; later promotion remains `dev -> render -> main`.
