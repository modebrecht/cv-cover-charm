# Picture diagnostic source versions — 2026-11-02

The stale picture diagnostic is fixed on dev. Historical native comparisons
now use immutable, versioned October inputs. The live renderer has separate
exact package and native baselines. Product rendering and the original native
observations remain unchanged.

## Cause

The historical uncropped rectangle is SHA-256 `8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df`.
The same canonical browser PNG on current dev produces
`61444b4077529c8eff3ec14013f744c63066995947ec51f3613551e3dc821032`.
The PNG itself is byte-identical: SHA-256
`77aa2ffea44e66b004db2ce62dd50607cdf506f97202772528b74148893e9e42`.

Commit `90216cb21ffeaf3b555ebde48b5e65c7bc64f602` (22 October) added a typed,
run-level picture SDT, the explicit Word control instance ID, a line box
including the complete outline, and `doNotAutoCompressPictures`. The old
reference instead has a paragraph-level untyped SDT and zero effect extents.
These changes account for the rectangle's different package hash. Separately,
`02eb033a92b38ad1922de9252dea8bea22265065` (21 October) changed a non-square
maximum-radius contour from ellipse to a CSS-compatible capsule (`roundRect`).

All 26 current packages were independently reproduced using the actual archived
browser-normalized PNGs. Four plain sources are byte-identical. The other 22
change only `word/document.xml` and `word/settings.xml`, preserving their full
ZIP part inventory and image bytes. The [source audit](picture-source-version-audit-2026-11-02.json)
records every old/new package hash. The real CI browser also verifies all 26
current package/photo pins, JSON restoration and source immutability.

## Versioned comparisons

The original October inputs are frozen in
`tests/fixtures/docx-next/picture-history/sources.zip`, with an external
per-file/provenance manifest. They come from source
`59b5dcbc0ee85db33c90f6bdf50fc0bdc386a8e2`, run `37715949743`, artifact
`11524215131`. The downloaded original artifact's SHA-256 is
`2d7a5cf5394571120eaef745483eaddcaab1eaa4c26ee814af344b045cc5e80b`.
The small source-only archive has SHA-256
`4f27755405fccdaec39ad2f020f88979405352ba1ff072e7b44d40eb201041b3`.
No saved packages or PDFs are replayed: the pinned engine performs fresh native
render/save/reopen conversions from those immutable sources.

`docx-next-picture-history-replay.py` verifies archive/member/source/photo
hashes, case order, all seven matrix inventories and each source's relationship
to the existing native evidence. It rejects an existing matrix destination.
Eight adversarial tests reject corruption, unknown files, reordering, path
traversal, stale evidence and changed sources relabelled as historical inputs.

The live probe still exercises the actual current renderer and browser decoder
for all 26 cases, in a separate `current` directory. Every source package and
normalized image is checked against `picture-current-package-baseline.json`.
The native shape reader requires the exact declared geometry (`rect`,
`ellipse`, or `roundRect`); three additional tests reject mismatched and unknown
shapes. Historical ellipse declarations remain unchanged and strict.

The existing picture job measures current native identity and frame matrices
separately. Their new observations retain source hashes, complete field/text
identity, exact geometry, original pixels, saved representations and explicit
stopped/unrendered cases. Native baselines exclude only existing nondeterministic
saved ZIP metadata hashes. They do not waive failures or replace old evidence.

## Verification and limits

The first discovery run `41532750994` on `63c2b226` verifies all 26 current
browser package pins and all seven historical native comparisons. It executes
24 historical cases, 72 native conversions and 144 source/saved PDF pages.
The current identity matrix executes eight additional cases, 24 conversions
and 48 PDF pages. All 192 retained page rasters were independently decoded and
matched byte-for-byte to fresh rendering of their actual PDFs. Source/saved
DOCX hashes and complete native field/photo inventories were recomputed from
the downloaded artifact, not inferred from the logs. All text fields survive. Six table-caption failures and
four original-photo pixel failures remain recorded and blocked. The frame
measurement then stops at its obsolete hard-coded ellipse assertion; that
failure and its artifact are retained rather than reclassified as a pass.

Local checks: 27 focused renderer/ownership tests; eight new historical replay
tests; 24 identity tests including the three new shape checks; five photo tests;
nine crop-precision tests; TypeScript, focused lint, formatting and diff checks.
Product source, exporter settings and the previous Word consolidation remain
unchanged by this follow-up. Native diagnostics never imply Microsoft Word or
39-template acceptance.

