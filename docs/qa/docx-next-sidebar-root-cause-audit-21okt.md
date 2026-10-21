# Native Sidebar root-cause and architecture audit — 21 October 2026

**Verdict: NO-GO for production promotion. Recommended next route: option B, a bounded simplification using the existing body-story foundation, with photo ownership and non-destructive picture editing addressed first.**

Scope: Masterliste #7, #8 and #38. Analysis only. This report does not implement a fix, revise an acceptance threshold, authorize a production switch, or certify Microsoft Word.

## 1. Executive diagnosis

The Sidebar is not one unresolved defect. Three separate compatibility contracts have become entangled:

1. **Geometry:** the remaining four mirrored failures are strongly attributable to the tested stock Writer's relative-table-boundary conversion. The application already emits consistent widths. Approximately one twip of horizontal movement per save is measurable, but the retained cases show no text loss, vertical movement or pagination change attributable to that movement. It is a strict stability failure with low demonstrated immediate visual impact.
2. **Photos:** the referenced editable picture loses source pixels and its semantic owner in the tested Writer roundtrips. This is the more consequential defect: users cannot recover the full image through normal recropping, and a surviving photo tag no longer contains its drawing. Matching screenshots cannot certify either property.
3. **Semantic controls:** earlier floating-carrier failures include confirmed destruction of a particular control with its owner paragraph. They do not prove that the later body-story composition loses its text controls. The current 22-case body matrix preserves final text IDs and complete table ancestry; original import-time object lifetime remains unobserved. Photo containment fails independently.

**The user's prioritization is supported:** image preservation, crop reversibility and usable field ownership deserve priority over an invisible one-twip difference. This is an engineering priority judgment, not permission to turn a failed exact gate green.

The largest unresolved decision is still actual desktop Word behavior. A Writer-specific destructive conversion is not evidence that Word destroys the same pictures. Conversely, valid-looking OOXML and a familiar native picture structure are not Word acceptance.

**If we started fresh today, would we build Native Sidebar the same way? No, not the entire composition and acceptance architecture.** We would retain the canonical model, shared renderer, cumulative grid rounding and native body-table approach. We would make independently flowing body stories the deliberate foundation, separate each picture's identity and editing contract from its surrounding layout, and prove the target Word editor early. We would not build product support around Writer importer object addresses, paragraph-disposal workarounds or custom engine distribution. Much of the sensible layout simplification already exists in `cv-sidebar-body.ts`; it should not be reinvented or described as a new fix.

## 2. Provenance and audit limits

- Remote `dev` verified through GitHub: **8901a830a792d75e9e792345c5180827218b4e1e**. The audit branch was created from this exact SHA: `audit/docx-next-sidebar-root-cause-21okt`.
- Root `AGENTS.md` was read; the complete base tree contains no nested `AGENTS.md`. Published history must not be rewritten.
- Geometry evidence branch pinned at **b473e568c41e10e6cd9f687dd8d55b4c585d373d**; its executed 22-case checkpoint is **5c40e60bda42f5f1490e98d94dfa029c8b452854**.
- Earlier architecture/source-build branch pinned at **d957153f3556b4d3ef7ecbc3d79d619099489141**.
- Source, committed machine evidence and historical reports were inspected through connected GitHub tools. Counts and representative phase records below were checked against the committed JSON, rather than copied only from conversation summaries.
- The historical Actions run **38697641018** was read directly: completed, conclusion **failure**, at the executed checkpoint above. Its artifact listing currently records artifact **11954963277**, 6,111,529 bytes, not expired, digest `sha256:908148683752b175eb162d05268c4c639fa836d6e05045a9754a7bb719852d3b`, expiry 14 November 2026.
- **No artifact ZIP was downloaded or independently decoded in this audit. No application, native editor, render, export, test suite, engine experiment or CI dispatch ran.** Historical executions remain attributed to their original reports. Reading their evidence is not a fresh runtime reproduction.
- Base `vercel.json` disables automatic deployments for `*` and enables only `main`; no deployment configuration is changed. Publication is one Markdown file with a CI-skip commit.
- Registry totals and historical Brief fixture counts are not 39-template Sidebar acceptance. Modern Sidebar is not newly certified by this audit.

