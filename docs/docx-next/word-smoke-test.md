# Microsoft Word smoke acceptance

For the current Sidebar architecture decision, first follow the [eight-case native pagination investigation](sidebar-pagination-status.md). Record full tail visibility and title/description attachment for `smaller-body` and `paragraph-default-margin` before changing native composition or lifting header/margin guards. LibreOffice observations are diagnostic evidence, not Word acceptance.

## Separate Prism review package

The Prism package contains fourteen editable `prism-*` candidates, matching stable LibreOffice PDFs and all 95 candidate PNG pages. Record tester, date, OS, exact Word version and source commit separately. **Brief/Warm/Prism remain unaccepted; 0/39 migrations have Word acceptance.** Complete the general checklist below as well as these cases.

- [ ] Open every Prism case without repair and inspect cover, letter and CV.
- [ ] Edit name/profession/start date in the native cover cells; add/remove photo and check growing rows, circular crop, badge width and preserved text.
- [ ] Inspect two-tone polygons, overlap and readable label/date backdrops; cover artwork belongs only to its first header story.
- [ ] Compare contact, compact and none modes. Header text, reserved body area and first/continuation signature remain coherent after editing.
- [ ] In `prism-custom-surface`, confirm the authored gradient replaces default diagonal chrome; explicit foreground colors remain exact.
- [ ] In `prism-custom-colors` and `prism-continuation`, check contrast and independent saved typography. Deliberately authored colors are preserved rather than automatically rewritten.
- [ ] Edit the rich paragraph, copy/paste formatting, add/delete paragraphs, list items and table cells in `prism-custom`; edit repeated custom fields independently.
- [ ] Add text to the native columns in `prism-columns`; check column balancing, full-width return and the attached closing/signature/attachments. No attachment-only continuation page should appear for the supplied short tail.
- [ ] Edit CV descriptions and add/delete entries in long CV, Timeline and Magazin cases; verify oversized-entry flow, date rails and half-width sections.
- [ ] Inspect all `prism-continuation` pages: signed chrome offsets, distinct first/following fields, footer content, body clearance and the single CV first-page lead.
- [ ] Save edited copies, close Word completely and reopen. Verify text, reflow, pictures, lists, tables, columns and headers/footers remain healthy without repair warnings.
- [ ] Record visual-reference approval separately; these generated references never approve themselves.

## Separate Warm review package

The Warm package contains thirteen editable `warm-*` candidates with stable LibreOffice candidate PDFs/PNGs. Complete the general checklist below for Warm as well as Brief. Record Word/OS version, tester, date and the source commit independently. **Both templates remain unaccepted; 0/39 migrations have Microsoft Word evidence.**

- [ ] Open `warm-normal` without repair; inspect cover, letter and CV, including the default 44 mm contact header and 4 mm gap.
- [ ] Compare `warm-compact`, `warm-none` and `warm-custom-colors`; check readable editable sender/header text and preserved user colors.
- [ ] Inspect cover with/without photo (`warm-images`); crop/frame/centering and native masthead rows remain coherent.
- [ ] Check clipped circles stay within the page and appear only in first-page header stories. Cover continuation retains custom text without repeating the first-page motif.
- [ ] In `warm-compact-long`, edit/add/delete sender and body text. Verify compact sender cell fill grows with text, first/following bands stay correct and no body text hides under chrome.
- [ ] In `warm-long-sender`, lengthen and shorten the address; verify readable cell fill beyond the decorative band and healthy page reflow.
- [ ] Edit both repeated custom cover/CV fields independently in `warm-custom`, including its cover continuation. Verify short box content, frame and padding stay together; no empty box-only page appears.
- [ ] Edit the rich paragraph, copy/paste formatting, list items and table cells in `warm-custom`; add an extra paragraph and delete text.
- [ ] Edit a CV description and add/delete an entry in `warm-timeline` and `warm-magazin`; verify date tracks, oversized entries and half-width sections reflow.
- [ ] Inspect all pages of `warm-continuation`, including signed offsets, distinct first/following chrome, footers and the single first-page CV spacer.
- [ ] Save edited copies, close Word completely and reopen. Verify content, pictures, lists, tables, headers/footers and formatting remain healthy, with no repair warning.
- [ ] Record visual-reference approval separately; candidate PNGs/PDFs never approve themselves.

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

## Human candidate — Microsoft Word acceptance pending

