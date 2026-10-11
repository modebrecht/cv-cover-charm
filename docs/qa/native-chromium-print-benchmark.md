# Native Chromium Print Benchmark - Package 2

**Recommendation C: abandon the current native-print experiment as a complete-dossier product option; keep the automatic PDF export primary.** Its CV improvements are substantial, but incorrect Covers and two systematically scaled dossiers outweigh them. This is a decision about the measured implementation. The experiment branch and evidence are retained for review; no button, library or production branch was changed as a decision implementation.

## Scope and provenance

Starting reference `dev`: `e3a7bc18868e94813377db4261f7e3c180e0e6fa` (24 checks green). Package 1 HEAD: `0168e97c3f4bfd1a963516e6c4672877ab8c6b28`. Work branch: `dev-native-chromium-print`. On continuation, adopted `de1bb29ca40893ac2c0c8de62d179eda8ac715c3` by fast-forward; it added only the preliminary report.

The **authoritative cohort in all accompanying scores and contact sheets** uses source `76d01bddcd7478e59af6c7b92ea251f37ec3f7ef`, tree `b26b74c6a7ff8cce3ef3a995627eda4294b2592b`. It contains 39 authoritative catalog entries, 117 visible Web PNGs, 39 current combined PDFs, 39 native combined PDFs, and two additional long dossiers. Each PDF path has 117 Cover/Letter/CV SSIM comparisons: 234 pairs total. Fixtures, fonts, stored layout state, browser and source SHA are matched. Capture SHA, fixture hashes and artifact SHA256 hashes are checked before scoring. Pilot, mixed-source, modified-artifact and incomplete-catalog runs are rejected.

`dossier-gallery-shared.ts` supplies the canonical registry and fixtures. No second template list or renderer was added. Both PDFs use the production `DossierPdfCanvas`; native preparation uses the Package 1 action and CSS with `window.print()` intercepted only to let automation call Chromium's real `page.pdf()` engine. No benchmark-specific product styling is applied.

The earlier 106-line report included a separate CI capture at the same source: CV RGB/layout Current 0.953445/0.954100, Native 0.972448/0.972346; generation means 1617/458 ms. This expanded report explicitly supersedes those summary numbers with the **local paired cohort** below. It does not mix CI and local artifacts. Their small metric variation and larger timing variation are consistent with different environments. The older ~0.954/~0.955 current baseline is preserved in `cv-web-pdf-parity-report.md`; it is not edited.

## 1. Does native Chromium look better?

For **37/39 CVs, yes**. For the **complete dossier, no**.

| Document | Current RGB mean | Native RGB mean | RGB delta | Current layout mean | Native layout mean | Layout delta |
| --- | --- | --- | --- | --- | --- | --- |
| Cover | 0.987325 | 0.841451 | -0.145874 | 0.988181 | 0.853505 | -0.134676 |
| Letter | 0.991995 | 0.982721 | -0.009274 | 0.992846 | 0.983013 | -0.009833 |
| Cv | 0.953837 | 0.972494 | 0.018657 | 0.954503 | 0.972397 | 0.017894 |
| Overall | 0.977719 | 0.932222 | -0.045497 | 0.978510 | 0.936305 | -0.042205 |

SSIM is a similarity metric, not a percentage of correctness. The existing parity normalization is reused: rasterize at 96 dpi, fit without cropping to 794 x 1123, evaluate at 265 x 375 with RGB and grayscale SSIM. Small type/rule antialiasing differences remain expected. Full-scale review is necessary because the reduced analysis image can hide local defects.

| Document | Path | RGB median | RGB min | RGB max | Layout median | Layout min | Layout max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cover | current | 0.988802 | 0.974226 | 0.994811 | 0.989674 | 0.976090 | 0.995369 |
| Cover | native | 0.852330 | 0.588867 | 0.996755 | 0.872273 | 0.628875 | 0.997089 |
| Letter | current | 0.994034 | 0.962993 | 0.995745 | 0.994631 | 0.965874 | 0.995800 |
| Letter | native | 0.995299 | 0.755322 | 0.997392 | 0.995910 | 0.746045 | 0.997374 |
| Cv | current | 0.944827 | 0.929941 | 0.988185 | 0.945458 | 0.931309 | 0.988971 |
| Cv | native | 0.990701 | 0.612030 | 0.991923 | 0.991406 | 0.593552 | 0.992956 |
| Overall | current | 0.987724 | 0.929941 | 0.995745 | 0.988971 | 0.931309 | 0.995800 |
| Overall | native | 0.991449 | 0.588867 | 0.997392 | 0.992140 | 0.593552 | 0.997374 |

