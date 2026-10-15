# Legacy DOCX Modern / Sidebar — production visual parity audit (15 October 2026)

**Decision: MEASURED — Legacy DOCX fails visual parity. No production changes.**

- **Source:** `modebrecht/cv-cover-charm`, `dev` at `5301dff892c741fe9fcb460a637a874673b89b40` (confirmed remote HEAD at capture).
- **Flow:** genuine product Web editor preview, automatic PDF, ordinary Legacy DOCX via Dossier download dialog; Word rendition by headless LibreOffice **26.2.6.3** on Linux. DOCX Next never called.
- **Browser:** Playwright Chromium 156.0.8078.4 (headless shell); Node 22; rendered screenshot for *whole* visible multi-page CV sliced at its physical A4 boundaries, preserving the original full screenshot.
- **SSIM:** 794×1123 A4 normalized PNG per page; comparison at 265×375 using skimage SSIM, RGB and grayscale. Each cell reports **RGB / grayscale layout**; semicolons divide CV pages 1 and 2. Pairs are from identical authored content per row.
- **Caveat:** the grayscale metric is intensity-based, not an independently feature-extracted geometry-only score. Do not interpret the numeric values as page-editability or exact ink-bound fidelity.
- **Word PDF side:** converted with LibreOffice; **not** DOCX Next. Source DOCX packages preserved in CI evidence.

## Eight-case measurement matrix

| Case | Web CV pages | Auto PDF CV pages | Legacy Word CV pages | Web↔PDF RGB/layout | Web↔DOCX RGB/layout | PDF↔DOCX RGB/layout |
|---|---:|---:|---:|---|---|---|
| `short-left-no-photo` | 1 | 1 | 1 | 0.9660 / 0.9661 | 0.6986 / 0.6974 | 0.6977 / 0.6972 |
| `short-left-photo` | 1 | 1 | 1 | 0.9650 / 0.9652 | 0.6804 / 0.6792 | 0.6797 / 0.6790 |
| `short-right-no-photo` | 1 | 1 | 1 | 0.9652 / 0.9654 | 0.6552 / 0.6539 | 0.6529 / 0.6522 |
| `short-right-photo` | 1 | **blocked** | 1 | BLOCKED / N/A | 0.6489 / 0.6476 | BLOCKED / N/A |
| `long-left-no-photo` | 2 | 2 | 3 | 0.4365 / 0.4346 ; 0.6215 / 0.6217 | 0.5081 / 0.5077 ; 0.6922 / 0.6923 | 0.5127 / 0.5124 ; 0.5682 / 0.5690 |
| `long-left-photo` | 2 | 2 | 3 | 0.4275 / 0.4258 ; 0.6180 / 0.6182 | 0.4711 / 0.4705 ; 0.6853 / 0.6855 | 0.4947 / 0.4942 ; 0.5682 / 0.5690 |
| `long-right-no-photo` | 2 | 2 | 3 | 0.3869 / 0.3849 ; 0.6113 / 0.6114 | 0.5216 / 0.5215 ; 0.6846 / 0.6847 | 0.4408 / 0.4402 ; 0.5126 / 0.5133 |
| `long-right-photo` | 2 | **blocked** | 3 | BLOCKED / N/A | 0.5142 / 0.5140 ; 0.6846 / 0.6847 | BLOCKED / N/A |

**Do not average missing pages.** Long cases have **2 Web CV pages, 2 automatic PDF CV pages and 3 Legacy DOCX CV pages**: Word's extra page is a distinct failing page-alignment event, excluded from aligned-page SSIM and counted separately. In `short-right-photo` and `long-right-photo`, the automatic PDF download is **correctly blocked** by CV `physical-overflow` (text clipped/overlapping, page 1); there is no valid PDF SSIM for these cases. The Legacy DOCX download is nevertheless available.

## Physical Sidebar geometry and headline displacement

- The actual browser Web preview displays a **62.98 mm** Sidebar: left variant x=0.00–62.98 mm; right variant x=147.02–210.00 mm (measured on the scaled visible A4 component, normalized by its observed A4 width).
- Legacy Word XML consistently uses a left-first sidebar table grid **53.0 + 127.0 mm**, starting after approximately **10.0 mm** CV left margin. Both `left` and `right` saved layouts render with the Sidebar on the **left**, not right. The Word sidebar is roughly **9.98 mm narrower** than the authored Web sidebar. Right-hand user selection is displaced to the opposite side of the page (Web x≈147 mm versus DOCX table x≈10 mm).
- Word and automatic PDF `LEBENSLAUF` heading ink positions, physical CV page 1 from `pdftotext -bbox`: with Web-left the PDF heading is **(70.97, 34.51) mm** and Legacy Word is **(73.04, 23.40) mm**: Word offset **(+2.07, −11.11) mm**. Web-right automatically exported PDF heading is **(19.99, 34.51) mm** but Word remains **(73.04, 23.40) mm**: Word offset **(+53.05, −11.11) mm**. These positions are raster-PDF text-box starts, not a measurement of invisible CSS margins.
- All rendered Legacy first CV pages with identical short content are **pixel-identical** across left/right and photo/no-photo variants (same SHA-256 for each PNG); likewise for the long-content quartet. This independently supports that Sidebar orientation and photo state are **ignored visually** in the Legacy rendition.
- Photo-positive source cases showed a photo in the Web DOM. Each photo-positive Legacy DOCX contains **zero `word/media/` image entries**; the LibreOffice-rendered CV likewise contains no embedded photo. This is a confirmed missing visual element, not a color/style difference.

## Content integrity and multi-page behavior

