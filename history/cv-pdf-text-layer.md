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
- [x] Verify the hidden raster export copy has transparent text before capture.
- [x] Add the new PDF-text regression to the M5.8 CI command.
- [x] Feature-branch Vercel build succeeds.
- [ ] Run/observe lint + M5.8 Playwright regression on a CI-triggering branch/PR.
- [ ] Confirm visually that no raster text remains underneath the real text (no ghost/double glyphs).
- [ ] Confirm a downloaded PDF allows selecting/copying name, school, work experience and hobbies in a normal PDF viewer.
- [ ] Confirm PDF viewer search finds representative CV words.
- [ ] Confirm second-page text is selectable on a deliberately long CV.
- [ ] Confirm combined dossier order remains: title page -> motivation letter -> CV page(s).
- [ ] After green verification, merge feature branch into `dev` only; promotion remains `dev -> render -> main`.

## Acceptance criteria

The feature is ready to merge when all of the following are true:

- CV preview is visually unchanged.
- Standalone CV PDF is visually equivalent to the previous export.
- CV text can be selected and copied.
- Search finds representative CV content.
- PDF source/extraction contains representative CV strings instead of image-only pages.
- Page 1 and page 2 both retain real text.
- Dossier PDF keeps the title page rasterized, motivation letter as real text, and CV as real text.
- Existing M5.8 regressions remain green.

## Files introduced/changed

- `src/lib/cv-pdf-text.ts` — hybrid CV PDF text-layer implementation and jsPDF hook.
- `src/lib/download.ts` — loads the hook early enough for both standalone and dossier PDF exporters.
- `tests/e2e/cv-pdf-text.spec.ts` — real-text regression.
- `.github/workflows/dossier-regression.yml` — includes the new regression in CI.
- `history/cv-pdf-text-layer.md` — this handoff and progress record.

## Notes for the next session

If asked to "go read the CV PDF history", read this file first. The remaining work should be verification/fixes, not a redesign of `CvCanvas` or another PDF layout engine.
