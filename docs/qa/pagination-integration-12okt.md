# Gemeinsame Pagination-Abnahme – CV und Anschreiben

**PASS für das begrenzte Integrationspaket:** 250 Browserfälle und 1’111 Unit-Tests bestehen. Alle 39 Produktionsvorlagen wurden mit ein- und zweiseitigem CV sowie Anschreiben geprüft. Die zuvor separat geprüften CV- und Briefkorrekturen bestehen jetzt gemeinsam, einschliesslich langer Gesamtdossiers. Keine ausstehenden Schritte im abgeschlossenen Integrationslauf.

## Quelle und Branch

- Branch: `qa/pagination-integration-12okt`.
- Exakt geprüfter Codecommit: `9b80cfb62b7648ef777643ab6d516998ed388b0c`; Tree: `6b24e077494f513a3feb51dc6a4ac7b6159694fe`.
- Unveränderte autoritative Dev-Basis: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`.
- Ausgangspunkt: grüner Brief-Stack `64ba6374d5b34de60dcba78db8fbcd7c3888f125`, geprüfter Code `aee948ab3ee2dd045619cb99e7f4d9b89c530f68`, [CI 38230754770](https://github.com/modebrecht/cv-cover-charm/actions/runs/38230754770).
- Die beiden CV-Produktionsdateien und ihre Regressionen wurden unverändert aus `c07f81b5dca5aa1f2479def3925b4101a06aa06c` übernommen; geprüfter CV-Code `c9874ab5e56840a90af06d04e8518f11a240cb7b`, [CI 38197692673](https://github.com/modebrecht/cv-cover-charm/actions/runs/38197692673).
- Dieser neue Kandidat kombiniert die bereits autorisierten Folgekorrekturen. Der ursprüngliche reine QA-Branch `qa/pagination-2page-11okt` bleibt auf `a969351481a66c6e0eb79c7f744940bcbc851b8d`; seine dokumentierten Bestandsfehler werden nicht nachträglich als PASS umgedeutet.
- Kein neuer Produktionsalgorithmus in diesem Integrationsschritt. Kein Merge, Cherry-Pick, Rebase, Amend, Squash, Force-Push, Deployment oder Promotion. AGENTS.md gelesen.

Die sechs Produktionsblobs entsprechen exakt den zuvor geprüften Fix-Stacks:

| Datei                                         | Git-Blob                                   |
| --------------------------------------------- | ------------------------------------------ |
| `src/lib/dossier-pdf.ts`                      | `32a3bfdfc6430bfb67d39c200de87da4f3fd271d` |
| `src/components/letter/LetterDocument.tsx`    | `1cc902fbeed45105e34b3881eb70a257e2ae19cf` |
| `src/components/letter/letter-pagination.ts`  | `a2e7573121c6f89545c0512ba25a33ea7f778c46` |
| `src/components/letter/letter-pagination.css` | `a328282aac0b77e1b8360dcd89a5934cd6839c92` |
| `src/components/cv/CvCanvasBase.tsx`          | `aaaf2ac992d964f7232cbc73dcbed714acdb9baf` |
| `src/components/cv/flow-pagination.ts`        | `687974cb6192fc9b269e24142568e06c39eb9ff4` |

Die lokalen Entwicklungsbelege nennen den damaligen Eltern-SHA und den offenen Arbeitsdiff. Ihre sechs Runtime-Blobs stimmen mit dem veröffentlichten Kandidaten überein. Die abschliessende CI nennt ausschliesslich den veröffentlichten Code-SHA. Automatische Reihenfolgeänderungen in `src/routeTree.gen.ts` werden in den Runtime-Artefakten sichtbar protokolliert und nicht veröffentlicht. Der folgende reine Bericht-/Belegcommit hat identischen Produktions-, Test- und Workflowcode; der CI-Nachweis bezieht sich auf den oben genannten Codecommit.

## Ausgeführter Umfang

| Prüfung                                                                                                 | Eindeutige Fälle | Ergebnis                 |
| ------------------------------------------------------------------------------------------------------- | ---------------: | ------------------------ |
| Vollständige CV-QA: Matrix, Grenzpunkte, Varianten, Live-Wechsel, Chrome und Fragmentierung             |              104 | PASS                     |
| Vollständige Brief-QA: Matrix, Grenzpunkte, Varianten, Live-Wechsel, Chrome, Textlayer und lange Tokens |              104 | PASS                     |
| Bestehende Produkt-, PDF-, Editor- und Sync-Prüfungen                                                   |               31 | PASS                     |
| Gesamtdossier: sieben Architekturvertreter und vier zusätzliche gemeinsame Stressfälle                  |               11 | PASS                     |
| **Browser gesamt**                                                                                      |          **250** | **PASS, 0 FAIL, 0 SKIP** |
| Unit-Suite einschliesslich zehn CV-Flow-Regressionen                                                    |            1’111 | PASS, 0 FAIL             |

Typecheck der Anwendung und QA, Lint, Release-Formatierung, geänderte Code-/Konfigurationsdateien und Produktionsbuild bestehen lokal und in CI. Bestehende Lint-Warnungen bleiben sichtbar. Keine abgeschwächten Assertions, veränderten Toleranzen, Snapshot-Baselines, automatischen Retries oder übersprungenen Fälle.

Die Standalone-QA prüft **292 Dokumentzustände: 292 PASS, 0 FAIL**, davon **252 echte Produktions-PDFs, 0 blockierte Exporte**. Wiederherstellungen ohne erneuten Export erklären die übrigen Zustände. Die Feldprüfung besteht für **287 normale Zustände und 11’386 logische Feldwerte** in Web, kanonischem DOM und, soweit exportiert, PDF. Fünf Textlayer-Sonderfälle besitzen eigene vollständige bzw. absichtlich negative Assertions. Die elf Gesamtdossier-PDFs werden zusätzlich geprüft.

Tests importieren den bestehenden autoritativen `GALLERY_CASES`-/Produktionskatalog mit 39er-Guard. Die folgende Tabelle ist ein Ausführungsbericht aus der CI-Zusammenfassung, kein zweiter Testkatalog. Die Zweitseiten-Fixtures werden begrenzt anhand des tatsächlichen Produktionsoutputs kalibriert; keine nachgebildete Pagination, Kürzung oder automatische Schriftverkleinerung.

| Ausgeführte Vorlagen-ID | CV: kurze / lange Baseline | Anschreiben: kurze / lange Baseline |
| ----------------------- | -------------------------- | ----------------------------------- |
| `aurora`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `blockig`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `brief`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `citrus`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `colorful`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `cove`                  | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `diagonal`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `edel`                  | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `edelDark`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `edge`                  | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `forestFlow`            | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `freundlich`            | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `gallery`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `glow`                  | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `horizon`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `human`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `klassisch`             | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `ledger`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `modern`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `monoLuxe`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `neon`                  | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `orbit`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `pastell`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `prism`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `ribbon`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `serioes`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `sonne`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `studio`                | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `studio2`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `studio3`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `sunrise`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `terracotta`            | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `verlauf`               | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `verlauf2`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `verlauf3`              | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `violetPulse`           | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `warm2`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `warm3`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |
| `welle`                 | 1 / 2 PASS                 | 1 / 2 PASS                          |

## Architekturen und Seitengrenzen

Vertiefte Übergänge von einer auf zwei sowie zwei auf drei Seiten wurden für Studio 3, Studio 2, Ledger, Ribbon, Gallery, Brief und Kolumne (`terracotta`) ausgeführt, jeweils für CV und Brief. Pro Kombination: letzter Einseiter, erster Zweitseiter, letzter Zweitseiter, erster Dreiseiter, Wiederherstellung kurz und lang. Alle Zustände PASS. Die Schwellen werden am realen Renderer gesucht und als Such-/Fixture-Artefakte gespeichert.

Zusätzliche CV-Aufbauten: Studio 3 und Kolumne mit Sidebar links/rechts, synthetischem Foto und eigenen Abständen; Studio 2 minimal/Luftig; Ledger Halbspalten und Masonry; Ribbon editorial/Magazin; Gallery timeline; Brief und Studio 3 mit überhohem Einzelentry. Die vertieften Fragmentierungstests kombinieren überhohe Entries mit beiden Ledger-Spaltenaufbauten und einer rechten Studio-3-Sidebar.

Zusätzliche Briefprüfungen: 12 pt/24 mm, lange ungetrennte Wörter bei Brief/Studio 3/Gallery, ein einzelnes mehrseitiges Unicode-Token mit/ohne Inline-Formatierung, Live-Randänderung 24 → 45 → 24 mm, Salutation/Absatzfolge/Schluss/Unterschrift/Beilagen, unterschiedliche erste und folgende Header/Footer. Alle PASS.

Die vier neuen gemeinsamen Stress-Fixtures enthalten gleichzeitig zwölf Berufseinträge, sechs Bildungsstationen, einen überhohen Entry mit 24 Bullet-Markern, 14 Briefabsätze, ein langes Wort sowie eigene Typografie/Ränder. Tatsächlich gemessene lokale Seitenzahlen; dieselben unveränderten Fälle bestehen zusätzlich in der finalen CI:

| Gemeinsamer Fall                                                       | CV-Seiten | Briefseiten | PDF inkl. Titelblatt | Ergebnis |
| ---------------------------------------------------------------------- | --------: | ----------: | -------------------: | -------- |
| Brief: grosser Entry + langes Wort + eigene Ränder                     |         5 |           4 |                   10 | PASS     |
| Ledger: Halbspalten + grosser Entry + langes Wort + eigene Ränder      |         7 |           4 |                   12 | PASS     |
| Ledger: Masonry + grosser Entry + langes Wort + eigene Ränder          |         7 |           4 |                   12 | PASS     |
| Studio 3: rechte Sidebar + grosser Entry + langes Wort + eigene Ränder |         6 |           4 |                   11 | PASS     |

Drei und mehr Seiten sind bei entsprechender Inhaltsmenge korrekt. Die gemeinsamen Fälle verlangen ausdrücklich mehr als zwei CV- und Briefseiten. Es wurde keine universelle Zweitseitenbegrenzung eingeführt.

## Bekannte Defekte und gemeinsame Abnahme

Die folgenden FAIL-Befunde gehören zur unveränderten Dev-Basis; auf dem Integrationskandidaten bestehen ihre strengen Reproduktionen:

| Befund | Schwere und Dev-Verhalten                                                              | Generische Korrektur im übernommenen Stack                                          | Gemeinsame Abnahme |
| ------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| F01    | P1: überhoher CV-Entry verliert späte Bullet-/Beschreibungsteile                       | Gemessene Inhaltsfragmente mit stabiler Entry-Fortsetzung                           | PASS               |
| F02    | P1: Ledger Halbspalten/Masonry schneiden Einträge ab und lassen viel ungenutzten Platz | Unabhängig fortsetzbare Spalten anhand realer Kapazitäten                           | PASS               |
| F03    | P2: Brief-PDF gibt Schluss/Unterschrift vor dem Briefkörper aus                        | Sichtbare semantische Textsammlung in logischer Reihenfolge                         | PASS               |
| F04    | P2: Warm-Absenderkontakte fehlen im PDF-Textlayer                                      | Alle sichtbaren semantischen Kontaktknoten sammeln; getrennte Absendermarker prüfen | PASS               |
| F05    | P2: ungetrenntes Wort läuft horizontal aus der Briefseite                              | Identischer sicherer Tokenumbruch und graphemsicherer Fragmentierungsfallback       | PASS               |
| F06    | P2: eigene Typografie/Ränder erzeugen unsichtbaren Überlauf und blockieren Export      | Messseiten und echte Seiten mit demselben aktuellen Margin-Snapshot invalidieren    | PASS               |

Reproduktionen: `variant (brief|studio3) large-entry cv`, `variant ledger (half-columns|masonry) cv`; Briefmatrix und fünf `textlayer`-Fälle; `variant (brief|studio3|gallery) (long-word|custom-margins) letter`; vier `flow`-Fälle. Fixture-Inhalte, Marker, vollständige Segmente, Reihenfolge, Seitendistribution und Clipping-Assertions bleiben erhalten.

Historische Gegenbelege: [ursprüngliche unabhängige QA](https://github.com/modebrecht/cv-cover-charm/blob/a969351481a66c6e0eb79c7f744940bcbc851b8d/docs/qa/pagination-2page-11okt.md), [CV-Fix und Vorher/Nachher-Belege](https://github.com/modebrecht/cv-cover-charm/blob/c07f81b5dca5aa1f2479def3925b4101a06aa06c/docs/qa/cv-flow-fragmentation-12okt.md), [Brief-Textlayer](letter-pdf-textlayer-12okt.md), [Brief-Flow und Margin-Ursache](letter-flow-boundaries-12okt.md). Frühere Aussagen dieser Einzelberichte über noch offene Integration beschreiben ihren damaligen Stand; dieser Bericht dokumentiert die nun durchgeführte gemeinsame Abnahme.

Innerhalb des ausgeführten Pakets wurden keine weiteren Pagination-Defekte beobachtet. `dev` enthält die Folgekorrekturen weiterhin nicht: Die ursprünglichen P1-Inhaltsverluste bleiben dort relevante Produktfehler. Empfehlung: den gemeinsam geprüften Kandidaten und die generischen Fixes reviewen und zur Abnahme bereitstellen. Keine zusätzlichen vorlagenspezifischen Workarounds oder Schriftverkleinerung.

## Web, Export-DOM und Produktions-PDF

**PASS:** vollständige Inhaltssegmente/Marker, Häufigkeit, Reihenfolge, physische Seitenzahl und Zuordnung stimmen in den geprüften Fixtures überein. Web und kanonisches DOM behalten Haupt-/Sidebar-Geometrie, Seitenindex, Finalseitenstatus, Archetyp und Header/Footer-Modus. Die geprüften Glyphen-/Containergrenzen zeigen keine verlorenen oder duplizierten Inhalte, ungewollten leeren Seiten, Überlappungen oder sichtbares Clipping. Vermeidbare Endüberschriften und auffällige Leerflächen werden mit den bestehenden Assertions geprüft. Gesamtdossiers behalten `Titelblatt → Briefseiten → CV-Seiten`.

Alle PDFs kommen aus dem bestehenden automatischen html2canvas/jsPDF-Pfad. DossierPdfCanvas wird unverändert verwendet. Ein realer PDF-Rasterbeleg wurde visuell geprüft: [Brief-CV, physische Dossierseite 8](pagination-integration-12okt-evidence/brief-cv-continuation.png), mit fortgesetzten Bullet-Markern 011–024; der letzte Bullet setzt auf der nächsten Seite fort. Dies ist ein lokaler Beleg mit exakt den sechs veröffentlichten Produktionsblobs, keine vollständige Pixelabnahme aller Vorlagen.

## Header-Abstand und Sync

**PASS für die vorhandenen Editorprüfungen:** CV und Brief bieten den Abstand zwischen Header und Inhaltsbeginn (0–40 mm). Beim CV liegt die Steuerung in Layout → Seitenränder; beim Brief in Header & Footer innerhalb Layout. Der Header-/Footer-Sync überträgt den Abstand in beide Richtungen. Geprüfter Roundtrip: CV 17 mm → Brief 17 mm; Brief 19 mm → CV 19 mm; nach Sync-Abschaltung CV 21 mm, Brief bleibt 19 mm.

Die Seitenränder verwenden dieselbe Steuerung, werden aber pro Dokument gespeichert. CV-Rechtsrand 30 mm und Brief-Rechtsrand 35 mm bleiben unabhängig. CV besitzt zusätzlich den oberen Rand ab Seite 2; Brief benutzt seine Margin-/Header-Berechnung. Gleiche Abstandswerte garantieren wegen der jeweiligen Ränder und Vorlagengeometrie keinen identischen absoluten Textstart. Keine Bedienelemente oder Sync-Regeln wurden in diesem Integrationsschritt geändert.

## CI und dauerhafte Belege

[Integrationslauf 38237103525](https://github.com/modebrecht/cv-cover-charm/actions/runs/38237103525), Job `114770364575`, Versuch 1: **completed / success**, abgeschlossen am 12.10.2026 um 10:54:51 UTC. Alle Schritte SUCCESS, keine ausstehenden Checks in diesem Lauf. Die 250 ausgeführten Browsernamen, Zusammenfassungen, Quellblobs und Artefaktmetadaten sind dauerhaft im [CI-Manifest](pagination-integration-12okt-evidence/ci-provenance.json) gespeichert.

[Artefakt 11742890392](https://github.com/modebrecht/cv-cover-charm/actions/runs/38237103525/artifacts/11742890392): 342’943’621 Bytes, SHA-256 `12980fcd042d04c079a897fdbd1f5f903d4141ecd7df9239fbd198345a7bdae8`; Ablauf **26.10.2026, 10:54:35 UTC**. Enthält vollständige Runner-Ergebnisse, Standalone-/Gesamtdossier-PDFs, Fixtures, Suchschwellen, Geometrie, Runtime-Provenienz und Feldprüfung. Die Rohartefakte unterliegen dieser CI-Aufbewahrung.

[Lokale gemeinsame Resultate](pagination-integration-12okt-evidence/joint-local-results.json) enthalten Fixture-/PDF-Hashes und Marker je physischer Seite. [Lokale Check-Provenienz](pagination-integration-12okt-evidence/local-provenance.json) enthält Log-Hashes. Der erste fokussierte Lauf hatte drei PASS und einen 15-s-Editor-Readiness-Timeout vor der Inhaltsprüfung. [Ungekürzter Fehlerabschnitt](pagination-integration-12okt-evidence/local-readiness-timeout.md) bleibt dokumentiert. Derselbe Studio-3-Fall wurde einmal gezielt unverändert wiederholt: PASS. Die abschliessende Remote-CI besteht ohne Retries vollständig; der lokale Fehler wird nicht als Inhaltsdefekt oder als bestandener Erstlauf dargestellt.

Reproduktion am geprüften Code-SHA:

```bash
bun install --frozen-lockfile
npm install --no-save --no-package-lock @playwright/test@1.55.0
bun install --frozen-lockfile
bash scripts/qa-browser-setup.sh
bun run typecheck
npx tsc --noEmit -p tests/qa/tsconfig.json
bun test tests/unit
bun run lint
bun run format:check:release
bun run build
npx playwright test --config tests/qa/playwright.letter-product.config.ts
PAGINATION_QA_DIR=artifacts/pagination-integration npx playwright test --config tests/qa/playwright.integration.config.ts
npx playwright test --config tests/qa/playwright.combined.config.ts
PAGINATION_QA_DIR=artifacts/pagination-integration bun scripts/pagination_qa_fields.mjs
PAGINATION_QA_DIR=artifacts/pagination-integration node scripts/pagination_qa_summary.mjs
```

Der eigene branchgebundene Workflow prüft zusätzlich ausdrücklich alle geänderten Code-/Konfigurationsdateien mit Prettier. Die finale Dokumentationsänderung wird gesondert formatiert und mit `git diff --check` geprüft; sie löst wegen des bestehenden Pfadfilters keinen erneuten teuren Integrationslauf aus.

## Grenzen und geschützte Branches

**UNVERIFIED:** Native Chromium, Word/DOCX, Firefox/Safari, vollständige Pixelabnahme aller 39 Vorlagen, Tagged-PDF/Screenreader-Konformität, reale Foto-/ICC-Kombinationen und sämtliche denkbaren Fonts/Rand-/Bild-/Benutzerkombinationen. Synthetische Fotos sind in den Sidebar-Fixtures enthalten. Logische PDF-Reihenfolge und Suchbarkeit belegen keine allgemeine Barrierefreiheitskonformität.

Frisch gefetchte Remote-Refs am Abschluss:

| Branch                      | HEAD                                       |
| --------------------------- | ------------------------------------------ |
| `dev`                       | `e3a7bc18868e94813377db4261f7e3c180e0e6fa` |
| `main`                      | `44d7eb950b4fe972d6e890a72b6d3256ce365bc9` |
| `render`                    | `4319c20fb85d3971ac355ae8898cdfef86ee7a8c` |
| `dev-native-chromium-print` | `6cd2f81a6a5a91d809d8a7e53ab342bf697c69df` |

Dieser Integrationsschritt aktualisiert ausschliesslich seinen eigenen neuen Branch. Die Native-Experimenthistorie wurde parallel durch den anderen Agenten weitergeführt, ohne Ref-Änderung durch diesen Agenten. Keine Zusammenführung mit geschützten Branches.
