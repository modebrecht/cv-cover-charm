# Modern reading defaults and native footer edge coverage

**PARTIAL. The approved 20-mm / 14-px settings are now code defaults for Modern in the classic CV layout, with explicit saved values preserved. A real right/bottom paint gap is confirmed in the returned Word PDF. One bounded native coverage candidate passes engineering and supplementary checks; its Word visual/editing/Save/Reopen acceptance remains UNVERIFIED.**

Branch: `investigate/docx-next-design-fidelity-16okt`. Parent: `719e6da6c1c6117ea111129d5af65b56ed47ae87`. Remote dev was re-fetched at `8901a830a792d75e9e792345c5180827218b4e1e`. No merge, deployment, PR, CI dispatch or export-engine-default switch. The Web changes are saved on this branch, not deployed to the live application.

## Returned evidence

The supplied PDF and screenshot were both available locally and inspected, despite the attachment display error in the conversation. The [original Word PDF](docx-next-modern-defaults-footer-18okt/word-before-05.pdf) identifies Microsoft Word for Microsoft 365, has four A4 pages, and contains all seven rubric labels within their backgrounds. Their native nominal size is 10.5 pt; this Word PDF reports 10.56 pt. The user approved the smaller text and increased continuation margin. No returned DOCX was supplied in this round, so this PDF cannot prove the saved package structure or a close/reopen sequence for candidate 05.

The [screenshot](docx-next-modern-defaults-footer-18okt/user-footer-edge.png) includes Word's surrounding page frame. Independently of that UI frame, the PDF contains an actual narrow gap. On its three interior pages:

| Geometry              |            Right edge |           Bottom edge |
| --------------------- | --------------------: | --------------------: |
| Word PDF paper        |             595.32 pt |             841.92 pt |
| Decorative page image |             595.25 pt |           841.8498 pt |
| Unpainted difference  | 0.0700 pt / 0.0247 mm | 0.0702 pt / 0.0248 mm |

The source image fills exact 210 × 297 mm, while `w:pgSz` serializes an integer twip page (11906 × 16838). Drawing extents use EMU. The mismatch between actual PDF paper and paint is confirmed. Whole-twip picture import followed by PDF paper rounding explains the numbers, but Word's internal rounding path remains an inference. This is separate from inactive-header/footer colour dimming; that cancelled request is untouched.

## Defaults stored in shared application code

`src/components/cv/reading-defaults.ts` owns the reviewed defaults for **template Modern, layout classic only**: 20-mm continuation top margin and 14-px rubric size. Other templates, other layouts, Modern Sidebar and its legacy executive alias retain their former defaults. Explicit current and legacy margin values remain authoritative; explicit rubric sizes remain authoritative. No localStorage migration overwrites user choices.

The existing Web canvas, controls, presentation hook and DOCX snapshot use this shared rule. A missing rubric size is resolved into the canonical snapshot before metric keys are constructed. Thus a former implicit-size measurement does not masquerade as a fresh measurement for the new effective size. The renderer still receives immutable canonical input; it does not consult browser stores or Web defaults.

The margin reset button reports the active scoped default. The existing rubric reset returns to the template default, which is now 14 px for this reviewed scope. Explicit 10-mm projects stay at 10 mm, and saved custom typography remains unchanged. PDF/Print and Legacy exporter implementations are unmodified; the user's newly requested Web defaults naturally affect unconfigured Modern classic documents using the Web design.

## Bounded native paint correction

The canonical part can explicitly declare `pagePaintCoverage: "native-grid"` alongside its existing single-asset decorative composition. The controlled Modern compact/measured-header path declares it; other single-asset templates do not acquire it. Validation rejects invalid scopes, and ordinary rendering requires the existing explicit diagnostic gate. The normal export engine is not promoted or switched.

Only the nonsemantic page image uses the serialized native page grid plus **one twip of right/bottom rounding allowance**. Its new extents are 7560945 × 10692765 EMU, or 595.35 × 841.95 pt. These cover the measured Word PDF paper dimensions. This is a bounded native-unit correction derived from the page box, not a pixel-specific offset or XML repair. The existing decorative canvas is fitted fractionally to that box; semantic text, photo crops, body margins and paragraph frames are not resized or repositioned.

Relative to candidate 05, exactly four package parts differ: the normal/first Letter and CV header stories. Removing only the page-image extent attributes makes those XML trees identical. Every other package part is byte-identical, including `word/document.xml`, styles, all original media, relationships and footer stories. Both canonical interior parts differ only by the explicit coverage declaration; the cover model is identical.

