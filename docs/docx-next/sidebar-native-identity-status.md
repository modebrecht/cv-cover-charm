# Save/Reopen loses native identity despite complete text

Pinned stable comparison now differs from the local result: [source 8059c16b, run 37621549458](https://github.com/modebrecht/cv-cover-charm/actions/runs/37621549458) preserves every tagged field in all 31 canonical browser fixtures after native Save/Reopen. It still loses table captions in all 31. The full application regression on that source also passes. The local report below uses a different image adapter and engine/interface; an exact browser-source replay isolates those inputs separately before attributing the field loss to a version.

**Exact-source replay completed:** [actual cross-runtime evidence](sidebar-engine-replay-evidence.json), source `3f23bcdd`, transfers the unchanged `sidebar-photo-main` DOCX from the completed stable supported job. SHA-256 `60e8e210395f1715b92cefff606f9089c40da1f89c338edf1aa16e12675d2fd2` matches in both environments. Stable 25.8.7.3/LibreOfficeKit preserves 78/78 tagged fields; Dev 26.8/soffice CLI preserves 51/78 and loses the same 27 fields as the local adapter specimen. Both retain complete native/PDF text, the image and four dossier pages after Save/Reopen; both lose the two container captions. No source edits or image renormalization occur in this replay. Source/image-adapter differences are excluded for this bounded case; the exact engine/interface cause remains unproven.

A read-only audit of the [31-fixture supported refresh](sidebar-supported-refresh-evidence.json) distinguishes complete native text from its canonical field controls. LibreOfficeDev 26.8.0.0.alpha0 preserves every complete saved native text value and the earlier owning-lane PDF/render/Save-Reopen checks pass, but **11 photo fixtures lose 1,462 tagged native fields**. Every one of the 31 saved files also loses native table captions, which carry container IDs. Original source packages and immutable input/model JSON restoration retain their IDs and photo data. Nothing patches or repairs the saved files.

| Photo fixture            | Missing or changed tagged fields |
| ------------------------ | -------------------------------- |
| photo-left               | 48                               |
| photo-right              | 46                               |
| photo-main               | 27                               |
| photo-free-main          | 27                               |
| photo-free-side          | 48                               |
| photo-free-mirrored-side | 46                               |
| photo-free-long          | 280                              |
| photo-free-side-long     | 353                              |
| photo-free-low           | 280                              |
| photo-free-portrait      | 27                               |
| photo-free-chrome        | 280                              |

Fixture names have the `sidebar-` prefix. The other 20 fixtures preserve their tagged fields; their container captions still disappear. The [actual local evidence](sidebar-native-identity-evidence.json) records source/saved SHA-256, field counts, every lost field ID and lost table IDs. Full per-field text hashes remain in the CI/native audit artifact. Empty-text picture controls also require their native identity; visible images alone cannot replace it.

This narrows the meaning of the earlier green supported refresh: it proves complete text, native source structure, geometry/images and reproducible saved rendering, plus portable input/model package restoration. It did not establish preservation of every semantic ID through an external editor's native save. That requirement now has a separate explicit gate. The available engine's cause and Microsoft Word behavior are unproven.

`docx-next-native-identity-qa.py` reads document/header/footer XML in the original and saved ZIPs. It compares exact tagged ID/text pairs and table captions, independently checks every complete source text value in saved native stories, and reports identity losses even when text survives. A text loss fails the command; known identity losses remain explicit rejected candidate evidence. The stable supported job runs this audit and includes its blocked result in the summary. Six synthetic-package integrity tests cover plain text without tags, changed IDs, truncated tagged text, lost captions and picture IDs. They do not certify an engine.

```sh
python scripts/docx-next-native-identity-qa.py /tmp/supported-sidebar
python scripts/docx-next-native-identity-test.py
```

No renderer/model/template/export changes. Experimental gates remain closed, 29/39 configured and 0/39 Word accepted; Microsoft Word and snapshots remain pending. Pinned stable and canonical browser observations are recorded separately from the local Pillow refresh. Green CI diagnostics cannot accept lost native identities.

Next bounded task: construct a minimal native picture/field identity control in ordinary body flow, a one-cell table and a mirrored two-cell table. Keep the same complete paragraphs, canonical photo ID/source/crop/frame and zero-inset geometry; avoid nested photo zones in the first control. Require complete native/PDF text, original field IDs after native Save/Reopen and picture geometry, on both available engine/interface combinations. This isolates picture/cell context without relying on template details or the long boundary specimen. Treat table-caption preservation as a separate unresolved container-identity requirement. Do not enable an application path or infer an engine repair from visible text alone.
