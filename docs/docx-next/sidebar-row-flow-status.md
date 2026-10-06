# Native semantic row flow

Starting remote `dev`: `2660a1bf2f297cd52ad45ee6575d7ff5562fc5a8`, re-fetched and independently verified with a clean tree. Its M6 release-candidate run and all 154 browser regressions passed on retry; the original main job was abandoned before runner assignment. Web Gallery also passed. Microsoft Word acceptance remains pending, but the user's instruction is to continue automated development without requiring Word during their holiday.

The shared parallel primitive now offers explicit semantic row alignment. Section headings stay with their first group, and short entries occupy an outer native table row instead of a nested entry table. Native rows can still flow when taller than a page. One or more declared tracks can span these rows using native vertical cell merging. This keeps a compact, continuous rail beside the entry rows; simple pairwise rows alone visibly spread the contact fields too far apart. Track selection is data, not a template-ID renderer branch.

Generic primitives: semantic flow units, vertical cell spans, and asymmetric cell padding. Spans reject overflow, overlapping content, invalid track indices and count mismatches before serialization. Text remains in native paragraphs with the existing field identities and run formatting. There is no page measurement, text lookup, text box, artwork containing user text, or post-export repair. The default independent-flow serialization and original negative fixtures remain unchanged.

The eight prior main-track counterexamples pass with the spanning-row composition over 98 dossier pages: no missing fields, no detached entries, and the same observations after LibreOffice save/reopen. [Machine evidence](sidebar-row-flow-evidence.json) records the inputs and hashes. Representative first CV pages were visually inspected. This is evidence for these cases, not general Sidebar acceptance. Running headers and differing first/continuation margins remain restricted in the candidate until their own supported fixtures are verified.

Verification of this foundation: 976 full isolated units / 206 files, including 274 DOCX Next units / 44 files, pass. TypeScript, targeted lint and production build pass. Candidate configuration is unchanged at this foundation checkpoint; configured count remains 29/39 and Word accepted count 0/39.

Reproduce the controlled comparison with `bun scripts/docx-next-parallel-pagination.ts OUT --spanning-rows` followed by the existing pinned `docx-next-parallel-pagination-qa.py` runner. `--semantic-rows` is the intentionally row-coupled comparison; no flag preserves the original negative observations.

Next: configure Brief's shared Sidebar with a spanning side track, verify all existing left/right, long main/side/both, oversized paragraph and photo fixtures, and inspect representative pages before retaining that configuration. If a long spanning rail fails, keep it explicit and report the scoped limitation. Microsoft Word testing can follow later and is not a prerequisite for this development step. No production DOCX switch, Legacy/V2 removal, branch promotion or manual deployment.

Native vertical merges are defined in Microsoft's [VerticalMerge documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.verticalmerge).
