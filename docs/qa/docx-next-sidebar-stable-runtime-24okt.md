# Stable Writer comparison: no fidelity verdict

24. Oktober 2026. Integration branch base `04fd7f58fddba7f95589081f7661e5740dfc006f`; product code remains `9e7579c08527310d8b21bba2807924fb0c8de463`.

**The current Sidebar source has not been accepted or rejected by a stable Writer roundtrip in this continuation.** Both isolated official releases fail the local runtime health check before a usable comparison is possible. The prior current-source results remain explicitly scoped to LibreOfficeDev 26.8 alpha0. Microsoft Word remains unverified.

## Engineering question

The [current source/image report](docx-next-sidebar-source-structure-24okt.md) demonstrates lost original pixels, crop reserve and many semantic control occurrences with a development Writer runtime. A small comparison with a stable release could distinguish a development-runtime limitation from broader Writer behavior. Older stable fixtures have different source structures; their successes cannot answer this question for the current source.

The existing decision packet was recovered and checked against its published SHA-256. Its DOCX is still `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`; its only picture is the checked synthetic 1920 × 2880 pattern. No private input, alternate cover template or new App export was substituted.

## Bounded runtime result

The official [download page](https://www.libreoffice.org/download/download-libreoffice/) supplied both archive links. Each complete archive matches the SHA-256 published by its official mirror-list page. Debian packages were extracted in isolated temporary directories, without system installation. The extracted `soffice.bin` and `libmergedlo.so` remain identical to their downloaded package members.

| Runtime reporting its actual version | Official archive SHA-256 | Plain-text to PDF health check |
| --- | --- | --- |
| LibreOffice 26.8.1.1, `bf6ef2662401c7d6dce671ab4deb26ee0af3a7c1` | `30903df3b9f61360d9660cd707de48cd2831469114492a5008ed58a0ac77d044` | Exit 1; no PDF; no diagnostic |
| LibreOffice 26.2.6.3, `8221e31b3ac356a1623c672912a3d2b492f7e3d1` | `fd0e8f8f2408dd2e5b90286e60f3f97cf566ba441cd48cfc5bcc68067303e0bc` | Exit 1; no PDF; no diagnostic |

The 26.8 CLI also fails to render the selected DOCX before producing output. Fresh profiles, the normal shipped launcher and a `--nolockcheck` health check do not supply a usable conversion. This is an environment/runtime observation; its cause was not established. It is not evidence of malformed source XML, a Sidebar regression or a release-specific image defect.

A final bounded attempt used the repository's **unchanged** public LibreOfficeKit adapter (`scripts/docx-next-lo-kit.c`, blob `2fb8a1411bc7edfce13cf4f288b113981cdb82cc`) with the official 26.8.1.1 API headers. Only external path aliases to the extracted package and its shipped language data were supplied. Its version probe succeeds. Its plain-text health check creates a PDF but exits on signal 11. That partial output is not counted as a successful run or a Sidebar acceptance. No engine binaries, internal control/paragraph functions or exporter code were patched or instrumented.

**Completed stable Sidebar Save/Reopen comparisons: zero.** The intended source/Save1/Save2 comparison was not continued after the runtime health failure. The available development runtime still renders the identical source to PDF; this bounded countercheck does not expand its earlier acceptance scope. No 22-case matrix, new CI run or product suite rerun was performed. The existing read-only comparison reader passes all 51 adversarial tests again.

## Decision and handoff correction

Stop debugging this runtime here. Do not replace a failed health check with a weaker success criterion, continue native engine experiments or change the exporter's crop/offsets to accommodate an unproven cause.

The central `next-handoff.md`, `sidebar-status.md` and `checkpoint-status.md` previously began with old next-step instructions that led back to engine instrumentation and earlier fixtures. A new current entry now points to the verified product checkpoint, independent architecture audit and exact current Word input. The historical text remains intact below it; no historical evidence or gate is rewritten.

The next product decision still requires the actual prepared source's Word Save1/Save2 evidence, with the edited copy kept separate. Original pixels, usable crop reserve, visible layout and matched content-control ownership remain distinct questions. The small current packet is already available; this continuation creates no additional user test packet and requests no intermediate test. There is no justified new product fix from these unsuccessful runtime attempts.

**Sidebar release: NO-GO. Stable Writer behavior for this exact source: UNVERIFIED. Microsoft Word behavior: UNVERIFIED.** Product code, normal Sidebar guard, production switch and historical branches are unchanged. No merge or deployment.

[Machine-readable evidence](docx-next-sidebar-stable-runtime-24okt-evidence.json).
