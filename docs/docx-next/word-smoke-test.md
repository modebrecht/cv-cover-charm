# Microsoft Word smoke acceptance

## Review package

The current package contains twelve editable DOCX candidates, matching stable LibreOffice 25.8.7.3 **Kit API** candidate PDFs, DOCX/PDF SHA-256 hashes, separate generation/QA-tool commits, runtime/package/font records and a blank `WORD_REVIEW_RECORD.json`. Start with `01-normal`; then review long Letter, long CV, Timeline, Magazin, ICC photo, custom elements/images, rich tables/lists, long columns/chrome, continuation margins, styled chrome and text opacity. These twelve representative cases are the minimum review pass; the additional fixtures below cover specific settings in depth.

Keep the original candidates and save edited copies. Record tester, date, OS, exact Word version, fixture, repair prompts, edit/reflow results and save/close/reopen results. Any failed case blocks acceptance until addressed. PDF/PNG candidates aid inspection; generated references are never automatically approved.

## Required open/edit/save/reopen pass

- [ ] Open each representative DOCX without a repair dialog or missing content warning.
- [ ] Cover is visually coherent.
- [ ] Letter is visually coherent.
- [ ] CV is visually coherent, including continuation pages.
- [ ] User text is selectable and editable.
- [ ] Edit a name; repeated values remain independently styled.
- [ ] Add text inside an existing letter paragraph.
- [ ] Delete text inside an existing paragraph.
- [ ] Add an extra letter paragraph.
- [ ] Edit a CV description, including an oversized entry.
- [ ] Copy/paste formatted content and check its resulting formatting.
- [ ] Check page reflow after adding and deleting content.
- [ ] Check first/continuation headers and footers.
- [ ] Check photo, other images, crop/frame and captions.
- [ ] Check native lists and their independent numbering.
- [ ] Check native tables, including nested/ragged content.
- [ ] Check Timeline and Magazin compositions and editable half-width sections.
- [ ] Save edited copies as DOCX.
- [ ] Close Word completely.
- [ ] Reopen the saved copies.
- [ ] Verify text, formatting, images, lists, tables and page flow remain healthy.
- [ ] Verify no repair warning appears after save/reopen.
- [ ] Record visual-reference approval separately, with explicit human review.

## Extended setting checks

Presentation cases: open `layout-contact-aligned`, `layout-references-paired`, `layout-references-stacked`, `layout-rubrics-short`, `layout-letter-rules` and `layout-settings-long`. Edit an aligned value and a paired reference, add/delete an entry, then save/reopen. Verify the odd reference stays left, long rows reflow, short rules stay with headings, badges remain editable text, indents remain within the page and removing contact data leaves no empty decoration. Candidate PDFs are review aids, not approved Word references.

CV composition cases: open `variant-minimal-short`, `variant-timeline-short`, `variant-editorial-short`, their long/image counterparts, and `pagination-zero`, `pagination-ten`, `pagination-forty`, `pagination-chrome`. Add/delete a dated entry and edit a long description. Verify fixed date widths, short-entry attachment, oversized-entry continuation, editable half-width custom sections and entry-owned borders. Confirm the first-page spacer occurs only once and actual chrome keeps body text clear. A larger continuation margin than the first-page margin is blocked rather than silently adapted.

Status: **PENDING**. No Windows/macOS Microsoft Word environment was available during this checkpoint. LibreOffice output is automated evidence only.

Record application version, OS, fixture name, tester and date for each result.

