# Independent review of DOCX Next cover fidelity

**Item 37: PARTIAL. Investigation completed; a Brief placement prototype is reproducible. No cover fix or product acceptance is claimed. Desktop Word acceptance is UNVERIFIED.**

The current DOCX Next cover is a different composition from the Web cover. The main defect is established before Microsoft Word opens the package: authored cover text geometry is converted into normal document flow. Moving the attachment block alone cannot repair the title group, date, contact lanes, images or style resolution. The smallest useful next experiment reuses the existing automatic-height paragraph-frame primitive. This review implements that experiment in a diagnostic script only; production source remains byte-identical to dev.

## Provenance and scope

- Repository: `modebrecht/cv-cover-charm`.
- Fetched authoritative dev: `8901a830a792d75e9e792345c5180827218b4e1e`.
- Isolated branch: `investigate/docx-next-cover-fidelity-15okt`, created directly from that dev with a clean working tree.
- Root `AGENTS.md` read. It prohibits rewriting published history; no subordinate AGENTS file was found.
- Historical branch inspected: `fix/docx-next-cover-bottom-zones-15okt`, diagnostic commit `04d4b15bda7e1f143f801884b826b7eee09dcf4c`. Its patch was read, never applied.
- Item 13 (`c1913a9`) and Item 14 (`43366da`) remain on their own branches. No commits were imported from them.
- No changes to `src/`, existing tests, package manifests, lockfile, Sidebar implementation, native engine, PDF/Print, Legacy DOCX, export UI or production switches.
- No merges, deployments, workflow dispatches, CI restarts or protected-branch writes.

## Evidence actually inspected

All eight user evidence files were available: original `app-body-photo-right.docx`, `saved1.docx`, `saved2.docx`, the two corresponding PDFs and the three dossier screenshots. The saved DOCX metadata identifies Microsoft Office Word 16; both supplied PDFs identify Microsoft Word for Microsoft 365. The original package has nine cover fields, no cover table/frame/drawing, and one CV image.

The historical `sidebarFixture("photo-right", image)` with existing body-stories/distinct-stories diagnostics reproduces **the complete original DOCX byte for byte**, not just its text or screenshot:

`224d4a72efd800e5624bf0abcd88bcc4977d5dbc2127d050b31cb9b42bca85ae`

The checked-in reproduction script takes the original's already normalized PNG as its explicit image adapter input. It does not modify image handling or reopen the Sidebar work. This establishes generator-fixture equivalence with the original package. It does **not** prove that the recovered fixture is the user's original saved editor project: that project JSON is absent, and DOCX is not an injective serialization of all Web design settings.

The Word PDFs have identical extracted geometry and identical rendered pixels on all three pages after the two saves. Their byte hashes differ because their metadata differs. Cover native text is also unchanged in the saved DOCX files. Thus the observed large layout discrepancy is not explained by these Save/Reopen cycles. The grey screen highlight does not appear in the Word PDFs or cover package; its exact UI origin is unresolved and it is not treated as printed artwork.

## Product and data path

1. `/titelblatt` persists cover data, per-template palette, per-template style overrides, custom fields, global font scale and document font. Dragging clears the automatic anchor relationships. Project JSON carries those saved settings.
2. `buildBlocks()` combines the template catalogue, data, overrides and editable decoration defaults. Its blocks retain X/Y/width, `anchorBottom`, `follows`, `above`, gap and user-style provenance.
3. `CoverCanvas` normalizes footer labels, chooses dossier fonts, applies theme CSS, synchronizes default footer columns against final rendered geometry, and delegates editable fields to `BlockLayer`.
4. `resolveLayout()` handles bottom anchors, linked blocks, automatic name/fit scaling and canvas-dependent wrapping. The rendered CSS may further change typography and geometry. Consequently raw BlockStyle alone is not the complete visible Web contract.
5. `captureDossierDocxNextSnapshot()` captures ambient settings once; `toDossierSource()` explicitly selects authored fields. The PDF-named compatibility types do not make native generation depend on PDF page plans.
6. `buildDossierDocModel()` calls `composeCover()`. The latter sorts fields by a Word-specific descriptor, emits native paragraphs, converts some artwork to content-growing table paint, and places photos inline. It intentionally does not use authored text X/Y/anchor relationships to compose the cover.
7. The single native renderer serializes that canonical model. Word correctly flowing the resulting paragraphs cannot recover geometry already discarded by the model builder.

## Capability assessment

