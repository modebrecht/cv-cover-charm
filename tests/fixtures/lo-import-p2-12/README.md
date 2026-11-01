# P2-12 reference-heading drawing controls

Full synthetic P2-08 Modern Next exports, left/right sidebar. The image is a
four-colour calibration pattern; no person photograph or private Word file.

These copies set all 18 identified empty-paragraph after gaps to zero and
remove only `cv.section.referenzen.heading.flow-paint` (subset mask 8).
All text, 19 critical table payloads, 107 body controls (75 inner), the other
three main heading drawings, sidebar, photo, active headers/footers, styles,
settings, relationships and media remain. Only `word/document.xml` differs.

LO 24.2.7.2 renders 18 complete entries and the reference on three pages.
Both still fail App layout parity. Right also fails photo position. A missing
reference line prevents visual trial acceptance independently. Not a product fix.

The manifest binds source/copy/PDF/page hashes and native evidence. Recreate
with `dossier_lo_paint.make_copy(source,target,8)`. Audit the matching native
artifact with `scripts/dossier_lo_paint.py --out-dir ... --audit-only` (zero new
conversions). Scope of minimality: four drawing-deletion choices under fixed
all-zero gaps on these two sources, not all possible documents/settings.
