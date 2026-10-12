# Brief-PDF: Textreihenfolge und vollständige Kontaktfelder

Die autorisierten Folgekorrekturen zu F03/F04 verändern ausschliesslich die unsichtbare Brief-PDF-Textschicht. Die ursprüngliche QA bleibt auf ihrem eigenen Branch. Die abschliessende Remote-CI besteht vollständig: 132 Browserfälle, 1’101 Unit-Tests und alle 39 Briefvorlagen. Das begrenzte F03/F04-Korrekturpaket ist abgeschlossen; F05/F06 bleiben offen.

## Provenienz und begrenzter Umfang

- Branch: `fix/letter-pdf-textlayer-12okt`, unabhängig von der CV-Korrektur auf Remote `dev` aufgebaut.
- Autoritative Basis: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`.
- Produktionskorrektur: `34820772ca226be6aa9807bd260aee828ce77b88`, Tree `a00a8160fdc67cd96f4852587cd9553e1cb39a46`.
- Abschliessender Teststand: `491c8b0f7c75355f862ec934bd396041d5651a80`, Tree `5a304d41605bbeaa0551132775efe30a0d0c49e3`.
- Einzige geänderte Produktionsdatei: `src/lib/dossier-pdf.ts`; Blob vorher `8d236016b3577165b6a4126edfbb4cd9b189bfac`, nachher `32a3bfdfc6430bfb67d39c200de87da4f3fd271d`.
- Produktionsrenderer, Pagination, DossierPdfCanvas, Templates/CSS, Schemas, Header-/Margin-Regeln, Benutzersteuerung und Native Chromium bleiben unverändert. Die automatisch regenerierte `src/routeTree.gen.ts` wird vor Veröffentlichung zurückgesetzt.
- AGENTS.md gelesen. Keine Historie umgeschrieben, keine Zusammenführung, Promotion oder Veröffentlichung eines Deployments. Nur der eigene Fix-Ref wird aktualisiert. Frisch geprüft nach dem Lauf: `dev` bleibt `e3a7bc18868e94813377db4261f7e3c180e0e6fa`, `main` bleibt `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, `render` bleibt `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`; Native steht auf `4da4820b2e5fb9cb4a65346c9c191db0c789cd34` und wurde vom parallelen Agenten weitergeführt, ohne Ref-Änderung durch diesen Agenten. Die ursprüngliche QA bleibt auf `a969351481a66c6e0eb79c7f744940bcbc851b8d`, der separate CV-Fix auf `c07f81b5dca5aa1f2479def3925b4101a06aa06c`.

Die generische Textsammlung folgt den tatsächlich sichtbaren DOM-Textknoten und ihrer gemessenen Glyphenposition. Sie erfasst auch integrierte Kontaktzeilen ohne `data-letter-pdf-text`-Attribut. Briefkörper und Schluss erscheinen in ihrer Reihenfolge; absolut positionierte Chrome-Footer werden am logischen Seitenende ausgegeben. Listenzeichen stehen vor ihrem Inhalt. Vorhandene Font-/Unicode-/Positionsberechnung und unsichtbare PDF-Ausgabe bleiben erhalten. Es gibt keinen Warm-spezifischen Produktionszweig.

Der QA-Collector verschiebt ausschliesslich die sichtbaren, absolut positionierten Chrome-Footer-Knoten an das logische Ende. Alle Knoten und die vollständigen Assertions zu Inhalt, Häufigkeit, Reihenfolge, Seitenverteilung und Clipping bleiben erhalten; keine Toleranz wurde gelockert. Bestehende Editorprüfungen verwenden die aktuellen Besitzer der Steuerungen und denselben Serverport wie ihre Suite. Ein zusätzlicher UI-Test prüft den Sync in beide Richtungen und seine Abschaltung.

## Verifizierte Baseline und Korrektur

**F03 – FAIL auf dev / P2, PASS im vollständigen Fix-Lauf:** Bei Brief und Warm steht im ursprünglichen PDF der Schluss vor dem Briefkörper. Derselbe gespeicherte Inhalt auf dem Fix-Stand hat die korrekte Reihenfolge und keine fehlenden/duplizierten Absatzmarker.

**F04 – FAIL auf dev / P2, PASS im vollständigen Fix-Lauf:** Warm zeigt `Dorfstrasse 12`, `079 123 45 67` und `lea.mueller@example.ch` im Web und Export-DOM, lässt sie aber aus dem ursprünglichen PDF-Text aus. Ursache sind sichtbare integrierte Kontaktzeilen in der gemeinsamen Header-Komponente, die keine alten PDF-Feldmarker haben. Die neue sichtbare Textsammlung erfasst diese Zeilen. Ein zusätzlicher Test verwendet fünf voneinander und vom Empfänger unabhängige Absendermarker; alle vollständigen Werte bleiben im PDF. Deaktivierte Telefon-/E-Mail-Felder gelangen dagegen nicht hinein.

