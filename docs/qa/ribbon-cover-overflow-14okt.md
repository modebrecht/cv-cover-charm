# Ribbon cover — physical A4 overflow correction (14 October 2026)

## Baseline and root cause

The source branch was remote dev at commit 33fa153297bc48dcf691d5a4e0112df7432ed1cb. AGENTS.md was read. Work stays on fix/ribbon-cover-overflow-14okt; no merge or deliberate deployment. GitHub connector operations edit that isolated remote branch; there is no locally cloned working tree, so local cleanliness is not asserted.

Existing real-browser evidence is recorded in docs/qa/pdf-preflight-13okt.md (around lines 265–267) and docs/qa/pdf-preflight-13okt-evidence/semantic-source-safety.json. The Ribbon date text measured x=-143.625px, y=1134.846px and the applicant initials x=-66.482px, y=-46.511px, on a 794×1123px A4 page. The existing policy correctly blocked the combined export.

Root cause: the earlier Cover-specific Ribbon styling in src/components/cover/next-signature-templates.css still applied non-editor-owned CSS transforms and forced widths **after** the newer declarative editable Ribbon geometry was introduced in src/components/cover/forest-flow-cover-defaults.ts. Specifically, the legacy selectors translated the photo (-57mm,-60mm), the date (-45mm,+26mm), the name (+49mm,-99mm), the job/start date (+49mm,-95mm), and contact/recipient groups (+48mm/+22mm). An old width:68mm!important applied to the date, along with pinned widths for other texts.

## Fix

- Removed only the obsolete Ribbon COVER selectors (including transforms and pinned widths) from next-signature-templates.css. The Ribbon decorative structure and all Ribbon CV selectors were preserved; other templates unchanged.
- Kept the existing cover photo frame and crop owned by the editor defaults, with inner frame overflow clipping unchanged.
- Linked the Ribbon name/kicker/job/start-date hierarchy using existing editable follows/gap fields so growing lines flow rather than overlap.
- Anchored Ort/Datum to a 285mm lower edge using the existing anchorBottom model. Length increases upward instead of printing beyond the bottom. Explicit old and new manual Y edits stay authoritative.
- No PDF preflight changes, no export override, no native print changes, and no DOCX changes.

## Test plan and source files

Changes:
- src/components/cover/next-signature-templates.css
- src/components/cover/forest-flow-cover-defaults.ts
- tests/unit/ribbon-cover-redesign.test.ts
- tests/e2e/ribbon-cover-overflow.spec.ts
- tests/qa/playwright.ribbon-cover.config.ts
- .github/workflows/ribbon-cover-overflow.yml
- docs/qa/ribbon-cover-overflow-14okt.md

The existing unit test now checks for absence of the obsolete Ribbon cover transforms and presence of the declarative anchors.

The scoped Playwright suite uses the real editor and combined PDF pipeline with a known-good Brief CV/letter. Five positive fixture variants test no image/initials, normal photo, larger cropped photo, long name/custom serif text, and extended date/location with customized CV/Letter margins. It compares normalized browser preview/canonical page boxes, checks the unchanged combined preflight returns PASS, downloads a real PDF, uses pdfjs to verify pages and search markers, and writes JSON/PDF evidence to artifacts/ribbon-cover-overflow. A negative case reinstates the old photo/date offsets via injected CSS and verifies BLOCKED, no override button, disabled download, and the final direct API guard rejecting export.

CI workflow: Ribbon cover overflow acceptance. It runs the existing project unit/type/lint/release-format/build checks and then the focused Playwright browser/PDF matrix. Artifacts retained 14 days.

## Measured A4 geometry and acceptance (verified)

Evidence from the real-browser Playwright pipeline is preserved in GitHub Actions run [38591081292](https://github.com/modebrecht/cv-cover-charm/actions/runs/38591081292), artifact `ribbon-cover-607beefb0a10ec186494fffc6af75a6656d39dc6` (PDFs and JSON geometry for every positive fixture, and negative regression evidence). The source patch was tested at commit `607beefb0a10ec186494fffc6af75a6656d39dc6`.

The original failed preflight measured **CSS pixels** on the 794 × 1123px page: date x=-143.625/y=1134.846 and photo/initials x=-66.482/y=-46.511, outside the physical A4 page (BLOCKED). The following repaired measurements are **millimetres relative to A4**, including each rendered block's top-left and actual width/height:

| Fixture | Date x/y, width × height (mm) | Photo/initials x/y, width × height (mm) | Result |
| --- | --- | --- | --- |
| No photo (initials) | 6.996 / 275.735; 33.986 × 9.000 | 24.990 / 32.984; 45.979 × 45.976 | PASS |
| Normal photo | 6.996 / 275.735; 33.986 × 9.000 | 24.990 / 32.984; 45.979 × 45.976 | PASS |
| Cropped photo (custom frame) | 6.996 / 275.735; 33.986 × 9.000 | 19.989 / 32.984; 55.975 × 55.973 | PASS |
| Long name, custom serif | 6.996 / 275.735; 33.986 × 9.000 | 24.990 / 32.984; 45.979 × 45.976 | PASS |
| Long date/location, altered margins | 6.996 / 262.024; 33.986 × 22.501 | 24.990 / 32.984; 45.979 × 45.976 | PASS |
| Negative: legacy transforms reinstated | -37.986 / 301.724; 33.986 × 9.000 | -27.851 / -22.852; 37.703 × 37.701 | BLOCKED |

Each of the five positive fixtures measured ten editor preview and ten canonical export blocks. Their x/y/width/height matched exactly within the recorded 0.001mm precision; each inspectPdfPreflight result was `pass` with zero issues. Each produced a genuine three-page A4 PDF, was text-inspected with pdfjs, and retained the expected content markers. The long name wrapped fully inside the cover, with name block height 15.124mm. The prolonged date grew upward rather than crossing the paper's lower edge. The negative fixture had two physical overflow issues, disabled normal export, offered no unsafe override, and the direct combined-export API rejected it.

GitHub Actions completed with **quality SUCCESS and browser SUCCESS (6/6 Playwright tests)** on the source-patch commit. Quality included unit regressions, TypeScript, lint, release formatting and production build. PDF first pages for the long-name and long-date variants were also rendered and visually reviewed: no A4 cut-off was observed.

## Known limitations / status

Extreme user-defined geometry or excessively long content can still physically overflow; keeping the existing strict preflight BLOCKED response is intentional, never a silent fit/truncation. Unsupported simultaneous content cannot be guaranteed safe without actually inspecting its rendered geometry. The scoped five-fixture matrix is not an exhaustive proof for arbitrary user content or all other templates.

**Ribbon overflow acceptance: PASS for this bounded package**, based on the verified source-patch CI and PDF evidence above. Merge recommendation: suitable for review/merge into dev after normal branch review; this package does not merge or deploy.
