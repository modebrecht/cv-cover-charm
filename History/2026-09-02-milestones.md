# Milestone History — 2026-09-02

Repository: `modebrecht/cv-cover-charm`  
Working branch at checkpoint: `letter-m1-m2`

This file is a dated product/development checkpoint so milestone scope, status and exit gates are not lost in chat history.

## Working rule

- Treat this file as the historical snapshot for 2026-09-02.
- Future milestone changes should be recorded in a new dated file under `History/` rather than silently rewriting this checkpoint.
- A milestone is only `DONE` when its exit gate is satisfied, not merely when code or tests exist.
- Do not rewrite published Git history; the project is connected to Lovable.

## Current overall status

- `letter-m1-m2` contains the current letter overhaul and is materially ahead of `main`.
- M1–M5 are substantially implemented, but the release proof is incomplete until the current branch head passes the full CI/QA matrix.
- M6 is the next active milestone.
- M7–M10 define the remaining path to a clean new release.

---

# M1 — Compact Default

Status: `BUILT / NEEDS FINAL EXIT-GATE PROOF`

## Scope

- [x] Dedicated compact motivation-letter layout foundation.
- [x] Compact header as the normal default.
- [x] Compact footer as the normal default.
- [x] Reduce oversized CV/title-page decoration when reused in the letter.
- [x] Give letter text the reclaimed vertical space.
- [x] Keep the letter sheet neutral/readable.
- [x] Shared geometry system for preview/export.
- [x] Overflow/preflight infrastructure exists.

## Exit gate

- [ ] Every selectable letter/dossier style is usable with the compact default.
- [ ] No unnecessary oversized decorative/empty areas.
- [ ] Preview and export/PDF agree visually and geometrically.
- [ ] No clipping, overlap or silent text loss with normal content.

---

# M2 — Header Modes

Status: `BUILT / NEEDS FINAL EXIT-GATE PROOF`

## Scope

- [x] Header mode: `compact`.
- [x] Header mode: `contact`.
- [x] Header mode: `none`.
- [x] Name toggle.
- [x] Address toggle.
- [x] Phone toggle.
- [x] Email toggle.
- [x] Header controls represented in persistent letter design state.
- [x] Dedicated header-mode E2E coverage exists.

## Exit gate

- [ ] All header modes work across representative template families.
- [ ] Contact header never collides with recipient/body content.
- [ ] Hidden fields leave no broken spacing.
- [ ] Contrast/readability remains acceptable in all supported designs.

---

# M3 — Footer / Layout Integration

Status: `BUILT / NEEDS FINAL EXIT-GATE PROOF`

## Scope

- [x] Footer mode: `compact`.
- [x] Footer mode: `attachments`.
- [x] Footer mode: `none`.
- [x] Footer participates in the shared letter layout calculation.
- [x] Attachments can be represented without colliding with body content.

## Exit gate

- [ ] Footer modes are visually coherent across template families.
- [ ] Footer never falls below A4 or overlaps the body.
- [ ] Empty/no-attachment cases collapse cleanly.

---

# M4 — Preflight & Export Safety

Status: `BUILT / NEEDS FINAL EXIT-GATE PROOF`

## Scope

- [x] Letter preflight logic exists.
- [x] Unit coverage exists for preflight/layout behaviour.
- [x] Dossier-letter preflight E2E coverage exists.
- [x] Preview/export geometry checks exist.

## Exit gate

- [ ] A document that cannot be exported safely is blocked or clearly warned before download.
- [ ] No silent vertical overflow.
- [ ] No silent horizontal overflow.
- [ ] No header/body/footer overlap.
- [ ] User-facing preflight behaviour matches actual PDF/export behaviour.

---

# M5 — Final Letter QA

Status: `BUILT / NOT YET RELEASE-PROVEN`

## Scope

- [x] `letter-final-qa.spec.ts` exists.
- [x] Visual gallery generation exists.
- [x] Preview/export geometry comparison exists.
- [x] Letter checks are integrated into the broader dossier regression workflow.
- [x] Full dossier PDF gallery infrastructure exists.

## Exit gate

- [ ] Current release-candidate commit passes the complete M1–M5 QA suite.
- [ ] Visual artifacts are reviewed, not merely generated.
- [ ] No blocker remains in the letter across the complete dossier set.

---

# M6 — Release-Candidate CI Truth

Status: `ACTIVE`

Goal: prove that the exact current release-candidate commit is technically healthy before adding more features.

## Work

- [ ] Ensure the release-candidate branch receives the same regression workflows as `main`/`dev`/`render`.
- [ ] Run all unit tests.
- [ ] Add a dedicated TypeScript typecheck command/gate.
- [ ] Run full ESLint.
- [ ] Replace CI formatting mutation (`prettier --write`) with a non-mutating format check for release validation.
- [ ] Run production build.
- [ ] Run all browser/E2E regression groups.
- [ ] Run letter M1–M5 QA.
- [ ] Generate all 39 complete dossier PDFs.
- [ ] Repeat the complete critical suite once to expose flaky tests.

## Exit gate

- [ ] One exact commit SHA has green unit, typecheck, lint, build, browser/E2E and PDF-gallery gates.
- [ ] No gate repairs source files during validation.
- [ ] No unresolved flaky test remains.