Frisch reproduziert am 12.10.2026: zwei unveränderte Dev-Baselines **2 FAIL**, gleiche Fix-Fixtures **2 PASS**, fünf zusätzliche Textschichtprüfungen **5 PASS**. Beide Vorher/Nachher-Fixture-Hashes stimmen überein. Die eingebetteten Brief- und Warm-Rasterbilder sind jeweils byte-identisch. Dies belegt unveränderte sichtbare PDF-Darstellung für diese zwei konkreten Baselines; eine Pixelabnahme aller Vorlagen wird daraus nicht abgeleitet.

- [Fokussierte Zustände mit Quell-SHA, Blob, Geometrie, Markern und Befunden](letter-pdf-textlayer-12okt-evidence/focused-reproductions.json).
- [Ursprünglich fehlende Warm-Felder](letter-pdf-textlayer-12okt-evidence/baseline-logical-fields.json).
- [Rastervergleich mit Fixture- und Bild-Hashes](letter-pdf-textlayer-12okt-evidence/raster-comparison.json).
- [Sieben lokal wiederholte Gesamtdossiers, Seitenzahlen und Marker](letter-pdf-textlayer-12okt-evidence/combined-focused.json).
- [Abgeschlossene CI, genaue Zahlen, Quell-SHA und Artefakt-Digest](letter-pdf-textlayer-12okt-evidence/ci-provenance.json).

## Vollmatrix und Grenztests

Die Tests importieren den bestehenden autoritativen `GALLERY_CASES`-Katalog mit 39er-Guard. Es gibt keinen zweiten Vorlagenkatalog. Zweitseitige Fixtures werden durch die tatsächliche Produktionsvorschau begrenzt kalibriert; keine eigene Pagination, Kürzung oder Schriftverkleinerung.

| Prüfung                                                                                                                                 |  Fälle | Ergebnis              |
| --------------------------------------------------------------------------------------------------------------------------------------- | -----: | --------------------- |
| 39 Vorlagen × ein-/zweitseitiger Brief                                                                                                  |     78 | PASS                  |
| Sieben Architekturvertreter: letzter Einseiter, erster Zweitseiter, letzter Zweitseiter, erster Dreiseiter, Wiederherstellung kurz/lang |      7 | PASS                  |
| Live kurz/lang/kurz/lang ohne Reload: Brief, Studio 3                                                                                   |      2 | PASS                  |
| Erste/Folgeseiten-Header und Footer: Brief, Studio 3                                                                                    |      2 | PASS                  |
| Warm-Kontakte, Rich-Text/Listen, versteckte Kontakte, Rollen-Typografie, Beilagenfooter                                                 |      5 | lokal und Remote PASS |
| **Standalone-Brief-QA**                                                                                                                 | **94** | **PASS**              |
| Lange kombinierte Dossiers                                                                                                              |      7 | PASS                  |
| Produkt-/PDF-/Editor-/Sync-Regressions, einschliesslich eines neuen Sync-Roundtrips                                                     |     31 | Remote PASS           |
| Unit-Tests                                                                                                                              |  1’101 | Remote PASS           |

Die abgeschlossene Standalone-Suite hat 135 Zustände PASS und 115 Produktions-PDFs geprüft, ohne blockierten Export. Die verbleibenden Zustände prüfen Wiederherstellung ohne erneuten Export. Alle 132 eindeutigen Browserfälle bestehen (94 Standalone + 7 Gesamtdossier + 31 Produkt/Editor); lokale Wiederholungen werden nicht zusätzlich gezählt. Die sieben Gesamtdossiers prüfen die physische Reihenfolge `Titelblatt → Brief → CV` und identische Seitenverteilung zum Web. Die vollständige Feldprüfung besteht für 128 normale Zustände und 2’954 gespeicherte logische Felder in Web, Export-DOM und, wenn exportiert, PDF. Die fünf Sonderfälle haben eigene vollständige bzw. absichtlich negative Feldassertions.