- 17 authored `Praxisstation 01` through `Praxisstation 17` markers appear in both the long automatic PDFs and long LibreOffice DOCX renditions, in **correct order 1–17**; no content disappearance is established by this marker check.
- Legacy Word creates an **extra CV page** for all four long variants. Check the unaligned final DOCX page separately; it is not represented by Web/PDF page overlays. The test does not certify absence of every possible clipped glyph.
- The short PDFs have three full dossier pages; the long automatic PDFs have four where not blocked. Legacy DOCX converts to three full pages for short and **five** for long.
- Actual print/PDF dimensions are A4, confirmed via `pdfinfo`. All original DOCX files and converted A4 PDFs were retained in the source QA sandbox and included in the CI evidence recipe.

## Bottom-margin stress test (separate from default)

- Default Modern/Sidebar Legacy DOCX CV XML `w:pgMar`: top **24.01**, right **20.00**, bottom **17.99**, left **10.00** mm.
- Requested custom CV margins: top 24, right 20, **bottom 47**, left 10 mm.
- Actual generated stress DOCX CV `w:pgMar`: top **24.01**, right **20.00**, bottom **1.01**, left **10.00** mm.
- Therefore the historical **47 mm → ~1 mm** discrepancy **reproduces** on current source. A low-level section value can differ from effective visible reserved space (the exporter may reserve footer/chrome separately), but it is **not** the requested Word page-margin value. No patch made.

## Ranked discrepancies

1. **P0 — right Sidebar choice lost:** Legacy Word always left, while the browser and accepted automatic PDF correctly mirror the sidebar. Confirmed by Word table grid, bounding positions and rendered pixel hashes.
2. **P0 — applicant photo missing:** all four photo-enabled DOCX packages contain no media and render without the authored photo.
3. **P1 — long CV pagination diverges:** Word 3 CV pages versus Web/automatic PDF 2; all 17 marker titles remain extractable in order.
4. **P1 — 47 mm bottom margin reverts to 1.01 mm:** reproduced in XML under the requested stress configuration.
5. **P1 — typography / placement mismatch:** short Web/PDF SSIM near 0.965, but Legacy Word only around 0.65–0.70. The heading position and sidebar-grid width quantify concrete sources of this loss.
6. **P1 — two right+photo automatic PDF exports blocked by physical overflow:** this is an independent safety-related product state, not permission to bypass preflight; separately investigate if desired, outside this read-only audit.

## Historical comparison

The **23 September 2026** 39-template historical RGB aggregates were Web↔PDF **0.891**, Web↔Legacy DOCX **0.675**, PDF↔Legacy DOCX **0.673** (GitHub Actions run 35826177773). The **current short Modern-specific** values support similarly weak Legacy fidelity; unlike the earlier aggregate, this audit isolates Sidebar orientation/photo and detects an extra long-CV page. These are not comparable population-level averages, and long-page mismatches are not hidden inside the old aggregate.

## Evidence and reproducibility

- QA-only eight-case Playwright source: `tests/e2e/legacy-modern-sidebar-audit.spec.ts`.
- Separate 47 mm browser export: `tests/e2e/legacy-modern-margin-audit.spec.ts`.
- QA-only multi-page scorer: `scripts/legacy_modern_sidebar_score.py`.
- Raw machine-readable: `artifacts/legacy-modern-sidebar/results.json` and `measurements.json`.
- For each case: `--web-1.png` (whole CV wrapper), `--webpage-{1,2}.png` where long, `--pdf.pdf` if safely available, `--docx.docx`, `converted/--docx.pdf`, `raster/`, `--overlay-{pdf,docx}.png` and `--comparison.png`.
- Stress: `modern-margin47--docx.docx`. Original exports, rendered PNGs, overlays and machine-readable JSON were published as the [GitHub Actions artifact `legacy-modern-sidebar-evidence`](https://github.com/modebrecht/cv-cover-charm/actions/runs/38639442178/artifacts/11929539110), rather than committing large generated binaries. The artifact was confirmed present (26,798,444 bytes; not expired at verification). Any run failures must remain visible in logs/JSON.
- Environment intentionally retained exact source data, template, typography and margins across each of the eight variants; only CV length, Sidebar side and photo varied. Cover and Letter remained fixed Modern.
- The automatic PDF intentionally refuses the two physically unsafe right+photo cases. The DOCX file does not prove the author-approved PDF would have been safe.

## Recommendation and boundaries

**Prioritize DOCX Next** rather than spending more on visual-only Legacy repairs, but treat Native Sidebar acceptance as a separate still-open architecture gate. Do **not** claim that DOCX Next already solves these defects. Keep Legacy only as a clearly lower-fidelity fallback until its replacement meets exact Word acceptance.

**Audit status: MEASURED / CI SUCCESS.** Eight Legacy DOCX exports and six accepted automatic PDF exports were rendered in the actual production UI flow; right-Sidebar-with-photo PDF exports remained correctly blocked by physical-overflow preflight. The isolated audit workflow [#38639442178](https://github.com/modebrecht/cv-cover-charm/actions/runs/38639442178) completed **SUCCESS** for job `measured-legacy-modern` at 2026-10-14 21:25:54 UTC against exact audit executable commit `be2343befada0545fb9d6e8a2645279ec8a3bff3`. It uploaded `legacy-modern-sidebar-evidence` (26,798,444 bytes), including source DOCX/PDF and image/measurement evidence. This subsequent report-only status update does not alter executable inputs or the measured figures. No production renderer, PDF, Native Sidebar or DOCX Next code changed. No merge, deployment or production repair authorized.
