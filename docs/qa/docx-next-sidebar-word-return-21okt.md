# Sidebar — first desktop Word visual return, 21 October 2026

**Status: Word visual acceptance FAIL for the long-CV opening; Word semantic/photo-pixel acceptance still UNVERIFIED.** This is new user-supplied desktop Word evidence after the ownership repair, not a rerun of the historical Writer matrix.

## Branch check before further repairs

- Sidebar fix code: `2813958f3a25eeeb5853dc6412809143f04207bd`, based on dev `8901a830a792d75e9e792345c5180827218b4e1e`.
- Current inspected shared Fidelity head: `8074fa9dfd08f48795dcc495326bff751bf40c9f` on `fix/docx-next-shared-fidelity-18okt`.
- The Sidebar test producer calls the old generic cover flow. It neither carries the newer authored cover implementation nor selects `coverComposition: "authored-frames"`, used by the later supported cover path. Thus its six cover pages are not the current cover acceptance set.
- The active Fidelity branch contains the newer cover path and [fresh acceptance report](https://github.com/modebrecht/cv-cover-charm/blob/8074fa9dfd08f48795dcc495326bff751bf40c9f/docs/qa/docx-next-fresh-acceptance-21okt.md). That report still leaves Desktop Word acceptance open; “newer implementation exists” must not be relabeled “the user's exact cover is Word accepted.”
- Both `cv-sidebar-body.ts` (blob `8cb896141465e18639315203e22edd304fb84a7f`) and `cv-sidebar-composition.ts` (blob `be9502686c2bc452b4eb85a7e6a7316bc286f0b3`) are unchanged in the inspected active Fidelity head. Its newer cover work does not resolve the Sidebar opening or free-main-photo flow.
- No active Fidelity branch is modified. No merge, rebase, product edit, runtime experiment or deployment is performed in this return review.

## Received evidence

Three Word screenshots and `06-Langer-CV-rechts-wtf.pdf` supplied by the user. PDF creator/producer: **Microsoft Word for Microsoft 365**; creation timestamp 21 October 2026, 11:41:31 +02:00. The exact desktop Word build is not present.

PDF SHA-256: `4e99beed9e802a0febad9b2acaf65dc869d40cfb400444147b54813067a76a99`.

The PDF has **12 pages** against the supplied Writer reference's 11. Page **3 is empty**; the first CV content is on page **4**. All school entries **1–65** remain in the Word PDF. This is a confirmed extra opening page, not evidence of lost school entries or a consequence of one-twip mirrored drift.

The no-photo long-CV source in the repaired packet is byte-identical to the pre-repair source, as recorded in the [ownership evidence](docx-next-sidebar-photo-ownership-21okt-evidence.json). The photo-control correction did not change this document.

## Per-case assessment

| Case | Actual finding | Acceptance/next investigation |
| --- | --- | --- |
| Covers 1–6 | Old generic flow, not the active authored cover presentation | Exclude these from current cover acceptance. Do not duplicate the other workstream's cover repairs. |
| Photo 2/3 | Fixture deliberately declares a circular crop with zoom 1.25, pan 42/58. Source crop is l/t/r/b 8400/24400/11600/22267. The full 120×180 image is intentionally not all visible inside the circle. | Screenshot alone cannot prove an additional clipping defect, retained original pixels or crop reversibility. Inspect Word-saved DOCX. |
| Portrait 4 | Free photo is lowered into the main story before the title. The generated Writer reference already places “Lebenslauf” at about y=96.13 mm and the name at y=105.47 mm, with references on the next CV page. | Existing native flow adaptation, not newly demonstrated Word-only displacement. Its appearance is now rejected by the user's feedback; assess a shared photo/header composition instead of cover adjustments. |
| Free side photo 5 | User reports “perfekt” | Positive visual feedback only. Native fields/pixels remain unverified without a saved package. |
| Long CV 6 | Fixture intentionally contains 65 school entries plus 55 long interests. Many CV pages are expected. Word adds a blank page 3. | Confirmed Word pagination failure. Preserve the source and inspect the section/body-table boundary and keep policies. Do not infer a proven cause yet. |

## Next concrete engineering work

1. Obtain Word-saved DOCX for **02, 04 and 06**, plus the Word build. They answer different questions: actual full photo/crop and SDT containment; free-main-photo placement after save; serialized pagination/keep/section properties.
2. For 06, compare the immutable original and Word-saved packages. Focus first on the real kept paragraph immediately before the independently flowing multi-page body table and section transition. The current source uses `bodyBoundaryKeepNext=true`; that is an investigation target, not a proven cause or permission to remove the guard blindly.
3. For 04, separate source placement/pan/crop from Word import behavior. The source-native layout is already low; changing image pixels cannot repair the preceding-flow decision. Require a shared composition and explicit first-page expectations.
4. Before the next user packet, use the current compatible Fidelity presentation or clearly exclude cover/letter pages in the packet instructions. Keep old immutable sources only for editor attribution. Do not request another broad cover test from this Sidebar packet.

The user's PDF establishes visible Word failure but cannot establish SDT retention or embedded image identity. The earlier local ownership result remains a Writer-specific result. Existing production, exact-geometry, original-image and full-matrix gates remain closed.
