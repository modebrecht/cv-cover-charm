# P2-16 full-story layout-row candidates

Synthetic full Modern 18-entry Next sources, calibration photo only. Split the
outer layout row after entries 05 and 14; zero the 18 identified after gaps.
Every original main block remains exact after those spacing changes. All 107
body controls, 19 critical tables and eight graphic payloads remain; no line
or photo is removed. Sidebar content occurs once. Only document.xml changes.

Left passes the existing narrow App content/page/title/photo/reference-line
trial on LO 24.2.7.2. Largest title delta is 1.984 mm against a 2 mm threshold.
Right passes content/main layout/line but retains the +19.844 mm photo defect.
Both remain NOT_ACCEPTED for production. Fixed boundaries are not a dynamic
pagination algorithm; mirrored global XML reading order changes, and Word
editing/accessibility/x39 behavior is not certified.

MANIFEST.json binds source/copy/PDF/page hashes, exact package checks and native
measurements. Recreate with dossier_layout_rows.make_copy(source,target,
'rows-5-14',True). Audit the matching artifact with --audit-only, without any
new conversions. No private Word file or photograph of a person is included.
