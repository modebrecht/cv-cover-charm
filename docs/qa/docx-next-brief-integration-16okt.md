# Package 37C Brief cover application integration

**Engineering gate PASS for the bounded Brief integration; overall PARTIAL pending desktop Word editing and Save/Reopen.** Seven genuine app downloads pass the controlled matrix, eight rejection paths pass, seven visible Web covers remain pixel-identical to dev, seven default DOCX Next packages remain byte-identical to dev, and 21 adjacent Letter/CV pages remain pixel-identical. The ordinary export is unchanged. No other template is enabled.

Base remote dev: `8901a830a792d75e9e792345c5180827218b4e1e`. Fetched reference: `acb6a115c749982b5408f5a099d2464f1ebd8eb1` on `investigate/docx-next-cover-fidelity-15okt`. New branch: `fix/docx-next-brief-integration-16okt`. Root `AGENTS.md`, ancestry, actual app export, snapshot adapter, renderer, measurement code and previous QA reports were reviewed. The source worktree started clean from remote dev. The publication commit is the descendant containing this report; its exact SHA is recorded in the final handoff.

## What is integrated and how to activate it

On this branch run the application locally, open **`/?docx-next-brief-qa=1`**, load a saved dossier, open **Gesamtdossier herunterladen**, and click the separate **Brief DOCX Next testen** button. All three dossier parts must use Brief and the CV must use its Standard layout. The usual PDF/JSON/DOCX choices, their selection, and ordinary DOCX handler are unchanged. Without the exact query value `1`, the new button is absent and its entry point also rejects direct calls. No production promotion or export-default switch is included.

The real path is:

**App project file input → existing saved browser state → existing snapshot capture → browser font check and fresh existing cover metrics → canonical builder with authored frames → single native renderer → browser download.**

The app-level module `src/lib/brief-docx-next-export.ts` owns ambient reads and asynchronous orchestration. It captures the normalized saved documents and existing settings once, then compares a fresh capture before building and again after native rendering. Text, styles, coordinates, images and settings changing during the operation produce a visible error and no download. The builder and renderer remain detached from browser stores, font APIs and DOM rectangles.

The UI lazy-loads the new module only on the explicit button click. It shares the existing busy state and displays failures inside the open export dialog. There is no automatic retry through the old exporter. Decoration-generation failures are fatal in this path instead of silently dropping artwork.

The existing prototype's **16 required source/test files** were copied as exact blobs from the fetched reference. Historical generated packets, previous failed experiments and unrelated work were not transplanted. The canonical optional minimum leading, existing native paragraph frames, shared presentation/anchors and `captureCoverTextMetrics()` are reused. The generic renderer is unchanged; the existing broad diagnostic opt-in is confined to this app path after checks reject unrelated model issues, floating stories, special first-footer identities, body frames, parallel flow and diagnostic attachment/carrier properties. Frozen Sidebar and Item 25 mechanisms are not activated.

## Font and measurement policy

This is an intentionally narrow **Sans** integration. Supported effective weights are 400, 600 and 700, with 600 mapping to the existing native bold representation. Italics, other font keys, unsupported scripts and mixed per-run weight states are rejected. Westeuropean application text, normal/bold, explicit color, alignment, tracking, leading, authored coordinates and visibility remain supported within the tested composition.

The closed browser profile accepts local **Arial** or **Liberation Sans**, paired with the native request for Arial already exercised by the prototype. It loads explicit local regular/bold face names as an availability check and compares the actual Web font stack against the explicit installed family. Width, ink extents and font bounds must agree for a probe and actual visible text at the relevant weight mappings. Unknown fallback families are rejected. Initials receive the same text/font check even when the full name is hidden. The temporary availability faces are removed afterwards.

This is a browser realization/metric check, **not font-file attestation in another application**. `document.fonts.check()` alone would not establish actual glyph coverage or target font identity; see the [FontFaceSet documentation](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/check). A `local()` face registered under a test alias can also expose different browser metrics from the system-family path; the comparison therefore uses system-family realization on both sides, with no arbitrary tolerance enlargement.

The QA environment installs the existing supplementary renderer's Liberation Sans files into Chromium's fontconfig search path. No application CSS stack or saved font key is changed for a positive test. DevTools confirms actual **Liberation Sans / LiberationSans-Bold**, using system fonts rather than injected fake Arial faces. File hashes, profile, native family and limitations are in [font-profile.json](docx-next-brief-integration-16okt/font-profile.json).

Word still controls its own Arial realization, kerning and later wrapping. The source key and descriptive profile are not proof of installed Word font identity. Other versions/platforms and arbitrary substitutions require their own acceptance. In particular, a Mac/browser choosing a different Helvetica realization may be rejected; it is not silently treated as Arial. Browser support currently has evidence for Chromium 143 only.

