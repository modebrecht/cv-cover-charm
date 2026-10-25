# LibreOffice evidence and executable policy

## Verified development renderer

`LibreOfficeDev 26.8.0.0.alpha0 2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`

All 85 independent Brief fixtures passed structural validation, native conversion, page/text/media/bounds checks and DOCX save/reopen validation over 472 pages. This is development-build evidence, not stable LibreOffice or Microsoft Word acceptance.

The QA runner now records the exact executable version in every result. Use an explicit executable or wrapper to avoid accidental machine-global selection:

```sh
python3 scripts/docx-next-render-qa.py /path/to/fixtures --roundtrip --soffice /path/to/pinned-soffice --require-stable
```

`--require-stable` rejects Dev/alpha/beta/RC versions. Each conversion uses fresh isolated output/profile directories. Existing PDFs cannot satisfy a failed conversion. Supplied snapshots must already have human approval; this runner neither writes nor approves baselines.

## Verified stable renderer — 2026-10-04 continuation

Ubuntu noble's 20260828 package snapshot supplies backported LibreOffice 25.8.7. The isolated runtime uses unmodified stable Writer libraries through the **public LibreOfficeKit API**, rather than the `soffice` desktop CLI. [The package inventory](stable-lo-packages.json) records all 50 exact versions and SHA-256 hashes, including the matching API headers. No development engine binaries are used by this stable runtime.

The API itself reports:

```
LibreOffice 25.8.7.3 580(Build:3)
```

[The frozen result ledger](stable-lo-results.json) records the exact candidate/PDF hashes and final adapter/runtime identity. **85/85 fixtures, 472 pages pass** structural, text, pagination, image, bounds, typography, native-column and DOCX save/reopen checks. This includes all twelve review cases, totaling 85 pages. Assertions and expected page counts are unchanged. Missing source and unsupported format probes fail explicitly without output. The results record `libreOfficeInterface: LibreOfficeKit`; these are stable Writer-library results, not claims of desktop CLI or Microsoft Word acceptance.

### Startup diagnosis

The initial stable CLI conversion exited 1 with no PDF or diagnostic. A direct local socket probe returns `PermissionError(1, 'Operation not permitted')`. The ordinary [desktop startup](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/desktop/source/app/app.cxx) calls `RequestHandler::Enable(true)`. Official [LibreOfficeKit initialization](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/desktop/source/lib/init.cxx) uses `RequestHandler::Enable(false)` as its normal embedded-library path. Successful conversion through that API supports the environment/desktop-IPC diagnosis. No socket shim, binary patch, warning suppression or document repair pass was used. Desktop CLI conversion remains unavailable in this environment.

The first isolated Kit attempt also exposed missing QA fonts: its long letter substituted DejaVu Sans for the previous Noto Sans substitution and produced 11 rather than 12 pages. The setup now verifies and copies the same [font assets](stable-lo-fonts.json) used by development QA. All original pagination assertions pass with those assets. Fonts are unmodified data from the recorded runtime bundle; they are not embedded into the DOCX or treated as installed Microsoft fonts.

### Reproduce without global installation

Use Ubuntu 24.04 amd64, `dpkg-deb`, GCC/`cc`, Python and the QA runner's PyMuPDF/Pillow dependencies. Acquire the exact `.deb` packages in the inventory from `https://snapshot.ubuntu.com/ubuntu/20260828T000000Z/`, suites `noble`, `noble-updates`, `noble-security`, `noble-backports`. With that snapshot configured, download exact versions into a private directory:

```sh
mkdir -p /path/to/archives
python3 - /path/to/archives <<'PY'
import json, subprocess, sys
m = json.load(open('docs/docx-next/stable-lo-packages.json'))
subprocess.run(['apt-get', 'download', *[p['package'] + '=' + p['version'] for p in m['packages']]], cwd=sys.argv[1], check=True)
PY
python3 scripts/docx-next-lo-kit-setup.py \
  --archives /path/to/archives \
  --fonts /path/to/verified-libreoffice/share/fonts/truetype \
  --root /path/to/new-empty-stable-runtime
python3 scripts/docx-next-render-qa.py /path/to/fresh-fixtures \
  --roundtrip --require-stable \
  --libreofficekit /path/to/new-empty-stable-runtime/lo-kit
```

The recorded font source is `codex-primary-runtime`'s `libreoffice-headless 26.8.0.0.alpha0-codex.1` data directory. Copies must match every hash; another font version is not silently accepted. This setup requires those assets and the stated Ubuntu base, not an arbitrary global installation. It verifies archive contents before extraction, relocates packaged symlinks/configuration, binds language data via liblangtag's public API, compiles against the stable package headers with warnings as errors, and writes a runtime/version/compiler/hash record. Every version query and document conversion has a fresh isolated profile; every conversion has a fresh output directory. No package post-install scripts execute and no global application is replaced.

No CI dependency on a machine-global application was added. A future native CI job must supply these verified packages/fonts and base, or document a pinned container digest. The Word package includes the stable runtime record and package/font inventories. PDFs/PNGs remain **candidate** references; human approval and Microsoft Word editing/save/reopen evidence remain pending.
