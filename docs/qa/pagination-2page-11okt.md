# Pagination QA – Masterlist 33 und 34

QA-Paket abgeschlossen; Produktabnahme **FAIL** wegen reproduzierbarer Bestandsfehler. Dies ist ausschliesslich eine Test-/Dokumentationsänderung. Keine Migration, kein Merge, keine Promotion und kein Deployment.

## Provenienz und Branch-Sicherheit

- Repository: `modebrecht/cv-cover-charm`.
- Arbeitsbranch: `qa/pagination-2page-11okt`, frisch von Remote `dev` erstellt; initial sauberer Checkout, kein vorhandener QA-Branch überschrieben.
- Autoritative Produktionsquelle: `e3a7bc18868e94813377db4261f7e3c180e0e6fa` (`dev`).
- Vollständige 39er-Matrix, Boundary-Suche und Varianten: QA-Commit `000867568476fcb41716ade1d2fc1fa22f8701d4`.
- Ergänzende Gesamtdossier-/Chrome-Prüfungen und korrigierte Live-CV-Tests: `3f6c495e2f8d892dc62af114adaa42560e223894`.
- `git diff <dev-source> <qa-code> -- src package.json bun.lock` ist leer. Produktionspagination, Renderer, DossierPdfCanvas, Template-CSS, Schemas und Exportcode entsprechen exakt der Dev-Quelle.
- Vite regeneriert lokal die Reihenfolge in `src/routeTree.gen.ts`; diese automatische Dateiänderung wurde verworfen und nie veröffentlicht. Artefakte enthalten `sourceDirty`/`runtimeDiff`, damit dieser Zustand sichtbar bleibt.
- Geschützte Ausgangsrefs: `main` = `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`; `render` = `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`; Native-Experiment = `a8cd824dfe1e43fbe5fa94a0afe0d5c9e66ed864`.
- Dieser Agent hat ausschliesslich den QA-Ref aktualisiert. AGENTS.md gelesen; veröffentlichte Historie nicht umgeschrieben.

## Umfang, Methodik und Zahlen

**203 eindeutige neue Browser-QA-Fälle: 97 PASS, 106 FAIL.** Zusätzlich 21 bestehende E2E-Fälle und 1’101 Unit-Tests PASS. Keine übersprungenen Tests, keine Retries, keine Snapshot-Baseline und keine gelockerten Toleranzen.

| Prüfung                                                                                                          | Eindeutige Fälle |   PASS |    FAIL |
| ---------------------------------------------------------------------------------------------------------------- | ---------------: | -----: | ------: |
| 39 Vorlagen × CV/Brief × 1/2 Seiten                                                                              |              156 |     78 |      78 |
| 7 Architekturrepräsentanten × CV/Brief, vier Grenzpunkte + Wiederherstellung                                     |               14 |      7 |       7 |
| Sidebar/Fotos, Luftig, Timeline, Magazin, Halbspalten, Masonry, grosse Einträge, Typografie/Ränder, lange Wörter |               18 |      8 |      10 |
| Live-Wechsel kurz/lang/kurz/lang ohne Reload                                                                     |                4 |      2 |       2 |
| Lange kombinierte Dossiers                                                                                       |                7 |      0 |       7 |
| Unterschiedlicher erster Header / Fortsetzungsheader und Beilagenfooter                                          |                4 |      2 |       2 |
| **Gesamt**                                                                                                       |          **203** | **97** | **106** |

Der vollständige erste CI-Lauf meldet 93/99 für 192 Fälle: Darin enthalten sind zwei QA-Timeouts, weil das CV-Formular für Berufserfahrung standardmässig eingeklappt ist. Der Test öffnet diesen vorhandenen Abschnitt jetzt vor dem Editieren. Beide Fälle wurden separat erneut ausgeführt und bestehen. Die Tabelle verwendet diese verifizierten Ersatzresultate, ohne die ursprünglichen CI-Fehler zu löschen. Die zusätzlichen sieben Gesamtdossier- und vier Chrome-Fälle wurden ebenfalls vollständig ausgeführt. Fokussierte Wiederholungen werden nicht doppelt als neue Fälle gezählt.

