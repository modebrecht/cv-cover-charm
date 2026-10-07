# Minimal picture/cell identity controls

Eight **prepared, initially unrendered** native controls compare plain/photo paragraphs in body flow, one ordinary zero-inset cell, and mirrored two-cell tables. Each has the same five complete CV paragraphs and canonical picture ID/source/crop/frame from the existing `photo-main` model. Absolute placement is removed once for all controls. No nested image zone, spanning cell, long boundary lead, XML patch or production change is introduced.

The probe uses the actual browser image normalizer, verifies immutable models and exact package identity after portable model JSON restoration, and rejects normal export of the diagnostic model. Input photo restoration is already covered by the supported 31-fixture run; this separate control does not claim a new application input roundtrip.

The read-only QA records every source/saved tagged field independently of complete native and visible PDF text. It checks picture count, owning cell origin, width/height, body bounds and three logical pages, then performs actual native Save/Reopen and a second PDF render. It stops immediately on field identity, text or geometry regression and marks subsequent cases unrendered. Known container-caption loss remains separately recorded and unresolved. A green observation job records rejected cases; it cannot accept them.

The stable job retains actual packages and page PNGs, and emits a synthetic ZIP replay so the identical source packages can be tested unchanged with the local Dev/CLI runtime. Runtime and interface are recorded separately; a different result does not establish which component caused it. Seven adversarial QA tests cover missing field identity despite surviving text, missing complete text, wrong picture size and separation of the caption gate.

```sh
python scripts/docx-next-fixture-images.py /tmp/picture-identity/images.json
bun scripts/docx-next-picture-identity-probe.ts /tmp/picture-identity
python scripts/docx-next-picture-identity-qa.py /tmp/picture-identity --observe
python scripts/docx-next-picture-identity-test.py
```

Actual stable and exact-source local evidence will be added after execution. Sidebar export gates stay closed, 29/39 configured and 0/39 Word accepted. The long left-opening blocker, table-caption identity, Word review and snapshots remain open.
