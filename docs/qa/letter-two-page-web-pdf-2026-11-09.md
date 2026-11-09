# Zweiseitiges Anschreiben in Web und PDF

Teilprüfung zu [#206](https://github.com/modebrecht/cv-cover-charm/issues/206).
Der Fall verwendet die Vorlage «Brief», einen durchgehenden Absatz mit
nummerierten Textmarken, Empfänger, Betreff und zwei Beilagen. Der Browser
paginiert die gespeicherten Eingaben wie im normalen Editor.

| Seite | Kopfbereich                           | Briefinhalt                                             | Fussbereich    |
| ----- | ------------------------------------- | ------------------------------------------------------- | -------------- |
| 1     | Kontaktkopf mit eigener Kopfangabe    | Empfänger, Betreff, Anrede und erster Teil des Absatzes | Fussleiste     |
| 2     | Kompakter Kopf mit eigener Kopfangabe | Rest des Absatzes, Gruss und Unterschrift               | Beide Beilagen |

Der Test rekonstruiert den vollständigen Absatz aus beiden Editorseiten. Er
vergleicht Textreihenfolge und Verteilung mit dem Export-DOM sowie den
vollständigen Text jeder Seite mit dem erzeugten PDF. Er erwartet einen
bestandenen Preflight und lädt das PDF über das normale Downloadmenü.

Die beiden lokal gerenderten PDF-Seiten sind A4. Der visuelle Abgleich mit den
Editorseiten zeigt den gleichen Absatzwechsel, die vorgesehenen Kopfbereiche
und beide Beilagen im Fussbereich der zweiten Seite. Der Fall läuft in der
Gruppe `pdf-consent` der regulären Dossier-Regression. Die Artefakte enthalten
beide Editoransichten, das tatsächliche PDF und die Prüfdaten.

Speichern und Wiederöffnen in Desktop-Word bleibt eine separate Abnahme für
dieses Ticket.
