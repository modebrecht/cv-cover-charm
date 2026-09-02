# M9 Post-Review Audit — 2026-09-02

Repository: `modebrecht/cv-cover-charm`  
Branch: `letter-m1-m2`

Status: **ACTIVE — IMPLEMENTED / POST-FIX BROWSER + RE-GALLERY VALIDATION BLOCKED**

M9 is **not DONE**. This checkpoint records the follow-up audit after the full 39-PDF human review and keeps the historical pre-fix evidence intact.

## Current product head audited

- head before this History-only checkpoint: `94d14583c4fe252132053e293907bc6533af026e`
- Vercel status: **success**
- latest regression run: `33666650833`
- GitHub-hosted runner state: job created, no executable steps, browser matrix skipped

The GitHub Actions failure is still an external runner-assignment failure, not a failing M9 assertion.

## 39-PDF review evidence

The complete gallery from the already M6-validated SHA was downloaded and reviewed page-by-page:

- source SHA: `a646f1ace6b9d6170b7510143052763410a3e1f8`
- gallery run: `33632220564`
- final artifact: `gesamtdossier-pdf-galerie`
- artifact id: `9847417879`
- artifact digest: `sha256:05b141d8b3dfcc75ba2424f7b6b63662ea3f3516c44953fe722b1891f1adabdb`
- 39 dossiers
- 156 rendered pages reviewed

Human classification remains:

- title pages: **PASS**
- motivation letters: **PASS**
- first CV pages: **PASS / POLISH**
- reference-only continuation page: **BLOCKER — 39/39 before fix**

## Additional pagination audit

A representative Modern dossier was re-rendered at high resolution and measured after the original review.

The visual page showed substantially more free vertical space on the first CV page than the reference-only continuation consumed. The reference block itself was small enough that visual evidence alone does not justify claiming the spill was caused only by insufficient physical page capacity.

Therefore the earlier root-cause wording is refined here:

- the visible symptom was real and systematic;
- normal `DEMO_CV` did not explicitly assign references to page 2;
- pagination decided to move the final reference block despite visibly available space;
- repeated CV section rhythm was one contributing pressure and is now intentionally tighter;
- the exact post-fix pagination behaviour still requires the dedicated browser regression before M9 can be closed.

This avoids overstating a root cause that has not yet been re-measured in a running post-fix browser session.

## Single-source M9 density policy

The intended product fix already exists centrally in `src/styles.css`:

```css
[data-cv-main] [data-cv-section] {
  margin-top: 3.2mm !important;
  margin-bottom: 1.5mm !important;
}
```

It deliberately preserves:

- font sizes;
- A4 margins;
- template motifs/backgrounds;
- sidebar-specific density;
- user-entered content;
- the same semantic hooks for hidden measurement and real CV pages.

During this audit a second temporary density rule was added to `layout-options.css`, detected as duplicate policy, and removed again immediately. The final code keeps **one source of truth only**. No second CV rhythm policy remains.

## M9 browser contracts already present

### `cv-m9-pagination`

`tests/e2e/cv-demo-pagination.spec.ts` iterates all registered selectable templates and requires:

- normal `DEMO_CV` renders on exactly one CV page;
- `Referenzen` remains present;
- `Herr Thomas Weber` remains present;
- compacting does not replace the extra page with clipped content.

This is already wired into the regression workflow as the dedicated `cv-m9-pagination` browser group.

### `m9-responsive`

`tests/e2e/dossier-responsive-product-smoke.spec.ts` covers:

- 360 × 780;
- 390 × 844;
- 768 × 1024;
- 1280 × 900;
- Titelblatt;
- Lebenslauf;
- Motivationsschreiben;
- no app-level horizontal scrolling;
- mobile editor-panel toggles;
- preview contained in viewport;
- download menu contained in viewport.

This is already wired into the regression workflow as `m9-responsive`.

## Validation still required

When GitHub-hosted runners are available again:

1. Run full regression on the exact current product head.
2. Require `cv-m9-pagination` green for all selectable templates.
3. Require `m9-responsive` green for all four viewport classes.
4. Manually run the 39-PDF gallery on that same validated product SHA.
5. Confirm the reference-only continuation page is gone in all 39 normal dossiers.
6. Human-review the regenerated gallery again.
7. Record remaining findings as `PASS`, `POLISH` or `BLOCKER`.
8. Mark M9 DONE only with zero unresolved BLOCKER findings.

## Milestone state

- M6: **DONE**
- M7: **IMPLEMENTED / VALIDATION BLOCKED**
- M8: **IMPLEMENTED / VALIDATION BLOCKED**
- M9: **IMPLEMENTED / POST-FIX VALIDATION BLOCKED**
- M10: **NOT STARTED**

Do not start M10 until the M7–M9 release gates have actually executed successfully.
