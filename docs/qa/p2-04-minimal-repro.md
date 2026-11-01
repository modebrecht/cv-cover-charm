# P2-04 — LibreOffice story reductions

Work branch `work/01nov-p2-04-minimal-repro`, base
`e1d26d0ce02b10b3ff03075462b7c92b5e74f68b`.

Purpose: identify smaller reproducers for the current production photo-position
and long-table truncation defects. No product changes, alternate export baseline,
Windows access, Word acceptance or custom converter installation.

## Experiment design

The existing workflow creates the same eight production Next/App-PDF synthetic
source pairs; all 16 hashes and the common source SHA are checked. This lane
converts **three byte-identical originals plus eleven diagnostic reductions**.
A green experiment means completed conversions with the original defects
reproduced; it never means product parity.

- Photo: reduce the right CV to one anchored picture, one body marker and one
  row with three cells. Compare section left margin 20/10/0 mm, a plain paragraph
  host with no table and layoutInCell=1. The photo payload/crop geometry and all
  other package parts stay unchanged; only document.xml changes in reductions.
- Long CV: original left/right controls; then remove header/footer references,
  unwrap native content controls, remove body drawings, simplify sidebar content,
  and detach its first paragraph in a paired copy.
- A new bare synthetic table control uses 18 unique entry/end pairs, minimum
  row heights and a spacer to force continuation. It deliberately changes content
  and row metrics. Failure there alone would not prove the original mechanism;
  success would exclude only this particular simplification.
- The bare pair differs only in the first physical cell's keepNext attribute.
  Its smaller document story retains existing package styles/media for consistent
  imports. This is a story reduction, not a claim of a byte-minimal OOXML package.
- Every conversion is bounded to 90 seconds with a separate profile. PDFs, text
  markers, photo signatures, page images, dimensions and resource measurements
  are retained. No diagnostics mutate the source files.

## Current validation

7 reducer controls cover source protection, byte-identical originals, package
payload preservation, single-variable pairs, paragraph anchoring and nested
control unwrapping. The existing 9 semantic and 10 isolation controls remain.
Local real-source preparation creates 14 documents. The photo story shrinks
from about 49 KB to 3.5 KB in a table / 2.1 KB in a paragraph; the bare long
story from 109 KB to 12.5 KB. These figures are not native-conversion evidence.

Native CI results and the final decision will be appended after execution.
