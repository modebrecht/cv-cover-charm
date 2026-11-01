# P2-05 — compatibilityMode 14/15 counterprobe

Work branch `work/01nov-p2-05-compat-mode`, base
`cddbb3c8a306a66b23f692cea168b29b4b6d6e48`.

Eight copies of the four persisted P2-04 synthetic fixtures compare mode 14/15.
The mode-15 originals are byte-identical. Mode 14 changes one attribute and one
byte in word/settings.xml; every other package part remains byte-identical.
No source fixture, normal exporter, application code or dependency manifest edits.

The existing visual-parity workflow gains a bounded opt-in job for these copies.
It installs LO and Python only: no Bun, npm, browser, app server, source rebuild,
second workflow, vendor service, Windows access or manual Word acceptance.

## Questions and gates

The LO 24.2 source-reading lead is a compatibility-dependent table-anchor
FollowTextFlow override (P2-04 report). This run tests the resulting behavior,
not a custom engine patch. Changing compatibilityMode globally is not authorized
as a product fix or a claim about Microsoft Word behavior.

- All four fixture hashes and document/settings part hashes are checked.
- Mode 15 must reproduce every saved P2-04 page pixel signature; it is the
  unchanged control, including its known defects.
- Eight isolated LO conversions, 90 s cap each, 10-minute CI job cap.
- Page counts, marker pages, complete synthetic entry spans, photo bbox/pattern,
  nominal page-x offset and all per-page RGB pixel signatures are retained.
- Photo comparisons use the LO paragraph-host control in the same mode. They
  are not a newly generated App PDF comparison or full document approval.
- Execution PASS means conversions and baseline controls pass. New mode-14
  observations are reported even if they do not fix either defect.

## Local preparation

8/8 new invariant controls pass. Actual fixture preparation creates all eight
copies and proves one byte/attribute changed in each mode-14 copy, zero in 15.
## First native result

Implementation `9e4ba816e1fd34f4ba4c4380b9dd588a7e3dddce`,
[run 41293854649](https://github.com/modebrecht/cv-cover-charm/actions/runs/41293854649):
8/8 conversions, 16 pages and 31/31 controls pass. All four mode-15 pixel
baselines match P2-04 exactly, despite omitting app/browser installation.

Artifact `13078616998`, ZIP SHA256
`1643543d9d37c463e4061a6b4a0e5c8ec637b488da24d0729a6bf90772ec8996`.
The downloaded archive was hash-verified; auditor replay preserves original
conversion timings and reproduces the same findings.

- Table photo: mode 15 x=175.097 mm; mode 14 x=154.995 mm, with requested
  page x=155 mm. The native table-to-paragraph difference is 20.102 mm in 15,
  zero in 14. This uses a different reference than P2-04's 19.844 mm App drift.
- Paragraph photo: x=154.995 mm in both modes; page pixels identical.
- Coupled long story: both modes have three pages, 15/18 complete entries;
  station titles 17/18 and final reference missing, station 16 incomplete.
- Detached long story: both modes have three pages and all 18 entries complete.
- Critical marker page sets do not change in the long pairs, but their full page
  pixels do. Visual review plus text-baseline-origin measurement identifies a
  1.993 mm leftward main-heading shift in mode 14 (y unchanged). The runner now
  records this origin/delta explicitly for the closing native repeat.

The mode-dependent photo result supports the compatibility import lead. It does
not prove that mode-15 behavior is incorrect in Microsoft Word, instrument the
C++ path, or turn mode 14 into a tested full-product replacement.

The closing repeat is pending; it will verify the added body-origin measurement.
