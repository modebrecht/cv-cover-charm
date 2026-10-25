# Native crop precision — read-only audit

The existing source/saved packages from [stable run 37658539654](https://github.com/modebrecht/cv-cover-charm/actions/runs/37658539654), exact source `77775d93`, are audited independently of render geometry and original-photo restoration. No new native cases run, no DOCX/XML/PDF is modified, and no tolerance changes. [Exact evidence](sidebar-crop-precision-evidence.json) retains the actual runtime/interface, package hashes, original decoded pixel hashes, integer crop values, native EMU extents and exact stopped/unrendered plan.

`docx-next-crop-precision-qa.py` uses exact rational arithmetic to convert native crop percentages into windows on the original decoded pixel grid. Numeric comparisons are unavailable if the original pixels or dimensions change. It verifies packages against the actual render report before reading them, skips unrendered cases, and compares the committed observation baseline while ignoring only nondeterministic saved-package metadata hashes. The strict exact-crop gate in the existing native QA remains unchanged.

## Existing actual observations

All three stable controls keep the identical 120×180 RGBA original photo. The two zero-crop controls keep the full 120×180 window. The cropped rectangle changes its parameters and remains blocked:

| Original pixel window | Before native save | After native save | Difference |
| --------------------- | ------------------ | ----------------- | ---------- |
| Left edge             | 10.08              | 10.0536           | −0.0264    |
| Top edge              | 43.92              | 43.9128           | −0.0072    |
| Right edge            | 106.08             | 106.0536          | −0.0264    |
| Bottom edge           | 139.9194           | 139.941           | +0.0216    |
| Width                 | 96                 | 96                | 0          |
| Height                | 95.9994            | 96.0282           | +0.0288    |
| Center X              | 58.08              | 58.0536           | −0.0264    |
| Center Y              | 91.9197            | 91.9269           | +0.0072    |

This is a shifted/slightly enlarged crop window on preserved original pixels. It is not the separate cropped ellipse's destructive 96×96 asset replacement. The fourth frame case remains unrendered after the rectangle's strict crop failure.

All three recorded stable frame extents exactly equal the source extents rounded to whole Word twips (635 EMU per twip). Width 34 mm changes by +0.007777778 mm; uncropped height 51 mm changes by −0.005972222 mm; cropped height 34 mm changes by +0.007777778 mm. This establishes an arithmetic match for these extents, not the cause of the crop-value changes.

The existing Dev 26.8/soffice CLI rectangular zero-crop control shows the same extent arithmetic, full original pixels and an unchanged full window. It still stops on field identity with only 3/8 IDs. The other three Dev controls remain unrendered. Runtime-versus-interface causality remains unproven.

## Verification and setup recovery

Nine new tests cover exact edge/size/center differences, zero-crop independence from extent rounding, extents outside nearest-twip arithmetic, reduced or changed original pixels, invalid/empty windows, read-only packages, stale package evidence and narrow baseline exclusions. Existing photo/frame/PDF tests remain in place.

On source `f77c1deb`, [application run 37662295886](https://github.com/modebrecht/cv-cover-charm/actions/runs/37662295886) completes successfully, including all eight browser groups. Supported-sidebar and stable-comparison also pass. The initial and repeated picture jobs in [stable run 37662295842](https://github.com/modebrecht/cv-cover-charm/actions/runs/37662295842) time out while Playwright's APT setup repeatedly contacts `azure.archive.ubuntu.com`, before runtime setup, fixture generation or native document verification. There are no native artifact results for those jobs. The picture workflow now uses the official Ubuntu HTTPS archives, bounded HTTP/HTTPS timeouts and one retry, plus a six-minute browser-setup limit. Ubuntu suites/signature verification, browser version, pinned stable engine packages and every document gate remain unchanged. Actual successor CI is verified separately.

## Source arithmetic and prospective control

The official `libreoffice-25.8.7.3` tag resolves to commit `30742500f2d3eb4366ac312fa33d3dcabdb3eba5`. The evidence fingerprints the downloaded source files. [GraphicHelper](https://github.com/LibreOffice/core/blob/30742500f2d3eb4366ac312fa33d3dcabdb3eba5/oox/source/helper/graphichelper.cxx) derives an integer device scale per meter. [DrawingML import](https://github.com/LibreOffice/core/blob/30742500f2d3eb4366ac312fa33d3dcabdb3eba5/oox/source/drawingml/fillproperties.cxx) converts percentages into integer hundredths of a millimeter. [Writer's crop item](https://github.com/LibreOffice/core/blob/30742500f2d3eb4366ac312fa33d3dcabdb3eba5/svx/source/items/grfitem.cxx) converts these to stored twips and back, with the Writer property map enabling that conversion. [DOCX export](https://github.com/LibreOffice/core/blob/30742500f2d3eb4366ac312fa33d3dcabdb3eba5/sw/source/filter/ww8/docxattributeoutput.cxx) converts queried lengths back to crop percentages using the graphic's preferred size.

With an assumed 96 DPI pixel device, import uses 3780 pixels per meter and an original size of 3175×4762 hundredths of a millimeter; export's direct pixel-to-length conversion uses 3175×4763. Exact rational arithmetic through those integer conversions reproduces every recorded crop value:

| Edge   | Authored percent units | Imported mm/100 | Stored twips | Queried mm/100 | Predicted and actual export |
| ------ | ---------------------- | --------------- | ------------ | -------------- | --------------------------- |
| Left   | 8400                   | 267             | 151          | 266            | 8378                        |
| Top    | 24400                  | 1162            | 659          | 1162           | 24396                       |
| Right  | 11600                  | 368             | 209          | 369            | 11622                       |
| Bottom | 22267                  | 1060            | 601          | 1060           | 22255                       |

This is a source-backed arithmetic match. The actual native default-device DPI, intermediate UNO values and Ubuntu backport patches are not instrumented, so causal attribution remains explicitly incomplete. It does not justify converting arbitrary user crops or weakening the exact gate.

A **separate prospective two-control matrix** now starts from the byte-identical verified uncropped rectangle, then declares the measured rectangle window through ordinary frame settings: 34×34.0099875 mm, zoom 1.25 and adjusted pan. The ordinary shared renderer produces exact crop `8378/24396/11622/22255`. Full original photo, complete paragraphs, eight IDs, diagnostic normal-export rejection, immutable model and identical JSON-restored package are retained. The first source hash must equal the existing positive control. There is no renderer or package repair; the original four-control matrix and its fourth stopped case remain unchanged. Actual native success is not claimed until the prospective run completes. Every text, field, original-pixel, exact-crop/frame and visible-geometry gate still stops the experiment.

[Verified successor stable run 37675754857](https://github.com/modebrecht/cv-cover-charm/actions/runs/37675754857), exact `dfe554f5`, succeeds in all three jobs and reproduces both committed frame/crop baselines. Browser installation now completes before native QA. [Application run 37675754426](https://github.com/modebrecht/cv-cover-charm/actions/runs/37675754426) also succeeds fully in all eight browser groups. Prospective-control publication CI is checked separately.

The [actual declared-crop control](sidebar-declared-crop-status.md) now performs two cases / six pages successfully on source `8dc8bab8`: full original pixels, all eight IDs, complete text, exact unchanged crop and existing native/visible frame gates. It is locked as an independent strict baseline. The original changed-crop rectangle remains rejected; the original ellipse remains unrendered in its stopped matrix. Next is a small declared-window repeatability comparison, not arbitrary user-crop normalization. Sidebar remains blocked, 29/39 configured and 0/39 Word accepted.
