# Native Sidebar rounding — independently verified isolated engine correction, 2026-10-11

The remaining right/mirrored save drift is corrected **in a separately fingerprinted LibreOffice experiment**. The unchanged application DOCX packages pass all 22 cases, 66 native states and 564 PDF pages with exact pixels, word positions, serialized nested grids and public native separators through two saves. The stock runtime still has its original 18/22 result. This is an engine intervention, not a shipped application/export fix.

The live read-only sampler captures `NewSetTabCols` parameters for the entire canonically resolved Sidebar owner in all four affected source cases. The same process's repeated public getter identifies the matching core table pointer. Actual width is 9,638 twips; new relative positions are 6,752/7,106 on a 10,000-point grid. The original core ends with widths 6,507/341/2,790 instead of authored 6,508/341/2,789. Both `NewSetTabCols` divisions truncate mapped positions. Missing target samples in earlier attempts remain inconclusive; samples do not establish content-control object lifetime.

The intervention changes only the two unsigned divisions to `(positiveProduct + denominator/2) / denominator` in an independent copy of the exact AMD64 Writer library. It uses two bounded trampolines in verified zero executable padding; 64 file bytes change. The stock library remains SHA-256 `ecc533cd929a8a044129026b519a87917803e0db7eb1c6bbec84f5511231397b`; the candidate is `dba8422194d7326f31fabb114ca120ed5cc116e4aa36b26c6c0faa43230fee85`. The candidate is never relabeled as the official pinned runtime. Source DOCX bytes, widths and normal acceptance gates are unchanged. A [source proposal](libreoffice-nearest-tabcols-proposal.patch) applies cleanly to primary commit `30742500f2d3eb4366ac312fa33d3dcabdb3eba5`; it has **not** been compiled as a complete LibreOffice source build.

An additional ten-save right/left check retains all serialized fields and exact widths. At cycles 0/1/2/5/10 both orientations retain complete visible stories and native owners with exact source pixels and word positions. The previously accumulating right drift is zero in this isolated engine. This is bounded fixture evidence, not acceptance of arbitrary widths or scripts.

An alternative unmodified-engine experiment using visual right-to-left cell order preserves widths but moves reference text about 57.4 mm on first save. Explicit nested alignment does not repair it; the alternative is rejected. No production RTL option is added.

[Compact evidence](sidebar-native-nearest-evidence.json) records the four measured native targets, exact stock/candidate fingerprints, all 22 geometry comparisons and the actual report hashes. Five experiment-boundary tests pass. The read-only sampler compiles with `-Wall -Wextra -Werror`; it is not part of the accepted runtime. All existing JSON baselines and renderer/model/application files remain unchanged.

Reproduce with the self-contained stock engine, UNO binding and shared browser fixtures from `docx-next-stable-sidebar`:

```sh
python scripts/docx-next-native-nearest-experiment.py \
  --stock-engine /tmp/qa/setup/runtime \
  --candidate-engine /tmp/qa/nearest-runtime \
  --fixtures /tmp/qa/fixtures --output /tmp/qa/nearest-results \
  --binding /tmp/qa/uno-binding --require-exact
```

The candidate and result directories must be new and independent of the stock runtime. Separate CI workflow `DOCX Next Experimental Engine Rounding` regenerates browser images and executes this experiment. [Run 38076445888](https://github.com/modebrecht/cv-cover-charm/actions/runs/38076445888) succeeds at code checkpoint `18dc7ea52c4155df9b8102ca03c82052f8bbf63b`; all five workflows are successful without a manual retry. Actual artifact 11678970966 is independently downloaded and size/digest verified (6,082,468 bytes; SHA-256 `096ab17eb14a3891f34bb41e6d2d206904c3ad9ae8428c3f12798850906bc2ce`). A fresh full local experiment on a new runtime copy reproduces the CI artifact: 22 byte-identical sources, 66 complete final control/paragraph inventories and geometry snapshots, and 564 actual PDF pages with exact pixels and word coordinates. All 44 save comparisons and 66 states also reproduce the original compact evidence. [Independent evidence](sidebar-native-nearest-independent-evidence.json) retains report hashes and verification details.

The 22 fixture JSON differences are limited to the explicit fresh-browser versus verified-browser-output-replay label. Across 44 saved DOCX packages, all ZIP parts except `word/styles.xml` are byte identical; six observed East Asian/complex-script fallback-font style differences are retained. Saved package byte equality and arbitrary-script acceptance are not claimed. Actual native-input and PDF hashes are verified independently; every rendered page is exact. Experimental geometry success never opens the production, control-lifetime or Word gates.

**Next decision:** evaluate the source proposal in an actual upstream build and choose how to support user engines. Independent reproduction is complete; a complete source build and upstream/user-engine distribution are not. An exported DOCX cannot replace the user's LibreOffice arithmetic. The supported stock-engine counterexamples remain failures; no width compensation, accepted-runtime replacement or tolerance waiver is introduced. Strong control/owner lifetime remains a separate open gate. 39/39 configured; 0/39 Word accepted; application production remains blocked.
