# Provisioned paired Writer source build — 14 October 2026

**Separate engine-maintenance task. Status: prepared; actual build/native completion UNVERIFIED.** This is the already identified nearest-rounding source proposal's compilation/regression gate, not a new OOXML candidate, a binary-patching repeat or an application Sidebar fix.

Application work branch remains `fix/docx-next-sidebar-gate-13okt`, starting at `7e8d5839fc5c21fd2b12fb496f3f5c07cc44961a`. Actual remote dev was freshly fetched and is now `33fa153297bc48dcf691d5a4e0112df7432ed1cb`, after the independently authorized PDF preflight merge. DOCX Next source and the audited native Sidebar workers are unchanged relative to the original dev checkpoint. No dev merge into the work branch, cherry-pick, rebase or history rewrite occurs. Main/render remain protected.

## Concrete execution boundary

One opt-in job is added to the established `DOCX Next Stable Sidebar` workflow. It runs only on this work branch when the pushed commit explicitly contains `[sidebar-source-build]`. It provisions ordinary Ubuntu 24.04 LibreOffice build dependencies on the disposable GitHub runner, not on the managed local machine. The existing stock worker and all of its geometry/identity assertions remain unchanged. No additional broad workflow or new production dependency is added.

The source worker verifies the immutable six-fixture packet, clones official tag `libreoffice-25.8.7.3`, and requires exact HEAD `30742500f2d3eb4366ac312fa33d3dcabdb3eba5`. Two complete detached worktrees get the identical existing CppUnit patch and byte-identical DOCX fixtures. Only the candidate gets the unchanged `NewSetTabCols` source correction. Source/test file hashes and exact changed-file scopes are checked before configure. Both use the same compiler, dependencies, locale, configuration and external tarball directory; normalized `config_host.mk` hashes must match.

The actual target is `make CppunitTest_sw_ooxmlexport23`, which compiles its complete Writer dependencies and executes the native test target. This is explicitly **not `make build` for the entire office product** and is not the separate 22-case application matrix. No test-name filtering is allowed. Baseline must execute all six new tests, fail precisely the four known right cases, and retain both left controls. Candidate must pass the complete existing target plus all six new tests. The real upstream `[_RUN_____]` markers and CppUnit failure/output syntax are used; names merely occurring in compiler text do not prove execution.

Configure is bounded to 15 minutes, each compile/native target to 150 minutes, and the entire opt-in job to 330 minutes. The worker stops at the first checkout, configure, compile, unexpected baseline failure, configuration mismatch or candidate contract failure. It does not loop over missing dependencies, change geometry expectations, alter fixtures, repeat source samplers or widen the template matrix. Normal prerequisite provisioning has its own 20-minute job step limit.

Only logs, source diffs, package/compiler manifests, exact exit receipts and output ELF digests/build IDs are uploaded. Modified engine binaries are not published or bundled. A native PASS would certify the prepared paired grid/package/page-count regression only: original control creation/container lifetime, full visible text/raster coordinates, original photo pixels/crop, remaining Sidebar template layouts and Word acceptance stay separate. The original test packet/evidence is not rewritten to pretend its earlier unexecuted gates passed.

## Initial verification

Six source-worker adversarial tests and the nine existing immutable packet tests pass locally. They reject compile failures, timeouts, incomplete or duplicate test coverage, unrelated baseline failures, an unexpected baseline success and falsely relabeled candidate failures. No source Writer compilation/native result is yet claimed.

The preceding current-body identity and transport packet remains completed at `7e8d5839`; its actual tested executable SHA `3f225a07` has successful application/selected native CI. Source lifetime remains unobserved before import end, saved1 retains one actual control for 45 checks, and the unchanged stock matrix remains 22/22 content versus 18/22 exact geometry. That report is not superseded with a speculative engine PASS.

## Distribution and next boundary

Even a compiled passing source correction requires upstream review/integration and official release/distributor delivery to supported users. An exported DOCX cannot update their installed editor. This job is therefore an engine-maintenance verification task, not an application runtime installation path. No upstream message, issue, Gerrit submission, merge, manual deployment, DOCX Next switchover or Legacy/V2 removal occurs. Production architecture decision C remains in force. Word item 25 remains UNVERIFIED and deferred to final product acceptance.

Initial source `7917ba051f0806a548fe29b9f303aab6cf95b8b6` ran at native workflow `38581038237`, source job `115910695727`. Normal dependency provisioning, both full worktrees and both exact source/test patches succeeded. It stopped before configure execution with launcher `OSError: Exec format error` because Python was given the upstream shebangless shell/Perl wrapper directly. This is a QA launcher defect, not a native geometry failure. Artifact `11903800659` retains the actual manifests/diffs/failure receipt: 25,563 bytes, SHA-256 `140626cee6bf19be50e4448e351e033d4ac029905e59d9436fcfdb1378cc1244`. No Writer compilation/native test executed in this initial attempt. The other three selected stock native jobs pass.

The bounded launcher correction explicitly uses `/bin/sh ./autogen.sh`, as required by the real upstream wrapper form. Two additional executable tests reproduce the direct-launch failure, verify the shell/Perl invocation and retain a failed exit receipt for an unlaunchable command. Source-worker tests now total eight; original packet tests remain nine. Engine proposal, test patch, fixtures, dependencies and geometry expectations are unchanged. The corrected source job is a new explicitly identified revision, not an unchanged-source retry.

Corrected actual source SHA, run/job IDs, failure or PASS, completed application CI and final branch publication will be recorded in a receipt after execution. Until then the build/native result is UNVERIFIED. A full 39-template rendering audit is not started unless the representative product gates pass.
