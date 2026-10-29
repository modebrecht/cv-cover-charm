# Release-Regression — Reparaturen vom 29. Oktober 2026

Ausgang: `d7ddbb1131b9c6aec24a9d688e48e228421bcb01`.
Geprüfter Produktbaum: `26b2d51668621b193c10e7ed9537f7d829e22fb0`.

## Reproduzierte Fehler und Änderungen

Der bisherige Dossier-Regressionslauf `40855651516` scheiterte in fünf
Browsergruppen: 12 Dossier-, vier Brief-, ein CV/PDF-, vier Responsive- und zehn
Fresh-Fälle. Die Ursachen wurden anhand der tatsächlichen Joblogs und lokal im
Browser geprüft.

- Beispieldaten und Dev Tools liegen im Bearbeitungsmenü. Die Tests verwenden
  jetzt diesen Menüpfad.
- Ein modales Downloadmenü macht andere Elemente für rollenbasierte Selektoren
  unsichtbar und für direkte Locator-Klicks inert. Der Responsive-Test schliesst
  es mit einem echten Mausklick auf die Triggerposition; der Brief-Test schliesst
  es vor weiterer Eingabe mit Escape. Keine erzwungenen Klicks.
- Briefkopf-Prüfungen erfassen die tatsächlich gerenderten Dokumentseiten, keine
  kurzzeitig vorhandenen Messseiten. Sie prüfen die relative Platzreserve,
  Überlappungsfreiheit, Vorschau-/Export-Gleichheit und Persistenz statt veralteter
  fester Millimeterwerte aus der früheren Randberechnung.
- Die Speicher-Isolationsprüfung verwendet einen gültigen Font im CV-Sentinel.
  Damit bleibt der gesamte andere Speicherpool bytegenau unverändert; eine
  vorgelagerte Legacy-Fontnormalisierung ist kein Teil dieses History-Tests.
- Das freie Foto des gespiegelten langen Vergleichs-CV überdeckte tatsächlich
  Titel bzw. Haupttext. Der positive Vergleich verwendet freie Koordinaten im
  leeren unteren Sidebar-Bereich. Ein eigener Negativfall hält die alte
  Kollision fest und verlangt weiterhin eine harte PDF-Sperre.

## Zwei tatsächliche Produktkorrekturen

1. Die PDF-Prüfung bezeichnet den betroffenen Dossierteil. Ein kollidierender CV
   wird als «Lebenslauf prüfen» gemeldet und nicht länger dem Brief zugeschrieben.
   Der Browserfall prüft den Hinweis, die PDF-Sperre und die verfügbare
   JSON-Sicherung.
2. Die Word-Verfügbarkeit verwendet den vorhandenen Eingangscheck des
   Source-Letter-Renderers. Formatierter Brieftext und bereits ausgeschlossene
   Brief-Einstellungen werden jetzt vor dem Download verständlich gemeldet.
   Vorher zeigte die Oberfläche «Bereit», bis derselbe Export intern scheiterte.
   Die bestehenden Renderer-Gates wurden dabei nicht erweitert oder entfernt.

Die native positive Prüfung lädt das freigegebene Modern/Sidebar/Sans-Projekt
über den echten Importdialog. Sie kontrolliert im heruntergeladenen DOCX
linksbündige Empfängerzeilen sowie Blocksatz in einfachem Brieftext und CV.
Ein zweiter wirklicher Download prüft das vollständige native Referenzdossier.
Der Rich-Text-Negativfall bestätigt die Word-Sperre, einen tatsächlichen
PDF-Download und unveränderten gespeicherten Brieftext.

Die früheren DOCX-Galerien erwarteten noch den alten Exporter und dessen
Freigabe aller Vorlagen. Sie prüfen jetzt die bestehende Word-Sperre für nicht
freigegebene Konfigurationen sowie die PDF-/JSON-Alternativen. Die echte positive
Word-Abnahme ist ausdrücklich auf die oben genannte native Komposition
begrenzt. Keine Tests wurden ausgelassen. Word-Unterstützung aller Vorlagen,
Rich-Text-Briefe und expliziter CV-Seite-2-Zuweisungen wird nicht behauptet.

## Lokale Abnahme

| Prüfung                                                             | Ergebnis                                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Allgemeine Dossierfälle                                             | 21 bestanden                                                          |
| Menü, Responsive, Sidebar, Briefkopf/-fuss, Bild und Vorlagen-Gates | 25 bestanden                                                          |
| Native Word-Verträge                                                | 5 bestanden; formatierter PDF-Download zusätzlich einzeln nachgeprüft |
| CV Vorschau/Standalone/Gesamtdossier/PDF und Kollision              | 11 bestanden                                                          |
| Brief-Galerie inklusive aller 39 Vorlagen                           | 7 bestanden                                                           |
| Einseite/Zweiseite/Automatik                                        | 10 + 9 + 16 bestanden                                                 |
| Summe eindeutiger Browserfälle                                      | 104 bestanden, keine Wiederholungen oder Auslassungen                 |
| Zusätzlicher Web-Galerie-Batch                                      | 4 Vorlagen, 12 Screenshots bestanden                                  |
| Unit-Suite                                                          | 1’445 bestanden, 279 Dateien, 27’175 Assertions                       |
| App-/QA-Typprüfung, Format, Lint und Build                          | bestanden; 21 bestehende Lint-Warnungen                               |

Die JSON-Zusammenfassung liegt in
`docs/qa/evidence/release-regression-repair-29okt.json`.
Die lokalen nativen Tests verwenden Liberation Sans; in dieser Laufzeit wurde
auch der installierte Helvetica-Fallback ausdrücklich auf das freigegebene
Liberation-Profil gesetzt. Ohne das passende Profil lehnt der Exporter die
Schrift weiterhin ab. Die GitHub-Läufe prüfen den gehosteten Runner separat.

## CI und verbleibende Abgrenzung

Dossier-Regression, Kontaktprüfung und Web-Galerie verwenden Ubuntu 24.04,
Bun 1.3.13 und isolierte Playwright-1.56.1-Werkzeuge. npm verändert nicht mehr den
zuvor mit Bun gesperrten Anwendungsbaum. Der Dossier-Lauf liefert je Browsergruppe
eine JSON-Ergebnisdatei als Artefakt.

Kontaktprüfung und Web-Galerie scheiterten zuvor vor Testbeginn, weil
`ubuntu-latest` inzwischen Ubuntu 26.04 wählt, das Playwright 1.55 nicht
unterstützt. Ausserdem enthielt eine historische Typografie-QA-Datei ein
beschädigtes, ungültiges UTF-8-Satzende; dieses wurde kenntlich gemacht, damit
der automatische Jekyll-Build die Dokumentation wieder lesen kann.

Die unabhängige Workflow-Reihe **DOCX Next Stable Sidebar** hatte bereits auf
dem Ausgangscommit weitere Fehler, unter anderem «Image size budget failed»
und abweichende native XML-Bytes in einem Vergleich unveränderter Dossierteile.
Diese experimentellen nativen Gates wurden nicht abgeschaltet oder als grün
umgedeutet. Ihre Ursachen und die vollständige Word-Abnahme bleiben ein
separater nächster Schwerpunkt. Der endgültige GitHub-Status ist an den Läufen
des veröffentlichten Commits zu prüfen; lokale Abnahme ersetzt ihn nicht.
