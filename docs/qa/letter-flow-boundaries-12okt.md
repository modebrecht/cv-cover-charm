# Brief-Flow: lange Wörter und eigene Seitenränder

Das begrenzte F05/F06-Paket ist abgeschlossen und vollständig grün: 142 Browserfälle, 1’101 Unit-Tests und alle 39 Briefvorlagen. Die ursprünglichen Assertions und der physische Preflight bleiben unverändert. Die kumulierten Briefkorrekturen F03–F06 sind im beschriebenen Umfang PASS; die gemeinsame Integration mit dem separaten CV-Fix bleibt UNVERIFIED.

## Quelle und Branch-Sicherheit

- Branch: `fix/letter-flow-boundaries-12okt`; kein vorhandener Ref überschrieben.
- Frisch gefetchter `dev`: `e3a7bc18868e94813377db4261f7e3c180e0e6fa`.
- Basis des neuen Branches: geprüfter Brief-PDF-Fix `0f7fb149c1de099cb3d890f75fb1dd006cf1e4a0`; dessen CI `38220304452` ist SUCCESS. Damit bleiben F03/F04 Bestandteil des getesteten Brief-Stacks. Kein Merge oder Cherry-Pick.
- Produktions-/Testcommit: `aee948ab3ee2dd045619cb99e7f4d9b89c530f68`, Tree `2639d834b1505da4f333a839fba52a1e32c9094c`.
- Drei neue Produktionsdateien gegenüber der Branchbasis: `LetterDocument.tsx` (`1cc902fbeed45105e34b3881eb70a257e2ae19cf`), `letter-pagination.ts` (`a2e7573121c6f89545c0512ba25a33ea7f778c46`), `letter-pagination.css` (`a328282aac0b77e1b8360dcd89a5934cd6839c92`).
- `src/lib/dossier-pdf.ts` bleibt exakt der geprüfte F03/F04-Blob `32a3bfdfc6430bfb67d39c200de87da4f3fd271d`. DossierPdfCanvas, PDF-Renderer, Templates, globale Layoutregeln, Schemas und Benutzersteuerungen werden hier nicht verändert.
- AGENTS.md gelesen. Keine Historie umgeschrieben; kein Merge, keine Promotion, kein Deployment. `dev`, `main`, `render` und Native Chromium werden durch diesen Agenten nicht aktualisiert. Automatisch generierte Änderungen an `src/routeTree.gen.ts` werden zurückgesetzt. Frisch nach dem erfolgreichen Lauf bestätigt: `dev` = `e3a7bc18868e94813377db4261f7e3c180e0e6fa`, `main` = `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, `render` = `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`, Native = `4da4820b2e5fb9cb4a65346c9c191db0c789cd34`; alle Ref-Updates dieses Pakets betreffen ausschliesslich den neuen Brief-Flow-Branch.

## Reproduzierbare Defekte und generische Korrektur

### F05 – P2: ungetrennte Tokens überschreiten den Textrahmen

Baseline FAIL: `paginationFixture(template, { paragraphs: 14, longWord: true })`. Der zweite Absatz enthält 35 direkt aneinandergehängte Wiederholungen von „Zusammenarbeit“. Studio 3 und Gallery laufen im Web und im kanonischen Export-DOM aus der A4-Breite; der Preflight blockiert den Export. Die ursprüngliche QA dokumentiert denselben Befund auch für Brief.

Korrektur: `overflow-wrap:anywhere` gilt ausschliesslich für den Briefkörper innerhalb des gemeinsamen LetterDocument. Derselbe CSS-Scope erfasst die echten Messseiten und deren Höhen-Sandbox. Normale Wörter behalten ihre Wortgrenzen; überbreite Tokens bekommen einen sicheren Notumbruch. Automatische Silbentrennung bleibt ausgeschaltet. Keine eingefügten Trennzeichen, Datenkürzung oder Schriftverkleinerung.

Ein Token, der selbst höher als eine ganze Seite ist, braucht zusätzlich einen physischen Seitenumbruch. Der vorhandene Range-basierte Split sucht weiterhin zuerst Wortgrenzen; nur wenn diese keinen passenden Teil liefern, sucht er gemessene Graphemgrenzen mit `Intl.Segmenter`. Range-Klone erhalten die Inline-Formatierung und vollständige Zeichenfolge.

Fokussierter Fix PASS: alle drei ursprünglichen Langwort-Fixtures, zusätzlich ein vollständiges ungetrenntes Unicode-Token über zwei Seiten (Brief) sowie eine fett formatierte Variante über drei Seiten (Studio 3). Marker, ganze Zeichenfolge, Reihenfolge und Seitenverteilung stimmen zwischen Web, Export-DOM und Produktions-PDF überein. Kombinierende Zeichen werden nicht durch die Seitenfragmentierung getrennt; `hyphens:none` bleibt aktiv.

### F06 – P2: eigene Ränder werden mit veralteter Messgeometrie geplant

Baseline FAIL: `paginationFixture(template, { paragraphs: 14, custom: true })`, 12 pt und 24-mm-Ränder. Brief, Studio 3 und Gallery erzeugen drei Seiten, deren Export wegen `physical-overflow` blockiert ist.

Die zusätzliche DOM-Diagnostik lokalisiert den Fehler: Bei SSR/Hydration behalten vorhandene erste Seiten und versteckte Probes teilweise die Standard-Inset-Stile, obwohl gespeicherte Ränder schon für neu montierte Folgeseiten gelten. Im konkreten Brieffall misst die Continuation-Probe 975,609 px verfügbare Layerhöhe und 616,375 px Körperbreite; die tatsächliche Folgeseite hat 866,016 px bzw. 612,594 px. Der Paginator verplant damit rund 29 mm zusätzliche Höhe. Der überstehende Nachlaufblock ist ein realer Layout-/Preflight-Widerspruch; der ursprüngliche Befund belegt keinen A4-Glyphenschnitt.

Korrektur: LetterDocument abonniert den vorhandenen, dokumentbezogenen Margin-Snapshot. Änderungen invalidieren den Umbruch. Sichtbare Seiten und echte Messseiten werden gemeinsam mit demselben Snapshot neu montiert; zurückgebliebene Hydration-Stile gelangen nicht mehr in die Kapazitätsmessung. Bestehende Mindestabstände, Header-/Footer-Reserven und Preflight-Toleranzen bleiben unverändert.

Fokussierter Fix PASS: Quelle, Probes, Web und Export-DOM haben nun dieselbe verfügbare Geometrie. Die ursprünglichen drei Custom-Fixtures benötigen **vier gültige Seiten**, behalten alle 14 Absätze und exportieren vollständig. Der vorherige Dreiseiter war kein korrekt passendes Layout. Drei oder vier Seiten werden nicht künstlich auf zwei Seiten reduziert.

Live-Roundtrip PASS: zehn Absätze, 12 pt; obere/linke/rechte Ränder `24 → 45 → 24 mm` ohne Reload. Das Dokument wechselt `3 → 4 → 3 Seiten`; die drei Produktions-PDFs behalten vollständigen Inhalt, richtige Reihenfolge und dieselbe Seitenverteilung wie Web/Export-DOM.

## Prüfungen und Evidenz

| Gruppe                                                                      | Eindeutige Fälle | Ergebnis              |
| --------------------------------------------------------------------------- | ---------------: | --------------------- |
| 39 Vorlagen × ein-/zweitseitiger Brief                                      |               78 | Remote PASS           |
| Sieben Vertreter, vier Seitenübergänge und zwei Wiederherstellungen         |                7 | Remote PASS           |
| Ursprüngliche Langwort-/Custom-Margin-Reproduktionen                        |                6 | lokal und Remote PASS |
| Live-Inhaltwechsel                                                          |                2 | Remote PASS           |
| Erste-/Folgeseiten-Chrome                                                   |                2 | Remote PASS           |
| F03/F04, Listen, versteckte Kontakte, Rollen-Typografie, Footer-Reihenfolge |                5 | Remote PASS           |
| Probe-/Seitengleichheit, zwei Unicode-Tokens, Live-Margins                  |                4 | lokal und Remote PASS |
| **Brief-QA gesamt**                                                         |          **104** | **Remote PASS**       |
| Bestehende Produkt-/PDF-/Editor-/Sync-Regressions                           |               31 | Remote PASS           |
| Lange kombinierte Dossiers                                                  |                7 | Remote PASS           |
| Unit-Tests                                                                  |            1’101 | lokal und Remote PASS |

Die Suite verwendet den vorhandenen autoritativen `GALLERY_CASES`-Katalog mit 39er-Guard. Kein zweiter Vorlagenkatalog, keine Test-Pagination, keine aktualisierten Snapshots und keine Skips. Die bestehenden sechs Problem-Fixtures sind jetzt Teil derselben strengen Briefsuite. Alle 104 Fälle sind mit `--list` bestätigt. Wiederholungen werden nicht als zusätzliche Fälle gezählt.

Der vollständige Lauf hat 147 Standalone-Zustände und 127 Produktions-PDFs PASS geprüft, ohne blockierten Export. Weitere sieben Gesamtdossier-PDFs PASS prüfen `Titelblatt → Brief → CV`. Die Zusatz-Feldprüfung besteht für 140 normale und neue Flow-Zustände mit 3’288 logischen Feldern, jeweils in Web, Export-DOM und, wenn exportiert, PDF. Absichtlich ausgeblendete Kontaktfelder aus der Sonderprüfung haben eigene negative Assertions.

Grenzvertreter: Studio 3, Studio 2, Ledger, Ribbon, Gallery, Brief, Kolumne. Geprüft werden letzter Einseiter, erster Zweitseiter, letzter Zweitseiter, erster Dreiseiter und Wiederherstellung. Die Zweitseiten-Matrix wird anhand tatsächlicher Produktionsausgabe begrenzt kalibriert. Eine allgemeine Zweitseitengrenze wird nicht eingeführt. Alle 78 Baselines und alle sieben Grenzfälle einschliesslich der ersten Dreiseite und Wiederherstellungen bestehen im Remote-Lauf.

- [Baseline und fokussierte Fix-Zustände](letter-flow-boundaries-12okt-evidence/focused-reproductions.json): Quellen, Dirty-/Diff-Status, Blob-/Fixture-Hashes, Marker, Seitengeometrie und vollständige Befunde.
- [Gemessene Margin-Differenz vorher/nachher](letter-flow-boundaries-12okt-evidence/margin-geometry.json).
- [Lokale Runner-Provenienz und behaltene Fehlversuche](letter-flow-boundaries-12okt-evidence/local-provenance.json).
- [Abgeschlossene CI mit allen 142 ausgeführten Browserfällen, 39 IDs und Artefakt-Digest](letter-flow-boundaries-12okt-evidence/ci-provenance.json).
- Sichtbar geprüfte Produktions-PDFs: [Langwort, Seite 1](letter-flow-boundaries-12okt-evidence/long-word-page1.png), [eigene Ränder, Seite 2](letter-flow-boundaries-12okt-evidence/custom-margins-page2.png). Das Langwort bleibt im Textrahmen; die Fortsetzungsseite hält den korrekten 40-mm-Textlayer-Start ein. Eine vollständige Pixelabnahme aller Vorlagen wird nicht daraus abgeleitet.

Vor Änderungen wurden sieben Baseline-Fälle ausgeführt: fünf archivierte Produktionsbefunde FAIL und zwei Editor-Readiness-Timeouts. Der erste Browserstart scheiterte zusätzlich an einem fehlenden lokalen Browserpaket und zählt nicht als ausgeführte Produktprüfung. Nach Installation bestanden die sieben fokussierten Fix-Fälle. Bei zusätzlichen Tests gab es lokale Readiness-Timeouts und zunächst einen falschen Selektor, der auch versteckte Probes auf Fettformatierung prüfte. Der Selektor umfasst nun ausschliesslich die echten physischen Seiten; alle vier neuen Fälle sind in gezielten Wiederholungen PASS. Die ursprünglichen Readiness-Timeouts, Assertions und Clipping-Toleranzen bleiben unverändert. Die Tests wurden nicht automatisch wiederholt; die lokalen Fehlversuche sind aufgeführt.

## CI und Reproduktion

Remote-Lauf [38230754770](https://github.com/modebrecht/cv-cover-charm/actions/runs/38230754770) auf exakt `aee948ab3ee2dd045619cb99e7f4d9b89c530f68`: vollständig **SUCCESS**, abgeschlossen 12.10.2026 um 09:42:39 UTC (11:42:39 Zürich). Typechecks, 1’101 Units, Lint, Formatting, Build, 31 Produkt-/Editorprüfungen, 104 Brief-QA-Fälle, sieben Gesamtdossiers und alle Feldchecks PASS. Keine ausstehenden Checks in diesem dedizierten Lauf. Der nachfolgende reine Bericht-/Belegcommit hat identischen Produktions-/Testcode und löst wegen des bestehenden Pfadfilters keinen weiteren teuren Lauf aus. Die isolierte Workflow-Datei läuft nur auf diesem Branch und sammelt Artefakte auch bei Fehlern, ohne `continue-on-error`. [Artefakt 11738862057](https://github.com/modebrecht/cv-cover-charm/actions/runs/38230754770/artifacts/11738862057), 156’572’391 Bytes, SHA-256 `c2b7af7155783c735ee71827812a39e582b256c113d97852b1193aa557862d74`; Ablauf 26.10.2026 um 09:42:31 UTC. Es enthält PDFs, Fixtures, Suchschwellen, Runner-JSON und Einzelbefunde. Die kompakten Vergleichsdaten und zwei visuell geprüften Rasterseiten sind zusätzlich dauerhaft im Branch archiviert.

```bash
bun install --frozen-lockfile
npm install --no-save --no-package-lock @playwright/test@1.55.0
bun install --frozen-lockfile
npx playwright install chromium
PAGINATION_QA_DIR=artifacts/letter-flow npx playwright test --config tests/qa/playwright.letter-flow.config.ts
npx playwright test --config tests/qa/playwright.letter-product.config.ts
npx playwright test --config tests/qa/playwright.combined.config.ts
PAGINATION_QA_DIR=artifacts/letter-flow bun scripts/pagination_qa_fields.mjs
PAGINATION_QA_DIR=artifacts/letter-flow node scripts/pagination_qa_summary.mjs

