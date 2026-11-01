# P2-05 — compatibilityMode 14/15 counterprobe

Completed: two native cloud runs reproduce the same mode-dependent photo result.
Mode 14 aligns the isolated table photo, but **does not restore the missing long-CV
tail** and moves the main heading 1.993 mm left. No global mode switch is approved.

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

## Verified closing native repeat

Implementation `cd0af56d074390e0b26102884bcc0aa57ae20e9e`,
[run 41294229090](https://github.com/modebrecht/cv-cover-charm/actions/runs/41294229090):

- 8/8 conversions, 16 PDF pages; 31/31 controls pass (8 package, 9 semantic,
  10 prior isolation and 4 converter controls). Existing production lanes skip.
- All four source fixture hashes/part hashes verified. Eight output DOCX hashes
  match the first native run; **16/16 decoded page pixel signatures repeat**.
- Mode-15 baselines match all eight saved P2-04 page signatures. The reduced
  CI dependency set therefore preserves those measured baseline renderings.
- The added native measurement reproduces heading origins x=69.039/71.032 mm
  for mode 14/15, y=70.097 mm in both long cases. Delta is [-1.993, 0] mm.
- Artifact `13078632814`, ZIP SHA256
  `392b6cf415b51995e1a7e9f5eb6c7c595f8a73bdd6d09aac94bc9758a9fe7b9a`.
- The ZIP hash was verified after download. Audit-only replay of those exact
  DOCX/PDF files reproduces results and preserves native resource measurements.
- Direct inspection of all four mode-pair page sheets confirms the photo shift,
  unchanged missing third-page content in the coupled pair and the heading shift.
  Critical entry markers stay on the same pages; equal marker pages alone do not
  imply equal layout, as the complete page-pixel signatures show here.

| Persisted diagnostic | Mode 14 | Mode 15 |
|---|---|---|
| Table photo, requested page x=155 mm | photo PASS, x=154.995 mm | photo FAIL, x=175.097 mm |
| Paragraph photo, requested page x=155 mm | photo PASS, x=154.995 mm | photo PASS, x=154.995 mm |
| Coupled long story | content FAIL, 15/18 complete | content FAIL, 15/18 complete |
| Detached long story | content PASS, 18/18 complete | content PASS, 18/18 complete |

Each long document still has three pages. In the coupled pair, station 16's
body is incomplete; titles 17/18 and the final reference are absent. Source
DOCX XML contains them. Native photo-color bounds are sampled at 96 dpi (about
0.265 mm per pixel); reported decimals are not micrometer accuracy. The complete
entry audit checks the authored description endings, not only title presence.
PASS in this table is the stated diagnostic gate, never full product/Word approval.

Evidence: [full machine results](p2-05-compat-results.json),
[table-photo modes](p2-05-photo-modes.jpg),
[coupled long-story modes](p2-05-long-modes.jpg).
Sheets show mode 14 on the left and mode 15 on the right. Full native artifacts
have 14-day workflow retention; the committed sources, results and comparisons
remain. The original four mode-15 fixtures remain byte-identical in Git.

## Resource observation and replay

LibreOffice `24.2.7.2 420(Build:2)`, Ubuntu 24.04, pinned Python renderer packages
and Liberation/Cabin fonts. Job-log elapsed times: **44 / 59 seconds**. Measured
peak LO child RSS: **213.81 / 213.80 MiB**. This excludes whole-runner/Python
memory and is an observation from these two runs, not a capacity guarantee.
No browser install, application build/start, ONLYOFFICE, service or new workflow.
Each conversion retains its 90-second timeout and private profile; job cap 10 min.

Run from repo root with the existing Python analysis environment:

```bash
python scripts/dossier_lo_compat.py --out-dir artifacts/compat-mode
python scripts/dossier_lo_compat.py --out-dir artifacts/compat-mode --audit-only
```

The first command requires headless LO; audit-only uses retained files and does
not rerun the converter. `--prepare-only` generates the eight controlled DOCX
copies and makes no claim of native conversion. The same workflow's `compat_mode`
input selects this bounded lane.

## Decision and next work

Keep the normal exporter and its mode setting unchanged. This is a confirmed
compatibility-dependent LO position difference in the reduced input; the source
reading in P2-04 is consistent with it. No instrumented C++ path, Microsoft Word
behavior or universal converter defect is established. A global mode-14 change
also affects body placement and leaves the content failure intact.

Prioritize the **separate long-table content-loss problem** next. The persisted
coupled/detached pair reproduces it in both compatibility modes, without pictures
or native content controls. P2-04 already showed that a new simple three-page
table and an entry-only reduction do not reproduce it: further work should focus
on the generated preamble/main-story interaction while keeping the paired control.
Do not use compatibilityMode or looser photo tolerances to hide the original failures.

P2-05 does not rerun the eight full production exports or the x39 source matrix.
Their earlier acceptance limits remain. The P2-01 ONLYOFFICE watermark rejection
is unchanged and no new ONLYOFFICE run is counted here. No normal export, src,
dependency manifest, lockfile or P2-04 source-fixture changes; dev/render/main
remain at their protected starting refs. Work branch stays separate.
