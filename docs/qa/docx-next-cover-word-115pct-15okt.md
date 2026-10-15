# DOCX Next Item #37 — Microsoft Word 115% Brief round-trip evidence

**Date:** 2026-10-15  
**Status:** **PASS — bounded Word-save stability for the single 115%-scaled Brief candidate.**  
**Masterliste #37:** **PARTIAL / P1**, not accepted or merged.

## Provenance and independent verification

- Repository: `modebrecht/cv-cover-charm`, branch `investigate/docx-next-cover-fidelity-15okt`.
- Candidate-producing revision: `4c0687e0c44bf072fa9225de82e79eb61ae38665`.
- The user supplied five separate files: `candidate.docx`, `candidate-1.docx`, `candidate-2.docx`, `candidate-1.pdf`, `candidate-2.pdf`. These are external real desktop-Word evidence, **not regenerated LibreOffice substitutes**.
- `candidate.docx` SHA-256: `6727e12e327672fc2349fd972b6a891a9f0236ceaa839461cc8943879c64f7f7`; matches the published 115%-scaled candidate SHA in `docs/qa/docx-next-cover-metrics-15okt/generation.json`.
- Both PDFs identify their producer as **Microsoft Word for Microsoft 365**. The exact application build and installed font list were not independently recorded.
- Evidence was checked from the uploaded OOXML ZIP contents, semantic field tags and values, frame geometry, image payloads, PDF text bounding boxes and matching rendered PDF pages. This review had **no remote desktop session** and cannot independently prove whether Word was closed and relaunched between the saves.

## Observed package and Word conversion

| Document | File bytes | ZIP parts | Stored / Deflated | Uncompressed part bytes | Semantic controls | Cover text frames |
| --- | ---: | ---: | --- | ---: | ---: | ---: |
| `candidate.docx` | 75,965 | 16 | 16 / 0 | 74,109 | 79 | 10 |
| `candidate-1.docx` | 31,501 | 21 | 1 / 20 | 131,856 | 79 | 10 |
| `candidate-2.docx` | 31,521 | 21 | 1 / 20 | 131,935 | 79 | 10 |

The original renderer writes ZIP entries without deflation; Word rewrites and compresses most XML parts. **The smaller saved DOCX is explained by ZIP compression, not demonstrated content loss.** The uncompressed content increases because Word adds its document/package metadata.

### Checked preservation

1. **79/79** original semantic Word content controls remain present in the same order with identical associated text after Save 1 and Save 2; all ten cover controls are included.
2. **10/10** native cover paragraph frames retain identical X, Y and width values in OOXML across all three files. Word omits redundant `hRule=auto`, `hSpace=0`, `vSpace=0` attributes on the first save; this omission is not itself a position change.
3. The single PNG media payload is preserved **byte-for-byte** (5,096 bytes; SHA-256 `9e68fe8a4a8ed3c331c36d9d100986969615e568b37f764c278dbdd1fd641dde`), with its package path renamed from `word/media/decoration-1.png` to `word/media/image1.png`.
4. The `word/document.xml` payload is **byte-identical** between `candidate-1.docx` and `candidate-2.docx` (SHA-256 `e23096e665c2ffcfc7b1af914229e04a32adb9888ba837d2695345896a01bf7d`).
5. Both Word-exported PDFs have **four A4 pages**, identical extracted word bounding boxes and identical rendered pixels on **all four pages** (same render settings, 1.25x).
6. On the cover, **Kontakt is lower left** and **Beilagen is lower right**. This fixes the original grossly misplaced lower zones in this bounded Word-visible candidate; it is not a blanket all-template visual-parity acceptance.

### Exact submitted file SHA-256

- `candidate.docx`: `6727e12e327672fc2349fd972b6a891a9f0236ceaa839461cc8943879c64f7f7`
- `candidate-1.docx`: `77ea94fc8b5378f530e0617190c4166b7f2bc321ab51f7e21d14261191831e14`
- `candidate-2.docx`: `e15fa4ecd5437ff70e9fed6034397e9c6599b86ee8252c690f8c08cb3c04f223`

## Acceptance boundary and next gates

**Accepted here:** Structural preservation through two user-supplied Microsoft Word saved outputs, and exact visual stability between the two Word-generated PDF versions of this **one 115% Brief fixture**.

**Not accepted here:** Verified close/reopen UI steps; user editing of native cover text or photo; actual installed-font equivalence; precise pixel parity against the originally saved Web cover project; the thin initials-placeholder outline; safe overflow after editing; native browser-metrics capture integrated with the actual product export; the other 38 templates; product activation or release. Word-PDF stability does not prove those properties.

Do not republish the complete user-uploaded Word files in repository history. The evidence JSON stores hashes and non-sensitive measurements only. The bounded candidate remains behind the existing explicit diagnostic guard.

This is **new external Word QA evidence for an already isolated experiment**. It does not amend source, initiate CI, override the Sidebar NO-GO or request a merge/deployment.

See: [existing Brief metrics report](docx-next-cover-metrics-15okt.md) and [machine evidence](docx-next-cover-word-115pct-15okt-evidence.json).
