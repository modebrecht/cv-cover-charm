# Sidebar heading prefix — bounded architecture checkpoint

Starting remote `dev`: **`19094554f7c35d26b9a497a4aefd0483c8dd1feb`**, freshly fetched and verified against a clean checkout. This continues the [heading attachment diagnostics](sidebar-heading-attachment-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Retained generic composition

`sectionHeadingPrefix(section, prefixBlockCount)` composes existing native Section/Entry blocks. The caller declares how many leading metadata paragraphs belong with the section heading. Their native entry row cannot split; the description and remaining entries stay outside it and remain editable, flowing content. No new model block type or renderer branch is needed.

The helper preserves semantic paragraph IDs, runs, source order and the section body inset. It closes the prefix's outgoing paragraph attachment and removes the first entry's whole-entry atomicity. Missing headings, invalid counts and nonparagraph prefixes fail explicitly. Three unit tests cover the boundary, immutable semantic preservation and inset behavior. A rendered 7 mm inset specimen also checks metadata, description and the following entry before and after save/reopen.

This composition is opt-in and currently used only by neutral diagnostics. Authored reference tables remain intact. The fixture caller derives metadata boundaries from its declared paragraph attachment flags; the renderer never inspects visible text, templates or page measurements. Default application composition, support policy, template descriptors and the picture-before-later-spanning-track guard are unchanged.

## What it solves and what remains blocked

All twelve earlier diagnostics now satisfy both of their original positive requirements with the prefix enabled: the first school entry stays on the opening page in full-tail overflow, and the oversized section heading stays with its entry title. Photo/no-photo, populated rail/empty lane and nested/flat controls pass. Photo geometry, continuous rail paint and complete semantic text survive save/reopen.

Those twelve cases were insufficient for activation. Six finer authored spacer boundaries reveal another real pagination limitation:

| Authored lead            | Heading and metadata | Description opening | Result                       |
| ------------------------ | -------------------- | ------------------- | ---------------------------- |
| 220 / 224 mm             | CV page 1            | CV page 2           | Detached; activation blocked |
| 226 / 228 / 230 / 234 mm | CV page 2            | CV page 2           | Attached                     |

Both negative boundaries reproduce after native DOCX save/reopen. All description text survives; whole-document text preservation does not satisfy attachment. These are explicit expected counterexamples, not accepted product behavior. Unexpected outcomes stop QA for review.

Native paragraph attachment across the prefix boundary, an attached two-row nested table and a flattened paragraph chain were also probed. They did not satisfy the tighter boundary set in the available engine. Their renderer/model experiments were reverted. The retained helper promises heading/metadata grouping, **not attachment of the following description**. Enabling it globally now would leave a known failure.

## Validation and limits

- **19 prefix diagnostics / 115 dossier pages:** package checks, PDF rendering, native DOCX save/reopen, complete text, semantic field ownership, photo frame, rail paint and inset gates pass with exactly the two documented description counterexamples.
- **19 native model JSON package roundtrips:** byte-identical packages; all semantic paragraph IDs/runs equal the unmodified control models.
- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen QA passes. Regeneration after the final change remains byte-identical to the starting-checkout packages under the same explicit image adapter.
- **12 unmodified controls / 52 pages:** the prior positive/negative outcomes reproduce; final regeneration is byte-identical to those validated controls.
- **31 deterministic/immutable Sidebar model roundtrips**, mirrored-photo rejection, **two actual portable project/photo export–import–storage restorations**, seven Python flow tests, Python compilation, formatting and whitespace checks pass.

Local converter: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`, supplied CLI. Pinned stable 25.8.7.3 and Microsoft Word were unavailable. Supported fixtures use explicit Pillow image normalization; local browser decoder acceptance was not repeated. [Machine evidence](sidebar-heading-prefix-evidence.json) records these limits and each diagnostic outcome.

Bun is unavailable locally and the offline dependency cache is not the frozen-lock installation. Commit-specific publication CI supplies the full Bun suite, locked TypeScript/lint/build and browser/PDF/dossier regressions; its final result is reported separately. No production export, deployment or branch promotion is part of this change.

## Reproduce

```sh
bun scripts/docx-next-heading-prefix-probe.ts /tmp/docx-next-heading-prefix
python scripts/docx-next-heading-prefix-qa.py /tmp/docx-next-heading-prefix --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

For pinned stable verification, select `--libreofficekit /path/to/lo-kit --require-stable`. Expected counterexamples remain blockers; this runner never changes application support policy.

## Exact next task

Develop a reusable native binding from the heading/metadata prefix to the **beginning of the flowing description**. Require attachment at both 220 and 224 mm authored boundaries, retained multi-page description flow, full-tail opening flow, preserved insets and save/reopen. Recheck the boundary set on pinned stable LibreOffice when available before activation. Keep this helper opt-in and the mirrored-picture guard active until the generic composition passes the wider photo, long-both-tracks and running-header cases. Do not begin template migration or add template-specific rendering.
