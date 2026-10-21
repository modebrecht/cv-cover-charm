# DOCX Next: true full-app cover-family acceptance packet — 21 October 2026

## Authoritative evidence

**Repository:** modebrecht/cv-cover-charm
**Isolated branch:** `fix/docx-next-shared-fidelity-18okt`
**Code revision for native DOCX suite:** `bd6fe46fd880be4c0a405aa45e47789c9f6cc7ed`
**Full application browser batch revision:** `b2523d3f65b2efb2049b4234c17ec55d23532408`
**Environment:** isolated Vercel Sandbox node22, Bun 1.4.3, Playwright Chromium; separate detached Git worktree restored from a repository snapshot. Existing CV worktree and local modifications were **not** touched. No CI rerun, deployment or merge.

## Actually executed automated checks

| Gate | Real execution result |
|---|---|
| Focused full-DOCX cover/placeholder tests | 35/35 PASS, 0 FAIL |
| Entire focused DOCX suite | **489 PASS, 0 FAIL**, 8,799 assertions, 72 files |
| TypeScript `bunx tsc --noEmit --pretty false` | PASS, exit 0 |
| `bun run build` | PASS, exit 0 |
| **Ten saved-state full-application DOCX downloads** | **10/10 PASS, 0 FAIL**, run exit 0 |
| Application PDF preflight within these fixtures | 0/10 enabled (all BLOCKED_BY_APP_PREFLIGHT); PDF comparison NOT accepted |
| Microsoft Word visual comparison / edit/save/reopen | **0/10 — NOT EXECUTED** |

The batch restored all three dossier inputs into the real Vite application,
visited the cover, letter and CV pages, captured actual Web screenshots,
clicked **Download → Ganzes Dossier als PDF → Vollständiges DOCX-Testdossier herunterladen**
in the protected app dialog, saved the browser download event as `full-app-native.docx`
and parsed its actual ZIP XML and image/photo/avatar identities.
The saved browser data were checked for mutation, and SHA-256 digests recorded.
The PDF button was also probed; its app preflight remained blocked and was NOT bypassed.

## Individual genuine DOCX downloads (browser event)

| Case | Family | Variant | Size (bytes) | SHA-256 |
|---|---|---|---:|---|
| V01 | Verlauf | baseline | 7805900 | `4936e5ee20481a7df9947ee69c54d1f434bd9326eae91f2ca4330e799d1ac8a6` |
| V02 | Verlauf | scale115 | 7805900 | `a8d9686aec452ad53b26fd36d1346585cf99cc280f68c3f738ea164586525c1d` |
| V03 | Verlauf | photo | 7806855 | `7cfb87a72acfd643dfa336d80556b445db55aeb03a5d67fad0ce36fb0dc4fd75` |
| V04 | Verlauf | long-date | 7805943 | `518c76a0e849e8715399cc8a1fb0b90ad05b59976c9be9745a0a6e63e7e31871` |
| N01 | Neon | baseline | 3398654 | `acb712d98cdf91734d34d2bdfac7ede218d26080ab0b9100c51191b5fcd9f47d` |
| N02 | Neon | hidden-rule | 3398952 | `134aca330242befa3405144d4fbf8a746ede4ffb46015cb34904fbc9e1f461f1` |
| N03 | Neon | photo | 3399589 | `f15776274bc67a62c773582c3a2d62fbada52b12f68abd31c3be4286b6c9f333` |
| W01 | Freundlich | baseline | 217824 | `67dcd9d0a7ccf4583a834540d6771cc6f628c624d96f2fa43db9728d3d1b575b` |
| W02 | Freundlich | long-name | 217876 | `2ece8425ac31f12fd9f054c6191dcdcaf479059fec56252573c4ab60599176ce` |
| W03 | Freundlich | contact-long | 218156 | `aa7402def34eafa0ac397acbd5c03b59e95f61cc4081ee7aee53de9a350aafe6` |

## Specific regressions found and fixed by running the real tests

1. The protected exporter had equated an absent `settings.cvLayout` with Sidebar, even though `cvWordLayout(undefined)` correctly resolves to Classic. This falsely blocked nine tests; the export guard now uses the resolved layout.
2. The abandoned one-owner DrawingML initial-avatar never passed Writer rendering. The obsolete explicit mode is now rejected; only the isolated, editable VML candidate remains in the gated cover-family QA path.
3. Tests asserted a circle belonged to the document body when two templates actually use a single composed first-header art asset. Assertions now follow the true DOCX story/paint ownership.
4. The browser automation had looked for a non-existent “Gesamtdossier herunterladen” action and a misnamed PDF button. It now uses the actual editor Download menu and protected QA button.
5. Saved uploaded photos now use native page positioning, `wrapNone`, foreground drawing, and crop while allowing original first-header artwork to remain in the background.

## Limits and next genuine acceptance gate

- **This proves actual complete DOCX creation and structural fidelity, not pixel parity in desktop Microsoft Word.**
- The protected family download is still QA-only, deliberately not active in the standard product.
- Visual first/continuation-page geometry, exact gradient/pill/photo overlap, editable native content in Microsoft Word and Word Save/Reopen still require a small, **real full-dossier** Word review. Do not send synthetic avatar-only packets.
- Application PDF preflight was blocked in all ten saved-state QA fixtures; do not infer PDF parity or alter preflight gates from those results.
- Do not merge, switch production export, or deploy from this evidence alone.

