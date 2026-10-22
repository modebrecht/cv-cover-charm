# CV footer reserve repair and integration preflight

## Result

The remaining Modern 03 and 07 overflow was caused by an exporter body-budget error. After replacing the native text footer with painted footer artwork, the exporter retained the old template/text-story bottom reserve. The shared browser CV contract uses a 1 mm physical bottom margin plus the visible footer band once. With the standard 4 mm band, the correct reserve is 5 mm, not 26.733 mm.

The repair is implemented in `70a10ed14eb01066119f21a5f7e8d01a548326f6`, with an explicit frozen-Sidebar exclusion in `1c4afca24e66471b635e404f18fd3b034987a145`, on `fix/docx-next-word-pagination-21okt`. The two painted-footer compositions now use the same small shared helper. Native text footers, motivation letters, cover pages and frozen Sidebar geometry keep their existing policies.

Modern 03 and 07 now retain the complete CV, including References, on one native page in the supplementary LibreOffice rendering. The original 02/12 P1 remains closed following the user's Desktop Word save/reopen acceptance. There is no new user micro-test in this continuation.

## Evidence separating the three cases

| Case and action | Web CV pages | Native CV pages after repair | Interpretation |
| --- | ---: | ---: | --- |
| 03 without a page action | 1 | 1 | Previously native 2; footer reserve was the demonstrated cause |
| 03 automatic fit | 1 | 1 | The real automatic action also succeeds locally |
| 07 without a page action | 1 | 1 | Previously native 2; footer reserve was the demonstrated cause |
| 07 automatic fit | 1 | 1 | Longer description survives with References included |
| 05 without a page action | 1 | 2 | General Web/native page-equivalence mismatch remains OPEN |
| 05 automatic fit | 2 | 2 | The action deliberately balances onto two pages, preserving user typography |
| 05 explicit one-page action | 1 | 1 | Existing compact-section/typography action fits all content locally |

05 includes explicit 18 px headings, 9 px heading gaps, content indents and a second reference. The repair does not overwrite those choices to manufacture a one-page default result. The automatic action chooses two pages; the explicit one-page action applies its existing compact layout and density behavior. This is a passing page-action check, not a PASS for the unfitted 05 page-equivalence gate.

All new page results above are supplementary LibreOffice results, not fresh Desktop Word acceptance. The saved/reopened Word result for 02 and 12 is already accepted and is not being reopened as another test request. Future combined integration acceptance must distinguish these scopes.

## Why this is an exporter defect

The normal saved projects contain the shared CV page-margin policy, but the native model initially starts from legacy template margins. Both `composeSourceCompactBands` and `composeMeasuredHeaders` clear the native footer story when they create source-owned page paint. They previously left the text-story reservation in place: 26.733 mm for the default Modern source and 16.733 mm for custom-margin 05. The top edge was already replaced by the shared resolved flow geometry; the bottom edge was not.

The helper uses `CV_PAGE_MARGIN_BOTTOM_MM` and `dossierFooterVisualHeightMmForOptions`. It does not introduce a guessed offset or font reduction. Custom footer heights are retained. It refuses a live native footer and bypasses all nonclassic/Sidebar parts. The native renderer, document data, content controls, text, fonts, positions, images and acceptance gates were not modified by this repair.

For all seven Modern regression cases, the saved source snapshots are identical before and after. The only model difference is `cv.page.margins.bottom`. The only changed ZIP part is `word/document.xml`; canonical XML comparison shows that its only change is the final CV section's bottom-margin attribute. All cover, letter, header, footer, image and other package parts are byte-identical. Brief 12's entire DOCX is byte-identical to its accepted input.

This establishes the erroneous native reservation independently of a renderer-specific rounding hypothesis. The local 2-to-1 result follows directly from correcting that body budget. It does not prove that every remaining browser/Word line-height difference is solved.

## Automated verification

