# DOCX Next architecture inventory

Baseline: `dev` at `e8b59047b031f3902d0d3fcc72baf303a0a43f50`. No architectural edits preceded this inventory. `main` and `render` are outside scope.

## Production graph

`DossierExportDialog` → `dossier-docx-export.downloadDossierDocx` → profile resolution → lazy template loader → template wrapper → Brief, polished Warm, polished Studio3, or `recipeTemplate` → polished legacy recipe → Warm base package. The recipe wrapper can fall back to the family renderer, also based on Warm. `dossier-docx-template-renderer` is another recipe renderer used by tests rather than the normal wrapper path. Brief, Warm and Studio3 duplicate ZIP/package work.

The loader embeds four Cabin faces after the selected renderer. The export then runs, in order: CV ordering → sidebar reconstruction → letter alignment → CV alignment → hyphenation → margins → chrome → rubric titles → letter images → document colors → field typography. This order and all relevant imports/exports are recorded in `inventory.json`.

## Data and behavior ownership

- Cover: saved data is adapted by `dossier-pdf-document`; `buildBlocks` supplies stable block IDs, native field styling, colors, photo geometry and custom elements. Web positions must not become fixed-height text containers in Word.
- Letter: `LetterData` has sender/recipient/date/subject/salutation/body/closing/signature, attachments and positioned images. Rich HTML contains inline emphasis, color, alignment, lists, tables and columns. Legacy export patches alignment and adds image relationships after rendering.
- CV: `CvData` contains ID-bearing entries/custom sections, `sectionOrder`, hidden flags and section-width/column metadata. Legacy ordering, rubric styling and sidebar reconstruction identify rendered visible headings/text. Layout, placement, photo and alignment are stored separately from data.
- Field typography: the portable v1 state includes lazily generated field IDs, values, neighboring values and occurrence tie breakers. The current editor does not expose semantic app paths for every formatted field. Next must accept styles keyed by canonical paths; ambiguous old v1 mappings must be reported, never guessed by occurrence or searched in generated XML.
- Chrome: `resolveDossierChromeSnapshot`, `template-chrome`, `dossier-chrome-content` and `dossier-contact` are shared semantic owners used by PDF/web. The DOCX chrome module removes duplicated visible body text, strips drawings, creates header/footer parts and patches section references. Next generates those parts from resolved data before packaging.
- Margins: `dossier-page-margins` stores physical margins; `dossier-page-geometry` composes header/footer reserves. DOCX currently patches section XML and scales tables. Next assigns geometry before rendering, reserves chrome once and lets Word paginate.
- Pagination: base renderers emit three sections, explicit breaks and fixed tables/spacers. V2 adds browser measurements, calibrated paragraph spacing and page-specific floating overlays. Next uses flowing native paragraphs/tables, widow control, keepNext/keepLines and scoped row splitting; long content must not rely on browser page counts.
- Images: legacy decodes PNG/JPEG data URLs independently in several modules; V2 extracts aspect ratio and rasterizes unsupported data URLs in a browser but directly passes JPEG profiles/orientation. Photo framing lives in `dossier-photo` and CV photo helpers. Next needs one cached preprocessing boundary, bytes separate from geometry, and visible errors rather than lost photos.
- Fonts: active font keys are sans, serif, times, humanist, freundlich, schmal, maschine and plakativ. Web stacks are in cover types; legacy body hardcodes Cabin in many paths and uses separate mappings in chrome/V2. Four locally distributed Cabin TTFs are obfuscated and embedded by `dossier-docx-font-embed`; fetch failure is currently fatal. Font license and OS/2 embedding bits must be checked before adapting embedding.

## V2 and reusable concepts

V2 preview calls production export first, replaces cover/flow content and writes ownership metadata. It is not an independent renderer. Browser capture/measurement/calibration and package replacement must not become Next dependencies. Reusable ideas: semantic paragraph/run/table types, explicit color resolution, ID-bearing cover blocks, image aspect extraction, crop geometry, overlap/overflow audit and separation of structural artwork from editable text. Adapt concepts into Next rather than importing V2 package ownership.

## Protected shared modules

