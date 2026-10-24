# Combined internal candidate and saved-photo checks

Date: 25 October 2026. Branch: `fix/docx-next-shared-integration-22okt`.
Starting head checked again before publication: `cf736d8bb1c45c02d9d6f7ae7f619b6458384407`.

## Result and boundary

A complete four-page synthetic review candidate combines the existing bounded
[Letter source-flow candidate](docx-next-letter-source-flow-24okt.md) with the
[inline rich-text photo-owner trial](docx-next-photo-rich-owner-24okt.md).
All four pages are pixel-identical to the separate Letter candidate in the same
bundled renderer. All 145 canonical field occurrences, the original photo bytes,
numerical crop, frame and initial drawing markup are preserved.

The photo is **still `wp:inline`**. Removing the SDT's picture-type property is
an owner experiment, not an implemented floating anchor or a demonstrated fix
for disabled Word picture commands. No Word UI or Word save/reopen evidence was
obtained. The candidate remains internal and the normal export is unchanged.

Two actual Writer DOCX saves failed for **both** the typed-photo control and the
rich-photo candidate. Rich ownership does not solve the existing Writer save
problem. The reference role still wraps. General release remains **NO-GO**.

## Provenance and initial verification

The current full model/native-renderer replay was run again. It reproduced the
entire accepted synthetic control byte-for-byte before creating the Letter
candidate; this is a frozen-source replay, not a new browser capture.

| File | SHA-256 |
| --- | --- |
| Original four-page control | `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0` |
| Letter-only candidate | `4818ed92d27358cc719309a5431a1d45278b0631cb851089d3a6aa71bd0c0c73` |
| Combined candidate | `ad5fed158088ad5506c1bb483f441212bd58be57a35b7092c2ba299a57978968` |
| Existing App PDF | `031159442ef39dc2f7191d409b1e507cc45fccf6b591f39d474976d70fe5345b` |

The new packet generator requires these pinned input hashes and a new output
directory. It preserves ZIP metadata, so two independent builds produced the
same combined DOCX hash. It performs exactly the already-tested owner transform
on the Letter candidate; the inverse restores all canonical document markup.
Only `word/document.xml` changes relative to that Letter candidate. Every other
package part is byte-identical. Original and returned user documents are not
rewritten.

The initial candidate contains 145/145 matching field occurrences across 134
canonical tags, with unchanged field tokens and section/story roles. The photo
stays in `cv.person.photo` in `section:3/body`. Its original embedded 1920 × 2880
PNG has SHA-256
`f8ba8f4b000d9aa4f18a5f476a630615232905810aec92c69d4e128cbfdec69c`.
Crop fractions remain `0 / 0.08333 / 0 / 0.08333`; frame remains 28 × 35 mm with
the same round-rectangle adjustment.

All four candidate pages were rendered and visually inspected at 1414 × 2000.
They are pixel-identical to the Letter-only candidate. Cover and both CV pages
are also pixel-identical to the original control; only the Letter contains the
previous round's intended changes. The initial package has 41 parts, 27
well-formed XML/relationship parts and 39 resolved internal relationships. These
are bounded package checks, **not** full Open XML SDK/schema validation.

This remains one automatic left-sidebar case with twelve school entries. No
fresh right/mirrored/free-photo or all-template acceptance is claimed.

## New read-only rich-owner return checker

`scripts/docx-next-photo-rich-owner-return.py` adds a separate, explicit contract
for a saved rich-owner trial. The existing typed-picture reader is unchanged.
It still correctly reports `typedPictureControlSurvives: false` for the initial
rich candidate; that production gate was not weakened.

The new CLI first verifies that its source is one of the two pinned synthetic
inputs and its initial rich trial is the exact owner-only transformation. It
then checks the returned file for:

- unchanged field counts, field tokens, canonical nesting and section/story roles;
- one canonical photo owner and one ordinary native picture inside that owner;
- an active embedded image resolving inside the matched occurrence, with the
  same original bytes and decoded pixels;
