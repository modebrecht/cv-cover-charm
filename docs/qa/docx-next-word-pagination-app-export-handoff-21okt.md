# CV pagination app exports and Word handoff

## Current result

The browser blocker is resolved. Twelve fresh DOCX files and twelve matching application PDFs were downloaded through the application using official Chrome for Testing headless shell 156.0.8078.47. Modern 02 and Brief 12, using the real automatic-fit action, each contain one complete CV page including References in the supplementary LibreOffice rendering. Their complete dossiers have three pages: cover, letter, CV.

**Desktop Word acceptance remains UNVERIFIED. This is not a batch-wide pagination PASS and does not authorize a merge.** Cases 03, 05 and 07 still have one CV page in the browser and two in LibreOffice. These open discrepancies are retained in the evidence and packet, not hidden by changing the gate.

The repair remains product commit `1ae6bd9a155d179b146aee4c99fed18a1aa647c2` on `fix/docx-next-word-pagination-21okt`. This continuation changes documentation only. The shared reading-row CV heading fallback now matches the browser's 0.5 mm default instead of adding 7 px, while respecting explicit user values, including zero. Seven default headings previously added approximately 9.46 mm of surplus native spacing. No further font shrinking, compensating offsets or user-value overrides were introduced.

## What was executed

The existing `scripts/docx-next-word-batch19okt.ts` restored each project through the actual JSON file input, clicked the applicable page-fit control, captured live layout metrics, reloaded the saved project, and downloaded the native DOCX through the guarded export dialog. Each downloaded DOCX was byte-identical to the app's captured native export. Saved state survived reload and export; every model had zero issues. The matching normal app PDF was also downloaded through the dialog.

The batch used `WORD_BATCH_SMART_FIT=1`, so the historical case IDs `02-Modern-Zwei-CV-Seiten` and `12-Brief-Zwei-CV-Seiten` are automatic-fit cases here. Their acceptance copies are named `02-Modern-Automatik-CV-ab-Seite-3.docx` and `12-Brief-Automatik-CV-ab-Seite-3.docx`. This renaming does not change their bytes. The verifier expects one page for those auto cases; the original two-page verifier was used unchanged for the separate explicit-two-page controls. No product gate was relaxed.

The separate control run used `WORD_BATCH_CASES=02,12 WORD_BATCH_SMART_FIT=0`. Both Modern and Brief retained two CV pages in the browser, application PDF and native rendering. These controls are internal evidence, not another user micro-test.

## Results

The native column below refers to unmodified LibreOfficeDev 26.8. No row claims Microsoft Word acceptance.

| Case | Page action in runner | Web CV pages | Native CV pages | Result |
| --- | --- | ---: | ---: | --- |
| 01 Modern | Explicit one | 1 | 1 | Supplementary page check passes |
| 02 Modern | Auto | 1 | 1 | Target passes supplementary check; References included |
| 03 Modern contact inline | None | 1 | 2 | OPEN page-count mismatch |
| 04 Modern contact stacked | References assigned to page 2 | 2 | 2 | Explicit section page retained |
| 05 Modern custom values | None | 1 | 2 | OPEN page-count mismatch; explicit spacing retained |
| 06 Modern photo | None | 1 | 1 | Supplementary page check passes |
| 07 Modern long description | None | 1 | 2 | OPEN page-count mismatch |
| 08 Brief standard | None | 1 | 1 | Supplementary page check passes |
| 09 Brief long cover | None | 1 | 1 | Supplementary page check passes |
| 10 Brief portrait cover | None | 1 | 1 | Supplementary page check passes |
| 11 Brief | Explicit one | 1 | 1 | Supplementary page check passes |
| 12 Brief | Auto | 1 | 1 | Target passes supplementary check; References included |

All 979 checked model text fields occur in the supplementary native PDFs. The twelve document bodies contain 954 content controls. CV controls were additionally checked against the existing exporter ownership mappings: joined first/last name owns `cv.person.name`, and Brief's footer name owns `cv.footer.content`. Contact values placed in first/continuation headers were checked in those parts, not mistaken for missing body fields. This confirms initial export structure and text; Word save/reopen ownership is still unverified.

