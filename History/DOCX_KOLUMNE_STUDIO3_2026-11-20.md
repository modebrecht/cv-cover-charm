# DOCX-Prüfung für Kolumne und Studio 3

Geprüft auf `57f1170` mit dem App-Download für das CV-PDF und dem internen DOCX-Next-Renderer für den einzelnen Lebenslauf. Das DOCX-Modell wurde direkt aus den gespeicherten App-Daten erstellt. LibreOffice Writer 25.8.7.3 öffnete alle vier Dateien und gab sie als PDF aus.

| Vorlage und Layout | Seiten App-PDF / Writer | Textmarkierungen auf anderer Seite | Fotorahmenbreite App / Writer |
| --- | --- | --- | --- |
| Kolumne · Standard | 3 / 5 | 14 von 20 | 28,79 / 34,01 mm |
| Kolumne · Sidebar rechts | 3 / 5 | 18 von 20 | 28,99 / 34,01 mm |
| Studio 3 · Standard | 3 / 5 | 15 von 20 | 31,99 / 34,01 mm |
| Studio 3 · Sidebar rechts | 3 / 5 | 16 von 20 | 28,99 / 34,01 mm |

In jedem PDF erscheint jede der 20 Prüfmarkierungen genau einmal. Die Referenz steht im App-PDF auf Seite 3 und in Writer auf Seite 5. Das Zoom-/Verschiebungsprofil stimmt an vier Punkten innerhalb des kreisförmigen Fotos mit dem Prüfbild überein. Die maximale Abweichung beträgt im App-PDF 3 RGB-Stufen und in Writer 1 Stufe. Der Rahmen steht in allen Fällen auf Seite 1. Bei Kolumne Standard liegt seine linke Kante in Writer rund 44 mm weiter links, bei Studio 3 Sidebar rechts die obere Kante rund 34 mm höher.

Der Vergleich nutzt die synthetischen 18 Praxisstationen aus `tests/e2e/support/cv-parity-fixture.ts` und das Testfoto aus `tests/e2e/support/cv-pdf-photo-crop.ts`. Die hier verwendeten Eingaben setzen `cv.design.sidebarPct` auf `0.30` und die Fotoplatzierung auf automatisch. Die erste Wiederverwendung mit dem Testwert `22` wurde wegen des erwarteten Bruchteils vom DOCX-Renderer abgewiesen.

Für die weitere Annäherung zuerst Kolumne Standard prüfen. Im App-PDF endet Seite 1 nach Praxisstation 05, in Writer nach Praxisstation 02. Zu prüfen sind die Höhe des ersten Kopfbereichs sowie Typografie und Abstände der Einträge. Die Word-Desktop-Abnahme und die reguläre DOCX-Freigabe stehen aus.

[#194](https://github.com/modebrecht/cv-cover-charm/issues/194) · [#195](https://github.com/modebrecht/cv-cover-charm/issues/195)
