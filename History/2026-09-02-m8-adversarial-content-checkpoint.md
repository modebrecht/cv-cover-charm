# M8 Adversarial Content Checkpoint — 2026-09-02

Repository: `modebrecht/cv-cover-charm`  
Branch: `letter-m1-m2`  
Validated product/build head at checkpoint: `8450e8bddc81ed355ed17efb1495d9e6fb2a0237`

Status: `IMPLEMENTED / VALIDATION BLOCKED`

M7 remains `IMPLEMENTED / VALIDATION BLOCKED` because GitHub Actions currently creates Ubuntu jobs with `runner_id: 0` and executes zero steps. M8 QA hardening was continued without marking M7 done because the remaining M7 blocker is external runner availability, not unresolved product implementation.

## M8 work implemented

- [x] Added `tests/e2e/letter-adversarial-content.spec.ts` as a dedicated `letter-m8-edge` regression group.
- [x] Very long first/last-name coverage.
- [x] Hyphenated/apostrophe-name coverage.
- [x] Umlaut/accent/Unicode coverage.
- [x] Long company/contact/address coverage.
- [x] Long e-mail coverage.
- [x] Swiss phone-number format coverage.
- [x] Short motivation-letter body coverage.
- [x] Normal motivation-letter body coverage.
- [x] Long but intended-to-fit body coverage.
- [x] Deliberately too-long body coverage.
- [x] No-attachment coverage.
- [x] One-attachment coverage.
- [x] Many-attachment coverage with explicit fit-or-block truth.
- [x] Header/footer mode coverage is combined with the existing M1–M5 mode matrix.
- [x] Individual contact-toggle combinations are exercised across the existing header-mode regression and the new adversarial cases.
- [x] Rich text with paragraphs, bold, italic and list markers.
- [x] Square-wrap letter image/text-flow coverage.
- [x] Images close to content boundaries.

## Product bug found and fixed

The previous one-page preflight only measured `[data-letter-text-layer]`.

That meant the following could theoretically be clipped while the PDF gate still considered the letter safe:

- integrated contact header;
- attachment footer;
- freely placed letter images.

This was especially relevant to the `attachments` footer: its height is capped at 30 mm, so many attachment lines can exceed the visible footer content box.

`src/components/letter/preflight.ts` now treats the complete rendered page as release truth:

- text-layer overflow;
- header/footer internal clipping;
- header/footer outside A4;
- contact-header overlap with recipient content;
- letter images outside A4;
- letter images outside the safe text/content box;
- letter images colliding with the footer.

Unsafe pages are rejected by the existing PDF export path before rasterization.

## New unit contracts

- `tests/unit/letter-adversarial-content.test.ts`
  - filters blank attachments;
  - preserves Unicode attachment labels;
  - verifies long/many footer sizing and the 30 mm cap;
  - verifies hidden attachments collapse the footer;
  - verifies plain-text Unicode survives while user markup is escaped.

- `tests/unit/letter-preflight-geometry.test.ts`
  - clipped footer => overflow;
  - contact header overlapping recipient => overflow;
  - image outside safe content area => overflow;
  - healthy chrome/images => accepted.

- `tests/unit/letter-preflight-export-geometry.test.ts`
  - proves clipped attachment chrome stops standalone PDF export before html2canvas/jsPDF rasterization.

## Existing coverage reused instead of duplicated

`tests/e2e/letter-header-modes.spec.ts` already verifies:

- compact/contact/none header modes;
- compact/attachments/none footer modes;
- representative quiet/band/sidebar/frame/fresh template archetypes;
- preview/export content-box agreement;
- persistence across reload;
- long contact values without recipient collision.

`tests/e2e/dossier-letter-preflight.spec.ts` already verifies:

- missing required fields block the dossier;
- deliberately huge letter content blocks export;
- a long but valid letter remains downloadable.

## Current validation state

- Vercel deployment/build for `8450e8bddc81ed355ed17efb1495d9e6fb2a0237`: `SUCCESS`.
- GitHub Actions regression jobs still fail before execution with zero steps and `runner_id: 0`.
- Therefore no test failure has been observed on the M8 assertions; they simply cannot currently be executed by GitHub-hosted runners.

## M8 exit gate

- [ ] No scenario silently clips or loses user content — implementation/test contract exists, full runner proof pending.
- [ ] Unsafe output is blocked or clearly flagged by preflight — implementation/test contract exists, full runner proof pending.
- [ ] No content/header/footer/image overlap remains in supported scenarios — full browser proof pending.

Do not mark M8 `DONE` until the regression suite receives a real runner and `letter-m8-edge` passes.

## Next action

When GitHub Actions runner availability returns:

1. run `Dossier Regression` manually on the current branch head;
2. require fast checks and all browser groups, including `letter-m8-edge`, to pass;
3. if M7 state-integrity tests and M8 adversarial tests are both green, close M7 and M8 with a new additive History checkpoint;
4. only then proceed to M9 visual/product acceptance.