| Cover capability supported in Web                                                  | Current DOCX Next treatment                                                                           | Consequence                                                                                            |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Applicant, profession, date, contact, recipient and attachments                    | Native semantic paragraphs and controls                                                               | Text mostly retained; appearance/placement is not implied                                              |
| Free movement, width and linked/bottom placement                                   | Text X/Y and links ignored; width used only by selected boxes/rows                                    | Page composition is lost for the shared composer                                                       |
| Independent left/right lower lanes                                                 | Descriptor ordering or declared table rows                                                            | Brief stacks the lanes vertically                                                                      |
| Global scale, size, bold, italic, underline, alignment, tracking and inline colors | Many authored values mapped to native runs/paragraphs                                                 | CSS roles, label normalization, name-fit and actual font metrics can differ                            |
| Native font choice                                                                 | Font keys mapped to Word fonts and target-application fallback                                        | Browser stack and Word font selection are not identical font availability proofs                       |
| Long titles and max-line fitting                                                   | Web canvas fit/name scaling is not the native text path                                               | Wrapping and dependent block positions can diverge                                                     |
| Photo/custom-image position, size, crop and framing                                | Cover picture becomes inline; width capped at 80 mm, X/Y reset                                        | Authored arrangement and larger pictures cannot be reproduced faithfully                               |
| Initials when applicant photo is absent                                            | Omitted when `cover.data.foto` is null                                                                | A visible Web element has no native equivalent                                                         |
| Custom text/image boxes, backgrounds, padding, borders and minimum height          | Flowing boxes; selected dimensions retained, absolute placement/minimum height not generally retained | Growth is editable but changes the authored composition                                                |
| Rectangles, paths, gradients, decoration opacity and layering                      | Existing nonsemantic paint assets, motifs, or selected native table surfaces                          | Some geometry retained; table-owned paint grows with text instead of remaining an authored rectangle   |
| Visibility and optional recipient/attachments                                      | Filtering and `show...` settings                                                                      | Generally preserved, with descriptor aliases and actual source IDs needing audit                       |
| Paper, chrome and section boundaries                                               | Existing page/artwork/chrome path                                                                     | Independent from fixed cover text composition; no custom Cover margins exist in this snapshot contract |

These shared-code findings affect the 39 registered templates, but their individual visible impact varies. This is a capability audit, not a new 39-template visual acceptance run.

## Prioritized defects and causes

| Priority          | Intended versus observed                                                                                           | Source and reproducible cause                                                                                                                         | Scope and confidence                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P1                | Brief hero belongs around the middle of A4; Word puts it near the top                                              | `beruf` follows `kicker` at authored Y 128 mm; `name` follows profession. `composeCover()` emits ordinary paragraphs in descriptor order              | Confirmed shared geometry loss; affects all covers using authored positioning    |
| P1                | Contact and attachments share the lower lane; Word places contact around 68 mm and attachments around 109 mm       | `anchorBottom`, `above`, footer-pair synchronization and independent widths are not native cover ownership                                            | Confirmed on original and both Word PDFs; common composer                        |
| P1                | Location/date is at top right; Word prints it last around 137 mm                                                   | Brief descriptor names `datum`; actual block is `ortDatum`, which receives unknown-field rank 1000. Normal text flow then places it after attachments | Confirmed source-ID mismatch; other descriptors need an explicit alias audit     |
| P1                | Photo/initials has authored page placement; native cover omits initials and moves uploaded pictures into text flow | `composeCover()` skips null photo sources, sets inline placement and zero X/Y, and caps width                                                         | Omission confirmed by code and original package; exact Web comparison below      |
| P1                | Complete resolved Web typography and edited design should reach native model                                       | Native `textElement()` sees authored values; Web additionally applies role CSS, footer labels, font cascade and size fitting                          | Confirmed split ownership; exact per-template visual impact requires measurement |
| P2                | Authored rectangles remain fixed decorative surfaces                                                               | Selected shapes become row/cell fills with content growth and padding; images/boxes also participate in flow                                          | Confirmed representation difference, not proof of the grey screenshot surface    |
| P1 acceptance gap | Successful OOXML should correspond to one complete, editable A4 cover                                              | Existing semantic/package tests do not establish native layout, collisions, overflow or Word Save/Reopen                                              | Confirmed by the historical rejected experiment despite green structural tests   |

## Critical review of the previous experiment

The previous diagnosis correctly identified geometry loss and the date-ID mismatch. Its broad result is useful rejection evidence: 38/39 native candidates failed, with lower fields leaving page 1. Rejecting that patch was correct.