Metrics are freshly captured per export and are never restored from project JSON or accepted from a caller. The pure builder rejects stale/missing/invalid packets, and the imported 37B guard rejects typography overrides outside the measured authored blocks. An eight-second deadline handles unavailable font loading. Before rendering, the app checks that native half-point size/tracking quantization does not change captured wrapping and rejects unbreakable words exceeding their field width. Existing authored composition rejects bounds, collision, line-budget and unsupported paint/list states. No extra fitting algorithm, spacer chain, silent clipping or native font shrinking is introduced.

## Saved-project equivalence and the discovered prefill boundary

An additional source-equality assertion found that visiting the cover editor after exporting an old/minimal fixture changes its data: the existing editor `prefill()` replaces an empty kicker and fills missing attachment visibility/defaults. That later Web state cannot legitimately be labelled the original export's source. This was a QA equivalence failure, not evidence of incorrect native placement.

The final real-project fixtures explicitly contain the editor's persisted prefill values and save version 9. Each is loaded through the actual **Dossier laden** file input and confirmation/reload sequence. The button export is then compared with an independent invocation of the same app entry point; bytes match. The three saved documents remain unchanged by export. After navigating to the visible editor, its normalized cover source must equal the export source exactly before the screenshot is captured. All seven final cases pass that assertion.

The normal app packet therefore includes the actual saved kicker and captured application chrome/settings. It is **not byte-identical to the earlier synthetic prototype packet**, and no exact equivalence to the user's original project is asserted. [normal-project.json](docx-next-brief-integration-16okt/normal-project.json), [normal-snapshot.json](docx-next-brief-integration-16okt/normal-snapshot.json) and [normal-metrics.json](docx-next-brief-integration-16okt/normal-metrics.json) preserve representative actual inputs. The QA fixtures use public demo applicant data, not the user's original Word files.

## Actual app and native rendering results

| Case | Result |
| --- | --- |
| Normal | PASS: actual file restore and button download, one title line, editable kicker/name/date/initials/contact/attachments; 11 cover frames. |
| 115% | PASS: fresh scaled capture, one title line and correct dependent placement; 11 cover frames. |
| Long title and name | PASS: two title lines and linked long-name placement, all text present; 11 cover frames. |
| Manually moved | PASS: saved date X105/Y28/W85 and explicit typography, hidden name; 10 cover frames. |
| Portrait photo | PASS: native picture, saved size/position, zoom 1.3 and crop X30/Y65; original decoded image pixels preserved. |
| Circular photo | PASS: circular native picture/frame and saved crop; original decoded image pixels preserved. |
| Hidden attachments/photo | PASS: disabled fields absent and remaining contents complete; 8 cover frames. |

For every case: four A4 dossier pages, all expected cover text on page 1, all extracted glyph bounds inside A4, three document sections and matching semantic cover-control identities. Normal/scaled/long packets have 82 total semantic controls; different authored optional content changes the count appropriately. Text, including initials, remains native and is not rasterized into artwork. No observed visible semantic overlap or clipping. Four normal dossier pages, all complete covers, and the long dossier's distinct neighbor pages were visually inspected. Other identical neighboring rasters share that inspection evidence.

All **21** adjacent candidate Letter/CV page rasters equal their same-source default native baselines. Canonical Letter/CV models also match. The long cover name changes existing automatic footer text through the existing chrome resolver; that same text occurs in its baseline, so it is not an integration regression. All **seven default native DOCX packages** are byte-identical when generated by the untouched dev checkout with the same captured input. All **seven visible editor cover rasters** are pixel-identical to dev with the same restored project and font environment.

The [seven-page A4 comparison](docx-next-brief-integration-16okt/brief-app-a4-comparison.pdf) uses actual visible Web covers and actual app-downloaded native packages from equal source data. Its native panels are supplementary LibreOffice renders, not Word screenshots. Fine glyph differences and the known supplementary thin-outline sampling artifact remain distinct from Word acceptance. Detailed physical frame geometry, image/crop data and completeness checks are in [validation.json](docx-next-brief-integration-16okt/validation.json); UI/source/DevTools evidence is in [app-export-evidence.json](docx-next-brief-integration-16okt/app-export-evidence.json).

Eight browser rejection checks PASS: unsupported authored font, deliberately substituted Web font, unavailable Canvas measurement, saved-data mutation before capture, mutation during native rasterization, an unbreakable overflowing email, non-Brief dossier parts, and missing opt-in. Every failure keeps the diagnostic visible and produces no downloaded candidate. [Exact diagnostics](docx-next-brief-integration-16okt/rejections.json). Imported unit tests additionally cover stale keys, missing/invalid/nonfinite packets, JSON restoration, input immutability and the ordinary renderer's guard.

## Tests and reproducibility

- Full unit suite: **1,185 PASS / 0 FAIL**, **22,890 assertions**, 247 files.
- Dedicated DOCX suite: **372 PASS / 0 FAIL**, **5,809 assertions**, 57 files; overlaps the full suite.
- TypeScript, production build and changed-file ESLint: PASS. Full ESLint: exit 0, 0 errors and 21 existing warnings outside changed files. `git diff --check`: PASS.
- Seven genuine UI restores/downloads, seven source-equality checks, seven DevTools font checks, eight negative browser paths and fourteen native baseline/candidate renders: PASS. No deployment command.
- React review: conditional lazy import, event-driven async work, shared busy state, accessible button description and visible alert; no new effect-driven export or hook-order dependency.

