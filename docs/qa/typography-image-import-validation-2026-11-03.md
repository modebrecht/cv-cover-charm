# JSON import: preserve typography and letter image settings — 3 November 2026

## Reproduced problem and correction

This addresses a concrete further part of [P1 issue #207](https://github.com/modebrecht/cv-cover-charm/issues/207).
At baseline `995fe8600db1a89dc853edd4052e2d3f931b814f`, a full project with
CV `bodyScale: "broken"`, letter `subjectTypography: {fontSizePt: "broken", bold: "false"}`,
and an image with `widthMm: "broken"` passed the project parser. The saved-document
readers then omitted the supplied CV scale and subject typography; image normalization
replaced the authored width with the 34 mm default. Confirming the file could therefore
replace an intact draft with different settings.

The whole-project file boundary now rejects malformed CV type scales, title/rubric
sizes and spacing, name typography, letter role styles and font sizes, alignment/rule
flags, closing/signature spacing, and letter image coordinates/placement. Known style
font choices and six-digit role colors follow the existing renderer contracts.
Malformed files use the existing invalid-dossier alert before confirmation or backup work.

The checks are confined to `validDossierProjectSettings`, rather than the part validator
also used by browser/PDF readers. Existing tolerant browser reads and renderer clamping
are unchanged. Missing legacy extensions, partial styles/images, supported null automatic
values, unknown additive properties, and finite out-of-range values remain accepted.
Historical numeric strings are still accepted for image width/top/gap; free x coordinates
remain numeric. A legacy left/right image with a stale x coordinate keeps its saved side.
There is no project-version, dependency, workflow or source-fixture change.

## Regression protection

Six new unit groups cover 118 malformed variants, exact parser retention for valid
settings, null/partial defaults, numeric overflow, and unchanged tolerant saved readers.
Against the unmodified baseline, the four rejection groups failed and the two compatibility
groups passed; all six pass with the correction. The existing 67-project compatibility
catalog passes without altering any original fixture or catalog hash.

A new real-file-input browser case attempts eight representative damaged files. Each
must show the invalid-dossier alert, with no confirmation and identical complete
localStorage. No import journal or IndexedDB backup database may be created.

The confirmed roundtrip case now opens both editors, checks visible free and legacy
flow-image positioning, waits for an actual normalized letter autosave, reloads, downloads
the real Dossier JSON from the CV menu, then reimports the downloaded bytes. Authored CV
name/title/rubric typography, letter sender/recipient/subject styles and font sizes,
closing/signature spacing, both original image objects and their source bytes must survive.
Existing free/Masonry CV layouts, sidecars, shared settings, content and unrelated-app
preservation checks remain part of that same case.

## Verification

Checked code: `1b2235ea29fd05e2f4d274e102058b6480ca3259` on dev.
Local full unit suite: **1,513 PASS / 0 FAIL**, 287 files, 27,628 assertions.
Application and QA TypeScript, changed-file lint/format and diff checks pass.

[Dedicated import CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41646014800/job/125951418815)
passes **29/29 browser cases** on the first attempt: zero skipped, flaky or
unexpected outcomes, 74.0 seconds. The same job passes all 1,513 units,
application/QA types, lint and all three production build phases.
The new eight-file rejection case passes in 2.0 seconds and the strengthened
both-editor JSON roundtrip in 6.6 seconds.

Downloaded artifact `13233659859`, SHA-256
`d056b4cddc08c8cc17a84f3080736de22066598b7cd9d3a8a36d08ee89755314`.
The [machine-readable proof](typography-image-import-validation-proof-2026-11-03.json)
records the report hash, all 29 browser outcomes, tested boundaries and pinned CI runs.
The frozen 67-project catalog remains at SHA-256
`571880c8a4d5b22555096c96d31bede08d19a2e27a045a91b431d9e89739b88a`.

[Complete Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41646015037)
passes fast checks, all eleven browser groups and status publication. This includes
33 CV/PDF core cases in 14.3 minutes. The existing opt-in native-print benchmark
remains skipped.
[Bounded visual parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41646015172)
passes both source/native-output jobs.
[Contact Integrity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41646014941)
and [Pages](https://github.com/modebrecht/cv-cover-charm/actions/runs/41646014372) also pass.
All five runs test the code commit above.

Main remains `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; render remains
`1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.
Strict nested `chromeContent`, custom-element geometry and individual legacy-editor
file checks are outside this correction.


This does not close every historical-format or Word acceptance requirement in #207.
Development stays on dev; historical branches and release promotion are untouched.
