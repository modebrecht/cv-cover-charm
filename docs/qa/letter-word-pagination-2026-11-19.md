# Zwei Seiten im regulären DOCX-Briefexport

## Nachprüfung vom 21.11.2026

Im Modern-Anschreiben mit Kontaktkopf endete Seite 1 in LibreOffice beim 20. Satz. In Web und App-PDF begann der vierte Absatz geschlossen auf Seite 2. Der reguläre DOCX-Export schützt jetzt kurze mittlere Absätze mit Words Absatzoption `w:keepLines`. Ein langer Absatz kann über mehrere Seiten fliessen. Für den Kontaktkopf mit sieben Absätzen setzt der Export das Attribut bei fünf Absätzen.

| Geprüfter Download | Web und App-PDF | Writer vor der Korrektur | Writer nach der Korrektur |
| --- | --- | --- | --- |
| Einzelbrief mit kompaktem Kopf | 18 / 20 Sätze | 18 / 20 Sätze | 18 / 20 Sätze |
| Einzelbrief mit Kontaktkopf | 18 / 20 Sätze | 20 / 18 Sätze | 18 / 20 Sätze |
| Brief im Gesamtdossier mit Kontaktkopf | 18 / 20 Sätze | 20 / 18 Sätze | 18 / 20 Sätze |

Der reguläre Gesamtdossier-Download ergibt vier Seiten in Writer. Der Brief liegt auf Seiten 2 und 3. Er enthält alle 38 Sätze in der erwarteten Reihenfolge sowie Empfänger, Betreff, Abschluss und die drei Beilagen auf den vorgesehenen Seiten.

Mit LibreOffice 25.8.7.3 wurden beide Einzelbriefe und das Gesamtdossier je zweimal gespeichert und wieder geöffnet. Alle zwölf geprüften Briefseitenpaare sind pixelidentisch zu den jeweiligen Ausgangs-DOCX-Renderings. Microsoft Word Desktop steht für diese Kontaktkopf-Abnahme aus.

## Prüfstand vom 19.11.2026

Am 19.11.2026 für [#206](https://github.com/modebrecht/cv-cover-charm/issues/206)
geprüft. Zwei gespeicherte Modern/Sans-Anschreiben mit längerem Empfänger,
mehrzeiligem Betreff, 38 nummerierten Sätzen und drei Beilagen wurden über die
regulären App-Menüs als PDF und DOCX heruntergeladen.

Der Browser reserviert für das kompakte, gezeichnete Fussband 4 mm und
zusätzlich 1 mm Seitenrand. Der DOCX-Brief hatte dafür 26,7 mm reserviert,
einschliesslich der Reserve für eine Textfusszeile. In LibreOffice führte
das bei beiden Fällen zu einer dritten Seite. Die DOCX-Seitengeometrie
übernimmt bei einem kompakten Fussband und leeren nativen Fusszeilen
jetzt den unteren Rand aus der Briefgeometrie. Die Distanz der leeren
Word-Fusszeile beträgt 0 mm. Der Paketvergleich zeigt in beiden Fällen
ausschliesslich die geänderten Werte in `w:pgMar`.

| Briefprofil                       | Web und App-PDF | DOCX vor der Korrektur in Writer | DOCX danach in Writer | Satzmarken S. 1 / S. 2 in App-PDF und Writer |
| --------------------------------- | --------------: | -------------------------------: | --------------------: | -------------------------------------------- |
| Kompakter Kopf, ein langer Absatz |        2 Seiten |                         3 Seiten |              2 Seiten | App 18 / 20, Writer 18 / 20                  |
| Kontaktkopf, sieben Absätze       |        2 Seiten |                         3 Seiten |              2 Seiten | App 18 / 20, Writer 20 / 18                  |

Die vollständigen Absätze und ihre Reihenfolge stimmen im App-PDF und in
beiden DOCX-Renderings. Empfänger und Betreff stehen auf Seite 1. Gruss,
Unterschrift und alle drei Beilagen stehen auf Seite 2. Der Kontaktfall im
regulären Gesamtdossier rendert ebenfalls vier Seiten in der Reihenfolge
Titelblatt, Brief 1, Brief 2, Lebenslauf.

Zwei tatsächliche Save/Reopen-Zyklen mit LibreOffice Writer Dev
26.8.0.0.alpha0 ergeben in den beiden Einzelbriefen **8/8 pixelgleiche
Seitenpaare** gegenüber der jeweiligen DOCX-Quelle. Der Paketvergleich
bestätigt die bereits am Ausgangsstand beobachtete Writer-Eigenheit. Beim
kompakten Kopf werden die Inhaltssteuerelemente entfernt. Beim Kontaktkopf
bleiben die Kontrollfelder im Briefkörper erhalten, während sich die
Kopfzeilenfelder ändern. Die visuelle Prüfung und der vollständige
Textvergleich bestehen für beide Speicherstände.
[Vorherige Writer-Analyse](lo-product-roundtrip-2026-11-15.md)

Die neuen Browserfälle verwenden den normalen JSON-Import, sichtbare
Editordruckseiten, den PDF-Preflight und beide regulären Downloadmenüs.
Der Filter lautet `two-page Modern letter preserves` in
[`playwright.preflight-core.config.ts`](../../tests/qa/playwright.preflight-core.config.ts).
Die Prüfergebnisse, PDFs und DOCX-Dateien befinden sich in den
`pdf-consent-evidence`-Artefakten von GitHub Actions.

## Korrektur am Tabelleneinfügepunkt im Briefeditor

Der vorherige `dossier-flow`-Lauf enthielt einen Fehler bei der
Tabelleneinfügung. Der gleiche sichtbare Fehler lässt sich gezielt auslösen,
wenn ein Absatz nach Fokusverlust normalisiert wird, die Browserauswahl an
den Editoranfang fällt und beim fokussierten Tabellenraster ein Resize
folgt. Der Editor aktualisiert den gemerkten Einfügepunkt nur bei aktivem
Editorfokus. Der neue Browserfall prüft Einfügen per Enter nach dem Resize,
die Absatzreihenfolge und den gespeicherten Zustand nach Neuladen.

Desktop-Word und die weitere Layoutmatrix bleiben als getrennte Nachweise
für #206 offen.
