# DOCX Next migration ledger

39 active templates. **17/39 configured candidates (Brief, Warm, Prism, Human, Orbit, Cove, Glow, Horizon, Mono Luxe, Ledger, Ribbon, Sunrise, Forest Flow, Violet Pulse, Studio 3, Warm 2, Warm 3); 0/39 Microsoft Word accepted migrations.** Remote `dev` was freshly fetched and verified at `c4525f9b394725bdb30c48732f725b086260ae55` at batch start on 2026-10-05, with a clean tree and green M6 CI. The foundation is implemented through Gate 4. Candidate registration is distinct from acceptance. [Brief coverage](brief-feature-coverage.md), [Warm coverage](warm-feature-coverage.md), [Prism coverage](prism-feature-coverage.md), [Human coverage](human-feature-coverage.md) and [Orbit coverage](orbit-feature-coverage.md) record limits and evidence; automated checks do not establish Word acceptance.

| Template      | Archetype           | Status                                      | Primitive                                                                                                    | QA                                                          |
| ------------- | ------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `brief`       | Minimal             | Prototype; Gate 5 pending                   | Native flow / tables / columns / paint / lists / custom elements                                             | 84 automated render and LO roundtrip fixtures; Word pending |
| `klassisch`   | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `modern`      | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `freundlich`  | Organic / Editorial | Isolated candidate; Word acceptance pending | Native cover rows, compact masthead, scoped circle paint                                                     | 13 stable LO render/save-reopen fixtures; Word pending      |
| `edel`        | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `colorful`    | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `blockig`     | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `serioes`     | Minimal             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `human`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Native photo-left hero, shared bands, per-part page motifs                                                   | 12 stable LO render/save-reopen fixtures; Word pending      |
| `welle`       | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `terracotta`  | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `pastell`     | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `sonne`       | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `studio`      | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `neon`        | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `aurora`      | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `verlauf`     | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `citrus`      | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `edelDark`    | Editorial           | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `edge`        | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `glow`        | Graphic / Editorial | Isolated candidate; Word acceptance pending | Independent rectangle corners, radial transparency and header-off motif fallback                             | 13 stable LO render/save-reopen fixtures; Word pending      |
| `monoLuxe`    | Editorial           | Isolated candidate; Word acceptance pending | Shared native cover rows, motif-only chrome and palette-bound page paint                                     | 13 stable LO render/save-reopen fixtures; Word pending      |
| `horizon`     | Graphic / Editorial | Isolated candidate; Word acceptance pending | Existing corner, linear-gradient, radial-fade, native-photo and header-off primitives                        | 13 stable LO render/save-reopen fixtures; Word pending      |
| `sunrise`     | Graphic / Editorial | Isolated candidate; Word acceptance pending | Validated cubic contour paint, native cover rows/photos and scoped chrome                                    | 13 stable LO render/save-reopen fixtures; Word pending      |
| `forestFlow`  | Graphic / Editorial | Isolated candidate; Word acceptance pending | Native cover gutters, semantic field leads/dossier-font defaults, native rail columns and scoped page motifs | 13 stable LO render/save-reopen fixtures; Word pending      |
| `violetPulse` | Graphic / Editorial | Isolated candidate; Word acceptance pending | Existing shared cubic contours, radial fades, dossier-font cover roles and motif-only chrome                 | 13 stable LO render/save-reopen fixtures; Word pending      |
| `studio2`     | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `studio3`     | Organic / Editorial | Isolated candidate; Word acceptance pending | Native cover hero flow, two-tone contact stories, polygon paint and independent rectangle corners            | 13 stable LO render/save-reopen fixtures; Word pending      |
| `warm2`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Shared centered native hero, bounded cubic counter-field, curved stationery and native contact flow          | 13 stable LO render/save-reopen fixtures; Word pending      |
| `warm3`       | Organic / Editorial | Isolated candidate; Word acceptance pending | Native centered cover flow, independent corner paint and per-part two-tone stationery                        | 13 stable LO render/save-reopen fixtures; Word pending      |
| `verlauf2`    | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `verlauf3`    | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `ledger`      | Editorial           | Isolated candidate; Word acceptance pending | Native cover columns, shared scoped motifs and running chrome                                                | 13 stable LO render/save-reopen fixtures; Word pending      |
| `prism`       | Graphic             | Isolated candidate; Word acceptance pending | Grouped native cover cells, declarative polygon motifs                                                       | 14 stable LO render/save-reopen fixtures; Word pending      |
| `gallery`     | Sidebar             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |
| `orbit`       | Graphic             | Isolated candidate; Word acceptance pending | Right native photo, shared cover alignment/clearance, outline page motifs                                    | 13 stable LO render/save-reopen fixtures; Word pending      |
| `ribbon`      | Editorial           | Isolated candidate; Word acceptance pending | Native cover columns, shared scoped motifs and running chrome                                                | 13 stable LO render/save-reopen fixtures; Word pending      |
| `cove`        | Graphic / Editorial | Isolated candidate; Word acceptance pending | Independent rectangle corners and header-off motif fallback                                                  | 13 stable LO render/save-reopen fixtures; Word pending      |
| `diagonal`    | Graphic             | Inventoried; migration blocked by Gate 5    | Pending                                                                                                      | Pending                                                     |

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
