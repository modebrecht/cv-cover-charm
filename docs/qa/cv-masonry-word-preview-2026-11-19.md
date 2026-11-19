# Klassischer CV mit gemessenen Masonry-Spalten im DOCX-Prüfexport

Der Modern-Prüfexport mit klassischem CV-Layout übernimmt für
[#226](https://github.com/modebrecht/cv-cover-charm/issues/226) die tatsächlich
gemessene Spaltenzuordnung aus dem Web-Lebenslauf. Er liest die vollständigen
Rubrikgruppen aus dem Messbaum, bevor die Vorschau sie auf Druckseiten
verteilt. Jede gemessene Gruppe wird im DOCX-Modell derselben Gruppe anhand
ihrer Rubrikkennungen zugeordnet. Word erhält die Rubriken als bearbeitbare
Tabellenzellen. Bei widersprüchlichen Zuordnungen bricht der Prüfexport ab.

| Fall       | Vorschau und App-PDF                                | Bearbeitbares DOCX                                  | LibreOffice Writer                                                               |
| ---------- | --------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Einseitig  | Zwei kürzere Rubriken links, lange Rubrik rechts    | Dieselbe Zuordnung in den nativen Zellen            | Eine Seite, alle drei Rubriken vollständig                                       |
| Zweiseitig | Dieselben Spalten auf Seite 2, Referenz auf Seite 1 | Dieselbe Zuordnung und ein expliziter Seitenumbruch | Zwei Seiten, Referenz auf Seite 1 und alle drei Rubriken vollständig auf Seite 2 |

Im zweiten Fall steht die Referenz in der gespeicherten Rubrikreihenfolge
zwischen zwei Masonry-Rubriken, ist aber Seite 1 zugewiesen. Die Zuordnung zu
Druckseiten erfolgt im Modell vor der Gruppierung. Beide Fälle prüfen auch
den gespeicherten Entwurf vor und nach den Exporten.

Die Nachweise entstehen in `artifacts/smart-fit-29okt/` als
`pdf-masonry-page-{1,2}.pdf` und `word-masonry-page-{1,2}.docx`. Reproduziert
werden sie mit dem Filter `classic Masonry Word preview` in der
[Smart-Fit-Suite](../../tests/qa/playwright.smart-fit.config.ts).
LibreOffice Writer Dev 26.8.0.0.alpha0 wurde für Seitenzahl, Textvollständigkeit
und visuelle Spaltenlage eingesetzt.

Lokal bestanden 30 Smart-Fit-, 16 Zweiseiten- und 13 Einseiten-Browserfälle
sowie 1’549 Unit-Tests. Die beiden neuen Fälle bestanden auch mit Download und
Textkoordinatenprüfung der App-PDFs.

Offen sind der Abgleich in Microsoft Word Desktop und die Produktfreigabe
für Classic. Der reguläre Word-Download unterstützt Modern-CVs mit seitlicher
Spalte.
