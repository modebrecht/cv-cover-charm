# P2-06 — generated preamble and lead-wrapper counterprobes

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

13 reducer controls pass locally. Native spacing results remain pending.
