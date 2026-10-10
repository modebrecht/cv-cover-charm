# Keep the real body boundary with its table — 2026-10-10

**The extra empty first CV page is removed in all six guarded compositions.** Complete native IDs, paragraph text/order and visible reading order survive source and two Save/Reopen cycles. No semantic paragraph is changed, shortened, combined or manually paginated.

## Correction

The real 20-twip body paragraph introduced to avoid lost canonical ownership remains. The new optional table property `bodyBoundaryKeepNext: true` emits `w:keepNext` on that nonsemantic paragraph only, keeping it with its following body table. The old paragraph's spacing and height stay exact. This fixes the empty-page outcome while preserving the boundary; deleting that paragraph had previously lost Kontakt's canonical tag on saved2.

The property is valid only with the declared top-level, non-floating `bodyBoundary: "paragraph"`. Malformed values or clearing its required boundary fail validation. The existing independent diagnostic export gate remains active even if model issues are cleared. Default rendering is byte unchanged: all six preceding source packages reproduce the independently verified checkpoint exactly. No template or application export route is changed.

## Local verification

All eighteen source/saved/saved2 phases pass complete serialized and native canonical identity/text, native paragraph order and whole visible main/side sequences. Both long orientations retain all 382 controls and schools 1–65. Side-long has 129, short 77. Short dossiers retain three pages; side-long now has nine, both-long eleven. There are zero empty CV pages in every phase. All CV words remain within the declared physical tracks and printable vertical extent (0.75 mm boundary tolerance for glyph boxes).

Rendered first, continuation and last CV pages were visually checked on both orientations. The side and main tracks continue correctly. This is bounded text/layout evidence for the six fixture cases, not full acceptance of every template, photograph, decoration or Chrome combination. Those remain unexecuted on this new composition. Production and Word acceptance remain blocked.

Full release checks pass: 1,077 unit tests, release formatting, TypeScript, lint and build; existing lint warnings remain. The new unit tests establish that only the real boundary paragraph's keepNext property changes, the semantic paragraph policies and other package parts stay exact, portable JSON reproduces the same package, malformed attachment fails and export gates remain closed. Every prior JSON evidence file is unchanged.

The isolated `entry-flow-content` CI job now executes both the previous complete content matrix and this separate corrected matrix. The latter must pass explicit no-empty-page and text-bound checks as well as all content roundtrips. Actual diagnostics are retained before rejection; historical sampling jobs and baselines remain unchanged. Independent corrected CI execution is pending.

[Evidence](sidebar-entry-boundary-evidence.json) retains all eighteen local phase results. Next: independently verify the corrected CI artifact, then wire the body composition into the generic diagnostic application path and exercise photographs, long descriptions and template Chrome before production acceptance.
