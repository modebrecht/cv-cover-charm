# Modern contact headers and CV rubric capsules

Follow-up: [18 October colour/sync/plain-separator correction](docx-next-modern-contact-colors-18okt.md) replaces the two header handoffs after real Word PDF evidence. The packet below remains an immutable historical baseline; the rubric DOCX is byte-identical.

**PARTIAL. The bounded application integration and supplementary native rendering pass. Three real app-generated dossiers are ready for human Microsoft Word testing. Word visual/editing/Save/Reopen acceptance is UNVERIFIED. Other templates and full Item 37 acceptance are not included.**

Working branch: `investigate/docx-next-design-fidelity-16okt`. Parent: `706f71db52da7d001b470ee1f307007bebd23f1c`. Remote dev re-fetched at `8901a830a792d75e9e792345c5180827218b4e1e`; no dev/main/render writes or history rewrite.

## Delivered test matrix

| Actual app package | Intended test | Supplementary result |
| --- | --- | --- |
| [01 Modern Kontakt waagrecht](docx-next-modern-interior-candidate-17okt/01-Modern-Kontakt-waagrecht.docx) | Horizontal contact header on Letter and CV, all five contact fields and icons, automatic dark surfaces/contrast | PASS, complete one-line headers |
| [02 Modern Kontakt untereinander](docx-next-modern-interior-candidate-17okt/02-Modern-Kontakt-untereinander.docx) | Three groups: name; address/place; phone/email. Both Letter and CV | PASS, complete three-line headers |
| [03 Modern Lebenslauf Rubrikpills](docx-next-modern-interior-candidate-17okt/03-Modern-Lebenslauf-Rubrikpills.docx) | Seven flowing CV rubric capsules. Compact empty header/footer bands are intentional in this file | PASS, all seven native headings inside their painted capsules |

Each dossier contains **one cover, one Letter page and two CV pages** in the supplementary renderer. The corresponding Web fixture has one CV page. Existing generic native CV typography/pagination is not full Web parity; there is no additional cover or missing content. The full A4 pages, header details, capsule detail and native continuation are shown in the [seven-page comparison](docx-next-modern-interior-candidate-17okt/Modern-Header-Rubrikpills-A4-Vergleich.pdf). It explicitly labels LibreOffice as supplementary evidence.

These packages are byte-for-byte app downloads copied without XML/document repair. [Hashes](docx-next-modern-interior-candidate-17okt/sha256.json) identify the exact handoff. They retain the previously reviewed **separate** native cover date text and capsule paint, including the complete `Lehrbeginn August 2028`. The failed grouped-cover WPS trial stays blocked.

## Source equivalence and activation

The test projects deliberately save **CV font Sans**. They are new saved QA projects, not a claim to reconstruct the user's original unseen saved project. Default Modern Web CV uses Cabin/Trebuchet; substituting Arial for that font would invalidate a fidelity claim. The candidate rejects that unsupported input rather than changing it at export.

For every positive case the runner restores the real project JSON through the app file input, opens **Gesamtdossier herunterladen**, clicks **Modern Header und Rubriken prüfen**, captures the saved snapshot and fresh metrics, and verifies that the UI download equals the app entry's bytes and export leaves saved documents unchanged. The Web reference is rendered from the same restored project; the cover source is explicitly compared, and the interior packet is keyed to the entire saved snapshot. Header source fields are also rebound/validated against captured semantic data in the pure model builder. Records include projects, snapshots, cover/interior metrics, canonical models and app evidence.

Activation is explicit: **`/?docx-next-design-qa=1&docx-next-interior-qa=1`**. This is a Modern-only test button and `Innenlayout-Test` download, with a Word-testing notice. Default production routing, reviewed Modern/Brief routes, PDF/Print and Legacy DOCX exporter implementations are unchanged. An old badge trial URL still shows an explicit disabled control, not a substitute download.

## Confirmed causes and solution

The previous [six-case interior audit](docx-next-modern-grouped-pill-interiors-16okt.md) correctly identified missing automatic surfaces/contrast, wrong inline/stacked composition, wrong font selection, and rectangular rubric shading. Those findings were hypotheses for a solution, not proof that package generation established visual correctness.

