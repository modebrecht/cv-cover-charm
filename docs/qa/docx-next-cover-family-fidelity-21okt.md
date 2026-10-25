# DOCX Next — Cover family fidelity investigation (21 October 2026)

Branch: `fix/docx-next-shared-fidelity-18okt`; prior checkpoint: `4b1102f6165b159e9e0834dc6f75a2113a3f91c7`. No merge, deployment, production-export switch or Native Sidebar/Agent A changes.

## Evidence and current blockers

Read `AGENTS.md`, the shared backlog, typography handoff, `docx-next-design-fidelity-16okt.md`, `cohort-audit.json` and current source and tests. The 16 October measurements are a saved-state Web/native baseline, **not** new app exports or desktop Word verification.

| Family | Saved Web badge | Old native badge | Additional known defects | Gate |
| --- | ---: | ---: | --- | --- |
| Verlauf | 57.76 mm | 166 mm | Gradient, hero/footer displacement, missing initials | CLOSED |
| Neon | 55.88 mm | 110 mm | Square badge, missing photo/initials, hidden separator, wrong hierarchy | CLOSED |
| Warm/Freundlich | 60.45 mm | 164 mm | Extra date surface, missing initials/photo, misaligned bottom zones | CLOSED |

The original native `composeCover()` uses descriptor flow rather than exact saved cover coordinates, so color-only repairs cannot restore parity. The authored frame composition has native editable text, measured inline-width pills, photo frames and separate artwork, but the supported-family flag currently includes only Brief and Modern. Keep that explicit family gate, the rejected Word grouped-pill candidate and other Word-only acceptance gates unchanged.

## One shared geometry correction

In Web `BlockLayer`, `resolveLayout()` / `resolveCoverAnchors()` determine the displayed y for every block, including a shape following / above another block or anchored to the bottom. The opt-in native `composeAuthoredCover()` already used that position for text and pictures but passed the raw authored y into `shapeElement()` for decorative shapes. This is a verified source-code mismatch.

The native shape now receives a temporary copy with **resolved y**, leaving the saved source untouched. Existing x, size, native gradient colors/stops, stroke, opacity and manual position are preserved. A new focused Bun test covers a gradient circle following a rectangle (expected y 29 mm vs raw y 180 mm), a cleared-anchor manual override (71 mm), source immutability and independent Letter/CV models. The existing three-family refusal test is not modified.

**This is a narrow prerequisite, not a three-family visual-fidelity fix.** Nothing enables Verlauf/Neon/Warm in the opt-in authored compositor. It cannot by itself resolve transparent text on complex gradients, full-bleed art, badge edit-growth, font fallback, shapes over multiple layers, or Word import behavior.

## Verification performed and withheld

- Existing GitHub branch head and referenced files fetched, baseline audit inspected, source/test changed in one Git commit with a parent SHA lease; remote file and diff checks after push should confirm write identity.
- Bun/unit/DOCX test execution, TypeScript, lint, build, Chromium, saved-project app exports, matching PDFs and Desktop Microsoft Word: **NOT RUN** from this GPT-6 Chat environment.
- Prior 1,257-unit/444-DOCX passing figures apply only to the previous typography checkpoint, not this change.

## One later, consolidated acceptance set (10 real app dossiers)

For the next available app runtime, use stored projects and the real application download path: Verlauf normal / 115% / photo / longer date (4); Neon normal / hidden separator / gradient with photo (3); Warm normal / initials with long name / contact and attachments (3). Include the literal **August 2028**. Each case needs saved input, Web capture, native editable DOCX, app PDF, source/model hash, shape and crop comparison, and independent Letter/CV checks. Do not invent exports.

Reuse the existing design37d audit/app runners, then execute focused and DOCX unit tests, typecheck and a same-state browser comparison. Fix measurable family-specific differences through shared primitives, with capability gating retained for unsupported gradients/alpha/fonts. Perform **one** consolidated desktop Word visual/edit/save/reopen return only after the engineering packet is ready; Word remains **UNVERIFIED**.
