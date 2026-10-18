# Modern CV rubric pills: returned Word evidence and bounded spacing trial

**PARTIAL. The old rubric trial fails actual Word rendering (six of seven backgrounds are displaced). One new actual app-generated Modern CV spacing candidate passes structural and supplementary rendering checks. Its desktop Word visual, editing and Save/Reopen acceptance is UNVERIFIED.**

Working branch: `investigate/docx-next-design-fidelity-16okt`. Parent: `6130fb4cb8504e535142189af192cec5ac4c2533`. Remote dev was fetched and remains `8901a830a792d75e9e792345c5180827218b4e1e`. The user cancelled further work on Word's inactive header/footer dimming. This change concerns CV rubric positioning only; it does not reopen that request, change the default export, or expand template coverage.

## Actual evidence and independent diagnosis

Both supplied files were available and inspected: `03-Modern-Lebenslauf-Rubrikpills.docx` and the corresponding PDF. The PDF identifies Microsoft Word for Microsoft 365 as creator/producer and contains four A4 pages (cover, Letter, two CV pages). The supplied DOCX is **byte-identical to the original handoff**, SHA-256 `c8e997cae9725dcffafbe45dcae0e10d890dfdca2b1aebc036db134daf7c2a75`. It therefore supplies no changed/saved DOCX round-trip proof. The immutable [Word PDF](docx-next-modern-rubric-word-return-18okt/word-before.pdf), its metadata and measurements are retained in [validation.json](docx-next-modern-rubric-word-return-18okt/validation.json).

The PDF confirms a DOCX-to-Word positioning defect, not missing CV fields: every rubric label is present, but six background capsules sit above their text. Familie is almost empty, with its label below the capsule. Hobbys & Interessen, first on the CV continuation page, is correctly contained. The previous LibreOffice renders contained all seven labels and therefore gave false reassurance about Word. The earlier line-anchor solution is rejected for Word; successful native package generation did not establish visual correctness.

The native source has a 4-mm before-gap plus 0.8-mm capsule padding: 272 twips / 13.6 pt. The previous flow block's after-gap varies. Comparing Word with the prior supplementary render gives:

| Rubric                   | Extra text-to-paint separation in Word | Expected unowned collapsed gap | Result         |
| ------------------------ | -------------------------------------: | -----------------------------: | -------------- |
| Familie                  |                               13.61 pt |                       13.60 pt | Outside        |
| Schulbildung             |                                5.14 pt |                        5.10 pt | Partly outside |
| Praktika & Schnuppertage |                                5.26 pt |                        5.10 pt | Partly outside |
| Sprachen                 |                                5.19 pt |                        5.10 pt | Partly outside |
| Hobbys & Interessen      |                               -0.05 pt |             0 pt at page start | Contained      |
| Stärken                  |                                9.33 pt |                        9.35 pt | Partly outside |
| Referenzen               |                                9.35 pt |                        9.35 pt | Partly outside |

All residuals are below 0.2 pt. Away from page start, the predicted value is `max(0, heading.before - previous.after)`. This strongly supports a difference in how Word's line reference accounts for collapsed before-spacing relative to text ink. The low-level engine explanation remains an inference; the PDF proves the displacement and its numerical relationship, not Word's internal implementation. Microsoft's [paragraph spacing documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.spacingbetweenlines?view=openxml-3.0.1) specifies the maximum of adjacent before/after spacing, and [vertical reference documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.verticalrelativepositionvalues?view=openxml-3.0.1) defines the available line reference. Neither specification proves rendering acceptance.

## Smallest bounded candidate

Transfer the source-derived collapsed gap to the **preceding existing flow block**, then set the capsule heading's native before-spacing to zero. The gap is owned once. Six preceding native paragraphs and the already-required native table-ending paragraph carry the seven gaps. The pure canonical model records that ownership; the renderer emits it directly.

No new paragraphs, spacer chains, tables, frames, textboxes, page coordinates or package repairs are introduced. Existing line anchors, decorative pictures, their offsets and colours stay unchanged. Semantic text remains native `Heading1`, with the same runs, SDTs, typography and editability. Cover and Letter models remain identical.

The exact package comparison is unusually narrow: only `word/document.xml` differs from the original. Exactly 14 paragraph spacing attributes change: seven heading `before` values become zero and seven predecessor `after` values become 272 twips. Removing only before/after attributes makes the two complete document XML trees identical. Every other package part is byte-identical, including styles, headers/footers, pictures, relationships and crops. This is evidence about the generated packages; no XML is patched after generation.

Alternatives considered: per-rubric offset corrections would depend on context and page breaks; absolute CV frames would disrupt native flow; a new table/textbox wrapper would introduce additional pagination and editing changes before proving that it is necessary. Rasterized text would lose editability. Native rectangular shading would lose capsule geometry. A larger layout system is not justified by the measured spacing defect. The chosen trial removes the identified ambiguity with the smallest output change, but still requires Word proof.

## Controlled application integration

Activation requires **all three** explicit flags:

`/?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-rubric-spacing-qa=1`

Click **Modern CV-Pills Abstand testen**. The download is labelled `CV-Pills-Abstand-Test`. The ordinary interior test now rejects CV rubric pills with an explicit message because its previous Word positioning failed. Default header cases remain available; the grouped cover-pill trial stays blocked. The application export captures fresh cover/interior measurements from the restored saved state and uses the existing canonical builder and native renderer.

