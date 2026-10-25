# Bounded Letter source flow and remaining reference wrap

Date: 24 October 2026, late work round. Branch: `fix/docx-next-shared-integration-22okt`.
Base independently checked: `b0cfa992bcd50c89ab7b99a8d4c80c8ad4152886`.

## Result

A complete four-page candidate now follows the current Modern Letter's default role sizes, line spacing, explicit blank lines, section gaps and horizontal insets. The existing four-page synthetic control was first reproduced **byte-for-byte** through the full model builder and native DOCX renderer. This prevents an old/short fixture from being mistaken for the accepted long dossier.

The Letter candidate improves internal rendering while preserving the complete source picture and all 145 canonical control occurrences. The cover and both CV pages are pixel-identical to the control in the same renderer. It remains an explicit internal builder option, `letterFlowComposition: "source-lines"`, with a new unaccepted-model issue. The default renderer rejects it. There is no normal export or Sidebar release switch.

The reference role still wraps to two lines. No reference typography, track width, owner or image code is changed by this round. The previous [photo-owner prototype](docx-next-photo-rich-owner-24okt.md) also remains a separate, unverified Word UI experiment.

## Concrete causes corrected in the candidate

`LetterCanvas.tsx` gives ordinary body lines no paragraph margin and uses line height 1.55. Explicit empty lines already contribute one line. The old DOCX path instead adds 3 mm after every body paragraph, including those empty lines, and uses a different line-height basis. It also defaults several Letter roles to the template body size.

| Area | Previous native value | Current App source contract used by the candidate |
| --- | --- | --- |
| Body paragraph after-space | 3 mm, including empty paragraphs | 0 mm; explicit blank lines reserve their own growable line |
| Body line height | Native multiple based on 1.2 | Minimum 10.5 × 1.55 pt; no fixed-height clipping box |
| Recipient | 10.5 pt with inter-paragraph gaps | 10 pt, 1.45 leading; complete unwrapped recipient block reserves 24 mm |
| Date | 10.5 pt and template gaps | 9.5 pt, App muted ink; source 4 mm / 7 mm boundaries |
| Subject | 10.5 pt | 12 pt, 1.25 leading, 8 mm following gap |
| Salutation | 3 mm following gap | 5 mm following gap |
| Attachments | 9 pt and inherited paragraph gaps | 10 pt, source heading/list gap and continuous lines |
| Default horizontal insets | 24 / 22 mm | Modern's current band insets: 24 / 23 mm |

The candidate only accepts simple Modern/Sans plain-text Letters with the required recipient/date/subject/salutation/closing/signature content and default closing/signature spacing. It rejects rich structures, images, custom role/field typography, custom margins, separators and wrapping recipient rows. These features are not silently approximated or overridden.

The existing bounded Letter-tail policy is extended to include a short final paragraph and any trailing blank lines. Long final paragraphs retain natural splitting. This avoids a tested continuation containing only the closing and attachments without introducing a fixed box or an unbounded keep group.

## Verification actually performed

### Complete source replay

The accepted synthetic source SHA-256 is `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`. The replay uses the published contact-chrome snapshot, the published twelve-school-entry case, copied frozen style measurements and the source's frozen nonsemantic PNG assets. These are **not described as a fresh browser capture**.

Before writing a candidate, the replay requires the complete rebuilt baseline DOCX to have exactly that hash. This gate passed. The final candidate SHA-256 is `4818ed92d27358cc719309a5431a1d45278b0631cb851089d3a6aa71bd0c0c73`. Only `word/document.xml` differs between baseline and candidate; the remaining package parts are byte-identical.

The pure source inputs and adjacent cover/CV models remain unchanged. The profile's new model issue is rejected by the normal renderer before image handling begins.

### Controls and image preservation

The existing unchanged Word comparison reader reports 145/145 matching occurrences with unchanged field tokens. The photo remains inside its typed canonical owner with the original pixels and numerical crop intact. Unlike the separate photo experiment, this candidate does not change picture-control type or picture positioning.

### Rendering and additional cases

All four final candidate pages were rendered through the documents renderer and reviewed. Cover and CV pages 3/4 are pixel-identical to their control pages at 1414 × 2000 pixels. The actual user Word PDF was also inspected to distinguish the pre-existing Word result from the new internal candidate.

