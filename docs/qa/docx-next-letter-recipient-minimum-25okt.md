# Growable Letter recipient minimum

Date: 25 October 2026. Branch: `fix/docx-next-shared-integration-22okt`.
Starting head: `2f8801799bfc706b54a739303555c8d55a8d1082`.

## Result

The internal Modern/Sans Letter candidate now gives the recipient block a native
growable minimum instead of estimating how many unwrapped recipient lines exist.
A concrete wide-text case previously passed the eligibility guard, wrapped to
two lines anyway, and left the following date 10 pt too low. The new composition
handles the actual native wrapping and preserves the source's 24 mm minimum.

**19 targeted tests passed. Eight full dossiers / 37 pages were rendered.** All
13 changed Letter pages were visually reviewed; the 24 adjacent cover/CV pages
are pixel-identical to their previously reviewed control pages. Field contents,
canonical roles, original photo and crop survive initial generation in every case.

This is still an unaccepted internal model option. The normal renderer rejects
it, with an additional independent guard for the new row-minimum primitive. No
Word UI/save/reopen, full repository check or release acceptance is claimed. The
photo code, existing Word packet and unresolved reference wrap are unchanged.

## Reproduced problem

The earlier `composeSourceLetterFlow` accepted only supposedly unwrapped
recipient rows. It called `nativeTextWidthMm` before applying the final recipient
style. That helper uses a fixed average character advance, not font shaping.

For ten six-character `WWWWWW` groups separated by spaces (69 characters), the
guard estimated **153.3525 mm** at the old 10.5 pt template size, within the
163 mm content width. The final 10 pt text actually wrapped to two lines in the
bundled renderer. The old code still added the unused 24 mm reserve calculated
from four *unwrapped* rows. In the complete dossier, the date top was 244.4533 pt.

The new candidate places it at 234.4533 pt for that case: **10 pt less excess
space**, with no smaller font, text compression, text-specific rule or clipping.
This fixes recipient block composition; the shared approximate width/height
helpers used by other policies were not globally replaced.

The investigation began with reference font/width assumptions. The browser font
profile already checks the declared Sans realization and explicitly leaves target
Word font identity unverified. It did not justify a font substitution or a wider
reference track. The reference role's near-threshold wrapping remains **OPEN**.

## Native composition and boundary ownership

`LetterCanvas.tsx` uses a 24 mm minimum-height recipient div followed by a 4 mm
date margin. The new native composition puts the existing editable recipient
paragraphs in one borderless, zero-padding cell, with a growable row minimum.
It retains their field IDs, text, formatting, alignment and order. The row can
split when its contents exceed a page; no exact-height box or repeated heading
row is used. Recipient hard breaks/tabs remain unsupported because they need a
separate source whitespace contract. Noncontiguous recipients fail before any
model mutation.

The shared model now supports optional `rows[].minimumHeightMm`. The renderer
emits `w:trHeight` with `w:hRule="atLeast"`; absent values retain the existing
serialization. Validation rejects nonfinite, nonpositive, collapsed or excessive
minima. The normal renderer independently rejects any supplied row minimum until
diagnostic opt-in, including supplied story blocks.

Microsoft defines [AtLeast](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.heightrulevalues?view=openxml-3.0.1)
as a minimum, while [TableRowHeight](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tablerowheight?view=openxml-3.0.1)
describes native row sizing. Those definitions support the primitive, not a
claim of complete schema validation or tested Word behavior.

The renderer already emits a 1 pt cell-ending paragraph and a 1 pt table-ending
paragraph. These are **not one-twip boundaries**. To avoid charging them twice,
the native minimum includes the cell ending outside the authored 24 mm block,
and the following date gap accounts for both boundaries using the existing flow
boundary helper:

```text
B = existing native boundary height = 1 pt
native row minimum = authored 24 mm + B
native date before-space = authored 4 mm − 2B

max(24 mm + B, recipient text height + B) + B + (4 mm − 2B)
= max(24 mm, recipient text height) + 4 mm
```

