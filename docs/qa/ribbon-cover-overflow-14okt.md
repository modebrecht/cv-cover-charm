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

## Measurement table

| Condition | Date x/y (CSS px) | Applicant photo/initials x/y (CSS px) | Verdict |
| --- | --- | --- | --- |
| Before (independent production QA reproduction) | -143.625 / 1134.846 | -66.482 / -46.511 | BLOCKED, confirmed off A4 |
| After source patch | Awaiting new real-browser artifact | Awaiting new real-browser artifact | UNVERIFIED until CI browser run |

## Known limitations / status

Extreme user-defined geometry or excessively long content can still physically overflow; keeping the existing strict preflight BLOCKED response is intentional, never a silent fit/truncation. Unsupported simultaneous content cannot be guaranteed safe without actually inspecting its rendered geometry. CI, real PDFs, and final PASS status must be updated with verified results before merging.

Current acceptance: PARTIAL until the latest branch CI and artifact assertions are green. Merge recommendation: hold until that evidence exists.
