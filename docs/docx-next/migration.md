# DOCX Next migration ledger

39 active templates. **28/39 configured candidates (Brief, Warm, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe, Ledger, Ribbon, Sunrise, Forest Flow, Violet Pulse, Studio 3, Warm 2, Warm 3, Verlauf 2, Verlauf 3, Diagonal, Editorial/Klassisch, Edel, Seriös, Colorful, Blockig, Horizont, Modern, Rahmen); 0/39 Microsoft Word accepted migrations.** Remote `dev` was freshly fetched and verified at `a2591ed1440f283e30d268f091f4b7d40fa70b5b` at batch start on 2026-10-05, with a clean tree and green M6 CI. The foundation is implemented through Gate 4. Candidate registration is distinct from acceptance. [Brief coverage](brief-feature-coverage.md), [Warm coverage](warm-feature-coverage.md), [Prism coverage](prism-feature-coverage.md), [Human coverage](human-feature-coverage.md) and [Orbit coverage](orbit-feature-coverage.md) record limits and evidence; automated checks do not establish Word acceptance.

| Template      | Archetype           | Status                                      | Primitive                                                                                                                                          | QA                                                          |
| ------------- | ------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `brief`       | Minimal             | Prototype; Gate 5 pending                   | Native flow / tables / columns / paint / lists / custom elements                                                                                   | 84 automated render and LO roundtrip fixtures; Word pending |
| `klassisch`   | Editorial           | Isolated candidate; Word acceptance pending | Shared outline page frames, semantic hero start/fallback, native centered photo and growing contact/attachment cells                               | 14 stable LO render/save-reopen fixtures; Word pending      |
| `modern`      | Graphic             | Isolated candidate; Word acceptance pending | Shared native photo rail, semantic hero flow, explicit decorative visibility and palette-aware compact footer contrast                             | 13 stable LO render/save-reopen fixtures; Word pending      |
| `freundlich`  | Organic / Editorial | Isolated candidate; Word acceptance pending | Native cover rows, compact masthead, scoped circle paint                                                                                           | 13 stable LO render/save-reopen fixtures; Word pending      |
| `edel`        | Editorial           | Isolated candidate; Word acceptance pending | Shared double outline frames, semantic hero starts, native circle photo/crop and opt-in page paint ordering by layer                               | 14 stable LO render/save-reopen fixtures; Word pending      |
| `colorful`    | Graphic             | Isolated candidate; Word acceptance pending | Existing native metadata/contact rows, circular photos, source rectangle paint, palette-bound running bands and per-part footer motifs             | 13 stable LO render/save-reopen fixtures; Word pending      |
| `blockig`     | Graphic             | Isolated candidate; Word acceptance pending | Shared grouped semantic hero, authored solid rectangle consumption as growing native cell shading, native contact/photos and decorative edge rails | 14 stable LO render/save-reopen fixtures; Word pending      |
| `serioes`     | Minimal             | Isolated candidate; Word acceptance pending | Shared native flowing separator with authored thickness, semantic hero start, navy edge bands and scoped first/continuation paint                  | 13 stable LO render/save-reopen fixtures; Word pending      |
| `human`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Native photo-left hero, shared bands, per-part page motifs                                                                                         | 12 stable LO render/save-reopen fixtures; Word pending      |
| `welle`       | Editorial           | Isolated candidate; Word acceptance pending | Shared native split hero, authored growing contact rows/top borders, footer surface contrast, cubic footer artwork and Serif dossier defaults      | 14 stable LO render/save-reopen fixtures; Word pending      |
| `terracotta`  | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `pastell`     | Editorial           | Isolated candidate; Word acceptance pending | Existing ordered outline frames, centered native photos, serif dossier defaults, flowing authored separator and growing contact columns            | 14 stable LO render/save-reopen fixtures; Word pending      |
| `sonne`       | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `studio`      | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `neon`        | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `aurora`      | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `verlauf`     | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `citrus`      | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `edelDark`    | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `edge`        | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `glow`        | Graphic / Editorial | Isolated candidate; Word acceptance pending | Independent rectangle corners, radial transparency and header-off motif fallback                                                                   | 13 stable LO render/save-reopen fixtures; Word pending      |
| `monoLuxe`    | Editorial           | Isolated candidate; Word acceptance pending | Shared native cover rows, motif-only chrome and palette-bound page paint                                                                           | 13 stable LO render/save-reopen fixtures; Word pending      |
| `horizon`     | Graphic / Editorial | Isolated candidate; Word acceptance pending | Existing corner, linear-gradient, radial-fade, native-photo and header-off primitives                                                              | 13 stable LO render/save-reopen fixtures; Word pending      |
| `sunrise`     | Graphic / Editorial | Isolated candidate; Word acceptance pending | Validated cubic contour paint, native cover rows/photos and scoped chrome                                                                          | 13 stable LO render/save-reopen fixtures; Word pending      |
| `forestFlow`  | Graphic / Editorial | Isolated candidate; Word acceptance pending | Native cover gutters, semantic field leads/dossier-font defaults, native rail columns and scoped page motifs                                       | 13 stable LO render/save-reopen fixtures; Word pending      |
| `violetPulse` | Graphic / Editorial | Isolated candidate; Word acceptance pending | Existing shared cubic contours, radial fades, dossier-font cover roles and motif-only chrome                                                       | 13 stable LO render/save-reopen fixtures; Word pending      |
| `studio2`     | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `studio3`     | Organic / Editorial | Isolated candidate; Word acceptance pending | Native cover hero flow, two-tone contact stories, polygon paint and independent rectangle corners                                                  | 13 stable LO render/save-reopen fixtures; Word pending      |
| `warm2`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Shared centered native hero, bounded cubic counter-field, curved stationery and native contact flow                                                | 13 stable LO render/save-reopen fixtures; Word pending      |
| `warm3`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Native centered cover flow, independent corner paint and per-part two-tone stationery                                                              | 13 stable LO render/save-reopen fixtures; Word pending      |
| `verlauf2`    | Graphic             | Isolated candidate; Word acceptance pending | Multi-stop nonsemantic gradients, fixed bloom paint, semantic interior palette policy and uniform field palette roles                              | 14 stable LO render/save-reopen fixtures; Word pending      |
| `verlauf3`    | Graphic             | Isolated candidate; Word acceptance pending | Existing multi-stop gradient, fixed radial bloom, uniform semantic field palette and interior palette policy                                       | 14 stable LO render/save-reopen fixtures; Word pending      |
| `ledger`      | Editorial           | Isolated candidate; Word acceptance pending | Native cover columns, shared scoped motifs and running chrome                                                                                      | 13 stable LO render/save-reopen fixtures; Word pending      |
| `prism`       | Graphic             | Isolated candidate; Word acceptance pending | Grouped native cover cells, declarative polygon motifs                                                                                             | 14 stable LO render/save-reopen fixtures; Word pending      |
| `gallery`     | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                                                            | Pending                                                     |
| `orbit`       | Graphic             | Isolated candidate; Word acceptance pending | Right native photo, shared cover alignment/clearance, outline page motifs                                                                          | 13 stable LO render/save-reopen fixtures; Word pending      |
| `ribbon`      | Editorial           | Isolated candidate; Word acceptance pending | Native cover columns, shared scoped motifs and running chrome                                                                                      | 13 stable LO render/save-reopen fixtures; Word pending      |
| `cove`        | Graphic / Editorial | Isolated candidate; Word acceptance pending | Independent rectangle corners and header-off motif fallback                                                                                        | 13 stable LO render/save-reopen fixtures; Word pending      |
| `diagonal`    | Graphic             | Isolated candidate; Word acceptance pending | Authored bounded polygon shorthand, native per-cell callout surfaces, asymmetric cover columns and per-part corner motifs                          | 13 stable LO render/save-reopen fixtures; Word pending      |

