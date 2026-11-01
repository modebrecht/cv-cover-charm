# P2-07 — one-attribute LibreOffice content recovery

Synthetic diagnostic fixture, without photos or private data. Not a production
export fix or a Microsoft Word/App-PDF acceptance sample.

`long-gap06-zero.docx` derives from the unchanged
[`../lo-import-p2-06/long-gap-original.docx`](../lo-import-p2-06/long-gap-original.docx).
Only the empty main-cell paragraph immediately after `P202Praxis06` changes:
`w:spacing/@w:after="1"` becomes `"0"`. `word/document.xml` has the same length
and exactly one changed byte; every other ZIP part is byte-identical. The
19 critical innermost table payloads, visible text, mode 15, keepNext and
cantSplit attributes remain unchanged. The ZIP file itself is recompressed,
so the one-byte statement applies to the uncompressed document.xml part.

Native LibreOffice 24.2.7.2 on Ubuntu 24.04 produces three pages with all 18
entries and reference complete; the original loses the tail. All 18 singleton
zeroing interventions were tested. This is the only successful singleton in
that source document, proving a minimum of one edited attribute in this finite
domain. It is not a universal rule that the sixth gap must be zero. Other
repair types and other documents are outside that minimum claim.

The source of the actual search remains the pinned P2-06 pair. Replay it in the
existing workflow using `spacing_subset`, or on a Linux LO/Python host:

```bash
python scripts/dossier_lo_spacing_test.py
python scripts/dossier_lo_spacing.py \
  --fixture-dir tests/fixtures/lo-import-p2-06 --out-dir /tmp/spacing-subset
```

Use `--audit-only` only with a retained, complete native artifact directory.
It verifies saved DOCX/PDF hashes and replays the same search using saved PDFs;
it does not convert again. Do not count audit replay as another native run.

[Manifest](MANIFEST.json) pins the fixture, exact attribute/byte diff and native
observations. [Report](../../../docs/qa/p2-07-spacing-subset.md) records the run,
implementation SHA, all cases, resource measurements and remaining acceptance.
