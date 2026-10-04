# Brief implementation coverage

**3/39 templates configured (Brief, Warm, Prism); 0/39 Word-accepted migrations.** This page covers Brief; [Warm coverage](warm-feature-coverage.md) and [Prism coverage](prism-feature-coverage.md) are separate. The independent model, renderer and package foundation is implemented through Gate 4. Gates 5/6 remain open. The other descriptors cannot silently use a family fallback.

## Mapped editor inputs

| Input                                                       | Word representation                                                                        | Evidence                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Cover text, typography, colors, lists, custom fields        | Native paragraphs/runs and flowing boxes                                                   | Cover typography/list/custom fixtures; semantic identity tests                  |
| Letter fields, rich body, signature and attachments         | Native paragraphs, runs, numbering and tables                                              | Short/long, rich, table/list fixtures                                           |
| Letter separator toggles                                    | Border on the last known nonempty sender/recipient paragraph and subject                   | `layout-letter-rules`; empty-group test; three rendered rules after save/reopen |
| Personal information alignment and colons                   | Equal-width contact pairs plus a 30/70 label/value table; optional plain paragraphs        | Aligned/plain fixtures; raw value IDs and independent styles                    |
| Paired references                                           | Equal-width native tables, splittable rows; odd final reference stays left                 | Paired/stacked/long fixtures; half-width sections stack references              |
| Rubric horizontal offset                                    | Native paragraph indent −6…+6 mm                                                           | Positive/negative render-coordinate checks after save/reopen                    |
| Rubric content indent                                       | Native paragraph/table indent 0…12 mm; available table width shrinks                       | Model/package tests and rendered coordinates                                    |
| Section gap                                                 | Snapshot of the existing portable setting; native paragraph spacing 0…12 mm                | Editor JSON/save-load/model check; rendered position comparison                 |
| Rubric badge                                                | Tinted native run shading derived from heading ink and paper                               | Native shading and rendered badge checks                                        |
| Full/short/no heading rules                                 | Native paragraph borders; generic 18 mm border paragraph for short rules                   | Native `keepNext`, length/position checks                                       |
| CV entries, custom sections, ordering, half-width, page two | Native paragraphs and grids                                                                | Long CV, 12 custom sections, half-section/continuation fixtures                 |
| Fonts and user typography                                   | Explicit eight-font policy, central styles/font table; embedding disabled                  | Fallback/offline/long fixtures; unsupported font rejection                      |
| Margins, chrome, colors and artwork                         | Native section/header/footer properties; pixels behind editable text                       | Chrome/paint/offset fixtures; known contact cells pruned before XML             |
| Photos, letter/custom images                                | Shared normalized media, native drawings, independent framing                              | Six image inputs; crop/aspect/placement/frame fixtures                          |
| Cover/custom text opacity                                   | Native ink composited against declared solid cell/paper color; text stays editable         | `opacity-native`, including exact rendered color after save/reopen              |
| Historical typography identity                              | Explicit saved-key bindings; canonical IDs cannot be redirected; conflicting records block | Source/binding tests; ambiguous anonymous records remain unsupported            |

| Standard / Luftig / Timeline / Magazin CV choices | Shared flow configurations; native date tracks and entry-owned axis where applicable | Nine short/long/image fixtures; fixed-width/date attachment/half-section checks |
| Continuation-only CV top margin | Native continuation section margin plus one first-page spacer; explicit pagination metadata | 0/10/40 mm and chrome fixtures; geometry/save-reopen checks |

## Word-oriented choices

Text flows when edited. Absolute source text coordinates and fixed heights do not create fixed text containers. Half-width headings cannot indent left across another cell: negative offsets clamp to zero there. Badges use rectangular native text shading rather than rounded browser pills. Short rules align with their heading even when the body has a different indent. Long paired reference rows may split; a reference name stays attached to its first detail where possible. Contact chrome removes only known source fields that it owns, including aligned cells; empty tables and orphan rules disappear.

Timeline uses an entry-owned native border; absolute browser axes and dots are omitted. Dated short rows stay together, while oversized descriptions continue through native pagination. The first-page margin is preserved by a flow spacer when it is at least the continuation margin; real chrome adds its reservation. Empty header distance is zero in this case.

These are shared semantic primitives, not template repair transforms. Decoration contains no user text. QA searches unique fixture probes to measure rendered output; production styling resolves IDs before XML.

The [source audit](source-boundary.md) records each consumed field group and the neutral DTO/compatibility adapter. Browser page assignments and measured rectangles never enter Next. The [stabilization report](stabilization-report.md) supersedes earlier automated counts.

## Outstanding before acceptance

| Item                                                       | State                                                                                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Windows Word open/edit/save/reopen                         | Not run: Word unavailable in this environment                                                                                    |
| macOS Word smoke test                                      | Not run; record if available                                                                                                     |
| Stable LibreOffice                                         | Complete: stable 25.8.7.3 Kit API, 85/85 fixtures and 472 pages including save/reopen; [runtime evidence](libreoffice-qa.md)     |
| Approved Word-oriented snapshots                           | Candidate renderings only                                                                                                        |
| Older anonymous saved typography                           | Explicit identity bindings supported; ambiguous identities remain blocked                                                        |
| Free CV section positioning                                | Explicit model issue; Word flow conversion requires acceptance                                                                   |
| Continuation margin larger than first-page margin          | Explicit blocking model issue: one flowing section cannot preserve a smaller first-page margin with a larger continuation margin |
| Enabled font embedding                                     | Unsupported under the current disabled-embedding policy                                                                          |
| Translucent semantic images                                | Explicit blocking issue; the attempted native alpha was ignored by LibreOfficeDev, so no opaque fallback is exported             |
| Modern/sidebar, remaining templates, production switchover | Later gates; blocked rather than silently simulated                                                                              |

Completion still requires all template migrations, production comparison/switchover on `dev`, import-audited legacy removal, and final regression/Word acceptance. Automated Brief progress alone does not pass those gates.