Use the independent `--human` fixture set. Review normal and photo covers, long letter/CV, long values, custom fields, compact/disabled contact heads, signed first/continuation chrome, Timeline, Magazin and zero CV motif visibility. Open/edit/save/close/reopen in actual Microsoft Word; preserve independent field formatting, native photo crop/frame, native tables/lists, logical story ownership and complete text. Inspect photo-left hero reflow, growing earthy contact bands and quiet ellipse paint. Approve visual references separately. LibreOffice evidence does not satisfy this checklist.

## Orbit candidate — Microsoft Word acceptance pending

Use the independent `--orbit` fixture set. Open every candidate without repair, then edit and save/close/reopen in actual Microsoft Word. Review right-aligned label/date and native circular photo, no-photo clearance, left native hero text, explicit saved alignment, growing contact/attachment rows and custom cover continuation. Verify outline transparency, clipped first/continuation page paint, zero CV motifs and changed palette; edit rich content, images, lists/tables and long CV/Timeline/Magazin entries. Check first/continuation chrome and preserved field identities after editing. Candidate LibreOffice pages are review aids; Word acceptance and visual-reference approval must be recorded separately. Sidebar remains explicitly blocked.

## Separate Cove candidate review

Microsoft Word acceptance: **pending**. Test the thirteen `cove-*` cases from the containing source commit and record tester/date/Word version/OS.

- [ ] Open every case without repair; edit cover hero, native photo/crop, letter lists/tables and CV entries.
- [ ] Inspect Independent rectangle corners and header-off motif fallback, chrome off/compact/contact and distinct first/continuation paint; check user palette/font/alignment overrides.
- [ ] Add/remove long letter/CV content and save/close/reopen; verify text, pictures, lists, tables and native reflow.
- [ ] Review documented Word adaptations: Native photos sit in flow below the masthead; the start-date badge is a growing rectangular Word cell, contact/footer fields flow rather than remaining fixed at the browser bottom, and authored fonts may occupy extra CV pages. Approve visual references separately.

## Separate Glow candidate review

Microsoft Word acceptance: **pending**. Test the thirteen `glow-*` cases from the containing source commit and record tester/date/Word version/OS.

- [ ] Open every case without repair; edit cover hero, native photo/crop, letter lists/tables and CV entries.
- [ ] Inspect Independent rectangle corners, radial transparency and header-off motif fallback, chrome off/compact/contact and distinct first/continuation paint; check user palette/font/alignment overrides.
- [ ] Add/remove long letter/CV content and save/close/reopen; verify text, pictures, lists, tables and native reflow.
- [ ] Review documented Word adaptations: Native photos and semantic fields use growing Word flow; browser CSS blur is represented by an explicit radial fade, start badges are native rectangular cells and running footers retain editable content. Approve visual references separately.

## Separate Horizon candidate review

Microsoft Word acceptance: **pending**. Test the thirteen `horizon-*` cases from the containing source commit and record tester/date/Word version/OS.

- [ ] Open every case without repair; edit cover hero, native photo/crop, letter lists/tables and CV entries.
- [ ] Inspect Existing corner, linear-gradient, radial-fade, native-photo and header-off primitives, chrome off/compact/contact and distinct first/continuation paint; check user palette/font/alignment overrides.
- [ ] Add/remove long letter/CV content and save/close/reopen; verify text, pictures, lists, tables and native reflow.
- [ ] Review documented Word adaptations: Native centered hero paragraphs stay below the 108 mm masthead, photos preserve authored native size/crop instead of CSS transforms, browser blur uses radial fade, start badges grow as Word cells and native footer content remains editable. Approve visual references separately.

## Mono Luxe candidate review

Microsoft Word acceptance: pending. Review the 13 cases in [mono-luxe evidence](mono-luxe-stress-report.md), especially editable cover/photos, long letter/CV flow, first/continuation and disabled headers, custom surfaces and palette changes. Open, edit, save, close and reopen in Microsoft Word; approve the explicit flow adaptations in [Mono Luxe coverage](mono-luxe-feature-coverage.md). LibreOffice evidence cannot complete this checklist.

## Ledger candidate review

Microsoft Word acceptance: pending. Review [Ledger coverage](ledger-feature-coverage.md) and the 13 cases in [evidence](ledger-stress-report.md). Open, edit, save, close and reopen native cover groups/photos, long letter/CV, custom content, palettes and first/continuation/off chrome in Microsoft Word. Verify the explicit flow adaptations; reject sidebar simulation. LibreOffice does not complete this checklist.

## Ribbon candidate review