The follow-up implementation `bb687fc3` also passes the full 1,495-unit CI
suite, release formatting, TypeScript, lint and build. Bounded Modern/Word
visual parity run `41533329130` passes both existing jobs, including the normal
export package regression and the retained complete body-story saves.


The successful successor picture job is
[run 41533328856 / job 125581385678](https://github.com/modebrecht/cv-cover-charm/actions/runs/41533328856/job/125581385678)
on `bb687fc399921267706b8185d7face6ece1b413c`. Its artifact `13184415134` has
SHA-256 `38271f2c8cb3353df1a680e28b589972dfc655ed422b5238da0e98959d6cdb91`.
The [artifact proof](picture-source-versioning-proof-2026-11-02.json) independently
recomputes all 35 actual matrix cases / 105 conversions / 210 source/saved PDF
pages. Every retained page raster matches its actual PDF pixels. All native
field/photo audits and source/saved DOCX hashes match their actual files.

Of the 26 current prepared packages, 11 are natively executed: eight identity
controls and three frame controls. Fifteen current prepared sources have no
native execution in this bounded path. The unchanged uncropped rectangle and
the declared capsule pass the bounded frame checks; the cropped rectangle still
stops on native crop drift, and the fourth frame is unrendered. Complete tagged
fields survive all 11 actual current cases. The identity matrix retains its six
table-caption and four original-photo pixel failures, exactly as in October.
The separate frame matrix retains original pixels but records one changed crop.
All 66 current source/saved pages were visually inspected; the earlier 48-page
identity review was additionally bound to identical RGB hashes in this artifact.

Both current native matrices and their photo/crop observations are now pinned
as separate evidence. The final verification must reproduce those observations
with exact source/native/geometry/pixel/stop comparisons, while retaining all
seven unchanged historical comparisons.


The fresh historical renders were also compared directly with the original
October artifact at full RGBA resolution: **all 144 source/saved page images
are byte-identical**, with zero different or unavailable pages. No masking or
tolerance was used. Thus the historical inputs, observations and actual native
page pixels all remain reproducible after this source-version separation.


A fresh complete branch read still finds 198 refs. Compared with the original
branch review snapshot, no ref was added or removed and only dev changed.
All 197 other heads remain identical, including main, render, P2-14, P2-26
and the final Word research archive. The previously reviewed November/late
October branch set has therefore not changed during this integration.


## Final checked implementation

[`37eb8f95a4fd3c7aeea544e2fa3b3d1997bce65c`](https://github.com/modebrecht/cv-cover-charm/commit/37eb8f95a4fd3c7aeea544e2fa3b3d1997bce65c)
passes the final [picture job](https://github.com/modebrecht/cv-cover-charm/actions/runs/41534849043/job/125584666702),
including all seven strict historical comparisons, both strict current native
matrices, current photo retention and the current exact crop comparison.
Its artifact `13183442223` has SHA-256
`12dd2f57204be847c19fb1b0e5261444a051727c0f00bfd091ebe4c001a86eee`.
All 210 final page RGB buffers and dimensions match the independently
PDF-verified predecessor artifact exactly. The source package pins and actual
known failures remain unchanged. The [bounded Modern/Word CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41534849171)
also passes both jobs on this exact checked implementation.

The final evidence is documentation only. No application source, package/lock
file, default export option, engine/font manifest or historical native baseline
was changed by this picture follow-up. Main and render retain their original
heads; no branch was created, deleted or rewritten.


All 14 active jobs in the complete stable-sidebar workflow now PASS on this
checked implementation, including all ten integrated template jobs, supported
Sidebar, entry-flow, the picture job and the full historical/native ownership
comparison. The existing manual-only full body/photo matrix was not requested.
The fast check job again passes all 1,495 units, release formatting, TypeScript,
lint and build. The complete ordinary browser regression is recorded separately.


The complete [ordinary Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41534849123)
also passes on the same checked implementation: all eleven browser groups,
fast checks and the final status publisher. Its existing opt-in native print
benchmark stays skipped. Thus all three relevant workflows are green on
`37eb8f95`; the closing commit only stores this final evidence and does not
rerun unchanged application checks.
