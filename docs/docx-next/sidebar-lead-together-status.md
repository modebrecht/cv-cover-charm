# Lead-row cantSplit does not repair opening attachment

Started from clean fetched `dev` at `6ff874827702439a2ba0d9b331d207f77430e1de`. Its [stable sidebar comparison](https://github.com/modebrecht/cv-cover-charm/actions/runs/37611342421) and [application regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/37611342487) were inspected and successful.

The earlier [short opening-row probe](sidebar-row-together-status.md) left the first row unchanged. This experiment varies only that first row's `keepTogether` / native `cantSplit`: it owns the complete spanning side content and the 220 mm main lead paragraph. The short opening row remains together; main-only opening attachment, detached semantic and empty side endings, all text/IDs, widths, paint and spans remain constant.

| Sidebar | Lead row cantSplit | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate          |
| ------- | ------------------ | --------------------- | --------------------- | ------------- | --------------------- |
| Right   | true               | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Right   | false              | 2,2,2,2,2             | 1,1,1,1,1             | 21            | bounded pass          |
| Left    | true               | 1,1,1,1,2             | 1,1,1,1,1             | 21            | main opening detached |
| Left    | false              | 1,1,1,1,2             | 1,1,1,1,1             | 21            | main opening detached |

Four actual cases, 84 dossier pages, also rendered after Save/Reopen. All ten complete native fields and both complete PDF descriptions survive. Body/lane bounds and native ownership pass. Within each orientation, complete render and Save/Reopen observations are identical. The true controls retain the original main-only package bytes. Immutable JSON restoration gives identical native packages; normal export rejects all cases.

Local engine: LibreOfficeDev 26.8.0.0.alpha0. Stable 25.8.7.3 reproduction is enforced by exact-commit CI against the [evidence](sidebar-lead-together-evidence.json). Diagnostic success cannot accept the left failure. No production changes or export enablement; Microsoft Word remains pending.

```sh
bun scripts/docx-next-lead-together-probe.ts /tmp/lead-together
python scripts/docx-next-populated-row-qa.py /tmp/lead-together --matrix lead-together --observe
python scripts/docx-next-populated-row-qa.py /tmp/lead-together --matrix lead-together --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-lead-together-evidence.json
```

The next isolated [lead representation comparison](sidebar-lead-padding-status.md) is now stopped on a right-side regression.