## Reproduction

```bash
bun run test:docx-next
bunx tsc --noEmit --pretty false
bun run build
DOCX_NEXT_FULL_APP_QA=1 \
  bun scripts/docx-next-cover-family-ten.ts /tmp/docx-full-app-10
```

Requires Playwright/Chromium in the runtime; the batch honors `CODEX_PRIMARY_RUNTIME_NODE_MODULES` for installations outside project `node_modules`.


## Follow-up: source-positioned FULL cover QA and real visual evidence (21 Oct evening)

**Background:** Rendering the first genuine 10-document batch in LibreOffice Writer
confirmed valid four-page dossier packages and 8/8 centered, visible editable
initials. However, the default semantic-flow cover clustered the title,
name, date pill and contact/footer far above their stored Web locations.
Web vs Word was visibly **NO-GO** despite a green structural test suite.

**Fix:** The opt-in full-dossier cover-family QA path now selects
`coverComposition: "graphic-family-qa"` and reuses the shared
`composeAuthoredCover` implementation. Author-owned x/y positioning,
anchored name/title/contact/dates, decorative background paint, rounded
initials and uploaded photos are retained in one source-coordinate layout.
This option is **explicitly gated by the registered**
`nativePhotoPlaceholder: "editable-initials"` template capability, not
a hard-coded list of template IDs in the shared model. Intentionally layered
graphics and semitransparent cover text are handled only in this guarded
candidate, with default authored acceptance rules retained elsewhere.
No ordinary production export activates the flag. Relative/out-of-page
uploaded photo positions are still rejected.

**Actually executed in a separate Sandbox checkout:**

- DOCX test suite **492 PASS, 0 FAIL**, 8,817 assertions over 72 files,
  after resolving three architecture tests that correctly rejected an
  initial template-ID conditional in the shared model.
- Bun TypeScript `--noEmit` PASS and application build PASS earlier in this
  development round, before the final capability-gate refactor; the
  refactor's full DOCX suite passed separately.
- A new full-app browser pass produced **10 full native DOCX files with
  zero case failure files** before the sandbox stopped. The final
  runner-command exit/manifest was not captured, so do **not** treat this
  as a newly signed-off 10/10 complete acceptance result.
- Genuine app-generated V01, N01, W01 **complete DOCX files** were converted
  to full LibreOffice PDFs and first-page Web/Writer comparison images were
  generated. The visually inspected V01 comparison shows a major improvement:
  the text block, rounded date pill, initials with their circle, contact
  footer and gradient are now close to their original Web positions rather
  than clustered near the top. N01 and W01 comparisons were generated but
  not individually reviewed before session expiration.
- The earlier flow-mode full batch had Writer/PDF rendering **10/10**,
  **four pages per dossier**, and visible centered initials **8/8**, but
  failed overall source-layout parity; those successes must not be
  conflated with this new position-aware build.

**Still NO-GO:** exact pixel parity across all 10 full title pages,
photo crop/overlap visual reviews, Microsoft Word Save/Reopen, and
user-facing product export enablement. Writer is not Desktop Word.
No merge, main/dev changes, CI run, or Vercel deployment.


## Final 10-case authored-page visual QA — 21 October 2026

**Tested code revision:** `29116c7f715f487381330e6654e7027a5e4c6a3f`
(`fix/docx-next-shared-fidelity-18okt`, QA mode only).
**Isolated environment:** separate Vercel Sandbox from an existing QA
snapshot, clean detached Git worktree, Bun, Playwright/Chromium, LibreOffice
Writer 26.2.6. No production deployment, merge, or CI rerun.

The final **true application download test ran to completion**:
**10/10 downloaded**, **0 failures**, 10/10 full DOCX Writer→PDF
conversions, **four pages each**. All eight no-photo cases contained
visible editable initials with measured circle-centering deviations
between **0.03–0.09 mm**. The other two cases preserved source photos.
The full focused DOCX suite previously ran **492/492 PASS** (8,817
assertions), and this exact branch revision also passed **TypeScript
`--noEmit`** and the application **production build** (both exit 0).

The previous severe vertical collapse of title/date/contact was corrected
by the *source-positioned* `coverComposition: "graphic-family-qa"`
composition; the source palette, circle/gradient motif, date pill,
photo and contact/bottom-zone positions now closely track the Web.
The common code gates this behind a declared template capability, not
per-template ID branches. Production DOCX/PDF remain unchanged.

| Case | Saved cover | Writer pages | Web/Writer page-1 pixel agreement* |
|---|---|---:|---:|
| V01 | Verlauf baseline | 4 | 99.26% |
| V02 | Verlauf 115% | 4 | 99.09% |
| V03 | Verlauf photo | 4 | 99.23% |
| V04 | Verlauf long date | 4 | 98.93% |
| N01 | Neon baseline | 4 | 99.06% |
| N02 | Neon hidden rule | 4 | 99.09% |
| N03 | Neon photo | 4 | 99.04% |
| W01 | Freundlich baseline | 4 | 99.12% |
| W02 | Freundlich long name | 4 | 98.91% |
| W03 | Freundlich long contact | 4 | 99.00% |