Primary evidence: [E1 geometry report](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/qa/docx-next-sidebar-geometry-gate-15okt.md), [E2 machine evidence](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/qa/docx-next-sidebar-geometry-gate-15okt-evidence.json), [E3 earlier architecture gate](https://github.com/modebrecht/cv-cover-charm/blob/d957153f3556b4d3ef7ecbc3d79d619099489141/docs/qa/docx-sidebar-architecture-gate-13okt.md).

## 3. Evidence matrix

“Confirmed” below means supported by inspected source or retained historical evidence, with the runtime scope stated. It does not mean freshly executed today.

| Question | Classification | Evidence and practical meaning |
| --- | --- | --- |
| Current application emits contradictory outer grid/cell/preferred widths | Not supported for the official candidate | All 22 source grids and nested tables are consistent; `tblW`, `tblGrid` and `tcW` agree. An earlier application rounding defect was already fixed. [E1/E2] |
| Four mirrored layouts drift in stock Writer | Confirmed, Writer 25.8.7.3 | 18/22 exact geometry; four repeated losses of one twip. Same complete owners resolve in all 66 states. [E1/E2] |
| The drift currently causes unreadable documents or pagination loss | Not demonstrated | Text sequence/page counts remain unchanged; zero unexpected empty CV pages. Near-boundary reflow under other edits remains a possible risk, not an observed result. [E2] |
| Geometry has an engine arithmetic cause | Strong bounded causal evidence | Same-input live table measurements plus an isolated historical engine intervention changing the two divisions removed the four failures. This is not a released application correction. [E4 below] |
| All images are necessarily destroyed by Writer | False generalization | Uncropped rectangle and ellipse controls preserve the original decoded pixels. Cropped rectangle also preserves pixels, despite changed crop parameters. [E5] |
| Current body-matrix photo pixels survive native save | Confirmed failure, nine shaped/cropped cases | Eight ellipse cases: 120×180 → 96×96; one rounded rectangle: 120×180 → 73×91. Changed decoded RGBA, not merely PNG recompression. [E2] |
| Current photo SDT continues to own its drawing | Confirmed failure in all nine photo cases | Tag survives, drawing survives once, complete containing table ancestry survives; drawing is no longer inside the photo SDT. [E2] |
| Current body composition loses whole text field groups | Not demonstrated in this 22-case matrix | Complete final fields/text pass 22/22. Other runtime/interface or predecessor failures must remain separate. [E1/E2] |
| Photo-related field loss can occur without any table | Confirmed in historical Dev/CLI replay | Plain body photo control retains 3/8 tags while text and visible image survive. Stable/Kit preserves 8/8 on the same source. Engine version and interface are confounded. [E6] |
| Original floating-carrier control was destroyed with its paragraph | Confirmed for one historical carrier | Strong references correlate actual control and owner disposal during `DelFullPara`; not just matching text or reused addresses. [E7] |
| PopSdt/clamp explains every later failure | Unproven | A wrong selection and zero end argument were observed, but the complete cross-callback chain is not established for every loss, nor for current body stories. [E8] |
| Same native object must exist across save/reopen processes | Not a valid object-identity assertion | Durable semantic identity/ownership is testable across saves; an in-memory UNO object cannot be identical across separate editor processes. The retained lifetime gates concern transitions within an import and remain unchanged. |
| Desktop Word shares these destructive behaviors | Unverified | No matching version-specific Word open/edit/save/reopen evidence in the reviewed packet. |
| Original upload bytes are preserved by today's exporter | Not the current normalization contract | Browser normalization decodes/re-encodes PNG and caps the longest side at 1600 px. The audit's “original pixels” mean the complete normalized embedded asset. [C3] |

Additional evidence: [E4 nearest-rounding report](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-native-nearest-status.md); [E5 picture shape/crop controls](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-picture-frame-status.md); [E6 minimal picture/field identity](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-picture-identity-status.md); [E7 actual owner disposal](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-native-owner-status.md); [E8 PopSdt](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-native-pop-status.md) and [bounded clamp research](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-native-clamp-research-status.md).

## 4. Root cause A — geometry

### Why only the four right-hand cases?

The four cases share the same physical root grid, irrespective of whether a photo is present:

| Source orientation | Source grid in twips | Save 1 | Save 2 |
| --- | --- | --- | --- |
| Left rail, representative cases | 2789 / 340 / 6509 | Unchanged | Unchanged |
| Right rail, four failing cases | 6508 / 341 / 2789 | 6507 / 341 / 2790 | 6506 / 341 / 2791 |

All totals are 9638 twips. Cumulative rounding is conservative but not perfectly mirror-symmetric: shared edge rounding assigns the remainder differently after reversing physical tracks. This one-twip source difference is not an inconsistent table declaration.

The mirrored cumulative boundaries land on a path where Writer maps relative boundaries back to absolute positions using truncation. The total stays constant while a twip transfers between physical tracks. The four failures are `app-body-both-long-right`, `app-body-right`, `app-body-photo-right`, and `app-body-photo-free-mirrored-side`. They are four affected fixtures, not four unrelated layout causes. Exact stability in the left samples is not a theorem about every possible left width.

The retained intervention is substantially stronger evidence than arithmetic alone: unchanged sources pass 22/22 in the separately fingerprinted modified engine, while stock remains 18/22. However, the subsequent paired source-build task timed out during baseline compilation before CppUnit; no compiled upstream regression acceptance exists. [E4; E9]

### Product significance and application choices

One twip is about 0.01764 mm, roughly 0.067 CSS pixels at 96 dpi. The retained measurements show horizontal changes of this order on each of two saves; vertical coordinates, text sequence and page counts remain intact. This is not evidence of a visibly broken Sidebar. Repeated accumulation and a document near a line-break threshold could matter, but arbitrary-cycle or arbitrary-content failure has not been established.

Keep the exact gate failed. Separately record that **the current demonstrated severity is much lower than destructive photo editing**. A future release policy could distinguish strict interoperability from supported-editor visual acceptance, but that policy is not changed here.

A standards-compliant exporter cannot generally force an editor to preserve its own internal rounding. Keep the current consistent absolute grids, fixed table layout and shared rounding. Do not select lucky widths, add mirrored offsets, use visual RTL order, or precompensate for hypothetical future saves. Historical RTL substitution moved reference text by about 57.4 mm and was rejected. Simpler two-column tables could be evaluated later, but there is no evidence that removing the gutter cell would universally fix Writer's boundary conversion.

The discriminating evidence is the **same source bytes** saved in a named desktop Word build, with package geometry and rendered output measured before/after. A different DOCX generated from the same JSON would not isolate the editor.

[E9 source-build outcome](https://github.com/modebrecht/cv-cover-charm/blob/d957153f3556b4d3ef7ecbc3d79d619099489141/docs/qa/docx-sidebar-provisioned-source-build-14okt.md).

## 5. Root cause B — pictures, crops and editability

### What representation actually changes?

The source is already a normal embedded DrawingML picture: an inline drawing in the Sidebar, containing `pic:pic`, a relationship-backed `a:blip`, `a:srcRect`, stretch fill and `a:prstGeom` for the chosen rectangle/ellipse/rounded rectangle. The photo is wrapped by the generic block SDT around its paragraph. Free page coordinates are lowered into an inline picture zone. It is not an application-generated cropped bitmap pasted into the document. [C1–C4]

Writer saves the problematic shaped/cropped picture as an image-fill shape, changes crop encoding from `srcRect` to `fillRect`, and replaces the referenced image pixels. For example, the source circle retains 120×180 pixels with crop 8400/24400/11600/22267; save 1 references 96×96 different pixels. The frame remains visually present, but the full image is no longer the active editable picture.

**The strongest supported causal description is a Writer conversion of these cropped, nonrectangular pictures.** The comparisons do not establish the exact internal rasterization function or prove that shape alone causes it:

| Existing stable control | Pixel preservation | Crop result |
| --- | --- | --- |
| Uncropped rectangle | Full original preserved | Zero crop preserved |
| Uncropped ellipse | Full original preserved, even after conversion to image-fill | Zero crop preserved |
| Cropped rectangle | Full original preserved | Small parameter changes; exact gate fails |
| Cropped ellipse, separate executed calibration | Original replaced by cropped pixels | Original crop representation lost |
| Rounded cropped portrait in current body matrix | Original replaced by 73×91 pixels | Crop representation changed |

The fourth case of the stopped frame matrix was **not executed there**. Its cropped-ellipse result comes from the separate retained calibration; this distinction matters. [E5]

The rectangular crop changes are on preserved pixels: approximately −0.0264 source pixels in horizontal position and +0.0288 pixels in window height in the measured control. These are a precision failure, distinct from losing the off-crop image. The source-backed integer-unit arithmetic matches the observed changes, but actual intermediate native values were not fully instrumented. [E10]

### Can normalization or embedding solve it?

Embedding is already implemented. Repeating PNG normalization cannot prevent a later editor from flattening a shaped crop. Normalization should supply a complete, orientation-correct source and keep cropping declarative. It must not silently pre-crop or rasterize a circle to obtain stable screenshots.

A further, separate source-policy issue is that `normalizeBrowserImage` re-encodes and may downscale uploads to 1600 px. If “original” means exact camera/upload bytes, the asset model would need to retain those separately from its normalized rendering asset. That policy is independent of Writer's subsequent loss of the full normalized photo. No such model change is made here.

The inspected photo collectors resolve the image referenced by the drawing; they are not exhaustive proofs that no orphaned/custom part anywhere in the saved ZIP contains a backup. Historical prose says the original cannot be restored from those saved packages. This audit confirms the referenced-image loss from the committed records, but does not independently revalidate that stronger archive-wide absence claim without the ZIP. An unused backup would still not satisfy ordinary native recropping/editability.

The current `pic:pic` + embedded media + declarative crop is an appropriate starting point for Word and resembles Microsoft's documented native picture construction. It should not be replaced merely because Writer converts it. Word behavior still needs proof.

A standards-backed hardening opportunity exists: the renderer does not currently emit `w:doNotAutoCompressPictures`. Consider it in a later implementation with correct settings ordering. Microsoft documents this setting as preventing automatic save compression. It does **not** prove that Writer honors it, prevent every shape conversion, or replace a crop-preservation test. Do not label its absence as the demonstrated cause.

[E10 crop precision](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-crop-precision-status.md); [C1 renderer](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/renderer.ts); [C2 picture geometry](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/picture-geometry.ts); [C3 image normalization](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/images.ts); [C4 image-zone lowering](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/image-zone.ts); [collector scope](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/scripts/docx-next-native-photo-qa.py).

## 6. Root cause C — semantic ownership and PopSdt

The source `control()` writes alias and canonical tag, but no explicit picture type or numeric `w:id`. A generic rich-text SDT containing a picture is not thereby invalid. Missing `w:picture` or an exporter-assigned numeric ID is a design choice to evaluate, not a proven importer defect. [C5]

The following properties must remain separate:

| Layer | Current evidence | Required interpretation |
| --- | --- | --- |
| Visible text | Complete in current 22 cases | Proves readable content, not field identity |
| Canonical field tags and text | Complete final inventory in current body cases | Useful durable identity; does not establish continuous native lifetime |
| Paragraph identity/policy | Whole paragraphs and final owner ancestry measured | A block SDT becoming run-level can be valid if it still owns the intended content and paragraph behavior |
| Picture ownership | Tag survives but is empty of its drawing after save | A semantic failure hidden by empty-text comparison |
| Table ownership | Complete ordered field inventory resolves each current table uniquely | Better than captions alone; not proof of the original native object surviving |
| Original native object lifetime | Confirmed historical carrier disposal; current source interval unobserved | Do not transfer the old negative to the new composition or mark an unobserved interval passed |

The original carrier owner report does establish one causal disposal event: the registered control is destroyed during deletion of its actual owner paragraph. Earlier PopSdt observations show a cached start/selection that reaches an empty body paragraph; the local clamp research observes `nEnd=0`. But the entire chain from each PopSdt call to every historical saved loss is not proven, and current body tables are a different composition. Naming PopSdt as the universal root cause would exceed the evidence.

The independently important current defect is much simpler to describe: **the picture's semantic control must actually contain its picture after saving**. Resolve by canonical tag, verify exactly one owned drawing, follow its relationship, and compare the full source pixels and crop window. A drawing name or same containing table is corroboration, not a substitute.

An editor can reconstruct internal objects during import without harming a valid editable output. Continuous original-object lifetime is valuable importer diagnostics; it is not automatically a user-facing defect if durable fields, ownership and edits all survive. Existing lifetime gates are nevertheless left unchanged and unresolved. Any later change of their release significance requires an explicit contract decision; this report grants none.

[C5 native text/control generation](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/native-text.ts); [current body evidence](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-app-body-status.md); [older identity scopes](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-native-identity-status.md).

## 7. Three architecture options

These option letters describe this audit's alternatives. They are not the older report's A/B/C decision labels.

| Assessment | A — repair current shared primitives | B — deliberate simplified body composition, recommended | C — independent anchored Word stories |
| --- | --- | --- | --- |
| Structure | Keep semantic-row/spanning and body-story modes; refine current controls/pictures | One fixed, splittable body table with complete main/side stories and gutter; photo owns a dedicated paragraph/control | Keep main text in body; put Sidebar text in anchored DrawingML text boxes or paragraph frames; independently anchored picture |
| Expected Word fidelity | Plausible but unverified; current modes have different flow behaviors | Plausible and closest to already passing body content evidence; preserves native text and picture shapes where Word accepts them | Strong first-page positioning potential; no verified automatic multi-page equivalence |
| Editing stability | Interactions between row spans, atomic groups, picture zones and imported controls remain | Fewer structural transitions; stable per-field controls; native picture replacement/crop are first-class acceptance requirements | Anchor moves and text-box/story selection complicate editing and reading order |
| Original image preservation | Current cropped shapes fail Writer; Word unknown | Same complete embedded original, declarative crop, explicitly owned native picture; rectangle is a diagnostic control, not a silent replacement for circles | Embedded original still needed; an anchor/text box does not cure destructive image conversion |
| Pagination/long content | Current body stories pass representative long content; semantic-row predecessors include detached openings | Complete native stories, no manual page slicing; still must prove reasonable entry splitting and edits | Text-box overflow, linking and continuation require additional architecture; high soft-clipping risk |
| Left/right symmetry | Shared mapping exists, but stock grid failure remains | One geometry source and physical track permutation; exact stock Writer drift may remain | Coordinate mirroring is easy; equivalent reading order/continuation is harder |
| Complexity | Low for a proven Word-only photo/SDT repair; potentially high for broad compatibility | Moderate and localized; reuse existing body mode rather than build a second engine | High, with new story, anchor and continuation contracts |
| Regression risk | Low for narrow changes; high if fixes affect every generic table/control | Moderate at composition/photo boundaries; keep classic/cover/letter untouched and compare adjacent output | High across content selection, headers, page boundaries and semantic ownership |
| LibreOffice internals dependency | None for source fixes; unacceptable if it depends on patched user engines | None; compatibility is measured on named editors | Must remain standards-based, but existing carrier/import evidence makes it a poor default |

**Recommendation: B, with a bounded decision before implementation.** Use the existing body-story model as the reference composition. First run the small future Word triage below on unchanged sources. If Word already retains pictures, crops and ownership, choose the smallest A-sized shared photo/SDT hardening within the B foundation rather than rewrite a functioning renderer. If Word fails, use a Word-authored native picture/control as the reference and change that boundary only. B is a design direction, not a claim that two flowing cells or typed picture SDTs are a newly proven fix.

Native unequal section columns are another standards-compliant structure, but they flow one story from one column to the next. They do not directly preserve two independent main/rail stories. Artificial column breaks or page slicing would introduce a new pagination problem; this is not recommended as a shortcut.

The original semantic-row composition's picture-before-later-span guard must stay in force. The retained counterexample loses first-page opening content despite surviving whole-document text. Do not revive its row-height/keep-property experiments. [E11]

[E11 picture/span boundary](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/docx-next/sidebar-span-picture-status.md); [body foundation](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/cv-sidebar-body.ts); [shared partition/mirroring](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/src/lib/docx-next/cv-sidebar-composition.ts).

## 8. Proposed architecture: precise changes if later authorized

1. **One intentional body composition.** Keep the canonical independent main/side stories, shared fixed grid, physical gutter, native rail paint and cumulative rounding. Reuse `sidebarBodyTable`. Do not reintroduce synchronized semantic rows/vertical merges solely for continuous rail paint. Preserve first-only lead and distinct active header/footer identities.
2. **A picture is an owned native field.** Separate picture SDT generation from the generic text wrapper. Compare with a Word-authored typed picture control: one picture, a dedicated real paragraph, canonical `w:tag`, unique instance `w:id`, native inline drawing and relationship-backed full normalized media. Choose block/run placement from that verified reference; do not move every text control to run-level on speculation. No nested owner controls or marker-only paragraph should stand in for the actual image.
3. **Non-destructive crop stays native.** Keep `pic:pic`, `a:srcRect`, authored geometry, pan, zoom, border and shape. Circles/rounded pictures remain real requirements; a rectangular control only diagnoses the conversion boundary. Do not silently substitute a rectangle or flattened circle. Add the standards-defined no-auto-compression setting only as a separately verified hardening change.
4. **Persistent identity is independent of importer objects.** Keep canonical tags separate from per-instance numeric control IDs. Model logical header/footer fields and their physical instances explicitly. Validate picture containment and complete paragraph text after edits, not just nonempty tag counts or captions.
5. **Keep flow restrictions honest.** The body implementation currently removes nested entry `keepTogether` coupling. It does not prove that every entry stays on one page. Use limited native paragraph policies for heading/first-entry attachment and short paragraphs, avoiding a document-wide keep chain. Free photo placement remains the declared flow adaptation, not promised browser overlap parity.
6. **Preserve source assets as a deliberate policy.** Full normalized pixels are mandatory for native editing. If exact upload-byte retention is desired, add a distinct archival original asset to the canonical model in a separate scope. Merely hiding a backup in an unreferenced package part would not satisfy native editability.

This redesign targets ownership and unnecessary composition coupling. It does not promise an application workaround for the already demonstrated Writer arithmetic.

## 9. Minimal ordered plan — not executed

1. Pin the existing source fixtures and expected canonical/picture inventories. Record Word build, platform, compatibility mode and picture-compression settings.
2. Perform the six-source desktop Word triage in section 10. This precedes another exporter or engine experiment and is not requested from the user during this audit.
3. If all relevant Word contracts pass, retain the body foundation and assess only narrow ownership/compression hardening. Do not rewrite the layout because of Writer-only behavior.
4. If a Word defect is reproduced, create one Word-authored control/picture reference and compare its structure to the exporter. Implement only the corresponding shared boundary in a separate task, keeping all existing guards and exact assertions.
5. Verify full pixels, native crop editing, field ownership and unchanged long flow on those representative cases. Stop on a destructive failure; do not expand a rejected architecture to more templates.
6. Only after representative success, run the unchanged 22-case native matrix and representative Modern Sidebar/adjacent-document regressions. Final Word acceptance must cover the full 22-case scope; six triage sources cannot close #8. Claim only the actual templates, settings and editors tested.
7. Decide supported-editor policy explicitly. A Word-specific acceptance may be viable, but would not make failed Writer interoperability pass. Upstream/distributor engine maintenance is a separate optional project, not the product's default dependency.

No implementation or user action is required to complete the present analysis.

## 10. Smallest meaningful future Microsoft Word test

Use **six unchanged source documents**, rather than regenerate a broad gallery:

| Source | Discriminates |
| --- | --- |
| `app-body-photo-left` | Left control, cropped ellipse, picture ownership |
| `app-body-photo-right` | Same photo with physical mirroring; grid and picture behavior separated |
| `app-body-both-long-right` | Mirrored geometry and independent multi-page text flow without a photo |
| `app-body-photo-free-portrait` | Rounded crop, pan/zoom, free-zone nesting and border |
| Existing uncropped rectangular frame control | Basic embedded-picture/control baseline |
| Existing cropped rectangular frame control | Crop precision/editability without a nonrectangular shape |

Use the official body packet at executed SHA `5c40e60b…` and the already retained frame-control sources, each with its own recorded source hash. These controls come from distinct historical fixture plans; do not relabel them as one previously executed matrix.

For each source, obtain source → ordinary save 1 → close/reopen → ordinary save 2, retaining the DOCX packages and Word-rendered PDFs. Do not change content or crop in this comparison. Measure complete canonical text/track order, active stories, exact grids and picture geometry separately from their visual severity; verify no new blank opening/overflow and inspect full media dimensions/RGBA plus the drawing's actual containing SDT.

On separate edit copies, do three meaningful actions: change one field after the photo, adjust/reset and then restore the photo crop to expose previously hidden source regions, and append a long entry to the long CV. Save/reopen and verify the intended edit, intact neighboring fields, full image and usable continuation. A later picture replacement deliberately changes the asset; treat it as an explicit operation, not a failed original-asset comparison.

Record compression/editing-data settings rather than silently optimizing the environment. First test the unchanged source under ordinary user settings. If image loss appears, a controlled no-compression comparison can distinguish intentional editor policy from structural conversion; it must not erase the default result.

This packet is **triage, not release acceptance**. It distinguishes the main architectural choices with few documents but omits some short/free mirrored and long-left cases. Full 22-case coverage and representative template review remain necessary later. No exact gate is weakened, no Word result is inferred from Writer, and no claim of cross-platform Word acceptance follows from one Windows build.

## 11. Verdict and Masterliste consequence

**NO-GO for current Native Sidebar production promotion.** The current saved-photo ownership/pixel contract fails in the tested stock Writer, exact mirrored geometry remains failed, and actual Word behavior is unverified.

- **#7:** keep blocked. A viable native body foundation exists; a full rewrite is not justified by the one-twip drift.
- **#8:** keep blocked. Preserve the strict matrix and add the distinction between field-tag survival and actual photo ownership to future acceptance reporting.
- **#38:** keep frozen for implementation in this task. Prioritize full-picture/crop reversibility and semantic photo ownership in the next bounded investigation.

**Recommended investment:** actual target-editor evidence, then the smallest shared photo/control correction needed on the existing body foundation. Do not spend another round on width compensation or modified LibreOffice binaries.

## 12. Primary OOXML and Word references

These sources support structure and settings; none certify the current exporter in Word. Consulted 21 October 2026.

- [Microsoft: insert a native picture into WordprocessingML](https://learn.microsoft.com/en-us/office/open-xml/word/how-to-insert-a-picture-into-a-word-processing-document): inline DrawingML picture with embedded image relationship.
- [Microsoft/ISO excerpt: SourceRectangle](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.sourcerectangle?view=openxml-3.0.1): crop edges are relative offsets into the source.
- [Microsoft/ISO excerpt: picture SDT](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtcontentpicture?view=openxml-3.0.1): an explicit picture control owns one DrawingML picture and has restrictions on surrounding block content.
- [Microsoft/ISO excerpt: doNotAutoCompressPictures](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.donotautocompresspictures?view=openxml-3.0.1): declared automatic-save compression policy.
- [Microsoft Support: turn off picture compression](https://support.microsoft.com/en-us/office/graphics-visuals/turn-off-picture-compression) and [editing-data/compression options](https://support.microsoft.com/en-us/office/graphics-visuals/reduce-the-file-size-of-a-picture-in-microsoft-office): editor settings can affect preservation and must be recorded in Word testing.

## 13. Publication scope

The intended branch delta from verified `dev` is exactly this analysis document. No product source, evidence baseline, fixture, workflow, engine, production switch or protected branch is changed. No tests or exports are claimed for this documentation commit. The resulting commit SHA and one-file comparison are reported after publication.
