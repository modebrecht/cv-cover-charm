# Word research consolidation on dev — 2026-11-02

This integrates the useful guarded mechanics, tests and closing evidence from
one work chain: body boundary `94d9021` → practical Word `c685bf4` → earlier
ONLYOFFICE/Word proof `f485405`. It is a selection, not a merge of the 24 commits.
The current dev baseline was freshly verified as
`9e84088855dddb5992a6ba7ec768adbe9153fe12`.

## Selected implementation

Six renderer/model files and three unit-test files are copied byte-exactly from
`f4854051595a0a5a51a6a9adc97003dd51e2d929`:

* The already guarded `body-stories` lowering detaches only the two empty cell
  start anchors (`keepNext=false`). Semantic paragraph policies stay unchanged.
* Direct typed-picture and rich-text/tiled-picture variants remain explicit
  diagnostic options requiring `allowUnacceptedModelIssues`. No product entry
  enables these options, and no source/39-template guard is loosened.
* The strengthened picture-owner reader, negative controls and read-only Word
  return inspection are reusable QA, with the immutable synthetic input fixture.

[The selection manifest](word-consolidation-selection-2026-11-02.json) records
all 30 copied files, their immutable source commit, Git blobs and SHA256 hashes.
The existing P2 QA component and its fixture hashes are preserved. Product
entry points, menus, dependencies and lockfile are unchanged.

## New bounded verification

`docx-next-word-consolidation-probe.ts` checks eight deterministic normal
shared-body/ordinary-picture packages against the pre-integration dev baseline,
including left/right short, long, inline-photo and free-photo states. The fixed
1-pixel PNG adapter checks package-byte stability; it is not a browser decoder
or a Microsoft Word acceptance test. Baseline capture was executed against the
actual old commit in a detached checkout, not against the candidate. The real
product UI downloads are separately exercised by the existing Modern smoke.

The probe also produces two new long non-photo body-story candidate packages,
one per side, through the actual guarded snapshot/model/export functions. Both
must still be rejected without the diagnostic opt-in. Input snapshots remain
unchanged. Source manifests bind the generated DOCX hashes and implementation
SHA.

The existing two-job `dossier-visual-parity.yml` generates these sources with its
ordinary smoke batch, then checks two native DOCX saves and source/save1/save2
PDFs. It requires all serialized field texts/identities/order, complete visible
field text, no blank pages, stable page count and unchanged sources. Failures
remain nonzero and produce reports. This adds ten conversions; the existing
Modern smoke remains eight conversions. Converter time/RSS and native overview
rasters are retained in the same QA artifact.

The full 22-case body/photo investigation in `docx-next-stable-sidebar.yml`
requires manual `full_body_diagnostics=true`. Its command explicitly declares
`--detached-cell-starts --require-picture-ownership`; known photo failures are
not converted into PASS. Other existing stable-sidebar jobs are unchanged.
No new workflow or working branch was created.

## Historical evidence and remaining boundaries

The copied body, practical Word, commit-review and ONLYOFFICE-return reports are
historical immutable evidence. References to local raw Word files are not newly
reverified or newly uploaded files. Their old "next steps" are not new work
orders. ONLYOFFICE research is already closed; its installer, experimental CI
switches and unbuilt engine patches are not imported here.

The practical Word main case passed two save/reopen cycles with its visible
photo and no repair prompt. The Writer-to-Word return had an empty photo. The
body candidate previously preserved 13 complete native cases, then correctly
stopped at duplicated photo identity. These bounded historical outcomes remain
separate. The fresh two-case smoke cannot grant photo fidelity, exact saved
geometry, the full 22-case matrix, arbitrary CV support or general Word/39-Next
product acceptance. Those gates remain BLOCKED.

The three work refs remain preserved as archive anchors; this task neither
renames nor deletes branches. `render` and `main` are not promoted.

## Validation

Local: 1495 unit tests passed, 0 failed, 283 files. Fifteen focused TypeScript
tests and 81 retained Python negative/contract tests passed; five new bounded
source/visibility negative tests passed. Typecheck, changed-file lint and format
passed. Eight normal packages match the old dev baseline byte-for-byte.

Native CI and final resource/results evidence will be recorded after the dev
run completes. This paragraph is not a claim of new Desktop Word testing.