Its implementation creates a separate floating one-cell table per field with `tblpPr` and `tblOverlap="never"`. That adds table layout and multiple body anchors to an intrinsically fixed page. The observed failure is consistent with that ownership problem; **the exact engine mechanism is not independently proven here**. It would be unjustified to claim a rounding bug or repair the engine.

Its structural tests prove text/model/package preservation, not page placement. Its live Web reconstruction also restored defaults absent from the source fixture. A reconstructed screen is therefore useful product evidence but cannot be an exact frozen reference for the user's original design. The prior matrix used a different CV composition and different LibreOffice versions; its 4-to-5 page result is not compared numerically with this review's same-source 3-to-3 result as if only one variable changed.

## Alternatives and recommendation

| Approach                                               | Fidelity and Word editability                                  | Save/Reopen and page behavior                                                               | Complexity and 39-template cost                                                             | Decision                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Flow paragraphs/tables with extra gaps                 | Native text; poor fidelity to arbitrary authored X/Y           | Natural growth, but moves the whole cover and can add pages                                 | Small patches accumulate descriptor/template exceptions                                     | Reject as the architectural fix                                                            |
| Full-page fixed grid / exact-height cells              | Native text with some grid fidelity                            | Exact heights risk clipping; growing cells move lower regions                               | High constraint/row-span maintenance for freely moved fields                                | Not justified by current evidence                                                          |
| Per-field floating tables                              | Editable and page-addressable                                  | Prior native placement gate failed 38/39                                                    | Already adds table/anchor interactions                                                      | Keep rejected; do not repeat                                                               |
| Existing native paragraph frames with automatic height | Editable real paragraphs, authored X/Y/width, no table wrapper | Brief placement feasible in supplementary render; Word stability and edit growth unverified | Smallest available primitive for text-only Brief; paint/images still need explicit coverage | Recommended next Word placement test                                                       |
| DrawingML text boxes plus separate page paint          | High theoretical free-layout coverage with native text         | Requires new story, anchoring, autofit/overflow and compatibility proofs                    | Higher renderer and regression cost                                                         | Reserve only if Word evidence rejects existing frames or demonstrates a missing capability |
| Rasterized cover text                                  | Visual fidelity with lost text semantics                       | Stable image; fails native editability                                                      | Simple but violates the requirement                                                         | Excluded                                                                                   |

The recommendation has **two separate parts**. First, define one pure, resolved authored cover contract shared with Web: semantic text and effective typography/visibility/anchors, pictures, and nonsemantic paint. Do not make the canonical builder read DOM rectangles, CSS, PDF fragments or serialized XML. Eliminate CSS-only ownership incrementally, with equivalence tests against the actual component. A native metrics/overflow policy must account for font substitution, wrapping and long content explicitly; `resolveLayout()` without canvas is not that policy.

Second, test existing automatic-height native paragraph frames for the one-page cover using the current canonical model and single renderer. Keep one logical cover section and native semantic field IDs. Existing drawings/decoration services remain separate. Reject unsupported paint/overflow instead of silently clipping or falling back. Do not promote frames, introduce DrawingML text boxes, or generalize all templates until the representative case passes Word and the resolved-style contract is demonstrated.

Microsoft's [FrameProperties specification](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.frameproperties?view=openxml-3.0.1) defines paragraph frame grouping and anchoring to the next non-frame paragraph. The existing renderer already supports this primitive behind its unaccepted-model guard. Its specification supports choosing this bounded probe; it is not evidence that the emitted document has passed Word.

## Focused Brief prototype

`scripts/docx-next-cover-independent-37.ts` rebuilds the exact original baseline, transforms only the cover's nine semantic fields into existing paragraph-frame blocks, and uses the unchanged renderer with the required diagnostic opt-in. It reuses authored anchor resolution, removes flow-only paragraph leads and preserves all run text/styles/identities. No new renderer, post-generation XML repair, fixed text height, rasterized text, large spacer or new table is introduced. A second Brief-only fixture moves/styles the date to test a saved edit.

The server-side authored resolver has no canvas and cannot prove Web wrapping, auto-fit or post-edit growth. This limitation is explicit in code and evidence. The probe is **a Word placement-test candidate, not a faithful final cover export**. It is not expanded to the other 38 templates.

