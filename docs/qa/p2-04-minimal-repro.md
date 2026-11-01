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

## Second native run and package correction

Implementation `a9e6f2dd39ae824f5ba9069a8578c3bff579ec9e`,
[run 41290630138](https://github.com/modebrecht/cv-cover-charm/actions/runs/41290630138):
16 noncompact cases converted. The original three defects and reduced positive/
negative controls repeated. Both production-entry-only stories rendered their
full tail, so that further reduction did not retain the truncation.

All four new compact packages failed to load (LO exit 0, no PDF). The execution
gate correctly failed. Artifact `13076854144`, ZIP SHA256
`67477825c2efe41f4cb0410fe5c46bfc3e5121cabe641dc573a2d100ab9be714`.
This is retained as a failed packaging attempt, not a passed native test.

The reducer had changed OPC content-types and relationship roots to prefixed
ns0 spelling. The next bounded correction preserves their original default
namespace spelling; document.xml and live payload bytes remain unchanged.
Its native rerun must pass the four pixel-equivalence controls before compact
fixtures are accepted. If not, use the already working full-package story
reductions; do not keep trying packaging changes without evidence.

## Source-reading lead, not an executed fix

Microsoft's [HorizontalPosition.RelativeFrom](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.horizontalposition.relativefrom?view=openxml-3.0.1)
and [PositionOffset](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.positionoffset?view=openxml-3.0.1)
document the selected positioning base and the offset measured from it. A bare
page-relative coordinate by itself does not settle compatibility behavior.

The official LO [24.2.7.2 GraphicImport.cxx](https://github.com/LibreOffice/core/blob/libreoffice-24.2.7.2/writerfilter/source/dmapper/GraphicImport.cxx#L750)
contains a compatibility override: incoming layoutInCell=0 can be forced on when
compatibilityMode >14 and the importer is in a table. For graphic objects that
value is later passed into FollowTextFlow (around line 1880). The tested source
settings explicitly declare compatibilityMode=15. This is a concrete lead that
fits the table/paragraph controls. It is not an instrumented runtime trace or a
confirmed complete C++ root cause. The source comment's Word behavior is not a
new Word test or an acceptance claim.

Next bounded test: change only compatibilityMode in standalone diagnostic copies
(14 vs 15) and repeat both anchor-host cases. That setting affects document
semantics; changing it globally is not a product workaround approved here.
