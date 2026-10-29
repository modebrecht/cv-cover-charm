# Einseiten-Knopf: Prüfung über alle 39 Vorlagen

Prüfcommit: `1086996bf2bd3daa47a168ffd844138ea7cc7665`.
Unveränderter Produktcommit: `6af2aebff0fb03f66dbef62b74a28cd34bfc723d`.
Produktbaum: `2125475451d8e85a4f3ce414cc545877f246a6ce`.

Diese Fortsetzung ergänzt ausschliesslich Browserprüfungen und Nachweise.
Der Produktcode der gemessenen Einseitenanpassung bleibt unverändert.

## Umfang

| Szenario                                                                      | Fälle |
| ----------------------------------------------------------------------------- | ----: |
| Bereits passender CV mit eigenen Schriftgrössen, alle Vorlagen                |    39 |
| Zu dichter CV, alle Vorlagen                                                  |    39 |
| Geänderte Seitenränder und Rubrikabstände: Standard, Luftig, Magazin, Sidebar |     4 |
| Tatsächlicher erster Überlauf: Studio 3, Citrus, Ribbon, Ledger               |     4 |
| Automatisches Foto und lange Sidebar, links und rechts                        |     2 |
| Gesamt                                                                        |    88 |

Die 39 Vorlagen werden mit ihrem vorlagenabhängigen Standardlayout geprüft.
Die zusätzlichen Layoutvarianten werden separat abgedeckt.

Der kurze CV wird auf exakte Erhaltung des gespeicherten Zustands geprüft.
Alle Fälle kontrollieren Text und Fotoquelle, Schriftgrenzen, Seitenränder,
Rubrikabstände, Wiederholung der Aktion und Neuladen. Erfolgreiche Einseitenfälle
prüfen sowohl Web- als auch kanonische Exportansicht auf sämtliche Quellmarker
und abgeschnittene Inhalte. Erfolglose Versuche müssen den gespeicherten
Zustand exakt erhalten und den Hinweis auf den verbleibenden Platzbedarf zeigen.

Die vier Grenzfälle bestimmen die erste tatsächlich zweiseitige Fassung durch
eine begrenzte Suche mit echten Browsermessungen. Studio 3 erreicht diese
Grenze bei drei Erfahrungseinträgen, die anderen drei Vorlagen bei vier.
Der Knopf bringt alle vier durch neue Anordnung auf eine Seite; die
Schriftgrössen bleiben erhalten. Die Sidebar-Fälle mit automatischem Foto und
zwölf Sprachen passen links und rechts mit Skala 0,96 auf eine Seite.

Die vier Beispiele mit geänderten Rändern und eigenen Rubrikabständen
benötigen weiterhin zwei Seiten. Ihr gespeicherter Zustand bleibt unverändert.
Für Standard und Sidebar werden ausserdem echte PDF-Downloads geprüft:
Seitenzahl und sämtliche Quellmarker müssen mit der Vorschau übereinstimmen.

## Ergebnis

88 bestanden, 0 Fehler, 0 Wiederholungen, 0 Auslassungen.
45 Ergebnisse belegen eine Seite; 43 zu dichte Ausgangsfassungen bleiben
unverändert auf zwei Seiten. Alle 39 bereits passenden CVs bleiben exakt erhalten.
Beide tatsächlichen Rand-PDFs haben je zwei Seiten und enthalten alle Quellmarker.

Die QA-Typprüfung, Formatprüfung und ESLint der neuen Testdateien sind
fehlerfrei. Der unveränderte Produktbaum wurde zuvor bereits mit 1’438
Unit-Tests, den zehn gezielten Einseitenfällen, den 16 Automatikfällen und dem
Produktionsbuild geprüft; diese Prüfungen wurden hier nicht nochmals ausgeführt.
Die 88 neuen Fälle ergänzen diese Nachweise. Sie sind keine erneute Ausführung
der historischen CV-/Brief-Matrix mit 156 Fällen und keine Word-Abnahme.

## Reproduktion

```sh
playwright test --config tests/qa/playwright.one-page-matrix.config.ts
```

Abhängigkeiten wie im Einseiten-Prüfbericht: Bun 1.3.13, Playwright 1.56.1,
Chromium 141.0.7390.37 und vollständige Liberation-Sans-Schnitte.
Ein selektiver Lauf ist mit `ONE_PAGE_QA_TEMPLATES` möglich. Die zusätzlichen
Grenz-, Rand- und Sidebarfälle bleiben dabei enthalten.

Die vollständige Sicherung enthält den Browserbericht, Zustandsvergleiche,
Kalibrierungen, zwei PDF-Downloads und die neuen Testdateien im Git-Bundle.
Browser-Screenshots sind nicht enthalten. Es wurde nichts gepusht oder veröffentlicht.