---

# M7 — Dossier Consistency & State Integrity

Status: `PARTIALLY BUILT / NEEDS CONSOLIDATED GATE`

Goal: title page, CV and motivation letter must behave as one coherent dossier and preserve user state correctly.

## Work

- [ ] Verify title page → CV → letter data transfer deterministically.
- [ ] Verify transfer only changes intended fields.
- [ ] Verify the main dossier photo syncs correctly.
- [ ] Verify additional/free images remain document-local where intended.
- [ ] Verify font-family propagation.
- [ ] Verify colour/design-family propagation.
- [ ] Verify template switching never destroys user data.
- [ ] Verify reload preserves the complete dossier state.
- [ ] Verify autosave cannot lose recently edited data.
- [ ] Verify resetting one document does not unintentionally reset others.
- [ ] Verify complete dossier save/load round-trip without information loss.
- [ ] Verify backwards compatibility/migration for saved state created before the new letter fields existed.

## Quality gate scenario

Create a complete dossier → customise all three documents → reload → export → save → reload/import → export again.

## Exit gate

- [ ] Data, images, typography, theme and document-specific settings survive the round trip as intended.
- [ ] No cross-document state leak or accidental reset remains.

---

# M8 — Adversarial Content & Edge Cases

Status: `OPEN`

Goal: real student/user data must not break layouts or silently disappear.

## Content matrix

- [ ] Very long first/last name.
- [ ] Hyphenated/apostrophe names.
- [ ] Umlauts and accented characters.
- [ ] Very long company/contact/address values.
- [ ] Very long email address.
- [ ] Swiss phone-number formats.
- [ ] Empty optional contact fields.
- [ ] Very short letter.
- [ ] Normal letter.
- [ ] Long but valid letter.
- [ ] Deliberately too-long letter.
- [ ] No attachments.
- [ ] One attachment.
- [ ] Many attachments.
- [ ] All header modes.
- [ ] All footer modes.
- [ ] Individual contact toggles.
- [ ] Rich text combinations: paragraphs, bold, italic, lists.
- [ ] Letter image/text-flow combinations.
- [ ] Images near page/content boundaries.

## Exit gate

- [ ] No scenario silently clips or loses user content.
- [ ] Unsafe output is blocked or clearly flagged by preflight.
- [ ] No content/header/footer/image overlap remains in supported scenarios.

---

# M9 — Visual & Product Acceptance

Status: `OPEN`

Goal: prove the new version is not only technically correct but actually looks like a professional, coherent application dossier.

## 39-PDF human review

Review every generated complete dossier and classify findings as `PASS`, `POLISH` or `BLOCKER`.

- [ ] Title page quality.
- [ ] CV page 1 quality.
- [ ] CV continuation/page 2 where present.
- [ ] Motivation-letter quality.
- [ ] Consistent page margins.
- [ ] Header/footer quality.
- [ ] Typography and contrast.
- [ ] No clipped decoration.
- [ ] No elements outside A4.
- [ ] No excessive empty/decorative zones.
- [ ] Motivation letter still reads visually as a letter, not a mini title page.
- [ ] The complete set reads as one coherent dossier.
- [ ] Preview and PDF are visibly consistent.

## Responsive/product smoke

Use representative template families rather than multiplying every template by every viewport.

- [ ] Small mobile (~360 px).
- [ ] Common mobile (~390 px).
- [ ] Tablet.
- [ ] Desktop.
- [ ] Editor remains usable.
- [ ] Preview remains reachable/readable.
- [ ] Dialogs and controls are not clipped.
- [ ] No unintended horizontal application scroll.
- [ ] Download/export remains usable.

## Exit gate

- [ ] Zero `BLOCKER` findings.
- [ ] Remaining `POLISH` findings are explicitly accepted or fixed.

---

# M10 — Release & Main Integration

Status: `OPEN`

Goal: integrate and ship the exact validated version without losing history or weakening the gates.

## Work

- [ ] M1–M9 exit gates are green.
- [ ] Release branch is not behind `main` before integration.
- [ ] Resolve integration conflicts deliberately and review them.
- [ ] Do not force-push/rebase/amend/squash published Lovable-connected history.
- [ ] Mark the intended release commit.
- [ ] Integrate into `main` with the repository-safe workflow.
- [ ] Run complete CI again on `main`.
- [ ] Run 39/39 PDF gallery again on `main`.
- [ ] Confirm production deployment succeeds.
- [ ] Production smoke: title page.
- [ ] Production smoke: CV.
- [ ] Production smoke: motivation letter.
- [ ] Production smoke: complete dossier PDF.
- [ ] Load an existing saved dossier in production.
- [ ] Create and export a new dossier in production.

## Final exit gate

- [ ] The exact `main` commit running in production has passed all release gates.
- [ ] No known blocker remains for normal classroom/user use.
- [ ] The letter overhaul branch can be considered complete rather than an ongoing M1/M2 experiment.

---

# Next action

Proceed with **M6 — Release-Candidate CI Truth**. Do not add new letter features until the current M1–M5 implementation is reproducibly green on the exact release-candidate commit.