Fifteen canonical Letter fields were compared using the first matching PDF text-line top. Against the App PDF, mean absolute top-position difference changes from **10.356 pt to 2.237 pt**, and the maximum from **24.856 pt to 3.383 pt**. These figures include font bounding-box differences. They are a bounded positional indicator, **not** a global visual score, a baseline-only measurement, pixel equality or new Word evidence. Some line breaks and weight rendering still differ.

| Additional synthetic case | Letter pages | Dossier pages | Missing Letter paragraph tokens | Both CV pages unchanged |
| --- | --- | --- | --- | --- |
| Short body | 1 | 4 | 0 | Yes |
| Long body, twelve paragraphs | 3 | 6 | 0 | Yes |
| Eight attachments | 1 | 4 | 0 | Yes |
| One-line recipient | 1 | 4 | 0 | Yes |

After the first long-case review exposed a closing-only continuation, the bounded final-paragraph policy was added and these cases were regenerated. The final long Letter's last page contains paragraph 12 together with the closing and attachments. No hard page break was added.

### Tests and checks not performed

Eleven focused tests passed. They cover opt-in behavior, immutable saved input, unchanged adjacent models, field preservation, renderer rejection, blank lines, role sizes and gaps, recipient minimum space, bounded tails/trailing blanks, oversized final paragraphs and refusal of unsupported cases. The new test file is included in `test:docx-next`.

They ran with Node 24.22.1 native TypeScript support; the Bun `test` export was mapped to Node's `test`, while assertions use `node:assert/strict`. The full Bun suite, full TypeScript check and automated Prettier check were not run because those tools are not installed or cached in this runtime. Python compilation of the asset extractor and the executable model/native-renderer probe passed. No CI dispatch was requested or performed.

No Word UI, Word save/reopen, rich-letter acceptance, all-template acceptance or fresh App PDF export is claimed. The profile remains unaccepted pending the remaining native checks and standard repository checks.

## Reference wrap diagnosis and limit

The captured App role size is 10.476 pt; the current native serializer emits 10.5 pt. The native reference track is 161 pt wide. A Helvetica advance estimate gives about 160.691 pt at the source size and 161.059 pt at the rounded size. This illustrates a tight line-break boundary, but it is not an actual Word shaping measurement and does not establish font-size quantisation as the sole cause.

Two isolated package probes were tried internally. A `10.476pt` size representation still renders as 10.5 pt in the bundled engine. Increasing both reference columns by two twips while conserving total table width also leaves the two-line wrap. Both probes were rejected; no smaller font, compression, no-wrap setting or compensating width offset was introduced.

[Microsoft's implementation note on ST_HpsMeasure](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/8db5069a-6288-491b-b611-7204797ae191) documents its integer half-point interpretation. That historical note is not a current Word compatibility guarantee for a different representation. The practical result here is that a fractional-size XML change alone is not a demonstrated fix.

**Reference wrap remains OPEN.** Further work needs a principled font/line-break contract or actual native evidence; a text-specific width adjustment is not accepted as a solution.

## Reproduction and next steps

Use the exact synthetic source from the user's saved 24 October decision packet. Keep all input/output DOCX, PDFs, images, extracted assets and diagnostic snapshots outside Git.

```sh
python scripts/docx-next-letter-flow-control-assets.py CONTROL.docx NEW_ASSETS
bun scripts/docx-next-letter-source-flow-probe.ts NEW_ASSETS NEW_OUTPUT
bun test tests/unit/docx-next-letter-source-flow.test.ts
```

The extractor rejects any other source hash. The probe verifies each frozen asset, reconstructs the complete source through the current builder/renderer, requires exact source-byte reproduction and writes the full control/candidate only to a new directory. Render the candidate with the documents renderer, then compare it with the control using the existing read-only reader. Summary values are in [the evidence file](docx-next-letter-source-flow-24okt-evidence.json).

Next: native Word review of the Letter candidate when convenient; the existing separate photo UI test; principled reference-wrap work; then the ordinary repository checks and relevant native gates before any broader release decision. No merge, deployment, production switch or alteration to dev/main/render occurred in this work round. Other privacy-audit tasks were not touched.

## Publication integrity correction

The first publication commit `492bb91` received a truncated builder file because a text-transfer output limit was too small. The final byte check caught the mismatch. Forward correction `8519f69` restores the complete, already-tested local builder without rewriting history. Its Git blob is `bfee5638a7d0eb4bc45f49fb68ebc64da1dc9c21` (73,294 UTF-8 bytes). The generated candidate and all reported tests came from the complete local file. Subsequent publication verifies each uploaded blob against the local Git-object hash before moving the branch. Use the corrected head, not the transient publication commit.
