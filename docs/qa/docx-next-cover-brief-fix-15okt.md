# Item 37 — bounded Brief fix candidate and failed fidelity gate

**PARTIAL. Independent investigation complete; guarded Brief candidate implemented. Structural and regression gates PASS. Visual fidelity gate FAILS at 115% scale. Desktop Microsoft Word visual/edit/Save-Reopen acceptance UNVERIFIED. No production promotion or all-39 expansion.**

This continues the [independent review](docx-next-cover-independent-review-15okt.md) at `b6bbd8fb91adbb5143bde5e347b99af98728418c`. The recommendation remains to preserve authored cover composition with the existing automatic-height native paragraph frames, images and separate nonsemantic paint. The bounded implementation now shares visible labels, role defaults and anchor relationships with the Web component. It substantially improves the complete cover arrangement. It does not yet prove a faithful Word export: font substitution and native line metrics remain a concrete blocker, demonstrated by a failed scale case rather than inferred from unit tests.

## Base, evidence and boundaries

Remote `dev` was fetched again and remains `8901a830a792d75e9e792345c5180827218b4e1e`. Work is on `investigate/docx-next-cover-fidelity-15okt`, descending directly from the independent audit. Root `AGENTS.md` prohibits rewriting published history; no historical experiment is applied or rebased. The previous rejected floating-table experiment remains rejected.

The original eight supplied files were inspected during the preceding audit, whose checked-in measurements and byte-identical reproduction remain available. After the workspace was re-provisioned during this continuation, the original user attachments are **not present in this workspace**. They were not re-inspected here. The original saved Web project JSON was never available. This packet uses new, controlled public DEMO fixtures, not a claim of recovery of the user's exact saved Web design. Its normal fixture uses the ordinary Brief/classic CV: one cover, one letter and two CV pages in both before and candidate. The earlier original-case reconstruction has three dossier pages and a different frozen CV composition; those counts are not interchangeable.

No change to the native renderer/OOXML primitives, Sidebar geometry, Agent A, Items 14/38, PDF exporter, Legacy DOCX, production export UI or native engine. No XML repairs, fixed text heights, text rasterization, spacer chains, deployment or merge. The new option is diagnostic only: `coverComposition: "authored-frames"`. The existing renderer additionally refuses paragraph frames unless `allowUnacceptedModelIssues: true` is explicitly supplied.

## Confirmed diagnosis and architecture

The original review's prioritized defects remain valid:

| Priority | Defect and cause                                                                                                                                                     | Candidate treatment / remaining limit                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1       | `composeCover()` converts authored X/Y, linked and bottom-anchored text to descriptor-ordered normal flow. The middle hero and both lower columns move near the top. | Existing paragraph frames retain page X/Y/width; shared anchor resolver retains follows/above/bottom relationships. Normal title group and lower columns now occupy the intended regions.                                                                                           |
| P1       | Brief descriptor uses `datum`, actual source is `ortDatum`; the date sorts last in normal flow.                                                                      | Frames use the actual source ID and authored top-right coordinates. No template-specific spacer or sort patch.                                                                                                                                                                      |
| P1       | Native composition moves photos inline, caps width and omits the visible null-photo initials.                                                                        | Existing page-addressed native images retain size/ratio/crop/zoom; initials are editable native text over nonsemantic paint. The existing renderer's content-width limit is rejected explicitly rather than silently shrinking wider authored images.                               |
| P1       | Raw BlockStyle omits CSS role typography, footer casing/copy and user-style precedence.                                                                              | Pure shared labels/role defaults now supply both Brief Web text styles and candidate model. Explicit element edits win. Font realization, weight 600 versus Word's bold model, half-point serialization and line metrics still differ.                                              |
| P1       | Native character-count reservations are not a font measurement or an overflow proof.                                                                                 | Model checks reject estimated collisions/bounds and unsupported paint/list states. The 115% case proves that these checks cannot establish actual wrapping parity. This is an acceptance blocker.                                                                                   |
| P2       | Decorative/image raster placement and very thin outlines can differ in native rendering.                                                                             | Portrait and round synthetic photo placement/mat are substantially aligned. The 1px no-photo outline's right edge is much lighter in this LibreOffice PDF although the embedded PNG contains the dark edge. Exact rendering cause is unresolved; no engine workaround is attempted. |

