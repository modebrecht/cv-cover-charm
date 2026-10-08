# Original photo dimensions — bounded portability control

This independent plan starts from the byte-identical verified 120×180 cropped body rectangle (`8792017431b1a913da220b55a4fc7e5d83db749a55eee085741935bbc0856222`), followed by separate 240×360 and 600×900 original ICC JPEG inputs. Each input is authored directly at its own dimensions with the same two-color pattern; none is made by resizing the canonical 120×180 photo. The source aspect ratio stays 1.5 and all frame/zoom/pan settings, semantic IDs, complete paragraphs, margins and intended physical geometry stay fixed. All three declared crops are `8378/24396/11622/22255`.

Every package must contain its own complete canonical browser-decoded original grid/pixels. All sizes stay below the existing 1600 px browser limit, so image downscaling is not part of this comparison. Portable JSON/photo restoration, immutable models, identical restored packages and ordinary-export rejection remain required. Existing shape, positive precision and four-window matrices and strict baselines stay unchanged.

The already recorded 96 DPI arithmetic hypothesis predicts a changed crop for the 240×360 source (`8394/24388/11606/22257`). This is a prediction, not an actual native result or complete causal proof. The pinned stable LibreOfficeKit probe must render/save/reopen actual packages and stop on the first original-pixel, exact-crop, frame, identity, text or visible-geometry failure. Later controls remain explicitly unrendered after a stop.

Local source/package checks pass with the previously verified canonical 120×180 asset and an explicit Pillow adapter for the larger inputs. A local Chromium executable is unavailable, so fresh browser decoding and exact larger source package hashes are decided by CI, not inferred from the local adapter. Existing 17 picture/frame and 9 crop audit tests pass. The baseline will be recorded from actual CI evidence, preserving a stopped plan if it is negative; no crop gate or tolerance is relaxed.

Prerequisite source `b36b8fa2` has fully successful application run 37684950549, all three stable jobs 37684950487 and gallery 37684950445. Work stays on `dev`; production renderer/model/export gates are unchanged. Sidebar remains 29/39 configured, 0/39 Word accepted.

**Next bounded task:** inspect actual photo-size/native pixel-window evidence, retain stopped controls explicitly and lock an independent regression. These diagnostics do not establish arbitrary-photo/DPI portability, cropped-ellipse restoration or Word acceptance.
