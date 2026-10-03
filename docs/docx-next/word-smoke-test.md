# Microsoft Word smoke acceptance

Status: **PENDING**. No Windows/macOS Microsoft Word environment was available during this checkpoint. LibreOffice output is automated evidence only.

Record application version, OS, fixture name, tester and date for each result.

- [ ] Windows Word opens `normal`, `long-letter`, `long-cv`, `png`, `icc-jpeg`, `half-sections`, `rich-letter`, `rich-table-lists`, `positioned-images`, `photo-left`, `photo-right`, `photo-free`, `photo-circle`, `photo-zoom`, `columns-two`, `columns-three`, `columns-long`, `columns-chrome`, `columns-long-chrome`, `chrome-custom`, `chrome-custom-stacked`, `paper-colors`, `paint-gradient`, `paint-long-letter`, `paint-long-cv`, `offsets-negative`, `offsets-zero`, `offsets-positive` `cover-typography`, `cover-lists`, `cover-long-list`, `cover-tracking-zero`, `cover-tracking-wide`, `cover-line-single`, `cover-line-double` and `editor-roundtrip` without repair prompt.
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
- [ ] Save as DOCX, close Word, reopen without repair or missing content.
- [ ] Review candidate DOCX-oriented reference snapshots and record approval separately from browser/PDF similarity.

Until these results and the outstanding product settings are accepted, Brief is a prototype and Gates 5/6 remain open.