- unchanged numerical crop, frame, internal offset, rotation, preset geometry,
  rounded-corner adjustment and picture paint;
- no new typed control, binding, placeholder, lock, hidden photo, tracked revision
  or unsupported owner/image representation;
- unchanged other active picture instances, so a new picture copy outside the
  control cannot masquerade as a successful owner-preserving move.

Inline-to-floating placement, native position and wrapping changes are reported
separately. A synthetic anchor retained inside the same control passes these
bounded preservation checks. That is **not** evidence Word permits the action.
Block-owner rewrites can preserve semantic containment while still changing
layout; this checker explicitly does not assess rendering.

Crop reset, replacement, resize and rotation are intentional edits requiring
separate fresh copies and expectations. They do not pass an unchanged-image
positioning check. A failed check means this bounded contract was not met; an
unsupported representation alone is not a general claim of lost user content.

The tool always reports `wordAcceptance: UNVERIFIED`, `wordUiActionsProven: false`
and `renderingChecked: false`. It does not infer the saving application from
metadata, invoke Word, prove native object identity or grant production approval.
Markup-compatibility selection inherits the existing reader's declared
capabilities, not a complete Word interpreter.

### Tests actually run

**22 adversarial tests passed** using the pinned synthetic control. Cases include
floating ownership, changed native IDs, scope rewrites, missing/duplicate owners,
movement to the cover section, copied/unowned pictures, hidden pictures,
nonselected MC fallback copies, wrong/missing/external image relationships,
replacement while the original remains elsewhere, crop reset, frame/shape/paint
changes, neighbouring field changes and tracked revisions.

CLI tests also passed: a clearly labelled synthetic identity copy returns the
bounded preservation status with exit 0; the actual Writer Save1 returns FAIL
with exit 1. Neither is labelled a Word test. All four new Python scripts compile.
The full Bun suite, full TypeScript check and Prettier remain unavailable in this
runtime and were not claimed or dispatched through CI.

## Actual paired Writer saves: negative result