| Vorlage / ID                 | Brief-Archetyp | Baseline-Seiten | Ergebnis |
| ---------------------------- | -------------- | --------------- | -------- |
| Brief (`brief`)              | quiet          | 1 / 2           | PASS     |
| Editorial (`klassisch`)      | frame          | 1 / 2           | PASS     |
| Modern (`modern`)            | quiet          | 1 / 2           | PASS     |
| Warm (`freundlich`)          | band           | 1 / 2           | PASS     |
| Edel (`edel`)                | frame          | 1 / 2           | PASS     |
| Colorful (`colorful`)        | band           | 1 / 2           | PASS     |
| Blockig (`blockig`)          | sidebar        | 1 / 2           | PASS     |
| Seriös (`serioes`)           | band           | 1 / 2           | PASS     |
| Human (`human`)              | quiet          | 1 / 2           | PASS     |
| Horizont (`welle`)           | band           | 1 / 2           | PASS     |
| Kolumne (`terracotta`)       | sidebar        | 1 / 2           | PASS     |
| Rahmen (`pastell`)           | frame          | 1 / 2           | PASS     |
| Sonne (`sonne`)              | band           | 1 / 2           | PASS     |
| Studio (`studio`)            | sidebar        | 1 / 2           | PASS     |
| Neon (`neon`)                | frame          | 1 / 2           | PASS     |
| Aurora (`aurora`)            | band           | 1 / 2           | PASS     |
| Verlauf (`verlauf`)          | frame          | 1 / 2           | PASS     |
| Citrus (`citrus`)            | frame          | 1 / 2           | PASS     |
| Edge (`edge`)                | band           | 1 / 2           | PASS     |
| Glow (`glow`)                | fresh          | 1 / 2           | PASS     |
| Mono Luxe (`monoLuxe`)       | band           | 1 / 2           | PASS     |
| Horizon (`horizon`)          | band           | 1 / 2           | PASS     |
| Sunrise (`sunrise`)          | band           | 1 / 2           | PASS     |
| Forest Flow (`forestFlow`)   | sidebar        | 1 / 2           | PASS     |
| Violet Pulse (`violetPulse`) | fresh          | 1 / 2           | PASS     |
| Studio 2 (`studio2`)         | sidebar        | 1 / 2           | PASS     |
| Studio 3 (`studio3`)         | sidebar        | 1 / 2           | PASS     |
| Warm 2 (`warm2`)             | fresh          | 1 / 2           | PASS     |
| Warm 3 (`warm3`)             | fresh          | 1 / 2           | PASS     |
| Verlauf 2 (`verlauf2`)       | fresh          | 1 / 2           | PASS     |
| Verlauf 3 (`verlauf3`)       | fresh          | 1 / 2           | PASS     |
| Ledger (`ledger`)            | sidebar        | 1 / 2           | PASS     |
| Prism (`prism`)              | fresh          | 1 / 2           | PASS     |
| Gallery (`gallery`)          | sidebar        | 1 / 2           | PASS     |
| Orbit (`orbit`)              | fresh          | 1 / 2           | PASS     |
| Ribbon (`ribbon`)            | band           | 1 / 2           | PASS     |
| Cove (`cove`)                | band           | 1 / 2           | PASS     |
| Diagonal (`diagonal`)        | frame          | 1 / 2           | PASS     |
| Edel Dark (`edelDark`)       | frame          | 1 / 2           | PASS     |

Die sieben Grenzvertreter sind Studio 3, Studio 2, Ledger, Ribbon, Gallery, Brief und Kolumne (`terracotta`). Alle sechs geprüften Zustände pro Vertreter bestehen, einschliesslich der ersten echten Dreiseite und anschliessender Wiederherstellung. Gemessen werden reale Schwellen von einer auf zwei und von zwei auf drei Seiten. Drei Seiten sind bei entsprechend langem Inhalt gültig. Eine allgemeine Zweitseitenbeschränkung wurde nicht eingeführt.

## Header-Abstand und Seitenlayout-Sync

PASS im echten Browser mit gespeicherten Werten und Reload:

| Einstellung                               | CV                                                           | Anschreiben                                   | Synchronisierung                           |
| ----------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------ |
| Zusätzlicher Abstand nach Header, 0–40 mm | `Seitenränder & Abstände → Zusätzlicher Abstand nach Header` | `Header & Footer → Freiraum unter dem Header` | Teil des Header/Footer-Sync                |
| Seitenränder                              | Gemeinsame PageMargins-Steuerung, CV-Scope                   | Dieselbe Steuerung, Letter-Scope              | Pro Dokument gespeichert; kein Margin-Sync |
| Oberer Rand der Folgeseiten               | Eigene Einstellung `Oberer Rand ab Seite 2`                  | Eigene Brief-Margin-/Header-Berechnung        | Kein identisches Folgeseitenmodell         |

Roundtrip: CV-Headerabstand 17 mm erscheint im Brief; Briefänderung auf 19 mm erscheint im CV. CV-Rechtsrand 30 mm und Brief-Rechtsrand 35 mm bleiben getrennt. Nach Abschalten des Sync bleibt der Brief bei 19 mm, während CV auf 21 mm geändert wird. Bei ausgeschaltetem Header wirkt kein zusätzlicher Headerabstand. Gleiche Zahlen garantieren wegen eigener Margins und Template-Geometrie keinen identischen Textstart in beiden Dokumenten. Die Einstellungen selbst wurden in diesem Branch nicht geändert.

