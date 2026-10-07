# Terminal side paragraph regression

Freshly fetched remote `dev` and clean working tree: `212deafc3b82cd6cea3e6f126c959f74e2e4a654`. No unpublished handoff commit was recovered or cherry-picked.

The prerequisite CI runs were inspected before this experiment. Both completed successfully on that exact commit:

- [Stable sidebar run 37605545414](https://github.com/modebrecht/cv-cover-charm/actions/runs/37605545414): pinned LibreOffice 25.8.7.3 reproduced the previous 66 controls, including the four short-row controls, with zero changed cases. Reviewed negative product gates remain failures, even when diagnostic CI is green.
- [Application regression run 37605545302](https://github.com/modebrecht/cv-cover-charm/actions/runs/37605545302): unit tests, release formatting, TypeScript, lint, production build and all eight browser groups passed.

The new declarative probe plans three isolated variants per orientation at a 220 mm lead: both terminal flags false, only the last semantic side paragraph attached, and only the required empty side-cell ending attached. Main-only opening attachment, all text, semantic IDs, row ownership/spans, widths, paint and other paragraph/row flags remain constant. No renderer or production export changes were made.

Right controls run first so a regression stops further renders. The first changed case failed that stop condition:

| Actual right control       | Last semantic side paragraph keepNext | Empty side ending keepNext | Main opening CV pages | Side opening CV pages | Dossier pages | Product gate                    |
| -------------------------- | ------------------------------------- | -------------------------- | --------------------- | --------------------- | ------------- | ------------------------------- |
| Original detached baseline | false                                 | false                      | 2,2,2,2,2             | 1,1,1,1,1             | 21            | pass                            |
| Semantic paragraph only    | true                                  | false                      | 2,2,2,2,2             | 1,1,1,1,2             | 22            | fail: side description detached |

Both full native/PDF tracks survive, with all ten fields and no body/lane bounds failures. Save/Reopen preserves complete native text, PDF text hashes, wrapping/physical glyph geometry within the existing tolerance, page counts and opening positions. The baseline package and both render observations are identical to the previous `right-main-only-220` control. The changed case adds one page and detaches the side description from its four opening metadata fields.

**Stopped after two actual cases / 43 dossier pages**, each also rendered after Save/Reopen. Six packages were generated and checked for immutable JSON, equivalent restored packages and normal-export rejection; only two were rendered. The empty-ending-only control and all three left controls were not rendered. This is no evidence about the left fix or the empty-ending hypothesis. The last semantic side paragraph must remain detached for this positive right control.

Local engine: LibreOfficeDev 26.8.0.0.alpha0. Local Python evidence and stable-comparison tests pass. The repository probes ran through a temporary TypeScript transpilation loader under the primary Node runtime; local Bun/full application CI was not run or claimed green. The published commit's stable/application CI is checked separately. The existing 31 supported sidebar fixtures were not freshly rerun here. Microsoft Word remains pending. Experimental export gates stay closed; counts remain 29/39 configured and 0/39 Word accepted.

[Machine evidence](sidebar-side-terminal-evidence.json) records the exact six-case plan, the two observed cases, the regression and the four unrendered controls. Stable CI must reproduce this exact stopped prefix, package identities, full text, bounds and Save/Reopen. A green stable job means faithful reproduction of the counterexample, not architecture acceptance.

Reproduce the discovery and stop:

```sh
bun scripts/docx-next-side-terminal-probe.ts /tmp/side-terminal
python scripts/docx-next-populated-row-qa.py /tmp/side-terminal --matrix side-terminal --observe
```

The second command intentionally exits nonzero after retaining `side-terminal-report.json`. To compare the reviewed counterexample on the pinned stable engine without expanding the matrix:

```sh
python scripts/docx-next-populated-row-qa.py /tmp/side-terminal --matrix side-terminal --libreofficekit /path/to/lo-kit --require-stable --observe --baseline docs/docx-next/sidebar-side-terminal-evidence.json
python scripts/docx-next-populated-row-test.py
```

Next bounded task after the exact-commit CI check: keep the final semantic side paragraph false and isolate only the required empty side-cell ending, starting with the right positive control. Render the left orientation only if the right control retains full text, bounds, opening attachment and Save/Reopen. No combined flags or boundary/photo/span/chrome expansion is justified by this result.