Original PNG bytes were preserved for the two cover test cards in 06 and 10. That is not a new Sidebar-photo acceptance result. Modern's native heading pills passed the existing ink-containment checks. All 40 rendered dossier pages were inspected; 25 distinct PNGs covered the byte-identical duplicates. Some normal app-PDF cover text remains non-extractable because it is painted in an image layer; those gaps remain recorded rather than presented as searchable-text PASS.

The three unfitted mismatches do not establish that the 0.5 mm repair regressed their layout. They also do not establish safe native page capacity for arbitrary headers, long descriptions or explicit large spacing. Their current result stays OPEN. The repair should not be described as a general solution for every one-page browser CV.

## Source and runtime scope

All 416 application `src` files match the pinned repair commit. The final projection contains 436 exact authoritative files, including the missing fixture and four repository Cabin fonts. During execution, `brief.ts` had one extra EOF newline; its executable contents were unchanged, and the final file was restored to the authoritative blob. The original 431-file source manifest and its digest remain historical evidence.

The test uses a temporary QA-only SPA bootstrap and cached frontend tooling, not the original Lovable/TanStack production build. React is 19.2.8, Vite 8.2.1, React Router 1.170.30 and React Start 1.168.47. Exact upstream sources supplied React Query 5.101.1, html2canvas-pro 2.3.0 and the official jsPDF 4.2.1 UMD. No QA bootstrap, vendor source or dependency change was committed as product code. The known Tailwind import-order warning concerns the temporary bootstrap; it is not a production-build certification.

The app's Sans metric gate passed with legitimate local Liberation Sans fonts. Word requests Arial; the actual Windows font identity remains unverified. Four exact repository Cabin TTFs were restored before the final batch so the normal PDF export also registers its fonts without the earlier missing-font errors. The earlier targeted smoke exports are not the delivered batch.

The standard Playwright CDN returned an HTML outage page instead of a ZIP. The official Google Chrome for Testing download succeeded and ran against the local HTTP app using explicit Playwright `executablePath`. No cloud-browser local-file policy was bypassed. The official browser ZIP SHA-256 is recorded in the evidence JSON.

## Parallel work and packet

The active Fidelity branch was rechecked at `cefa83256a8f60f9c206b8728ee6b72bb1d09e17`, sixteen commits after the export base `99e053068bbe28f39fda3861591be997b1bb0b09`. Its newer work concerns title pages and authored graphics; its CV heading fallback still reads 7 px. Those commits were not overwritten or silently treated as part of this export. This packet tests the isolated CV repair and does not re-open title-page acceptance.

`CV-Pagination-App-Exporte-21okt.zip` contains twelve unchanged app DOCX downloads, twelve same-state app PDFs, importable fitted projects and evidence. The two target DOCX files are in the root, with the other ten under `Weitere-Faelle`. It contains no browser screenshots and no reconstructed DOCX. Size: 13,125,260 bytes. SHA-256: `f131fe112e208d356f65d2c58ac3689fe67b911af713f0712ce6990aec5850e2`.

## Smallest remaining Word acceptance

In one consolidated response, check 02 Modern and 12 Brief in Desktop Word, focusing on the CV from dossier page 3. The CV must remain one readable page, with the complete References heading, name, role and contact. Save and reopen both files and verify that this remains true and that native CV text remains editable. A returned saved DOCX and Word PDF can then establish actual pagination and control retention. No intermediate Word micro-test was requested during this continuation.

After that result, classify the targeted CV repair independently from the three open unfitted cases. Only then prepare the isolated integration with current Fidelity and the previously confirmed Sidebar repair, rechecking its old transport against the current base. No merge, deployment, CI dispatch, production export switch or active-branch modification was performed.

Machine-readable evidence is in `docx-next-word-pagination-app-export-21okt-evidence.json`. The earlier 87 focused tests and strict focused TypeScript check remain recorded in `docx-next-word-pagination-takeover-21okt.md`; unchanged code did not justify rerunning them merely for this documentation update.