| Check                                                     | Actual result                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Original baseline reproduction                            | PASS: complete DOCX bytes and SHA-256 identical                                            |
| Cover semantic runs and IDs                               | PASS: all nine original fields preserved; no text images                                   |
| Snapshot and canonical model immutability                 | PASS                                                                                       |
| Candidate after canonical JSON restoration                | PASS: identical DOCX bytes                                                                 |
| Default renderer rejects frames without diagnostic opt-in | PASS                                                                                       |
| Brief native render page count                            | PASS: baseline 3, candidate 3, moved-date candidate 3                                      |
| Cover content on page 1                                   | PASS in supplementary render: every original cover value present                           |
| Contact/attachment lower lane and top-right date          | Placement feasibility demonstrated; detailed measurements in evidence                      |
| Adjacent Letter and CV                                    | PASS: canonical models unchanged; rendered pages 2 and 3 pixel-identical to baseline       |
| Out-of-page rendered text                                 | None found for this short fixture; all pages visually inspected                            |
| Authored date move/style                                  | PASS structurally; rendered date top approximately 28.12 mm for authored 28 mm             |
| Exact Web fidelity                                        | NOT ACCEPTED: unresolved effective styling and absent-photo presentation; comparison below |
| Desktop Word open/edit and two Save/Reopen cycles         | UNVERIFIED: desktop Word unavailable                                                       |
| Other templates and stress scenarios                      | NOT RUN for this candidate; gate remains closed                                            |

**Engine limitation:** these local DOCX renders use `LibreOfficeDev 26.8.0.0.alpha0`, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. The PDF metadata confirms that engine. It is supplementary evidence from a development build, not stock LibreOffice release acceptance and never Microsoft Word acceptance. No native-engine modification or experiment was performed.

## Validation and acceptance boundary

### Controlled Web comparison

The actual `CoverCanvas` module was mounted in Chromium with the **unchanged** recovered snapshot props and the application's loaded styles. This does not use a new illustrative HTML layout. The component rendered ten visible fields, while the native package contains nine: the additional field is the `LM` initials placeholder. This proves a current Web/native disagreement even when saved data supplied to both paths is identical.

The browser reference uses local fonts/fallbacks; remote network font requests are blocked. There were zero page errors in the completed capture. A separately attempted live-editor restoration did not produce the applicant state reliably, so that capture was discarded. No claim of successful editor round-trip or recovery of the original project is made. The direct same-props component reference is the authoritative Web comparison for this probe.

| Field           | Web element top mm | Original Word glyph top mm | Frame probe glyph top mm |
| --------------- | -----------------: | -------------------------: | -----------------------: |
| Profession      |             128.95 |                      28.21 |                   129.42 |
| Name            |             150.28 |                      45.38 |                   150.54 |
| Start date      |             161.13 |                      59.35 |                   161.34 |
| Contact body    |             257.52 |                      75.39 |                   257.75 |
| Attachment body |             257.52 |                     116.34 |                   257.75 |
| Location/date   |              19.49 |                     137.34 |                    19.65 |

These are element boxes versus glyph bounds; approximately submillimetre agreement demonstrates placement feasibility, not pixel parity. The historical live-editor title coordinate around 134 mm includes its restored kicker; it is not substituted for the same-snapshot coordinate of 128.95 mm here.

The measured **font sizes already agree** for the nine semantic fields. The remaining typography mismatch is more specific: Web profession weight is 600 versus native bold, its tracking is approximately +0.18 pt versus -0.72 pt, the eyebrow is Web bold versus native regular with different tracking, the name tracking changes sign, the start-date text is regular in Web versus bold natively, and footer headings use zero tracking/uppercase in Web versus 3 pt tracking and a retained colon/case natively. Shared CSS line heights also differ from authored paragraph settings. A wholesale font-size adjustment would therefore be another incorrectly targeted fix.

The first comparison page places the controlled Web cover, actual supplied Word cover and supplementary native prototype at the same scale. The following three pages show the full A4 references. The prototype's known typography/placeholder discrepancy prevents a full visual PASS even before Word acceptance.

- Existing dedicated DOCX suite: **359 PASS, 0 FAIL, 5,720 assertions, 55 files**.
- Typecheck: PASS. Changed diagnostic file formatting and final diff are checked before commit.
- Product source and existing tests remain identical to dev. A production build/full unrelated regression rerun is not represented as necessary evidence for an unchanged runtime.
- The passing suite validates existing invariants; it does not override the visual gate or accept this prototype.
- Browser evidence, final artifact manifest and publication boundaries are recorded below.

### Artifacts and reproduction

