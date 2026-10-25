# DOCX Next font policy

Font selection is semantic model data, resolved before Word XML. `fonts.ts` owns allowed families, mappings, alternatives, family/pitch metadata and selection evidence. `styles.ts` builds the central font table from fonts actually used in native runs. No template owns a font loader, renderer or XML replacement pass.

## Inventory

`bun scripts/docx-next-font-inventory.ts` regenerates [font-inventory.json](font-inventory.json) from the app registry, template picker, default cover blocks, dossier family stacks and distributed font files. The registry contains 41 templates; the picker retires `warm4` and `warm5`, leaving the requested 39 active templates. Default cover text uses `sans` for 32 and `serif` for seven. Family CSS stacks use sans serif for 31, Georgia/Times for three and Palatino/Book Antiqua for five. These stacks are inventory evidence, not approval of a Next template configuration. Only Brief is currently configured.

All eight selectable app keys have an explicit Word-oriented mapping:

| App key      | Requested Word family | Declared alternative   | Decision                                              |
| ------------ | --------------------- | ---------------------- | ----------------------------------------------------- |
| `sans`       | Arial                 | Liberation Sans        | Portable sans serif                                   |
| `serif`      | Georgia               | Liberation Serif       | Preserve serif design                                 |
| `times`      | Times New Roman       | Liberation Serif       | Word serif                                            |
| `humanist`   | Verdana               | DejaVu Sans            | Humanist sans alternative; metrics can differ         |
| `freundlich` | Trebuchet MS          | Liberation Sans        | Nonembedded substitute for the web's Cabin            |
| `schmal`     | Arial Narrow          | Liberation Sans Narrow | Condensed alternative                                 |
| `maschine`   | Courier New           | Liberation Mono        | Monospaced alternative                                |
| `plakativ`   | Impact                | DejaVu Sans            | Readable sans alternative; display appearance differs |

Serif faces declare `roman`, monospace faces `modern`/fixed pitch, Impact `decorative`, and other sans faces `swiss`/variable pitch. DejaVu Sans remains a sans face even when substituting for Impact. Unknown keys or family overrides fail explicitly; they are not silently mapped to Arial. Adding a selectable font requires an explicit mapping and corresponding acceptance evidence.

## Selection and ownership

Without a supplied font inventory, the model retains the requested family and records `availability: "target-application"`. The font table carries `w:altName`, family and pitch hints. Word/LibreOffice ultimately control substitution on the user's computer; this is not a guarantee of identical metrics or availability. Microsoft documents [alternate font names](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.altname).

An internal caller may supply `settings.fontPolicy.availableFonts` for a known target environment. Selection is pure and case-insensitive: use the requested family when present, otherwise its declared alternative. If neither is in the supplied list, generation fails explicitly. The selected native run font and sorted `model.fonts.selections` are deterministic across project JSON roundtrips. The caller is responsible for the accuracy of its inventory; browser-installed fonts are not inferred or measured.

Brief's standalone letter base uses `letter.design.font`, matching `LetterCanvas`. Designed letters use their explicit dossier override. The existing editor deliberately synchronizes CV/letter base fonts; this rebuild does not change that application behavior. A directly supplied snapshot may retain distinct bases. Letter role fonts override the letter base, and canonical field overrides take precedence over role styles. Rich letter paragraphs/table cells inherit their resolved body font. Explicit chrome font settings take precedence over the relevant logical part's base. CV and cover preserve their existing user/template font ownership.

## Embedding decision

Embedding is **disabled** in this candidate. The model records that decision and package settings explicitly disable TrueType embedding. Next generates no font payload or embedding relationships and performs no network font fetch. Export therefore works with an unavailable font-asset service. An enabled embedding policy is currently unsupported and rejected rather than silently ignored.

The four distributed Cabin faces have a local SIL Open Font License 1.1 file and OS/2 `fsType = 0`. The inventory records their byte counts and SHA-256 hashes and the license hash. The license permits embedding subject to its conditions; the [OpenType OS/2 specification](https://learn.microsoft.com/en-us/typography/opentype/spec/os2) defines the font's embedding bits. This file audit supports a possible later implementation but does not validate obfuscated font parts, application behavior, editing rights or save/reopen in Word. Proprietary system fonts are not redistributed. Legacy Cabin embedding remains isolated to the temporary legacy export.

Do not enable embedding until the package implementation, licensing conditions, missing-asset behavior and Windows/macOS Word editing/save/reopen have separate evidence. This checkpoint tests the disabled/offline path; it does not claim an enabled-embedding failure path exists.

## QA and remaining acceptance

Unit tests exercise all eight requested/alternative mappings, unsupported families, unavailable alternatives, independent supplied letter/CV bases, rich/role/chrome inheritance, semantic overrides, deterministic selection and offline disabled embedding. Five real fixtures cover mixed faces, all eight unavailable primary faces, long letter/CV content and offline policy. The unavailable-font probe checks the actual fonts in LibreOffice-derived PDF spans initially and after saving/reopening DOCX.

Restoring Brief's actual default `freundlich` letter font changes existing long-content candidate page counts: long letter 12 dossier pages, painted long letter 14, long columns seven, long columns with chrome eight. The new long letter/CV fallback fixtures each have ten dossier pages. These are Word-oriented candidate expectations, not approved snapshots or browser-PDF targets.

Microsoft Word installed/unavailable-font behavior, editing reflow and approved reference snapshots remain pending. An alternative that is absent on the user's computer may be replaced again by the application. Review substitutions and pagination in the manual Word checklist before accepting Brief or enabling another template.
