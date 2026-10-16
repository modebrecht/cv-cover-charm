# Modern badge paint in the body story

**PARTIAL — bounded fix integrated; supplementary checks PASS. Desktop Microsoft Word editing and Save/Reopen remain UNVERIFIED.** This changes only the existing Modern opt-in candidate on `investigate/docx-next-design-fidelity-16okt`. Fresh fetch confirmed remote dev `8901a830a792d75e9e792345c5180827218b4e1e` and investigation parent `cf16595b16b75ba0334b0477c79cce775d71b1f9`. `AGENTS.md` was reread; published history is preserved.

## Finding and correction

Previously the badge paint lived in the cover header, while its native editable text lived in the body. Word fades inactive header artwork during body editing. The user's Print-preview screenshot supports this diagnosis: it shows the full-strength badge. The [edge review](docx-next-modern-edge-review-16okt.md) records that evidence and the separate right-edge uncertainty.

The new explicit model option `coverBadgePlacement: "body"` keeps the authored badge background in `cover.blocks`. Other cover decorations remain in the first-page header. The Modern app entry selects this option with authored frames and source compact bands. Default Next, Brief and the other 38 templates do not select it. Activation remains `/?docx-next-design-qa=1` → dossier download dialog → **Modern DOCX Next testen**.

The existing renderer already supports body decorative shapes with page-relative behind-text anchors. The composer-owned `.badge-paint` identity identifies this generated nonsemantic paint; user artwork retains its existing placement. No renderer/engine change, new layout primitive, XML repair, semantic-text rasterization or spacer chain. Background geometry, alpha, color, paragraph frames, controls, photos and crops are unchanged. Fresh browser metrics and stale/unsupported-font guards remain in force. The model option rejects use outside authored composition.

Moving the paint to the body addresses inactive-header dimming without changing authored color. Desktop Word behavior still requires testing: package location and unchanged LibreOffice print output cannot prove Word editing appearance or importer stability.

## Verification

| Gate | Result |
| --- | --- |
| First normal prototype, before expansion | Actual saved-project restore → app button → DOCX. Four A4 pages; all four page rasters identical to the previous compact-chrome candidate. PASS. |
| Actual Modern app exports | **10/10 PASS**: normal, 115%, long title/name, moved fields, portrait photo, circular photo, hidden photo/attachments/badge, centered badge, right badge, longer badge. Saved fixture projects restored through the app file input. |
| Cover comparison | **10/10 complete cover rasters unchanged**. Native cover controls/text and paragraph frames identical. All extracted text inside A4; visible badge glyph bounds inside paint. |
| Story placement | Nine visible paints occur in `word/document.xml`, absent from header XML; hidden case has none. Three document sections remain. |
| Letter/CV protection | **30/30 whole-page rasters identical** to previous compact-chrome normal reference. All ten cases have identical Letter/CV canonical parts to that reference. Body regions/glyph positions also match earlier case references. |
| Pagination | **10/10 four A4 pages**: one cover, one Letter, two CV; no additional cover page. |
| Web regression and saved state | **10/10 actual Web captures byte-identical** to earlier captures. Saved-state/export-source equivalence and unchanged local saved documents checked each time. |
| Default Next regression | **10/10 default packages byte-identical** to earlier same-source exports. |
| Brief regression | **1/1 actual normal Brief export byte-identical** to prior #37C/compact-chrome golden (`dfe4357557483bff32edee86349a9f978c5e26f02ef315f416ca7d418723ccb3`). Other Brief cases not rerun. |
| App negative cases | **16/16 PASS**: unsupported/substituted font, missing metrics, stale capture/render, overflow, nonmatching dossier, overwide/multiline badge, transparent artwork overlap, placeholder opacity, hidden geometry, unsupported cohort, custom chrome text, chrome mode, opt-in off. No fallback download. |
| Full unit suite | **1,192 PASS**, zero failures; 22,978 assertions, 248 files. |
| Dedicated DOCX suite | **379 PASS**, zero failures; 5,897 assertions, 58 files. Overlaps full suite. |
| Typecheck, build, formatting, diff | PASS. |
| Lint | Zero errors, 21 pre-existing warnings. |
| Visual inspection | Ten covers and three distinct adjacent-page images reviewed; normal and long also inspected individually. Supplementary LibreOffice only. |
| Desktop Word editing, interaction, Save/Reopen, Word PDF | **UNVERIFIED**; desktop Word unavailable. |

