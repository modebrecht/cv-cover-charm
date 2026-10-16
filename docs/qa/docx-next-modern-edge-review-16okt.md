# Modern Word preview and right band edge review

**PARTIAL: read-only diagnosis. No product or renderer change.** Examined candidate commit `6a007acccfe57019fbe82a75d0f26227398fe334`, after fetching current remote dev (`8901a830a792d75e9e792345c5180827218b4e1e`) and this investigation branch. Root AGENTS.md remains applicable. Work stays on `investigate/docx-next-design-fidelity-16okt`.

## Evidence boundaries

The two supplied PNGs were inspected locally. `image(7).png` visibly shows desktop Word's Print screen with **Microsoft Print to PDF** selected. The pill has the expected stronger fill there. `image(8).png` shows a cropped Letter page; the application/view which produced that crop is unspecified. No corresponding original Word DOCX, Word-produced PDF, Word version, font inventory or Save/Reopen files were supplied. The images resemble the normal candidate but binary/source equivalence cannot be established from them alone. The screenshots were not republished to the repository; hashes and measured samples are recorded in [edge-inspection.json](docx-next-modern-edge-review-16okt/edge-inspection.json).

This review separately restored the committed normal saved project through the actual app file input and clicked the normal **PDF herunterladen** button. Preflight said ready; no warnings were overridden and there were no browser errors. The resulting [actual app PDF](docx-next-modern-edge-review-16okt/actual-app-export.pdf) has three pages. The existing [supplementary DOCX-to-LibreOffice PDF](docx-next-modern-edge-review-16okt/docx-libreoffice-export.pdf), generated from the published actual app DOCX candidate, has four pages. Their body layouts/pagination are different existing export paths; this investigation compares band edges, not full body parity. Neither PDF is a Microsoft Word conversion.

## Pill color

The native cover renderer stores decorative pill paint in the header and editable pill text in body paragraph frames. In ordinary body editing, Word dims inactive header/footer content. Print preview shows all stories at normal intensity. The new Word Print screenshot supports this display explanation. It does not establish complete visual, text editing or Save/Reopen acceptance.

Microsoft's explanation: https://learn.microsoft.com/en-us/answers/questions/5148107/header-and-footer-blurry-in-microsoft-word . The article states that inactive header/footer dimming does not affect print or PDF. Keeping the decoration in the header is an architectural choice in the current candidate. Matching on-screen body-editing color would require separately validating body-anchored decoration; this review does not change the proven frames or stored colors.

## Right band ends

The reported pixel is real in the supplied screenshot: the last interior page column is paper `(250,250,250)` in the upper/lower dark strip, while the thin upper rule reaches that column with its full `(36,74,97)` color. The next column is the grey page outline. This is not dismissed as the outline itself.

In the generated candidate package, however, **all four Letter band/rule drawings have the same 7,560,000 EMU = 210 mm width**. Their PNGs have 1,600 columns. Their last columns are fully opaque for header/rule, and uniformly alpha 235 for the intentionally 0.92-opacity footer/rule. There is no transparent last-column padding and no extra white header object covering the bands. Paper is the existing full-page underlay.

| Check | Result |
| --- | --- |
| Actual application PDF, MuPDF at 120/300/600 DPI | Header, rule and footer reach the right edge; no paper-coloured strip. |
| Actual application PDF, Poppler at 300 DPI | Right-edge samples remain band/rule colours. |
| DOCX → LibreOffice PDF, MuPDF | No shortened band in the sampled last column. |
| Same native PDF, Poppler at 300 DPI | Outermost raster column is lighter for **both** band and rule. |
| Same native PDF, Poppler at 610-pixel page width | The lighter edge disappears; band/rule colours reach the last column. |
| Supplied cropped screenshot | Main band is one pixel shorter than the rule. This exact differential pattern has not been reproduced in the available PDFs. |
| Actual Microsoft Print to PDF output from the user | **UNVERIFIED / unavailable.** |

The second PDF renderer changed the initial single-renderer assessment: a lighter native-PDF edge can be reproduced, but it depends on rasterizer and output pixel scale. That must not be described as either a universally clean native PDF or a proven white layout object.

There is a confirmed small serialization difference: nominal A4 drawings are 210 mm, while Word page width is rounded to 11,906 twips = 210.008611 mm. This is a candidate contributing factor, **not a proven cause of the screenshot**. LibreOffice additionally quantizes image placement: its page and paint right bounds differ by about 0.004 PDF points. Independent image interpolation/pixel snapping is another plausible contributor, because the band and rule are separate differently sized images. These hypotheses do not justify widening shapes arbitrarily, altering global unit conversions or touching frozen Sidebar geometry.

## Result and next exact gate

The reported issue is not reproduced as a shortened band in the application's PDF export. The DOCX package has equal band/rule widths and no padding defect. A PDF raster boundary effect is proven, while the exact Word band-versus-rule discrepancy remains unresolved. **The available evidence cannot distinguish Word preview rasterization from a defect retained in Word's actual PDF output.**

The next required artifact is the PDF produced through the exact Word Print screen shown in `image(7).png`, using **Microsoft Print to PDF**, together with the DOCX which was printed. Inspect its page boxes, image extents and edge colours in two renderers at several scales. That will determine whether a bounded Word-generation correction is needed or whether this is confined to preview/display rasterization. Word's Export-to-PDF route can subsequently serve as a second independent Word output path; it is not assumed equivalent to that printer route.

No new native candidate, global renderer change, PDF/Print change, Legacy DOCX change or template expansion was attempted. No unit suite was rerun for this read-only evidence addition. Existing 37D code validation remains associated with its earlier commit. Branch publication retains the explicit Vercel exclusion; protected and frozen work remains untouched. The exact evidence-commit SHA and post-push checks are supplied in the handoff.

To reproduce the app side: restore `docs/qa/docx-next-modern-chrome-16okt/normal-project.json`, open the dossier download dialog and choose PDF. For native supplementary rendering, render `modern-compact-normal.docx` from that packet with `render_docx.py`. Probe the resulting PDF with MuPDF and `pdftoppm -r 300`; repeat Poppler with `-scale-to-x 610 -scale-to-y -1`. Compare interior band/rule samples separately from the page outline and the partially covered outermost output pixel. Full PDFs and numeric samples are preserved in this packet.
