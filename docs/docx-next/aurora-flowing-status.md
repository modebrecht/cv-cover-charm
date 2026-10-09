# Aurora flowing hero — 2026-10-09

This dedicated branch implements the user's **“Recommended path”** approval: a finite gradient banner followed by a **solid native hero surface that grows with editable text**. It changes Aurora's visual design explicitly. It does not claim a flowing native gradient or identical geometry to the app's fixed 128-mm hero.

Branch: `docx-next/aurora-flowing-hero-20261009`. Starting parent: `be5b2fca28ca5ffed7a54793bb99e2ce1d626597` on the published 38-template graphics branch. Underlying freshly fetched development base for that graphics branch: `d6f044aec1e15e911b3d74009ef2ce8734100a8e`. Current remote development was re-fetched as `f93d54e37301d0ef1035fc6bd5177196effe0353` before work. It is a concurrent architecture track, not this branch's base. No merge, rebase, protected-branch update or deployment is included.

## Design and scope

The 32-mm gradient banner carries the native application/date fields. The existing split cover row places the editable profession and photo on the primary palette's solid fill. Existing nested padded native cells and `keepTogether: false` provide natural growth and continuation. The name follows the row with an 8-mm semantic lead instead of compensating for a fixed page background. Text is never rasterized or placed in a textbox; photos keep their existing native frames and crop settings.

The accent stripe formerly fixed at x=20/y=150 crossed contact text after the growing hero moved it. Its default is suppressed through the existing declarative visibility mechanism and a 12-mm gradient stripe is placed wholly in the left gutter (x=4..16/y=150). Explicit saved visibility still has precedence. The bottom gradient rail, interior page motifs, letter/CV palettes, chrome and shared CV compositions remain declarative.

Only the descriptor, registry, template fixtures/tests and bounded QA/evidence documentation change. No shared renderer, model builder, pagination, Sidebar/native identity, picture/crop, package repair, production routing, Legacy/V2, PDF or portable JSON architecture changes. No template-ID branch is added to those layers.

## Preliminary representation evidence

The preserved [native growing-surface probe](aurora-growing-surface-probe-evidence.json) is historical diagnostic evidence produced before this implementation. DrawingML auto-height retains two and ten lines, but loses visible lines 23–36 at page length. VML loses text after Save/Reopen and can overlap subsequent content. These rejected textbox cases remain recorded as failures. The existing package policy continues to exclude their semantic textbox representation.

The **solid table** cases retain all two, ten and 36 title fields before/after save, with the 36-line case flowing across three pages. All source cases use the same 20-mm initial geometry; this evidence does not estimate height from text. [Design comparison](aurora-flowing-previews/design-comparison.png) illustrates the approved compromise using technique probes, not complete Aurora exports. The application implementation below is checked separately with real dossiers.

## Reproduce the candidate

```sh
python scripts/docx-next-fixture-images.py "$QA_ROOT/images.json"
bun scripts/docx-next-fixtures.ts "$QA_ROOT" --aurora --verify-json
python scripts/docx-next-render-qa.py "$QA_ROOT" --libreofficekit "$LO_KIT" --require-stable --roundtrip
python scripts/docx-next-aurora-visual-qa.py "$QA_ROOT"
python scripts/docx-next-native-identity-qa.py "$QA_ROOT"
DOCX_NEXT_EDITOR_TEMPLATE=aurora bun scripts/docx-next-candidate-editor-qa.ts "$EDITOR_ROOT" "$QA_ROOT/images.json"
```

Use the pinned stable LibreOfficeKit 25.8.7.3/full font runtime and an intact canonical Chromium via `DOCX_NEXT_CHROMIUM_PATH`. The old browser executable in this recovered workspace was truncated and has been replaced for this run. Temporary superseded renders are excluded from the final evidence.

## Acceptance boundaries

Configured candidate coverage is separate from Microsoft Word acceptance and production release. The original fixed-hero negative proposal remains archived; it is superseded solely by the user's explicit visual adaptation. Saved table-caption loss and the parallel Sidebar/crop/Word blockers remain open. Microsoft Word acceptance stays at **0/39**. No export gate is relaxed.

## Final measured application evidence

**39/39 active templates are now configured on this dedicated branch. 0/39 are Microsoft Word accepted.** These changes are not merged into `dev`.

[Complete evidence](aurora-flowing-evidence.json): **18 independently generated Aurora dossiers / 123 source and 123 saved pages** pass stable LibreOffice 25.8.7.3 native render, Save/Reopen, structural package/XML/relationships, complete semantic text, layout/chrome/image bounds and independent page paint checks. Cases include normal cover/letter/CV, long letter/CV/values/name/contact, the five-line original negative title and a new 36-line profession, photo/images, custom native text/tables, chrome variations, Classic/Timeline/Magazin, background visibility and custom colors. Sidebar gates are not expanded.

The five-line profession produces ten native wrapped lines while remaining within a naturally growing first-page hero. The 36-line profession wraps across **five cover pages**, retains every title line in source and saved PDFs, then continues to the name/contact fields. No estimated text height, fixed row height or textbox is used. The template's original 32-pt profession style remains unchanged.

**36 source/saved visual checks** verify visible backing for every white cover span, every stress-title label and the gutter stripe without text intersection. The stripe uses the analytic midpoint of its authored gradient and a symmetric interior sampling patch to average PDF image resampling/chroma artifacts; tolerance remains four RGB levels. The `--contrast-only` negative replay rejects the archived fixed hero specifically at `Berufszeile 4` on white paper.

**1,923/1,923 tagged native fields** and all complete native text survive Save/Reopen. All 18 saves still lose table captions; the architecture/Word acceptance boundary stays blocked. This is recorded as a failure, not repaired or excluded.

All **18 immutable portable input/model JSON restorations** regenerate identical native packages. Six real browser image normalizations pass. The final actual editor passes rename/reload, portable JSON restoration, explicit native snapshot/export and combined production PDF download. One preceding concurrent editor attempt timed out while persisting its edited name; the complete isolated retry passes, and no app persistence code was changed.

**Regression against published `be5b2fca`:** every preceding descriptor (38), stress model (190) and normal DOCX package with real raster assets (38) is unchanged/byte-identical. **1,059 isolated unit tests across 226 files**, final targeted checks, TypeScript, changed-file lint/format and production build pass. No branch CI success is claimed; development/release workflow filters are not expanded.

[Normal source preview](aurora-flowing-previews/normal-source.png), [saved photo](aurora-flowing-previews/photo-saved.png), [saved five-line title](aurora-flowing-previews/title-long-saved.png), [saved title continuation](aurora-flowing-previews/title-continuation-saved.png).

Next: cherry-pick the bounded configuration/QA commit and evidence commit onto freshly fetched `dev`, coordinating registry/docs changes with its owner. Complete the independent architecture and Microsoft Word acceptance gates separately. Do not count this template candidate run as production release.

Published configuration/QA commit: `3c9238e82646582d5bac21515bc327519ce66e02`. Remote development re-fetched before publication: `7880d54ba04d5f9756dd79bdb5642d5a1efb372e`; only this dedicated branch is pushed.

The GitHub connector creates its own commit IDs because the local Git client has no write credential. The published configuration tree matches the tested local commit `4b2ece8f9e842802be887e713d2d92ce7d9fd6fe` exactly. Its parent remains the published 38-template branch tip. No published history is rewritten.