This remains Modern-only, supported Sans/Western text, classic CV, full-width flowing sections with `startPage === 1` in the canonical source and supported preceding paragraphs/nonfloating tables. Unsupported/missing/stale measurements and font/overflow gates remain in force. Invalid spacing ownership, floating table predecessors and unsupported flow contexts fail clearly. The table after-gap is gated behind the diagnostic renderer option. No production export-default switch is made.

## Verification and exact handoff

- **One normal Modern CV pill trial**, restored through the real application's project file input, then exported by the actual new button. UI download equals app-entry bytes; export leaves the saved project unchanged; metrics are keyed to the actual snapshot. [App evidence](docx-next-modern-rubric-word-return-18okt/app-evidence.json) and the project/snapshot/measurement/model files preserve the source. This does not claim equivalence to any other unseen saved design.
- **Four A4 pages**, all individually inspected: one complete cover, one Letter, two CV pages. Seven supplementary capsule-containment checks pass; all four native page PNGs are byte-identical to the previous normal dossier. No new cover page, content loss or new supplementary overlap/clipping.
- **Three Web captures** (cover, Letter, CV), two ordinary Next baseline packages and one actual app horizontal-contact-header control are byte-identical to their prior results. The horizontal header remains SHA-256 `22c6d850b579fa43b964f1eecea0517d62ffb2cbc3c5aa47f2317f95fd6239a7`. [Regression record](docx-next-modern-rubric-word-return-18okt/regression.json) and [header control](docx-next-modern-rubric-word-return-18okt/header-control.json).
- **Two actual app rejection cases**, no downloads: the rejected old rubric-anchor route and opt-in off. [Rejections](docx-next-modern-rubric-word-return-18okt/rejections.json).
- **1218 unit tests PASS**, 0 failures, 23341 assertions / 253 files. **405 DOCX tests PASS**, 0 failures, 6258 assertions / 63 files (overlapping suite). Four new spacing tests cover gap ownership, native structure/semantics, invalid states and explicit gating. Typecheck, changed-code formatting and complete Vite/Nitro build pass. Lint: zero errors, 21 existing warnings. React review: derived visibility only, no new effects or store synchronization.

[Verification](docx-next-modern-rubric-word-return-18okt/verification.json), [hashes](docx-next-modern-rubric-word-return-18okt/sha256.json) and [changed files](docx-next-modern-rubric-word-return-18okt/changed-files.json) identify the bounded result. The single new handoff is **[04-Modern-CV-Pills-Abstand-Test.docx](docx-next-modern-rubric-word-return-18okt/04-Modern-CV-Pills-Abstand-Test.docx)**, SHA-256 `22babce0e1893557011e65384e151711d98913f1cefd2a3ea08563e0d2c7c39c`.

## Reproduction

Use the existing locked Bun/Node/Chromium environment and verified Liberation Sans profile. Word requests Arial; target font identity is still unverified. No native engine binaries or lockfile change.

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
 DOCX_NEXT_RUBRIC_SPACING=1 DOCX_NEXT_COVER_CASES=cv-pills \
 bun scripts/docx-next-brief-app37c.ts /tmp/modern-rubric-spacing
bun run test:docx-next
bun test tests/unit
```

Render the downloaded candidate with the established `render_docx.py --dpi 120 --emit_pdf`. Retain the previous same-state normal render and app captures. `scripts/docx-next-rubric-word-return37d.py APP_CASE PRIOR_INTERIOR_PACKET PRIOR_RENDER UPLOADS OUTPUT` measures supplied Word offsets, verifies source/model/package identity and supplementary regression, and copies the untouched app download and input PDF. It never modifies the DOCX. The supplied files must be in `UPLOADS` under their original names. Run the ordinary interior mode with `DOCX_NEXT_COVER_CASES=header-inline` for the header control. The app runner's `rejected-rubric-anchor` and `opt-in-off` scenarios reproduce the rejection checks.

## Limits, acceptance gate and publication

The old candidate is **Word NO-GO**. The new candidate is **engineering/supplementary PASS; Word UNVERIFIED**, so the overall result is **PARTIAL**. No desktop Word is available here. LibreOffice containment/pixel equality and passing tests cannot substitute for Word rendering, editing and Save/Reopen.

Only the normal Modern CV spacing trial is attempted. Manually moved rubrics, long labels, arbitrary Word edits, narrower layouts, other typography and the other templates are not newly accepted. Capsule decoration retains its exported width; arbitrary Word edits do not automatically resize it. The existing native two-page CV versus one-page Web layout is preserved, not claimed as full design parity. The input DOCX proves original-byte identity, not a save/reopen round trip.

Next: open **only candidate 04** in desktop Word, inspect all seven CV labels and the continuation-page heading, then edit one short heading. Save under a new name, close, reopen and export a PDF. Return that saved DOCX and Word PDF. Check capsule/text alignment, native text/controls, page count, and unchanged cover/Letter after reopening. If it fails, diagnose the new bytes before trying another mechanism. Only after this normal Word gate passes should moved/long/reflow stress cases be attempted; do not expand to all 39 automatically.

Publish by fast-forward to the existing investigation branch only. Exact-branch and wildcard Vercel deployment settings are disabled; all 16 workflow push filters exclude it. Live branch deployments/runs and protected refs are checked before/after publication. No dev/main/render modification, merge, deployment, PR, workflow dispatch or default promotion. Native Sidebar geometry/engine, Agent A, #14/#25/#38, PDF/Print and Legacy exporter implementations are untouched.
