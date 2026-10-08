# Main-lead ending attachment leaves the left opening split unchanged

After the strict [multirow identity/grid counterexamples](sidebar-container-span-status.md), isolate only `cellEndKeepNext` on the existing empty **main lead-cell ending** at 220 mm. All three rows, the side's spanning owner, complete native descriptions, metadata/description owners, physical lanes, all paragraph properties and other cell endings are unchanged. Four sources compare false/true in right and left orientations, with right controls first. The false controls match the prior side-ending packages byte for byte. All source and restored model JSON packages are immutable and reject normal export; no renderer or application change is made.

| Side | Main lead ending | Main opening CV pages | Side opening CV pages | Pages | Product result |
| --- | --- | --- | --- | --- | --- |
| Right | false | 2,2,2,2,2 | 1,1,1,1,1 | 21 | bounded pass |
| Right | true | 2,2,2,2,2 | 1,1,1,1,1 | 21 | bounded pass |
| Left | false | 1,1,1,1,2 | 1,1,1,1,1 | 21 | main description detached |
| Left | true | 1,1,1,1,2 | 1,1,1,1,1 | 21 | main description detached |

Local Dev 26.8 / CLI executes **four actual cases / 84 dossier pages**, plus native Save/Reopen and second PDFs. Complete native/PDF text, all 41 canonical tags and body/lane bounds pass. Every pair's 42 source/saved candidate page rasters matches its control exactly. Both descriptions remain whole native paragraphs; no segmentation, visible-text ownership matching or XML repair is involved. The flag-only hypothesis shows no effect and supplies no pagination remedy. The left first-CV-page image is visually reviewed and still shows the metadata without its description; candidate/control pixels are identical. [Actual evidence](sidebar-lead-main-ending-evidence.json) retains both left failures.

A new read-only audit resolves each of ten CV paragraphs through its exact native field ID, verifies one complete paragraph and unchanged native row/cell ownership, and requires **explicit** `keepNext`, `keepLines` and `widowControl` values plus all nine required empty-ending flags. It does not assume missing flags from style inheritance. Save/Reopen changes the controls from block to inline form, but the exact paragraph owners and explicit rules survive. These facts exclude lost authored paragraph/ending flags in this bounded result; they do not identify the editor's full layout cause. Table captions still disappear, and field ancestry is not substituted for native container identity. The separately failed exact-grid requirement is not relaxed.

Ten adversarial paragraph/ending tests reject missing/duplicate IDs, missing/changed flags, fragmented paragraphs and changed native owners. Five further baseline tests lock source controls, caption failure, native policy, left opening pages and page pixels. Existing diagnostic matrices and application/export gates remain unchanged. Independent stable 25.8.7.3 / Kit run 37742765158 on published `58a27488`, job 113197097930, reproduces all four actual cases / 84 pages and every native/visible observation. Artifact 11535325245 SHA-256 `85cd33c64c9209619fc78d4fe8c38bee797582b9f99c3bba664415314863c238` is verified; all eight opening PNGs match local RGBA pixels. All three stable jobs and application/M6 37742765231 (all eight browser groups) pass. Final evidence-publication CI is checked separately; Microsoft Word remains pending. Counts remain 29/39 configured, 0/39 Word accepted.

```sh
bun scripts/docx-next-lead-main-ending-probe.ts /tmp/lead-main-ending
python scripts/docx-next-populated-row-qa.py /tmp/lead-main-ending --matrix lead-main-ending --observe
python scripts/docx-next-populated-row-qa.py /tmp/lead-main-ending --matrix lead-main-ending --observe --baseline docs/docx-next/sidebar-lead-main-ending-evidence.json
python scripts/docx-next-attachment-test.py
python scripts/docx-next-populated-row-test.py
```

Next: verify published stable/CI evidence. The left split survives all tested paragraph/row/ending flag changes and whole-description owner moves. A subsequent candidate needs a different generic native composition with independently flowing semantic owners and the same full-text, explicit-ID, exact-geometry and Save/Reopen gates; further flag or width guessing is not justified by this evidence. Keep the existing positive right control and left counterexample, and do not reopen photo/crop work or claim Word acceptance.
