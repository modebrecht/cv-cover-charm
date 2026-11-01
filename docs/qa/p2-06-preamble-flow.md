# P2-06 — generated preamble and lead-wrapper counterprobes

Completed: the closing 23-copy native matrix isolates a positive **collective
empty-paragraph spacing** counterprobe. Zeroing 18 after values restores all
18 entries and the reference in the full coupled diagnostic story. Wrapper
removal, tested heading changes and empty-paragraph deduplication do not.
No single-byte trigger or product fix is claimed.

Branch `work/01nov-p2-06-preamble-flow`, base
`e859cf9c7bb18c99aab17cbe1dd70255f3ca5227`.

Target: the separate content-loss failure, independent of the photo/mode result.
Use the same persisted coupled/detached synthetic fixtures, without pictures,
SDTs, app rebuild, Windows or Word approval. No normal exporter changes.

## Planned controlled matrix

11 conversions: two byte-identical originals plus nine diagnostic reductions.
All 18 innermost station tables plus reference (19 critical tables) must remain
canonically identical and in the same order. All package parts other than
word/document.xml remain byte-identical; compatibilityMode stays 15.

- Remove only the empty main-cell starting paragraph.
- Flatten school or experience heading/first-entry wrapper, separately or both.
  Keep their contents and visible text, dropping only the outer one-cell table.
- Disable cantSplit on school or experience wrapper rows, separately or both;
  leave every inner entry-row flag unchanged. Attribute edits are enumerated.
- Replace the pre-experience preamble by a declared 4762-twip (~84 mm) spacer,
  once retaining and once flattening the first-experience wrapper. This changes
  visible preamble data intentionally but keeps every critical entry table.

The spacer is diagnostic, not an App position normalization. Page counts, first
entry baseline and entry spans must be read alongside content recovery: a copy
that simply shrinks to two pages does not prove three-page continuation is fixed.

Execution PASS requires every conversion and both saved P2-04 pixel baselines.
It is not layout/Word/product acceptance of any reduction. Same workflow and
shared lightweight LO/Python job; `preamble_flow` selects this matrix.

Local preparation/control results and native findings follow after execution.

## First native result