Microsoft Word acceptance: pending. Review [Ribbon coverage](ribbon-feature-coverage.md) and the 13 cases in [evidence](ribbon-stress-report.md). Open, edit, save, close and reopen native cover groups/photos, long letter/CV, custom content, palettes and first/continuation/off chrome in Microsoft Word. Verify the explicit flow adaptations; reject sidebar simulation. LibreOffice does not complete this checklist.

## Sunrise candidate review

Microsoft Word acceptance: pending. Review [Sunrise coverage](sunrise-feature-coverage.md) and the 13 cases in [evidence](sunrise-stress-report.md). Open, edit, save, close and reopen cover groups/photos, long letter/CV, custom content, palettes and first/continuation/off chrome. Verify native flow adaptations and reject sidebar simulation. LibreOffice does not complete Word acceptance.

## Forest Flow candidate review

Microsoft Word acceptance: pending. Review [Forest Flow coverage](forestFlow-feature-coverage.md) and the 13 cases in [evidence](forestFlow-stress-report.md). Open, edit, save, close and reopen cover groups/photos, long letter/CV, custom content, palettes and first/continuation/off chrome. Verify native flow adaptations and reject sidebar simulation. LibreOffice does not complete Word acceptance.

## Violet Pulse candidate review

Microsoft Word acceptance: pending. Review [Violet Pulse coverage](violetPulse-feature-coverage.md) and the 13 cases in [evidence](violetPulse-stress-report.md). Open, edit, save, close and reopen cover groups/photos, long letter/CV, custom content, palettes and first/continuation/off chrome. Verify native flow adaptations and reject sidebar simulation. LibreOffice does not complete Word acceptance.

## Studio 3 candidate review

Microsoft Word acceptance: pending. Review [coverage](studio3-feature-coverage.md) and all 13 [cases](studio3-stress-report.md). Open/edit/save/close/reopen native cover/photo groups, rich content, long flow, palettes and first/continuation/off chrome. Verify documented visual adaptations and explicit sidebar rejection.

## Warm 2 candidate review

Microsoft Word acceptance: pending. Review [coverage](warm2-feature-coverage.md) and all 13 [cases](warm2-stress-report.md). Open/edit/save/close/reopen native cover/photo groups, rich content, long flow, palettes and first/continuation/off chrome. Verify documented visual adaptations and explicit sidebar rejection.

## Warm 3 candidate review

Microsoft Word acceptance: pending. Review [coverage](warm3-feature-coverage.md) and all 13 [cases](warm3-stress-report.md). Open/edit/save/close/reopen native cover/photo groups, rich content, long flow, palettes and first/continuation/off chrome. Verify documented visual adaptations and explicit sidebar rejection.

## Separate Verlauf 2 candidate review

Use all fourteen `--verlauf2` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Full-sheet three-color paint and native white roles follow the active design. White blooms use radial fades instead of CSS blur. Native photo sizing, flowing hero/contact rows, rectangular start badge and quiet 9 mm interior stationery need visual/Word approval; browser CV cards and title pills are not claimed as exact parity. Approved visual references and Microsoft Word acceptance: **pending**. 18/39 configured candidates; 0/39 Word accepted.

## Separate Verlauf 3 candidate review

Use all fourteen `--verlauf3` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Native photo/hero/contact flow and rectangular start badge adapt the absolute browser cover. White blooms use radial fades instead of CSS blur; CV cards/title pills and exact chrome parity require design/Word approval. Its 27 mm left gutter yields nine continuation letter pages; prior benchmarks are unchanged. Approved visual references and Microsoft Word acceptance: **pending**. 19/39 configured candidates; 0/39 Word accepted.

## Separate Diagonal candidate review

Use all thirteen `--diagonal` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Native header cells and a padded attachment/recipient callout extend the absolute triangle paint to keep growing native text readable. The profession introduction retains authored run sizing instead of the CSS 0.38em transform. Compact chrome uses quiet page-corner stationery; extra browser story triangles are a documented visual-review limit. Approved visual references and Microsoft Word acceptance: **pending**. 20/39 configured candidates; 0/39 Word accepted.

For Verlauf 2/3, inspect `cover-long` page two before/after editing and save/reopen: full-sheet gradient and native white text must remain visible. Verify declared paint stacking and changed palette on both first/default stories.

## Separate Editorial (Klassisch) candidate review