Die Prüfung verwendet den bestehenden `GALLERY_CASES`/`PRODUCT_TEMPLATES`-Katalog mit seinem 39er-Guard, keinen zweiten Vorlagenkatalog. Layoutarchitektur stammt aus den Produktionskomponenten: Classic rendert Standard, Luftig, Timeline und Magazin; Modern rendert Sidebar links/rechts. Halbbreite Rubriken und Masonry sind zusätzliche Flow-Kompositionen.

Fixtures enthalten deterministische Weiterbildung, Berufserfahrung, vollständige Beschreibungen, Listen, Referenzen, Projekte, einzelne Absätze, Anrede, Abschluss, Unterschrift und Beilagen. Eindeutige Marker und vollständige Textsegmente prüfen Präsenz, Häufigkeit und Reihenfolge. Die ergänzende Feldprüfung prüft auch Namen, Adressen, Telefon, E-Mail, Rubriktitel und sonstige Datenfelder; CSS-Grossschreibung ist dabei semantisch gleichwertig.

Eine identische lange Datenmenge ergibt je nach Vorlage unterschiedliche Seitenzahlen. Für die zweitseitige Matrix wird deshalb die Anzahl normaler Einträge/Absätze anhand des **tatsächlichen Produktionsoutputs** begrenzt kalibriert. Keine eigene Pagination, Kürzung, CSS-Anpassung oder Schriftverkleinerung. Die tatsächlich verwendeten Fixtures, Hashes und beobachteten Schwellen sind archiviert. Drei oder mehr Seiten gelten bei entsprechend langem Inhalt als korrekt.

Seitenindex, Finalseitenstatus, physische Reihenfolge, Inhaltsverteilung, Hauptspalten-/Sidebar-Geometrie und Chrome werden zwischen Web und realem Standalone-Export-DOM verglichen. Der kombinierte Export verwendet unverändert den echten `DossierPdfCanvas`. Alle PDFs stammen aus html2canvas/jsPDF. Glyphengrenzen werden mit 0.3 mm Toleranz geprüft; ungenutzter Font-Ascent/Descent ist kein sichtbarer Schnitt.

**239 erzeugte Produktions-PDFs** in den verifizierten Datenbeständen; sechs weitere Briefvarianten sind vom Preflight blockiert. Für diese sechs Varianten ist PDF-Inhalt **UNVERIFIED**, während die Exportblockade bzw. der Web-Überlauf **FAIL** ist.

## Vollständige Vorlagenmatrix

Angaben `1/2` bezeichnen die beobachteten Seitenzahlen der kurzen bzw. zweitseitigen Fixture. Alle 39 CVs bestehen beide Baselines. Alle 39 Briefe behalten ihre sichtbaren Inhalte und ihre Seitenverteilung, scheitern aber an der PDF-Lesereihenfolge (F03).

| Vorlage / ID                 | CV-Aufbau     | Brief-Archetyp | CV 1/2 Seiten | Brief 1/2 Seiten |
| ---------------------------- | ------------- | -------------- | ------------- | ---------------- |
| Brief (`brief`)              | Standard      | quiet          | 1/2 PASS      | 1/2; FAIL F03    |
| Editorial (`klassisch`)      | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Modern (`modern`)            | Standard      | quiet          | 1/2 PASS      | 1/2; FAIL F03    |
| Warm (`freundlich`)          | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Edel (`edel`)                | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Colorful (`colorful`)        | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Blockig (`blockig`)          | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Seriös (`serioes`)           | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Human (`human`)              | Standard      | quiet          | 1/2 PASS      | 1/2; FAIL F03    |
| Horizont (`welle`)           | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Kolumne (`terracotta`)       | Sidebar links | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Rahmen (`pastell`)           | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Sonne (`sonne`)              | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Studio (`studio`)            | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Neon (`neon`)                | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Aurora (`aurora`)            | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Verlauf (`verlauf`)          | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Citrus (`citrus`)            | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Edge (`edge`)                | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Glow (`glow`)                | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Mono Luxe (`monoLuxe`)       | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Horizon (`horizon`)          | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Sunrise (`sunrise`)          | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Forest Flow (`forestFlow`)   | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Violet Pulse (`violetPulse`) | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Studio 2 (`studio2`)         | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Studio 3 (`studio3`)         | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Warm 2 (`warm2`)             | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Warm 3 (`warm3`)             | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Verlauf 2 (`verlauf2`)       | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Verlauf 3 (`verlauf3`)       | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Ledger (`ledger`)            | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Prism (`prism`)              | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Gallery (`gallery`)          | Standard      | sidebar        | 1/2 PASS      | 1/2; FAIL F03    |
| Orbit (`orbit`)              | Standard      | fresh          | 1/2 PASS      | 1/2; FAIL F03    |
| Ribbon (`ribbon`)            | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Cove (`cove`)                | Standard      | band           | 1/2 PASS      | 1/2; FAIL F03    |
| Diagonal (`diagonal`)        | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |
| Edel Dark (`edelDark`)       | Standard      | frame          | 1/2 PASS      | 1/2; FAIL F03    |

