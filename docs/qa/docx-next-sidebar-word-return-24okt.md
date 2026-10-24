# Native Sidebar actual Word return and picture editing

Date: 24 October 2026. Branch: `fix/docx-next-shared-integration-22okt`.
This is a read-only review of one user-returned DOCX and its Word PDF against the exact 24 October decision packet. No product or acceptance code changes are made.

## Diagnosis

The returned Word file preserves the complete original picture, numeric crop, native frame geometry and matched semantic owner. The severe original-picture loss previously measured in LibreOfficeDev is **not reproduced in this Microsoft Word case**. A wholesale Sidebar rewrite is not justified by that Writer result.

The user accepts this visible test and reports a separate editing limitation: the photo cannot be freely dragged and its Wrap Text command is disabled. The exported automatic photo is an inline DrawingML picture inside a typed picture content control in a nested CV table cell. That composition gives the photograph a stable place in the Sidebar but does not provide ordinary free picture positioning. This is a product editing limitation, not evidence of original-image loss.

## Inputs and scope

The packet source DOCX is SHA-256 `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`, produced at product checkpoint `9e7579c08527310d8b21bba2807924fb0c8de463`. The uploaded App reference PDF is byte-identical to that packet's PDF. The returned DOCX has a different package hash and declares Microsoft Office Word; the returned PDF declares Microsoft Word for Microsoft 365. The user supplies the actual Word test context, rather than application metadata alone establishing provenance.

There is one returned DOCX, not two separately retained untouched Save1/Save2 snapshots. Its cover profession reads `Informatiker/innen EFZ`, while both PDFs and the source read `Informatiker/in EFZ`. The reason and exact save/export sequence are unknown. Do not call this a completely untouched two-save roundtrip. This wording difference does not concern the CV photograph.

Only summary values and input hashes are published. Uploaded documents, PDFs, images and personal document metadata are not committed.

## PDF comparison

All eight pages were rendered at the same scale and visually reviewed as four side-by-side pairs. Both dossiers have four pages: cover, letter, CV page one, CV page two.

| Area | Observed result |
| --- | --- |
| Cover | Close visible match. No major displaced blocks or broken bottom zones. |
| Letter | Same extracted text tokens. Vertical paragraph spacing and some line breaks differ visibly. |
| CV page one | Photo, full-height Sidebar, school entries 1–11 and Sidebar text remain visible. Small baseline/spacing differences remain. The long Hobbys & Interessen rule spans its available width. |
| CV page two | School entry 12, practical experience and references remain on the same page. The reference role wraps to two lines in Word, increasing that entry's height. |
| Text extraction | No missing extracted non-whitespace characters on either CV page. Word additionally exposes the two header separator dots omitted by the App PDF text layer. Character inventories supplement visual review; they do not prove reading order. |

This is bounded positive layout evidence and the user's acceptance of this case, not pixel equality or acceptance of all templates, mirrors and long-content combinations.

## Picture and semantic evidence

The existing read-only reader at `ab183104` compares source and return without changing either package.

- All **145 control occurrences**, covering **134 distinct canonical tags**, match by canonical tag and section/story role.
- All 145 retain their control nesting and canonical story role. Physical header part renames do not count as ownership loss.
- **144/145** retain exact field tokens. The sole difference is the cover profession wording noted above; all matched CV field tokens survive.
- The source has no persisted paragraph IDs. Paragraph/native object identity is therefore not established by this result.
- The active photo remains inside the matched typed `cv.person.photo` control.
- Its **1920 × 2880** PNG is byte-for-byte identical to the source, SHA-256 `f8ba8f4b000d9aa4f18a5f476a630615232905810aec92c69d4e128cbfdec69c`. Its decoded RGBA hash is also identical.
- Crop fractions remain **0 / 0.08333 / 0 / 0.08333**. Word omits the explicitly written zero left/right attributes; this changes lexical markup, not the numeric crop or original pixel window.
- The **28 × 35 mm** extent, round-rectangle geometry and radius adjustment are unchanged.
- There is no document protection, picture-owner lock or photo `noMove` lock in this returned file.
- Original pixels and crop reserve survive. Interactive crop reset, replacement and free movement are separate UI actions; the agent has not executed them.

