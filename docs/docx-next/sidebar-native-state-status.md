# Original saved carrier internal guard checkpoint — 2026-10-09

The original saved carrier now has a local read-only measurement of its importer guard fields at all 77 public progress callbacks and the canonical first paragraph disposal. The complete original public observations and all 36 disposal frame offsets remain exact. Independent CI reproduction is pending.

| Observation | Dummy paragraph flag | Annotation ID | First cached SDT range |
| --- | --- | --- | --- |
| Progress 1–30 | false | -1 | SDT start stack empty |
| Progress 31–77 | true | -1 | SDT start stack empty |
| Canonical paragraph disposal, event 78 | false, already reset by cleanup | -1 | Not measured |

At progress 31 the original first canonical control is present on the empty body paragraph, as already measured by the unchanged public observer. The new field measurement shows that the dummy flag becomes set between callbacks 30 and 31 and remains set through 77. It does not observe the exact assignment instruction, the guard at section-end entry, or the first cached range before `PopSdt()`; an empty stack at these callbacks cannot supply those earlier values. Neither historical saved loss interval is measured or generalized from this carrier.

External GDB execution is blocked by `ptrace` permissions. The diagnostic uses an independently compiled observer helper calling `_Unwind_Backtrace`, reading the saved RBX value of two exact known frame sites. Exact matching official DWARF identifies RBX as the relevant handler/mapper variable and pins all object/member/base offsets in [layout evidence](stable-native-state-layout.json). Actual SHA/build-ID-pinned engine images and complete original disposal offsets must agree. DomainMapper and its implementation backlink, and the SDT helper backlink, agree throughout. Reads are bounded to readable mappings of the observer's own process; no external process, native code, original XML or native register is changed. Raw addresses remain transient and are not baseline identities.

[State evidence](sidebar-native-state-evidence.json) retains the full original case, exact progress field values, disposal state, all frames, worker/layout/helper-source hashes and diagnostic scope. The original callback worker is hash checked and instrumented in memory only. The final reproducible diagnostic performs one unchanged saved carrier read-only load, zero prepared sources and zero exports. Engine/input hashes are checked before and after. Earlier scratch probe failures supply no accepted evidence; the final measurement reproduces the complete original case. The compiled observer's hash/compiler are retained diagnostically, while strict state comparison retains its source hash and all actual engine identities.

Six adversarial tests reject altered/omitted states, wrong types, substituted canonical IDs, modified imports, altered/omitted frames, changed original scope and unsupported acceptance or cached-range claims. Every older stable JSON baseline remains unchanged. **39/39 active templates configured, 0/39 Microsoft Word accepted; production and native geometry remain blocked.** Next: verify the independent CI report and pin its strict successor; then instrument the first cached range between the existing progress callbacks and the exact flag assignment/section-end guard.
