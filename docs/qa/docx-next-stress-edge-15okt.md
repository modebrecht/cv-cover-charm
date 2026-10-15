# DOCX Next — Item 14: Stress & Edge Cases

Date: 2026-10-15. **Verdict: PARTIAL.** The bounded test extension passes locally; physical Save/Reopen acceptance remains open. No product implementation change is needed from the six source-package cases.

## Scope and provenance

- Actual fetched remote `dev`: `8901a830a792d75e9e792345c5180827218b4e1e`.
- Working branch: `qa/docx-next-stress-edge-15okt`. Verification was completed as an uncommitted diff against the base SHA above. The subsequent request to continue and push authorizes publication on this feature branch. No PR, CI dispatch/restart, merge or deployment is included.
- Root `AGENTS.md` was read. Published history is unchanged. Item 13's separate, unmerged branch is not incorporated into this work.
- Work began as a read-only audit. The subsequent instruction to open and work on a branch authorized this local test extension. No `src/`, workflow, native-engine, export-toggle or Sidebar implementation file is changed. The only deployment configuration change explicitly disables automatic deployment for this feature branch before publication.
- Native Sidebar geometry, four mirrored failures, PopSdt sampling and Agent A remain frozen. Existing pure unit regressions are retained unchanged. This work makes no Sidebar acceptance claim.
- No Microsoft Word test was performed here. Separate Word work is not assessed by this report.

## Existing coverage and identified gaps

