# DOCX Next developer guide

The rebuild is an isolated candidate on `dev`. Normal DOCX export still uses the existing implementation. Existing PDF and JSON export paths remain active; the saved CV adapter also preserves document-specific title/heading/chrome settings. Brief is the only configured Next template; **no template is yet accepted as migrated**.

## Read the pipeline

`captureDossierDocxNextSnapshot` captures editor settings once. `buildDossierDocModel` converts those explicit inputs into deterministic Word-independent paragraphs, runs, sections, entries, tables, columns and images. `nextTemplate` supplies declarative design tokens. `renderDossierDocx` emits native Word structures directly. `WordPackage` owns relationships/content types/parts, and `validateWordPackage` checks the known semantic/package structures before ZIP creation.

Use the independent API for internal comparison:

```ts
import { createDossierDocxNextBlob } from "@/lib/docx-next/export";
import { captureDossierDocxNextSnapshot } from "@/lib/docx-next/snapshot";

const snapshot = captureDossierDocxNextSnapshot(cover, letter, cv);
const next = await createDossierDocxNextBlob(snapshot);
```

Anonymous legacy typography IDs deliberately block this API. Supply explicit `oldFieldId → canonicalFieldId` bindings when identity is known. Do not infer identity by searching generated text or picking a text occurrence. Current CV/letter editor controls and preview leaves use shared semantic IDs, including custom header/footer title and text fields and saved custom CV text elements (`cv.element:<saved-id>`). The floating custom-element editor exposes the same explicit identity; it does not need to sit inside the main editor panel. Fresh formatting survives text changes and project JSON roundtrips. Existing anonymous saved styles require explicit migration; the temporary legacy preview/export projection remains isolated from Next.

## Add a template

Declare a `TemplateDefinition` in `templates.ts`: archetype, font/color tokens, physical margins, cover ordering, spacing, heading rule and artwork configuration. Do not create a renderer or XML patch for it. At present `nextTemplate` rejects every template except Brief because Gate 5 remains open. After Brief is accepted, introduce the diverse reference group and test any new primitive generically before registering more templates. The 39-row migration ledger is in `migration.md`.

## Add a semantic block

Add a discriminated type to `model.ts`, map app data to it before rendering, update `walkBlocks`, add one renderer branch, validate its geometry and supply model/package/real-render fixtures. Give every field a canonical path independent of its current visible value. ID-bearing CV entries use their stored entry IDs. CV hobbies/strengths and letter attachments keep additive item-ID arrays alongside the existing string arrays. Old projects use deterministic index IDs; editor add/reorder/delete actions preserve those IDs thereafter.

## Pagination and editing

Word owns flowing paragraph/table pagination. Heading paragraphs use `keepNext` and `keepLines`, body paragraphs allow reflow with widow control, and short entry introductions keep their first fields together. Long descriptions are not locked into an unbreakable row. Half-width sections use native fixed-width table grids with splittable rows. No fixed text-box heights or browser page measurements are used.

Three logical document parts keep cover/letter/CV independent. A pure section planner turns flowing two/three-column blocks into continuous physical Word sections, then explicitly restores single-column flow. Text is not split into table cells. Columns balance when returning to full width and may flow across pages. Tables and half-width sections remain a separate side-by-side primitive. Nested column flows and column flows inside table cells/entries are rejected; the editor supports top-level column paragraphs. Explicit empty header/footer parts prevent inheritance between them. Physical sections reuse their logical part’s header/footer relationships; first-page chrome is enabled once at the logical start, and continuation sections use the regular header. Different first-page headers explicitly reference the same native footer part. Semantic IDs are attached to individual unlocked paragraph controls and table captions. Container-level nested controls are avoided: real LibreOffice rendering showed they can corrupt flow. Floating letter pictures anchor together to one known body paragraph, so their coordinates share a stable origin. CV pictures anchor at the first CV paragraph; free placement is page-relative, while left/right placement wraps native flowing text.

Brief uses native header/footer distances of 16/12 mm at zero offset. Header offsets of −12…+12 mm add to the header distance; footer offsets of −8…+8 mm subtract from the footer distance, so positive offsets move content down. Body margins reserve chrome height from actual run sizes, explicit line breaks and conservative wrapping estimates, plus the selected gap/minimum height. The larger first/default header reservation applies throughout a logical part. Word still owns editable header paragraph reflow; extreme edits need manual Word review.

