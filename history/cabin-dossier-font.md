# Cabin dossier font rollout

Goal: use Cabin as the actual dossier default in browser previews and in searchable PDF text layers.

## Implementation

- [x] Keep the backward-compatible storage key `freundlich`.
- [x] Render `freundlich` as local Cabin in title page, CV and motivation-letter previews.
- [x] Bundle Cabin Regular, Bold, Italic and Bold Italic under `public/fonts/`.
- [x] Bundle the SIL Open Font License as `public/fonts/Cabin-OFL.txt`.
- [x] Register the four Cabin styles with jsPDF before letter, CV and combined dossier exports.
- [x] Map Cabin DOM text to the embedded `Cabin` PDF family instead of Helvetica.
- [x] Preserve deliberate user-selected alternative fonts and per-element overrides.
- [x] Verify new CV and motivation-letter previews resolve to Cabin.
- [x] Migrate PDF regression tests from raw binary string matching to PDF.js text extraction, because embedded TTF text uses encoded glyph streams plus Unicode mappings.
- [x] Assert the PDF contains a Cabin font resource in addition to extracted searchable text.

## Acceptance

- [ ] Full M5.8 regression is green on the feature branch.
- [ ] Standalone CV PDF extracts expected text on page 1 and page 2.
- [ ] Motivation-letter text is extractable from page 2 of the combined dossier.
- [ ] CV text is extractable from the following dossier pages.
- [ ] Cabin is present as the real embedded PDF font resource.
- [ ] Feature branch is fast-forwarded to `dev` only after all checks are green.
- [ ] Final `dev` regression is green.

`render` and `main` must remain untouched during this rollout.
