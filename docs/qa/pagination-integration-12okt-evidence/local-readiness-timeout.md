# Lokaler Editor-Readiness-Timeout

Erster fokussierter Lauf: 3 PASS / 1 FAIL vor der Inhaltsprüfung. Vollständiger Fehlerabschnitt des unveränderten Logs `integration-focused.log`; dessen SHA-256 steht in `local-provenance.json`. Einmalige gezielte Wiederholung mit denselben Assertions: 1 PASS. Abschliessende CI: 11/11 Gesamtdossierfälle PASS ohne Retries.

```text
  1) tests/qa/pagination-combined.qa.ts:50:3 › combined long dossier preserves Web pages and logical PDF content: joint-studio3-right-sidebar-long-word-margins

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator: getByRole('button', { name: 'Download', exact: true })
    Expected string: "true"
    Received string: "false"
    Timeout: 15000ms

    Call log:
      - Expect "toHaveAttribute" with timeout 15000ms
      - waiting for getByRole('button', { name: 'Download', exact: true })
        12 × locator resolved to <button type="button" aria-expanded="false" data-editor-ready="false" data-tsd-source="/src/routes/anschreiben.tsx:786:11" class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60 sm:px-4">…</button>
           - unexpected value "false"


       at ../e2e/support/dossier-gallery-shared.ts:96

      94 | export async function waitEditorReady(page: Page) {
      95 |   const toggle = page.getByRole("button", { name: "Download", exact: true });
    > 96 |   await expect(toggle).toHaveAttribute("data-editor-ready", "true", { timeout: 15_000 });
         |                        ^
      97 |   return toggle;
      98 | }
      99 |
        at waitEditorReady (/workspace/scratch/0d31ce0a7bd9/cv-cover-charm/tests/e2e/support/dossier-gallery-shared.ts:96:24)
        at loadFixture (/workspace/scratch/0d31ce0a7bd9/cv-cover-charm/tests/qa/pagination-browser.ts:59:9)
        at /workspace/scratch/0d31ce0a7bd9/cv-cover-charm/tests/qa/pagination-combined.qa.ts:81:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/pagination-combined/pagination-combined.qa.ts--97c59-t-sidebar-long-word-margins/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/pagination-combined/pagination-combined.qa.ts--97c59-t-sidebar-long-word-margins/error-context.md


  1 failed
    tests/qa/pagination-combined.qa.ts:50:3 › combined long dossier preserves Web pages and logical PDF content: joint-studio3-right-sidebar-long-word-margins
  3 passed (3.6m)
```
