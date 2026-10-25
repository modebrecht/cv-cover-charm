# Floating photo flow counterfactual

Date: 25 October 2026. Branch: `fix/docx-next-shared-integration-22okt`.
Starting head: `3aa3f5c54971e3aade6b2b90d216ff8401653ebf`.

## Decision

The tested natural-floating composition is **HELD**. Both owner scopes preserve
the complete original image, crop and canonical fields initially, but both fail
initial layout invariance. Neither improves original-image preservation after
one actual bundled Writer save. The inline scope additionally loses the active
picture from its canonical owner during that save.

This is an internal negative experiment. It does not replace the existing
[combined Word review packet](docx-next-sidebar-review-candidate-25okt.md), change
the normal exporter or establish any Word UI behavior. No compensated offsets,
reserved placeholder objects or fixed paragraph-height patches were introduced.

## Exact bounded experiment

Input: the complete four-page synthetic combined candidate, SHA-256
`ad5fed158088ad5506c1bb483f441212bd58be57a35b7092c2ba299a57978968`.
This is the already-verified source with the Letter candidate and inline rich
photo owner, not a fresh browser export or the user's returned Word document.

Two independent copies retain the picture's original `a:graphic`, SDT tag/alias/
ID, crop, 28 × 35 mm extent, round-rectangle geometry and paragraph properties.
They replace `wp:inline` with `wp:anchor`, using column-relative X=0,
paragraph-relative Y=0, zero wrapping clearances, `layoutInCell=1`, `locked=0`
and `wp:wrapTopAndBottom`. One keeps the rich control inside the paragraph; the
other promotes the same paragraph into a block rich control.

Microsoft documents [anchor](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.anchor?view=openxml-3.0.1)
as floating DrawingML, contrasting its positioning with inline line-height
participation. [Top/bottom wrapping](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.wraptopbottom?view=openxml-3.0.1)
excludes text from both sides of the object. These definitions motivate this
counterfactual; they do not guarantee Word picture commands or source fidelity.

The probe changes anchoring, wrapping and clearance semantics together. It tests
this specified composition, not every floating option, and does not isolate a
single underlying cause of the line-box differences. A different future flow
contract needs its own justified initial-layout and saved-owner checks.

## Initial source and rendering results

The existing unchanged rich-owner checker reports initial preservation for both
variants: all 145 field occurrences, original image bytes and decoded pixels,
numerical crop, frame and canonical photo role in `section:3/body`. Only
`word/document.xml` changes. An exact expected-transform comparison and inverse
restore all canonical source markup. Every other package part remains
byte-identical. No acceptance reader or production guard was relaxed.

The diagnostic CLI reproduced both originally rendered probe DOCX files
byte-for-byte. Each full dossier was rendered through the documents renderer.
Both changed CV pages were inspected; unchanged pages match the previously
reviewed complete source exactly.

| Result | Inline rich owner | Block rich owner |
| --- | --- | --- |
| Probe SHA-256 | `856ca25a6c96e1dc0393257e3c20e913293d8e56c71a51d17e5e51c976f19c38` | `bac9db4dbbfd7d4b7531c5533b872cbfcb3a106eb3c09e9bb04ff76d8bfc07c6` |
| Initial image/crop/field preservation | Pass within existing bounded XML checks | Pass within existing bounded XML checks |
| Dossier page count | 4 | 4 |
| Pages 1, 2 and 4 | Pixel-identical to source | Pixel-identical to source |
| Photo Y change | −4.9500 pt, approximately −1.7463 mm | Same |
| Nineteen Sidebar body text lines | +4.9500 pt, approximately +1.7463 mm | Same |
| Initial layout invariance | Fail | Fail |

The native photo raster's PDF top changes from 152.3008 to 147.3508 pt; its
width/height remain unchanged. The CONTACT text-line top changes from 261.8983
to 266.8483 pt. Their separation therefore increases by approximately 9.90 pt
(3.49 mm), rather than the whole Sidebar merely translating together. The three
page-header text lines do not shift. The page-3 pixel difference is bounded to
`(53, 350, 374, 1300)` at 1414 × 2000 pixels, within the photo/Sidebar region.

These measurements belong to this renderer and source. They are not Word
coordinates, a minimal required offset or permission to insert compensations.
The previous block-rich **inline-picture** trial's 2.25 pt text drift is a
different experiment; do not confuse it with these floating results.

## One actual Writer save per variant

Engine: `LibreOfficeDev 26.8.0.0.alpha0`, build
`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Each initial probe was imported and
saved once to a new DOCX using an isolated profile. The question was whether the
new native anchor improved saved image/owner preservation; no second save was
needed after these failures.

| Save result | Inline rich owner | Block rich owner |
| --- | --- | --- |
| Matching field occurrences | 49 / 145 | 49 / 145 |
| Saved canonical tags | 39 / 134 | 39 / 134 |
| Canonical photo control still matched | Yes | Yes |
| Active pictures inside that photo control | **0** | 1 |
| Original pixels inside owner | No | No |
| Original pixels found by package image reader | No | No |
| Saved 1920 × 2400 cropped image | Active but outside any tagged owner | Inside `cv.person.photo` |

Both saved pictures become drawing-shape fills. The decoded crop has RGBA hash
`5eb06e4b7b894906d2500713f23c27682875fc39bf6183691b1e088a0b947178`, the same
physical 240-pixel top/bottom crop established in the preceding paired saves.
The original was 1920 × 2880. The inline variant demonstrates why a surviving
canonical tag alone cannot prove picture ownership: its control still matches,
but the active image no longer descends from it. The block variant preserves
that containment but still fails the original-image contract.

These are actual Writer saves, **not Word returns**. Control counts do not mean
the corresponding visible text values disappeared. The saved files were
inspected structurally; no saved-file visual acceptance is claimed. Existing
real Word evidence under the earlier typed owner remains a separate result.

## Reproduction and checks

Two new scripts provide a pinned-source CLI and ten adversarial tests. The tests
reject altered positions, crop, paragraph spacing, neighbouring text, other
package parts, missing/duplicate owners, typed/locked/bound or foreign owner
properties, unrelated paragraph runs, repeated conversion and an existing output
directory. Both supported scopes must restore the canonical source and retain
the active original picture initially. **10 tests passed**, and both scripts
compile. Full repository Bun/TypeScript checks and full schema validation were
not performed; no product TypeScript changed.

```sh
python scripts/docx-next-photo-floating-probe-25okt.py COMBINED.docx NEW-PROBES
python scripts/docx-next-photo-floating-probe-test-25okt.py COMBINED.docx -v
```

`COMBINED.docx` must have the exact pinned hash above. Keep all generated DOCX,
PDF, PNG and native-save files outside Git. Summary measurements and saved-file
hashes are in [the evidence JSON](docx-next-photo-floating-flow-25okt-evidence.json).

Next remains actual desktop Word review of the existing combined inline-rich
packet: untouched save/reopen, then separate wrapping/dragging and crop/replacement
copies. If Word permits movement, inspect whether its saved anchor remains inside
the canonical control. If the commands remain disabled, choose a new explicit
owner/flow contract using that evidence. No normal export switch, new user test
packet, merge, deployment, CI dispatch or dev/main/render change occurred.
