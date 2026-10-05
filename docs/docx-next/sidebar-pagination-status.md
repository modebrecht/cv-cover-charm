# Native parallel pagination investigation

The next Brief task isolates the pagination blocker; it does **not** enable running headers or different first/continuation margins. Starting remote `dev` was freshly fetched and independently verified at `e6184df8eb9495f85b09d936d6c987285028b273`, with a clean tree. Configured candidates remain **29/39**, Word accepted migrations **0/39**. **Microsoft Word acceptance: pending.**

The earlier explanation was too narrow: a header is not necessary for the missing-tail failure. In the same native parallel table, changing only the top margin from 20 to 60 mm reproduces eight missing CV fields. The second work entry and reference tail exist in both the source and LibreOffice-saved DOCX, but disappear from both PDF renders. Header stories reproduce the same failure. This is an observed interaction between nested unsplittable entry rows and available body space; the exact engine mechanism and Microsoft Word behavior remain unverified.

Removing the inner entry tables preserves the text but does not reliably preserve title/description attachment. At 60 mm without headers that comparison passes; at 20 mm three titles detach, and with a different first header four detach. Adding `keepLines` also detaches three titles. The existing attachment assertion caught these failures. A further temporary single content-control paragraph group with bookmarks did not pass the full Brief fixture check either. All experimental exporter changes were removed. No anonymous paragraph fixup, text matching, XML repair, template-ID renderer branch, or per-template renderer was retained.

| Diagnostic case                                  | Dossier pages | Missing CV fields | Detached entries | Save/reopen observation |
| ------------------------------------------------ | ------------: | ----------------: | ---------------: | ----------------------- |
| Original grouped entries, 20 mm, no header       |            11 |                 0 |                0 | Same                    |
| Grouped entries, 60 mm, no header                |            14 |                 8 |                0 | Same                    |
| Grouped entries, 60 mm, contact header           |            14 |                 8 |                0 | Same                    |
| Grouped entries, 60 mm, different first header   |            14 |                 8 |                0 | Same                    |
| Paragraph entries, 60 mm, no header              |            13 |                 0 |                0 | Same                    |
| Paragraph entries, 60 mm, different first header |            13 |                 0 |                4 | Same                    |
| Paragraph entries with `keepLines`, 20 mm        |            11 |                 0 |                3 | Same                    |
| Paragraph entries, 20 mm, no header              |            11 |                 0 |                3 | Same                    |

These are **eight diagnostic dossiers / 101 pages**, not eight accepted exports. [Machine evidence](sidebar-pagination-evidence.json) records field IDs, hashes, exact LibreOffice version and reopen results. Representative original and failed tail pages and the detached `Schule 15` page were visually inspected. The diagnostic runner fails if these known observations change, so a future engine or composition fix requires explicit review rather than silently replacing the evidence.

The diagnostic fixture deliberately lowers the shared parallel primitive into an ordinary native-table model, with a classic model label for that structural experiment. It is not a Classic substitute for a supported Sidebar export. The application and candidate registry never import this fixture. Production Sidebar validation, running-header rejection and different-margin rejection are unchanged. The one existing renderer emits the ordinary native table; no serialized XML is edited.

The old 16 Brief Sidebar fixtures were re-generated and all packages are byte-identical to the committed checkpoint. Their 97 pages pass package checks, native text checks, title attachment, render and save/reopen. This evidence covers those fixtures, **not arbitrary headerless page geometry**. The existing header guard does not establish general safety for every headerless model. Sidebar remains an internal candidate and must not be promoted or connected to production export while this is unresolved.

Local verification: **971 units / 206 files**, including **269 DOCX Next tests / 44 files**, pass. TypeScript, lint, production build, release formatting and changed-file formatting pass; lint has zero errors and 21 existing warnings. No application, PDF, JSON, renderer or template configuration code changed. Final CI/browser/PDF results are checked after the single publication and reported separately.

Reproduce with the pinned stable QA runtime:

```sh
bun scripts/docx-next-parallel-pagination.ts OUT
python scripts/docx-next-parallel-pagination-qa.py OUT --libreofficekit PATH_TO_PINNED_KIT
```

The exact next task is a **controlled Microsoft Word open/edit/save/reopen comparison of these eight cases**, especially `smaller-body` and `paragraph-default-margin`. Confirm full tail visibility and title attachment before selecting a shared composition. If Word preserves the rows, isolate the LibreOffice engine behavior; if it also loses content, redesign the native parallel composition. Do not remove either guard, start another Sidebar template, or add first-page margin machinery until that distinction is resolved. A Word tester should record version, repair prompts, tail visibility before and after editing, attachment after adding text, and saved/reopened behavior for every case.

The native paragraph and row properties being compared are defined by Microsoft's [KeepNext documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.keepnext) and [CantSplit documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.cantsplit). These definitions explain the intended behavior; they do not establish acceptance of our output.
