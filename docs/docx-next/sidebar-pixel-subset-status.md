# Native saved photo pixels — exact subsets do not preserve originals

The read-only `docx-next-pixel-subset-qa.py` audit verifies seven actually executed photo cases from existing native packages on `2a9db808`, run 37714132601 / picture job 113106603488. It does not create new native renders. Every source/saved package hash must match the actual native report and prepared manifest. Drawing identity is explicit; no identity is inferred from text or pixel similarity.

Four previously executed cropped-ellipse controls (body flow, single table cell, left and right tables) save the exact 96×96 rectangle `[10,44,106,140)` from their 120×180 originals. The new separately declared 240×360 cropped ellipse saves the exact 192×192 rectangle `[20,88,212,280)`. The two cropped rectangles in the new matrix retain their full originals and are labeled separately. [Exact evidence](sidebar-pixel-subset-evidence.json) retains five full-original failures, five exact subset matches and two full-original passes. No failure is accepted.

The actual bitmap bytes agree with the pinned upstream custom-shape crop helper's positive half-up edge rounding. The measured region matches byte-for-byte; the remaining original pixels are absent from the saved image. Each cropped asset keeps 42.6666667% of its original pixel grid. This is consistent with physical bitmap cropping, without proving an instrumented live import branch or Ubuntu backport behavior. The original application/model JSON restoration remains separate and passing.

The source/saved packages are opened only for read-only decoded RGBA comparison. No XML, image, package or PDF is changed. A matching subset cannot override full-original, exact-crop, identity or export gates. Baselines compare every source, saved pixel result and stopped/unrendered plan, ignoring only nondeterministic saved-package metadata SHA. Actual failures stay explicit.

Twelve controls cover unchanged originals, exact 192×192 crops still failing full retention, wrong source regions/colors, resized regions, half rounding, invalid/empty windows, stale source/saved packages, unrendered cases and narrow metadata exclusions. Existing native photo, clip/frame and crop tests remain intact. Final strict-publication CI is checked separately.

**Next bounded task:** verify final strict/native baselines, then resume the native Sidebar table-identity and long-opening blockers. Production and Word gates remain closed; 29/39 configured, 0/39 Word accepted.