This derives spacing from the shared native structure, independent of a name,
text width or renderer-measured offset. The row serializes as a 1381-twip minimum.
Ordinary twip rounding shifts the standard date and following Letter content by
approximately **0.05 pt / 0.018 mm** relative to the prior candidate. Recipient
text anchors themselves are unchanged. No compensation is applied to photos,
Sidebar geometry or other templates.

## Evidence and scope

The complete original synthetic control was reconstructed byte-for-byte again:
SHA-256 `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`.
Default serialization remains identical for this control. The new normal Letter
candidate has SHA-256
`b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b`.
Only `word/document.xml` changes relative to the control. The source uses the
existing frozen styles and verified nonsemantic assets; this is not a fresh
browser capture.

| Derived case | Dossier / Letter pages | Preserved source field occurrences | Extra check |
| --- | --- | --- | --- |
| Standard four recipient rows | 4 / 1 | 145 / 145 | Date differs from prior candidate by one twip |
| Wide recipient | 4 / 1 | 145 / 145 | All 60 W glyphs visible; correct growth beyond the minimum |
| Long recipient | 4 / 1 | 145 / 145 | All 480 W glyphs visible |
| Very long recipient | 7 / 4 | 145 / 145 | All 4200 W glyphs visible across three pages; subsequent content continues naturally |
| One recipient row | 4 / 1 | 142 / 142 | Same date start as the standard four-row block |
| Right-aligned recipient and date | 4 / 1 | 145 / 145 | Alignment retained |
| Twelve body paragraphs | 6 / 3 | 163 / 163 | Final paragraph stays with closing/attachments |
| Eight attachments | 4 / 1 | 151 / 151 | Continuous attachment text retained |

In all eight cases, cover and both CV pages are pixel-identical to the matching
original control pages. The original photo remains in its typed canonical owner
with unchanged pixels and numerical crop. This round changes no photo owner or
anchor. The field reader is unchanged. Physical ancestry intentionally changes
for recipient controls because they now live in a cell; these differences are
recorded, not reported as unchanged structure or native object identity.

The two targeted test files cover source immutability, adjacent model invariance,
canonical content, source sizes/gaps, growable wrapping, alignment, bounded tails,
unsupported content, noncontiguous fields, native minimum serialization,
independent diagnostic rejection, and invalid minimum values. They ran under
Node 24.22.1 native TypeScript loading with Bun's `test` export mapped to Node's
`test`; assertions use `node:assert/strict`. The new test is included in the
repository's dedicated Bun DOCX command.

Full Bun suite, full TypeScript check, Prettier, fresh browser export, saved-file
roundtrip, full schema validation and Word acceptance were **not run**. Those
remain release requirements. Historical test counts are not added to these 19.

## Reproduction and packet compatibility

```sh
python scripts/docx-next-letter-flow-control-assets.py CONTROL.docx NEW-ASSETS
bun scripts/docx-next-letter-source-flow-probe.ts NEW-ASSETS NEW-OUTPUT --recipient-cases
bun test tests/unit/docx-next-letter-source-flow.test.ts tests/unit/docx-next-table-minimum-height.test.ts
```

The probe first verifies the complete pinned control, then derives the cases
with explicitly reused frozen styles, asserts unchanged cover/CV models and
writes paired synthetic control/candidate files. Its output directory must be
new. All eight independently generated candidates were byte-identical to the
files actually rendered. Keep generated DOCX/PDF/PNG and diagnostic data outside
Git. Details are in [the evidence JSON](docx-next-letter-recipient-minimum-25okt-evidence.json).

The existing `CV-Word-Pruefkandidat-25okt.zip` remains byte-identical (SHA-256
`430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509`). It still
contains the earlier Letter composition and remains the separate photo UI test
packet. **It does not contain this new recipient minimum.** It was not replaced
or silently re-labelled. The old review-packet generator deliberately requires
its historical Letter hash `4818ed92...`; it must not be fed this new candidate.
Reproduce historical packets at their recorded checkpoint (the last preceding
head is `2f88017`), rather than mixing current output with old hash contracts.

Next: ordinary repository checks and a distinct native Word evaluation of this
recipient composition when available. The existing separate photo UI/save test,
the held floating variant and reference font/line-break decision remain open.
Normal production export, dev/main/render, merge, deployment, CI dispatch and
unrelated audit/automation work were not changed.
