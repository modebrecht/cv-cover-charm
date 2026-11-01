# P2-04 — LibreOffice story reductions

Completed: two successful native experiment rounds, with one intervening failed
package-compaction round retained as evidence. **Four standalone 5–6 KB DOCX
fixtures reproduce the two defects and their paired controls.** Normal product
exports are unchanged; no workaround is promoted to production.

Work branch `work/01nov-p2-04-minimal-repro`, base
`e1d26d0ce02b10b3ff03075462b7c92b5e74f68b`.

Purpose: identify smaller reproducers for the current production photo-position
and long-table truncation defects. No product changes, alternate export baseline,
Windows access, Word acceptance or custom converter installation.

## Experiment design

The existing workflow creates the same eight production Next/App-PDF synthetic
source pairs; all 16 hashes and the common source SHA are checked. This lane
initially converts **three byte-identical originals plus eleven diagnostic reductions**;
the closing round includes six additional reductions/compact copies (20 total).
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

## Verified closing native run

Implementation `f840040d7ec2781aa9dd22e187fe72c6ed692519`,
[run 41291094020](https://github.com/modebrecht/cv-cover-charm/actions/runs/41291094020):

- **20/20 conversions complete, 44 PDF pages.** All three original defects repeat.
- All four corrected compact packages load. Each PDF is **pixel-identical** to
  its larger story counterpart. Default namespace spelling resolves the observed
  LO loading failure; the earlier prefixed packages also loaded in python-docx,
  so the failed native result is not described as universal OOXML corruption.
- 9/9 browser cases (42.3 s), 1/1 gallery pilot (12.2 s), 8/8 reducer controls,
  10/10 isolation controls and 9/9 semantic controls pass. Existing converter
  contract: 4/4 locally. YAML/embedded shell and whitespace checks pass.
- 16/16 source hashes verified; source and implementation SHA both match the
  tested commit. All **31 repeated decoded PNGs** from the first run are identical.
- Final artifact `13077770996`, ZIP SHA256
  `d682fdec8281052852d36f8d4c8d1a66dfedfd1c07c239fe592a46bfde5fef21`.
- Direct page-image inspection confirms the photo-host contrast and the long
  pair's blank versus populated third page. A separate read-only entry-span
  audit finds 15 complete stations in the coupled case, 18 in the detached case.

| Small standalone case | Observed result | Scope |
|---|---|---|
| Photo in table, mode 15 | FAIL position: +19.844 mm | 110-node story, one picture |
| Photo in paragraph, mode 15 | PASS photo trial gate: -0.258 mm | 53-node story, no table |
| Long, coupled first cell | FAIL content: 3 critical markers absent, station 16 incomplete | no SDTs or drawings |
| Long, detached first cell | PASS content: 18 complete entries and final reference | one keepNext attribute differs |

PASS here applies to each stated diagnostic requirement. These reductions have
no full App-layout equivalence requirement because their content/layout is
intentionally simplified. They do not repair the eight original production cases
or supersede P2-03's 4 PASS / 4 FAIL result. In particular, the simple bare and
production-entry-only further reductions do not reproduce the long failure;
the smallest positive long fixture here still retains the generated preamble.

Durable files: [complete results](p2-04-minimal-results.json),
[photo-host comparison](p2-04-photo-hosts.jpg),
[long-story comparison](p2-04-long-coupling.jpg), and the four self-contained
[DOCX fixtures with replay instructions](../../tests/fixtures/lo-import-p2-04/README.md).
Full native workflow artifacts have 14-day retention; the committed fixtures,
results and hashes remain available afterwards.
Fixture hashes and per-page observations are bound in its MANIFEST.json. The
photo fixtures contain only the four-color calibration image; long fixtures
contain no media parts. The original source and full failed attempt remain
separate, unmodified evidence.

## Resources and decision

No new workflow or converter installation strategy. This lane uses the existing
Ubuntu/LibreOffice/browser environment. Measured job-log durations are 3 min 20 s,
3 min 57 s (failed compaction round), and 3 min 19 s. Final peak measured LO child
RSS: **238.32 MiB**; this is not whole-runner/browser memory. Every conversion has
a 90 s timeout and private profile, with a 20-minute job cap. Four saved fixtures
now permit the next focused LO experiment without rebuilding the app/browser
source corpus. Capacity on other runners or engine versions is unmeasured.

Keep LibreOffice as the bounded comparator and retain visible regression failures.
The P2-01 ONLYOFFICE watermark rejection is unchanged; no new ONLYOFFICE execution
is counted here. No x39 visual release approval is implied by these three original
controls or the existing 39-template availability snapshot.

P2-05 recommendation: use the persisted fixtures for the one-variable mode 14/15
counterprobe described above. Keep it isolated from normal product exports.
The generated preamble/main-table interaction in the long case remains to be
reduced further; do not claim that any three-page nested table is sufficient.
No custom-engine build, vendor issue publication or manual Word step was done.

`dev`, `render` and `main` match their initial refs; no `src`, dependency manifest
or lockfile changes in P2-04. All work stays on `work/01nov-p2-04-minimal-repro`.