## Grenztests: eine, zwei und drei Seiten

Die Werte zeigen jeweils den ersten Inhalt, der zwei bzw. drei Seiten benötigt. CV-Fixtures haben zusätzlich einen Bildungseintrag und mehrere kurze Rubriken. Pro Kombination wurden letzter einseitiger Stand, erster zweitseitiger Stand, letzter zweitseitiger Stand, erster dreiseitiger Stand und anschliessende Wiederherstellung kurz/lang geprüft. Die Schwellen beziehen sich auf die archivierte CI-Umgebung; andere Schriftumgebungen werden erneut gemessen.

| Vorlage      | CV: erste 2 / erste 3 Seiten | Brief: erste 2 / erste 3 Seiten | Ergebnis                            |
| ------------ | ---------------------------- | ------------------------------- | ----------------------------------- |
| `studio3`    | 3/11 Arbeitseinträge         | 5/13 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `studio2`    | 2/8 Arbeitseinträge          | 5/13 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `ledger`     | 4/13 Arbeitseinträge         | 4/11 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `ribbon`     | 4/13 Arbeitseinträge         | 5/13 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `gallery`    | 2/9 Arbeitseinträge          | 4/11 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `brief`      | 2/11 Arbeitseinträge         | 5/13 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |
| `terracotta` | 4/11 Arbeitseinträge         | 5/13 Absätze                    | CV PASS; Brief-Layout PASS, PDF F03 |

PASS: Reguläre CV-Einträge bleiben an allen sieben untersuchten Übergängen vollständig, ohne Duplikate, verwaiste Endüberschrift, Clipping oder zusätzliche leere Hauptinhaltsseite. Gewöhnliche Briefabsätze bleiben vollständig, sequenziell und zwischen Web/Export-DOM/PDF derselben physischen Seite zugeordnet. Anrede nur auf Seite 1; Grussformel, Unterschrift und Beilagen korrekt auf der letzten sichtbaren Seite. Die PDF-Textobjektreihenfolge der Schlussseite bleibt F03.

PASS: Sidebar links und rechts mit synthetischem Foto und eigenen Rändern/Abständen bei Studio 3 und Kolumne; Luftig bei Studio 2; Timeline bei Gallery; Magazin bei Ribbon; Standard mit eigenen CV-Rändern. Diese langen Varianten ergeben je nach Komposition drei oder vier Seiten und werden nicht auf zwei Seiten gezwungen.

PASS: Wiederholte Persistenzwechsel und vier Live-Wechsel ohne Reload bei Brief/Studio 3. Die abschliessenden Brief-PDFs haben weiterhin F03. Die sieben langen Gesamtdossiers behalten `Titelblatt → Briefseiten → CV-Seiten`; Anzahl, Marker und Geometrie entsprechen den jeweiligen Web-Vorschauen. Die zusätzlichen Chrome-Varianten verändern diesen Befund nicht.

## Reproduzierbare Defekte

### F01 – FAIL / P1: Ein grosser CV-Eintrag verliert Beschreibung im PDF

Reproduktion: `paginationFixture("brief", { works: 12, schools: 6, largeEntry: true })`; ebenfalls Studio 3. Der dritte Berufseintrag enthält 24 nachvollziehbar markierte Bullet-Zeilen. Er ist höher als die freie A4-Fläche und wird als unteilbare Zeile auf Seite 2 gelegt.

