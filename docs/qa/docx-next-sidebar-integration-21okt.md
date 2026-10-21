# Sidebar integration preparation

21 October 2026. This is a source review and executable scratch preview, not a branch merge or production release. The confirmed Word photo cases remain closed; no new user test packet is requested.

**Result:** a portable [21-file patch](docx-next-sidebar-integration-21okt.patch) is prepared against the pinned Fidelity revision below. Its isolated exporter preview passes 56 Sidebar/combined serializer tests and focused TypeScript. All six existing dossier sources are byte-identical to the previous Sidebar photo-fix sources. Existing cover test failures reproduce unchanged in the unmodified Fidelity baseline and remain failures. No remote product file is changed by this preparation.

## Pinned sources

| Role                                                      | Commit                                     |
| --------------------------------------------------------- | ------------------------------------------ |
| Common base                                               | `bc26a9472cf802828b5cd7e92d885954d82cec3c` |
| Sidebar fix plus Word evidence                            | `91c6da178d6ba4bc01c4c32ba1f3dabb691850e0` |
| Initial Fidelity snapshot                                 | `9f588959e41496d7b14a1a95ae59993f20ec766c` |
| Updated patch target and final verified exporter snapshot | `3a6f5a11d5c13b3169cc136c4d7ad52e04dc6a38` |

The active branch advanced by six commits during review. Its updated renderer was included and verification repeated. No claim is made about future revisions of this moving branch. Before applying the patch to another revision, its complete context must be checked again.

Forty-three downloaded source inputs were verified against their Git blob IDs. The preview uses the repository's shared exporter modules and synthetic fixtures in an isolated local source directory. It does not run the full application UI, production download flow or remote CI. It preserves all Sidebar-only source files and the unchanged Fidelity-only cover composition/avatar helpers.

## Actual shared-code overlap

Four product files are changed by both workstreams. The text combination has conflicts in two files, across three hunks. These were reviewed explicitly; selecting one whole branch version would discard necessary behavior.

| File/area                            | Resolution in the prepared patch                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build-model.ts`, avatar guard       | Keep both active explicit avatar modes, `single-owner` and `writer-vml`; retain Sidebar reference alignment and body-story composition elsewhere.                                  |
| `renderer.ts`, imports               | Keep both `nativePictureFrameRun` and `nativeVMLAvatarRun`.                                                                                                                        |
| `renderer.ts`, image paragraph       | Keep the active exact-height zero-gap branch for a page-authored non-wrapping photo. For ordinary inline images, retain the Sidebar typed picture owner and automatic line height. |
| `renderer.ts`, later Fidelity update | Preserve foreground photo drawing (`behindDoc=0`) independently of `wrapNone`/`allowOverlap=1`; no-wrap must not silently put the photo behind the cover paint.                    |
| `model.ts` and `validation.ts`       | No textual conflict; keep both authored-page photo/shape properties and guarded Sidebar section-start rules.                                                                       |

The prepared renderer therefore retains the newest cover-picture path without returning the Sidebar picture to a paragraph-owning control. No template-specific Sidebar renderer, engine patch or compensating geometry offset is introduced.

## Verification

| Check                                         | Result                                                                                                                  |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Existing Sidebar/picture/renderer/grid suites | 54 tests passed, seven suites                                                                                           |
| New combined serializer regression            | 2 passed: a Neon authored cover photo and a free Sidebar portrait in the same export, in each physical side orientation |
| Focused TypeScript                            | Passed for exporter modules and transitive dependencies                                                                 |
| Existing DrawingML avatar smoke               | 3/3 variants and guard passed; serialization only                                                                       |
| Existing VML avatar smoke                     | 3/3 variants and guard passed; serialization only                                                                       |
| Six regenerated dossier sources               | 6/6 byte-identical, including source image data, crop, fields, native geometry and full package bytes                   |
| Patch dry run on pinned target files          | Passed                                                                                                                  |
| Actual patch replay into scratch              | Passed; all 21 resulting file hashes match the reviewed preview                                                         |
| Full application build, lint and remote CI    | Not run or dispatched                                                                                                   |
| New Word or visual cover approval             | Not claimed                                                                                                             |

The two new serializer tests preserve original media reuse, the native Sidebar picture SDT and its separate paragraph ownership, the cover photo's page-relative no-wrap/foreground policy, immutable input and the normal export gate. Their decoration adapter is deliberately synthetic; these are structure tests, not cover appearance acceptance.

Because the six complete DOCX sources are identical, no additional render or repeated user Word round is justified for those same files. Existing Word evidence continues to apply to exactly its tested cases, not to all six dossiers or every possible Sidebar.

### Cover baseline remains open

The current cover-placeholder suite returns **18 passed / 6 failed** both in the pinned unmodified Fidelity exporter and in the combined preview. The passing/failing test names match exactly. The failures concern the separate no-photo circle paint and the native shape text-height guard for Verlauf, Neon and Freundlich. They are not classified as Sidebar regressions, fixed here or turned into passing tests. This preparation does not establish that the entire target branch is green.

The [machine evidence](docx-next-sidebar-integration-21okt-evidence.json) records both baseline outcomes, the pinned inputs, reviewed resolutions, package hashes and patch replay hashes. The [Word return report](docx-next-sidebar-word-photo-21okt.md) remains the authority for the confirmed two photo cases.

## Transport contents and next decision

The patch contains ten shared exporter product files, seven regression/fixture files and four existing diagnostic scripts. The extra combined test exists only inside this transport patch because the isolated Sidebar branch intentionally does not contain the newer Fidelity-only options it exercises. The transport SHA-256 is `4caa20f8018ea8a5b8dc8db9da86d0aba941e1a4b70acb1dadd5e3ef87732b5a`.

**Ready for the pinned integration source review; no unconditional merge or production GO.** A separate integration decision must select the target revision, preserve the reviewed overlap and complete the target application's checks. Existing cover failures, manual picture replacement/crop reset, repeated Word reopen and the broader acceptance matrix remain recorded separately. No current user test request is added.

Only this report, its evidence, its reviewable patch and three Sidebar status entry points are published on the isolated Sidebar branch. Historical Writer evidence remains intact. Neither the active Fidelity branch nor `dev`, `main` or `render` is modified; no merge, deployment, engine change, CI dispatch or production export switch occurs.
