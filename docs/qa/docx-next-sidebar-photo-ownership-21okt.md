# Sidebar photo ownership repair — 21 October 2026

**PARTIAL fix. The application-owned photo/field ownership defect is repaired in the tested Writer runtime. Original shaped-photo pixels and exact mirrored grid stability still fail. Desktop Word is unverified; production gates stay closed.**

Base: remote `dev` at `8901a830a792d75e9e792345c5180827218b4e1e`. Fix branch: `fix/docx-next-sidebar-photo-ownership-21okt`. The preceding [architecture audit](https://github.com/modebrecht/cv-cover-charm/blob/c5882dd1ea2449b45477a7842488355a5ee40903/docs/qa/docx-next-sidebar-root-cause-audit-21okt.md) is unchanged.

## Implemented repair

An inline picture is now an explicitly typed picture SDT (`w:picture`) **inside a dedicated real paragraph**, instead of a generic block SDT owning that paragraph. It has a canonical field tag and an independent, unique positive Word instance ID. Its owned DrawingML picture, embedded complete normalized image and authored crop/frame remain native. No text is rasterized and no per-template branch is introduced.

This is a measured application correction, not a claim about the exact internal importer path: the old source loses picture and following field IDs on the available Writer runtime; the new source retains them. A typed block wrapper alone retained the photo but still lost following IDs. The retained inline composition fixes both in these controls. Earlier PopSdt/paragraph-disposal observations are not promoted to a universal causal explanation.

The picture paragraph uses explicit single line spacing with the existing 3 mm trailing gap, avoiding inheritance of text leading around the picture control. A first variant with inherited leading moved following text 2.25 pt. The final variant's maximum source-render text displacement against the old exporter is 0.150025 pt (about 0.053 mm), with no horizontal movement or page-count change in the measured controls. Photo cases are therefore not claimed pixel-identical to the old source. No compensating coordinate offset is used.

Documents with semantic images also declare `w:doNotAutoCompressPictures` after `w:compat`, in schema order. This is standards-based save-compression policy, **not a repair for Writer's destructive nonrectangular crop conversion**. No-photo source packages retain exact bytes.

## Actual verification

Runtime: **LibreOfficeDev 26.8.0.0.alpha0**, build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`, stock `soffice` CLI. This is different from the historical 25.8.7.3/Kit runtime; results are not substituted into that baseline.

Six fresh application sources use the real snapshot → model → shared renderer path with an explicit full 120×180 synthetic PNG adapter. They are not a replay of the official browser-normalized 22-case packet. Four photo cases and two no-photo controls each undergo two real save/reopen conversions. PDFs are rendered for old and final sources and final save 2; page-three comparisons were visually inspected.

| Case | Old source IDs → first save | Fixed first save | Fixed second save | Photo remains inside its control |
| --- | --- | --- | --- | --- |
| photo-left | 78 → 30 | 78/78 | 78/78 | Yes, both saves |
| photo-right | 78 → 56 | 78/78 | 78/78 | Yes, both saves |
| photo-free-mirrored-side | 78 → 56 | 78/78 | 78/78 | Yes, both saves |
| photo-free-portrait | 78 → 51 | 78/78 | 78/78 | Yes, both saves |
| left, no photo | 77 → 77 | 77/77 | 77/77 | Not applicable |
| both-long-right, no photo | 382 → 382 | 382/382 | 382/382 | Not applicable |

All final canonical IDs and their complete text survive in both save phases. Each semantic photo drawing occurs once and stays inside its own tagged SDT. Complete native text sequences survive independently. Page counts remain 3, 11, 3, 3, 3 and 4 respectively. Both no-photo DOCX sources remain byte-identical to the base exporter and their source-render pixels remain identical.

- **51/51 Bun tests** across eight relevant existing/new test files, 1,213 `expect()` calls. Bun 1.3.11. Four new tests additionally use Node strict assertions.
- **5/5 Python adversarial tests:** visible text with missing fields; hollow photo tag; owned but cropped bitmap; changed crop encoding with preserved pixels; duplicate unowned drawing.
- **Focused TypeScript check passes:** both changed production modules and their transitive type dependencies. This is not a full application build/typecheck claim.
- **Formatting passes:** all five changed/new TypeScript files with Prettier 3.7.3.
- Immutable model/JSON-restored package checks, unique picture IDs, full source asset bytes, shared media relationships and unchanged Sidebar opt-in guards pass.

[Machine evidence](docx-next-sidebar-photo-ownership-21okt-evidence.json) binds source/saved packages, runtime, decoded photo pixels, crop markup, exact grids and separate verdicts. Original pixel failure is deliberately retained, including an actual strict-pixel assertion failure.

## Remaining failures

Writer still converts cropped circles/rounded pictures into image-fill shapes referencing reduced bitmap data. In the final test this occurs despite typed picture ownership and the no-auto-compression setting. Neither a surviving SDT nor passing field tests accepts those pixels. Crops remain editable source declarations before the editor saves; original-image recovery after Writer save is still rejected.

The known mirrored exact grid changes also remain. No column-width compensation, engine patch, assertion relaxation or support-policy change was introduced. The old 22-case and lifetime gates are untouched. No desktop Microsoft Word test, full 22-case rerun, full application build, CI dispatch, merge, deployment or production switch ran.

## Reproduce the bounded ownership test

```sh
bun scripts/docx-next-picture-ownership-probe.ts OUT FULL_PHOTO.png
soffice -env:UserInstallation=file:///ABS/qa-profile-1 --headless --convert-to 'docx:Office Open XML Text' --outdir OUT/save1 OUT/*.docx
soffice -env:UserInstallation=file:///ABS/qa-profile-2 --headless --convert-to 'docx:Office Open XML Text' --outdir OUT/save2 OUT/save1/*.docx
python3 scripts/docx-next-picture-ownership-qa.py OUT OUT/save1 OUT/ownership.json --saved2 OUT/save2 --runtime 'EXACT EDITOR BUILD / INTERFACE'
python3 scripts/docx-next-picture-ownership-test.py
```

The ownership command reports `ownershipGate`, `originalPixelGate` and Word status separately. Add `--require-pixels` to require full original pixels as well; it fails on this Writer result. A successful ownership command alone never means full Sidebar acceptance. Independent existing acceptance scripts remain authoritative and unchanged.

## Next concrete action

Open the fresh fixed `photo-right` and `photo-free-portrait` sources in desktop Word. Save/close/reopen, change a field after the photo, and adjust/reset its crop to expose the hidden original regions. Retain those saved DOCX packages and the exact Word build. This will establish whether the remaining destructive crop is Writer-specific in the target composition. Do not merge/promote on the strength of Writer ownership alone. The full 22-case acceptance remains a later release requirement.

Primary references: [picture SDT contract](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtcontentpicture?view=openxml-3.0.1), [save-compression policy](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.donotautocompresspictures?view=openxml-3.0.1). These establish OOXML semantics, not measured Word acceptance.
