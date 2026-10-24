# Internal Sidebar photo owner prototype

Date: 24 October 2026. Branch: `fix/docx-next-shared-integration-22okt`.
Starting head independently checked: `b03be5da3adb6a340f8477dbf90b2583c104fe56`.

## Result

The initial **inline rich-text owner** trial retains the exact rendered appearance of the current synthetic control: all four pages are pixel-identical in the same bundled LibreOffice renderer at 1414 × 2000 pixels. Original image bytes, decoded pixels, numerical crop and canonical ownership also survive this source-only transformation. Word editing remains **UNVERIFIED**. This is a package-only experiment, not an exporter change or a demonstrated fix for disabled Wrap Text.

The separate block rich-text owner trial changes Sidebar text placement in this renderer. It is retained only as an internal diagnosis and is not the proposed Word candidate. No compensation offsets were added.

## Verified control and scope

The input is the exact current synthetic decision-packet DOCX, SHA-256 `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`. It was restored from the 24 October decision packet and checked against its manifest and the handoff. The source contains the synthetic diagonal pattern, not a photograph of a person. The user's returned Word file was not modified or republished.

This covers one automatic left Sidebar in a complete four-page dossier. It does not establish right/mirrored, free-photo or repeated-save behavior. The source's recorded product checkpoint is `9e7579c`; this trial deliberately reuses the accepted control rather than pretending to regenerate it from today's application.

## Two owner experiments

| Trial | Native structure | Internal result |
| --- | --- | --- |
| Inline rich text | Same paragraph and same inline SDT; remove only its picture-type property. Tag, alias and native SDT ID stay intact. | 4/4 pages pixel-identical to control. Preferred first Word UI probe; conversion to floating may still be restricted. |
| Block rich text | Promote the existing paragraph into the same SDT and remove its picture-type property. No drawing, crop or paragraph properties change. | Pages 1, 2 and 4 identical; text below the photo on page 3 moves up 2.25 pt, approximately 0.794 mm. Photo geometry and main text do not move. Held internally. |

Microsoft's [rich-text OOXML example](https://learn.microsoft.com/en-us/office/dev/add-ins/word/create-better-add-ins-for-word-with-office-open-xml) uses an SDT without a picture/text-type property, containing native paragraph content. Its [RichTextContentControl documentation](https://learn.microsoft.com/en-us/dotnet/api/microsoft.office.tools.word.richtextcontentcontrol) permits pictures and other content. These sources support the owner representation, not a guarantee that Word enables wrapping for this inline rich-text candidate. [Word's wrapping guidance](https://support.microsoft.com/en-gb/word/wrap-text-and-move-pictures-in-word) explains the distinction between inline and floating objects.

The concrete hypothesis is that removing the typed picture boundary permits normal picture commands while retaining semantic containment. Neither XML legality nor LibreOffice rendering proves that hypothesis. An inline rich-text SDT may itself remain a restriction. If Word still disables wrapping, do not call this a successful editability fix and do not integrate it into the exporter.

## Explicit alternative owner contract

The experimental owner is the SDT carrying `cv.person.photo`, resolved by canonical tag and its active section/story role, with exactly one native picture inside its content. The object name is not the owner. The single active image relationship must resolve to an embedded image within that occurrence. Tag, alias, numeric ID, image run, paragraph and all other document content are retained initially. There is no added content lock and no outer text-box frame.

For a subsequent Word save, retained semantic containment must be checked again. In particular, Word must not move a newly floating anchor outside the tagged owner. Image bytes elsewhere in the package do not rescue that failure. Copying only the picture outside the content control is not a successful owner-preserving move.

The current strict typed-picture reader is unchanged. It correctly reports `typedPictureControlSurvives: false` for this trial. That is the expected failure of the old owner contract, not an accepted production PASS. A future production contract requires its own saved-output gates; this experiment does not create them.

## Checks actually performed

- 13 focused adversarial tests passed, including both transformations, duplicate/missing owner, locks, unrelated paragraph content, floating/frame sources, changed crop, changed neighbouring text, changed package parts and lost semantic tag.
- Only `word/document.xml` changes; every other package part is byte-identical. The verifier compares the entire main document with the exact expected transformation. Its inverse restores all original canonical main-document markup.
- 145/145 field occurrences across 134 tags still match the unchanged reader, with unchanged field tokens. The photo's active canonical owner matches in `section:3/body`.
- The original 1920 × 2880 image remains byte-identical, SHA-256 `f8ba8f4b000d9aa4f18a5f476a630615232905810aec92c69d4e128cbfdec69c`. Numeric crop remains `0 / 0.08333 / 0 / 0.08333`. Native frame/drawing markup is unchanged.
- Both complete dossiers were rendered using the documents skill's `render_docx.py`. The preferred candidate and source have four pages. All four preferred-candidate pages were visually inspected; each is also pixel-identical to the matching control page.
- The rejected block trial was rendered separately and its differing page inspected. Its text drift was measured from the PDF, rather than estimated by eye.

These are initial package/layout checks. No Word UI, Word save/reopen, new App export, full application suite, full Open XML SDK schema validation or general Sidebar acceptance is claimed. Existing letter/reference wrapping differences remain inherited from the accepted control.

## Reproduction

Obtain the exact synthetic decision-packet source from the user's saved 24 October packet; never commit input DOCX/PDF/image files. Use the Python runtime with lxml and Pillow.

```sh
python scripts/docx-next-photo-rich-owner-test.py SOURCE.docx -v
python scripts/docx-next-photo-rich-owner-prototype.py SOURCE.docx Inline.docx Inline.json --mode inline
python scripts/docx-next-photo-rich-owner-prototype.py SOURCE.docx Block.docx Block.json --mode block
```

Outputs must be new paths. The CLI refuses a source other than the pinned synthetic control. Render both the control and candidate through the documented documents renderer and compare all pages. The stored [summary evidence](docx-next-photo-rich-owner-24okt-evidence.json) contains the actual generated hashes and scope.

## Next decision

The prepared inline candidate can be tested in desktop Word for picture selection, enabling a non-inline Wrap Text option, dragging, crop/reset and replacement. Preserve the actual saved output for semantic owner/pixel/crop analysis; a screenshot alone cannot establish that preservation. Replacement and crop reset deliberately change the active picture/crop and must be assessed as separate edits rather than compared as untouched saves.

If the inline rich-text owner still disables wrapping, use that result to choose a different owner/anchoring contract. The block trial is not ready because it currently fails initial layout invariance in the internal renderer. Do not solve that by unexplained spacing offsets.

No product TypeScript, application setting, normal Sidebar guard or existing acceptance reader changed. No merge, deployment, CI dispatch or alteration to dev/main/render. General Sidebar release remains **NO-GO**.