Engine: `LibreOfficeDev 26.8.0.0.alpha0`, build
`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Both complete dossiers were imported
and saved as DOCX, then the resulting DOCX was independently imported and saved
again, using isolated profiles and new output directories.

| Initial owner | Save | Matching field occurrences | Saved canonical tags | Original pixels inside owner / package |
| --- | --- | --- | --- | --- |
| Typed picture | 1 | 49 / 145 | 39 / 134 | No / No |
| Typed picture | 2 | 49 / 145 | 39 / 134 | No / No |
| Inline rich text | 1 | 49 / 145 | 39 / 134 | No / No |
| Inline rich text | 2 | 49 / 145 | 39 / 134 | No / No |

These are control-preservation counts, not a claim that 96 visible text values
disappeared. The saved photo becomes a drawing-shape fill with a 1920 × 2400
image. Its decoded pixels exactly match the source image after physically
removing 240 pixels at both top and bottom (RGBA hash
`5eb06e4b7b894906d2500713f23c27682875fc39bf6183691b1e088a0b947178`). The original
reserve is absent, and the old numerical picture-crop representation is lost.

The rich Save1 was rendered: still four pages, but page 3 differs visibly in the
photo/sidebar region. Pages 1, 2 and 4 are pixel-identical to the initial combined
candidate in this renderer. These saved Writer files are internal negative
evidence and are **not** the source files in the review packet.

The actual earlier user Word return retained the original under the typed owner.
Do not transfer this Writer failure into an unsupported claim about Word. Equally,
do not call a successful initial render proof of save/reopen preservation.

## Reference wrap: bounded counterfactuals

The new `scripts/docx-next-reference-wrap-probe-25okt.py` produces independent
variants of the exact four-page control. No variant is a proposed product fix.
The inner reference table remains 6746 twips wide; width variants conserve the
total by changing both equal text tracks and the middle gap.

| Diagnostic | Role lines in bundled Writer |
| --- | --- |
| Original 3220 / 306 / 3220 grid | 2 |
| 3222 / 302 / 3222 grid: +0.1 pt per text track | 2 |
| 3224 / 298 / 3224 grid: +0.2 pt per text track | 1 |
| 3226, 3230 and 3240 twip text tracks | 1 in each case |
| Remove only the role SDT (ownership deliberately lost) | 2 |
| Move only the role SDT from block to inline scope | 2 |
| Explicit zero margins on all three reference cells | 2 |
| Native size 20 half-points instead of 21 | 1 |
| Native size representation `10.476pt` | 2; PDF still reports 10.5 pt |

All eleven variants rendered as four-page dossiers. The width observations bound
the transition between the tested +0.1 and +0.2 pt cases; they do not establish an
exact minimum or an equivalent Word result. The SDT and margin counterfactuals
exclude those particular changes as solutions in this bounded renderer.

The captured App role is 10.476 pt and native serialization emits 10.5 pt. Summing
unshaped horizontal advances from the actual earlier Word PDF's embedded Arial
font gives 160.7104 pt at the captured size and 161.0786 pt at the rounded size,
against a 161 pt track. This is a font-metric indicator, not full shaping or
proof that size quantisation is the sole cause. The bundled renderer's painted
glyph bounds and its line-break decision also differ near this boundary.

**No width compensation, font shrinking, character compression, no-wrap setting
or text-specific rule was shipped. Reference wrap remains OPEN.** A general
source/native font and line-break contract still needs a justified decision.

## Reproduction and next decision

Keep all DOCX/PDF/image inputs and generated outputs outside Git.

```sh
python scripts/docx-next-letter-flow-control-assets.py CONTROL.docx ASSETS
bun scripts/docx-next-letter-source-flow-probe.ts ASSETS REPLAY
python scripts/docx-next-sidebar-review-candidate-25okt.py \
  CONTROL.docx REPLAY/Letter-Candidate.docx APP-REFERENCE.pdf NEW-PACKET
python scripts/docx-next-photo-rich-owner-return-test.py CONTROL.docx -v
python scripts/docx-next-photo-rich-owner-return.py \
  NEW-PACKET/02-Brief-Kontrollkandidat.docx \
  NEW-PACKET/01-Kombinierter-Kandidat.docx WORD-SAVED.docx NEW-REPORT.json
python scripts/docx-next-reference-wrap-probe-25okt.py create CONTROL.docx NEW-PROBES
# Render each probe to NEW-PROBES/CASE/CASE.pdf before summarizing:
python scripts/docx-next-reference-wrap-probe-25okt.py summarize NEW-PROBES
```

For the actual replay in this runtime, Node 24.22.1 native TypeScript loading was
used with the existing local import-resolution helper; Bun itself was unavailable.
The new saved-photo tests use Python/lxml/Pillow, with no Bun adapter.

The packet includes the combined candidate, the matching Letter-only control,
the existing App PDF, an initial internal Writer PDF and explicit instructions.
Its saved name is `CV-Word-Pruefkandidat-25okt.zip` (2,030,195 bytes), SHA-256
`430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509`.
Review file 01 in desktop Word when possible: first untouched save/reopen, then a
fresh copy for choosing wrapping and dragging, then separate crop/reset and
replacement copies. Preserve actual saved files so containment and original
pixels can be checked. If wrapping remains disabled, the rich-owner hypothesis
is not confirmed and must not enter the normal exporter.

Summary evidence is in [the JSON report](docx-next-sidebar-review-candidate-25okt-evidence.json).
Only diagnostic scripts and documentation changed in this round. No TypeScript
product code, renderer guard, old acceptance reader, merge, deployment, CI
dispatch or dev/main/render branch changed. Unrelated audit/automation work was
not touched. No further worker is scheduled by this handoff.