Implementation `ea36c03db2a2f51d9dd5816ec98391d8976c64da`,
[run 41296887983](https://github.com/modebrecht/cv-cover-charm/actions/runs/41296887983):
all 11 conversions and 39 Python controls passed. Both original P2-04 pixel
baselines match exactly. The coupled original and every one of the nine reductions
still have 15/18 complete entries and an empty third page; the detached original
has 18/18 complete entries. Therefore neither the tested lead-wrapper removal,
lead-row split permission nor the tested prefix spacer suffices to restore content.

Artifact `13079537517`, ZIP SHA256
`0ae102c7390db86d16a5b4033de57743d9b851cbe06f1b2ef27c4bb96bafc0b9`;
the archive hash was verified after download. These negative outcomes remain
observed failures, despite the green experiment-execution gate.

## Second bounded matrix

The first entry-only reduction in P2-04 had removed direct heading paragraphs
as well as wrapper tables. That difference was not isolated by the first batch.
Add seven counterprobes (18 total): clear the five direct main-paragraph keepNext
flags; independently clear only the main-title or reference-heading flag; remove
the experience heading, reference heading or both from the spacer/flattened copy;
and recreate the entry-only control with uniform spacer paragraphs. All 19 critical
innermost table payloads and their ordering remain unchanged. Direct keepNext edits
are enumerated, and maximum table depth is recorded instead of inferred.

10 reducer controls now pass locally, including the exact 5/1/1 paragraph-flag
counts and the entry-only control's absence of original heading paragraphs.
Closing native results and interpretation are pending.

## Second native result and final spacing counterprobe

Implementation `f0c95d224d253cc0718493c6730874bfa3c48a49`,
[run 41297618519](https://github.com/modebrecht/cv-cover-charm/actions/runs/41297618519):
18/18 conversions, 41 controls, both saved pixel baselines pass. Direct main
keepNext changes, including the exact 5/1/1 flag subsets, do not restore the tail.
Neither removing the individual headings nor removing both from the prefix copy
helps. These cases still have 15 complete entries and a blank third page.
The rebuilt entry-only control has 18 complete entries on three pages.

Artifact `13079966863`, ZIP SHA256
`97b3e282ea3e876c26b7bae1266cf308e23a722b4006d7414cece28acb17701d`;
the downloaded archive was hash-verified. Maximum depth is two in both the failing
heading-free prefix copy and passing entry-only control, so depth alone does not
explain this contrast. The earlier direct-heading explanation is not established.

Comparing their XML leaves empty spacer paragraphs as the concrete difference:
extra consecutive empty paragraphs and existing after values of 1 or 72 twips,
versus uniform single empty paragraphs with after=0. A final bounded matrix adds
five cases (23 total): one 1-twip gap after station 02; one 72-twip gap before the
reference; zero all empty-paragraph after values in the heading-free prefix copy;
zero them in the full coupled story; and independently deduplicate consecutive
empty paragraphs while retaining nonzero gap values. All critical tables remain
unchanged. The minimal gap cases have exactly one attribute difference relative
to the already passing entry-only control. No spacing normalization is applied
to normal product exports or their baseline.

## Verified closing native matrix

Implementation `695ad4fd7b4e9d254e7ea1cba11f408e6ca8582a`,
[run 41298301313](https://github.com/modebrecht/cv-cover-charm/actions/runs/41298301313):

- **23/23 conversions, 69 PDF pages**, both saved pixel baselines pass.
- **44/44 Python controls:** 13 preamble-reducer, 8 compatibility-invariant,
  9 semantic, 10 previous isolation, 4 converter-contract tests.
- Four source fixture hashes verified by the common pinned-manifest guard.
  All 19 critical station/reference table payloads remain canonically identical
  and ordered in every diagnostic copy; other package parts are byte-identical.
- All 18 input-copy hashes and 54 decoded page signatures from the second round
  repeat. Every first-round page signature also repeats in the closing artifact.
- Artifact `13079654908`, ZIP SHA256
  `623c9b3109a835070f4908bbd1d0f35ab98afd39dad8f67f208c4a4308d58b8f`.
  Download hash verified; audit-only replay retains native timings/RSS and
  reproduces results. Replay is not counted as another native conversion.
- Page sheets directly inspected: original third-page body empty; after=0 copy
  shows stations 16–18 and reference. All successful copies retain three pages;
  no observed entry split is introduced in this authored corpus.

| Closing counterprobe | Content | Complete entries | Third-page body |
|---|---|---:|---|
| Original coupled | FAIL | 15/18 | empty |
| Original detached control | PASS | 18/18 | populated |
| Wrapper flatten/split-permission probes | FAIL | 15/18 | empty |
| Direct main/title/reference keepNext probes | FAIL | 15/18 | empty |
| Heading-free prefix copy | FAIL | 15/18 | empty |
| Entry-only control | PASS | 18/18 | populated |
| Entry-only plus one 1-twip gap | PASS | 18/18 | populated |
| Entry-only plus one 72-twip gap | PASS | 18/18 | populated |
| Heading-free prefix: empty after=0 | PASS | 18/18 | populated |
| Full coupled story: empty after=0 | PASS | 18/18 | populated |
| Heading-free prefix: duplicate empties removed | FAIL | 15/18 | empty |

The full coupled after=0 case changes exactly 18 spacing attributes: sixteen
1-twip and two 72-twip after values on direct empty main-cell paragraphs become
0. All visible text, first-cell keepNext, inner-row cantSplit, settings/mode 15,
table count and table payloads remain unchanged. A parsed-tree comparison binds
this exact diff in the saved fixture manifest. The body-name baseline origin
stays [71.032, 70.097] mm; first station y changes 143.175 -> 141.905 mm.
Thus content recovery is real, but the copy is not layout-neutral.

A single 1-twip or single 72-twip gap did **not** break the entry-only control.
These observations do not establish that every positive spacing value is bad,
that multiple edits are always necessary, or which minimal subset of the original
18 values triggers the failure. The successful collective intervention and the
failed deduplication narrow the remaining investigation to spacer properties
and their context, rather than merely the presence/count of heading wrappers.

Durable evidence: [all case results](p2-06-preamble-results.json),
[three-page spacing comparison](p2-06-paragraph-spacing.jpg),
[two standalone DOCX fixtures and replay instructions](../../tests/fixtures/lo-import-p2-06/README.md).
The comparison shows original gaps on the left, after=0 copy on the right.
Native artifacts retain the whole matrices for 14 days; committed fixtures,
results, hashes and comparison persist. All source files are synthetic; no
private Word files or photos are used or added.

## Resources and decision

The same shared LO/Python job remains in the existing workflow. No app/browser
install or source rebuild. Measured job-log durations: **85 / 116 / 125 seconds**
for the growing 11 / 18 / 23-copy matrices. Final LO child peak RSS: **213.82 MiB**;
not whole-runner or Python memory. Each conversion has a private profile and
90-second timeout; the job cap is 10 minutes. Other engines/runners are unmeasured.

Keep this as diagnostic evidence. Do not zero document spacing in the normal
exporter or silently preprocess its parity baseline. The source remains a known
failure, and these copies deliberately change authored layout. P2-05's mode-14
photo result is separate and does not repair this content loss.

P2-07 should determine the necessary spacing subset in the full coupled story
(e.g. its sixteen 1-twip gaps versus its two section-sized 72-twip gaps), retaining
these controls and all original data. A candidate then needs actual production
export/App-PDF comparison on separate copies before any product change is proposed.
The P2-04/05 and this stage use persisted reductions, not a new full x39 acceptance.
ONLYOFFICE's prior watermark rejection is unchanged; no new vendor run is counted.

Normal source/export rules, dependency manifests, lockfile and P2-04 source
fixtures remain unchanged. dev/render/main match their protected initial refs;
all changes stay on work/01nov-p2-06-preamble-flow. No Word/manual desktop step,
custom-engine build or vendor issue publication was performed.