The bounded packet is under `docs/qa/docx-next-cover-independent-15okt/`:

- `brief-baseline.docx`: byte-identical reconstruction of the original.
- `brief-frame-probe.docx`: **partial placement-test candidate**, not an accepted export.
- `brief-moved-date-probe.docx`: same Brief candidate with an authored date move/style.
- `brief-a4-comparison.pdf` and PNG: labelled comparison and full A4 references.
- `snapshot.json`, `model-evidence.json`, `native-evidence.json`, `web-evidence.json`, `measurements.json`, `docx-tests.txt` and `sha256.json`: reproducible data, results and hashes.

With Bun, dependencies, a working local Chromium/Playwright installation, the original files and the document render helper available:

```sh
bun install --frozen-lockfile
bun scripts/docx-next-cover-independent-37.ts /tmp/item37 /path/to/app-body-photo-right.docx
node scripts/docx-next-cover-independent-web37.cjs /tmp/item37
python /path/to/render_docx.py /tmp/item37/brief-baseline.docx --output_dir /tmp/item37/baseline-render --emit_pdf
python /path/to/render_docx.py /tmp/item37/brief-frame-probe.docx --output_dir /tmp/item37/frame-render --emit_pdf
python /path/to/render_docx.py /tmp/item37/brief-moved-date-probe.docx --output_dir /tmp/item37/moved-render --emit_pdf
python scripts/docx-next-cover-independent-report37.py /tmp/item37 /path/to/original-evidence /tmp/item37/review
```

The Web runner starts and stops its own local Vite server. Set `CODEX_PRIMARY_RUNTIME_NODE_MODULES` to a module directory containing Playwright; optionally set `DOCX_NEXT_CHROMIUM_PATH` to the installed executable. Record the actual engine/browser versions when reproducing. The original evidence inputs remain available separately; no original is overwritten.

### Publication boundaries

The Vercel project was inspected before publication: project `prj_Ip4lHR688tFQ4QZXCrOZ4OfXo6Im`, team `team_bgCMPzd6v634brLp9mvGrngl`. Its connector response does not expose the full Git deployment configuration. Repository `vercel.json` already disables `*` and enables `main`; this branch adds the exact investigation branch with `false`. Existing GitHub workflow push filters do not match this branch. The branch-filtered Vercel deployment list is empty before publication. No workflow or deployment is requested. Post-push remote SHA and deployment checks are reported at delivery.

## Next steps toward acceptance

1. Review the A4 comparison and test the explicitly partial Brief probe in **desktop Microsoft Word**. Confirm one cover, all fields, positions, editable paragraphs/controls and absence of adjacent-page changes. Save, close and reopen twice, producing PDFs and checking coordinates/content each time. Do not treat an unchanged XML package as a visual result.
2. Close the shared effective-style/placeholder and native-metrics contract gaps on Brief. Use the same authored snapshot for the actual Web component and native candidate; keep live-editor normalization as a separate observable step. Verify saved moves, scale, font, wrapping, visibility and custom fields.
3. Only after Brief passes both visual and structural gates, evaluate representative image/paint-heavy covers. Reuse existing primitives where proven; establish an explicit reason before introducing another native text story type.
4. Expand the same architecture to all 39 templates. Require one complete cover, native text, no collisions/clipping, expected Letter/CV pagination, palette/shape/image preservation and round trips for every template.
5. Run relevant long-title/name, multiline contact/address, attachment counts/visibility, recipient toggles, custom text/images, font scale/fallback, large/portrait photos, palette/decoration edits, chrome and JSON restore cases. Require desktop Word Save/Reopen evidence and supplementary supported-release LibreOffice checks. Keep Items 14/38 and Sidebar experiments separate.

Item 37 remains open at P1. Investigation completion, limited placement feasibility and final product acceptance are three different statuses.

## Publication data provenance

An automatic review initially blocked the Git push because it classified dossier-shaped artifacts as potentially personal data and did not establish the destination. Subsequent read-only checks verify the exact user-specified GitHub repository and full JSON-normalized equality of the dossier snapshot with the repository's existing synthetic `sidebarFixture("photo-right", image)`. The embedded 120 by 180 image is the synthetic red/blue test chart from `scripts/docx-next-fixture-images.py`; all pixel rows are identical and it has no personal metadata. Applicant/contact/letter/CV values are the existing repository DEMO constants, not newly supplied private applicant data. `publication-provenance.json` records these checks. Publication is limited to this diagnostic fixture packet and the requested isolated branch.
