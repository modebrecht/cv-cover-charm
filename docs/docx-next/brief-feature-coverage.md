# Brief implementation coverage

**1/39 templates configured (Brief); 0/39 Word-accepted migrations.** The independent model, renderer and package foundation is implemented through Gate 4. Gates 5/6 remain open. The other descriptors cannot silently use a family fallback.

## Mapped editor inputs

| Input                                                       | Word representation                                                                 | Evidence                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Cover text, typography, colors, lists, custom fields        | Native paragraphs/runs and flowing boxes                                            | Cover typography/list/custom fixtures; semantic identity tests                  |
| Letter fields, rich body, signature and attachments         | Native paragraphs, runs, numbering and tables                                       | Short/long, rich, table/list fixtures                                           |
| Letter separator toggles                                    | Border on the last known nonempty sender/recipient paragraph and subject            | `layout-letter-rules`; empty-group test; three rendered rules after save/reopen |
| Personal information alignment and colons                   | Equal-width contact pairs plus a 30/70 label/value table; optional plain paragraphs | Aligned/plain fixtures; raw value IDs and independent styles                    |
| Paired references                                           | Equal-width native tables, splittable rows; odd final reference stays left          | Paired/stacked/long fixtures; half-width sections stack references              |
| Rubric horizontal offset                                    | Native paragraph indent −6…+6 mm                                                    | Positive/negative render-coordinate checks after save/reopen                    |
| Rubric content indent                                       | Native paragraph/table indent 0…12 mm; available table width shrinks                | Model/package tests and rendered coordinates                                    |
| Section gap                                                 | Snapshot of the existing portable setting; native paragraph spacing 0…12 mm         | Editor JSON/save-load/model check; rendered position comparison                 |
| Rubric badge                                                | Tinted native run shading derived from heading ink and paper                        | Native shading and rendered badge checks                                        |
| Full/short/no heading rules                                 | Native paragraph borders; generic 18 mm border paragraph for short rules            | Native `keepNext`, length/position checks                                       |
| CV entries, custom sections, ordering, half-width, page two | Native paragraphs and grids                                                         | Long CV, 12 custom sections, half-section/continuation fixtures                 |
| Fonts and user typography                                   | Explicit eight-font policy, central styles/font table; embedding disabled           | Fallback/offline/long fixtures; unsupported font rejection                      |
| Margins, chrome, colors and artwork                         | Native section/header/footer properties; pixels behind editable text                | Chrome/paint/offset fixtures; known contact cells pruned before XML             |
| Photos, letter/custom images                                | Shared normalized media, native drawings, independent framing                       | Six image inputs; crop/aspect/placement/frame fixtures                          |

## Word-oriented choices

Text flows when edited. Absolute source text coordinates and fixed heights do not create fixed text containers. Half-width headings cannot indent left across another cell: negative offsets clamp to zero there. Badges use rectangular native text shading rather than rounded browser pills. Short rules align with their heading even when the body has a different indent. Long paired reference rows may split; a reference name stays attached to its first detail where possible. Contact chrome removes only known source fields that it owns, including aligned cells; empty tables and orphan rules disappear.

These are shared semantic primitives, not template repair transforms. Decoration contains no user text. QA searches unique fixture probes to measure rendered output; production styling resolves IDs before XML.

## Outstanding before acceptance

| Item                                                            | State                                                                                                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows Word open/edit/save/reopen                              | Not run: Word unavailable in this environment                                                                                                        |
| macOS Word smoke test                                           | Not run; record if available                                                                                                                         |
| Stable LibreOffice                                              | Pending: available renderer is LibreOfficeDev 26.8 alpha                                                                                             |
| Approved Word-oriented snapshots                                | Candidate renderings only                                                                                                                            |
| Older anonymous saved typography                                | Explicit identity bindings supported; ambiguous identities remain blocked                                                                            |
| Free CV section positioning                                     | Explicit model issue; Word flow conversion requires acceptance                                                                                       |
| Alternate classic variants; continuation-only CV top margin/gap | Not fully mapped; current native body geometry is consistent throughout a logical part; resolve the product contract before accepting these controls |
| Enabled font embedding                                          | Unsupported under the current disabled-embedding policy                                                                                              |
| Modern/sidebar, remaining templates, production switchover      | Later gates; blocked rather than silently simulated                                                                                                  |

Completion still requires all template migrations, production comparison/switchover on `dev`, import-audited legacy removal, and final regression/Word acceptance. Automated Brief progress alone does not pass those gates.