Worst template by document/path (minimum layout SSIM):

| Document | Current worst | Current layout | Native worst | Native layout |
| --- | --- | --- | --- | --- |
| cover | Verlauf 2 | 0.976090 | Mono Luxe | 0.628875 |
| letter | Sonne | 0.965874 | Violet Pulse | 0.746045 |
| cv | Neon | 0.931309 | Violet Pulse | 0.593552 |

## 2. Where does it improve?

The strongest CV layout improvements are:

| CV template | Current RGB | Native RGB | Current layout | Native layout | Layout delta |
| --- | --- | --- | --- | --- | --- |
| Neon | 0.929941 | 0.990499 | 0.931309 | 0.991632 | 0.060323 |
| Citrus | 0.938803 | 0.991247 | 0.939593 | 0.992001 | 0.052407 |
| Verlauf | 0.940652 | 0.991644 | 0.940721 | 0.992133 | 0.051412 |
| Edel | 0.936740 | 0.989581 | 0.938271 | 0.989377 | 0.051107 |
| Human | 0.941331 | 0.991715 | 0.941769 | 0.992155 | 0.050387 |
| Editorial | 0.942486 | 0.991808 | 0.943293 | 0.992784 | 0.049492 |
| Horizont | 0.941757 | 0.990868 | 0.942221 | 0.991406 | 0.049186 |
| Seriös | 0.942612 | 0.991460 | 0.942983 | 0.992144 | 0.049161 |
| Studio | 0.943217 | 0.991868 | 0.943971 | 0.992956 | 0.048985 |
| Kolumne | 0.943056 | 0.990701 | 0.943889 | 0.991129 | 0.047240 |

Manual review covered all ten requested priority CVs: Neon, Edel, Citrus, Verlauf, Colorful, Human, Horizont, Seriös, Editorial and Modern; also the largest gains, both CV regressions, all 21 significant Cover regressions and both Letter regressions.

- **Neon:** native preserves the soft blurred header field and fine type/rules much closer to Web. Current retains visible html2canvas blur/compositing differences. The improvement is visible, not just numerical.
- **Edel:** native renders the thin frame, pale surface and type more faithfully.
- **Citrus / Verlauf:** native preserves soft backgrounds and rounded content boundaries; text and fine rules are sharper.
- **Human / Horizont / Seriös / Editorial / Modern:** native generally matches type and fine-rule paint more closely; page structure is unchanged in the primary DOM audit.
- **Colorful:** the overall native score improves, but the header gradient still looks gray/darker than Web in **both** PDF paths. This is a metric/manual disagreement worth keeping visible; a high score does not prove every local effect correct.
- **Studio 3:** the existing white name on a pale surface is low-contrast in all three artifacts. This is a fixture/template defect shared by the paths, not a native improvement.

Paint causes above are inferences from the paired images and known render paths, not proof of every individual CSS mechanism.

## 3. Where does it regress?

A layout delta below -0.01 is used here only to group **significant visual regressions**, not to relax structural tolerances. The full 117-row CSV retains every delta, including smaller losses.

| Document | Template | Current layout | Native layout | Layout delta |
| --- | --- | --- | --- | --- |
| cover | Mono Luxe | 0.990198 | 0.628875 | -0.361324 |
| cover | Cove | 0.991063 | 0.649016 | -0.342047 |
| cover | Ribbon | 0.991338 | 0.657610 | -0.333729 |
| cover | Ledger | 0.990833 | 0.669318 | -0.321515 |
| cover | Gallery | 0.979215 | 0.666417 | -0.312798 |
| cover | Orbit | 0.990866 | 0.686795 | -0.304072 |
| cover | Edge | 0.993811 | 0.690902 | -0.302909 |
| cover | Prism | 0.988378 | 0.686445 | -0.301933 |
| cover | Glow | 0.990642 | 0.700791 | -0.289851 |
| cover | Studio 2 | 0.987625 | 0.705436 | -0.282189 |
| cover | Studio 3 | 0.990091 | 0.714565 | -0.275526 |
| cover | Violet Pulse | 0.987227 | 0.733488 | -0.253739 |
| cover | Warm 3 | 0.990766 | 0.747097 | -0.243669 |
| cover | Diagonal | 0.993427 | 0.755469 | -0.237958 |
| cover | Horizon | 0.977691 | 0.746630 | -0.231061 |
| cover | Forest Flow | 0.992658 | 0.767380 | -0.225278 |
| cover | Verlauf 2 | 0.976090 | 0.776555 | -0.199536 |
| cover | Verlauf 3 | 0.976930 | 0.791783 | -0.185147 |
| cover | Warm 2 | 0.989674 | 0.805183 | -0.184491 |
| cover | Sunrise | 0.983267 | 0.872273 | -0.110993 |
| cover | Editorial | 0.994701 | 0.930898 | -0.063802 |
| cv | Violet Pulse | 0.964261 | 0.593552 | -0.370709 |
| cv | Glow | 0.966037 | 0.697440 | -0.268597 |
| letter | Violet Pulse | 0.993178 | 0.746045 | -0.247133 |
| letter | Glow | 0.995317 | 0.774903 | -0.220415 |

