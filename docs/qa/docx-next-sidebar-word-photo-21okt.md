# Sidebar CV photo outlines and half-width text alignment

21 October 2026. Branch: `fix/docx-next-sidebar-word-layout-21okt`. This continues `9c6fcece1f212f6315f519d4db20e24d633951e2`. Scope is the **CV**: photos, native ownership, reference alignment and pagination. Cover and letter appearance are not under acceptance here.

**Result:** the user's Microsoft Word returns confirm original-image preservation in portrait case 04 and resolve the blank-page failure in long case 06. They also demonstrate a real visible photo-outline clipping defect. The shared serializer now reserves the outline's painted bounds. A remaining automatic inset on general half-width sections is removed. The new candidate is locally verified; its desktop Word render remains **UNVERIFIED**. Production remains **NO-GO** pending the outstanding acceptance gates.

## What desktop Word now proves

The four returned PDFs identify Microsoft Word for Microsoft 365 as their creator/producer. Their fingerprints and the two saved DOCX comparisons are recorded in [the evidence file](docx-next-sidebar-word-photo-21okt-evidence.json). The Word returns concern the preceding V2 candidate, not this new source revision.

| Returned case       | Confirmed result                                                                                                                                                                    | Limit                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 02 right photo      | Three pages; CV starts on page 3. Reference text shares its heading's left edge.                                                                                                    | PDF does not prove original DOCX asset or picture editing fidelity.                                                         |
| 04 portrait         | 80/80 field IDs; all 48 CV IDs and their text retained. Original 120 × 180 PNG bytes and decoded pixels, exact crop, DrawingML picture ownership and table grids survive Word save. | Top and side outline are visibly clipped. Manual replacement/crop-reset editing and a second Word save are not established. |
| 05 free right photo | Three pages; the circle's top outline is visibly cut flat. Reference text is aligned.                                                                                               | No saved DOCX was supplied for this photo case.                                                                             |
| 06 long CV          | Eleven pages, no blank page, CV begins on page 3. Saved DOCX retains 384/384 IDs and all 352 CV fields/text; exact grids survive.                                                   | Does not validate arbitrary long content or every historic layout.                                                          |

Both saved DOCX files contain the user edit `cover.eyebrow: Bewerbung → BewerbungGGG`. It is the only field-text change; a raw whole-dossier equality failure must not be reported as CV loss. Reference text and heading have a measured horizontal difference of **0 pt** in all four returned PDFs.

The original image hash in 04 remains `265bf0882c3cacca519668160cf117ee82c33a662f7d4a582516bdb0a864fd02`. This is direct Word evidence against treating the previous Writer-only original-pixel loss as a universal Word defect. It is one photo case, not a universal acceptance result.

## Photo root cause and repair

The exported DrawingML picture has a nonzero outline but declares `wp:effectExtent` as zero on all four edges. In the supplied Word PDFs the outline paint extends outside the picture fill, while the inline paint clip remains inside that outline. For 05, the PDF clipping rectangle stops at y = 775.14 pt, but the stroked contour reaches approximately 776.31 pt. The larger red outline in 04 is clipped along the top and sides in the same way. Its stored `a:srcRect` is unchanged after Word saves. This is a paint-bound defect separate from the intended saved crop and separate from original asset preservation.

Microsoft's [effectExtent documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.effectextent?view=openxml-3.0.1) specifies additional extents for wrapping and inline line height. The repaired shared picture primitive reserves one outline width per edge, matching the paint measured in these Word returns. Source pixel bytes, image dimensions, crop values, zoom and pan are retained.

The native wrapping frame encloses this complete paint box, with zero duplicate textbox padding. Its outer origin moves with the border reserve so the picture fill retains its authored location. Flow-zone tables likewise reserve the complete outline once; their cells do not add the border padding a second time. Native-track fit guards include the painted width and reject an outline crossing a track boundary. No template-specific or save-cycle compensation is added.

Local Writer renders now show complete circular and rounded portrait contours. That verifies the new source in Writer; it does not replace the outstanding new-candidate Word check. Writer still rewrites original picture pixels during its own saves.

## Half-width text must keep its left edge

The earlier reference-pair repair is confirmed in the returned Word PDFs. A separate general `width: half` wrapper still inherited the renderer's default 2 mm cell padding, shifting the entire rubric and its text. It now uses two equal content tracks, an explicit empty 6 mm middle track and zero outer padding. The current Web `CvCanvasBase` uses the same 6 mm column gap. A lone half-width section remains on the left; a paired section occupies the right track. Explicit source paragraph/rubric indentation is retained.

Regression checks cover single and paired sections in classic, left Sidebar and right Sidebar compositions, retaining unique fields and immutable source data. The photo packet contains the two existing photo fixtures; it does not silently change their section-width settings.

## Verification and packet scope

- All 54 tests across seven relevant Bun suites completed successfully; focused production TypeScript compilation passed. Of those tests, 53 passed in the main run. The determinism test hit the 5-second resource timeout twice, then passed alone in 2.62 seconds with a 30-second CLI allowance. Source assertions and product acceptance gates are unchanged; exact results are in the evidence file.
- All six regenerated sources retain their field IDs, text, exact photo data and crop values. No-photo sources 01 and 06 remain byte-identical to V2, so the proven long-case section-start repair is unchanged.
- Four photo sources were rendered. Both delivered CV-only files have one page, and each page is pixel-identical to its fresh full dossier's CV page. Complete outlines and surrounding text were visually inspected.
- Both CV-only files retain all 48 fields/text and their picture owners through two real Writer saves. The strict original-pixel gate still fails in Writer and is not waived.
- An internal half-width reference render checks the actual left edge independently of the photo fixtures.
- No application build, CI dispatch, deployment, merge, production switch, engine patch or 22-case render rerun was performed.

`scripts/docx-next-sidebar-cv-photo-packet.py` copies the generated final native CV section without reconstructing its contents or changing picture/crop markup. It is a focused QA extraction, not a new production export mode. Only cases 04 and 05 are delivered, with no cover or letter. The full dossier remains the appropriate artifact for section-transition regression; that was already returned for case 06.

The active Fidelity branch was independently checked at `5bb37a9eceb5325c8cfa5763858d2e3ffbe4fcd0`, seven commits beyond this workstream's inherited base. Its additional changes concern a gated cover-avatar trial, page-fit UI and supporting scripts/docs. Its picture primitive still emits zero effect extents, so these changes do not supply this CV repair. That branch was not modified or merged.

## Decision

Proceed with the shared primitive repair. The supplied Word evidence does not currently justify replacing the whole Sidebar architecture to solve Writer's original-pixel behavior. Keep manual Word picture replacement, crop reset, further save/reopen, the complete acceptance matrix and the existing exact geometry gate explicitly open. No further files are needed to establish the defects repaired here.
