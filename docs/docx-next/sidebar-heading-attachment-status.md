# Sidebar heading attachment — bounded continuation checkpoint

Superseded by the [generic heading/metadata prefix checkpoint](sidebar-heading-prefix-status.md). The findings below describe the unchanged controls; the later opt-in prefix resolves their heading/metadata gates and exposes a tighter description-opening blocker.

Starting remote `dev`: **`b130e08362df292cccac3ff0fce7713d3f79bd52`**, freshly fetched and verified against a clean checkout. This follows the [opening-band checkpoint](sidebar-opening-band-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

The requested one-entry reduction passes. Eight controls vary photo/no-photo, populated right rail/empty right lane and nested native entry/flat semantic row. All eight opening and first-school-entry fields stay in their owning first-page body lane, before and after save/reopen. Removing the rail leaves the same native grid and main width, so width changes cannot explain that result.

Restoring the full continuation reproduces detachment of all four first-school-entry fields. Changing only the continuation main-section headings from `keepNext: true` to `false` brings those fields back onto the opening page while preserving all text and the native grid. This identifies paragraph attachment at the overflowing native-row boundary as a contributing factor in the recorded engine. It does not establish the precise LibreOffice implementation defect or a safe product fix.

A separate authored 230 mm spacer puts a multi-page entry near the body-page boundary. Its section heading remains on the preceding page while the entry title starts on the next. **Both the unchanged control and the heading-off alternative fail.** This is an additional real limitation exposed by a stronger acceptance case; it is not evidence that heading-off introduced a regression that the control avoided.

| Diagnostic                                     | Cases | First continuation on opening page | Oversized heading attached |
| ---------------------------------------------- | ----- | ---------------------------------- | -------------------------- |
| Single school entry, factorial controls        | 8     | Pass, all eight fields             | Not applicable             |
| Full continuation, original heading attachment | 1     | Four school fields detached        | Not applicable             |
| Full continuation, heading attachment disabled | 1     | Pass, all eight fields             | Not applicable             |
| Oversized entry boundary, original attachment  | 1     | Not an opening-flow expectation    | Orphaned                   |
| Oversized entry boundary, attachment disabled  | 1     | Not an opening-flow expectation    | Orphaned                   |

The earlier opening-band failures were therefore not caused by merely having a picture, a right rail or a nested short entry. The complete tail and page overflow matter. Removing `keepNext` alone does not satisfy both required gates. No production primitive is accepted from these probes.

## Retained work

- `tests/fixtures/docx-next/sidebar-heading-attachment.ts` declares the 12 neutral native specimens. It preserves semantic IDs, editable text, original nested reference content and the native geometry. The heading-off alternative exists only in this diagnostic fixture.
- `scripts/docx-next-heading-attachment-probe.ts` renders them through the unchanged generic renderer and verifies byte-identical native packages after model JSON roundtrip.
- `scripts/docx-next-heading-attachment-qa.py` uses fresh profiles/outputs for package validation, PDF rendering, DOCX save/reopen, owning-lane first-page fields, whole semantic text and the exact expected oversized-heading rejection. Unexpected acceptance stops for review.
- `scripts/docx_next_flow_qa.py` adds a reusable explicit-fixture heading/entry same-page gate. Two Python tests prove that preserved whole-document text cannot substitute for actual attachment. A Bun Sidebar unit keeps the 12 diagnostic packages deterministic through model JSON.

All application experiments were reverted. No file under `src/`, registry, template definition or production export changed. No template-specific renderer branch, visible-text renderer matching, measurement-driven pagination, semantic rasterization or export repair was added. The picture-before-later-span guard remains active. Original opening-band diagnostics remain unchanged.

## Validation and limits

- **31 supported Sidebar fixtures / 253 pages:** fresh package/render/save-reopen QA passes. All 31 source DOCX packages are byte-identical to the starting-checkout packages under the same local image adapter.
- **12 diagnostics / 52 pages:** packages, semantic preservation and save/reopen pass; all intended positive/negative outcomes reproduce before and after reopening.
- **12 native model JSON package roundtrips**, **31 deterministic/immutable Sidebar model roundtrips**, the mirrored-photo application rejection and **two actual portable project/photo JSON export–import–storage restorations** pass.
- **Seven Python flow/attachment tests**, Python compilation, changed TypeScript/docs formatting and whitespace checks pass.

Local converter: **LibreOfficeDev 26.8.0.0.alpha0, `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`**, supplied CLI. Pinned stable 25.8.7.3 and Microsoft Word were unavailable. The supported-fixture image adapter remains explicit Pillow normalization; browser decoder acceptance was not repeated locally. These limits are recorded in [machine evidence](sidebar-heading-attachment-evidence.json).

The offline dependency cache is not the frozen-lock installation, and Bun is unavailable locally. Local full application TypeScript/lint cannot supply release acceptance. Publication CI supplies the targeted DOCX units within the full Bun suite, locked TypeScript/lint/build and browser/PDF/dossier regressions; its final commit-specific result is reported separately. No manual deployment, branch promotion or production DOCX change was performed.

## Reproduce

```sh
bun scripts/docx-next-heading-attachment-probe.ts /tmp/docx-next-heading-attachment
python scripts/docx-next-heading-attachment-qa.py /tmp/docx-next-heading-attachment --soffice /path/to/soffice
python scripts/docx-next-flow-qa-test.py
bun run test:docx-next
```

For pinned stable verification, replace the converter option with `--libreofficekit /path/to/lo-kit --require-stable`. The suite records expected counterexamples and never automatically changes support policy.

## Exact next task

Prototype a **generic native attachment prefix for the section heading and first-entry opening metadata**, with the oversized description remaining in natural editable flow. First investigate whether the existing generic entry/table primitives can represent that prefix without adding a new block type; any additional primitive must be shared across all templates and declared semantically. Require both first-entry opening flow and heading attachment at the oversized boundary in the 12-case matrix, including save/reopen and pinned stable verification. Do not merely switch section headings to `keepNext: false` or flatten authored reference grids. Keep the mirrored-picture guard until short, long-both-tracks and running-header cases pass. No further template migration starts before this generic boundary is resolved.