# Schnelle ursprüngliche Defekt-Reproduktionen
PAGINATION_QA_DIR=artifacts/letter-flow-focused npx playwright test --config tests/qa/playwright.letter-flow.config.ts --grep 'variant (brief|studio3|gallery) (long-word|custom-margins) letter'

# Zusätzliche Flow-Fälle ohne parallelen Build; Assertions unverändert
PAGINATION_QA_DIR=artifacts/letter-flow-deep npx playwright test --config tests/qa/playwright.letter-flow.config.ts --workers 1 --grep 'flow (custom typography|brief:|studio3:|live margins)'
```

## Grenzen und nächster Schritt

UNVERIFIED: Native Chromium, Firefox/Safari, Word/DOCX, vollständige Pixel-/Tagged-PDF-/Screenreader-Abnahme und jede denkbare Schrift-, Bild-, Tabellen- oder Randkombination. Header/Footer-Sync bleibt separat mit bestehenden UI-Tests abgedeckt; diese Korrektur führt keinen Seitenränder-Sync ein.

Der kritische CV-Fix F01/F02 bleibt separat auf `fix/cv-flow-fragmentation-12okt` (`c07f81b5dca5aa1f2479def3925b4101a06aa06c`, CI SUCCESS). Er ist nicht Teil dieses Briefbranches. Eine gemeinsame Integrationsabnahme beider Fix-Stacks ist noch nicht durchgeführt. Die ursprüngliche reine QA bleibt auf `qa/pagination-2page-11okt` (`a969351481a66c6e0eb79c7f744940bcbc851b8d`).

Empfohlener nächster Schritt: Review des kumulierten Brief-Fix-Stacks und separate Integrations-QA zusammen mit dem CV-Fix. Keine Promotion oder Deployment im Rahmen dieses Pakets.
