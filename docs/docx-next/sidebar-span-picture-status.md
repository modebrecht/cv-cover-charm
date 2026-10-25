# Sidebar picture before a continuous right track

**Subsequent checkpoint:** [Opening-band feasibility](sidebar-opening-band-status.md) executes the next task below. Initial fields pass, but the first continuation entry remains detached in all four bounded variants; the guard remains. This document preserves its original stable-engine evidence.

Starting remote `dev`: `bbee5fd85b81a927e51b85bbf9ddcca73dd08f02`, freshly fetched and independently verified before editing. The working tree was clean. Registry: 29/39 configured candidates, 0/39 Word accepted. Prism remains declarative and Warm/Freundlich remains the remote candidate; neither changed. No template was added in this checkpoint.

## Architecture decision

The mirrored main-photo counterexample is **not resolved**. Three bounded native-table experiments were rendered with LibreOffice 25.8.7.3: allow picture-only rows to split while retaining atomic entry rows; supply a native minimum row height; start the spanning track in its own native lead row. Each still moved the main opening content off the first CV page. Short, long-both-tracks and running-header/continuation cases produced 4, 12 and 14 dossier pages respectively, with no Family section on the first CV page. The experiments were discarded. No change to the model builder, composition, renderer or template registry is retained.

The generic picture-before-later-span guard stays active in `parallel-flow.ts`. Repeated row-property changes would not address the observed architecture boundary. No template-ID branch, text-based renderer styling, XML repair, semantic rasterization, Legacy dependency or PDF pagination measurement was introduced.

## QA gap closed

Whole-document text, page counts and an opening label can pass while a large body region remains empty. Sized free-photo fixtures now declare following **content field IDs** as first-page expectations. The generic render QA checks their text in the owning first-page body track, excluding headers and neighbouring tracks. This is a fixture assertion, not pagination prediction or field resolution for arbitrary user data. It runs before and after save/reopen.

Four Python regression tests cover picture-plus-label-only failure, neighbouring-track/header substitution, wrapped body content and logical part offsets. A Bun test verifies that all eight supported free-photo fixtures address real unique semantic paragraph IDs.

`scripts/docx-next-span-picture-probe.ts` constructs a deliberately failing **native table specimen** in a neutral table-test dossier: lower a supported picture/track composition, mirror its native cells, widths, decoration and spans, then use the existing single renderer. It does not alter the app guard, claim a supported Sidebar export or substitute Classic for an application Sidebar. `scripts/docx-next-span-picture-qa.py` confirms that the declared fields survive in the document while opening-flow QA rejects their first-page detachment, both before and after save/reopen. Converter output and profiles are fresh on every run. First-CV-page PNGs support inspection.

Reproduce with Bun, PyMuPDF and the project's pinned QA-only LibreOfficeKit adapter:

```sh
bun scripts/docx-next-span-picture-probe.ts /tmp/docx-next-span-picture
python scripts/docx-next-span-picture-qa.py /tmp/docx-next-span-picture --libreofficekit /path/to/lo-kit
python scripts/docx-next-flow-qa-test.py
```

The negative runner succeeds only when the known rejection is observed. An unexpected pass requires visual review and an acceptance-status update; it never silently promotes the specimen.

## Verified checkpoint

All 31 supported Sidebar fixtures / 253 dossier pages pass complete package validation, semantic/track text, entry attachment, frame geometry, body bounds, LibreOffice rendering and save/reopen with the stronger assertions. All 31 DOCX packages are byte-identical to the starting checkpoint. Fresh negative, late-Y, portrait and chrome pages were inspected. The native table specimen rejects on four pages before and after save/reopen, while retaining every declared probe field.

985 isolated units / 207 files, including 283 Next units / 45 files, pass. The four Python QA tests, TypeScript, lint (0 errors / 21 existing warnings), release formatting, changed-file formatting and production build pass. Production code did not change. The starting checkpoint's actual editor, production PDF and portable JSON evidence remains applicable; final publication CI repeats the existing PDF, dossier-flow and state regression groups. Final CI status is reported after the single `dev` publication. [Machine evidence](sidebar-span-picture-evidence.json) distinguishes current checks from inherited editor evidence.

Microsoft Word acceptance: pending. Word testing is deferred during the user's holiday and does not block continued development. Production DOCX remains Legacy/V2; no branch promotion or manual deployment.

## Exact next task

Run a bounded feasibility check for a shared native **opening band plus track continuation** composition: keep the picture and declared initial track fields outside the problematic continuous vertical merge, then continue through shared native text/entry tracks. Start with the mirrored short counterexample and require continuous rail appearance, editable semantic fields, no new empty body region, and save/reopen stability. Only then test long-both-tracks and running-header/continuation cases. Retain the guard unless all three pass; do not introduce template branches or geometry-based page reconstruction. Modern Sidebar follows after this shared boundary is resolved. Brief stays the reference fixture for the composition.