- Web und Export-DOM enthalten den ganzen String, schneiden die sichtbare Beschreibung aber am unteren Rand ab.
- Bei Brief fehlen im PDF `QABULLET014` bis `QABULLET024` und der Abschlussmarker `QAEND003`. Studio 3 verliert den entsprechenden späteren Teil ebenfalls.
- Die folgenden Einträge beginnen auf Seite 3; der abgeschnittene Beschreibungsteil wird dort nicht fortgesetzt.
- Web- und PDF-Raster wurden visuell geprüft. Es handelt sich um echten Inhaltsverlust, nicht nur eine Textlayer-Abweichung.

Beleg: [Fixture und Einzelbefund](pagination-2page-11okt-evidence/variant-brief-large-entry-cv.json), [sichtbarer Schnitt](pagination-2page-11okt-evidence/brief-large-entry-page2.png).

Generischer Vorschlag: überhohe Entries in messbare Beschreibungs-/Listenfragmente zerlegen; Fortsetzungsfragment mit stabiler semantischer Identität auf Folgeseiten weiterführen. Niemals eine Zeile, die höher als die volle Seitenkapazität ist, ungeteilt in einen Container mit `overflow:hidden` legen.

### F02 – FAIL / P1: Halbspalten und Masonry verlieren mehrere Berufseinträge

Reproduktion: Ledger, `{ works: 12, schools: 6, columns: true }` bzw. `{ works: 12, schools: 6, masonry: true }`.

- Seite 1 enthält im Wesentlichen die Identität, aber keine Bildungs-/Arbeitsmarker; rund 220 mm Hauptspaltenfläche bleiben frei.
- Der gesamte zweispaltige Block landet auf Seite 2 und überragt dessen Hauptspaltenhöhe um rund 421 mm.
- Arbeitsstationen ab dem unteren Teil werden abgeschnitten; im PDF fehlen vollständige Einträge. Seite 3 enthält Referenzen/Projekt statt einer Fortsetzung dieser Spalten.
- Beide Packing-Varianten scheitern mit derselben Grundstruktur. Seite 1 ist nicht völlig weiss; der Befund ist eine unnötig fast leere Inhaltsseite zusammen mit massivem Clipping.

Beleg: [Halbspalten](pagination-2page-11okt-evidence/variant-ledger-half-columns-cv.json), [Masonry](pagination-2page-11okt-evidence/variant-ledger-masonry-cv.json), [Seite 2](pagination-2page-11okt-evidence/ledger-half-columns-page2.png).

Generischer Vorschlag: Flow-/Masonry-Gruppen anhand ihrer tatsächlichen Zeilenkapazität fragmentieren, mit getrennten, fortsetzbaren Spalten. Ein überhoher zusammengesetzter Block braucht denselben Schutz wie ein überhoher Einzeleintrag. Keine Ledger-Sonderlogik.

### F03 – FAIL / P2: Brief-PDF hat falsche logische Lesereihenfolge

Reproduktion: beliebiger einseitiger oder zweitseitiger Matrixbrief, danach automatischen PDF-Export ausführen und `pdfjs getTextContent()` lesen. Auf der Schlussseite lautet die Reihenfolge `Anrede → Grussformel → Unterschrift → Beilagen → Briefkörper`, obwohl die sichtbare Reihenfolge den Briefkörper vor dem Abschluss zeigt. Bei Fortsetzungsseiten ohne Abschluss bleibt die Absatzreihenfolge korrekt.

Betroffen: 39/39 Vorlagen in beiden Baselines, alle sieben Gesamtdossiers und die zusätzlich getesteten Brief-Chrome-Varianten. Kein Verlust der markierten Absätze; inkorrekte Reihenfolge beim Textauslesen/Kopieren. Die PDFs sind nicht getaggt; eine allgemeine Screenreader-Abnahme wird daraus nicht abgeleitet.

Ursache im bestehenden Export: `addLetterTextLayer()` schreibt zuerst alle `[data-letter-pdf-text]`-Felder und erst danach den Rich-Text-Body.

Generischer Vorschlag: Textlayer-Knoten in logischer DOM-Reihenfolge abarbeiten und den Rich-Text-Body an seiner tatsächlichen Stelle ausgeben; bestehende Positions-/Fontberechnung und Sichtbarkeitsprüfung beibehalten.

