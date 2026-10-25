# Remote architecture review — 2026-10-04

Starting authoritative `dev`: `e91a9e1f96908d53df91611fbef66ec0903713b8`. A fresh single-branch clone and a second fetch agree; the working tree was clean. No stale local Warm source was used. The remote has not advanced beyond the supplied checkpoint.

Since `d664317`: typography pagination fixes, a neutral source adapter and stabilization (`9a9c0fc`), stable LibreOfficeKit evidence (`081a5db`), the Warm candidate (`4a397ca`) and the Prism candidate (`e91a9e1`). Registry: `brief`, `freundlich`, `prism`. Configured candidates: 3/39. Microsoft Word accepted: 0/39. The migration ledger's old 1/39 count is corrected.

Prism passes the architecture review: grouped native cover cells, descriptor-owned bands and palette-bound polygon motifs configure shared primitives. `renderer.ts` has no template-ID conditions, alternate template renderer, visible-text styling lookup or post-export repair. Decorative assets are explicitly nonsemantic; user content uses native paragraphs, tables, lists and pictures. Shared motif and cover-row modules are reusable.

Warm is present remotely and uses the same renderer: native cover rows, flowing compact sender cells, first/continuation paint and page-clipped circles. Its 13 stable LibreOffice render/save-reopen cases are recorded remotely; Microsoft Word and human reference approval remain pending. Older local experiments are irrelevant.

The compatibility snapshot accepts historical PDF-named carriers, but `source-adapter.ts` explicitly copies authored data into neutral DTOs. Browser rectangles, page assignments and measured pagination are excluded. No app-wide renaming is needed. Cover composition, source normalization, native text and section planning already have coherent modules. Further splitting of orchestration or rendering is not justified by line count alone.

Next bounded task: Human. Its browser/PDF cover has a left photo/right profession hero, warm palette and clipped ellipse paint; content pages have quiet corner/lower motifs, with no lower CV echo. Native cover rows and pictures are reusable. A generic per-part scoped page-motif configuration will preserve content-page paint without tying it to contact chrome. Modern/sidebar remains explicitly blocked. Production export, PDF and portable JSON stay on their existing paths.

Microsoft Word acceptance: pending.
