# Orbit checkpoint — 2026-10-05

Authoritative starting remote `dev`: `9f594db3ae765e27759846fff2dd317e12e837af`, freshly fetched and verified with a clean tree. The two newer commits since `e91a9e1` contain the remote architecture reconciliation and tested Human candidate; their M6 Release Candidate status is SUCCESS. No stale local Warm source was restored.

Configured candidates: **5/39** (`brief`, `freundlich`, `prism`, `human`, `orbit`). Microsoft Word accepted: **0/39**. Prism and Warm retain their shared declarative architecture. The neutral source adapter is unchanged; authored override provenance supplies native alignment precedence, without importing DOM/PDF pagination.

Orbit uses shared cover rows, native right photo, existing photo/no-photo clearance, native fields/badges and growing contact bands. Generic descriptor additions configure outline motifs and field alignment. Unpainted motifs and gradients without a fill fail explicitly. `renderer.ts` and `build-model.ts` are unchanged; no template-ID branch, per-template renderer, visible-text styling or XML repair chain was added. See [coverage and Word flow adaptations](orbit-feature-coverage.md) and [machine evidence](orbit-stress-evidence.json).

| Check                                          | Result                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Full isolated unit suite                       | 850 passed, 0 failed, 179 files                                                                                                       |
| Targeted DOCX Next                             | 148 passed, 0 failed, 17 files                                                                                                        |
| TypeScript / build / release formatting        | Passed                                                                                                                                |
| Lint                                           | 0 errors; 21 existing warnings                                                                                                        |
| Orbit package / stable LO render / save-reopen | 13/13 fixtures; 95 pages                                                                                                              |
| Ring raster                                    | Actual owned header asset has a transparent center and visible outline                                                                |
| Previous candidates                            | 124/124 regenerated DOCX files byte-identical to committed evidence                                                                   |
| Browser/editor and portable JSON               | Orbit rename/reload, JSON save/load, explicit snapshot and independent export passed; existing full semantic editor smoke also passed |
| Production PDF                                 | Existing combined PDF smoke and actual Orbit combined PDF passed; edited name remains searchable                                      |
| Visual review                                  | Browser and native cover/photo/no-photo, letter, CV, rich/custom and continuation pages inspected; references remain candidates       |
| Microsoft Word acceptance                      | Pending                                                                                                                               |
| Remote CI                                      | Starting `9f594db`: M6 SUCCESS. The containing final commit must separately pass the combined remote CI before handoff                |

Stable QA was freshly rebuilt from all 50 exact archive hashes and all recorded font hashes using the existing setup script and public LibreOfficeKit API. Runtime/version/compiler evidence is included in the ledger. No engine patch, document repair or warning suppression was used. New Orbit page-count expectations were measured once and frozen; prior expectations and regression checks remain unchanged.

Only `dev` was edited. Production DOCX, Legacy/V2, PDF/JSON application paths, `main` and `render` remain untouched. No manual deployment or branch promotion occurred.

Remaining blockers: actual Microsoft Word editing/save-reopen and human visual approval; Modern/sidebar first-class composition; previously documented unsupported settings/anonymous typography. Recommended next bounded template: **Cove**, to validate its asymmetric masthead using the existing bands/native hero/page motifs. Stop after this Orbit checkpoint and await a new instruction.
