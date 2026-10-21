# Sidebar layout repair and fresh Word candidate

21 October 2026. Branch: `fix/docx-next-sidebar-word-layout-21okt`. Base: `bc26a9472cf802828b5cd7e92d885954d82cec3c` from the active shared Fidelity branch. This isolated branch incorporates the earlier picture-control repair (`2813958f`) and reference alignment repair (`375075f`) without modifying either existing workstream.

**Update after desktop Word returns:** V2 original-image preservation in case 04 and the removed blank page in case 06 are now confirmed. Word also exposes clipped photo outlines. The subsequent shared repair and general half-width alignment correction are documented in [the current CV report](docx-next-sidebar-word-photo-21okt.md). **NO-GO for production remains.** The original pre-return verification record below describes V2 and must not be mistaken for the latest Word status.

## Changes

### Reference alignment

Side-by-side references must share the section's left content edge. The old two-cell table added 3 mm padding on both outer edges; a 6 mm empty middle track now owns the inter-column gap. Two equal content tracks remain, including an unoccupied final track when there is only one reference. No zoom, section-width preference or authored text is reset.

### Portrait layout and ownership

The previous free-main-photo adaptation inserted a full-height image zone before every main-track text block. The portrait fixture consequently placed its title near y = 96.13 mm and spilled references onto a second CV page. The replacement preserves the saved photo position/crop while letting text flow beside a native wrapping frame. The picture itself stays **inline inside its own typed picture SDT within that frame**; it is not a floating picture directly inside a picture SDT. Title text and the wrapping frame have separate ownership. Sidebar-rail free pictures retain their existing flow-zone composition.

In the final Writer render, the portrait title begins near y = 23.52 mm, matching the other cases; the entire CV occupies one page. The source embeds the complete original PNG bytes. Word's selection, picture replacement and crop-reset behavior still require direct testing.

Microsoft's [picture-control schema documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtcontentpicture?view=openxml-3.0.1) describes the single-picture content constraint. The Word APIs provide [content-control insertion for inline pictures](https://learn.microsoft.com/en-us/javascript/api/word/word.inlinepicture?view=word-js-preview). A [user report on Microsoft's Q&A site](https://learn.microsoft.com/en-us/answers/questions/5246016/word-document-becomes-corrupted-after-adding-a-pic) describes corruption with floating picture controls in Word 2307 and suggests an inline picture control inside a wrapping text box. That older report is supporting risk evidence, not proof about the user's current Word build.

### CV section opening

The old composition has a kept empty body paragraph before one continuous, independently flowing Sidebar table. The supplied Word PDF has a blank page 3 and begins CV content on page 4. Simply removing `keepNext` reproduced a blank page in Writer and was discarded.

The new explicit `section-start` composition starts the CV with the table. Each populated first-row cell has an untagged native start paragraph; first-page lead space belongs there, not to a separate body paragraph or repeated cell padding. Removing the outside paragraph without these cell boundaries caused first-field loss after saves and was also discarded. The final six cases preserve every field through two Writer saves.

This changes a known source structure implicated in the Word failure. **It does not establish that the Word blank page is fixed.** The new Writer long fixture has 11 pages with no blank page, as did the old Writer baseline. All 65 school entries remain. The desktop Word return remains the decisive next check.

### Current cover presentation

The six new dossiers select the existing `coverComposition: "authored-frames"` path inherited from the pinned Fidelity base. They no longer exercise the old generic cover flow used in the first Sidebar packet. Cover implementation is reused; it is not reimplemented here. All six cover-page PNGs are identical to one another, as are all six letter-page PNGs. This does not declare the cover Word accepted.

## Verification

| Check                                         | Result                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Bun tests across 11 relevant suites           | 78 passed, 0 failed, 1498 expect calls plus Node assertions                                                          |
| Markup-compatibility parser adversarial tests | 4 passed; real duplicate active IDs still reject                                                                     |
| Focused TypeScript check                      | Passed for the changed production modules and transitive dependencies; no full application build                     |
| Six fresh application-model exports           | Generated with the current authored cover and an explicit complete 120 × 180 PNG adapter                             |
| First Writer save                             | 79/79, 80/80, 80/80, 80/80, 80/80, 384/384 fields                                                                    |
| Second Writer save                            | Same counts; every field ID and its text retained                                                                    |
| Photo controls after both saves               | Each retains one referenced image asset                                                                              |
| Original source PNG embedding                 | Exact original bytes retained in all four photo sources                                                              |
| Original pixels after Writer saves            | FAIL in all four photo cases; strict assertion executed and failed                                                   |
| DrawingML structure after Writer saves        | Portrait-in-frame becomes VML; its picture SDT still contains the image. Original editing structure is not preserved |
| Exact table geometry after Writer saves       | FAIL; historical gate remains closed                                                                                 |
| Source renders                                | Cases 01–05: 3 dossier pages each; case 06: 11; no blank pages                                                       |
| Desktop Word acceptance of this candidate     | UNVERIFIED                                                                                                           |

Runtime: stock LibreOfficeDev 26.8.0.0.alpha0, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. This is not the historical Writer 25.8.7.3/Kit environment, not a rerun of the historical 22-case matrix, and not a Microsoft Word result. `render_docx.py` produced page PNGs for all six dossiers; visual review includes the portrait, common cover/letter, references and long continuations. The final renderer regenerates byte-identical DOCX files to the saved/rendered packet.

The [machine-readable evidence](docx-next-sidebar-word-layout-21okt-evidence.json) separates semantic image containment from original DrawingML/crop/pixel fidelity. Writer adds `mc:AlternateContent` with Choice and Fallback copies of the portrait frame. The new reader selects one supported representation before counting controls. Counting both would incorrectly report duplicate active photo IDs; this normalization does not waive real duplicate IDs or the failed image-fidelity gates.

## Remaining observed limitations

Writer's extreme long fixture overlaps hobby lines at one continuation boundary. The same overlap is present in the original supplied Writer reference. In the user's Microsoft 365 PDF (`06-Langer-CV-rechts-wtf.pdf`, SHA-256 `4e99beed9e802a0febad9b2acaf65dc869d40cfb400444147b54813067a76a99`), interest 15 and 16 instead begin about 76.68 pt apart on page 6. That is evidence of an editor-dependent layout difference for this fixture, not universal proof that Word is unaffected. Changing keep-lines or paragraph SDT placement did not resolve the Writer overlap and is not included in this repair.

The original photo assessment needed to distinguish the saved crop (circle, zoom 1.25, pan 42/58, crop l/t/r/b 8400/24400/11600/22267) from an additional paint defect. The subsequent Word PDFs now establish clipped outlines independently of those unchanged crop values; see the current CV report. A PDF alone still cannot establish preservation of the embedded original asset.

## Original V2 Word request now superseded by returns

The V2 request covered portrait layout, the long CV's section transition, references, picture ownership and manual picture editing. PDFs for 02/04/05/06 and saved DOCX for 04/06 have since been returned and reviewed in the current CV report. Do not repeat the obsolete V2 batch. The new V3 packet contains only CV photo cases 04 and 05; manual Word picture replacement/crop-reset and the new candidate's Word render remain open.

No production export switch, merge, deployment, historical-branch modification or CI dispatch was performed. Native Sidebar remains gated. Header-leading and broader template/22-case acceptance require subsequent verification after the focused Word result.
