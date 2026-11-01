# P2-13 reference-anchor controls

Synthetic full Modern 18-entry Next sources from P2-08. The picture is a
four-colour calibration pattern. No person photograph or private Word file.

The two DOCX copies change only the reference heading from floating anchor to
inline drawing and set the 18 identified empty-paragraph after gaps to zero.
All 107 body controls, 19 critical table payloads, word text and eight body
graphics remain; all non-document.xml ZIP parts are unchanged.

LO 24.2.7.2 renders all 18 descriptions and reference on three pages, but places
the line above its heading. The line placement gate and App layout gate fail;
the right photo remains displaced. These are diagnostic controls, not fixes.

Recreate with dossier_reference_anchor.make_copy(source,target,'inline',True).
The native artifact can be audited without new conversions using the script's
--audit-only mode. MANIFEST.json binds sources, copies and native measurements.

The two tiny PNG crops and line-calibration.json separately calibrate the
continuous dark-line detector: P2-08 App line present; P2-12 deleted-line PDF
absent. The detector tests placement beside the reference heading; a FAIL does
not imply that retained graphic data is invisible everywhere on the page.