- [ ] Windows Word opens `normal`, `long-letter`, `long-cv`, `png`, `icc-jpeg`, `half-sections`, `rich-letter`, `rich-table-lists`, `positioned-images`, `photo-left`, `photo-right`, `photo-free`, `photo-circle`, `photo-zoom`, `columns-two`, `columns-three`, `columns-long`, `columns-chrome`, `columns-long-chrome`, `chrome-custom`, `chrome-custom-stacked`, `paper-colors`, `paint-gradient`, `paint-long-letter`, `paint-long-cv`, `offsets-negative`, `offsets-zero`, `offsets-positive` `cover-typography`, `cover-lists`, `cover-long-list`, `cover-tracking-zero`, `cover-tracking-wide`, `cover-line-single`, `cover-line-double` `elements-short`, `elements-long`, `elements-page-two`, `elements-images`, `elements-shapes`, `elements-shapes-paper`, `elements-artwork-failure`, `elements-empty-disabled` and `editor-roundtrip` without repair prompt.
- [ ] macOS Word opens those fixtures if available.
- [ ] All three dossier parts and all pictures are visible.
- [ ] Text is selectable and editable; `ä ö ü Ä Ö Ü é è à – — ·` survives edits.
- [ ] Change a name and a repeated identical entry independently.
- [ ] Add one letter paragraph; inspect the new page boundary and continuation chrome.
- [ ] Add/delete one CV entry; headings remain attached reasonably and no decoration fragments remain.
- [ ] Move a floating image; text wraps sensibly. Crop/zoom, circular clipping and photo outlines survive save/reopen.
- [ ] Confirm editor-roundtrip's renamed first school title is italic and the second repeated title is underlined, independently.
- [ ] Edit paragraphs inside nested/ragged tables and confirm native list markers survive reflow.
- [ ] Add/delete text in the two/three-column letter block; verify balancing, continuation columns and the return to full-width paragraphs.
- [ ] Change one custom chrome field with repeated values; verify independent styles in first/continuation headers and inline/stacked footers, then save/reopen.
- [ ] Confirm independent paper colors and gradient chrome repeat behind editable text; inspect continuation pages and pictures.
- [ ] Compare negative/zero/positive offsets, edit recipient and running chrome text, and verify sensible reflow with the documented Word baselines.
- [ ] Edit the uppercase cover name and toggle Word's All Caps formatting; original mixed-case Unicode remains editable.
- [ ] Compare cover tracking/line-spacing probes and confirm styles survive save/reopen.
- [ ] Add/delete list items; cover, separated letter and table-cell counters stay independent. The 55-item cover list continues on page 2 without losing content.
- [ ] Rename one custom CV text element with a repeated value; its independent bold/underline style survives edits and save/reopen.
- [ ] Add/delete paragraphs inside a custom flow box. Its native fill/padding/borders and text remain editable, long text crosses pages without clipping, and deletion leaves no empty fixed-height text container.
- [ ] Inspect custom image/caption content and change the caption independently of the picture. Aspect/crop and shared pixels survive save/reopen.
- [ ] Confirm page-2 custom elements and page-2 sections share one continuation break. When main CV flow exceeds one page, this zone starts after that flow rather than overlaying physical page 2.
- [ ] Confirm shapes sit behind text over white/colored paper, with opacity, outlines, gradients and transparent corners. Body decorations occur only in their target zone, while paper/chrome repeat. Deleting text does not leave corrupt drawing fragments.
- [ ] Open the failed-artwork fixture: all native text remains and no orphan media relationship or artwork-only blank page appears.
- [ ] Open `fonts-mixed`, `fonts-unavailable`, `fonts-offline`, `fonts-long-letter` and `fonts-long-cv`; inspect all eight native font probes and long-content pagination without a repair prompt.
- [ ] With requested fonts installed, confirm letter role and CV fonts remain independently editable; editor-roundtrip's subject is Verdana and CV is Times New Roman.
- [ ] On a computer missing the requested families, record the actual substitute families and review sensible reflow. The explicitly resolved unavailable-font fixture uses the declared alternatives; if those are also missing, Word controls further substitution.
- [ ] Edit/save/reopen the font fixtures with embedding disabled and verify readable Unicode, independent field formatting and no missing font asset errors. Enabled embedding is not implemented or certified.
- [ ] Save as DOCX, close Word, reopen without repair or missing content.
- [ ] Review candidate DOCX-oriented reference snapshots and record approval separately from browser/PDF similarity.

Until these results and the outstanding product settings are accepted, Brief remains an isolated candidate and Gates 5/6 remain open. Ambiguous anonymous styles, free CV section positioning, continuation margins larger than the first-page margin, semantic image opacity, enabled font embedding and sidebar/Modern remain explicitly blocked; this package does not certify them.