**21 Covers regress.** In the native combined canvas, many Fresh/signature Covers lose their intended header/sidebar/motif and become an incorrectly colored full-page field with default block positioning. Code inspection finds remaining `html[data-dossier-template=...]` scopes in Cover CSS, while the current html2canvas clone supplies the legacy scope through `scopeDossierTemplateForHtml2Canvas()`. The combined native document cannot depend on a per-page clone's global scope. This is an observed shared-canvas/style-scope gap, not a fair isolated test of Chromium paint alone. No Cover/template patch was made during benchmarking.

**Glow and Violet Pulse regress in all three document kinds.** Their finished native PDFs visibly shrink the document to roughly two-thirds of the intended width/height and leave a large white area. The pre-PDF print DOM geometry still passes. Therefore DOM geometry and page-count guards alone do **not** establish native PDF scaling parity. The exact Chromium shrink/overflow trigger was not isolated in this package; attributing the CV failure solely to global template scope would be speculative. This rendered scaling failure is a product blocker.

Small negative Letter layout deltas also exist for Gallery and Edel Dark (under 0.001); they are captured in CSV and do not show the gross scaling failure of Glow/Violet Pulse.

## 4. Does pagination remain identical?

**Yes for page count, document order and tested marker distribution. No blanket claim of rendered geometry parity is justified.**

All 39 native combined PDFs have the canonical physical count, order Cover -> all Letter pages -> all CV pages, and A4 dimensions within the existing PDF check tolerance. There are no blank/missing/duplicated pages or application-UI pages in this cohort. Every native physical page has nonempty text. The existing screenshot/PDF duplicate-image guard also passes.

Primary 39-template CV live -> canonical and canonical -> print DOM checks include main, header, sections, entries and names with unchanged text and computed font metrics. Maximum canonical -> print displacement is **0.000064 mm**, below the unchanged **0.02 mm** tolerance. The canonical gallery has no CV photograph, so this is not a claim about photo placement.

Long fixtures:

| Fixture | Canonical sequence | Current count | Native count |
| --- | --- | --- | --- |
| long-studio3-classic | cover -> letter -> letter -> cv -> cv -> cv | 6 | 6 |
| long-gallery-sidebar | cover -> letter -> letter -> cv -> cv -> cv -> cv -> cv | 8 | 8 |

All 14 Letter markers, 18 CV-entry markers and the reference marker occur on the same physical pages in canonical DOM, current PDF and native PDF for each long fixture. The scorer reopens actual PDF bytes to verify this distribution; it does not trust capture metadata alone.

The separate 39-template photo/sidebar fixture uses saved circular/free photo state and mirrored sidebar layout. It ran on `de1bb29c`; its `src` tree (`b79d603685972f29cd3268c31190efd439dcbba4`) and bundled-font tree are byte-identical to the primary source. It contributes **no SSIM scores** to the primary cohort.

- Canonical -> native-print geometry passes all 39, maximum **0.000071 mm**. Photo/sidebar nodes remain present, with unchanged geometry, font values and radius.
- Strict live-preview -> shared-canvas geometry **fails** for Neon, Verlauf and Citrus: a 3.000-mm content inset difference produces downstream vertical differences up to 13.281 mm (Verlauf 13.042 mm). Differences affect content, not the photo/sidebar nodes. The native renderer faithfully preserves the already differing canonical canvas. These are shared-export discrepancies, not evidence of a new native-only shift.
- The supplemental opt-in test exits nonzero for these three cases using `expect.soft` with the original 0.02-mm threshold so all 39 results can be recorded. The tolerance is not weakened, and this failure is not described as green. Details are in `native-chromium-print-photo-geometry.json`.

Combined with the actual PDF scaling failures for Glow/Violet Pulse, **full structural parity is not established**. The native option cannot be called a highest-quality complete-dossier export on this evidence.

## 5. Is native text selectable/searchable?

