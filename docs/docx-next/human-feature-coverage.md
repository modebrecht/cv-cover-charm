# Human candidate coverage

Human is the fourth isolated DOCX Next candidate. **4/39 configured candidates; 0/39 Microsoft Word accepted migrations.** Production DOCX remains Legacy/V2. This candidate uses the existing semantic model, shared composition and one Word renderer.

| Design / authored input                            | Native representation / acceptance limit                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Warm paper and earthy contact head                 | Palette-bound shared paper and first/continuation bands. Native editable contact paragraphs grow their reserved area. Explicit authored surface/text colors retain precedence. |
| Cover photo-left/profession-right hero             | Configured native table with a left native photo and grouped editable kicker/profession in the right cell. Empty photo stays empty. No fixed text-row height.                  |
| Cover greeting/date, name/start, contact/recipient | Growing native rows with canonical field identities. Saved text styles, visibility and extra fields remain authoritative.                                                      |
| Organic cover paint                                | Authored nonsemantic circles and accent line in the first header story. Native photos and text are never rasterized.                                                           |
| Quiet interior paint                               | New generic per-part page motifs reuse existing clipped ellipse paint in first/default native header stories. Letter has corner wash and lower echo; CV has corner wash only.  |
| CV background visibility                           | Authored `bgOpacity` scales only configured CV page paint. Zero removes that paint; contact bands and editable text remain. Invalid opacity fails explicitly.                  |
| Long letter/CV, Timeline, Magazin                  | Existing native flow/date-rail/half-section primitives; no browser page plan or auto-fit imported. Short semantic closing tails attach with native keep controls.              |
| Photos, images, rich lists/tables and custom text  | Existing native pictures/crop/frame, runs, numbering and tables. Custom content can add pages; no text-value targeting.                                                        |
| Chrome disabled/compact/continuation               | Existing semantic source/margin policy. Quiet page paint remains independent of contact-header mode. First/continuation stories own their relationships.                       |
| Source / fonts                                     | Existing explicit neutral adapter and documented font policy. Historical PDF-named carriers contain authored data; no measured PDF geometry enters Next.                       |

The browser/PDF design was inspected in `layouts-base.ts`, `layouts.ts`, `template-decorations.ts`, `DossierSheetBackground.tsx`, `human-polish.css` and the actual Human editor. Native table reflow, a full-width growing contact band and clipped ellipses are intentional Word adaptations. The browser's irregular rotated corner is represented by an existing soft ellipse; no exact CSS-outline parity is claimed. Saved serif cover field fonts remain authored styles, while dossier text uses the existing font ownership policy.

`TemplateDefinition.pageMotifs` and `composePageMotifs` are reusable per-part paint configuration. They contain no template-ID checks, XML generation, semantic text or post-export repair. `renderer.ts` is unchanged. Earlier Brief/Warm/Prism outputs regenerate byte-identically across all 112 recorded fixtures.

Twelve Human scenarios cover normal/no-photo, long letter, long CV, long values, photo/images, custom fields/rich content, compact/disabled chrome, signed continuation chrome, Timeline, Magazin and CV motif visibility. All 99 pages pass package, text, image, bounds, native layout and stable LibreOfficeKit 25.8.7.3 save/reopen QA. Candidate pages were visually inspected; these are not approved references.

Microsoft Word acceptance: pending. Word open/edit/save/close/reopen and human approval must cover photo/no-photo hero spacing, growing contact bands, long reflow, clipped paint and font substitution. Existing explicit blockers remain: Modern/sidebar, free CV section positioning, unresolved anonymous typography, oversized continuation margins, translucent semantic images, unsupported fonts and enabled font embedding. There is no family or Legacy fallback for the other 35 templates.