The reader still returns its own `wordAcceptance: UNVERIFIED`, as designed: XML inspection alone never certifies Word rendering or user interaction. The separate Word PDF and user report provide the bounded visible evidence above. No reader gate is weakened.

## Why free positioning and Wrap Text are unavailable

The relevant returned structure is:

```xml
<w:sdt>
  <w:sdtPr>
    <w:tag w:val="cv.person.photo"/>
    <w:picture/>
  </w:sdtPr>
  <w:sdtContent>
    <w:r><w:drawing><wp:inline>...</wp:inline></w:drawing></w:r>
  </w:sdtContent>
</w:sdt>
```

The source has the same inline typed-owner composition. `cv-sidebar-shared.ts` explicitly places the automatic photo inline; `renderer.ts` wraps it with `pictureControl`. This behavior was authored by the exporter, not introduced by Word Save.

[Microsoft's positioning documentation](https://support.microsoft.com/en-gb/word/wrap-text-and-move-pictures-in-word) distinguishes inline pictures from floating anchors. Inline positioning explains the lack of free dragging; inline status alone does not explain why conversion through Wrap Text is disabled. The additional typed picture-control boundary is the relevant restriction here.

[Microsoft's SDK description of picture controls](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtcontentpicture?view=openxml-3.0.1) defines their single-picture contents. It does not promise unrestricted floating-picture UI. A [historical first-hand Microsoft Q&A reproduction](https://learn.microsoft.com/en-us/answers/questions/5246016/word-document-becomes-corrupted-after-adding-a-pic) specifically records disabled picture-control wrapping and failures when forcing non-inline wrapping in Word 2306/2307. That historical report supports the interpretation; it is not a current Microsoft compatibility guarantee. Current disabled UI is independently reported by this user.

## Targeted design decision

Keep original-image embedding, crop encoding, Sidebar geometry and canonical field ownership. These have positive Word evidence in this return. Focus the next design work on the picture's editing boundary.

Two existing/native routes must be distinguished:

1. **Movable outer frame with an inline typed picture inside.** The shared exporter already has `nativePictureFrameRun` for free-photo composition. Moving/wrapping applies to the outer frame; selecting the inner photo still does not provide the ordinary floating-picture Wrap Text experience. Its actual Word stability remains unverified. Merely switching the automatic photo into that route would not fully answer this feedback.
2. **Ordinary native picture with a positioning/semantic owner compatible with floating anchors.** This is the appropriate bounded candidate when normal picture dragging and Wrap Text are required. Its initial position should still match the App, and original bytes/crop must remain unchanged. The existing picture-control ownership contract cannot simply be deleted or declared satisfied by an object name; define and verify the alternative owner contract explicitly before changing production output.

Prefer a small picture-ownership/composition prototype for route 2 over a Sidebar rebuild. A normal picture may start inline and later become floating only if its owner supports that conversion in Word; this UI behavior is a test requirement, not a guarantee from schema validity. Preserve the current source as the control. Keep automatic versus free photo state intact; do not repeat the earlier automatic-mode mutation.

The prototype must demonstrate: unchanged original pixels and initial crop; unchanged initial appearance; usable picture selection, movement and Wrap Text; crop editing/reset; retained canonical ownership after save; and no movement of unrelated Sidebar text. It must not weaken the existing typed-owner gate to manufacture a PASS.

## Verdict and next work

**This returned left/automatic Word case: original image, numeric crop and matched canonical ownership PASS; visible layout accepted by the user with recorded differences. Free photo positioning remains an open product limitation.**

The blanket statement that this current source has never been tested in Word is now superseded. Full Sidebar release remains **NO-GO**: one returned case does not complete the existing mirror/free-photo, editing and repeated-save gates.

Next: resolve the photo editing composition narrowly. Reconcile the letter spacing and reference-role wrapping as separate fidelity items, without mixing them into photo preservation or the historical one-twip geometry issue. No additional broad fixture matrix or intermediate user test is requested here.
