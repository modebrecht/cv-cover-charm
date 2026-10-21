# Native Sidebar reference alignment — 21 October 2026

## Finding

The returned screenshot shows the reference name, role and contact approximately 3 mm to the right of the section heading. This is an exporter-authored inset, not evidence of Microsoft Word moving the block during save.

The test packet's original `02-Foto-rechts.docx` encodes the reference pair as two equal table cells with 170 twips of padding on both horizontal edges. The outer Sidebar main cell and the heading do not have this additional inset. The resulting 3 mm discrepancy is already present in the original Writer reference PDF.

The active shared Fidelity branch was checked at [`8074fa9dfd08f48795dcc495326bff751bf40c9f`](https://github.com/modebrecht/cv-cover-charm/commit/8074fa9dfd08f48795dcc495326bff751bf40c9f). Its `build-model.ts` still uses the same two padded reference cells. This specific correction is therefore not an omitted fix from that branch.

The role's early line break has a separate explanation: `referencesSideBySide` defaults to enabled. The preview's `CvCanvasBase.tsx` deliberately uses two equal columns and a 6 mm gap, including when the final pair contains only one reference. A full-width single reference would change that existing layout policy. This correction preserves it.

## Change

- Represent the preview's 6 mm gap with an empty fixed-width middle table cell and two equal flexible content cells.
- Set the reference table's horizontal padding to zero, aligning its first reference with the section content edge.
- Permit a positive, finite fixed column narrower than the existing 10 mm text-width minimum only when every cell in that column is empty. Populated columns retain the existing minimum. Zero-width and nonfinite fixed columns still reject.
- Preserve side-by-side selection, semantic field IDs, reference ordering and natural table pagination.

The change applies to the shared reference composition. It adds no Sidebar offsets, Word-specific coordinates or LibreOffice-specific behavior. Historical geometry and image acceptance gates are unchanged.

## Verification

- 40 tests passed across the table-grid, Sidebar, Sidebar body, renderer and picture-ownership suites; zero failures.
- Coverage includes one, two and three references with both Sidebar orientations; each populated name, role and contact ID occurs once in the serialized package. The reference gap is 6 mm, outer horizontal padding is zero, and content columns remain equal within one serialized twip.
- A populated 6 mm spacer and a zero-width fixed column reject rather than bypassing the width guard.
- Focused TypeScript checking of `build-model.ts`, `layouts.ts`, `renderer.ts` and their transitive dependencies passed. This is not a complete application build.
- A fresh `photo-right` source was generated through the application model and renderer, using the same explicit full PNG adapter as the earlier focused picture-ownership probe. One Writer PDF was generated with stock LibreOfficeDev 26.8.0.0.alpha0. This is a layout check, not a replay of the historical 22-case matrix or Microsoft Word acceptance.
- Compared with the packet's original Writer PDF: both documents have three pages; text spans and order are identical. Only the four reference text spans move: 8.500004 pt (approximately 3 mm) left, with unchanged vertical positions. The heading and reference name now both begin at x = 56.8 pt. The rendered reference area was visually inspected.

No Microsoft Word render or Save/Reopen of this correction has been performed. The earlier Word-return issues concerning portrait placement, the long CV's blank page, original photo pixels and cover-baseline mismatch remain open under their existing evidence. This alignment correction does not mark Native Sidebar accepted.

## Scope

Publish only on `fix/docx-next-sidebar-photo-ownership-21okt`, as a follow-up to `aac4dd9fb864ddf9159ae8bc2cf3f4cbccddcf1e`. Do not merge, deploy, switch production export or modify the active Fidelity branch. Existing downloaded DOCX files retain their original layout; the correction affects newly generated exports from the updated branch.