Recipient offsets use a native flowing spacer before the known recipient group: 12 mm plus the selected −12…+12 mm offset. A zero-height or absent recipient needs no spacer. This moves following letter content naturally. These Word-oriented baselines intentionally differ from browser CSS transforms; no negative page distances, floating text boxes or fixed-height text clipping are used.

## Typography and native lists

Cover casing, tracking and line height are model data. Uppercase uses native Word run formatting and keeps the original user text editable. Cover tracking converts em values to points using the resolved font size; an explicit semantic point override takes priority. Rich segments retain their field identity, emphasis and color. Paragraph line spacing transfers directly without browser measurements.

Cover list items have stable source-index paragraph IDs and their shared canonical field identity. Empty items are removed before numbering. Rich letter parsing gives adjacent same-kind items a semantic list group, restarting after intervening content, kind changes or table-cell boundaries. `numbering.ts` centrally plans deterministic native counters from these groups before XML; missing or inconsistent groups are rejected. List markers inherit the first item's run properties through the paragraph mark. Long lists remain flowing editable paragraphs.

## Custom elements

`elements.ts` maps saved cover/CV elements to shared semantic primitives. Custom text uses native paragraphs in a one-cell flowing table. Source width, horizontal indent, fill, padding and border transfer; rows can split across pages. A native paragraph boundary after every table prevents adjacent boxes from merging and keeps their widths/borders independent. Source Y determines reading order within its zone, while source X/width determine native table geometry, clamped to the usable page width. Original coordinates/minimum height remain model metadata, not fixed-height Word containers. Rounded text badges use rectangular native cells. Uploaded background pictures become native inline pictures followed by editable caption text in the same box. Word reflow takes priority over reproducing browser overlap or fixed heights.

Cover custom content follows the configured cover fields. CV page-1 custom content follows the person block and precedes sections. A saved page-2 element starts a logical continuation zone, sharing one native page break with page-2 sections. This zone follows the preceding Word flow: if that flow already spans two pages, the zone starts on physical page 3. Source Y does not reserve empty vertical space. Hidden/empty/disabled elements disappear before rendering. Images use the canonical normalizer and retain independent native frame geometry.

## Artwork and fonts

Names, contact information, dates, headings, entries, custom content and letter text remain native Word text. The complete page must never be rasterized. Artwork may contain only nonsemantic decoration behind that text and must degrade without damaging relationships/package validity. Per-part paper and solid/vertical-gradient header/footer bands are declarative `DecorativeArtwork` rectangles. `artwork.ts` creates tiny, deterministic sRGB paint PNGs without browser measurement or user text. The single picture primitive anchors them behind content in known first/default header parts, with relationships owned by those parts. Assets are reused by fill across the package and repeat on continuation pages. White paper needs no asset. `DecorativeShape` describes saved rectangles, circles, lines and M/L freehand paths without user text. `decoration.ts` creates transparent sRGB PNGs from this geometry at up to 8 pixels/mm with a 1600-pixel edge budget, including opacity, outlines and arbitrary gradient angles/stops. It accepts the app’s bounded M/L grammar, not arbitrary SVG or external resources. Identical paint is reused across cover/CV. Body artwork anchors behind the first native content in its logical zone and does not repeat on overflow pages; paper/chrome remain repeating header artwork. Headless callers supply a raster adapter. An unavailable optional decoration reports its semantic ID and omits its relationship/asset safely; an artwork-only empty continuation zone adds no blank page. Removing a paint definition leaves native content and valid relationships; missing referenced package media is rejected by validation.

Font mappings and their reasons/fallbacks are centralized in `fonts.ts`. Cabin intentionally maps to Trebuchet MS for this candidate; embedding is disabled until embedding rights, OS/2 permissions and unavailable-font behavior are reviewed. No network font fetch is needed to create the package. The old embedded Cabin implementation remains exclusively on the legacy path.

The browser image normalizer decodes supported uploaded formats, applies browser EXIF/ICC handling, renders to an sRGB canvas, preserves PNG alpha and limits the longest edge to 1600 pixels. A source-keyed cache reuses one normalized asset across cover/CV while preserving independent native drawing geometry. Framing is independent model geometry: native source cropping, zoom/pan, rounded or circular clipping and outlines never alter the cached bytes. Decoder errors are visible; missing photos need no media part. Synthetic ICC/CMYK/EXIF fixtures do not replace a test using the user's original problematic JPEG.