| Defect or rejected prototype | Reproducible evidence | Bounded implementation |
| --- | --- | --- |
| Contact headers lacked automatic background/contrast and had the wrong composition | Web resolves the palette at render time; old model only painted explicitly supplied backgrounds, used generic paragraphs and replaced icons with dots | Capture the **actual Web chrome component** from immutable saved input. Resolve real palette/contrast, font metrics, field positions, icon shapes/opacity, band and border geometry. Retain text as native Word paragraphs |
| Independent adjacent native header frames are unreliable on import | First single-field-frame render moved the final email to the top; a terminating story paragraph corrected that. The stacked case still coalesced adjacent frames and wrapped email | One native paragraph frame **per measured Web line**, with authored tab stops and separate inline source-field SDTs. Frames use the authored header content region's width, not a tight text-advance box. A real empty paragraph terminates the frame sequence; it is not a spacer chain |
| Old CV margin reservation added header space twice and did not match continuation intent | First model hit `continuation-margin-exceeds-first-page`; pure Web CV policy gives 47/26 mm (inline) and 53/32 mm (stacked) for these inputs | Reuse the existing canonical first-page-lead primitive and pure Web margin policies. There is one native flowing section margin plus one source-derived first-page lead. Do not import Web pagination fragments |
| Run shading cannot express a rounded rubric with padding and outline | Old native output was a rectangular `w:shd` highlight | Optional canonical **flow surface** on existing heading paragraphs: measured typography/width, 0.8-mm vertical and 2.4-mm horizontal padding, 14% fill and 30% inset-outline paint, with the source trailing rule. Only decoration is rasterized; semantic text stays native `Heading1` and SDT |
| Paragraph-relative capsule paint detached from text when spacing collapsed | Initial render placed the first Family capsule above its text and gave context-dependent offsets for later headings | Bind the decoration to the **native text line**, with the declared padding offset. This removes dependence on contextual before-spacing and first-page suppression. All 14 capsules in normal/offset cases pass glyph-containment checks |
| Web CV can prefer local contact values over synchronized dossier values | `resolveCvChromeContact` gives live CV fields precedence, while the old native shared resolver can prefer the cover | This bounded candidate explicitly rejects divergent CV/shared contact data. It never overwrites one saved value with another. A broader shared-contact semantic change requires its own test matrix |

Microsoft's [native frame properties](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.frameproperties?view=openxml-3.0.1) and [vertical reference values including line](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.verticalrelativepositionvalues?view=openxml-3.0.1) support these representations. Schema support does **not** establish actual Word rendering or round-trip acceptance.

The browser capture is lazy and outside the canonical renderer's runtime boundary. It mounts the existing Web component, measures fresh text/style geometry, captures only nonsemantic icons, and always unmounts its isolated root. New shared Web markup consists only of contact-field data attributes; no Web geometry or CSS is changed. Core construction remains pure and synchronous; source-key, semantic-field, font and geometry checks reject stale/unsupported packets. The existing single decorative page asset keeps contact band/edge geometry under one transform. Existing image/crop generation is reused.

Word font sizes have half-point precision and tracking has twentieth-point precision. The browser measures advances at that quantized Word size before constructing a containing region (for example Web 9.4 pt becomes Word 9.5 pt; Web rubric 12.24 pt becomes Word 12 pt). CSS weights are accepted only where the supported Sans regular/bold measurements match. Exact arbitrary CSS font-size/weight equivalence is not claimed.

Alternatives rejected: color-only changes leave composition wrong; full text screenshots lose editability; the already Word-rejected WPS date textbox is not reused for flowing CV headings; native rectangular shading cannot make a capsule; fixed-page CV frames would break natural heading flow; a new pagination/layout engine, XML repairs and template-specific renderer branches are unnecessary for this slice.

## Actual verification

