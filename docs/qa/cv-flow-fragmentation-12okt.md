# CV-Flow-Korrektur – F01 und F02

**PASS für den geprüften CV-Umfang.** Die beiden P1-Inhaltsverluste aus der unabhängigen Pagination-QA sind behoben. Überhohe Beschreibungen werden gemessen fragmentiert; Halbspalten und Masonry fliessen getrennt über Folgeseiten. Eine Seitenzahlbegrenzung oder Schriftverkleinerung wurde nicht eingeführt.

Dies ist eine separate Produktkorrektur nach der QA-Empfehlung. Der veröffentlichte QA-Branch und sein [Ausgangsbericht](https://github.com/modebrecht/cv-cover-charm/blob/a969351481a66c6e0eb79c7f744940bcbc851b8d/docs/qa/pagination-2page-11okt.md) bleiben unverändert. Die Briefbefunde F03–F06 sind weiterhin offen und gehören nicht zur Abnahme dieser CV-Korrektur.

## Quelle und Branch

- Branch: `fix/cv-flow-fragmentation-12okt`, frisch vom tatsächlich gefetchten `dev` erstellt.
- Autoritative Basis: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`.
- Veröffentlichter Codecommit: `c9874ab5e56840a90af06d04e8518f11a240cb7b`; Codebaum: `8e76098382a30867a4f524f1cdc8af8a09e5af36`.
- Ausgangsbelege: QA-Commit `000867568476fcb41716ade1d2fc1fa22f8701d4`, dessen Produktionsquellen exakt der Dev-Basis entsprechen.
- Renderer-Blob: `aaaf2ac992d964f7232cbc73dcbed714acdb9baf`; Flow-Modul-Blob: `687974cb6192fc9b269e24142568e06c39eb9ff4`.
- Die Entwicklungsmatrix lief auf der Dev-Basis mit Arbeitsdiff. Die vier Ausgangsreproduktionen wurden anschliessend nochmals auf dem veröffentlichten Codecommit ausgeführt. Der Vergleich enthält dessen tatsächliche SHA, Renderer-Blobs und identische Fixture-Hashes; er ersetzt die ursprünglichen FAIL-Belege nicht.
- Vite regeneriert die Reihenfolge von `src/routeTree.gen.ts`. Diese Änderung wurde nicht veröffentlicht; `sourceDirty` und `runtimeDiff` bleiben in Rohartefakten sichtbar.
- AGENTS.md gelesen. Kein Merge, keine Promotion, kein Deployment und keine Umschreibung veröffentlichter Historie.

## Änderung

`CvCanvasBase` liefert für seine bestehenden Entry-Knoten Text- und Spaltenmetadaten. Das gemeinsame Flow-Modul verwendet die realen DOM-Höhen und die vorhandenen Seitenkapazitäten. Fragmentmessungen erfolgen in einem versteckten Clone innerhalb derselben Vorlagen-/Spaltenumgebung; die sichtbaren Fragmente verwenden dieselbe Produktions-Entry-Funktion.

Gewöhnliche Einträge bleiben unverändert und werden weiterhin als Ganzes verschoben. Beschreibungen, die mit ihrer Überschrift nicht auf eine volle Seite passen, erhalten gemessene Wortfragmente; ungebrochene Tokens können an Graphemgrenzen getrennt werden. Der Text bleibt ohne Kürzung erhalten. Datum, Titel und Ort erscheinen nur am Anfang des Eintrags. Überschriften bleiben mit einem tatsächlichen Inhaltsfragment zusammen.

Spaltengruppen behalten ihre vorhandene Reihenfolge, Breite und Zuordnung. Eine abgearbeitete Spalte bleibt leer; die andere setzt in ihrer ursprünglichen Position fort. Damit wird Seite eins bereits gefüllt und überhoher Spalteninhalt nicht mehr als einzelner abgeschnittener Block platziert.

Nur zwei Produktionsdateien ändern sich: `CvCanvasBase.tsx` und das neue `flow-pagination.ts`. PDF-Export, DossierPdfCanvas, Briefrenderer, Template-CSS, globale Layoutregeln, gespeicherte Schemas, Bedienelemente und Native-Chromium-Code bleiben unverändert. Die QA verwendet die bestehenden Produktionskomponenten und den vorhandenen 39er-Katalog, keine eigene Renderer- oder Vorlagenkopie.

## Ausgeführte Prüfungen

| Prüfung                                                                                                      | Eindeutige Fälle | Ergebnis |
| ------------------------------------------------------------------------------------------------------------ | ---------------: | -------- |
| 39 Produktionsvorlagen × ein-/zweiseitiger CV                                                                |               78 | PASS     |
| Sieben Architekturrepräsentanten: letzte 1 / erste 2 / letzte 2 / erste 3 Seiten und Wiederherstellung       |                7 | PASS     |
| Sidebar links/rechts, Fotos, Luftig, Timeline, Magazin, Halbspalten, Masonry, grosse Einträge, eigene Ränder |               12 | PASS     |
| Live-Wechsel kurz/lang/kurz/lang ohne Reload                                                                 |                2 | PASS     |
| Grosse Einträge in Halbspalten, Masonry und rechter Sidebar mit eigenen Rändern                              |                3 | PASS     |
| Unterschiedlicher erster Header / Fortsetzungsheader und Beilagenfooter                                      |                2 | PASS     |
| **Neue CV-E2E-Fälle**                                                                                        |          **104** | **PASS** |
| Bestehende betroffene Produkt-E2E-Fälle                                                                      |               21 | PASS     |
| Unit-Tests inklusive zehn neuer Flow-Regressionen                                                            |            1’111 | PASS     |

125 eindeutige lokale Browserfälle bestanden. Fokussierte Wiederholungen werden nicht doppelt als neue Fälle gezählt. Die vier Ausgangsfehler bestehen auch bei der Wiederholung am veröffentlichten Codecommit. Keine Skips, Retries, Snapshots, automatisch aktualisierten Baselines oder gelockerten Toleranzen.

Die neuen Browserfälle auditieren **145 eindeutige CV-Zustände**, davon **125 mit automatisch erzeugtem Produktions-PDF**; kein PDF wurde blockiert. Die ergänzende Feldprüfung findet alle **8’048 dokumentbezogenen Feldwerte** in Web, kanonischem DOM und – soweit erzeugt – PDF. Die zehn neuen Unit-Fälle prüfen Zeichen-/Offset-Erhalt, Grapheme, unterschiedliche Seitenkapazitäten, normale Einträge, Überschriften, unabhängige Spalten, explizite Seitenzuweisung und Wiederholbarkeit. Ihre synthetischen Höhen prüfen nur die Orchestrierung; Browserprüfungen messen die echten Produktionsknoten.

Typecheck des Produkts und der QA, vollständige Unit-Suite, vollständiger Lint, Release-Formatierung, Formatierung aller geänderten Code-/Konfigurationsdateien und Produktionsbuild: **PASS**.

## Vorlagenmatrix und Grenzverhalten

Die folgende Tabelle wird aus den tatsächlich ausgeführten Fixtures erzeugt. Vorlagenbezeichnungen sind keine eigenständigen Rendererarchitekturen; massgeblich ist das gespeicherte CV-Layout.

| Vorlagen-ID   | CV-Layout | Kurze / lange Baseline | Ergebnis |
| ------------- | --------- | ---------------------- | -------- |
| `aurora`      | classic   | 1 / 2 Seiten           | PASS     |
| `blockig`     | classic   | 1 / 2 Seiten           | PASS     |
| `brief`       | classic   | 1 / 2 Seiten           | PASS     |
| `citrus`      | classic   | 1 / 2 Seiten           | PASS     |
| `colorful`    | classic   | 1 / 2 Seiten           | PASS     |
| `cove`        | classic   | 1 / 2 Seiten           | PASS     |
| `diagonal`    | classic   | 1 / 2 Seiten           | PASS     |
| `edel`        | classic   | 1 / 2 Seiten           | PASS     |
| `edelDark`    | classic   | 1 / 2 Seiten           | PASS     |
| `edge`        | classic   | 1 / 2 Seiten           | PASS     |
| `forestFlow`  | classic   | 1 / 2 Seiten           | PASS     |
| `freundlich`  | classic   | 1 / 2 Seiten           | PASS     |
| `gallery`     | classic   | 1 / 2 Seiten           | PASS     |
| `glow`        | classic   | 1 / 2 Seiten           | PASS     |
| `horizon`     | classic   | 1 / 2 Seiten           | PASS     |
| `human`       | classic   | 1 / 2 Seiten           | PASS     |
| `klassisch`   | classic   | 1 / 2 Seiten           | PASS     |
| `ledger`      | classic   | 1 / 2 Seiten           | PASS     |
| `modern`      | classic   | 1 / 2 Seiten           | PASS     |
| `monoLuxe`    | classic   | 1 / 2 Seiten           | PASS     |
| `neon`        | classic   | 1 / 2 Seiten           | PASS     |
| `orbit`       | classic   | 1 / 2 Seiten           | PASS     |
| `pastell`     | classic   | 1 / 2 Seiten           | PASS     |
| `prism`       | classic   | 1 / 2 Seiten           | PASS     |
| `ribbon`      | classic   | 1 / 2 Seiten           | PASS     |
| `serioes`     | classic   | 1 / 2 Seiten           | PASS     |
| `sonne`       | classic   | 1 / 2 Seiten           | PASS     |
| `studio`      | classic   | 1 / 2 Seiten           | PASS     |
| `studio2`     | classic   | 1 / 2 Seiten           | PASS     |
| `studio3`     | classic   | 1 / 2 Seiten           | PASS     |
| `sunrise`     | classic   | 1 / 2 Seiten           | PASS     |
| `terracotta`  | modern    | 1 / 2 Seiten           | PASS     |
| `verlauf`     | classic   | 1 / 2 Seiten           | PASS     |
| `verlauf2`    | classic   | 1 / 2 Seiten           | PASS     |
| `verlauf3`    | classic   | 1 / 2 Seiten           | PASS     |
| `violetPulse` | classic   | 1 / 2 Seiten           | PASS     |
| `warm2`       | classic   | 1 / 2 Seiten           | PASS     |
| `warm3`       | classic   | 1 / 2 Seiten           | PASS     |
| `welle`       | classic   | 1 / 2 Seiten           | PASS     |

Alle sieben regulären Grenzschwellen entsprechen der Ausgangs-QA. Letzter einseitiger Stand, erster zweitseitiger Stand, Stand unmittelbar vor Seite drei sowie tatsächliche dritte Seite bestehen jeweils mit vollständigem Inhalt und gleicher Web-/Export-/PDF-Verteilung. Die nachfolgenden kurz/lang-Wiederherstellungen und Live-Änderungen bestehen ebenfalls.

| Vorlage      | Erste 2 Seiten: Arbeitseinträge | Erste 3 Seiten: Arbeitseinträge | Vergleich zur Basis |
| ------------ | ------------------------------: | ------------------------------: | ------------------- |
| `brief`      |                               2 |                              11 | unverändert / PASS  |
| `gallery`    |                               2 |                               9 | unverändert / PASS  |
| `ledger`     |                               4 |                              13 | unverändert / PASS  |
| `ribbon`     |                               4 |                              13 | unverändert / PASS  |
| `studio2`    |                               2 |                               8 | unverändert / PASS  |
| `studio3`    |                               3 |                              11 | unverändert / PASS  |
| `terracotta` |                               4 |                              11 | unverändert / PASS  |

## Vergleich der P1-Reproduktionen

Die Fixture-Hashes vor/nach der Korrektur sind identisch. FAIL bezeichnet den verifizierten Ausgangsdefekt; PASS bezeichnet die erneute Prüfung des Fixes.

| Reproduktion                                                   | Ausgang                                                          | Korrektur                                                  | Ergebnis         |
| -------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ---------------- |
| Brief, 12 Arbeits-/6 Bildungseinträge, 24 Bullets in Eintrag 3 | 4 Seiten; spätere Bullets und `QAEND003` fehlen im PDF           | 5 Seiten; alle Zeichen/Marker erhalten                     | F01: FAIL → PASS |
| Studio 3, gleiche grosse Entry-Fixture                         | 4 Seiten; spätere Bullets und Abschluss fehlen                   | 5 Seiten; vollständige Fortsetzung                         | F01: FAIL → PASS |
| Ledger, Halbspalten, 12 Arbeits-/6 Bildungseinträge            | 3 Seiten; fast leerer Anfang und abgeschnittene Arbeitsstationen | 4 Seiten; Seite 1 gefüllt, vollständige Spaltenfortsetzung | F02: FAIL → PASS |
| Ledger, Masonry, gleiche Anzahl Einträge                       | 3 Seiten; gleiche Inhaltsverluste                                | 4 Seiten; vollständige Spaltenfortsetzung                  | F02: FAIL → PASS |

Die zusätzlichen grossen Entries in Ledger-Halbspalten und Masonry benötigen jeweils sieben Seiten; Studio 3 mit rechter Sidebar, Foto und eigenen Rändern benötigt sechs. **PASS:** Diese Seitenzahlen entsprechen dem tatsächlich vollständig geflossenen Inhalt. Sie werden nicht auf zwei Seiten gezwungen.

Reproduktion des Ausgangsfehlers: dieselben Fixtures mit den unveränderten Produktionsdateien aus `e3a7bc18868e94813377db4261f7e3c180e0e6fa` ausführen. Die vier Varianten sind in `tests/qa/pagination-2page.qa.ts` definiert. Ausgangsraster und Rohbefunde sind im verlinkten QA-Bericht archiviert. Neue Kombinationen liegen in `tests/qa/cv-flow-fragmentation.qa.ts`.

Web und kanonisches Export-DOM behalten identische Hauptspalten-/Sidebar-Geometrie und Seitenverteilung. Im Produktions-PDF stimmen Markerpräsenz, Häufigkeit, Reihenfolge und Seitenzuordnung überein. Die ursprünglichen Schnittstellen wurden zusätzlich anhand gerenderter PDF-Seiten visuell geprüft.

Belege: [Vergleich und Prüfmanifest](cv-flow-fragmentation-12okt-evidence/results.json), [vollständige Fortsetzung der Bullets](cv-flow-fragmentation-12okt-evidence/brief-large-entry-page3.png), [gefüllte erste Ledger-Seite](cv-flow-fragmentation-12okt-evidence/ledger-half-columns-page1.png).

## CI und Wiederholung

Dedizierter [CI-Lauf 38197692673](https://github.com/modebrecht/cv-cover-charm/actions/runs/38197692673) prüft den Codecommit `c9874ab5e56840a90af06d04e8518f11a240cb7b`. Er ist auf den separaten Fix-Branch beschränkt und verändert keine bestehenden Release-Jobs. Quellen-SHA und Renderer-Blobs werden in jedem neuen Audit gespeichert. JSON, PDFs und Fehlerbilder werden als `cv-flow-fragmentation-<SHA>` hochgeladen und 14 Tage aufbewahrt.

Aktualisiert 2026-10-12: **CI vollständig PASS** auf dem exakten Codecommit. 104 neue CV-E2E, 21 bestehende Produkt-E2E, 1’111 Unit-Tests, beide Typechecks, Lint, Formatierung, Build und die vollständige Feldprüfung bestehen. Artefakt `11724507101` wurde erfolgreich hochgeladen (145 auditierte Zustände, 125 Produktions-PDFs; Quelle `c9874ab5e56840a90af06d04e8518f11a240cb7b`).

Der bisher offene ursprüngliche QA-Lauf [38194464078](https://github.com/modebrecht/cv-cover-charm/actions/runs/38194464078) ist inzwischen mit **FAIL** abgeschlossen: schnelle Prüfungen und bestehende Produkt-E2E bestanden, die strenge Defekt-QA scheiterte erwartungsgemäss an den Ausgangsbefunden. Dieser Agent hat ihn nicht neu gestartet oder abgeschwächt.

Nach Installation der gesperrten Abhängigkeiten und des vorhandenen gepinnten Playwright-Runners:

```sh
PAGINATION_QA_DIR=artifacts/cv-flow-fragmentation npx playwright test --config tests/qa/playwright.cv-fragmentation.config.ts
PAGINATION_QA_DIR=artifacts/cv-flow-fragmentation bun scripts/pagination_qa_fields.mjs
PAGINATION_QA_DIR=artifacts/cv-flow-fragmentation node scripts/pagination_qa_summary.mjs
npx playwright test --config tests/qa/playwright.product.config.ts
```

Der CI-Workflow dokumentiert die vollständige Installation und die schnellen Prüfungen.

## Grenzen und nächster Schritt

- **PASS:** Die beiden bekannten CV-Inhaltsverluste und die genannten Kombinationen sind reproduzierbar behoben. Alle 39 Vorlagen bestehen die geprüften ein-/zweiseitigen CV-Baselines.
- **FAIL, weiterhin offen:** Briefbefunde F03–F06 aus der Ausgangs-QA, insbesondere falsche PDF-Textlayer-Reihenfolge und fehlende Senderfelder bei Warm. Die betreffenden Produktionsdateien wurden nicht geändert. Keine neue vollständige Briefabnahme wird daraus abgeleitet.
- **UNVERIFIED:** Pixelweise Rasterabnahme sämtlicher PDFs, neue Browserfamilien, beliebig überhohe Nicht-Text-Blöcke und die Native-Chromium-Implementierung. Die PDF-Rasterprüfung ist eine gezielte Stichprobe der ursprünglichen Fehlerflächen; die Matrix prüft DOM-Glyphengrenzen und PDF-Text-/Seitenkonsistenz.
- **PASS:** Der vollständige 104er-Commitlauf auf dem CI-Runner und die erneute Prüfung der vier kritischen Fälle am veröffentlichten Commit.

Empfehlung: Die nun vollständig CI-grüne CV-Korrektur reviewen. Anschliessend die Brief-PDF-Textlayer-Felder in logischer DOM-Reihenfolge ausgeben und die sichtbaren Senderfelder vollständig übernehmen; das ist ein separater Fix zu F03/F04. Keine pauschale Seitenbegrenzung, Inhaltskürzung oder automatische Schriftverkleinerung.

Abschliessend beobachtete Ausgangsrefs: `dev` = `e3a7bc18868e94813377db4261f7e3c180e0e6fa`; `main` = `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; `render` = `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`; Native-Experiment = `a8cd824dfe1e43fbe5fa94a0afe0d5c9e66ed864`; ursprünglicher QA-Branch = `a969351481a66c6e0eb79c7f744940bcbc851b8d`. Dieser Agent hat ausschliesslich seinen neuen Fix-Ref aktualisiert. Die Dokumentation folgt dem Codecommit in einem eigenen Commit.
