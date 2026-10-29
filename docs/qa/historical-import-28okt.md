# Historical JSON import and DOCX checks

The opt-in suite contains 67 distinct historical project files and three derived
DOCX restore controls. The catalog records the exact SHA-256 of each original
file; the originals stay unchanged. The controls derive from the reviewed
`tests/fixtures/docx-next/sidebar-contact-chrome-23okt.json` snapshot. Restoring
the baseline control was checked to reproduce that complete snapshot exactly.

The historical cases use the real home-page file input, download JSON, clear
browser state, reload the downloaded file, decode saved photos and hydrate all
three editors. They preserve document data and explicit font/template/colour
choices while permitting the existing shared-chrome migration. Historical files
without portable CV layout state correctly reset an old Sidebar choice and
retain the current DOCX support boundary.

The three DOCX controls cover the supported Modern/Sans/Sidebar/contact-header/
compact-footer composition, a mirrored Sidebar, and legacy embedded letter
chrome. They download actual DOCX files through the application UI. Export
errors retain the UI message and a separately reproduced diagnostic instead of
being hidden behind a download timeout. The suite does not expand DOCX support.

## Run

Use locked application dependencies, Playwright 1.56.1 and Chromium build 1194.
Install Playwright's Chromium dependencies, including `fonts-liberation`:

```sh
playwright install --with-deps chromium
playwright test --config tests/qa/playwright.historical-import.config.ts --list
playwright test --config tests/qa/playwright.historical-import.config.ts
python scripts/historical_import_docx_qa.py
```

The dedicated suite uses port 4174 and one worker; pagination QA keeps port 4173.
`HISTORICAL_IMPORT_REPORT` selects a separate Playwright report path. Output is
under `artifacts/historical-import-28okt/`. This suite is not added to normal
release CI. On restricted Work hosts, the bundled LibreOffice Liberation Sans
faces can be registered in the user font directory when package installation is
unavailable; confirm `fc-match Arial` and `fc-match 'Liberation Sans'` before QA.

The independent Python audit verifies ZIP integrity, XML parsing, relationships,
logical fields, A4 section sizes and one ordinary CV photo outside content
controls. LibreOffice rendering can supply additional visual evidence. Neither
check proves desktop Word save/reopen acceptance.