The shared presentation contract is deliberately declared only for Brief (`authoredCoverPresentation: "semantic-roles"`). It is a capability guard, not an acceptance flag or a claim that the other 38 CSS presentations have been modeled. The default model builder is deeply identical to the previous branch head for all seven fixtures. All seven actual Web screenshots are pixel-identical before/after this refactor.

The canonical boundary stays intact: source blocks/settings → pure composition → serializable model → unchanged native renderer. Browser rectangles, HTML, CSS and PDF pages are not imported into the canonical model. The generator uses the existing browser decoration rasterizer only for nonsemantic paint.

## Alternatives critically reassessed

| Option                                                                  | Fidelity/editability and page behavior                                                                                                                            | Maintenance / decision                                                                                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Normal flow with adjusted gaps                                          | Editable, but cannot retain arbitrary saved X/Y or independent lanes. Growth moves later fields.                                                                  | Small local patches accumulate exceptions. Rejected as the fix.                                                                   |
| Per-field floating tables                                               | Editable and addressable, but the prior experiment failed native placement in 38/39. Successful packaging did not establish layout.                               | Not repeated. Exact engine-level mechanism was not proven and is not asserted.                                                    |
| Fixed-height grid                                                       | Editable text, but arbitrary authored movement requires many spans; fixed heights clip, automatic heights move lower regions.                                     | No evidence justifies this larger constraint system.                                                                              |
| Existing automatic-height paragraph frames plus existing pictures/paint | Smallest available mechanism preserving native semantic text and page geometry. Brief placement is promising; font growth and Word round trips remain unaccepted. | Recommended bounded mechanism, held behind existing guards.                                                                       |
| DrawingML text boxes                                                    | Could express additional shapes/text stories, but does not remove font substitution or wrapping differences by itself.                                            | New renderer/story/autofit maintenance is not justified by this failure. Reserve for a demonstrated primitive limitation in Word. |
| Rasterized semantic cover                                               | Can freeze appearance but loses native editable text.                                                                                                             | Excluded.                                                                                                                         |

The smallest sound next step is **not another placement mechanism**. First establish a matched, explicitly recorded Web/native font profile and test Brief in desktop Word. Then decide whether the existing text measurement/fit policy can be shared through an explicit serializable presentation contract, or whether the supported Word profile needs a defined wrapping/overflow policy. Do not replace the conservative estimate with an empirically chosen shrink factor. This candidate's character-count fit and reservation are provisional diagnostic behavior, not the recommended final metric contract.

## Focused prototype results

Packet: [docx-next-cover-brief-fix-15okt/](docx-next-cover-brief-fix-15okt/). [A4 comparison](docx-next-cover-brief-fix-15okt/brief-a4-comparison.pdf) contains equal-scale Web/candidate covers for all seven cases. [Normal candidate DOCX](docx-next-cover-brief-fix-15okt/normal/candidate.docx) and its [supplementary PDF](docx-next-cover-brief-fix-15okt/normal/candidate/candidate.pdf) are prepared for human Word testing. These are explicitly unaccepted candidates.

