# Senior review: paragraph entries inside the body carrier — 2026-10-10

The repeated debugger investigation was no longer the shortest route to a usable export. The body carrier already preserved native text order, while its visible school order failed. Its renderer wrapped each `entry.keepTogether` in another one-cell, non-splitting table inside the outer splitting row. A bounded composition counterprobe removes those redundant entry tables, keeping every semantic paragraph, field ID, text run, style, spacing, and existing keepNext/keepLines policy unchanged. No production renderer or template configuration changes.

## Concrete result

All six left/right compositions pass complete native and visible text order through source, saved, and saved2. Long cases retain 382 fields and school order 1–65; side-long cases retain 129, short cases 77. Eighteen read-only native inventories and eighteen PDF renders pass the content gate. No text is shortened or combined. The long-left isolated first comparison changes only the entry grouping; its old eleven-page PDF reorders schools, and its new twelve-page PDF preserves complete sequence.

The body now owns both tracks, so the fixture declares page margins spanning the actual physical outer lanes, with zero table indentation. Widths and physical lane positions remain unchanged. The predecessor reserved body margins for the main floating track only; that cannot contain a right-sidebar body carrier.

**Geometry is still unaccepted.** Both short cases stay at three total dossier pages. Side-long cases have ten, both-long twelve, with an empty third dossier page before the CV in all long source/saved/saved2 phases. This is an explicit open defect, not a passing page-count or layout result. Removing the leading body paragraph is rejected: source and saved retain 382 tags, but saved2 loses `cv.section.person.heading` (381). The required boundary cannot simply be deleted. Its exact causal role in the empty page is not established.

## Verification and CI decision

The new `entry-flow-content` job in DOCX Next Stable Sidebar runs independently of `stable-comparison`. It uses the same verified native engine and public UNO binding, but checks the six complete content matrices and two Save/Reopen cycles against authored semantics. An earlier historical sampling failure can no longer skip this new job. Missing cases, tags, native text, visible text or school order fail; the actual report is retained before rejection. Empty-page observations remain visible, and production/geometry acceptance stays blocked.

The old sampling workers, contracts, evidence and gates are unchanged. Run 38050756005 attempt 2 failed at the unchanged boundary-lifetime pattern; transfer/body steps were skipped. Exact callback coverage is not a product acceptance criterion for the new content job. Transient native import-object lifetime remains unmeasured here; final canonical IDs, whole paragraph ownership/order and complete native roundtrip content are measured. No Microsoft Word acceptance is claimed.

[Local evidence](sidebar-entry-flow-evidence.json) retains all eighteen phase results and the rejected boundary-removal counterexample. Independent new CI execution is pending. Next: eliminate the empty CV page while keeping its real boundary, then verify physical geometry and all six roundtrips before considering production integration. No more import-stack disassembly is planned for this composition unless a concrete content failure requires it.
