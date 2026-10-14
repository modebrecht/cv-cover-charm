# Sidebar upstream source gate — 14 October 2026

**Outcome B — source preparation and compiled-helper verification complete; full Writer source build remains blocked/unverified. The preceding Sidebar production decision C is unchanged.** This hour does not close Masterliste 7/8/9 or Word item 25.

Application base: `70af3c5008939015d0e1ba4934d3310a68497bc0`, branch `fix/docx-next-sidebar-gate-13okt`. Actual remote dev was fetched again and remained `1f4696ee520724466457dacbecc19fffe34ff1ff`; main/render remain protected. No application, PDF, font, pagination, Legacy/V2, switchover, prior diagnostic evidence or native worker change is introduced.

## What was actually executed

1. Fetched the real upstream Git objects for `30742500f2d3eb4366ac312fa33d3dcabdb3eba5`. It is the official `libreoffice-25.8.7.3` release-tag commit dated 8 May 2026, not an assumed arbitrary master checkpoint. Source `swtable.cxx` is SHA-256 `699f8f4ddbfdc97207c66588afc3c4ac02859f801d69a132433b6c214055fe56`.
2. Applied the exact already retained source proposal. Only its declared `sw/source/core/table/swtable.cxx` changes are accepted by the preparation tool; any extra source change fails. The original general multiplication helper remains byte-identical. No binary-patching experiment is repeated.
3. Compiled the actual original and nearest helper bodies with Linux scalar aliases in GCC 13.3.0, Debug and Release, with UndefinedBehaviorSanitizer. Each executes **103,004** independently checked bounded arithmetic cases: random valid positions/widths, zero/end boundaries, exact half ties and the captured mirrored positions. Debug zero divisor asserts as expected; Release retains the original fallback. These are helper compilations, **not compilation of `swtable.cxx`, Writer or CppUnit**.
4. Prepared six byte-identical real source DOCX packages from independently verified current native artifact `11847349467`, app-source checkpoint `41e0bc343f18419933e4f98016ee91015f1211cc`: four right/mirrored failures and two left positive controls. No package/XML/data modification occurs.
5. Generated a native upstream CppUnit regression proposal for `sw_ooxmlexport23`, with two Save/Reopen cycles, exact grids/cell widths, unique complete ordered canonical owner fields, body-field count and stable page count. Both the release-tag proposal and an updated proposal against the inspected current master apply cleanly. **Neither CppUnit proposal is compiled or executed.**
6. Checked the proposed assertions against twelve already executed stock saved DOCX states. They retain exactly four geometry negatives and two left positives, with complete ordered package fields. This is read-only attested artifact inspection, not twelve new native runs, visible-text proof or original-control survival.
7. Nine new adversarial packet tests reject wrong revisions, altered fixtures even when self-attested, missing/reordered fields or cases, changed grids/patches, and falsely promoted engine/Word/production claims. The existing application CI also runs this narrow packet contract on this work branch.

## Actual build boundary

The environment provides 9 logical CPUs, roughly 9.7 GiB RAM, no swap and 26 GiB free disk initially. Autoconf, Automake/aclocal and pkg-config were missing. The initial real `autogen.sh` attempt failed closed on those tools.

A bounded private package bootstrap recovered them without installing LibreOffice or altering the system/native QA runtime. The first Ubuntu snapshot metadata download had a truncated signed `noble-security/InRelease`; it failed and was not accepted. A separately downloaded retry has a verified good Ubuntu archive signature. The bootstrap uses the valid isolated noble indexes and eight recorded archive hashes; only local tool configuration paths are relocated.

The real source `autogen.sh` now executes Autoconf and reaches `configure`. Its concrete stop is **missing `fontconfig >= 2.12.0` in pkg-config**. No Fontconfig check is bypassed, no fake flags are supplied, and no failing step is reported successful. The sparse audit checkout also still needs full source hydration before an actual complete build. Writer compilation, source-built baseline/candidate binaries and source-built native matrix execution are **UNVERIFIED / NOT EXECUTED**.

This is no longer an unspecified request to debug LibreOffice again. The next worker needs a complete supported Linux build environment and full source tree, then the paired build described below. The helper result cannot substitute for that work.

## Prepared packet

| File                                                                                                       | Purpose                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [release regression patch](upstream-sidebar-14okt/libreoffice-sidebar-grid-regression.patch)               | Six independent CppUnit cases against pinned 25.8.7.3                                       |
| [current master regression patch](upstream-sidebar-14okt/libreoffice-sidebar-grid-regression-master.patch) | Same fixtures/contracts against inspected master `44dcf332743801f2d2aa54c77f4411db0b53be18` |
| [unchanged DOCX fixtures](upstream-sidebar-14okt/libreoffice-sidebar-grid-fixtures.zip)                    | Exact six source packages, named for upstream test data                                     |
| [source preflight](upstream-sidebar-14okt/source-preflight.json)                                           | Source/helper/compiler/output fingerprints and all canonical IDs                            |
| [master and stock assertion evidence](upstream-sidebar-14okt/master-and-stock-assertion-evidence.json)     | Exact pinned current source plus twelve known saved counterexample/control states           |
| [build preflight](upstream-sidebar-14okt/build-preflight-evidence.json)                                    | Actual bootstrap/configure results, package hashes and precise unexecuted gates             |

