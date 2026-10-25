# DOCX Next — Word/PDF feedback for dossier 01 (21.10.2026)

Branch: `fix/docx-next-shared-fidelity-18okt`. No production export switch, merge, or deployment.

## Source of acceptance feedback
User supplied two PDFs for the same restored three-page Modern dossier: `01-Modern-Eine-CV-Seite..pdf` (Microsoft Word PDF) and `01-Modern-Eine-CV-Seite(1).pdf` (app PDF). Word's CV rubric capsules were visually preferred. Word lacked the letter's visible “Beilagen” heading; the language “Französisch” wrapped its final letter in the narrow column.

## Corrections
- Repair four previously truncated GitHub files by restoring full, verified source and regression tests from the preserved working snapshot; the corruption was introduced in commit `4b1102f`. Changes from subsequent cover commits are retained.
- Add a semantic editable “Beilagen” heading preceding visible letter attachments in shared DOCX Next model; hidden/empty attachments remain absent. Keep user attachment font/size settings.
- Raise the default half-width language label rail from 20 to 24 mm; preserve date rails, full-width labels, section widths, source values and explicit user settings.
- Make browser/PDF CV pills airier and subtler with 2.9 mm horizontal padding and lighter surface/stroke. No template-specific CSS or DOCX pill change.

## Verification
- 15/15 focused tests passed, including new heading visibility tests, source immutability, reading rails and native typography integration.
- TypeScript typecheck and production build passed.
- Full suite: 1,264 passed, 4 failed (existing/newer Cover authored paint and decoration expectations, outside this narrow acceptance batch); do not claim complete green QA or cover acceptance.
- App UI QA restored dossier 01; DOCX/PDF exported successfully, no reported issues, byte-identical UI download, one CV page. XML confirms two “Beilagen” headings across cover/letter and the literal “Französisch”.
- Desktop Microsoft Word re-open visual check remains UNVERIFIED. Do not switch production export or merge until accepted.
