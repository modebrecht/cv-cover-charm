# CV PDF real text layer

Implementation branch: `feature/cv-pdf-text-layer`  
Landed on: `dev`

## Goal

Keep the CV visually identical to the browser preview while changing the PDF from a full-page screenshot into a hybrid document:

- background, template decoration, photos, shapes and **visible browser typography** stay rasterized;
- the same CV text is also written back as **invisible** real PDF text objects at the browser-measured positions;
- the result remains searchable/selectable while the visible font is guaranteed to match the browser and motivation letter.

## Architecture decision

Do **not** create a parallel visible PDF typography engine for the CV. `CvCanvas` remains the single source of truth for layout, pagination **and visible glyph rendering**.

The PDF layer walks the already-rendered export DOM, measures the real text with `Range#getClientRects()`, maps the browser coordinates to A4 millimetres and writes an invisible search/copy layer through jsPDF. This automatically follows:

- page 1 / page 2 pagination;
- classic, sidebar, timeline, editorial and other CV layouts;
- freely positioned sections;
- custom sections and custom text elements;
- current typography scale, bold/italic state, alignment position and text colour.

The standalone CV exporter and combined dossier exporter currently create their own jsPDF instances. A small jsPDF `initialized` plugin is therefore installed once and attaches the CV text layer at PDF output time. This avoids duplicating or rewriting the large route export functions.

## 2026-09-12 visual parity correction

A real-PDF review showed that the former hybrid implementation was technically Cabin on both letter and CV pages but still looked like two different fonts. The reason was architectural: the motivation letter kept browser-rendered Cabin visible in its raster and used only an invisible native text layer, while the CV hid browser text and visibly redrew each token with jsPDF. jsPDF's glyph metrics/rasterization made the CV appear narrower, darker and more condensed even though the embedded family name was Cabin.

The corrected contract is now the same for both documents:

- **visible typography = browser/html2canvas raster**;
- **native PDF typography = invisible search/copy layer only**;
- the CV raster text mask remains only as an inert compatibility hook for existing diagnostics;
- no native visible underline/text decoration is drawn over the browser raster;
- browser-measured token geometry is still used for the invisible layer so selection remains aligned.

This also avoids the earlier Modern regression where a visible native layer could make words such as `Mathematik und Informatik` appear visually merged.

## Battle plan / progress

- [x] Create isolated feature branch from current `dev`.
- [x] Keep `CvCanvas` and CV data model unchanged.
- [x] Keep browser-rendered CV typography visible during html2canvas capture.
- [x] Add DOM-measured invisible real PDF text layer.
- [x] Map sans/serif/monospace browser fonts to PDF families and Cabin to embedded Cabin.
- [x] Preserve bold and italic styling in the searchable layer.
- [x] Respect CSS uppercase/lowercase/capitalization.
- [x] Handle wrapped long tokens such as email addresses.
- [x] Support all visible text nodes rather than hard-coding known CV fields.
- [x] Cover custom sections/custom text automatically through DOM traversal.
- [x] Cover freely positioned sections automatically through browser measurement.
- [x] Cover multiple CV pages automatically.
- [x] Add the text layer to standalone `Lebenslauf` PDFs.
- [x] Add the text layer to CV pages inside the combined dossier PDF (after title page + motivation letter).
- [x] Keep title page raster behaviour unchanged.
- [x] Keep motivation-letter PDF implementation unchanged.
- [x] Regression now requires export-mode CV text to remain visible instead of transparent.
- [x] Preserve searchable/copyable CV text and embedded Cabin.

## Acceptance criteria

The feature is complete only when:

- CV preview/layout code is unchanged;
- visible CV typography comes from the same browser rendering path as the motivation letter;
- native CV PDF text remains searchable/selectable but invisible;
- page 1 and page 2 both retain real text;
- the dossier PDF keeps the expected title page -> motivation letter -> CV order;
- Modern and representative templates pass a real PDF -> PNG visual comparison, with no condensed-looking CV font and no merged-word regression;
- full regression and final PDF gallery are green.

## Files introduced/changed

- `src/lib/cv-pdf-text.ts` — hybrid CV PDF text-layer implementation and jsPDF hook.
- `src/lib/download.ts` — loads the hook early enough for both standalone and dossier PDF exporters.
- `tests/e2e/cv-pdf-text.spec.ts` — standalone, second-page and combined-dossier real-text regressions.
- `.github/workflows/dossier-regression.yml` — includes the regression in CI.
- `history/cv-pdf-text-layer.md` — this handoff and verification record.
