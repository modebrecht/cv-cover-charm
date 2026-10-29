# Gemessener Zweiseiten-Fit — 29. Oktober 2026

Geprüfter Produktcommit: `f0da0deab7d8af3229d02b677b4acb5e480ca972`.
Produktbaum: `255e2efccf26d4611f26ddb121d21b3f8a3e5b38`.

## Reproduzierter Fehler

Auf dem bisherigen Entwicklungsstand `981188e0` erhielt derselbe CV nach
«Alles auf 2 Seiten» verschiedene Seitenzuweisungen abhängig von seiner
vorherigen Spaltenanordnung. Im normalen Ausgangslayout blieb die
Berufserfahrung auf Seite eins. Nach vorherigem Masonry landete sie auf Seite
zwei: Die Höhen der gepackten Rubriken wurden der vorherigen Rubrik zugerechnet,
fehlende Einzelwerte führten zum Rückfall auf Textgewichte.

Der Gegenbeweis wurde im separaten unveränderten Baseline-Worktree erneut
ausgeführt. Der neue Browserfall schlägt dort erwartungsgemäss fehl. Die
Auslastung der Hauptspalten betrug beim Masonry-Ausgang 31,44 / 44,38 Prozent,
gegenüber 44,90 / 30,92 Prozent beim normalen Ausgang.

## Umsetzung

Explizite Zweiseitenwahl und die Zweiseitenentscheidung der Automatik verwenden
jetzt denselben lokalen Messversuch:

1. Fliessende Rubriken werden für die Messung auf volle Breite und normale
   Reihen gesetzt. Freie Rubriken behalten Seite, Position und Grösse.
2. Nach geladenen Schriften wird der reale Platzbedarf gemessen. Haupttext und
   Sidebar besitzen unabhängige Aufteilungen und eigene Kapazitäten für erste
   und folgende Seite. Kontaktblock und Foto zählen als erste Sidebar-Reserve.
3. Ein etwas voller gestaltetes erstes Blatt bleibt das Ziel. Überlauf hat bei
   der Auswahl Vorrang vor der rein optischen Balance.
4. Die gewählte Verteilung wird tatsächlich gerendert und auf höchstens zwei
   Seiten sowie Überlauf geprüft. Erst danach wird sie atomar gespeichert.
   Nicht passende Versuche werden verworfen und verständlich gemeldet.

Eigene Schriftgrössen, Rubrikenreihenfolge, Text, Fotoquelle und Einstellungen
bleiben erhalten. Die nur während des alten Knopfaufrufs gültigen verdichteten
bzw. gelockerten CSS-Abstände wurden entfernt: Messung, gespeicherte Vorschau
und PDF verwenden dieselben normalen Abstände. Die Einseitenaktion behält ihre
bereits geprüfte schrittweise Anpassung.

Im ursprünglichen Gegenbeispiel ergeben beide Ausgangslayouts jetzt dieselbe
Verteilung und dieselbe Hauptspaltenauslastung von 44,90 / 30,92 Prozent.
Die Berufserfahrung bleibt auf Seite eins.

## Abnahme

| Prüfung                                                 | Ergebnis                                                  |
| ------------------------------------------------------- | --------------------------------------------------------- |
| Neue Zweiseiten-Browserfälle                            | 9 bestanden                                               |
| Automatik-Browserfälle                                  | 16 bestanden                                              |
| Gezielte Einseiten-Browserfälle                         | 10 bestanden                                              |
| Einseiten-Vorlagenmatrix                                | 88 bestanden, alle 39 Vorlagen                            |
| Summe Browserfälle                                      | 123 bestanden, keine Wiederholungen oder Auslassungen     |
| Gesamte Unit-Suite                                      | 1’443 bestanden, 0 Fehler, 279 Dateien, 27’170 Assertions |
| App-/QA-Typprüfung, Format, ESLint und Produktionsbuild | bestanden; 21 bestehende Lint-Warnungen                   |

Geprüft sind vorangehendes Masonry, eigene Schriftgrössen, Quellreihenfolge,
Speichern/Neuladen, erneute Aktion, linke/rechte Sidebar, 390-Pixel-Ansicht,
automatisches Foto, grössere Folgeseitenränder, eigene Rubrikabstände, freie
Zweitseitenpositionen und unmöglicher Platzbedarf. Zwei tatsächliche
PDF-Downloads besitzen je zwei Seiten und enthalten Referenzen und Sprachen.

Die Automatikprüfung für lange Sidebars kontrolliert jetzt beide sichtbaren
Seiten und jeden Sprach-/Hobbytext, einschliesslich Abschneiden. Die alte
Annahme «Sprachen müssen immer auf Seite zwei stehen» passt nicht zur
unabhängig gemessenen Aufteilung der beiden Spalten.

Drei weiterhin unterstützte tatsächliche Einseiten-DOCX-Downloads wurden
zusätzlich unabhängig geprüft: je 59 semantische Feldvorkommen, gültiges Paket,
gewöhnliches Foto ausserhalb eines Content Controls, alle ursprünglichen
120 × 180 Fotopixel erhalten.

## Bestehende Word-Grenze

Der gemeinsame native Sidebar-Exporter lehnt explizite Rubrikzuweisungen auf
Seite zwei bereits bisher ab. Der vorhandene Unit-Test dieses Gates bestätigt
die Grenze. Sie wurde nicht entfernt. Das Download-Interface erklärt jetzt
verständlich, dass diese CV-Fassung den PDF-Download benötigt. Die neue
Browserprüfung bestätigt den Hinweis und unveränderte gespeicherte Daten.

Eine native DOCX-Abnahme des expliziten Zweiseiten-Presets wird damit weiterhin
nicht behauptet. Dazu wäre eine separat geprüfte Erweiterung der unabhängigen
Word-Textflüsse nötig.

## CI

Die nach der vorherigen Veröffentlichung rote Regression scheiterte zunächst
vor allen Browserprüfungen: `ubuntu-latest` wählte Ubuntu 26.04, das Playwright
1.55 nicht unterstützt. Der Browserjob läuft jetzt fest auf Ubuntu 24.04.
Der erneute GitHub-Lauf bestätigte erfolgreiche Browserinstallation.

Er zeigte anschliessend weitere bestehende Smoke-Fehler, unter anderem
DOCX-Erwartungen für andere als die aktuell freigegebene Modern-Komposition,
alte UI-Erwartungen und Zustandsvergleiche. Diese Fehler wurden nicht durch
Abschalten von Tests kaschiert. Die gesamte Regression bleibt ein separater
offener Punkt.

Ein neuer CI-Workflow `CV measured page fit` führt die 35 gezielten
Einseiten-/Zweiseiten-/Automatikfälle mit Bun 1.3.13, Playwright 1.56.1 und
Ubuntu 24.04 aus. Browserwerkzeuge sind von den gesperrten
Anwendungsabhängigkeiten getrennt. Der 88er-Matrixlauf bleibt separat aufrufbar.

```sh
playwright test --config tests/qa/playwright.two-page-fit.config.ts
playwright test --config tests/qa/playwright.smart-fit.config.ts
playwright test --config tests/qa/playwright.one-page-fit.config.ts
playwright test --config tests/qa/playwright.one-page-matrix.config.ts
```
