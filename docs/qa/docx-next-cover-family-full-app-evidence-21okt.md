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