The original source proposal stays unchanged at `docs/docx-next/libreoffice-nearest-tabcols-proposal.patch`. The six fixtures use the shared Brief body composition; this is not new rendered coverage for 39 Sidebar templates.

## Paired complete-build recipe — unexecuted next gate

Use a Linux worker provisioned for a normal LibreOffice build, including Fontconfig/Freetype development dependencies and the upstream prerequisites. The root [upstream README at the pinned source](https://github.com/LibreOffice/core/blob/30742500f2d3eb4366ac312fa33d3dcabdb3eba5/README.md), `configure.ac` and `autogen.sh` are primary references. Wiki build/Gerrit pages were blocked by Anubis in this environment; they are not treated as successfully read instructions.

Create two complete detached source worktrees at the same pinned commit. Apply the same regression patch and unmodified fixture archive to **both**. Apply the retained nearest-rounding source patch only to the candidate. Use identical compiler, flags, dependencies, fonts and locale. Do not compare a newly built candidate against an unrelated packaged engine and call it a single-variable source intervention.

The inspected source accepts this bounded headless starting configuration; successful configure still must be demonstrated on the provisioned worker:

```sh
./autogen.sh --without-java --disable-gui --disable-dbus --disable-cups \
  --disable-gstreamer-1-0 --disable-odk --with-parallelism=2
make build
make CppunitTest_sw_ooxmlexport23
```

The pinned `Makefile.in` defines `build` and the generic `CppunitTest_%` target; `solenv/gbuild/Module.mk` separates product build targets from check targets. It does not define `build-nocheck`. These complete-build and CppUnit commands **were not run here**. Expected baseline: four independently failing new right tests, two successful left controls, and the existing tests protected. Expected candidate: all six new tests plus the full existing target pass. Then run the existing 22-case application source/saved1/saved2 matrix with a separately declared source-engine provenance adapter and the same fonts. Existing accepted stock-worker/binary assertions must not be loosened or relabeled to accommodate it. That adapter is a concrete dependency, not implemented or claimed accepted in this hour.

Record both source diffs, complete command logs/exit codes, dependency/font/compiler manifests, output ELF build IDs/digests and actual DOCX/PDF/control/geometry evidence. A passing grid CppUnit target still cannot close original control/owner lifetime, strict photo/crop/pixels, remaining template layouts or Microsoft Word.

## Official distribution decision

The inspected pinned master `44dcf332743801f2d2aa54c77f4411db0b53be18` still calls the original truncating helper at the two selected `NewSetTabCols` sites. Its original helper body matches the release-tag body byte for byte. The source/test proposals apply to this exact checkout's source files; that is patch applicability, not current-master build acceptance.

The viable distribution path is upstream review of the correction **with a native regression**, official integration, maintainer-approved backports where appropriate, release/distributor packaging and receipt of that official engine by supported users. Observed remote branches include `libreoffice-26-2` and `libreoffice-26-8`; branch existence does not itself prove support policy or a committed backport. No upstream issue, Gerrit change, message or third-party repository mutation was sent.

Do not bundle a modified LibreOffice library into CV Cover Charm or make this prepared patch a production dependency. A DOCX cannot update the recipient's engine. Until the official/source-built compatibility gate is resolved, the existing diagnostic guard and production NO-GO remain. Word acceptance stays UNVERIFIED and deferred to the user's final product stage.

## Validation and scope

Local packet tests: 9 PASS. Exact source-proposal and both upstream test-patch application checks: PASS. Compiled-helper tests: 103,004 per Debug/Release PASS; expected Debug zero-divisor failure retained. Full Writer build, native CppUnit and new source-engine matrix: UNVERIFIED, not skipped-as-success.

Published implementation/test-packet SHA: `889ad0a6ab2c43740944e3fc6224e833626cf9b6`. [Dossier Regression run 38502558343](https://github.com/modebrecht/cv-cover-charm/actions/runs/38502558343) completed SUCCESS, attempt 1: the nine strict packet tests, application units, formatting, TypeScript, lint, production build and all eight browser groups passed. The dispatch-only native-print benchmark was SKIPPED; no new native engine run is claimed. M6 Release Candidate reports SUCCESS on this exact SHA.

Initial hour baseline CI remains separately recorded: [run 38466418350](https://github.com/modebrecht/cv-cover-charm/actions/runs/38466418350), SUCCESS on `70af3c5008939015d0e1ba4934d3310a68497bc0`. The bounded native geometry/content results from the preceding package remain in its unchanged architecture report; this preparation-only successor did not retrigger the native worker.

The final documentation receipt corrects the unexecuted build command using the actual pinned Makefiles and records these completed results. It changes only this Markdown file and uses `[skip ci]`; there is no claimed final-receipt CI execution. Local formatting and whitespace checks pass. All executable files, test patches and fixtures remain byte-identical to the successfully tested successor above.

No new broad CI workflow is added. No merge or deliberate deployment. The prior architecture report and all historical negative evidence remain authoritative and unchanged. The final fetch confirms protected dev/main/render and Agent B unchanged; Agent A independently advanced to `1085ef27d1ac05b53c4b85311efd667c893cefdc` and was neither imported nor modified.