From this branch, install normal project dependencies and provide Bun, Chromium/Playwright and the existing DOCX rendering helper. The app runner owns its local Vite server; it does not use a synthetic component mount. Prepare an untouched detached dev checkout with dependencies for the default/Web comparisons:

```sh
git worktree add --detach /tmp/brief37c-dev 8901a830a792d75e9e792345c5180827218b4e1e
# Install dependencies in both worktrees as usual.
# Supply the runtime's Playwright module path and Chromium executable if needed.
DOCX_NEXT_DEV_CHECKOUT=/tmp/brief37c-dev \
  bun scripts/docx-next-brief-app37c.ts /tmp/brief37c-app
# Render baseline.docx AND candidate.docx in every case folder:
python /path/to/render_docx.py /tmp/brief37c-app/normal/candidate.docx \
  --output_dir /tmp/brief37c-app/normal/candidate --dpi 120 --emit_pdf
# Repeat for the other thirteen packages, then:
python scripts/docx-next-brief-qa37c.py /tmp/brief37c-app /tmp/brief37c-packet
bun test tests/unit
bun run test:docx-next
bun run typecheck
bun run lint
bun run build
```

The app runner uses `CODEX_PRIMARY_RUNTIME_NODE_MODULES` for Playwright and `CODEX_PRIMARY_RUNTIME_NODE` for Vite, with optional `DOCX_NEXT_CHROMIUM_PATH`. On Linux supply the intended installed font directory through fontconfig; the exact positive-test configuration is preserved in the font profile. An environment without a supported profile should reproduce the explicit font error, not be modified to fake an accepted font. No font binaries are added to the repository.

## Word acceptance and next action

The user reports that the **previous normal and long-title prototypes** look correct in desktop Word, without visible clipping or overlap. The prior 115% prototype also retains its bounded observed Word-save evidence. These observations justify integrating that architecture; they do not automatically accept the new app-generated packages, practical text/photo editing or original-project parity. The previous reports remain on the reference branch, including [37B](https://github.com/modebrecht/cv-cover-charm/blob/acb6a115c749982b5408f5a099d2464f1ebd8eb1/docs/qa/docx-next-cover-visual-finish-15okt.md) and [Word evidence](https://github.com/modebrecht/cv-cover-charm/blob/acb6a115c749982b5408f5a099d2464f1ebd8eb1/docs/qa/docx-next-cover-word-115pct-15okt.md).

**Desktop Word is unavailable here. New app-candidate editing and Save/Reopen acceptance: UNVERIFIED.** Start with [the normal app-generated DOCX](docx-next-brief-integration-16okt/brief-app-normal.docx): compare all cover fields with the reference, edit a native field, save a new copy, close Word, reopen, save another copy and export PDFs at both stages. Record Word/OS/font versions. Then apply that protocol to scaled/long and the applicable native photo/crop cases from the packet. Keep all originals. Text growth can still collide with other automatic-height frames after editing; this is an open Word acceptance gate, not a reason to clip silently.

Other layouts, fonts/scripts, unsupported authored paint/list states, arbitrary text growth and the other 38 templates remain outside acceptance. Real private projects with unresolved historical anonymous text-format identities may be rejected rather than lose formatting. The older editor's prefill behavior was not changed. No all-39 expansion is included or authorized by this implementation.

## Changed files and publication safeguards

The implementation adds the app-level export orchestrator, browser font check and exact opt-in helper; changes only the start route and export dialog to expose the separate button; ports the 16 prerequisite prototype source/test files; extends the dedicated test command; adds the saved-project fixture, integration tests and two reproducible QA scripts; and adds this report/packet. [changed-files.json](docx-next-brief-integration-16okt/changed-files.json) lists every published path; [candidate-sha256.json](docx-next-brief-integration-16okt/candidate-sha256.json) identifies all seven actual app downloads. [test-results.json](docx-next-brief-integration-16okt/test-results.json) records the executed checks.

`vercel.json` explicitly disables `fix/docx-next-brief-integration-16okt` and retains wildcard deployment disabling. The Vercel project and branch deployment list were checked; the list was empty. The project API omits full Git deployment configuration, so the repository disabling is inspected explicitly. No push workflow branch filter matches this branch. Publication is limited to this new branch, with dev/main/render/reference refs preserved. No PR, merge, deployment or workflow dispatch; no Legacy DOCX, PDF/Print or native engine changes. Native Sidebar, Agent A and Items 14/25/38 remain frozen. Post-publication SHA and deployment checks are provided in the final handoff.

**Verdict:** bounded application integration **PASS**; final Word editing/Save-Reopen **UNVERIFIED**; Package 37C and full Item 37 **PARTIAL**. Stop here. The next decision is based on the app-generated Word packet, not expansion to the other templates or production activation.
