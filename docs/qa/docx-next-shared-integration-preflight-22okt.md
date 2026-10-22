# Shared DOCX integration preflight

## Result

The current Fidelity source, the confirmed Sidebar repair and the two CV pagination repairs have been combined and tested in an isolated source projection. The [26-file transport](docx-next-shared-integration-preflight-22okt.patch) applies to the current Fidelity target and reproduces every reviewed file exactly. No remote product branch was integrated or merged.

The final bounded runs pass 179 distinct tests: 97 CV tests, 56 Sidebar tests, 38 cover tests and 3 Brief integration tests, with 15 renderer tests shared between the first two scopes. This is 194 executions, not 194 distinct tests. Focused TypeScript checking passes. Six regenerated Sidebar diagnostic DOCX packages are byte-identical to the previous Sidebar sources, including the previously confirmed photo cases.

Six real application exports additionally exercise the shared classic CV behavior. Their 498 checked text fields and mapped CV controls survive initial export. The remaining unfitted Modern 05 Web/native page-count mismatch is still OPEN. Its automatic and explicit one-page actions work locally. No acceptance gate was relaxed and no new Desktop Word PASS is claimed.

## Exact inputs

| Role | Revision |
| --- | --- |
| Current Fidelity target | `7be40063856d1376acb60e917fe85599a6033dad` |
| Tested Fidelity source before its documentation-only follow-up | `dfa787f983166d9b3b4831069f306819c6de4a4f` |
| Sidebar repair and evidence | `f73c776e2eca6b9b0d858ee2ab997230259797ac` |
| CV repair branch checkpoint | `b3eb19eea86e2f658d89f0aeed7f7d6005f6730a` |
| CV product repairs | `1ae6bd9`, `70a10ed`, `1c4afca` |

The active Fidelity target is 32 commits newer than the target of the previous Sidebar transport, `3a6f5a11d5c13b3169cc136c4d7ad52e04dc6a38`. Its changed native cover/avatar/graphics source was retained. The seven newer Fidelity application files were already SHA-verified for the CV preflight; fourteen relevant current target files were fetched again and verified for this refresh. The intervening `dfa787f` to `7be4006` change is documentation only. All three remote heads were rechecked after the app runs.

## What the transport preserves

The existing Sidebar patch applies after the CV patch without an unresolved hunk. Its affected contexts were checked against the current target, including the newer builder, model, native text and validation. The refreshed transport contains 13 product files, 9 tests/fixtures and 4 existing diagnostic scripts. A clean application in a separate directory reproduces all 26 tested file hashes. The full application projection contains 418 source files and has zero differences from the reviewed combined source.

The shared classic heading fallback remains 0.5 mm, with explicit user settings preserved. The painted-footer helper uses the shared browser reserve and explicitly bypasses frozen Sidebar parts. Sidebar pictures retain typed picture ownership separately from paragraph ownership. Both native cover avatar modes and the current authored cover's foreground/no-wrap policy survive. Reference pairs and half-width sections use the existing explicit empty 6 mm gutter with zero outer inset.

This is a refreshed transport of the existing repairs, not a new product-code fix. No old complete builder or renderer was copied over the current Fidelity version.

## Verification and limits

| Check | Result |
| --- | --- |
| CV focused scope | 97 passed, 0 failed, 12 suites |
| Sidebar/picture/grid/combined ownership scope | 56 passed, 0 failed, 8 suites |
| Current cover scopes | 38 passed, 0 failed, 2 suites |
| Brief integration scope | 3 passed, 0 failed, 1 suite |
| Focused strict TypeScript | Passed |
| Six existing Sidebar dossier generators | All six complete packages byte-identical to previous sources |
| Real application exports | Six guarded UI downloads; state preserved across reload/export; zero model issues |
| Content and initial control structure | 498 checked text fields retained; mapped CV tags unique and exact |
| Native visual review | 20 pages rendered; 14 byte-identical to earlier inspected pages; all 6 changed CV pages inspected |
| Clean transport replay | Passed; all 26 resulting files match the tested source |
| Original production build, full repository suite and remote CI | Not certified or dispatched |
| Fresh Desktop Word round for combined output | Not performed or requested here |

