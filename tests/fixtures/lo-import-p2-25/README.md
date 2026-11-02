# P2-25 — adjacent 17/19-entry candidate evidence

Four synthetic-data actual DOCX-Next sources from the frozen P2-17 browser
downloads, retained in `lo-import-p2-20`. No private files.

Tested implementation `49d3a6c8f1f765ca89678ee98d28653baf21f701`,
[native run 41477205657](https://github.com/modebrecht/cv-cover-charm/actions/runs/41477205657).
The four `footer-distance-zero` PDFs each have 3 pages and pass all unchanged
content/layout/photo/line gates. One 19-entry right DOCX copy is retained too.

Rebuild any candidate with `dossier_boundary_check.make_copy(source, target,
'footer-distance-zero')` and the pinned CI analysis dependencies. Source,
candidate and PDF SHA256 values are in
[native results](../../../docs/qa/p2-25-native-results.json) and retained-file
hashes in [proof](../../../docs/qa/p2-25-proof.json).

The existing versioned 18-entry PDFs from P2-24 remain the pinned pixel
controls. Complete 16-trial artifact `13158725372` has retention through
16 November 2026; preserve its raw RESULTS before using `--audit-only`.
Audit rebuilds/remeasures without starting a converter.

Diagnostic copies only. No product, 39-template, Word or arbitrary-text/photo
acceptance. No changed export path or app source.