- 97 focused tests across 12 suites pass, including the original header/interior integration suite and three new painted-footer tests. The tests check the shared browser budget, custom footer heights, source immutability, unchanged Letter/Cover margins, live native-footer rejection and frozen-Sidebar exclusion. Strict focused TypeScript checking passes.
- Eight real application regression exports cover Modern 01–07 plus Brief 12, with JSON file restore, live measurements, actual page-fit actions where applicable, reload checks, native UI downloads and same-state normal app PDFs. All 648 checked text fields remain present; CV controls pass their existing ownership mappings.
- Three additional actual app exports exercise automatic fit for 03/05/07. A separate actual app export exercises 05's explicit one-page action. Their expected native page counts are 1/2/1 and 1 respectively. All content and existing heading-pill checks pass.
- All 26 regression pages were rendered. Twenty-two are byte-identical to the previous PNGs; the four changed CV pages were visually inspected. Automatic and explicit-one controls were also inspected. 02's complete CV PNG is byte-identical to its prior rendering. 12 is both package- and render-identical.
- The final projection has 437 exact authoritative files, including 417 application source files, with zero mismatches against the committed changes. The app still uses the previously documented temporary QA SPA and official Chrome for Testing 156.0.8078.47. This is not a certification of the original Lovable production build.

An initial broad test probe encountered three dependency-load failures in unrelated suites in the partial test workspace. They are not counted as passing or as product failures. The bounded 97-test scope was then run successfully. The current Fidelity cover suite was separately restored and passed in the isolated integration projection described below. No complete repository-suite or CI PASS is claimed.

The eight main exports and explicit-one control were generated from `70a10ed`; the final guard only bypasses nonclassic/Sidebar parts. All those exported parts are classic. Both candidate and integration 97-test scopes were rerun after adding the guard; no additional document rerender was necessary for an inapplicable branch.

## Current Fidelity integration preflight

The integration tests used Fidelity source at `dfa787f983166d9b3b4831069f306819c6de4a4f`, 23 commits after the original export base `99e053068bbe28f39fda3861591be997b1bb0b09`. Its seven changed application files were fetched and SHA-verified in an isolated source projection. They retain the latest native cover/avatar and authored-graphics changes. The CV heading-spacing repair applies cleanly to that newer builder, and the painted-footer repair adds no conflict with those files.

On 2026-10-22, the active Fidelity head was rechecked at `7be40063856d1376acb60e917fe85599a6033dad`. Its sole additional commit changes only `docs/qa/docx-next-cover-family-full-app-evidence-21okt.md`; application and test sources are identical to the tested `dfa787f` source. The prepared patch therefore remains applicable without a new code test run.

In that combined local source projection, all 97 focused CV tests and the current 15-test Fidelity cover-family suite pass, as does strict focused TypeScript checking. The cover suite used the official existing jsPDF 4.2.1 UMD via isolated test module links, not a mock or changed product dependency.

`docx-next-cv-pagination-integration-21okt.patch` contains the two CV repairs and their two test files against that exact Fidelity head. A clean patch check and application in a separate directory reproduce all six tested integration files byte-for-byte. No live branch merge or Fidelity modification was performed. This is the CV portion of integration readiness, not a completed three-branch integration or a fresh full-app export of the combined source.

The Sidebar repair remains at `f73c776e2eca6b9b0d858ee2ab997230259797ac`. Its older transport must be refreshed against the newer Fidelity source before the complete integration is created. Do not copy the old combined builder or renderer over the current Fidelity versions. Preserve the already confirmed Sidebar photo fix; no new 22-case Sidebar rerun was performed.

## Next step

Refresh the Sidebar transport against the pinned current Fidelity source, combine it with the checked CV patch in an isolated integration branch, and verify the combined source before producing one consolidated acceptance packet. Recheck the active Fidelity head at that point because it is still being developed. The raw 05 page-equivalence limitation remains explicitly open; the working page actions are recorded separately.

No merge, deployment, CI dispatch, production export switch or modification of dev/main/render/active Fidelity occurred. Machine-readable data and the exact prepared patch are committed beside this report.