## QA

Run `bun run test:docx-next` and the existing unit/typecheck/lint/build checks. The real QA runner needs Bun, Playwright/Chromium, Python with Pillow/PyMuPDF, and LibreOffice. Use the runtime-bundled dependencies when working inside Codex; outside it install the corresponding QA dependencies explicitly.

```bash
mkdir -p /tmp/docx-next-qa
python scripts/docx-next-fixture-images.py /tmp/docx-next-qa/images.json
bun scripts/docx-next-fixtures.ts /tmp/docx-next-qa
python scripts/docx-next-render-qa.py /tmp/docx-next-qa --roundtrip
```

`DOCX_NEXT_CHROMIUM_PATH` optionally selects an installed Chromium executable. `CODEX_PRIMARY_RUNTIME_NODE_MODULES` optionally selects the runtime's Playwright package; otherwise the script resolves local Playwright. The fixture runner tests the actual browser normalizer and generates native dossiers. The Python runner checks ZIP CRC, XML, required parts, content types, relationships, planned physical section counts, numbering definitions/instances, media, PDF text preservation within each logical part, nonblank pages, off-page text and overlapping spans. Custom-element fixtures check independent repeated-value styles, flow boxes, long text, shared continuation breaks, uploaded images/captions, hidden fields, and missing-artwork fallback. Rendered border paths also verify that adjacent flow boxes retain independent widths, including a narrow caption box. Geometry/pixel checks verify body decoration placement, opacity, gradient angle/stops, transparent corners and strokes over white/colored paper, including save/reopen. Cover fixtures check displayed uppercase, independent counters and long-list continuation; paired probes compare actual glyph widths and line spacing before/after save/reopen. Paint fixtures check rendered colors/gradients on every logical page, including save/reopen; signed-offset fixtures compare actual header/footer/recipient movement against model geometry. Relationship checks cover every XML story, including its own image relationships. Custom chrome fixtures check footer text multiplicity on every applicable page, including first pages and save/reopen. Column fixtures also assert rendered column widths, full-width paragraphs before/after, and first/continuation header ownership. `--roundtrip` saves a new DOCX with LibreOffice, reopens it and repeats package/text/page-count/column checks. Running chrome is excluded from body text extraction so it cannot interrupt a paragraph across pages. It renders each PDF page to a PNG. Optional `--snapshots` compares with an explicitly approved Word-oriented baseline; candidate images are not automatically approved.

Run `bun scripts/docx-next-editor-qa.ts` for a real editor selection → rename/reload → portable JSON → Next export smoke test, including floating custom CV text controls, and a production combined PDF download. It starts and stops its own local Vite server. Inspect the PNGs, including continuation pages and image/table/half-width cases. A green structural/render report is insufficient to mark a migration accepted. Record Windows Word and, where available, macOS Word open/edit/save/reopen evidence in `word-smoke-test.md`.

## Current limitations and next gate

Gate 0 is inventoried and committed. Gates 1–3 have a contract, model/configuration foundation and deterministic unit evidence. Gate 4 has an independent package and real LibreOffice evidence. Gate 5 remains open: Microsoft Word smoke acceptance is unavailable here, anonymous older styles still need explicit migration, and several advanced settings need primitives or explicit Word-oriented acceptance. Sidebar rendering intentionally rejects requests until Gate 8. Production switchover, remaining templates and legacy deletion have not started.

Saved custom cover/CV text, uploaded pictures and nonsemantic shapes now have model/package/render coverage using Word-oriented flow; fixed browser Y/height/overlap and rounded text-box corners are deliberately represented by the documented native flow policy. Microsoft Word editing acceptance remains pending. Per-part paper, solid/vertical-gradient chrome bands and signed chrome/recipient offsets now have model/package/render/save-reopen evidence. Native balanced letter columns now have model/package/render/save-reopen coverage; Microsoft Word editing acceptance is still pending. Free CV sections and advanced sidebar/masonry layout also need Word-oriented acceptance. Native list variants, table-cell paragraphs/nested tables, CV photo placement/framing and shared asset normalization have automated model/package/render coverage; Microsoft Word editing acceptance remains pending. The internal snapshot/export API is callable, but a comparison UI is not yet connected.

Do not replace the normal export or delete legacy modules while this ledger is pending.
