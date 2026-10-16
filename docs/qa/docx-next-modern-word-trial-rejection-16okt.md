# Modern grouped pill Word failure and three document test plan

**PARTIAL overall. Word feedback rejects the grouped-pill trial. The failed application download is blocked explicitly. The previously reviewed Modern export remains byte-identical in three actual application exports. Contact headers and CV rubric pills remain known fidelity failures, not new passing candidates.**

Subsequent work: [three measured Modern interior candidates](docx-next-modern-interior-candidate-17okt.md) now pass bounded application/supplementary checks and are prepared for Word testing. This failure receipt remains historical; the grouped cover pill stays rejected and blocked.

Branch: `investigate/docx-next-design-fidelity-16okt`. Reviewed parent: `d972bb15180776febc8c198c0812aa3624cbe64d`. Remote dev re-fetched and verified at `8901a830a792d75e9e792345c5180827218b4e1e`. No work is rebased onto another investigation or protected branch.

## What the new evidence actually establishes

Both uploaded PNGs were available locally and inspected. The automatic missing-image messages in the conversation do not describe this inspection. [Receipt](docx-next-modern-word-trial-rejection-16okt/word-feedback.json) records hashes and observations without republishing the uploads.

The cover crop shows a filled pink capsule and the visible text **Lehrbeginn August**. The expected year **2028** is missing. This rejects visual/content acceptance of the reported grouped-pill trial, despite its earlier successful LibreOffice render. It does not prove that the original DOCX lost the year, nor that grouping is impossible in Word.

The second crop shows narrow gray page-edge bands, a CV title/name, and complete compact body contact rows. It shows no contact header. This appearance is consistent with the compact-header trial, but a cropped screenshot does not identify a DOCX filename or its saved header settings. Do not claim it proves a new contact-header regression, white-edge defect, or Save/Reopen change.

No newly returned DOCX, Word-generated PDF, or desktop Microsoft Word is available in this follow-up. Neither screenshot establishes exact source equivalence, file identity, Word version, edit history, or Save/Reopen stability. The association with the grouped candidate is based on the user's report and conversation sequence. That is sufficient to withdraw the trial conservatively; it is not an exact package-level reproduction.

## Technical diagnosis and bounded response

The retained generated normal trial, SHA256 `a6efa8e816fb04a50e2f68156f43a9aa5c9c6631835fe3a5c067729a293adb62`, still contains the native semantic control `cover.lehrbeginn` and the full text `Lehrbeginn August 2028` exactly once. Its canonical frame is 53.901074 mm wide, 8.830333 mm high, with 4 mm horizontal and 1.6 mm vertical padding; Arial 12 pt and a minimum line height of 15.96 pt. Its WordprocessingShape requests no wrap, no autofit, and text overflow. Package completeness and those attributes did not guarantee Word's actual display.

The failing boundary is the new native shape's Word text layout, assuming the reported screenshot is from that unmodified candidate. Different shape text-rectangle/inset interpretation, wrapping, or Word font/layout metrics are hypotheses. The available evidence cannot choose between them. The earlier preset-shape inset correction was demonstrated only in LibreOffice and did not establish Word compatibility. No arbitrary enlargement, reduced font, hidden duplicate text, rasterized semantic text, or XML repair is introduced.

The actual app export boundary now rejects every explicit `coverBadgeComposition: "native-shape"` request before reading saved data, measuring fonts, or rendering. Old badge-trial URLs show a disabled **Pillenversuch gesperrt** button and a clear explanation. Combined badge/interior trial URLs reject too. There is no silent substitute export. The canonical experimental primitive and fixture-level renderer tests remain available for diagnosis; they are not app acceptance tests.

The reviewed Modern path remains `/?docx-next-design-qa=1` without the badge trial flag. Its separate editable date text and painted capsule are preserved. Default production routing and the other templates are unchanged.

## Exactly three documents for the next human test round

The user should not repeatedly save known-failing files. The next useful handoff is **three complete dossier DOCX files**, each including cover, letter and CV:

| Planned handoff | Distinct behavior to prove | Current status |
| --- | --- | --- |
| `01-Modern-Kontakt-waagrecht.docx` | Real horizontal contact header on Letter/CV, automatic colors/contrast, correct page-edge geometry | Not ready; existing diagnostic fails fidelity |
| `02-Modern-Kontakt-untereinander.docx` | Three authored contact groups, correct header height/body clearance, first and actual continuation page | Not ready; existing diagnostic fails fidelity |
| `03-Modern-Lebenslauf-Rubrikpills.docx` | Flowing CV rubric capsules with complete editable headings, padding, contour, fill/outline and saved offsets | Not ready; existing diagnostic uses rectangular text shading |

These names are a **test plan**, not claims that new fixed files exist. The three older `DIAGNOSTIC-NOT-ACCEPTED-*` files remain historical evidence; do not rename them as fixes. All three future candidates should start with the previously reviewed separate cover pill. A grouped-pill replacement needs its own successful Word proof before it is included in that matrix. This avoids expanding the failed mechanism to three documents or other templates.

The root causes of the interior failures are already documented in [the six-case app audit](docx-next-modern-grouped-pill-interiors-16okt.md): missing automatic header surfaces/contrast, inline/stacked composition differences, absent reduced continuation composition, font policy discrepancies, and rubric shading without a capsule primitive. This follow-up does not claim to have fixed those independent defects.

## Verification in this follow-up

- Full unit suite: **1205 PASS, 0 FAIL**, 23106 assertions across 250 files.
- Existing DOCX suite: **392 PASS, 0 FAIL**, 6025 assertions across 60 files; overlaps the unit suite.
- Typecheck, formatting of changed code, lint and production build pass. Lint retains 21 pre-existing warnings and no errors.
- Actual saved-project restore and UI download for normal, 115% scale, and long title/name: **3/3 PASS**, byte-identical to the reviewed parent. All nine corresponding Web cover/Letter/CV PNGs are byte-identical. [Regression hashes](docx-next-modern-word-trial-rejection-16okt/regression.json).
- Actual browser checks verify the disabled UI, explicit app/direct-entry rejection, zero downloads, and unchanged saved documents for the rejected badge and combined trial. The default route remains hidden/rejected. [Gate results](docx-next-modern-word-trial-rejection-16okt/rejections.json).
- The generated normal trial's full semantic text was re-inspected directly. This structural fact does not override the user's visual failure.
- No new document composition or repaired DOCX is delivered; therefore no new LibreOffice rendering is presented as a Word fix. Word editing, dragging and Save/Reopen acceptance remain **UNVERIFIED**, while the reported grouped-pill visual result is **FAIL**.

## Boundaries and next steps

Only the own branch is published by fast-forward. Exact branch and wildcard Vercel deployment exclusions remain false, and push workflow filters exclude the branch. Live deployment/workflow counts and protected refs are checked before and after publication. No default switch, deployment, merge, PDF/Print or Legacy exporter change, native-engine investigation, or frozen Sidebar/Agent A/#14/#25/#38 modification.

The failure triage and app withdrawal are complete. Header and rubric integration and final product acceptance remain open. Establish exact returned Word package/source identity before claiming a root cause for the grouped shape. Independently fix the known header/rubric model defects, prove one representative composition first, and only then hand over the three clearly named dossiers for Word open/edit/Save/Reopen and PDF comparison. Do not expand to all 39 templates.