### F04 – FAIL / P2: Warm verliert Absenderkontakte aus dem PDF-Textlayer

Die ergänzende vollständige Feldprüfung findet bei Warm (`freundlich`) in beiden Matrixbriefen fehlende `Dorfstrasse 12`, `079 123 45 67` und `lea.mueller@example.ch` im PDF-Text. Dieselben Werte sind im Web und Export-DOM sichtbar. Empfänger-Plz/Ort und Unterschrift teilen Werte mit dem Absender; deren Präsenz ist kein Beweis für einen vollständigen Absender-Textlayer.

Beleg: [Warm-Einzelfixture](pagination-2page-11okt-evidence/matrix-freundlich-one-letter.json), [vollständiger Feldcheck](pagination-2page-11okt-evidence/logical-fields-00086756.json). 10’480 logische Datenfelder über 266 archivierte Dokumentzustände geprüft: 260 Zustände PASS, sechs FAIL. Vier FAIL sind die CV-Inhaltsverluste F01/F02; zwei sind Warm-Kontakte.

Generischer Vorschlag: alle sichtbaren semantischen Kontaktfelder über dieselbe generische DOM-Textsammlung erfassen, auch bei ausserhalb des normalen Brieftextbereichs positionierten Senderblöcken. Ursache des ausgelassenen Warm-Blocks ist noch nicht abschliessend lokalisiert; keine vorlagenspezifische XML-/PDF-Korrektur vorgeschlagen.

### F05 – FAIL / P2: Sehr langes ungetrenntes Wort läuft aus der Seite

Reproduktion: Brief, Studio 3 oder Gallery, `{ paragraphs: 14, longWord: true }`. Ein einzelnes Wort aus 35 Wiederholungen von „Zusammenarbeit“ überragt die A4-Breite. Web und Export-DOM bestätigen den Überlauf; der Preflight blockiert den PDF-Download. Diese Blockade schützt vor einem kaputten PDF, beseitigt aber nicht das Umbruchproblem.

Beleg: [Fixture](pagination-2page-11okt-evidence/variant-brief-long-word-letter.json), [Web](pagination-2page-11okt-evidence/brief-long-word-page1.png).

Generischer Vorschlag: sichere Wortumbruchregeln für lange Tokens in Rich-Text und im identisch gestylten Mess-Sandbox; keine künstliche Textkürzung oder Schriftverkleinerung.

### F06 – FAIL / P2: Eigene Briefschrift/Ränder blockieren Export

Reproduktion: Brief, Studio 3 oder Gallery, `{ paragraphs: 14, custom: true }`: 12 pt, 24 mm Ränder. Drei Seiten werden erzeugt, alle Absatzmarker bleiben erhalten; der Exportknopf bleibt wegen `physical-overflow` deaktiviert. Der gemessene letzte Flow-Container der mittleren Seite überschreitet den Textbereich, während die Glyphenprüfung keinen sichtbaren A4-Schnitt nachweist. Der Befund ist die reproduzierbare Exportblockade; eine sichtbare Textabschneidung wird für diese drei Fälle nicht behauptet.

Beleg: [gespeicherter Zustand und Preflight-Meldung](pagination-2page-11okt-evidence/variant-brief-custom-margins-letter.json), Ergänzungsdaten unter `completion-3f6c495e.json`.

Generischer Vorschlag: Kapazitätsmessung, echte Absatz-/Leerzeilen-/Abschlussabstände und physischen Preflight nach Typografie-/Margin-Overrides gemeinsam prüfen. Blank-/Nachlaufabstände dürfen weder unberücksichtigt bleiben noch ein exportierbares Ergebnis mit scheinbar passendem Text erzeugen.

## Reproduktion und Artefakte

```bash
bun install --frozen-lockfile
npm install --no-save --no-package-lock @playwright/test@1.55.0
bun install --frozen-lockfile
npx playwright install chromium

# Vollmatrix + Grenzfälle + Varianten + Live-Änderungen; Bestandsfehler bleiben rot.
npx playwright test --config tests/qa/playwright.pagination.config.ts

# Kritische CV-Reproduktionen, ohne die ganze Suite erneut auszuführen.
npx playwright test --config tests/qa/playwright.pagination.config.ts --grep 'variant (brief|studio3) large-entry cv|variant ledger (half-columns|masonry)'

npx playwright test --config tests/qa/playwright.combined.config.ts
PAGINATION_QA_DIR=artifacts/pagination-2page-chrome npx playwright test --config tests/qa/playwright.chrome.config.ts
bun scripts/pagination_qa_fields.mjs
node scripts/pagination_qa_summary.mjs
```

