# Pinned app export handoff for the CV pagination repair

## Current result

The code repair is commit `1ae6bd9a155d179b146aee4c99fed18a1aa647c2` on `fix/docx-next-word-pagination-21okt`. It changes the shared reading-row CV rubric default from 7 px to 0.5 mm, while preserving explicit user values. Its 87 focused tests and supplementary native before/after renders are recorded in `docx-next-word-pagination-takeover-21okt.md`.

**Fresh app exports remain pending. No new DOCX or app PDF was generated in this continuation. No new Desktop Word acceptance exists. Do not merge or declare this P1 closed.**

## What this continuation verified

- Materialized 431 source/configuration/fixture files from the repair commit through GitHub. Every file's Git blob SHA matches the authoritative tree; zero mismatches remain. Manifest digest: `727f062b86373f8092e05f87f8f3f37781c2fa54a072f965e17e650a43c1a57c`.
- Restored cached frontend dependencies, exact React Query 5.101.1 and html2canvas-pro 2.3.0 sources, and the official jsPDF 4.2.1 browser distribution for local QA. A QA-only SPA bootstrap compiled 2,450 modules successfully.
- This is **not** the original Lovable/TanStack production build. Cached tooling differs from the repository's pinned runtime, and the production Vite configuration was not changed or committed. It does not replace browser execution or Word acceptance.
- The local environment has no Chromium executable. The separate cloud browser cannot connect to the local HTTP server (`ERR_CONNECTION_REFUSED`). It explicitly rejected opening the local QA HTML because its URL policy allows only HTTP/HTTPS. That denial was not bypassed. The temporary QA server was stopped.

## Execute in an environment with a functioning app browser

Use the repair branch, not the active Fidelity branch by itself. At the last check, Fidelity was `b70fd0861acf97b5503fc77bd812b368d77b6662`; its newer changes concern native title-page text frames and still retain the incorrect CV 7 px default. Do not overwrite that parallel work or silently treat its exports as containing this repair.

1. Read `AGENTS.md` and verify the source contains the repaired `readingRows` default. Use the existing lockfile, installation policy and normal application configuration. Do not carry the temporary QA SPA bootstrap or vendored runtime into product code.
2. Run the existing full-app batch, applying automatic fit to cases 02 and 12:

   ```bash
   WORD_BATCH_SMART_FIT=1 bun scripts/docx-next-word-batch19okt.ts /absolute/output/word-pagination-auto
   ```

   The existing runner starts the app when `DOCX_NEXT_APP_URL` is unset. It uses the configured Playwright runtime and optionally `DOCX_NEXT_CHROMIUM_PATH` for an installed browser. All twelve cases form one consolidated packet; 02 and 12 are the changed CV acceptance targets. Capture each actual post-action fitted project, source, current live metrics, model, downloaded DOCX, app PDF and proof. The runner's old case folder names still contain `Zwei-CV-Seiten`; in Smart Fit mode that name does **not** certify the resulting page count. Label final acceptance copies clearly as automatic-fit cases.
3. Verify the explicit two-page command independently as an automated control, retaining the resulting control files separately:

   ```bash
   WORD_BATCH_CASES=02,12 WORD_BATCH_SMART_FIT=0 bun scripts/docx-next-word-batch19okt.ts /absolute/output/word-pagination-exact-two-control
   ```

4. Verify every canonical CV field and all content, expected page assignments, typography, source immutability and actual downloaded bytes. Inspect the complete current outputs. Treat additional native-render results as supplementary only. If the real Modern pill/personal-header capture still overflows, diagnose those actual metrics before changing more defaults; the earlier generic reproduction is insufficient to certify that path.
5. Include the fresh cases in one consolidated Word acceptance packet. Ask for **no intermediate micro-test**. The outstanding acceptance concerns the CV in 02 and 12: one complete readable CV page including all References fields, then save/reopen. Cover/title-page appearance is a separate workstream. Already-confirmed Sidebar photos need no repeat test merely because this spacing patch exists.
6. After current full-app Word acceptance, prepare the isolated combined integration branch with the Sidebar repair and latest Fidelity work, rechecking the old Sidebar transport against the new base. No merge, deployment, CI dispatch or production export switch is authorized by this handoff.

The runtime evidence is in `docx-next-word-pagination-app-export-21okt-evidence.json`. This handoff preserves a concrete next action; it is not a completed export packet or an application regression verdict.
