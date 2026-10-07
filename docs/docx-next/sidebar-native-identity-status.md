# Save/Reopen loses native identity despite complete text

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

Next bounded task: isolate the native photo-zone nesting from a matched inline-picture control, using the same canonical photo ID, source/crop/frame and a zero-inset geometry control. Keep main/side text, widths and attachment flags unchanged. Check complete native/PDF text, each original field ID after native Save/Reopen, photo geometry and opening attachment; run right first and stop on regression. Treat table-caption preservation as a separate unresolved container-identity requirement. Do not enable an application path or infer an engine repair from visible text alone.
