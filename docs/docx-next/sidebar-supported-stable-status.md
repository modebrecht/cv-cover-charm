# Stable comparison of the existing supported Sidebar matrix

The stable workflow now has a separate `supported-sidebar` job for the **31 existing supported Sidebar fixtures / 253 dossier pages**. It uses the canonical fixture generator with the actual browser image decoder, six synthetic inputs and browser decoration pixel checks. `--verify-json` additionally rebuilds each model from portable input JSON and renders both input/model restores, requiring immutable inputs/models and byte-identical native packages, including photo source/frame data. This optional QA check applies generically to every fixture set and does not change application rendering.

The job uses the existing hash-verified LibreOffice 25.8.7.3 kit and fonts. Existing native package, complete owning-lane PDF text, pages, bounds, images, opening flow, chrome and actual Save/Reopen checks all remain required. A summary rejects missing/duplicate/reordered cases, altered per-fixture pages even when the total matches, an unpinned engine, failed restorations or a package/hash mismatch. Six local integrity tests use synthetic reports and do not certify an engine. Actual CI results are recorded after publication.

This closes a validation gap in the earlier [local supported refresh](sidebar-supported-refresh-evidence.json), which used an explicit Pillow adapter. Browser-normalized native image bytes may differ from Pillow bytes; no cross-adapter package identity is assumed. Each browser-generated source is instead compared to its own restored native packages. The existing application browser suite remains separate. No renderer, model builder, template, export policy or experimental gate changes. Microsoft Word and snapshot approval remain pending; counts stay 29/39 configured and 0/39 Word accepted.

```sh
python scripts/docx-next-fixture-images.py /tmp/supported-sidebar/images.json
bun scripts/docx-next-fixtures.ts /tmp/supported-sidebar --sidebar --verify-json
python scripts/docx-next-render-qa.py /tmp/supported-sidebar --libreofficekit /path/to/lo-kit --require-stable --roundtrip
python scripts/docx-next-supported-summary.py /tmp/supported-sidebar
```

The CI artifact retains the manifest, original DOCX/PDF/page images, saved DOCX/reopened PDF, JSON restoration report, summary and verified runtime record. Green native checks are candidate evidence; they do not open export gates or establish Word acceptance.
