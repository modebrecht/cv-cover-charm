# dossier-flow failure classification

Starting dev: `d664317b8c67b8af41d593571feb272bf78b0838` (freshly fetched).

Original CI: https://github.com/modebrecht/cv-cover-charm/actions/runs/37186667114
Job `111390036729`, Browser smoke - dossier-flow: **68 passed, 1 failed**.

Failing test: `tests/e2e/dossier-docx-v2-shadow.spec.ts`, “measured multi-page Letter/CV emits explicit browser-derived Word page breaks”.

Exact blocker:

```
DOCX V2 Flow QA blockiert den Shadow-Export: letter/letter-browser-pagination-error — Mindestens eine A4-Seite enthält sichtbaren Inhalt ausserhalb des verfügbaren Seitenbereichs. Verkleinere den Inhalt oder passe die Abstände an.
```

Local reproduction at the starting code reproduced the same blocker: 3/4 V2 shadow tests passed, the long-letter case failed. This was deterministic, not a test race. It is an application measurement regression on the existing shared LetterDocument path, not a dependency of the independent Next renderer. The earlier readiness/chrome changes did not justify ignoring it.

Root cause: `LetterDocument` removes `data-letter-page` from measurement probes to exclude them from PDF/export collection. CSS also used that attribute as its template/typography scope. Probes therefore lost font and role/template styling. The first-flow probe started body text 244.23 px after its text-layer top, while the real page started it 285.81 px after that top; capacity was overestimated by 41.58 px. Rendered body ended 32.64 px below the available text area. The physical-overflow assertion correctly stopped the export.

Fix: `data-letter-canvas` is now the permanent CSS hook. `data-letter-page` remains solely the exported physical-page marker. Measurement probes keep the first hook and lose only the second. The height sandbox stays inside the same authored canvas/role context instead of being attached to `document.body`. It is hidden, fixed and removed before export/preflight.

No overflow tolerance, export assertion or test was weakened. Three CSS source-contract tests now check the permanent styling hook. An added real-browser regression compares template/user recipient and body typography on measurement/real pages, confirms all physical pages fit, and confirms probes never enter export page counts.

Validation evidence is recorded in `stabilization-report.md`. Existing production PDF and portable JSON paths use the same fixed pagination; Legacy/V2 renderer code is unchanged.

## CI follow-up: new regression-test readiness race

Run https://github.com/modebrecht/cv-cover-charm/actions/runs/37195813448 on `9a9c0fc` passed the original measured multi-page export and all other 68 existing checks, but the added measurement test read the initial one-page state. Its exact failure was `expect(evidence.pageCount).toBeGreaterThan(1)`, received `1`: **69 passed, 1 failed**. A previously ready default/hydration state is not proof that the saved long fixture has finished measurement; network idle is not that proof either.

The test now waits for `Absatz 22:` in physical content, measured multi-page output and pagination readiness, then explicitly waits for the requested 13 pt body/15 pt recipient typography. All original final assertions remain, including page count, real overflow rejection and probe exclusion. Ten consecutive local runs pass (36.9 seconds). This is a condition-based test-race fix, not a retry, sleep or relaxed assertion. The current commit's GitHub dossier-flow result remains the authoritative CI gate.
