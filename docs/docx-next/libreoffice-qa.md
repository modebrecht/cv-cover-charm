# LibreOffice evidence and executable policy

## Verified development renderer

`LibreOfficeDev 26.8.0.0.alpha0 2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`

All 85 independent Brief fixtures passed structural validation, native conversion, page/text/media/bounds checks and DOCX save/reopen validation over 472 pages. This is development-build evidence, not stable LibreOffice or Microsoft Word acceptance.

The QA runner now records the exact executable version in every result. Use an explicit executable or wrapper to avoid accidental machine-global selection:

```sh
python3 scripts/docx-next-render-qa.py /path/to/fixtures --roundtrip --soffice /path/to/pinned-soffice --require-stable
```

`--require-stable` rejects Dev/alpha/beta/RC versions. Each conversion uses fresh isolated output/profile directories. Existing PDFs cannot satisfy a failed conversion. Supplied snapshots must already have human approval; this runner neither writes nor approves baselines.

## Stable runtime attempt — 2026-10-04

Ubuntu noble's 20260828 package snapshot offers backported LibreOffice 25.8.7. Packages were downloaded and extracted into an isolated workspace, without replacing the existing renderer. [The package inventory](stable-lo-packages.json) records all 49 exact versions and SHA-256 hashes.

The extracted runtime required its own `LD_LIBRARY_PATH`, relocation of absolute package symlinks, a relocated `BRAND_BASE_DIR` in `fundamentalrc`, and the packaged `share/.registry/main.xcd` normally installed by the Debian post-install step. After those repairs, `--headless --version` reports:

```
LibreOffice 25.8.7.3 580(Build:3)
```

The representative twelve-case set was selected, but conversion of the first case (`normal`) exits **1**, with empty stdout/stderr and no new PDF. The strict QA failure is:

```
AssertionError: LibreOffice conversion failed (exit 1, .../stable-soffice.sh):
```

Running `soffice.bin` directly with a fresh profile and normal headless arguments also exits 1. Dependency inspection found no missing direct Writer libraries after extraction. The remaining native startup failure is not conclusively diagnosed; it must not be called a document defect or a successful stable render. Stable results are **pending: 0/12 converted**, no stable save/reopen or visual evidence. No assertion was relaxed.

No CI job was added that depends on this machine-global or failed native installation. Follow-up: obtain a working pinned stable runtime/container, verify its version, and run the same twelve-case set with `--roundtrip --require-stable`. Preserve the checked package versions/hashes or replace them with a documented pinned container digest; do not use an unversioned system application as an acceptance gate.
