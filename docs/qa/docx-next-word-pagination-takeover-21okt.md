# Modern and Brief CV pagination repair 21 October 2026

Branch: `fix/docx-next-word-pagination-21okt`  
Base: verified remote Fidelity `99e053068bbe28f39fda3861591be997b1bb0b09`  
Status: **code candidate verified locally; Desktop Word acceptance remains OPEN**.

## Diagnosis

The reported Smart Fit failure concerns the CV in Modern 02 and Brief 12: only References overflows onto a second CV page. It is separate from the confirmed Sidebar photo repairs. `6c194c55899f411b85270495b6e84b257645106a` is already an ancestor of this base; the 25 later commits did not repair this pagination issue.

There is a concrete shared exporter mismatch. `default-pagination-density.css` gives ordinary classic CV rubric rows **0.5 mm bottom margin**. The reading-row DOCX builder retained the older **7 px / 1.852083 mm after-spacing**. Seven rubric headings therefore introduce **9.464583 mm** more nominal spacing than the Web default. Native XML previously emitted 105 twips per heading; the corrected value is 28 twips. This is a product defect, not evidence of a LibreOffice-only rounding problem.

The leading `keepNext` on a heading is appropriate: removing it would risk separating the References heading from its first content. This repair preserves that ownership and does not insert or remove explicit page breaks. The second “Lea Müller” in the supplementary Brief render is in the footer, not a duplicate CV entry.

## Repair

Only the shared `cvContentComposition: "reading-rows"` path changes. An unset rubric bottom-margin slider now uses 0.5 mm. A numeric saved user setting, including zero, retains its previous value. Null in older JSON is treated as unset. The older non-reading composition retains its 7 px fallback.

No font scaling, margin changes, content deletion, new fixed heights, paragraph-ownership changes, Word engine patches or template-specific offsets were introduced. Both one-page and two-page reading compositions use the same corrected default rhythm; explicit second-page assignments remain intact. Cover, letter, Sidebar implementation and browser pagination code are unchanged.

## Verification and its limits

| Check | Result |
| --- | --- |
| Four new tests across Modern and Brief: defaults, old null, explicit values, two-page assignment, model invariance and native heading serialization | PASS |
| Ten focused unit suites, including page-fit actions, reading rows/edges, rubric paint spacing, renderer, sections and model | **87 PASS, 0 FAIL** |
| Focused strict TypeScript check of builder/renderer dependency closure | PASS |
| Supplementary native model/render reconstruction, Modern | Before: 2 CV pages, References alone on page 2. After: 1 CV page including References |
| Supplementary native model/render reconstruction, Brief | Same 2-to-1 result |
| Package comparison in both reconstructions | Only `word/document.xml` differs; precisely seven heading `w:after` values change from 105 to 28 |
| Content controls in full reconstruction | Modern 82/82; Brief 80/80; every field ID and text value exact |
| Visual inspection | All six before/after CV page images inspected; no truncation or overlap in the corrected native CV content |
| Fresh full browser/UI export of current Smart Fit 02/12 | **NOT RUN in this workspace** |
| New Desktop Microsoft Word open/save/reopen and Word PDF | **UNVERIFIED** |

The local reproduction uses the repository's saved demo CV from `docs/qa/docx-next-modern-defaults-footer-18okt/project.json`, the current source capture and reading-row builder with compact contacts. Baseline and candidate use identical source, renderer and adapters. For isolated pagination inspection, the final native CV section is extracted unchanged from each three-part package. The paint adapter substitutes solid fills; these are **diagnostics**, not cover-design or current rounded-pill approval samples. The Modern full UI export additionally captures live text/pill/personal-header metrics; those current metrics were not recaptured here. The user's actual failed Smart Fit 02/12 files were not available in this conversation, so these diagnostics must not be relabelled as their exact exports.

The supplementary renderer is LibreOffice 26.8, not Microsoft Word. Its reproduction of the same References overflow strengthens the spacing diagnosis but does not certify the repaired Word page count. Browser measurements plus a 10% reserve remain a heuristic for arbitrary content. This patch removes a demonstrated systematic discrepancy; it does not claim a complete Word layout simulator or guarantee that every future edit fits one page.

## Next step before integration

1. Export the current saved Modern 02 and Brief 12 Smart Fit states through the actual app on this repair revision, capturing fresh source, fitted project, live metrics, model and downloaded DOCX. Include them in the next consolidated acceptance packet; do not send another isolated micro-test request or reuse old downloads.
2. Require one complete CV page including the References heading and all reference fields in Desktop Word, followed by save/reopen. Retain the original typography, user spacing and footer. Longer content and the explicit two-page action must continue to paginate naturally.
3. After that acceptance, prepare one isolated integration branch with the verified Sidebar repair and the newest Fidelity changes. Recheck the existing Sidebar transport against the new head; its old target `3a6f5a11` is stale. Run the combined checks before any merge.

**Verdict: NO-GO for merge/release until current full-app Word acceptance.** The narrow spacing repair is implemented and reviewable. No active Fidelity branch, `dev`, `main` or `render` was modified; no merge, deployment, CI dispatch or export production switch was performed.
