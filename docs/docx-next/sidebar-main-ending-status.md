# Sidebar opening ending scope — ruled-out hypothesis

Starting remote `dev`: **`7804a79ea7f960b7bcc246f010733305fab5c2e7`**, freshly fetched and matched to a clean checkout. This follows the [populated outer-row counterexamples](sidebar-populated-row-status.md). Registry remains **29/39 configured candidates, 0/39 Word accepted**.

## Finding

Attaching only the main cell's required empty ending does **not** fix the left Sidebar. Four matched controls compare all three opening endings attached against only the main ending attached, at the same authored 220 mm boundary with two complete multi-page native tracks. Both variants produce identical visible results, including exact text hashes, metadata geometry and opening pages, before and after save/reopen.

| Sidebar side | Opening ending scope | Dossier pages | Main opening CV pages | Both complete PDF tracks | Body/lane bounds | Product gates                  |
| ------------ | -------------------- | ------------- | --------------------- | ------------------------ | ---------------- | ------------------------------ |
| Left         | All cells            | 21            | 1, 1, 1, 1, 2         | pass                     | pass             | **fail: detached description** |
| Left         | Main only            | 21            | 1, 1, 1, 1, 2         | pass                     | pass             | **fail: detached description** |
| Right        | All cells            | 21            | 2, 2, 2, 2, 2         | pass                     | pass             | pass within this case          |
| Right        | Main only            | 21            | 2, 2, 2, 2, 2         | pass                     | pass             | pass within this case          |

Tuples are heading/date/title/place/description opening. Side openings stay on CV page 1. **Four controls / 84 pages** retain all ten complete fields in source and saved DOCX. The all-cell source packages and render/save-reopen observations exactly match the previous selective controls. Main-only packages differ only in the opening row's gutter and spanning-side continuation ending flags; all semantic paragraphs, IDs, properties, rows, spans and physical lanes remain unchanged. The candidate changes `[true,true,true]` to `[false,false,true]` for left and `[true,false,false]` for right. Lead and tail endings remain explicitly detached. The mirrored PNGs were inspected.

This rules out opening-ending **scope alone** as the cause under these conditions. It does not identify an engine defect or establish Microsoft Word behavior. The left populated opening remains a real product limitation. The existing guarded `cellEndKeepNext` primitive was sufficient to test the hypothesis; no renderer or composition change is justified by this negative result. The original right-grid text loss remains the prior separate counterexample. No template-specific behavior was added.

## Retained evidence and checks

- [Machine evidence](sidebar-main-ending-evidence.json), four declarative fixtures, immutable JSON/package probe and shared strict PDF/package QA matrix.
- The stable workflow adds these four controls to the previous 58. It compares exact source hashes, complete visible text, bounds, opening pages, metadata geometry and save/reopen against the recorded local observations. Positive right controls must continue to pass. The expected left failures remain explicit; green evidence reproduction does not mean product acceptance. Exact-commit stable and application CI results are reported after publication.
- All **31 existing supported Sidebar fixtures / 253 pages** pass fresh package/render/save-reopen QA and remain byte-identical to the starting checkpoint. All 31 immutable model roundtrips, the mirrored-picture rejection and two actual portable project/photo storage restorations pass.
- Seven flow QA tests, seven previous stable-comparison tests and eight populated/scope evidence tests pass. Two additional Bun tests protect scope-only changes, original package identity, immutable JSON and the normal export guard. Locked units, TypeScript, lint/build and eight browser/PDF/dossier groups run in publication CI.

Local engine: LibreOfficeDev 26.8.0.0.alpha0, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Stable verification uses the existing pinned LibreOffice 25.8.7.3 CI runtime. Normal export remains guarded; Microsoft Word is pending. No deployment, promotion, production switchover, Legacy deletion or template migration.

## Reproduce

```sh
bun scripts/docx-next-main-ending-probe.ts /tmp/docx-next-main-ending
python scripts/docx-next-populated-row-qa.py /tmp/docx-next-main-ending --matrix main-ending --soffice /path/to/soffice
python scripts/docx-next-populated-row-qa.py /tmp/docx-next-main-ending --matrix main-ending --libreofficekit /path/to/lo-kit --require-stable --baseline docs/docx-next/sidebar-main-ending-evidence.json
python scripts/docx-next-populated-row-test.py
bun run test:docx-next
```

## Exact next task

Isolate **opening-row `keepTogether` / native `cantSplit`** with the same populated sources, both orientations and 220 mm boundary. Hold main-only ending attachment constant; compare only the short opening row's `keepTogether=true` versus `false`. Preserve the native semantic keep-next chain, all paragraphs, row/span ownership, lead/tail flags and physical lanes. Require full text, visible bounds, opening attachment and save/reopen on both engines; stop if the positive right case regresses or text is lost. This tests one remaining row-context hypothesis using an existing generic primitive. Do not expand boundaries/photos or enable export until a positive matched result exists.
