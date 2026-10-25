# Warm implementation coverage

`freundlich` is an isolated DOCX Next candidate, configured through the existing semantic model and single Word renderer. **2/39 configured candidates (Brief, Warm); 0/39 Microsoft-Word-accepted migrations.** Production still uses Legacy DOCX. Warm does not certify Brief or authorize another template migration.

## Shared representations

| Input                                         | Native Word representation                                                                                       | Automated cases                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Cover masthead, date and contact groups       | Editable paragraphs in configured native table cells; no fixed row heights                                       | Normal, custom, light palette                               |
| Cover photo                                   | Centered native inline image with shared crop/frame policy                                                       | Images                                                      |
| Organic cover/header circles                  | Nonsemantic paint intersected with the page before rasterization; bounded DrawingML in the first header story    | Decorated cases; exact first/continuation occurrence checks |
| First/continuation bands                      | Generic scoped artwork, first/default native header stories and owned media relationships                        | Contact, compact, disabled, long letter/CV, continuation    |
| Default contact header                        | Existing 44 mm header and 4 mm gap policy; canonical contact ownership                                           | Normal, long letter, long CV                                |
| Compact sender                                | Canonical paragraphs in a growing, filled native table cell; readable automatic ink and independent saved styles | Compact, compact-long, long-sender                          |
| Header disabled                               | Sender remains in body flow; dormant header/footer heights reserve no space when disabled                        | None; model regression                                      |
| Dossier/role/field fonts and colors           | Existing native font policy and semantic typography; explicit user overrides win                                 | Model tests, custom colors, editor roundtrip                |
| Standard, Timeline and Magazin CV             | Existing shared native flow/date-track compositions                                                              | Normal, long CV, Timeline, Magazin                          |
| Continuation margin and first-page clearance  | One native continuation margin plus one first-page spacer                                                        | Compact model test; signed-offset/chrome case               |
| Custom cover/CV content                       | Independently tagged editable flow boxes; short rows stay with their padding; oversized rows continue natively   | Custom; Brief long-elements regression                      |
| Rich letter content, lists, tables and images | Existing native paragraphs/runs/numbering/tables/pictures                                                        | Custom, images                                              |
| Paper and user chrome colors                  | Native sections plus nonsemantic paint; known solid cell fill determines editable text opacity/automatic ink     | Light palette, continuation                                 |

## Word flow policy

Warm reuses the neutral authored source adapter. Source style coordinates are authored design intent, not measured browser pagination. Cover row membership, widths, image alignment, hero spacing, chrome bands and circle geometry belong to template configuration. The renderer and new page-artwork/composition modules contain no template-ID conditionals or Legacy imports.

The cover masthead uses native filled cells for readable date text over decoration. Without a photo, a configured native spacer places the name below the large painted area. Contact/recipient columns share native flow. Custom content can extend the cover: the custom fixture has two cover pages, with the second editable field and its intact frame on page two. First-page decoration does not repeat there.

Compact sender text grows inside its native filled cell rather than being clipped to the 52 mm artwork height. A long address may add a letter page. Native cell fill preserves contrast beyond the band. Contact-header reservation remains conservative across continuation pages; browser page assignments and measurements never enter the model. CV compact chrome has one first-page clearance spacer, combined with any explicit continuation margin. Chrome estimates use a configured 1.4 natural-line metric factor because Word auto spacing consumes more than nominal point height for serif fonts; default 44 mm contact reservation remains intact. Actual header-ink coverage is checked on every applicable page before and after save/reopen.

Clipping affects only nonsemantic paint. The model retains original geometry and the rasterizer paints its visible viewport. Semantic text stays native and editable; user photographs retain native picture crop/frame primitives. Header-story relationships reuse identical assets without duplicate relationship IDs. No post-export repair is used.

Pure text boxes conservatively estimated at no more than 80 mm use native `cantSplit` to keep text, terminal paragraph and padding together. Longer or image-containing boxes remain splittable; the long Brief custom-element fixture preserves its existing eight-page dossier contract. The shared estimate uses authored runs, font sizes and available width, never browser/PDF measurements. There is no fixed text-container height.

## Explicit limits and acceptance

Authored field colors remain unchanged even when a light palette reduces cover/CV heading contrast; automatic contrast applies to running chrome and default compact sender ink. Review those user color choices separately.

Existing blocking policies remain: ambiguous anonymous typography, free CV section positioning, continuation margins larger than the first-page margin, translucent semantic images, unknown fonts, enabled font embedding and Modern/sidebar. The other 37 selectable templates remain unregistered and fail explicitly. Next has no family or Legacy fallback.

Microsoft Word open/edit/save/close/reopen and human visual approval are **pending**. Candidate PDFs/PNGs describe LibreOffice output only. Review cover row adaptation, photo/no-photo spacing, growing sender cells, first/continuation decoration, conservative header reservation and reflow using [the Word checklist](word-smoke-test.md). See [the measured checkpoint](warm-stress-report.md) for exact evidence and gates.