## Actual verification

- **Two actual app restores/exports**: a project with neither value saved displays/exports 20 mm / 14 px; a project with saved 12 mm / 18 px retains those values. Both use fresh measurements and unchanged document stores through export. Visible controls and settled snapshots agree. The default snapshot is exactly equal to the previously reviewed explicit 20/14 snapshot.
- The default app handoff is copied unchanged as **[06-Modern-CV-Pills-Footer-Randtest.docx](docx-next-modern-defaults-footer-18okt/06-Modern-CV-Pills-Footer-Randtest.docx)**. SHA-256 `4552327d61cc0825eb39986cb271e87c4798cc17dd51b395a7961a607bf094f2`.
- Four A4 pages were rendered and every page inspected. All seven capsule-containment checks pass. All extracted native text positions are identical to the previous supplementary rendering. The new decorative image covers the supplementary PDF paper box. Raster-canvas pixels outside the fractional PDF page boundary are not treated as a remaining in-page gap.
- The three complete Web captures are byte-identical to the approved explicit-settings project; the ordinary Next baseline package is also byte-identical to that same-settings baseline. The intended change is the default selection when no value is saved. There is no full 39-template visual acceptance claim.
- **Three actual app rejection checks**: content changes during capture, content changes during rasterization, and opt-in off. No candidate download on either stale-content failure. The runner uses an actual pill project for the two freshness checks, reaching the intended failure boundary.
- **1222 unit tests PASS**, zero failures, 23369 assertions / 254 files. **409 DOCX tests PASS**, zero failures, 6286 assertions / 64 files (overlapping suite). Typecheck, formatting and complete Vite/Nitro build pass. Lint: zero errors and the existing 21 warnings. Four new tests verify scoped defaults, authoritative saved/legacy values, measured native coverage and gating/structure preservation. React review confirms derived defaults, stable getters and no new effect-driven storage synchronization.

[Validation](docx-next-modern-defaults-footer-18okt/validation.json), [verification](docx-next-modern-defaults-footer-18okt/verification.json), [rejections](docx-next-modern-defaults-footer-18okt/rejections.json), [hashes](docx-next-modern-defaults-footer-18okt/sha256.json) and [changed files](docx-next-modern-defaults-footer-18okt/changed-files.json) retain the evidence. Projects, fresh snapshots/metrics, models, app records and visible-control values are in the same folder.

## Reproduction and next Word gate

Use the existing Bun/Node/Chromium and Liberation Sans fontconfig environment. Neither dependencies nor native engine binaries change.

```sh
DOCX_NEXT_QA_TEMPLATE=modern DOCX_NEXT_INTERIOR_AUDIT=1 \
 DOCX_NEXT_RUBRIC_SPACING=1 DOCX_NEXT_COVER_CASES=cv-pills \
 DOCX_NEXT_PROJECT_PATH=docs/qa/docx-next-modern-defaults-footer-18okt/project.json \
 bun scripts/docx-next-brief-app37c.ts /tmp/modern-defaults-footer
```

Repeat with `override-project.json` for saved-value preservation. The existing explicit QA URL/button remains unchanged. Render the default download with `render_docx.py --dpi 120 --emit_pdf`. `scripts/docx-next-defaults-footer37d.py APP_CASE OVERRIDE_CASE PRIOR_SETTINGS_PACKET PRIOR_RENDER UPLOADS NEW_RENDER OUTPUT` measures the actual Word gap, checks source/structure/media equality and copies untouched evidence/candidate packages. The prior render folder belongs to the exact prior app package and is a sibling of its Web captures and baseline DOCX. The user's PDF retains its supplied `Schrift144` filename inside `UPLOADS`.

Next: open candidate 06 in Word, inspect the right and bottom footer edges on Letter and both CV pages, then save, close/reopen and export a Word PDF. Return the saved DOCX and PDF. The new Word paint coverage remains **UNVERIFIED** until that evidence is checked; supplementary coverage and successful OOXML generation do not establish Word acceptance. If it fails, diagnose this one candidate before expanding the mechanism. Arbitrary long edits, other templates and full Item 37 acceptance remain open.

Only this investigation branch is fast-forwarded. Exact-branch and wildcard Vercel exclusions remain disabled; all 16 workflow push filters exclude it. Protected refs and live branch deployment/workflow counts are checked before and after publication. Frozen Native Sidebar geometry/engine, Agent A and #14/#25/#38 remain untouched.