## CI, Reproduktion und Grenzen

Erster Remote-Lauf [38200483009](https://github.com/modebrecht/cv-cover-charm/actions/runs/38200483009) am Produktionscommit: **FAIL** durch drei bestehende Editorprüfungen gegen `localhost:5173`, obwohl die neue Suite Vite auf `4173` startet. Fast-Checks und 27 andere Produktprüfungen bestanden; die folgenden Matrix-Schritte liefen in diesem CI-Versuch nicht. Dieser Fehler wird nicht als Produktregression gezählt oder verborgen.

Korrigierter Lauf [38220304452](https://github.com/modebrecht/cv-cover-charm/actions/runs/38220304452) auf exakt `491c8b0f7c75355f862ec934bd396041d5651a80`: vollständig **SUCCESS**, abgeschlossen 12.10.2026 um 08:06:05 UTC. Typechecks, 1’101 Units, Lint, Formatting, Produktionsbuild, 31 Browser-Produktprüfungen, 94 Brief-QA-Prüfungen, sieben Gesamtdossiers und alle Feldchecks PASS. Keine ausstehenden Checks in diesem dedizierten Lauf. Der folgende reine Bericht-/Belegcommit löst wegen des bestehenden Pfadfilters keinen weiteren teuren Lauf aus; sein Produktions- und Testcode ist identisch zum geprüften SHA. Artefakte enthalten Runner-JSON, PDFs, Original-Fixtures, Quell-/Fixture-Hashes, DOM-Geometrie, Suchschwellen, Feldchecks und Einzelbefunde. [Artefakt 11734885339](https://github.com/modebrecht/cv-cover-charm/actions/runs/38220304452/artifacts/11734885339), 130’998’392 Bytes, SHA-256 `0b6300a52c866c4d4ce3db8b51cad13508c0791251ace54f26b9a62c63fb4a58`. Ablauf: 26.10.2026, 08:05:56 UTC. Die kompakten Befunde und Hashes sind zusätzlich dauerhaft in diesem Branch archiviert.

```bash
bun install --frozen-lockfile
npm install --no-save --no-package-lock @playwright/test@1.55.0
bun install --frozen-lockfile
npx playwright install chromium
PAGINATION_QA_DIR=artifacts/letter-textlayer npx playwright test --config tests/qa/playwright.letter-textlayer.config.ts
npx playwright test --config tests/qa/playwright.combined.config.ts
npx playwright test --config tests/qa/playwright.letter-product.config.ts
PAGINATION_QA_DIR=artifacts/letter-textlayer bun scripts/pagination_qa_fields.mjs
PAGINATION_QA_DIR=artifacts/letter-textlayer node scripts/pagination_qa_summary.mjs

# Bekannte unabhängige Bestandsfehler bleiben reproduzierbar und rot.
npx playwright test --config tests/qa/playwright.pagination.config.ts --grep 'variant (brief|studio3|gallery) (long-word|custom-margins) letter'
```

**FAIL / offen:** F05, sehr lange ungetrennte Wörter, und F06, Exportblockade bei bestimmten 12-pt-/24-mm-Briefkombinationen. Diese bekannten Pagination-/Preflight-Defekte sind in der ursprünglichen strengen QA dokumentiert und werden von der Textschichtkorrektur nicht behoben. Die fokussierte Suite wählt ihre Prüfaufgabe explizit aus; sie überspringt oder lockert diese bestehenden Reproduktionen nicht. Eine vollständige Brief-Produktabnahme bleibt deshalb FAIL.

**PASS separat:** Die kritischen CV-Defekte F01/F02 sind auf `fix/cv-flow-fragmentation-12okt` korrigiert; dessen Code-CI [38197692673](https://github.com/modebrecht/cv-cover-charm/actions/runs/38197692673) besteht mit 104 CV-QA-, 21 Produkt- und 1’111 Unit-Tests. Dieser Briefbranch enthält die CV-Korrektur nicht. Eine gemeinsame Integrationsabnahme ist noch nicht durchgeführt.

**UNVERIFIED:** Native Chromium, Word/DOCX, Firefox/Safari, vollständige Screenreader-/Tagged-PDF-Abnahme, sämtliche Benutzerkombinationen und alle möglichen Fonts. Geprüft wird der automatische html2canvas/jsPDF-Pfad in Chromium. Logische PDF-Reihenfolge und Suchbarkeit bedeuten keine Tagged-PDF-Konformität.

Nächste empfohlene Arbeit: beide unabhängigen Fixes separat reviewen; danach F05/F06 generisch in gemeinsamem Mess-/Render-/Preflight-Verhalten korrigieren und eine gemeinsame Integration prüfen. Kein vorlagenspezifischer Workaround, keine Kürzung und keine automatische Schriftverkleinerung.