KEEP: `dossier-pdf*`, `dossier-project*`, portable-state functions in `dossier-project-file`, `dossier-field-typography`, `dossier-page-margins`, `dossier-page-geometry`, `dossier-chrome*` except DOCX transforms, `dossier-resolved-chrome`, `dossier-contact`, `dossier-photo`, `dossier-theme`, app types and CV/letter layout helpers. They serve web/PDF/JSON and cannot be deleted with legacy DOCX.

## Module migration classification

REUSE / ADAPT means concepts or low-level algorithms, not permission for Next to wrap legacy output. TEMPORARY LEGACY stays callable until switchover is accepted. DELETE AFTER MIGRATION requires an import audit first.

| Module                                         | Classification         | Responsibility                             |
| ---------------------------------------------- | ---------------------- | ------------------------------------------ |
| `dossier-docx-chrome.ts`                       | TEMPORARY LEGACY       | chrome                                     |
| `dossier-docx-cv-alignment.ts`                 | TEMPORARY LEGACY       | cv alignment                               |
| `dossier-docx-cv-section-order.ts`             | TEMPORARY LEGACY       | cv section order                           |
| `dossier-docx-cv-section-titles.ts`            | TEMPORARY LEGACY       | cv section titles                          |
| `dossier-docx-document-colors.ts`              | TEMPORARY LEGACY       | document colors                            |
| `dossier-docx-export.ts`                       | TEMPORARY LEGACY       | export                                     |
| `dossier-docx-family-renderer.ts`              | TEMPORARY LEGACY       | family renderer                            |
| `dossier-docx-family.ts`                       | TEMPORARY LEGACY       | family                                     |
| `dossier-docx-field-typography.ts`             | TEMPORARY LEGACY       | field typography                           |
| `dossier-docx-font-embed.ts`                   | TEMPORARY LEGACY       | font embed                                 |
| `dossier-docx-hyphenation.ts`                  | TEMPORARY LEGACY       | hyphenation                                |
| `dossier-docx-layout.ts`                       | TEMPORARY LEGACY       | layout                                     |
| `dossier-docx-legacy-recipe-polish.ts`         | TEMPORARY LEGACY       | legacy recipe polish                       |
| `dossier-docx-legacy-recipe-renderer.ts`       | TEMPORARY LEGACY       | legacy recipe renderer                     |
| `dossier-docx-letter-alignment.ts`             | TEMPORARY LEGACY       | letter alignment                           |
| `dossier-docx-letter-images.ts`                | TEMPORARY LEGACY       | letter images                              |
| `dossier-docx-package.ts`                      | REUSE / ADAPT          | package                                    |
| `dossier-docx-page-margins.ts`                 | TEMPORARY LEGACY       | page margins                               |
| `dossier-docx-studio3-polish.ts`               | TEMPORARY LEGACY       | studio3 polish                             |
| `dossier-docx-studio3.ts`                      | TEMPORARY LEGACY       | studio3                                    |
| `dossier-docx-template-loader.ts`              | TEMPORARY LEGACY       | template loader                            |
| `dossier-docx-template-recipe-fresh.ts`        | TEMPORARY LEGACY       | template recipe fresh                      |
| `dossier-docx-template-recipe-legacy-extra.ts` | TEMPORARY LEGACY       | template recipe legacy extra               |
| `dossier-docx-template-recipe.ts`              | DELETE AFTER MIGRATION | template recipe                            |
| `dossier-docx-template-recipes.ts`             | TEMPORARY LEGACY       | template recipes                           |
| `dossier-docx-template-renderer.ts`            | DELETE AFTER MIGRATION | template renderer                          |
| `dossier-docx-template-types.ts`               | REUSE / ADAPT          | template types                             |
| `dossier-docx-v2-cover-gallery.ts`             | DELETE AFTER MIGRATION | v2 cover gallery                           |
| `dossier-docx-v2-cover-package.ts`             | REUSE / ADAPT          | v2 cover package                           |
| `dossier-docx-v2-cover-qa.ts`                  | REUSE / ADAPT          | v2 cover qa                                |
| `dossier-docx-v2-cover-renderer.ts`            | DELETE AFTER MIGRATION | v2 cover renderer                          |
| `dossier-docx-v2-cover-scene.ts`               | DELETE AFTER MIGRATION | v2 cover scene                             |
| `dossier-docx-v2-flow-calibration.ts`          | DELETE AFTER MIGRATION | v2 flow calibration                        |
| `dossier-docx-v2-flow-package.ts`              | DELETE AFTER MIGRATION | v2 flow package                            |
| `dossier-docx-v2-flow-qa.ts`                   | REUSE / ADAPT          | v2 flow qa                                 |
| `dossier-docx-v2-flow-renderer.ts`             | REUSE / ADAPT          | v2 flow renderer                           |
| `dossier-docx-v2-flow-scene.ts`                | REUSE / ADAPT          | v2 flow scene                              |
| `dossier-docx-v2-image-asset.ts`               | REUSE / ADAPT          | v2 image asset                             |
| `dossier-docx-v2-metadata.ts`                  | DELETE AFTER MIGRATION | v2 metadata                                |
| `dossier-docx-v2-preview.ts`                   | DELETE AFTER MIGRATION | v2 preview                                 |
| `dossier-docx-warm-polish.ts`                  | TEMPORARY LEGACY       | warm polish                                |
| `dossier-docx-warm.ts`                         | TEMPORARY LEGACY       | warm                                       |
| `dossier-docx.ts`                              | TEMPORARY LEGACY       | dossier docx                               |
| `dossier-docx-v2-cover-browser.tsx`            | DELETE AFTER MIGRATION | v2 cover browser                           |
| `dossier-docx-v2-flow-browser.tsx`             | DELETE AFTER MIGRATION | v2 flow browser                            |
| `dossier-docx-templates/aurora.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/blockig.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/brief.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/citrus.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/colorful.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/cove.ts`               | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/diagonal.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/edel.ts`               | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/edelDark.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/edge.ts`               | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/forestFlow.ts`         | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/freundlich.ts`         | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/gallery.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/glow.ts`               | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/horizon.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/human.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/klassisch.ts`          | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/ledger.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/modern.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/monoLuxe.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/neon.ts`               | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/orbit.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/pastell.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/prism.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/ribbon.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/serioes.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/shared.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/sonne.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/studio.ts`             | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/studio2-refined.ts`    | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/studio2.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/studio3.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/sunrise.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/terracotta.ts`         | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/verlauf.ts`            | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/verlauf2.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/verlauf3.ts`           | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/violetPulse.ts`        | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/warm2.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/warm3.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/warm4.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/warm5.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |
| `dossier-docx-templates/welle.ts`              | TEMPORARY LEGACY       | Template wrapper and local XML refinements |

## Tests and gates

The inventory JSON lists every DOCX-specific and DOCX-importing unit/e2e test. Existing suites cover package markers, family/recipe transforms, typography heuristics, order/alignment, margins, images, fonts, V2 scenes/shadow output and browser gallery generation. Those establish legacy baseline, not Word usability. No legacy tests are deleted before replacing their covered product behavior.

## Proposed architecture and Gate 0 decision

App snapshot → deterministic Word-independent `DossierDocModel` → declarative template descriptor → one native Word renderer → centrally generated package parts → validation. No legacy renderer, template wrapper, text matching or post-render patch imports inside Next. Begin with Brief only. Normal export stays legacy during comparison. Gate 0 passed by source/import inventory; later migration gates require real rendered fixtures and explicit Word manual evidence. LibreOffice cannot substitute for a Windows/macOS Word edit/save/reopen smoke test.

## New Next modules since the baseline inventory

The 88-module table above remains the historical production/legacy baseline. New isolated modules have the following ownership:

| Module                    | Disposition | Responsibility                                                                         |
| ------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `docx-next/numbering.ts`  | KEEP        | One deterministic semantic list-group plan and central native numbering part           |
| `docx-next/elements.ts`   | KEEP        | Shared semantic mapping of saved custom text, image/frame, flow-box and shape geometry |
| `docx-next/decoration.ts` | KEEP        | Bounded nonsemantic shape rasterizer and paint asset identity; no user text or XML     |
| `docx-next/artwork.ts`    | KEEP        | Deterministic nonsemantic paint assets; no user text or package repair                 |

Cover and rich-letter model builders own semantic list identity. The renderer consumes known counters and styles directly; no legacy dependency or visible-text matching is introduced.
