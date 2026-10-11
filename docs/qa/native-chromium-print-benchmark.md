# Native Chromium Print Benchmark — Package 2

Source branch: `dev-native-chromium-print`  
Source SHA: `76d01bddcd7478e59af6c7b92ea251f37ec3f7ef`  
Source tree: `b26b74c6a7ff8cce3ef3a995627eda4294b2592b`  
Chromium: 140.0.7339.16  
GitHub Actions run: 38155331078  
Benchmark artifact: `native-chromium-print-benchmark` (artifact 11707579665)

All 39 active templates were captured from the same source and fixture state as visible Web PNG, current html2canvas/jsPDF and native Chromium PDF. The scorer retained the existing 0.02 mm DOM geometry guard. Product regression groups and M6 Release Candidate were green.

## Result

| Document | Current RGB | Native RGB | Current layout | Native layout |
|---|---:|---:|---:|---:|
| Cover | 0.987325 | 0.841451 | 0.988181 | 0.853505 |
| Letter | 0.991995 | 0.982721 | 0.992846 | 0.983013 |
| CV | 0.953445 | **0.972448** | 0.954100 | **0.972346** |
| Overall | **0.977589** | 0.932207 | **0.978376** | 0.936288 |

Native Chromium is therefore **not safe as a complete-dossier replacement yet**, despite a major CV fidelity improvement.

## CV finding

Native Chromium improved 37 of 39 CV templates. The median native CV layout SSIM is **0.991384**.

Representative layout improvements:

- Neon: 0.931309 → **0.991632**
- Citrus: 0.939593 → **0.992001**
- Verlauf: 0.940721 → **0.992133**
- Edel: 0.938271 → **0.989377**
- Human: 0.941769 → **0.992155**
- Editorial: 0.943293 → **0.992784**
- Horizont: 0.942221 → **0.991406**
- Seriös: 0.942983 → **0.992144**
- Studio: 0.943971 → **0.992956**

The two CV regressions are:

- Glow: 0.966037 → **0.697440**
- Violet Pulse: 0.964261 → **0.593552**

The scorer confirmed pre-PDF Web/canonical/native-print DOM geometry within 0.02 mm. Glow/Violet therefore fail at the Chromium print/PDF paint boundary rather than through ordinary CV pagination or state drift.

## Cover finding

21 of 39 covers regress materially under native print.

The affected set aligns strongly with the Fresh/signature cover systems. Their active styling still contains Cover rules scoped through `html[data-dossier-template=...]`. The current html2canvas path supplies that legacy scope in its throw-away capture clone via `scopeDossierTemplateForHtml2Canvas()`. Native printing has no per-page clone scope, so those covers are not yet self-contained.

This is an architectural gap, not evidence that Chromium native painting is inherently worse.

## Letter finding

Most Letters remain around native ~0.995 parity. The mean is pulled down primarily by Glow and Violet Pulse. Those template fixes also retain global `html[data-dossier-template]` letter scoping, so they show the same unresolved local-scope class.

## Pagination and geometry

Long fixtures retained identical physical page counts and marker distribution:

- Studio 3 classic: 6 canonical / 6 current / 6 native pages
- Gallery sidebar: 8 canonical / 8 current / 8 native pages

The benchmark first exposed a 16 mm Gallery native-print geometry regression. It was fixed generically by preserving canonical DOM ancestry during physical A4 print scaling. Gallery is now an explicit native-print regression case and the full strict benchmark passes.

## Searchable text

Native Chromium PDFs contain real selectable/searchable embedded text and fonts.

Literal representative search succeeds for Letter header/body, CV name and CV entry across all 39 templates. Template-specific CV section text is present across all cases, although the fixed literal section needle varies by template.

Native reading order is not uniformly superior to the existing invisible text layer, so accessibility/reading-order should remain a separate concern.

## Size and generation cost

Mean combined PDF size:

- Current: **1,310,027 bytes**
- Native: **221,876 bytes**

Native is approximately **83% smaller** on average.

Benchmark generation time:

- Current: **1617 ms mean**
- Native Chromium PDF API: **458 ms mean**

The native engine is roughly 3.5× faster in this automated environment. This does **not** include the human interaction cost of the browser/system print dialog.

## Product decision

### Recommendation: C — keep the current PDF export as the production path for now.

Do not promote or expose Native Chromium as a general “highest quality” complete-dossier option yet because 21 Cover templates and Glow/Violet Pulse can render incorrectly.

However, do **not discard the experiment**. Native CV output is materially superior for 37/39 templates and reaches approximately 0.99 layout parity for many designs, while producing much smaller PDFs.

The next justified experiment is a narrow Package 3:

1. make Cover template identity/style self-contained locally, analogous to the completed CV migration;
2. localize the remaining Letter template scopes needed by Glow/Violet;
3. isolate the Glow/Violet Chromium print-painter interaction;
4. rerun the exact same 39-template benchmark without weakening geometry or SSIM checks.

No changes should be promoted to `dev` until that benchmark is green enough to revisit the A/B/C decision.
