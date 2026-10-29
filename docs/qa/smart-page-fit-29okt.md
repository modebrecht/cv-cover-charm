# Intelligente Seitenanpassung mit Sidebar

Ein kurzer, künstlich auf zwei Seiten verteilter Modern-CV lässt sich mit
«Automatisch: 1–2 Seiten» wieder auf eine Seite bringen. Vor der Korrektur blieb
er auf zwei Seiten, obwohl Haupttext und Sidebar gemeinsam Platz hatten.

Geprüfter Produktcommit: `a30f6d1399dfff637c18ff5b9ebf713b8cd4d559`.
Produktbaum: `9d5b2999ce4c3d11c108c4677b2cf1454094fde3`.
Arbeitsbranch: `work/29okt-smart-page-fit`. Ausgangspunkt: `b6b8994`.

## Ursache und Korrektur

Der Entscheider verlangte für jede belegte Rubrik einen Höhenwert aus dem
Haupttext. Sidebar-Rubriken kommen in diesem Messbaum nicht vor. Fehlende Werte
führten deshalb beim bereits zweiseitigen CV pauschal zur Entscheidung für zwei
Seiten. Der Browsergegenbeweis ist im Prüfpaket als fehlgeschlagener Ausgangslauf
gesichert.

Die Seitenanpassung prüft nun beide Bereiche getrennt. Während der automatischen
Aktion entsteht eine unsichtbare Messfassung der vollständigen Sidebar auf der
Geometrie der ersten Seite. Sie enthält auch Rubriken, die derzeit Seite zwei
zugeordnet sind, und ein vorhandenes automatisches Foto. Sie verwendet dieselben
CSS-Messregeln wie die Vorschau. Die Rubriken werden dabei bereits in der vollen
Breite gemessen, die das Ergebnis der Aktion verwendet.

Erst wenn diese Sidebar mit zehn Prozent Reserve passt, darf der Entscheider
ihre Rubriken aus der Rechnung für die Hauptspalte ausnehmen. Auch die Hauptspalte
behält die bestehende Platzreserve. Fehlende oder ungültige Messungen ergeben
weiterhin zwei Seiten. Eine frei auf Seite zwei platzierte Rubrik hat Vorrang.

Die zusätzliche Messfassung existiert ausschliesslich während der Aktion und
wird danach entfernt. Sie wird nicht in die Exportansicht aufgenommen. Die
Aktion schreibt die vorhandenen Layoutwerte zurück; Text, Fotoquelle und
Typografie bleiben erhalten. Die bestehenden Regeln für die Verteilung auf zwei
Seiten und für klassische Masonry-Rubriken werden nicht erweitert.

## Abnahme am sauberen Produktcommit

| Prüfung                               | Ergebnis                                                   |
| ------------------------------------- | ---------------------------------------------------------- |
| Gesamte Unit-Suite                    | 1’438 bestanden, 0 Fehler, 278 Dateien                     |
| Neue Browser-Suite                    | 16 bestanden, 0 Fehler, 0 Wiederholungen oder Auslassungen |
| Bisherige DOCX-Kontrollen nach Import | 3 bestanden, bytegleich zum 28. Oktober                    |
| App- und QA-Typprüfung                | bestanden                                                  |
| Gesamte Formatprüfung                 | bestanden                                                  |
| Gesamtes ESLint                       | 0 Fehler, 21 bestehende Warnungen                          |
| Produktionsbuild                      | Exit 0, aktuelle Ausgabe erzeugt                           |

Die 16 Browserfälle decken linke und rechte Sidebar, Desktop und 390 × 844 Pixel,
erneutes Anklicken und Neuladen, lange Haupttexte und Sidebar-Inhalte, eigene
Sidebar-Rubriken, zuvor halbbreite Rubriken, gespeicherte Seitenränder,
automatische Fotos, freie Platzierung und den Standard-CV ab. Der Web- und der
kanonische Exportbaum werden auf Text, Seitenzahl und Abschneiden geprüft.
Die zwei tatsächlich heruntergeladenen Web-PDFs haben jeweils eine A4-Seite.