| Existing evidence                                            | Coverage                                                                                                                           | Gap or interpretation                                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docx-next-model-boundary.test.ts`                           | All 39 active templates; frozen source, independent models, JSON portability, semantic IDs and real packages                       | Reused unchanged; not a desktop layout test                                                                                                                 |
| `docx-next-pdf-print-boundary.test.ts`                       | Transitive runtime boundary, negative loader controls and cold package generation                                                  | Reused unchanged; Item 11/12 architecture is preserved                                                                                                      |
| `tests/fixtures/docx-next/brief.ts`                          | Long Letter/CV, long values, absent/repeated/empty optional content, custom sections, overflow entry, variants, chrome, typography | Individual variants existed; simultaneous long Letter + long Minimal/Editorial CV + photos + first/continuation chrome needed an explicit combined contract |
| Template stress reports and SHA ledgers in `docs/docx-next/` | Historical native renders, package checks, Save/Reopen and browser/JSON evidence                                                   | Historical snapshots are not a new full-matrix run on this branch                                                                                           |
| Dedicated `test:docx-next` command                           | Before this change: 55 paths, including 54 DOCX-named files                                                                        | 21 of the 75 DOCX-named unit files were only reached by the full unit suite; Aurora was one of them                                                         |
| Aurora semantic-style test                                   | Source photo, font and color precedence                                                                                            | `fontSizePt` was not the canonical `sizePt` property, and size was not asserted                                                                             |

The [existing run 38666878073](https://github.com/modebrecht/cv-cover-charm/actions/runs/38666878073) was inspected read-only. Its ten integrated-template jobs are successful, including generation, native Save/Reopen, visual checks and browser/JSON/PDF checks. The prior audit counted 152 dossiers across these jobs. This historical evidence is not CI for this branch's changes. The run's `stable-comparison` job failed at its PopSdt sampling step; no retry or investigation was initiated here. The overall run must not be described as green.

Before publication, remote `dev` was fetched again and remained at the recorded base. The Vercel connector confirmed the linked `modebrecht/cv-cover-charm` project (`prj_Ip4lHR688tFQ4QZXCrOZ4OfXo6Im`, team `team_bgCMPzd6v634brLp9mvGrngl`). Its automatic Git deployment is disabled for the exact `qa/docx-next-stress-edge-15okt` branch in root `vercel.json`. The inherited `*` pattern alone is not treated as proof for slash-containing branch names. Existing workflow branch filters do not select this branch; no workflow file or trigger was added.

The dedicated command now includes Aurora and the new stress test, totaling 57 paths. Twenty DOCX-named test files still run only in the complete unit suite; both suites were executed. This bounded change does not reorganize every historical diagnostic test.

## Local changes

| File                                                        | Change                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `tests/unit/docx-next-aurora.test.ts`                       | Use canonical `sizePt: 18` and assert the resulting semantic size                                                   |
| `tests/fixtures/docx-next/stress-edge.ts`                   | Six combined fixtures and independent source field expectations                                                     |
| `tests/support/docx-next-stress-edge.ts`                    | Frozen inputs, native tagged-field assertions and ZIP XML inspection                                                |
| `tests/unit/docx-next-stress-edge.test.ts`                  | Six parameter cases plus content-loss negative controls                                                             |
| `scripts/docx-next-stress-edge-fixtures.ts`                 | Optional local generation with actual Chromium image/decoration adapters and portable-model package hash comparison |
| `scripts/docx-next-stress-edge-render-qa.py`                | Optional, fail-closed local render/Save/Reopen diagnostics; no engine instrumentation                               |
| `package.json`                                              | Add Aurora and the new stress file to the existing dedicated command                                                |
| `vercel.json`                                               | Explicitly disable automatic deployment for this exact feature branch before push                                   |
| This report and `docx-next-stress-edge-15okt-evidence.json` | Results, package hashes and limitations                                                                             |

Each case combines Cover, Letter and CV; 70 nonempty Letter paragraphs; 66 school entries including the existing oversized final description; Minimal or Editorial CV; three native photo placements; and document-specific first/continuation header and footer content.

The generic image fixture has an explicitly saved free photo position at y=20 mm. These six fixtures explicitly select the existing `right` body-flow mode beside a tall contact header. Unit assertions require `placement: right` and `coordinateOrigin: content`; render diagnostics require the CV photo below the body-start margin. Free positioning remains outside this selected matrix. No renderer adjustment or placement fallback was introduced.

For each case, 404 expected tagged fields are derived from source data: subject, 139 native Letter paragraphs (including intentional empty paragraphs), and 264 school-entry fields. Checks compare each ID's own exact text, including the final oversized CV entry. Native text uses editable OOXML paragraphs/runs and content controls; it is not rasterized. Cover/Letter/CV image ownership, first/default header ownership, footer ownership, model/package validation, source immutability and restored package equality are checked separately.

## Verification results

Runtime: Bun 1.4.3; actual browser asset generation: Playwright 1.55.0 / Chromium 140.0.7339.16.

| Check                                              | Actual result                                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Aurora + combined stress tests                     | 10 PASS, 0 FAIL, 309 assertions across 2 files                                                                     |
| `bun run test:docx-next`                           | 369 PASS, 0 FAIL, 6,029 assertions across 57 files                                                                 |
| `bun test tests/unit`                              | 1,179 PASS, 0 FAIL, 23,014 assertions across 246 files                                                             |
| TypeScript                                         | PASS                                                                                                               |
| ESLint                                             | PASS: 0 errors, 21 inherited warnings in untouched files                                                           |
| Release formatting and Prettier on changed TS/JSON | PASS                                                                                                               |
| Production build                                   | PASS; no production source/dependency change followed the build                                                    |
| Actual browser adapters                            | 6 fixtures, 12 package generations, 6 decorative assets; every frozen/JSON-restored pair has identical SHA-256     |
| Source DOCX XML/image relationships                | 6/6 PASS, including the independent 404-field contract per case                                                    |
| Alpha native diagnostic                            | 6/6 text/flow/chrome/photo visibility checks PASS; Save/Reopen tagged identity FAIL in all 6; runner exits nonzero |

Negative controls retained or executed:

- Restoring Aurora's wrong `fontSizePt` spelling makes the strengthened assertion fail.
- Removing the final CV description control or changing the last long-Letter probe is rejected by its own field ID.
- A blank PDF region fails the synthetic-photo pixel assertion.
- Without explicit `--diagnostic-runtime`, the render script rejects the locally available prerelease runtime.

The real renderer and package validator are used; neither is mocked or bypassed. Unit asset adapters provide deterministic PNGs; the separate generator additionally exercises the actual browser adapters. No new product/gallery surface changes, browser UI acceptance or full end-to-end suite run is claimed.

## Physical diagnostic and remaining risk

Available runtime: **LibreOfficeDev 26.8.0.0.alpha0, commit `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`**. It is not the established stable 25.8.7.3 runtime. The explicit diagnostic flag does not grant acceptance. Version-string matching alone also does not verify pinned binaries or fonts.

| Cases                    | Source pages per case | Saved pages per case | Letter / CV pages | Missing or changed tagged identities after save |
| ------------------------ | --------------------: | -------------------: | ----------------- | ----------------------------------------------: |
| Brief Minimal, Editorial |                    27 |                   27 | 11 / 15           |                                        468 each |
| Cove Minimal, Editorial  |                    29 |                   29 | 11 / 17           |                                        468 each |
| Neon Minimal, Editorial  |                    29 |                   29 | 11 / 17           |                                        465 each |

Across 170 source and 170 saved pages, the diagnostic checks expected body text including repeated-value occurrence counts, absence of blank/off-page text, correct scoped running chrome, stable page counts and three visible synthetic portraits per dossier. The final repeated-occurrence assertions were rerun against all 12 generated PDFs without repeating native conversion. Representative Cove cover and Neon first/final CV source/saved pages were visually inspected: no unexplained visual change was observed in those samples. This is not an exhaustive pixel-golden comparison or proof of per-entry ownership after native save.

Initial PDF image-object counting incorrectly flagged saved Cove/Neon cover photos: the visible photo remained, but the PDF reader did not expose it as a standalone image object. The check now verifies red/blue pixels at all three original photo locations, retaining a blank-region negative control. It proves visible synthetic-photo presence, not original media-byte identity, crop editability or complete image-structure preservation.

The alpha Save/Reopen converter removes most tagged field identities while retaining the checked visible text. All 404 fields in the explicit stress contract lose their tags. Some Cover tags remain: 1/469 for Brief, 3/471 for Cove and 6/471 for Neon. This failure is recorded explicitly and keeps the native diagnostic nonzero. It is not assigned to the production renderer, generalized to stable LibreOffice, or attributed to Microsoft Word. No OOXML repair path is added. Stable runtime/font verification and real Word Save/Reopen testing of these six new cases remain required before physical acceptance.

## Review and next decision

**Local test extension: PASS. Item 14 overall: PARTIAL.** Source-package invariants, all 39-template regressions, the Item 11/12 boundaries, source immutability and native editable output remain intact. No production design or geometry was changed. The new physical evidence is deliberately insufficient for full acceptance.

The next useful action is senior review of this local diff and a decision on running these six non-Sidebar cases in the established stable environment and real Word. No further Masterliste item is started, and the canonical numbering/definitions remain unchanged. Sidebar NO-GO and its separate full 22-case acceptance requirement are unaffected.