**Yes, real embedded text and fonts exist, with material search/copy limitations.** The audit extracts glyph-backed text and searches representative Letter recipient/body, CV name, section heading and entry in all 39 PDFs. Whitespace-normalized sample content is present for all five categories in both paths.

| Search / copy check | Current | Native |
| --- | ---: | ---: |
| Literal Letter recipient/body, CV name/entry | 39/39 each | 39/39 each |
| Literal template-specific first CV section heading | 39/39 | 34/39 |
| Letter body extracted before closing | 0/39 | 39/39 |
| CV name extracted before first entry | 39/39 | 38/39 |
| CV document title extracted before first entry | 39/39 | 1/39 |

Native fails literal section search for **Modern, Sonne, Studio, Neon and Aurora**. For example Neon extracts `FAM IL IE`; whitespace-normalizing proves the content exists but does not restore ordinary literal search or clean copy/paste. Native also yields two searchable copies of the name in Warm and Neon. Colorful places name after the first entry in extracted reading order. In most native CVs the document title is emitted after the body.

The native Letter extraction places its body before the closing, unlike the current invisible text-layer order. Accented names such as `Lea Müller` remain searchable. Native embeds Cabin font subsets; current uses its existing embedded Cabin/invisible text-layer implementation. Font family/size/weight/line-height/letter spacing in the primary DOM audit do not change. These text checks do not constitute a PDF tagging/accessibility certification or a manual test in every PDF viewer.

## 6. What happens to file size and performance?

Combined three-page PDF sizes, **bytes**:

| Path | Mean | Median | Smallest | Largest |
| --- | --- | --- | --- | --- |
| current | 1,310,826 | 1,287,830 | 1,190,179 | 1,479,255 |
| native | 221,723 | 158,043 | 99,784 | 1,342,398 |

Native is 83.1% smaller on average. The native largest file is still about 1.34 MB, so savings are not uniform; blur/filter content can require image payloads. No compression optimization was performed.

DOM-ready -> PDF produced, milliseconds:

| Path | Mean | Median | Fastest | Slowest |
| --- | --- | --- | --- | --- |
| current | 2,088 | 2,022 | 1,755 | 2,857 |
| native | 677 | 639 | 401 | 1,204 |

The timed native operation includes the product preparation/action and `page.pdf()` generation. Current includes button activation, rasterization, assembly and download bytes becoming available. In this environment native is around three times faster; human print-dialog time is excluded. This is an approximate single sequential cohort, not a device performance promise.

## 7. What is the UX cost?

Current: click -> **automatic PDF file download**.

Native: click -> **browser/system print dialog** -> choose **Save as PDF** -> confirm. The user also controls print destination, backgrounds, scale and browser headers/footers. The benchmark's zero margins/background-enabled settings cannot force equivalent choices in the interactive system dialog. Only desktop Chromium was tested; Firefox, Safari and mobile equivalence remain unverified.

## 8. Recommendation

**C - Abandon the current Native Print experiment as a complete-dossier export; current PDF remains superior overall.**

The CV mean/median and visible Neon improvements are compelling, and PDFs are smaller/faster to generate. They do not compensate for 21 incorrect Covers, two globally shrunk native dossiers, five CV heading search failures and inconsistent CV extraction order. Keeping this implementation as an option labelled “highest quality” would promise more than it delivers. The dialog cost further raises the quality bar.

No decision implementation is performed: current PDF button, html2canvas/jsPDF, metadata, filenames, searchable text layers, ICC handling and automatic-download flow remain unchanged. No merge, deployment or promotion is authorized here. Retain the branch/evidence for review; any future experiment addressing style scope and native scaling requires a new explicit task and a new matched-source benchmark.

## Configuration and reproducibility

Chromium `140.0.7339.16`, Playwright `1.55.0`, Node `v24.19.0`, Linux `6.18.44`; `AMD EPYC 9V74 80-Core Processor`, 9 logical CPUs, 9.73 GiB reported memory. Screenshot viewport 1800 x 1600, device scale 1. Fonts are the repository's bundled Cabin TTFs.

```json
{
  "format": "A4",
  "landscape": false,
  "margin": {
    "top": "0",
    "right": "0",
    "bottom": "0",
    "left": "0"
  },
  "printBackground": true,
  "preferCSSPageSize": true,
  "displayHeaderFooter": false,
  "scale": 1
}
```