Zwei weitere Downloads innerhalb derselben Suite verwenden ein vollständig
importiertes Prüfdossier und den normalen CV-DOCX-Menüeintrag. Beide Pakete sind
gültig und enthalten ausschliesslich den CV. Die unabhängige Paketprüfung
bestätigt je 59 Feldvorkommen einschliesslich der Kopf- und Fusszeilen; links und
rechts stimmen Feldzuordnungen und Text überein. Das Foto liegt als gewöhnliches
Bild ausserhalb eines Content Controls. Seine ursprünglichen 120 × 180 Pixel
bleiben nach der bestehenden PNG-Neucodierung exakt erhalten. Die gespeicherte
Fotoquelle im Dossier bleibt bytegleich.

Die drei bisherigen Gesamt-DOCX-Kontrollen wurden zusätzlich erneut über die
Import-/Downloadoberfläche ausgeführt. Basis, Spiegelung und eingebetteter
Legacy-Brief-Chrome sind gegenüber dem gespeicherten Nachweispaket vom 28. Oktober bytegleich. Die neue Seitenanpassung verändert diese unveränderten
Exporte somit nicht.

## Grenzen und offene Arbeit

Die zwei neuen CV-DOCX rendern in LibreOfficeDev 26.8 alpha0 auf je eine Seite.
Alle Seiten wurden angesehen; der Referenz-Beruf steht dort auf einer Zeile.
Der bereits bekannte gespiegelte Fotoversatz bleibt jedoch vorhanden: Im XML
steht die linke Fotokante bei 155 mm, im LibreOffice-PDF ungefähr bei 111 mm.
Die Kontaktköpfe sind in beiden PDFs vorhanden. Das ist keine Word-Abnahme und
keine Begründung für eine allgemeine Änderung am Fotoexport.

Desktop-Word ist hier weiterhin nicht zugänglich. Der gezielte offene Prüffall
ist unverändert das gespiegelte Original-DOCX vom 28. Oktober. Auch die frühere
eigene Word-Abnahme des Referenzumbruchs bleibt separat. Die bereits akzeptierte
gewöhnliche Fotobewegung wird nicht erneut aufgerollt.

Weitere sinnvolle lokale Arbeit ist die Messzuordnung bereits kompakter
Standard-/Masonry-Rubriken: Der bestehende Haupttext-Messer ordnet gepackte Zeilen
teilweise nur zusammengefasst zu; die Verteilung nutzt dann weiterhin ihren
stabilen Schätz-Fallback. Diese Fortsetzung korrigiert ausschliesslich den
reproduzierten Sidebar-Entscheidungsfehler. Eine neue vollständige
39-Vorlagenmatrix wird aus diesen 19 Browserfällen nicht abgeleitet.

## Reproduktion

Abhängigkeiten mit Bun 1.3.13 gemäss `bun.lock` installieren. Browserwerkzeuge wie
in `.github/workflows/dossier-import-recovery.yml` mit Playwright 1.56.1 und
Chromium 141.0.7390.37 bereitstellen. Für die DOCX-Messung müssen Arial oder die
vollständigen Liberation-Sans-Schnitte im Browser verfügbar sein. Hier wurden
die vorhandenen Liberation-Sans-Dateien des Dokument-Runtimes registriert; die
Schrift-Prüfung des Produkts blieb unverändert.

```sh
playwright test --config tests/qa/playwright.smart-fit.config.ts
playwright test --config tests/qa/playwright.historical-import.config.ts --grep 'docx after import'
python scripts/smart_fit_docx_qa.py
```

Kompakte Messwerte stehen in `docs/qa/evidence/smart-page-fit-29okt.json`.
Das neue Sicherungspaket enthält den Delta-Bundle ab `881b96c`, die Prüfberichte,
die tatsächlichen Downloads und die Wiederherstellungsanleitung. Die vorhandene
vollständige Basissicherung bleibt erforderlich. Nichts gepusht oder veröffentlicht.