Cove batch checkpoint: [coverage](cove-feature-coverage.md), [evidence](cove-stress-report.md). CI deferred to the final batch head; Microsoft Word acceptance: pending.

Glow batch checkpoint: [coverage](glow-feature-coverage.md), [evidence](glow-stress-report.md). CI deferred to the final batch head; Microsoft Word acceptance: pending.

Horizon batch checkpoint: [coverage](horizon-feature-coverage.md), [evidence](horizon-stress-report.md). CI deferred to the final batch head; Microsoft Word acceptance: pending.

Mono Luxe batch checkpoint: [coverage](mono-luxe-feature-coverage.md), [evidence](mono-luxe-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Ledger batch checkpoint: [coverage](ledger-feature-coverage.md), [evidence](ledger-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Ribbon batch checkpoint: [coverage](ribbon-feature-coverage.md), [evidence](ribbon-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Sunrise batch checkpoint: [coverage](sunrise-feature-coverage.md), [evidence](sunrise-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Forest Flow batch checkpoint: [coverage](forestFlow-feature-coverage.md), [evidence](forestFlow-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Violet Pulse batch checkpoint: [coverage](violetPulse-feature-coverage.md), [evidence](violetPulse-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Studio 3 checkpoint: [coverage](studio3-feature-coverage.md), [evidence](studio3-stress-report.md). CI deferred to final batch head; Word acceptance pending.

Warm 2 checkpoint: [coverage](warm2-feature-coverage.md), [evidence](warm2-stress-report.md). CI deferred to final batch head; Word acceptance pending.

Warm 3 checkpoint: [coverage](warm3-feature-coverage.md), [evidence](warm3-stress-report.md). CI deferred to final batch head; Word acceptance pending.

Verlauf 2 batch checkpoint: [coverage](verlauf2-feature-coverage.md), [evidence](verlauf2-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Verlauf 3 batch checkpoint: [coverage](verlauf3-feature-coverage.md), [evidence](verlauf3-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Diagonal batch checkpoint: [coverage](diagonal-feature-coverage.md), [evidence](diagonal-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Editorial (Klassisch) batch checkpoint: [coverage](klassisch-feature-coverage.md), [evidence](klassisch-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Edel batch checkpoint: [coverage](edel-feature-coverage.md), [evidence](edel-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Seriös batch checkpoint: [coverage](serioes-feature-coverage.md), [evidence](serioes-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Colorful batch checkpoint: [coverage](colorful-feature-coverage.md), [evidence](colorful-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Blockig batch checkpoint: [coverage](blockig-feature-coverage.md), [evidence](blockig-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Horizont batch checkpoint: [coverage](welle-feature-coverage.md), [evidence](welle-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Modern batch checkpoint: [coverage](modern-feature-coverage.md), [evidence](modern-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.

Rahmen batch checkpoint: [coverage](pastell-feature-coverage.md), [evidence](pastell-stress-report.md). CI deferred to final batch head; Microsoft Word acceptance: pending.