The current 38-test cover scope also passes in the current Fidelity-plus-CV projection before adding Sidebar. The six cover failures in the old Sidebar preparation report belong to that older pinned target; they are not current failures or credited as fixes from this refresh. An initial test discovery probe lacked three fixtures, which were restored. A subsequent all-loaded probe ended without a final runner summary and is not counted as a complete-suite PASS. The four final bounded runs each have a complete passing summary.

The app smoke uses the previously documented temporary QA SPA, official Chrome for Testing and local fonts. It restores the saved project through the real JSON input, performs actual page actions, reloads, downloads the native DOCX through the UI and downloads the matching normal app PDF. Its tooling is not the original Lovable production build. The native page column below is supplementary unmodified LibreOfficeDev 26.8 rendering; it is not Word certification.

| CV matrix case and action | Browser CV pages | Native CV pages | Outcome |
| --- | ---: | ---: | --- |
| 02 Modern automatic | 1 | 1 | Local combined check passes; original Word pagination P1 remains closed |
| 03 Modern contact inline, no page action | 1 | 1 | Footer-reserve fix retained |
| 05 Modern custom values, no page action | 1 | 2 | OPEN general page-equivalence mismatch |
| 05 Modern custom values, automatic | 2 | 2 | Existing conservative action preserved |
| 05 Modern custom values, explicit one | 1 | 1 | Complete CV fits using the existing compact layout action |
| 12 Brief automatic | 1 | 1 | Local combined check passes; original Word pagination P1 remains closed |

These are CV matrix IDs. Modern custom-values 05 is a different case from Sidebar photo 05. No title-page or Sidebar-photo failure is inferred from the custom-values CV result.

All four principal app DOCX packages differ from the CV-only repair solely in `word/document.xml`. Within that part, only the reference-pair table changes: the old outer 3 mm inset becomes zero, with an explicit 6 mm middle gutter. All other document XML, cover/letter sections and package parts are identical. The four cover and letter renders are unchanged. The reference text now aligns with the section edge. This intentional alignment change means the combined files are not byte-identical to the previously accepted 02/12 files; their original Word acceptance is not silently transferred to this new package.

## Remaining gates and next action

The original 02/12 References-overflow P1 remains CLOSED following the user's Desktop Word save/reopen confirmation. The six unchanged Sidebar packages preserve their exact prior evidence scope; no repeat micro-test or 22-case rerun is justified by this refresh. Original-picture editing/reset and broader Sidebar/All-39 acceptance remain outside this preflight.

Modern custom-values 05 remains an actual page-equivalence discrepancy in the tested local renderer. The working page actions do not close its unfitted gate or establish whether Word reproduces it. Do not overwrite its explicit typography to manufacture a one-page default result.

The next implementation step is to create a separate integration branch from the freshly rechecked Fidelity target and apply the reviewed transport, preserving current source rather than merging either old branch wholesale. Run that branch's real build/checks and resolve the unfitted 05 scope before claiming general page equivalence. A later consolidated Word acceptance should cover the changed shared reference/half-width tables and mixed picture/control composition. This report adds no intermediate user test request and does not reopen the already accepted 02/12 task.

**Verdict: CONDITIONAL GO for controlled integration review; no production GO or merge authorization.** No merge, deployment, engine patch, CI dispatch, production export switch or modification of active Fidelity/dev/main/render occurred. Only analysis, evidence and the reviewable transport are published on the isolated CV repair branch.

Machine evidence is in [docx-next-shared-integration-preflight-22okt-evidence.json](docx-next-shared-integration-preflight-22okt-evidence.json). The preceding [footer-reserve report](docx-next-cv-footer-reserve-21okt.md) remains the detailed root-cause record for the CV body budget.