Use all fourteen `--klassisch` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Authored absolute text positions become native flow; contact rows grow rather than stay bottom anchored. Browser-only text transforms remain Word review work. Saved typography takes precedence. Long-cover text spans three cover pages; no text is rasterized.. Approved visual references and Microsoft Word acceptance: **pending**. 21/39 configured candidates; 0/39 Word accepted.

## Separate Edel candidate review

Use all fourteen `--edel` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Absolute cover text becomes native flow and growing footer cells. Word interior frames use near-edge 9/12 mm spacing and the semantic paper palette. Browser paired header/footer rules and diamonds remain a design-parity acceptance blocker; native contact/footer content uses the shared flow policy. Authored colors/fonts/geometry remain authoritative. No semantic text is rasterized.. Approved visual references and Microsoft Word acceptance: **pending**. 22/39 configured candidates; 0/39 Word accepted.

## Separate Seriös candidate review

Use all 13 `--serioes` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Native flow replaces browser absolute text and bottom anchors; the full-width cover separator follows text and growing contact cells. Cover artwork retains authored geometry. Interior contact/footer text follows the common native policy. Native Word border widths are quantized to eighth-points; unsupported gradients and thicknesses fail explicitly. Browser geometry and approved Word visual parity remain pending.. Approved visual references and Microsoft Word acceptance: **pending**. 23/39 configured candidates; 0/39 Word accepted.

## Separate Colorful candidate review

Use all 13 `--colorful` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Cover positions become native flow; the browser CV gradient header card and forced-white masthead typography need Word reference review. Native contact bands grow to fit content, and exact browser coordinates are not claimed.. Approved visual references and Microsoft Word acceptance: **pending**. 24/39 configured candidates; 0/39 Word accepted.

## Separate Blockig candidate review

Use all 14 `--blockig` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: The 19 mm rail has no sidebar content; actual Sidebar requests fail. Fixed cover contact paint becomes a padded native cell whose source fill and opacity survive multi-page contact flow. Native photo/default coordinates and browser filled CV chrome need Word reference approval.. Approved visual references and Microsoft Word acceptance: **pending**. 25/39 configured candidates; 0/39 Word accepted.

## Separate Horizont candidate review

Use all 14 `--welle` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: The lower full-page field becomes a padded native contact row with a moving native top border; fixed browser Y and sheet-wide depth are not copied into native text flow. Browser chrome gradients, exact photo outlines and approved geometry remain Word review work. The normal serif/full-contact synthetic CV needs three pages; the production PDF remains functional.. Approved visual references and Microsoft Word acceptance: **pending**. 26/39 configured candidates; 0/39 Word accepted.

## Separate Modern candidate review

Use all 13 `--modern` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Absolute footer anchors become flowing native columns; the badge uses editable rectangular Word shading; the Modern template is distinct from the blocked Sidebar CV composition. Approved visual references and Microsoft Word acceptance: **pending**. 27/39 configured candidates; 0/39 Word accepted.

## Separate Rahmen candidate review

Use all 14 `--pastell` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: Absolute contact/footer anchors become editable flowing columns; Word uses native serif metrics and photo frames without the browser-only outline; rectangular page geometry remains explicit review work. Approved visual references and Microsoft Word acceptance: **pending**. 28/39 configured candidates; 0/39 Word accepted.

## Separate Sonne candidate review

Use all 15 `--sonne` fixtures and record tester, OS, exact Word version and source commit. Edit native cover text/photo, grow contact/attachment rows, verify long CV/Timeline/Magazin and rich content, then save/close/reopen. Check custom palettes, explicit field colors, compact/off/first/continuation stories and zero CV motifs. Review these adaptations: The absolute full-width yellow head field becomes an inset growing native row; the fixed circular backdrop becomes a rectangular dark native image zone around the circular editable picture; the badge uses rectangular Word shading; flowing contact columns replace bottom anchors. Approved visual references and Microsoft Word acceptance: **pending**. 29/39 configured candidates; 0/39 Word accepted.

## Brief native Sidebar review — pending

Microsoft Word acceptance: pending. Review the [limited shared Sidebar checkpoint](sidebar-status.md) and its evidence. Open/edit/save/reopen left/right, native cropped photo, long main/side and oversized-description cases. Confirm short-entry attachment, independent story order and complete final work/reference text. Compare the controlled blocked header and differing-margin probes in Word before designing a replacement primitive; LibreOffice lost the header probe's tail and repeated a cell top inset. Never remove guards based only on a successful package check. The editor's free-photo migration also needs a native geometry policy. No Sidebar template is Word accepted at this checkpoint.
