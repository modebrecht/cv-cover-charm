# Native Sidebar rounding — isolated engine correction, 2026-10-10

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

The candidate and result directories must be new and independent of the stock runtime. Separate CI workflow `DOCX Next Experimental Engine Rounding` regenerates browser images and executes this experiment; its first independent result is pending at publication. Experimental geometry success never opens the production, control-lifetime or Word gates.

**Next decision:** verify the independent engine result, then evaluate the source proposal in an actual upstream build and choose how to support user engines. An exported DOCX cannot replace the user's LibreOffice arithmetic. The supported stock-engine counterexamples remain failures; no width compensation, accepted-runtime replacement or tolerance waiver is introduced. 39/39 configured; 0/39 Word accepted; application production remains blocked.