| Brief case     | Tested saved content/settings                                                               | Result                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| normal         | Full hero, name/start date, top-right date, two footer columns, null-photo initials         | Placement/copy/style improvement visible; all native text present; one cover. Font widths and thin outline still differ. PARTIAL.                           |
| moved          | Date X105/Y28/W85, right aligned, explicit weight/tracking/line height/opacity; name hidden | Coordinates and explicit native styles retained; hidden name absent. PARTIAL visual/Word gate.                                                              |
| long           | Two-line profession, longer name/address; existing name scale                               | All text present, no observed field collision or clipping. Native line spacing and font widths differ. PARTIAL.                                             |
| scaled         | Global font scale 1.15                                                                      | **FAIL fidelity**: Web profession wraps to two lines, native PDF stays on one. Dependent name position reserves two lines, leaving excessive visible space. |
| photo-portrait | X125/Y45/W40/H60, zoom1.3, crop30/65, border0.6                                             | Native editable picture at authored geometry; synthetic red/blue source/crop retained. PARTIAL visual/Word gate.                                            |
| photo-circle   | Same picture settings, 1:1 circular crop                                                    | Native round picture/mat at authored geometry. PARTIAL visual/Word gate.                                                                                    |
| hidden         | Attachments disabled, photo hidden                                                          | Requested fields absent; remaining content complete. PARTIAL visual/Word gate.                                                                              |

Every case retains four total dossier pages, with all expected cover paragraphs on page 1. All extracted cover glyph bounds remain within A4. All 21 adjacent Letter/CV page PNGs are pixel-identical to their same-source baseline in the Poppler render. Models and source JSON remain unchanged; JSON-restored candidate models generate byte-identical packages. Text including initials is in native `w:t` paragraphs/semantic controls, not paint. The existing Word story is editable structurally; actual selection, editing, growth and Save/Reopen in Word remain **UNVERIFIED**.

### Concrete failed metric gate

Chromium's actual platform-font API identifies **DejaVu Sans Bold** for the profession in this environment, despite the CSS stack beginning with Helvetica Neue/Helvetica/Arial. The native package requests Arial through the established font mapping; the LibreOffice PDF reports **LiberationSans-Bold**. These are not identical realized fonts. Web size 41.4pt is serialized by the existing Word renderer to 41.5pt. The Web profession element is 36.79mm tall (two lines); the PDF extracts a single profession line. The candidate's character-count reservation also estimates two lines. Thus model reservation, visible Web wrap and visible native wrap are three separate facts.

Font substitution is a confirmed contributor, not proof that it explains every remaining pixel. The normal 36pt profession also differs in width, and long-title native line spacing differs. Browser CSS balanced wrapping and role changes happen after the Web resolver's authored metrics; the native estimate does not reproduce that process. Changing the frame story or moving attachments cannot solve this. The prototype is stopped at this gate; no further templates are implemented.

## Actual automated and visual checks

- Complete unit suite: **1,177 PASS, 0 FAIL; 22,832 assertions**. Includes runtime ownership and PDF/Print boundary checks.
- Dedicated DOCX suite including five new candidate tests: **364 PASS, 0 FAIL; 5,751 assertions across 56 files**.
- Typecheck: PASS. Production build: PASS; no deploy command run.
- Changed runtime/tests ESLint: 0 errors, four existing React fast-refresh export warnings in BlockLayer/CoverCanvas.
- Seven actual CoverCanvas captures: zero browser errors, 7/7 pixel-identical to the previous branch head with identical props/local fonts. This is controlled component equivalence, not a saved-project editor round trip.
- Seven native cases: 7/7 content/page/bounds checks PASS; 21/21 neighbor PNGs pixel-identical. All seven full covers and the normal dossier's four pages visually inspected. A4 comparator visually inspected.
- New tests cover explicit edits, aliases/copy/style normalization, source immutability, default renderer rejection, JSON package stability, picture geometry, and rejection of estimated overflow, collisions and undeclared templates.
- Supplementary renderer: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Browser: Chromium 143.0.7499.0. No supported-release LibreOffice matrix or desktop Word available here.
- Desktop Word visual/edit/Save/Reopen: **UNVERIFIED**. All-39 acceptance: **NOT RUN**. Package generation/unit tests do not override the failed visual gate.

## Changed files and reproduction

