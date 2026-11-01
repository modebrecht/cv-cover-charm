# P2-06 — collective empty-paragraph spacing counterprobe

Two synthetic image-free DOCX fixtures, native run 41298301313, implementation
`695ad4fd7b4e9d254e7ea1cba11f408e6ca8582a`. They need headless Linux LO only;
no app, browser, private source file, Windows or Word session.

| Fixture | Observed in LO 24.2.7.2 | Result scope |
|---|---|---|
| long-gap-original.docx | 3 pages, 15/18 entries complete, blank page-3 body | content FAIL |
| long-gap-zero.docx | 3 pages, 18/18 entries complete, final reference visible | content PASS |

Their parsed document.xml trees differ in exactly **18 w:spacing/@w:after values**
on empty paragraphs directly in the main cell: sixteen 1-twip and two 72-twip
values become 0. All visible text, all 19 innermost station/reference tables and
their order remain identical. Every other package member, including settings,
is byte-identical. keepNext, cantSplit and compatibilityMode=15 remain unchanged.
There are no media parts, native content controls or header/footer references.
The original is the already committed P2-04 long-coupled diagnostic fixture.

This is a collective spacing counterprobe, not a one-byte bug claim. Isolated
1- and 72-twip gap additions to the simpler entry-only control did not reproduce
the failure. The smallest sufficient failing spacing subset is unknown. The
zeroed copy changes intended spacing: its first station begins 1.270 mm higher,
although the body-name origin is unchanged. No App/Word/product layout acceptance.

MANIFEST.json binds each DOCX/part hash, observed page-pixel signatures and the
complete 18-attribute diff. The main report and all 23 cases are in
`docs/qa/p2-06-preamble-flow.md`. Whole native artifact retention is 14 days;
these committed fixtures remain after that period.

Replay from repo root with LO 24.2.7.2 and the tested Liberation/Cabin fonts:

```bash
p206_profile="$(mktemp -d)"
p206_output="$(mktemp -d)"
timeout 90s libreoffice --headless \
  "-env:UserInstallation=file://$p206_profile" \
  --convert-to pdf --outdir "$p206_output" \
  tests/fixtures/lo-import-p2-06/*.docx
```

Confirm two nonempty PDFs and inspect all three pages of both files. Exit 0
alone is not conversion evidence. The workflow runner enforces output checks,
per-copy timeouts, complete entry endings and original pixel controls.
