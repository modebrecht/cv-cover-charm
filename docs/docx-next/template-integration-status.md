# 39-template integration — 2026-10-09

Base: `dfe0fae533c70a44c7b0d011a201bc801c63a900`. Integration branch: `docx-next/integrate-39-templates`. All 15 supplied commits were cherry-picked chronologically, without merging the older branch. Configured: **39/39 active templates; 0/39 Microsoft Word accepted**. Warm 4/5 stay retired.

## Conflict review and preserved architecture

`be5b2fca` conflicted in checkpoint-status; `8ddd3f78` conflicted in checkpoint-status and next-handoff. Both current documents were restored completely from current dev at each conflicting documentation commit; only a concise current integration note was prepended afterward. Historical template reports are separate files. Model/renderer/validation merged automatically and their full diff was manually reviewed: only the opt-in nonsemantic page-paint capability is added. Current identity carriers, floating owners, paragraph frames, native import/grid/story code, all strict evidence and validation gates remain unchanged. No template-ID renderer/model/layout branches, XML post-export repair, production switchover, main/render change or manual deployment.

## Executed checks before promotion

Local release: 1,065 units, TypeScript, release formatting, changed-file formatting, lint and production build pass. Lint retains 21 pre-existing warnings, zero errors. All 321 Python checks across 27 diagnostic suites pass. Global formatting has exactly the same 194 noncompliant files as unmodified base dev, with zero additions. The exact registry test matches all active picker IDs to NEXT_TEMPLATES.

Integration source `a6fb1a03` independently passes M6/all eight browser groups (37985144444), Web Gallery/all 39 sets (37985144447), and all three existing native Sidebar jobs (37985144454). Nine added-template jobs pass full render, Save/Reopen, immutable JSON restoration and live editor/production-PDF checks. Edel Dark initially stops on a strict 16-vs-14-page long-letter expectation.

The failed artifact 11642728553 is downloaded and digest-verified (`b66522c0267a3c1264875fd26f89d9c9b03b47b4756b0457df8992b27468c20a`). **All 14 current source DOCX hashes exactly match the historical template-final-run evidence**, including long-letter `fdb65ed5df5a22b0435f9cf08f0777b9da847dc9cbe448f748fe8f986d9fafb5`. The historical full-font runtime uses Noto Serif; the minimal Sidebar environment chooses a different fallback. The unchanged original fonts reproduce all 14 dossiers / 110 source and saved pages. All native fields and complete text survive; all 14 saved table-caption identities still fail and remain blockers.

A controlled repeat adds only the four original hash-pinned Noto Serif 2.015 files to the template QA runtime and reproduces the unchanged 16-page long-letter. No template source, production font mapping, expected page count or assertion is changed. The new template-font setup obtains the official hash-pinned LibreOffice archive, checks each file against the original full inventory, verifies all 16 resulting fonts and records the distinct runtime. Only the serif template job uses it. **All three existing Sidebar jobs retain their original setup, fonts and strict baselines.** Exact successor CI is required before promotion; this report does not claim it has already passed.

## Acceptance and stop

Template migration/configuration is complete. Native Sidebar/container identity, long opening, cropped ellipse/full-original-pixel portability, Microsoft Word open/edit/save/reopen, approved visual snapshots and production DOCX switch remain open. Legacy/V2, PDF and portable JSON architecture remain unchanged. Green LibreOffice diagnostics are not Microsoft Word acceptance.

Next: verify the exact integrated successor CI, fast-forward unchanged dev only after all tracks pass, verify final remote SHA/M6/Sidebar/gallery/Pages and stop. Do not start another architecture investigation in this integration task.
