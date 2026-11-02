# P2-26 — fresh real App/Next crop evidence and final candidates

All data and the colored portrait are synthetic. Actual browser menu downloads
at tested commit `2226e220eeddfa3f12cc589da45ad250ae5fb667`,
[CI 41479670289](https://github.com/modebrecht/cv-cover-charm/actions/runs/41479670289).

Retained here: both original DOCX downloads, both matching App PDFs, both
negative-control native PDFs, the source manifests/catalog, and both passing
candidate DOCX/PDF pairs. Left crop:
zoom 1.6, x30/y70; right crop: zoom 2.0, x65/y35. Ordinary 18-entry text,
three pages per document. This is fresh coverage on the shared candidate,
not a reuse of the old P221 crop settings or structure.

The unchanged native source imports fail (14/18 complete entries); both
post-export candidates pass (18/18, correct pages, photo/lines/reference gates).
The product sources still contain all 18 entries and are retained unchanged.

Checksums of all files and the tested SHA are in
[p2-26-proof.json](../../../docs/qa/p2-26-proof.json); every trial and gate is in
[native results](../../../docs/qa/p2-26-native-results.json).
Regenerate a candidate using `dossier_candidate_crops.make_copy(source,
target, 'footer-distance-zero')` with the pinned CI dependencies.

Full artifact `13158248988` retains the complete output folder and all
page PNGs through 16 November 2026. Audit the extracted artifact using `FRESH_SOURCE_DIR=<source>
python scripts/dossier_candidate_crops.py --out-dir <candidate-crops>
--audit-only`; preserve the raw RESULTS first. Audit starts no converter.
The versioned source copies use `-app`/`-original` suffixes; restore the
manifest's original filenames when reconstructing a source directory.

The fixed research package is complete. Diagnostic acceptance only; no
product, arbitrary-photo, 39-template or Word acceptance.
