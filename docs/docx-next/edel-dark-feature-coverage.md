# Edel Dark candidate — 2026-10-08

Base: freshly fetched `dev` at `67ff63a9000b91383579889eac6ceb85f2969d0f`. This isolated template branch configures **Edel Dark (`edelDark`)** by reusing `EDEL` and changing only its ID, archetype and default palette. Its authored `sheet` slot is resolved by the existing shared interior palette functions. No renderer, model, layout, photo or export primitive changes.

The app definition in `src/components/cover/fresh-templates.ts` deliberately shares Edel's established cover geometry through `src/components/cover/layouts.ts`. Next retains that same relationship. Dark cover and interior paper are `171716`, ink is `F3EEE5`, and gold is `C7A35A`. Explicit paper, field colors/fonts, source photo shape/crop and rich text retain existing precedence.

| Coverage                      | Actual result                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate configuration       | 30/39 active templates configured on this branch                                                                                                    |
| Microsoft Word acceptance     | 0/39; pending                                                                                                                                       |
| Normal cover, letter, CV      | Stable render and Save/Reopen pass                                                                                                                  |
| Long letter / long CV         | Complete text, expected pagination, entry attachment and body bounds pass                                                                           |
| Long cover                    | Three cover pages; repeated dark paper and gold frames pass                                                                                         |
| Pictures                      | Cover/CV/inline letter photos use existing native implementation; immutable input/model/package JSON restoration passes                             |
| Shared CV compositions        | Standard, timeline, editorial (`magazin`) fixtures pass; experimental Sidebar acceptance is not expanded                                            |
| Chrome                        | Contact, compact, off, different first/continuation fixtures pass                                                                                   |
| Authored settings             | Custom colors, paper overrides, fonts, rich content and CV motif visibility pass                                                                    |
| Packages                      | ZIP/XML/content types/relationships, source and native saved packages pass existing checks                                                          |
| LibreOffice                   | Pinned stable LibreOfficeKit 25.8.7.3 with the complete existing shared font inventory: 14 fixtures / 110 pages, plus Save/Reopen and second PDFs   |
| Semantic IDs                  | Existing read-only audit: all 1,653 source tagged fields retain matching IDs and complete text after native saving                                  |
| Existing container limitation | All 14 saved packages lose table captions. This is recorded separately, not repaired or accepted                                                    |
| Editor / portable JSON / PDF  | Actual photo-bearing edit/reload, save/load, explicit Next snapshot/export and combined production PDF pass; PDF has three pages and edited CV name |
| Existing candidates           | 41 prior Edel, Verlauf 3 and Modern packages regenerate byte-identically; their three normal dossiers / 12 pages pass stable render/Save-Reopen     |
| Local checks                  | 1,014 full units; 305 existing targeted Next tests plus 5 Edel Dark tests; TypeScript, changed-file lint/format and production build pass           |

Representative photo cover, native letter and long-CV continuation are visually reviewed. These are candidate references; no user-approved snapshot or Word acceptance is claimed. Native original-pixel/crop acceptance is not inferred from the JSON/photo or render checks.

Reproduce with the existing tools:

```sh
bun test tests/unit/docx-next-edel-dark.test.ts
python scripts/docx-next-fixture-images.py "$QA_ROOT/images.json"
bun scripts/docx-next-fixtures.ts "$QA_ROOT" --edelDark --verify-json
python scripts/docx-next-render-qa.py "$QA_ROOT" --libreofficekit "$LO_KIT" --require-stable --roundtrip
python scripts/docx-next-native-identity-qa.py "$QA_ROOT"
DOCX_NEXT_EDITOR_TEMPLATE=edelDark bun scripts/docx-next-candidate-editor-qa.ts "$EDITOR_ROOT" "$QA_ROOT/images.json"
```

Use an empty QA directory and the existing pinned engine setup with `stable-lo-fonts.json` for the recorded pagination. The audit's text result passes while its table-caption acceptance stays failed. [Exact hashes and evidence](edel-dark-stress-evidence.json).
