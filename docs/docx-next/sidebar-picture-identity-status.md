# Minimal picture/cell identity controls

Eight native controls compare plain/photo paragraphs in body flow, one ordinary zero-inset cell, and mirrored two-cell tables. Each has the same five complete CV paragraphs and canonical picture ID/source/crop/frame from the existing `photo-main` model. Absolute placement is removed once for all controls. No nested image zone, spanning cell, long boundary lead, XML patch or production change is introduced.

The probe uses the actual browser image normalizer, verifies immutable models and exact package identity after portable model JSON restoration, and rejects normal export of the diagnostic model. Input photo restoration is already covered by the supported 31-fixture run; this separate control does not claim a new application input roundtrip.

The read-only QA records every source/saved tagged field independently of complete native and visible PDF text. It checks picture count, owning cell origin, width/height, body bounds and three logical pages, then performs actual native Save/Reopen and a second PDF render. It stops immediately on field identity, text or geometry regression and marks subsequent cases unrendered. Known container-caption loss remains separately recorded and unresolved. A green observation job records rejected cases; it cannot accept them.

The stable job retains actual packages and page PNGs, and emits a synthetic ZIP replay so the identical source packages can be tested unchanged with the local Dev/CLI runtime. Runtime and interface are recorded separately; a different result does not establish which component caused it. Nine adversarial QA tests cover missing field identity despite surviving text, missing complete text, wrong picture size and separation of the caption gate.

```sh
python scripts/docx-next-fixture-images.py /tmp/picture-identity/images.json
bun scripts/docx-next-picture-identity-probe.ts /tmp/picture-identity
python scripts/docx-next-picture-identity-qa.py /tmp/picture-identity --observe
python scripts/docx-next-picture-identity-test.py
```

## Actual results

[Exact source `f5b6df27`, stable run 37632467382](https://github.com/modebrecht/cv-cover-charm/actions/runs/37632467382) and [full application run 37632467368](https://github.com/modebrecht/cv-cover-charm/actions/runs/37632467368) complete successfully. Stable checks all eight controls / 24 dossier pages, each again after Save/Reopen: every source field survives, complete text and visible picture geometry pass. All six table controls lose their captions. The separate supported job freshly passes 31 fixtures / 253 pages with browser images and immutable input/model JSON restoration.

The unchanged browser-source packages are replayed with Dev 26.8/CLI. Plain body preserves 7/7 fields. Photo body preserves only 3/8: the picture tag and all four following paragraph tags disappear, while the preceding CV field and cover/letter markers survive. Complete native/PDF text and visible picture geometry pass. The run stops after **two controls / six dossier pages**, each also saved and rerendered. Six remaining controls are explicitly unrendered. A table, nested zone, side orientation and long boundary lead are not required for this minimal field-loss result. Exact engine/interface attribution remains unproven. A separate local Kit attempt crashes in the first plain control's conversion; zero local Kit cases are accepted.

[Actual cross-runtime and native-photo evidence](sidebar-picture-identity-evidence.json) records source/saved hashes, lost IDs, stops and all render results. A read-only native-photo audit additionally finds that every one of the four stable photo saves, and the one actual Dev photo save, replaces the 120×180 original pixel asset with a 96×96 cropped asset in an image-fill shape. Native crop parameters become zero; ellipse, border color and visible size remain intact within native rounding tolerance. The full original photo cannot be restored from these **saved native packages**. This finding is distinct from the passing application input/model JSON photo restoration and does not claim that path is broken. Drawing names survive and are not substitutes for lost SDT field IDs. Five photo-audit tests distinguish changed pixels/crops/alpha from PNG recompression and recognize editor image-fill representations.

Both stable observations now have exact committed baselines, excluding only nondeterministic saved-package hashes. Any source hash, field/text/geometry result, stop plan or photo observation change fails the comparison. Diagnostic green does not accept identity or original-photo loss.

**Next bounded task:** on stable body flow, compare an uncropped rectangular picture with the framed/cropped source, keeping source pixels, paragraph IDs and text constant. Start with the uncropped control; require complete text, all native field IDs, original pixel preservation and visible geometry before isolating crop versus shape. No XML changes or production repair follow from the current evidence. Sidebar export gates stay closed, 29/39 configured and 0/39 Word accepted. The long left-opening blocker, table-caption identity, Word review and snapshots remain open.
