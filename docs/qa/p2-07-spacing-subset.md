# P2-07 — minimal spacing intervention in the coupled long-CV repro

Completed: changing the empty paragraph after **P202Praxis06** from
`w:after="1"` to `"0"` restores all 18 entries and the reference on three pages.
It is the only successful singleton among all 18 tested gap attributes.
The original still fails. No normal export or baseline is repaired silently.

Branch `work/01nov-p2-07-spacing-subset`, base
`4f3d10461529f0b91f713762b6eee31a24ad0f5c`.
Tested implementation **`8c42a028458cb5c856a12fdc665e6ac1b7e01532`**.
[Native run 41303045164](https://github.com/modebrecht/cv-cover-charm/actions/runs/41303045164),
job `124837780064`, Ubuntu 24.04, LibreOffice `24.2.7.2 420(Build:2)`.
This stage uses the two persisted synthetic P2-06 reductions, without app/browser
installation, private files, photos, Windows or manual Word approval.

## Actual tests and scope of the minimum

**22/22 usable native conversions, 66 PDF pages, 54/54 Python controls.**
The two unchanged P2-06 controls reproduce all six saved page pixel signatures.
Execution PASS means all conversions completed and these baselines matched;
the negative cases below remain content FAIL.

Recovery requires all 18 authored entry descriptions to be complete, all 19
unique title/reference markers and the reference role/phone to be present,
three pages and no observed entry split. Conversion failure aborts the search;
it cannot become evidence that a spacing subset fails to recover content.

| Controlled copy | Attributes zeroed | Content | Complete entries | Pages |
|---|---:|---|---:|---:|
| Original, unchanged | 0 | FAIL | 15/18 | 3 |
| All gaps | 18 | PASS | 18/18 | 3 |
| All inter-entry gaps 02–17 | 16 | PASS | 18/18 | 3 |
| Both 72-twip section gaps | 2 | FAIL | 15/18 | 3 |
| Only gap after entry 06 | 1 | **PASS** | **18/18** | **3** |
| Each other individual gap (17 cases) | 1 each | FAIL | 15/18 | 3 each |

The 17 unsuccessful singletons include both section gaps and the fifteen other
1-twip inter-entry gaps. Every subset is generated fresh from the original.
All visible text, the 19 canonical innermost station/reference table payloads
and their order, and every non-document.xml package part remain identical.
Source fixture and document-part hashes are checked before conversion.

There is no zero-edit solution in this source fixture, and a one-edit solution
was observed. Therefore **minimum cardinality 1 is proven within the finite
domain of setting these 18 existing after attributes to zero**. This does not
prove that gap 06 is necessary for every possible repair: zeroing all 16 small
gaps also works, and unrelated attributes, alternative values and other source
documents were not exhaustively searched. No monotonicity assumption is used.
The bounded deletion fallback was not needed; the 64-conversion cap was not hit.

## Exact change and visible result

The successful single edit is in the direct empty paragraph between the
innermost tables for entries 06 and 07, main-cell child index 22 (zero-based).
Parsed-tree path:
`/body[0]/tbl[0]/tr[2]/tc[2]/p[22]/pPr[0]/spacing[0]`,
attribute `{http://schemas.openxmlformats.org/wordprocessingml/2006/main}after`.
This is a diagnostic copy of the coupled source: mode 15, table structure,
first-cell keepNext and all cantSplit flags stay unchanged.

The uncompressed document.xml has **73,906 bytes before and after**, with
exactly **one changed byte**, offset 32,666: ASCII `1` -> `0`. The DOCX ZIP is
recompressed and changes size; the one-byte claim is about document.xml.
One twip is approximately 0.0176 mm. The outcome depends on this document's
pagination context; it is not evidence that all positive gaps are invalid.
P2-06's entry-only control with an added 1-twip gap remained complete.

| Visible/layout observation | Original | Only gap 06 zero |
|---|---|---|
| Page 1 decoded RGB signature | baseline | exactly equal |
| Main name origin, mm | [71.032, 70.097] | unchanged |
| First station origin, mm | [95.338, 143.175], page 1 | unchanged |
| Title origins/pages, entries 01–15 | baseline | all unchanged |
| Entry 16 title | page 2, y 278.765 mm; description incomplete | page 3, y 55.880 mm; complete |
| Entries 17–18 and reference | absent | page 3, complete |
| Third-page body | blank | entries 16–18 and reference |

The three-page comparison was rendered and directly inspected. The copy has
readable full entry descriptions and reference contact without observed entry
splits. Its page-2 ending and page-3 content change, so full layout neutrality
is not claimed. The minimal persisted fixture has no images or page-number
fields; this stage checks page counts, not new image/page-field acceptance.
The fixture's existing simplified sidebar text remains present. This is not a
new cover/letter/photo-CV run, nor an x39 template acceptance.

Durable evidence:
[all 22 native results](p2-07-spacing-results.json),
[three-page comparison](p2-07-spacing-minimum.jpg),
[minimal DOCX, exact-diff manifest and replay instructions](../../tests/fixtures/lo-import-p2-07/README.md).
The failing original remains in P2-06; it is not overwritten.

## Verification, resources and handoff

Artifact `13082315704`, ZIP SHA256
`34ce96351cf53181bef3e9de6d7d5d9f7f48825669f6a10797a1828ba92b8eed`;
download hash verified. The committed native RESULTS.json is copied verbatim
from that artifact, SHA256
`4a498b28ab0639173a57bd59f54121bbd8d388b3ef4abd8b157c36846d4ae163`.
Audit-only replay of saved DOCX/PDF hashes, content, search certificate and
baseline pixels passes. That replay makes **zero native conversions** and is
not an independent second native run. One new native matrix was run in P2-07.

54 controls: 10 spacing/search, 8 compatibility, 13 preamble, 9 semantic,
10 earlier isolation and 4 converter-contract tests. They passed locally and
in CI. Workflow YAML parses, existing five job IDs remain; only the shared
persisted-fixture job runs on this branch. Source/gallery, converter-PoC and
production semantic lanes are explicitly skipped. No second workflow was added.

Measured native job-log duration: **112.35 seconds**, from 11:42:10.410Z to
11:44:02.758Z. LO conversions total **58.206 seconds**; peak child RSS
**213.91 MiB** (219,040 KiB). This is child-process RSS, not whole-runner or
Python memory. Each conversion uses a private profile and 90-second timeout;
the shared job cap stays 10 minutes. Artifact size is 1,741,645 bytes, retained
14 days. Committed results, fixture, manifest and comparison persist.

Recommendation for **P2-08**: test this one-attribute hypothesis on separate
copies of fresh, full production Next long-CV exports for left/right sidebars,
using the synthetic calibration image and their same-SHA App-PDFs. Select the
gap by its semantic location after the authored sixth entry, not by a raw XML
byte offset. Retain untouched originals; compare text, entry page spans, image
placement/crop and common-text geometry. Include nearby content lengths to
test pagination sensitivity. A narrow success here is a useful regression
fixture, not authorization to normalize all production spacing.

LibreOffice remains the current baseline. ONLYOFFICE's earlier watermark
rejection remains unchanged; no new vendor conversion is counted. App-PDF/
Word parity for this candidate and coverage of the 39 templates remain open.
The separate compatibility-mode photo displacement result is not repaired by
this spacing experiment.

Normal source/export code, dependency manifests/lockfile and all P2-04/06 input
fixtures are unchanged. Verified protected refs remain:

- dev: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- render: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- main: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`

No vendor issue/message, deployment, merge, custom-engine installation or
desktop/manual acceptance was performed.