Die Playwright-Konfiguration startet und stoppt Vite selbst. Fixture-Suche ist begrenzt und misst nur Produktionskomponenten. Fehlbefunde werden vor der Assertion als JSON geschrieben; die strengen Assertions bleiben aktiv. Die `*.qa.ts`-Dateien werden ausschliesslich über die opt-in QA-Konfigurationen ausgeführt, nicht von den bestehenden expliziten Release-Testgruppen.

- [Komplette CI-Matrix und Einzelbefunde](pagination-2page-11okt-evidence/ci-summary-00086756.json).
- [Gemessene Seitenübergänge](pagination-2page-11okt-evidence/boundaries-00086756.json).
- [Ergänzende Live-/Variant-/Chrome-Befunde](pagination-2page-11okt-evidence/completion-3f6c495e.json).
- [Lange Gesamtdossiers](pagination-2page-11okt-evidence/combined-3f6c495e.json).
- [Provenienz und ursprüngliche Runnerzahlen](pagination-2page-11okt-evidence/run-provenance.json).
- Vollständiger CI-Lauf: https://github.com/modebrecht/cv-cover-charm/actions/runs/38173193848.
- CI-Artefakt `11715561069`: `pagination-2page-000867568476fcb41716ade1d2fc1fa22f8701d4`, inklusive PDFs, PNGs, Fixtures, Hashes und Runnerausgaben; GitHub-Retention bis 25.10.2026. Relevante Befund-JSONs und PNGs sind dauerhaft im QA-Branch archiviert.

## CI und Grenzen der Abnahme

PASS: Typecheck der Anwendung und QA-Dateien, 1’101 Unit-Tests, 21 vorhandene Browser-Regressions, Produktionsbuild, Lint/Formatting der geänderten Dateien. Der vollständige primäre CI-Lauf ist **FAIL** wegen der strengen QA-Befunde und den dort noch enthaltenen zwei inzwischen behobenen QA-Timeouts. Die Reparatur dieser Testabläufe ändert keinen Produktionscode.

Die neue CI ist auf `qa/pagination-2page-11okt` begrenzt. Sie prüft Build/Units/bestehende Tests und dann alle neuen Audits, sammelt auch bei Fehlern Artefakte und enthält weder `continue-on-error` noch Skips. Der veröffentlichte Abschluss-Code wurde zusätzlich fokussiert geprüft. Der vollständige [Remote-CI-Lauf für `3f6c495e`](https://github.com/modebrecht/cv-cover-charm/actions/runs/38194464078) läuft zum Berichtsabschluss noch: Fast-Checks und bestehende Browser-Regressions PASS; vollständige neue Audits/Artefaktabschluss PENDING. Der nachfolgende reine Dokumentationscommit löst gemäss Pfadfilter keinen weiteren QA-Lauf aus.

UNVERIFIED: Native Chromium Print/Paket 3, Word/DOCX, Firefox/Safari, echte ICC/JPEG-Fotos, jede denkbare Benutzerkombination und eine vollständige Pixel-/Accessibility-Abnahme sämtlicher PDF-Seiten. Der allgemeine Foto-/Sidebar-Flow ist mit synthetischen Bildern geprüft. Die extremen Halbspalten-/Eintragfälle wurden an Architekturrepräsentanten getestet; daraus wird kein ungemessener 39/39-Extremtest behauptet.

**Empfohlene nächste Arbeit:** zuerst generische CV-Fragmentierung für überhohe Einträge und Spaltengruppen (F01/F02), dann generische PDF-Textreihenfolge und vollständige Kontaktfelder (F03/F04), danach Brief-Wortumbruch und Typografie-/Margin-Kapazität (F05/F06). Produktfixes gehören auf einen separaten autorisierten Branch. Dieses QA-Paket implementiert keine davon.
