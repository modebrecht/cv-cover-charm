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
Native results, visual inspection and final recommendation are pending.