Raster/metric environment: python 3.12.14, pymupdf 1.26.6, pillow 12.3.0, numpy 2.3.5, scikit_image 0.25.2. Exact Chromium arguments, source/tree, text/geometry results, long marker/page assignments, size and timing stats are in `native-chromium-print-summary.json`; artifact and fixture hashes are in `native-chromium-print-provenance.json`.

Reproduce capture/scoring from a clean experiment checkout using the pinned scorer dependencies in `.github/workflows/dossier-regression.yml`:

```bash
python3 scripts/run_native_chromium_benchmark.py --capture-dir /tmp/native-capture
python3 scripts/native_chromium_print_benchmark.py --capture-dir /tmp/native-capture --out-dir /tmp/native-report
python3 -m unittest discover -s scripts -p test_native_chromium_print_benchmark.py
```

The opt-in supplemental audit additionally runs `native-print-photo-geometry.spec.ts` with `NATIVE_PRINT_BENCHMARK_DIR` set and a Vite server on port 4173. Its three live-preview discrepancies are expected to fail at this source; they must be resolved or explicitly re-evaluated before claiming broader structural parity.

## Durable results and visual review

- `native-chromium-print-scores.csv`: 117 rows, both PDF paths, RGB/layout deltas and source/fixture identity.
- `native-chromium-print-template-deltas.csv`: 39 template means across three document kinds.
- `native-chromium-print-deltas-descending.csv`: 39 template means sorted by native layout delta.
- `native-chromium-print-cv-deltas-descending.csv`: all CV comparisons sorted by layout benefit.
- `native-chromium-print-geometry.csv`, `native-chromium-print-photo-geometry.json`: primary and supplemental geometry.
- `native-chromium-print-text-search.csv`: 390 actual literal-search/sample-content checks.
- `native-chromium-print-summary.json`, `native-chromium-print-provenance.json`: full environment, source and audit details.

![native-chromium-print-contact-1](native-chromium-print-contact-1.png)

![native-chromium-print-contact-2](native-chromium-print-contact-2.png)

![native-chromium-print-contact-3](native-chromium-print-contact-3.png)

![native-chromium-print-contact-4](native-chromium-print-contact-4.png)

![native-chromium-print-contact-5](native-chromium-print-contact-5.png)

![native-chromium-print-cover-regressions-1](native-chromium-print-cover-regressions-1.png)

![native-chromium-print-cover-regressions-2](native-chromium-print-cover-regressions-2.png)

![native-chromium-print-cover-regressions-3](native-chromium-print-cover-regressions-3.png)

![native-chromium-print-cover-regressions-4](native-chromium-print-cover-regressions-4.png)

![native-chromium-print-cover-regressions-5](native-chromium-print-cover-regressions-5.png)

![native-chromium-print-cover-regressions-6](native-chromium-print-cover-regressions-6.png)

![native-chromium-print-cover-regressions-7](native-chromium-print-cover-regressions-7.png)

![native-chromium-print-letter-regressions-1](native-chromium-print-letter-regressions-1.png)

The committed contact sheets are compact review evidence (about 5 MB total), not a raw gallery. Raw PDFs/PNGs are not committed. The earlier GitHub CI benchmark is also available in [run 38155331078](https://github.com/modebrecht/cv-cover-charm/actions/runs/38155331078); the 14-day Actions retention is not used as the durable home for these results.

## Validation and branch safety

Local continuation: **1105 unit tests passed**, TypeScript typecheck passed, ESLint **0 errors / 21 existing warnings**, production build passed, supplemental test formatting passed, and **8 benchmark audit tests passed**. The scorer independently passed all source/hash/count/A4/duplicate-image/main-geometry/long-marker guards on the authoritative cohort. The supplemental live/shared-canvas guard failure is disclosed above.

At reconstruction, `de1bb29c` remote CI was **11/11 green**, including `cv-pdf` (with Package 1 native-print tests), `cv-m9-pagination`, `templates-layout`, `fresh-dossier-templates`, `dossier-flow`, other Letter/responsive groups and the full 39-template native benchmark. Results publication triggers the same required groups again; the final response records the final published commit and check status.

This continuation modifies only QA scripts/tests and documentation/evidence. No application source or template is changed. Earlier Package 2 generic print fixes are separate commits: `3d118cfb` preserves the canonical rounded-pixel geometry; `d2864eef` preserves original DOM ancestry and prevents the 16-mm Gallery child-selector regression. The invalid pre-fix cohort is excluded.

Protected remote refs remain:

- `dev`: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`
- `main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`
- `render`: `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`

No deployment, promotion, merge, force push, rebase, amend or squash of published history.

Next: decide whether Native Chromium Print should be promoted, retained as an optional high-quality export, or discarded.
