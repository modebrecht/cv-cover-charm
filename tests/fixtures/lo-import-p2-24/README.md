# P2-24 — retained passing empty-footer diagnostic candidates

Synthetic test data and four frozen actual DOCX-Next source downloads only.
No private Word files/photos. These are post-export research copies, not product
downloads or an acceptance for 39 templates.

Tested commit: `dac54d958277c8120ee935975230cf3ad436e542`.
Native run: [41453661190](https://github.com/modebrecht/cv-cover-charm/actions/runs/41453661190),
LibreOffice 24.2.7.2. See [report](../../../docs/qa/p2-24-row-metrics.md).

The four PDFs use `footer-distance-zero` on the existing
`body-flow-nosplit-front` diagnostic structure. Normal sources have 3 pages;
varied sources 5 pages. The ordinary left candidate DOCX is retained as well.
All four DOCX inputs rebuild byte-identically from versioned source fixtures:

```python
from pathlib import Path
from dossier_entry_rows import load_cases
from dossier_row_metrics import make_copy
root = Path('.')
for case, source in load_cases(root)[1]:
    make_copy(source, Path('/tmp') / (case['id'] + '.docx'), 'footer-distance-zero')
```

Run with `scripts` on `PYTHONPATH` and the pinned CI analysis dependencies.
The native report contains every source/copy/PDF SHA256; retained-file hashes
are also in [p2-24-proof.json](../../../docs/qa/p2-24-proof.json).

Full CI artifact `13146297495` contains all 16 trials (including expected
failing controls) and page PNGs; retention ends 16 November 2026. Audit it with
`scripts/dossier_row_metrics.py --out-dir <extracted-artifact> --audit-only`.
Audit mode rebuilds/remeasures without starting a converter. Preserve the raw
`RESULTS.json` first, because audit mode replaces it with the audit report.

The production sources, all 107 SDTs, text and graphics remain intact relative
to the declared P223 control. Never apply the empty-footer rule to a footer
containing text, drawings, fields or tables.