- Shared Web presentation/anchors: `src/components/cover/presentation.ts`, `anchors.ts`, `resolve.ts`, `BlockLayer.tsx`, `CoverCanvas.tsx`, `types.ts`.
- Guarded canonical composition: `src/lib/docx-next/cover-authored.ts`, `build-model.ts`.
- Tests: `tests/fixtures/docx-next/cover-authored.ts`, `tests/unit/docx-next-cover-authored.test.ts`; dedicated test command in `package.json`.
- Evidence scripts: `scripts/docx-next-cover-brief-fix37.ts`, `docx-next-cover-brief-web37.cjs`, `docx-next-cover-brief-report37.py`; this report and bounded packet.

With Bun, locked dependencies, local Chromium/Playwright, LibreOffice/Poppler, Pillow/PyMuPDF/reportlab and the document render helper installed:

```sh
bun install --frozen-lockfile
bun scripts/docx-next-cover-brief-fix37.ts /tmp/brief37
node scripts/docx-next-cover-brief-web37.cjs /tmp/brief37
# For each of the seven case directories, render both packages:
python /path/to/render_docx.py /tmp/brief37/normal/baseline.docx --output_dir /tmp/brief37/normal/baseline --dpi 120 --emit_pdf
python /path/to/render_docx.py /tmp/brief37/normal/candidate.docx --output_dir /tmp/brief37/normal/candidate --dpi 120 --emit_pdf
# Repeat those two render commands for moved, long, scaled, photo-portrait,
# photo-circle and hidden before running the report.
python scripts/docx-next-cover-brief-report37.py /tmp/brief37
bun run test:docx-next
bun test tests/unit
bun run typecheck
bun run build
```

`CODEX_PRIMARY_RUNTIME_NODE_MODULES` points to Playwright; `DOCX_NEXT_CHROMIUM_PATH` may select the executable. The Web runner owns its Vite lifecycle. To reproduce Web before/after equivalence, run the same capture script against the previous head in a separate checkout with the same snapshots, then pass that output directory as the report script's second argument. The packet retains the normal full native PDFs/PNGs and all seven cover PNGs; other renderer directories are reproducible intermediates. SHA256 hashes and machine-readable validation accompany the artifacts.

## Publication and precise next steps

Before publication the Vercel project `prj_Ip4lHR688tFQ4QZXCrOZ4OfXo6Im` was inspected. Its response omits full Git deployment configuration. Repository `vercel.json` disables both `*` and this exact investigation branch; only `main` is enabled. The branch-filtered deployment list is empty. Workflow push branch filters do not match this branch. Publication is limited to the user-requested public repository, existing synthetic DEMO data and newly invented test variations. No private applicant data or original attachments are added. Branch updates must be non-force descendants of the existing audit head; the final delivery records the resulting commit SHA.

1. Open the normal and scaled candidates in desktop Microsoft Word with font availability recorded. Check the whole cover and all adjacent pages; compare against the same-snapshot A4 Web references. Select/edit every semantic text field and replace the native photo. Save, close/reopen twice, export PDFs each time, and measure placement/line count/completeness. Do not mark this step passed from LibreOffice output.
2. Resolve Brief's font realization and line-layout contract. Re-run normal, 115% scale, long profession/name, contact/attachment growth and saved explicit styles. Establish an explicit overflow rejection/reflow policy and test it after editing. Close the thin-outline rendering discrepancy without engine interventions or XML repairs.
3. Require one complete editable cover, matched composition and relevant saved settings, no collisions/clipping, stable Word round trips, unchanged Letter/CV and a supported supplementary renderer before promoting this candidate.
4. Only then cover representative paint/image/custom-text capabilities. Reject unsupported states explicitly. Expand to all 39 and relevant stress scenarios only after that gate; retain the existing canonical renderer and PDF/Print separation.

Investigation: **PASS**. Bounded structural feasibility: **PASS**. Brief visual fidelity: **PARTIAL / scale gate FAIL**. Word acceptance: **BLOCKED by unavailable desktop Word**. Final Item 37 product acceptance: **PARTIAL, remains open at P1**.
