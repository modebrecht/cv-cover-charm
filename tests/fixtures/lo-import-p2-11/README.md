# P2-11 full-source content positives

Synthetic 18-entry Modern exports, left/right sidebar, copied from the pinned
P2-08 Next downloads. No new application export is counted here. Source photo
is a four-colour calibration image, with no person photograph.

These diagnostic copies set all 18 identified empty-paragraph after gaps to zero
and remove exactly four main-cell heading drawings. All 107 body controls,
75 inner controls, 19 critical table payloads, photo drawing, sidebar, header and
footer parts, media, settings, relationships and visible Word text remain.

Native LibreOffice 24.2.7.2 renders all 18 complete entries and reference on
three pages. Both fail App layout parity; right also fails photo position.
The four missing decorative lines independently prevent trial acceptance.
Do not use as a normal product export or a general repair.

`MANIFEST.json` binds the native report, source/copy/PDF/page hashes and metrics.
Recreate with `dossier_lo_context.reduce_context` using `main-heading-paint`
and `zero_gaps=True`; validate with `scripts/dossier_lo_outer.py --audit-only`
against the matching downloaded native artifact. No native conversion is made
by audit-only mode.