The [packet](docx-next-modern-pill-body-16okt/validation.json) contains hashes/results, actual app evidence, normal saved project, model and metrics. The [A4 comparison](docx-next-modern-pill-body-16okt/pill-body-a4-comparison.pdf) shows actual Web, prior DOCX and new DOCX for normal, 115% and long. Native panels are LibreOffice print output; they show unchanged printing and cannot show Word inactive-story UI dimming.

For normal/scaled/long, all prior/new pages match. For the other seven, `wholePagePixelsIdenticalToPriorCase` records intentional footer differences against the older pre-chrome-fix cohort. The independent `neighborWholePagePixelsIdenticalToChromeCandidate` check passes for all 30 current adjacent pages. This correction does not change Letter/CV.

## Exactly which file to test

Use **[modern-pill-body-normal.docx](docx-next-modern-pill-body-16okt/modern-pill-body-normal.docx)**, SHA-256 `936416981a8e980ac61101b623a26b15a379e3f594c11ec53607f996c20d3337`. It is the actual app download, copied without OOXML changes. Do not resave an older `modern-compact-normal.docx` for this gate.

1. Open the new file in desktop Word. Inspect the pill while editing the body and compare with File → Print. Check native editable text and all four pages.
2. Save a separate copy as `modern-pill-body-normal-word-r1.docx`, close it and reopen that copy.
3. Inspect again, export/print the reopened copy to PDF, and preserve the original download. Supply the reopened DOCX and Word-produced PDF for comparison.

115% and long candidates are in the packet for subsequent checks. Normal is the primary next handoff.

## Reproduction

Use the earlier primary runtime, supported Sans fontconfig and Chromium settings. Reference folders are read-only outputs from `6a007ac` (normal/scaled/long compact chrome) and `13145d7` (remaining covers); recreate in separate checkouts if needed. Do not reset this branch.

```sh
DOCX_NEXT_QA_TEMPLATE=modern bun scripts/docx-next-brief-app37c.ts /tmp/modern-pill-app
# Render each downloaded candidate.docx: render_docx.py --dpi 120 --emit_pdf
# into its case's rendered/ directory; no document repair or XML mutation.
python scripts/docx-next-pill-body-qa37d.py /tmp/compact-chrome-reference \
  /tmp/prior-modern-app /tmp/modern-pill-app /tmp/modern-pill-packet
bun test tests/unit --timeout 30000
bun run test:docx-next --timeout 30000
bun run typecheck
bun run lint
bun run build
```

The earlier generic QA helper now finds badge paint in either story and remains usable with historical outputs.

## Limits and publication

This is a bounded Modern correction, not all-template acceptance. Direct Word text edits still do not automatically resize the separate pill background. Other header artwork can still receive normal inactive-header fading. The original user saved project/DOCX and Word-produced PDF for the right-edge report remain unavailable. This fixture is equivalent to its own saved Web state, not proven identical to the user's original state. No right-edge fix is claimed.

Next: Word normal editing and Save/Reopen, then 115% and long. If paint disappears, changes layer or moves in Word, reject and diagnose before expansion. No other template is enabled.

`vercel.json` explicitly disables this exact branch and wildcard branches; workflow push filters do not match. Live pre-publication queries returned zero deployments and workflow runs for this branch. Only an own-branch fast-forward is published. No merge, promotion, deployment, default switch, PDF/Print, Legacy DOCX, Sidebar, Agent A, #14, #25 or #38 edits. [Changed files](docx-next-modern-pill-body-16okt/changed-files.json) lists this correction; the containing SHA is in the handoff.