- **5/5 actual app interior cases**, **20 native A4 pages**: horizontal, stacked, pipe separator, rubric pills, and saved rubric offset/content indent (4/6 mm). All native field runs are present in the supplementary PDF, all glyphs stay on-page, all logical document boundaries are retained, and each header has the intended one/three rows. [Validation](docx-next-modern-interior-candidate-17okt/validation.json).
- **14/14 capsule text-containment checks** across normal/offset cases. Heading text stays native, searchable, editable and semantically `Heading1`; no WPS text shape is used. Saved rubric positions/indentation are retained. The generic native contact metadata label is preserved; it is not one of the Web rubric capsules.
- **11 distinct app rejection checks**, no downloads: default route; rejected grouped badge; mixed badge/interior request; absent explicit CV Sans; unsupported header font; header overflow; multiline rubric; mixed compact/contact modes; unsupported-script glyph fallback; reduced continuation overflow; divergent CV/shared contact source. [Rejections](docx-next-modern-interior-candidate-17okt/rejections.json).
- Current normal/115%/long reviewed Modern downloads, portrait/circular-photo downloads and Brief controls are compared with their prior app-produced packages. Ordinary Next package bytes and Web PNGs are also checked. [Regression evidence](docx-next-modern-interior-candidate-17okt/regression.json).
- The rubric candidate's Letter canonical model and rendered Letter page match a **same-authored-Sans-state app control**. Comparing against the historical Cabin-default fixture would be invalid: the pre-existing shared document default font changes with that saved font choice and can affect paragraph-mark metrics. This is not presented as an unrelated Letter regression or hidden by a weak comparator.
- **1210 unit tests PASS**, 0 fail, 23198 assertions across 251 files. **397 DOCX tests PASS**, 0 fail, 6117 assertions across 61 files (overlapping suite). Typecheck, changed-code formatting, lint and production build pass. Lint has the same 21 existing warnings and no errors.
- All delivered pages and the A4 comparison are inspected visually after rendering. Successful OOXML generation and unit tests are not used to infer Word acceptance.

Reproduction, with the existing Bun/Node/Playwright/Chromium and verified Arial/Liberation Sans environment:

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
  DOCX_NEXT_COVER_CASES=header-inline,header-stacked,cv-pills,cv-pills-offset,header-inline-pipe \
  bun scripts/docx-next-brief-app37c.ts /tmp/modern-interiors
bun run test:docx-next
bun test tests/unit
```

Render each downloaded package with the established `render_docx.py --dpi 120 --emit_pdf`. Export a `sans-control` case through the same runner for a same-authored-font baseline. The committed `scripts/docx-next-modern-interior-candidate37d.py` takes the app root, previously reviewed render root, output directory and Sans-control directory; it inspects native XML/text/geometry, checks the cover and Letter controls, copies unchanged DOCX packages and builds the A4 comparison. Runtime paths/font profile are the same provisioned environment used in the preceding QA reports; no native engine rebuild is needed.

## Limits and human Word gate

The new candidates have **no desktop Word visual, editing or Save/Reopen evidence** yet. The original user's later screenshots rejected the grouped date trial; they do not establish acceptance of these new header/rubric packages.

This trial is bounded to Modern, standard classic CV, explicitly saved supported Sans, Western text, full-width flowing rubric sections, matching contact source values, contact headers on both adjacent documents, and supported empty compact footers without gradients. Unsupported fonts, stale/missing measurements, multi-line rubric/field content, overflowing content and mixed modes fail clearly. The tested reduced continuation case overflows its Web header and is rejected. An increasing continuation body/header reserve that cannot preserve first-page geometry is rejected. Other saved combinations still require their own gates.

The capsule decoration has its exported width; arbitrary Word edits do not automatically resize it. Header frames retain their authored region. Long Word-side edits, moving objects, selecting/copying controls and round-trip anchor/asset preservation need human proof. Generic native CV spacing, its contact-label composition and two-page flow still differ from the Web; full CV design parity is not claimed.

Next: open **all three** exact handoff DOCX files in desktop Word; inspect all dossier pages, header fields/icons/right edges, all capsule labels/contours and the complete date; edit representative native fields/headings; save, close and reopen; export each as a Word PDF and return the three saved DOCX/PDF pairs. Compare native controls, pictures/crops, geometry and content after that round trip before promotion. The original files remain the immutable comparison baseline.

Only after those Word gates pass should this primitive be considered for the remaining audited templates. Do not expand automatically to all 39. Frozen Native Sidebar, Agent A, #14/#25/#38 and native-engine work remain untouched.

## Publication and changed files

Only the existing investigation branch is published by fast-forward. Exact-branch and wildcard Vercel deployment exclusions remain false, and all 16 workflow push filters exclude the branch. Live deployment/workflow counts and protected refs are checked before and after publication; no deployment, PR, merge or export-default switch is requested. [Changed files](docx-next-modern-interior-candidate-17okt/changed-files.json) and [verification record](docx-next-modern-interior-candidate-17okt/verification.json) identify the bounded code and evidence.

Completed: diagnosis, controlled application integration, same-state app exports and supplementary validation. Feasible for Word testing: three concrete dossiers. Final product/Word/all-39 acceptance: **not completed**.
