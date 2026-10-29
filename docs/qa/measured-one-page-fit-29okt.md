# «Alles auf 1 Seite» mit gemessenem Platzbedarf

Produktcommit: `6af2aebff0fb03f66dbef62b74a28cd34bfc723d`.
Produktbaum: `2125475451d8e85a4f3ce414cc545877f246a6ce`.
Branch: `work/29okt-measured-one-page`, Ausgangspunkt `e8c231e`.

## Problem und Verhalten

Der bisherige Knopf setzte die Typografie anhand geschätzter Textgewichte auf
Vorlagenwerte zurück, packte kurze Rubriken sofort in Spalten und aktivierte
vorübergehend besonders enge CSS-Abstände. Zwei Browsergegenproben zeigen den
Fehler bei bereits passenden klassischen und Sidebar-CVs: Die eingestellte
Textskala 1,04 wurde auf 0,85 zurückgesetzt, obwohl der CV eine Seite belegte.

Die explizite Einseitenaktion misst nun zunächst die aktuelle Typografie und
die normalen, auch nach Speichern und Export gültigen Abstände. Sie hebt nur
Seitenzuweisungen fliessender Rubriken auf. Reicht das aus, bleiben Schrift,
Breiten, Spaltenanordnung und sämtliche Inhalte erhalten. Bei einem bereits
passenden CV wird überhaupt kein neuer Zustand gespeichert.

Nur bei gemessenem Überlauf versucht das klassische Layout, geeignete kurze
Rubriken nebeneinander anzuordnen. Diese Anordnung bleibt nur bestehen, wenn
sie tatsächlich Platz spart. Erst danach wird ausgehend von den aktuellen
Schriftgrössen in Schritten von einem Prozent neu gemessen. Der erste passende
Schritt wird gespeichert. Der Knopf setzt keine Schrift auf Vorlagengrössen
zurück und verändert keine benutzerdefinierten Abstände.

Der Haupttext verwendet genau die Höhen und die Kapazität des vorhandenen
Paginators, einschliesslich gruppierter und Masonry-Zeilen und dessen
2-Pixel-Reserve. Die Sidebar wird zusätzlich an ihrer tatsächlichen Geometrie
auf Seite eins geprüft. Die Rechnung verwendet Dokumentkoordinaten unabhängig
vom Vorschauzoom. Schriftarten sind vor der Messung geladen.

Die Versuche bleiben im lokalen Canvas-Zustand. Nur ein erfolgreiches Ergebnis
wird in einem Schritt zurückgeschrieben; die Rubrikenreihenfolge bleibt dabei
erhalten. Bei zwischenzeitlichem Bearbeiten oder einer neueren Aktion werden
alte Versuche verworfen. Frei platzierte Inhalte auf Seite zwei werden nicht
verschoben oder durch unnötiges Schrumpfen kompensiert. Ein sichtbarer Hinweis
erklärt den verbleibenden Platzbedarf.

Die Suche begrenzt die Verkleinerung relativ zum Ausgangszustand auf 18 Prozent
für Fliesstext, 14 Prozent für Rubrikentitel und 10 Prozent für den Namen; die
vorhandene minimale Skala 0,75 bleibt gültig. Wenn kein Versuch passt, bleibt der
gespeicherte Ausgangszustand unverändert. Wiederholtes Klicken verkleinert einen
erfolglosen Versuch daher nicht immer weiter.

## Prüfung

| Prüfung                          | Ergebnis                                                  |
| -------------------------------- | --------------------------------------------------------- |
| Fehler vor Korrektur             | 2 erwartete Browserfehler bei bereits passendem CV        |
| Neue Einseiten-Browserfälle      | 10 bestanden, keine Wiederholungen oder Auslassungen      |
| Bisherige Automatik-Browserfälle | 16 bestanden, keine Wiederholungen oder Auslassungen      |
| Gesamte Unit-Suite               | 1’438 bestanden, 0 Fehler, 278 Dateien, 27’152 Assertions |
| App- und QA-Typprüfung           | bestanden                                                 |
| Gesamte Formatprüfung            | bestanden                                                 |
| Gesamtes ESLint                  | 0 Fehler, 21 bestehende Warnungen                         |
| Produktionsbuild                 | Exit 0                                                    |

Die neuen Fälle prüfen exakte Zustandserhaltung bei einem passenden CV mit
eigenen Schriftgrössen, Aufhebung von Seitenzuweisungen, bedarfsabhängiges
Masonry ohne Schriftänderung, kleine Überläufe, vorhandene Halbbreiten,
unmögliche Einseitenanpassung, freie Rubriken auf Seite zwei, die gespiegelte
Sidebar bei 390 × 844 Pixel und einen importierten CV mit tatsächlichem
DOCX-Download. Erfolgreiche Fälle prüfen erneutes Klicken beziehungsweise
Neuladen. Web- und kanonische Exportansicht werden auf Abschneiden geprüft.

Im klassischen Überlauffall mit sechs Erfahrungseinträgen genügt die Anordnung
der Kurzrubriken; die gespeicherte Typografie bleibt exakt gleich. Im
Sidebar-Grenzfall mit sieben Einträgen genügt Skala 0,99. Beide tatsächlich über
das Download-Menü erzeugten PDFs haben eine Seite und enthalten alle sechs
beziehungsweise sieben Erfahrungstitel. Die Canvas-Ansichten wurden angesehen.

Das zusätzlich heruntergeladene native CV-DOCX enthält 59 semantische
Feldvorkommen einschliesslich Kopf- und Fusszeilen. Eine unabhängige Paketprüfung
bestätigt gültige XML-Dateien und Beziehungen, genau einen A4-Dokumentabschnitt
und das gewöhnliche Foto ausserhalb eines Content Controls. Die 120 × 180
Originalpixel bleiben erhalten. Die gespeicherte Fotoquelle bleibt unverändert.
Dies prüft Paket und Inhalt, nicht die Pagination in Microsoft Word.

Die 16 Automatikfälle wurden erneut ausgeführt. Die frühere vollständige
Vorlagenmatrix und die historische Importmatrix wurden für diese Änderung
nicht erneut ausgeführt; ihre früheren Ergebnisse bleiben dem jeweiligen
alten Produktbaum zugeordnet.

## Reproduktion

Abhängigkeiten: Bun 1.3.13 mit `bun.lock`; Browserwerkzeuge separat mit
Playwright 1.56.1 und Chromium 141.0.7390.37 bereitstellen. Für die native
DOCX-Messung müssen Arial oder die vollständigen Liberation-Sans-Schnitte im
Browser verfügbar sein. Die vorhandene Produktprüfung der Schriften wurde
nicht geändert.

```sh
bun test tests/unit
node_modules/.bin/tsc --noEmit
node_modules/.bin/tsc --noEmit -p tests/qa/tsconfig.json
node_modules/.bin/prettier --check 'src/**/*.{ts,tsx,css}' 'tests/**/*.{ts,tsx}'
node_modules/.bin/eslint .
node_modules/.bin/vite build
playwright test --config tests/qa/playwright.one-page-fit.config.ts
playwright test --config tests/qa/playwright.smart-fit.config.ts
```

Protokolle, Browserberichte, Beispiel-PDFs, das native DOCX und die unabhängige
Paketprüfung liegen im Sicherungspaket. Browser-Screenshots dienen nur der
lokalen Sichtprüfung und sind nicht Teil der Sicherung. Der Stand ist lokal
committet; es wurde nichts gepusht oder veröffentlicht.
