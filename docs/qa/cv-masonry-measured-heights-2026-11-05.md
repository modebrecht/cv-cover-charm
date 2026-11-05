# CV-Masonry: gemessene Rubrikhöhen

Fortsetzung von [#226](https://github.com/modebrecht/cv-cover-charm/issues/226),
auf `dev` ab `8fc2a745b8513d0328cafbb245af76d53c4f1af3`.

## Verhalten

Drei halbbreite Masonry-Rubriken mit gleich vielen Einträgen wurden bislang
links/rechts/links verteilt, auch wenn der erste Text sehr lang und der zweite
kurz war. Der dritte Block verlängerte dadurch die bereits höhere linke Spalte.
Die Zuordnung verwendet nun die tatsächlichen Höhen der vollständigen Rubriken
im vorhandenen Messbaum. Der nächste Block kommt in die kürzere Spalte;
Gleichstand beginnt weiterhin links. Bis alle Rubriken einer Gruppe gemessen
sind, bleibt die bisherige Schätzung anhand der Zeilenzahl der Startwert.

Der bestehende ResizeObserver erfasst dafür auch einzelne Masonry-Rubriken.
Bei einer neuen Spaltenzuordnung werden die beobachteten DOM-Knoten neu gebunden;
sonst könnten abgehängte Knoten die gültigen Messwerte wieder verdrängen.
Textänderungen werden neu gemessen, auch wenn die Gesamthöhe der Gruppe gleich
bleibt. Die Messung verwendet Dokumentkoordinaten unabhängig vom Vorschauzoom.

Die automatische Zuordnung betrifft den klassischen Dokumentfluss mit halber
Rubrikbreite und aktivem Masonry. Ganze Rubriken bleiben in Quellreihenfolge
innerhalb ihrer gewählten Spalte. Die Änderung schreibt weder Daten noch
Typografie, Seitenzuordnungen oder freie Positionen zurück.

## Nachweis

Der neue Desktop-Browserfall wurde mit unverändertem Produktcode aus `8fc2a74`
ausgeführt: Er scheitert daran, dass die dritte Rubrik weiterhin links steht.
Mit der Korrektur bestehen derselbe Fall und ein zweiter Fall auf Seite 2 bei
390 × 844 Pixeln, mit einer frei auf Seite 1 platzierten Referenz.

Beide Fälle prüfen den sichtbaren und den kanonischen Exportbaum auf vollständigen
Text, Seitenzahl und Abschneiden. Die drei Rubriken stehen links/rechts/rechts;
die beiden rechten Blöcke überlappen sich nicht. Die gemessene maximale
Spaltenhöhe sinkt im Test um die Höhe des dritten Blocks. Die tatsächlichen
PDF-Downloads haben eine bzw. zwei Seiten; ihre Textkoordinaten bestätigen
dieselbe Spaltenzuordnung. Der einseitige PDF-Download wurde zusätzlich gerendert
und visuell geprüft.

Ein anschliessendes Kürzen des ersten Textes über das echte Formular verteilt die
Rubriken wieder links/rechts/links. Der vollständig gespeicherte Zustand ändert
sich dabei ausschliesslich um diesen Text und bleibt nach Neuladen erhalten.
Die frei platzierte Referenz und alle Layouteinstellungen bleiben erhalten.

| Prüfung                                         | Ergebnis                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Gesamte Unit-Suite                              | 1’522 bestanden, 0 Fehler, 287 Dateien                                        |
| Automatische Seitenanpassung                    | 27 bestanden, einschliesslich 2 neuer Masonry-Fälle                           |
| Zweiseitenanpassung                             | 16 bestanden                                                                  |
| Einseitenanpassung                              | 13 eindeutige Fälle bestanden; ein unterbrochener Fall gezielt erneut geprüft |
| App- und QA-Typprüfung                          | bestanden                                                                     |
| ESLint und Prettier der geänderten Quelldateien | bestanden                                                                     |
| Produktionsbuild                                | bestanden                                                                     |

Der erste lokale Einseitenlauf hatte 12 bestandene Fälle und einen durch eine
Navigation beim Start unterbrochenen Fall. Währenddessen lief parallel die
Buildprüfung; sie ist eine mögliche Ursache des Neuladens. Der betroffene Fall
wurde danach ohne Build
wiederholt und bestand. Keine automatische Testwiederholung war konfiguriert.
Die neuen Fälle wurden nach der letzten Verschärfung der Zustandsprüfung erneut
mit 2/2 bestanden ausgeführt.

Die bestehenden Browserfälle decken kurze/lange CVs, Sidebar links/rechts,
Desktop/Mobil, freie Platzierung sowie native DOCX-Kontrollen ab. Die neuen
Messprotokolle und Downloads entstehen unter
`artifacts/smart-fit-29okt/measured-masonry-page-{1,2}.{json,pdf}` und werden vom
vorhandenen Workflow `CV measured page fit` archiviert.

## Grenze und nächste Arbeit

Web und PDF verwenden dieselbe gemessene Zuordnung. Der native klassische
DOCX-Prüfkandidat in `composeCvReadingColumns` verwendet weiterhin semantische
Zeilenschätzungen und kann bei unterschiedlich langen Texten andere Spalten
bilden. Sein Kommentar benennt diese Abweichung ausdrücklich. Die produktive
Word-Quelle unterstützt weiterhin Modern mit Sidebar; ein klassischer Masonry-CV
wird durch die vorhandene Quellprüfung abgelehnt. Es gibt daher keinen neu
freigegebenen Word-Export für dieses Layout.

#226 bleibt teilweise offen: Die gemessene klassische Masonry-Lückenfüllung ist
umgesetzt und geprüft. Eine native Word-Komposition mit derselben Zuordnung und
die Desktop-Word-Abnahme sind weiterhin ausstehend. Auch der bereits vorhandene
zweiseitige Modern-Word-Prüfexport aus #205 benötigt seine eigene
Desktop-Word-Abnahme. Dieser Stand schliesst keines dieser Issues pauschal ab.
