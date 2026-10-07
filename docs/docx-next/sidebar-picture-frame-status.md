# Picture shape/crop controls

The guarded body-flow matrix preserves the same complete five CV paragraphs, cover/letter markers, eight canonical field IDs, original browser-normalized 120×180 photo pixels and border. It changes only declarative frame geometry: uncropped rectangle, uncropped ellipse, cropped rectangle, then cropped ellipse. Models remain immutable; portable model JSON restores the identical package; ordinary application export rejects these diagnostic models. There is no renderer change, XML modification or image renormalization between native runtimes.

## Actual stable results

[Stable run 37657394327](https://github.com/modebrecht/cv-cover-charm/actions/runs/37657394327), exact source `31de8c1e`, passes all three jobs. The frame matrix performs three actual cases / nine dossier pages, each saved and reopened into a second PDF. Two zero-crop cases pass all requirements. The third stops because the old PDF measurement reports the full transformed picture outside its actual clip. The fourth remains explicitly unrendered in this matrix. Separately, all historical diagnostic baselines, eight existing picture controls / 24 pages and 31 supported fixtures / 253 pages are freshly verified.

| Actual stable frame control   | Field IDs  | Complete text | Original native pixels           | Native crop                  | Visible result                                          |
| ----------------------------- | ---------- | ------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Uncropped rectangle, 34×51 mm | 8/8        | Complete      | Original 120×180, identical RGBA | Zero, unchanged              | Pass including four border strokes                      |
| Uncropped ellipse, 34×51 mm   | 8/8        | Complete      | Original 120×180, identical RGBA | Zero, unchanged              | Pass; saving as image-fill alone loses no source pixels |
| Cropped rectangle, 34×34 mm   | 8/8        | Complete      | Original 120×180, identical RGBA | Exact values change slightly | Fresh clipped-image and frame measurements pass         |
| Cropped ellipse               | Unrendered | Unrendered    | Unrendered                       | Unrendered                   | Stopped after cropped rectangle                         |

The actual saved rectangle crop changes `l/t/r/b` from `8400/24400/11600/22267` to `8378/24396/11622/22255` (native 1/1000-percent units). The native picture frame and original pixels survive. These are small recorded changes, not a loss of the original image. The exact crop gate remains strict and rejects the change; no claim that it is an accepted repair or universal editor behavior follows.

The fourth frame source is byte-identical to the existing body-photo calibration. That **separate, already rendered control** remains in the existing eight-case baseline job: the cropped ellipse changes from the full 120×180 original to a 96×96 cropped asset and zero crop parameters. It is not an extra executed case in the stopped frame matrix. A shape change to image-fill alone does not establish pixel loss; the uncropped ellipse retains the original pixels. Further causal attribution remains bounded to these recorded controls.

## PDF measurement corrections

The rectangular border is four actual PDF stroke edges, with authored color/thickness and an inset image. The QA independently measures all four edges and validates their image inset; an absent edge, wrong stroke width or wrong inset fails.

A cropped native rectangular image can keep its full transformed source bounding box in the PDF and display only a rectangular clip. The read-only `docx-next-pdf-picture-qa.py` inspects PDF graphics-state operations, actual image paint, transformations and clips, including saved/restored state and Form matrices/BBoxes. It verifies raw painted-image bounds against PyMuPDF, then measures the actual visible intersection and border. It does not infer an expected clipping rectangle or change the PDF. Nonrectangular/skewed unsupported cases fail explicitly. Eight adversarial PDF tests cover hidden bounds, clip nesting/restoration, Form transforms, missing clips and unsupported/crossed paths.

The same actual source/saved cropped-rectangle PDFs pass this corrected visible check. Their source/saved page PNGs are identical. This read-only reevaluation does not execute the fourth control; the strict native crop check would still stop on the third. The fresh native run at exact source `77775d93` in [stable run 37658539654](https://github.com/modebrecht/cv-cover-charm/actions/runs/37658539654) confirms the corrected measurements on all three actual cases / nine pages, also after Save/Reopen. All native field IDs, original pixels, text and visible geometry pass. It stops specifically on `picture-frame-cropped-rect:native-photo-frame-or-crop` because the exact crop values change. The fourth case stays unrendered. This actual report is now an exact committed baseline, excluding only saved-package metadata hashes; source hashes, every native/visible result and the stop plan remain compared.

## Dev and application checks

The exact unchanged no-crop rectangular source, SHA-256 `8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df`, is already replayed on local Dev 26.8/soffice CLI. It loses the photo tag and four following paragraph tags (3/8 retained), while preserving complete native/PDF text, original pixels, zero crop and correct visible geometry. It stops after one actual case / three pages; later forms stay unrendered. Cropping and ellipse geometry are therefore not required for this field-loss observation. Engine-versus-interface attribution remains unproven.

[Application run 37657500954](https://github.com/modebrecht/cv-cover-charm/actions/runs/37657500954), evidence publication `03fb91b3`, is fully successful: 1007 unit tests, release formatting, typecheck, lint/build and all eight browser groups. This resolves the missing-browser verification from the earlier failed run; it does not establish that older run's cause. Local 94 Python tests pass. Source code under `src`, application templates and existing browser tests remain unchanged.

[Exact chronological evidence](sidebar-picture-frame-evidence.json) preserves the initial stopped gate, both read-only reviews and actual native reports independently. Observation success does not accept strict-crop/identity failures. Sidebar stays blocked, 29/39 configured and 0/39 Word accepted; table captions, left long-opening attachment, Word and snapshots remain open. Application input/model JSON photo restoration still passes.

**Next bounded task:** inspect native crop-window geometry/precision read-only using the existing source/saved packages. Keep the strict exact-crop gate, the stopped fourth case and production export gates intact.

[Exact measurement-source application run 37658539544](https://github.com/modebrecht/cv-cover-charm/actions/runs/37658539544), `77775d93`, is fully successful on attempt 2. The first attempt has one existing list-marker assertion failure in dossier-flow; the unchanged-source repeat passes the entire group. All eight browser groups are successful, with no app/e2e source changes or asserted root cause. Final baseline-publication CI is checked separately.
