# Declared rectangle crop — isolated positive native control

The separate two-control matrix on source `8dc8bab8` performs **two actual cases / six dossier pages**, actual native Save/Reopen and second PDFs. [Picture job 112984479860](https://github.com/modebrecht/cv-cover-charm/actions/runs/37677441929/job/112984479860) succeeds. [Exact evidence](sidebar-declared-crop-evidence.json) records its original/saved package hashes, source pixels, full field/text and visible/native measurements. No renderer, source XML, application template, model schema or production export is changed.

| Actual control                             | Field IDs | Full native/PDF text | Original 120×180 RGBA | Exact native crop                 | Existing frame/visible gates |
| ------------------------------------------ | --------- | -------------------- | --------------------- | --------------------------------- | ---------------------------- |
| Verified uncropped body rectangle          | 8/8       | Pass                 | Identical             | Zero, unchanged                   | Pass                         |
| Separately declared cropped body rectangle | 8/8       | Pass                 | Identical             | 8378/24396/11622/22255, unchanged | Pass                         |

The experiment starts from the byte-identical existing positive source, SHA-256 `8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df`. The second source is `8792017431b1a913da220b55a4fc7e5d83db749a55eee085741935bbc0856222`. Ordinary declarative frame settings describe the previously measured window: zoom 1.25, adjusted pan and height ratio. The shared renderer emits those percentages directly; no post-generation package change occurs. Portable model JSON restores the identical source package, full paragraphs and original photo; ordinary application export rejects both diagnostic models.

The cropped source window `[10.0536, 43.9128, 106.0536, 139.941]` on the original pixel grid remains exactly unchanged after native save. Its frame model is 34×34.0099875 mm, authored DOCX extent is 34×34.01 mm and native saved extent is 34.007778×34.007778 mm. This usual extent rounding passes the existing frame tolerance; crop equality itself remains exact. Source/saved actual visible clip and four border edges pass unchanged checks. All **12 actual source/saved page PNGs** are byte-identical to pages already inspected from the original frame artifacts; there are no new unique visual pages.

The [source arithmetic audit](sidebar-crop-precision-status.md) reproduces the earlier changed percentages through integer millimeter/twip/percent conversions under an assumed 96 DPI device. This new prospective result confirms that the declared window is stable for this specific photo/control/runtime. It does not instrument every intermediate, prove a universal device-independent crop algorithm or justify changing arbitrary user inputs.

The original four-case matrix stays unchanged: its authored cropped rectangle still changes exact crop values and stops, with the fourth ellipse unrendered. The separately rendered ellipse calibration still loses its full original asset. The existing Dev zero-crop replay still loses five IDs. Table captions, long-opening attachment, Word and snapshots remain open. A positive body rectangle does not certify Sidebar or other picture shapes.

## Regression policy and next task

The positive matrix now runs with **strict native failure behavior**, without `--observe`, and compares every native/render/precision result, source hash and actual case/page plan against the actual baseline. Only nondeterministic saved-package metadata hashes are excluded. Text/field/original-pixel/exact-crop/frame/visible loss fails CI. The original negative-observation matrix retains its strict stopped gate and exact baseline independently.

The archive/timeouts setup confirmed by the successful picture job is shared by the native browser decoders, application browser groups and web gallery through `scripts/qa-browser-setup.sh`, each with a six-minute install limit. A completed application job also records retries for Ubuntu font downloads at the Azure mirror; the last experiment-source browser group still waits in installation at publication. Its specific live-log cause is not established. Suites/signatures, locked app dependencies, Playwright version, stable engine manifest and every test remain unchanged. Final publication CI verifies the complete result.

The exact experiment-source application and other stable jobs are checked separately; final baseline-publication CI is checked at its actual source. Sidebar remains blocked, **29/39 configured, 0/39 Word accepted**. No production export acceptance follows.

**Next bounded task:** test the precision hypothesis against a small set of separately declared crop windows, beginning with this actually verified positive control. Keep the original stopped matrix and every strict gate intact; do not introduce an arbitrary-crop normalization policy until its portability is established.
