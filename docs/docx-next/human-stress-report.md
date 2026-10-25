# Human checkpoint — 2026-10-04

Authoritative starting remote `dev`: `e91a9e1f96908d53df91611fbef66ec0903713b8`, freshly fetched twice. The migration ledger and [remote architecture review](remote-state-review.md) establish Brief, Warm and Prism before this session. [Human coverage](human-feature-coverage.md) and [machine evidence](human-stress-evidence.json) record the additional candidate.

Configured candidates: **4/39** (`brief`, `freundlich`, `prism`, `human`). Microsoft Word accepted: **0/39**. Prism and Warm remain declarative, independent candidates. The existing neutral source adapter is retained; no measured browser/PDF pagination was introduced. No line-count-only split was needed. `renderer.ts` is unchanged and has no template-ID branches or post-export repair.

Human adds generic `TemplateDefinition.pageMotifs` and `composePageMotifs`, reusing page-clipped paint and owned native first/default header stories. Cover tables/pictures, contact bands, rich flow, date rails and keep controls already existed. Decorative assets contain no user text. Native ellipse paint is a documented approximation of the browser's rotated irregular corner.

| Check                                              | Result                                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Isolated unit suite                                | 843 passed, 0 failed, 178 files                                                                                                                                                 |
| Targeted DOCX Next tests                           | 141 passed, 0 failed, 16 files                                                                                                                                                  |
| TypeScript / production build / release formatting | Passed                                                                                                                                                                          |
| Lint                                               | 0 errors, 21 existing warnings                                                                                                                                                  |
| Dossier-flow                                       | Initial complete run: 69/70 passed; unmodified alignment/caret test passed on targeted rerun. The initial synchronous editor-content readiness failure is recorded, not hidden. |
| Human package / stable LO render / save-reopen     | 12/12 fixtures; 99 pages                                                                                                                                                        |
| Previous candidates                                | 112/112 regenerated DOCX byte-identical to the remote ledger; nine representative Brief/Warm/Prism fixtures also freshly pass stable LO render/save-reopen                      |
| Human browser/editor                               | Rename/reload, portable JSON save/load, explicit snapshot and independent candidate export passed                                                                               |
| Existing production PDF / portable JSON            | Full existing editor/combined PDF smoke passed; no application path was changed                                                                                                 |
| Visual review                                      | Representative cover/photo, letter, CV, custom-content and continuation pages inspected; candidate references only                                                              |
| Microsoft Word acceptance                          | Pending                                                                                                                                                                         |
| Remote CI                                          | Existing remote `e91a9e1`: M6 Release Candidate SUCCESS. New local commits have no remote CI until authorized publication.                                                      |

Stable QA reused the recorded LibreOfficeKit 25.8.7.3 runtime after restoring missing packaged symlinks. A full archive rebuild was blocked by one retained truncated `libreoffice-common` archive; the fresh runtime/version, conversion and save/reopen checks succeeded. No engine/document patch or warning suppression was used.

Only `dev` was edited. No main/render modification, manual deployment, merge, promotion, production DOCX switchover or Legacy/V2 deletion occurred. Automatic approval review blocked the GitHub push because it did not consider publication to this repository explicitly authorized. Completed local commits are ready for review/publication; no alternate write path was used.

Remaining blockers: actual Microsoft Word edit/save/reopen and human visual approval; Modern/sidebar first-class composition; previously documented unsupported saved settings and anonymous typography. Recommended next bounded template: **Orbit**, using the same native hero/bands/motif primitives. Do not start it automatically. First publish this reviewed checkpoint to `dev` and obtain its CI result.
