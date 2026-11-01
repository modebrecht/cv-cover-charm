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

8 reducer controls cover source protection, byte-identical originals, package
payload preservation, single-variable pairs, paragraph anchoring and nested
control unwrapping. The existing 9 semantic and 10 isolation controls remain.
Local real-source preparation creates 14 documents. The photo story shrinks
from about 49 KB to 3.5 KB in a table / 2.1 KB in a paragraph; the bare long
story from 109 KB to 12.5 KB. These figures are not native-conversion evidence.

## First native run

Implementation `898dfe3103b51f295e2a38b96daa009d9e8d576f`,
[run 41290022062](https://github.com/modebrecht/cv-cover-charm/actions/runs/41290022062):
all 14 conversions complete, original photo shift and both original long-CV
truncations reproduced. Browser 9/9, gallery pilot 1/1 and initial reducer 7/7,
isolation 10/10, semantic 9/9 controls pass.

Artifact `13077445333`, ZIP SHA256
`aff7ea4eab6f540778e8ec7e8f699e095a5964bb4f2c1cdaf792dac11b5d0be7`.
The downloaded ZIP hash and generated-page inspection confirm:

- The 3.5 KB table story has the same 19.844 mm photo error. Its 10/0 mm
  section-margin controls yield 9.793/0.258 mm, respectively.
- The 2.1 KB paragraph story has only 0.258 mm error with the same 20 mm
  margin and unchanged picture anchor/payload. Thus the table host matters;
  it is not an unconditional extra margin on every page-relative picture.
- Removing SDTs and drawings leaves the long failure visible. Simplifying the
  sidebar to one tiny nested table still drops stations 17/18 and the reference;
  its third page is blank. The paired keepNext=0 copy renders that tail.
- The new simple bare table renders all entries on three pages with keepNext
  both on and off. It does not reproduce the defect. Three pages, nesting and
  the first-cell flag alone do not establish a sufficient condition.

## Closing experiment additions

Two additional long copies retain the innermost production station/reference
tables but replace the preamble with a known spacer. They test whether the
production nested entry structure narrows the failing story further.

Four compact copies prune unreachable header/footer/decorative-image parts and
compress the ZIP. Their document.xml bytes and all retained support/image bytes
are unchanged. Each compact PDF must be pixel-identical to its full-package
story counterpart; otherwise the experiment fails. These are additional package
reductions, explicitly separate from the earlier other-parts-byte-identical
story reductions. They provide small standalone files for later LO regressions.

The closing native result remains pending until those additional copies run.
