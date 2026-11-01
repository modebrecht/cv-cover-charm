# P2-03 — isolated LibreOffice experiments

Branch: `work/01nov-p2-03-lo-isolation`, base
`d15eaf0ee8476d955f5d124920414a3bdeae92aa`.

No product/exporter changes. The existing visual parity workflow generates the
same eight synthetic production downloads. Its P2-03 mode first runs the unchanged
semantic auditor, then converts twelve diagnostic copies. Baseline failures are
expected controls and must remain visible in the report. A green experiment job
means completed measurements with those original defects reproduced; it does not
mean the eight production documents pass or approve any change for Word.

## Controlled variables

- Right short CV: section left margin 0 / half, layoutInCell=1, horizontal
  reference page -> column. Each is one attribute edit. Margin probes deliberately
  change page layout and cannot be used as product fixes.
- Long left/right CV: detach both first cell paragraphs / main only / sidebar
  only by keepNext=0; independently disable nested cantSplit flags.
- Every probe retains semantic text, all media and every package part except
  word/document.xml. A structural comparator rejects text or node changes and
  records each changed attribute with its XML path and previous/new values.
- The detach-both operation isolates the two-value XML effect of the research
  branch's bodyBoundaryKeepNext=false, read directly from
  `c685bf4308235ac5fcc38957d45d9c9bf508eb21`. Its experimental direct-picture,
  rich-text and tile variants are separate research and are not imported.

Conversion is bounded to 90 seconds per copy with isolated LO profiles.
The original App PDF remains the measurement reference, with the P2-02 photo
thresholds unchanged. The report retains original production failures alongside
copy measurements and conversion time/RSS. No Windows or manual Word step.

## Validation pending native CI

5 mutation controls and 9 semantic negative/control tests pass locally. The
retained P2-02 artifact ZIP was hash-verified before preparing twelve test copies.
Native conversion and final findings will be recorded after the Actions run.