*Simple normalized RGB pixel similarity after matching each full A4
render to the **actual saved Web screenshot at 686×970**; this is
not SSIM, font identity proof, or pixel-perfect Word acceptance. Low-frequency
background graphics strongly influence this score, so visual spot checks
remain necessary. Five paired screenshots are preserved under
`docs/qa/docx-next-cover-graphic-visual-21okt/` with Web on the **left**
and Writer on the **right**:
[V01](docx-next-cover-graphic-visual-21okt/V01-web-vs-writer.jpg),
[N01](docx-next-cover-graphic-visual-21okt/N01-web-vs-writer.jpg),
[W01](docx-next-cover-graphic-visual-21okt/W01-web-vs-writer.jpg),
[V03 photo](docx-next-cover-graphic-visual-21okt/V03-web-vs-writer.jpg),
[N03 photo](docx-next-cover-graphic-visual-21okt/N03-web-vs-writer.jpg).
[All ten machine-readable results](docx-next-cover-graphic-visual-21okt/writer-visual-report.json).

**Remaining NO-GO:** No Microsoft Word desktop edit/save/reopen acceptance,
no 10-case Word visual confirmation, no production export activation.
Writer visual agreement is valuable evidence, not a replacement for Word.
No user test is requested at this stage.


## Automated real-DOCX visual audit — added after source-positioned cover work

A standalone, **read-only source-data** visual auditor now lives at
\`scripts/docx-next-cover-writer-visual.py\`. It processes the **real**
\`full-app-native.docx\`, \`snapshot.json\`, \`web-cover.json\`, and
\`web-cover.png\` files from the 10-case application download. For each
case it invokes LibreOffice Writer headless (not Microsoft Word), renders
the complete document to PDF, counts pages, extracts first-page glyph
positions using Poppler, compares major editable cover fields against
the captured Web coordinates, checks no-photo initials against their
saved avatar center (2 mm tolerance), and writes
\`writer-visual/web-vs-writer.jpg\` and batch-level
\`writer-visual-evidence.json\`. Missing comparison text and large
position drift explicitly require review: successfully opening a DOCX
is **not** considered visual acceptance.

To run in a prepared sandbox with LibreOffice, Python Pillow, Poppler,
Playwright and Chromium, without touching the productive export:

\`\`\`bash
DOCX_NEXT_FULL_APP_QA=1 \
  bun scripts/docx-next-cover-family-ten.ts /tmp/docx-family-complete
python3 scripts/docx-next-cover-writer-visual.py \
  /tmp/docx-family-complete --soffice /opt/libreoffice26.2/program/soffice
\`\`\`

**Verification status:** the Python algorithm was syntax-checked and
smoke-tested locally against a synthetic four-page DOCX; it deliberately
returns REVIEW when Web comparison fields are absent. The committed
version and the complete genuine 10-case batch were **not rerun** after
this addition. New Vercel Sandbox creation returned HTTP 402 because
the Hobby account's snapshot-storage allowance is exhausted until
1 November 2026. No snapshots or billing settings were changed.
The earlier genuine full-app and Writer evidence and **NO-GO** remain.

Writer evidence never substitutes for Microsoft Word edit/save/reopen
and the output report intentionally says \`PASS_WITH_LIMITATIONS\`, not
product approval.


## Consolidation: actual ten-case Writer visual report (same branch)

A separate executed Writer visual-evidence packet has since been committed
under \`docs/qa/docx-next-cover-graphic-visual-21okt/\`, including five
representative **full-document** Web/Writer JPG comparisons and
\`writer-visual-report.json\`.

The executed report has **10/10 four-page Writer documents**. Its
all-page-one RGB pixel similarity ranges from **98.91% to 99.26%**
at equal 686×970 resolution; **8/8 no-photo initial pairs** report
measured centers within 0.09 mm on each axis, while V03/N03 are the
uploaded-photo cases. These are report-measured results, **not** a
substitute for opening the images, inspecting all text/photo contours,
or Desktop Microsoft Word Save/Reopen. The image similarity is a broad
mean RGB metric heavily weighted by background pixels; do not silently
translate it into 99% semantic fidelity. The earlier notation that
only V01 was visually inspected refers to the first session; it is
superseded for the set of measured cases by this later evidence packet.

The newly committed \`scripts/docx-next-cover-writer-visual.py\` is
an **independent, stricter future QA harness**, not the producer of
this already published ten-case report. It explicitly flags missing
major cover text, gross x/y drift, missing avatar glyphs, or an
unexpected page count; its own ten-case run remains unexecuted because
fresh sandbox creation is currently blocked by the Vercel storage
quota. The historic and newly added source evidence must not be
combined into an imaginary new test execution.

**Status: Writer visual evidence 10/10; Desktop Microsoft Word 0/10;
production still NO-GO.** No CI rerun, branch merge, or deployment.
