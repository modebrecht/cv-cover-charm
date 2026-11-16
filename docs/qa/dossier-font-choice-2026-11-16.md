# Dossierschrift erreicht wieder den gestalteten Brief

Stand 16.11.2026 · [#199](https://github.com/modebrecht/cv-cover-charm/issues/199)
· Ausgangsstand `81b57436ae3177375d4f5458f198196a18d25f40`

Bei einem gestalteten Motivationsschreiben konnte eine Schriftänderung im CV
scheinbar gespeichert sein, während Briefvorschau und PDF weiterhin die alte
Schrift verwendeten. Der normale Modern-Ablauf reproduziert das: Nach Auswahl
von Sans stehen die gespeicherten CV-/Brief-Basisschriften auf `sans`, der Brief
behält jedoch den wirksamen `fontOverride: freundlich` und rendert Cabin.
Die Browserprüfung schlug vor der Korrektur an genau diesem Unterschied fehl.

## Änderung

Die bestehende CV-/Brief-Synchronisierung aktualisiert bei einer neuen
gemeinsamen Schriftwahl jetzt auch das wirksame Dokumentfeld gestalteter
Briefe. Bereits gespeicherte widersprüchliche konkrete Overrides werden beim
Abgleich repariert, auch wenn die beiden Basisschriftwerte schon übereinstimmen.
Der zweite Abgleich ist ohne weitere Änderung möglich.

Ein unveränderter Entwurf mit bewusst gewählter Vorlagentypografie
(`fontOverride: null`) behält diese Wahl. Schriftvorgaben einzelner Rollen,
etwa für Brieftext oder Datum, bleiben erhalten. Der bisherige eigenständige
Brief-Modus und die separate Titelblatt-Schriftwahl werden nicht umgebaut.
Die Produktänderung liegt ausschliesslich in `src/lib/dossier-font-sync.ts`.

## Prüfung und Nachweis

Die gezielten Regressionstests prüfen die tatsächlich wirksame Schriftwahl
nach Normalisierung, zusätzlich zu gespeicherten Basisschriftwerten:
Modern, Pastell und Klassisch mit erhaltenen Rollenschriften, unveränderte
Vorlagentypografie und Reparatur eines bereits gespeicherten Widerspruchs.
Die bestehenden Tests zur regulären Briefschrift und zu Vorlagenwechseln
bleiben erhalten. Der reguläre CI-Browserfall prüft jetzt sowohl Brief als
auch Modern.

Die zusätzliche opt-in Browsermatrix wählt alle acht angebotenen Schriften
über die sichtbaren Bedienelemente eines kurzen Modern-Dossiers. Jede Wahl
wird durch einen Wechsel von einer anderen Schrift ausgelöst. CV und Brief
werden über ihre bestehende Synchronisierung geprüft; die Titelblattwahl wird
separat über dessen vorhandenes Bedienelement gesetzt. Nach erneuter Navigation
werden alle drei Dokumente kontrolliert und über den normalen Dossierdialog
tatsächlich als PDF heruntergeladen.

Erfasst werden die gespeicherten Werte, CSS-Schriftwerte, die vom Browser am
Textbeispiel tatsächlich verwendeten Plattformschriften, alle sichtbaren
Textknoten und deren Zeilenboxen. Web und kanonische PDF-Ansicht müssen dieselben
Texte, Schriften und Zeilen behalten; Geometrietoleranz ist unverändert 0,3 mm.
Der reguläre PDF-Preflight muss ohne Override bestehen. Downloads dürfen die
gespeicherte Schriftwahl nicht verändern.

Die unabhängige PDF-Auswertung prüft drei A4-Seiten je Download und vergleicht
alle vollständigen Seitenbilder bei 96 dpi. RGB-SSIM unter 0,95 bleibt REVIEW;
keine Glättung, Maskierung oder nachträgliche Ausrichtung. Fehlende/fehlerhafte
Browserfälle oder Dateien ergeben INCOMPLETE, niemals einen Vollmatrix-PASS.
Eine einzelne erfolgreiche Vorprobe wurde ausdrücklich als unvollständig
ausgewiesen.

Die sichtbaren PDF-Glyphen stammen aus dem Browserraster. Die Fonts der
zusätzlichen unsichtbaren Textebene belegen deshalb nicht die sichtbare
Schriftauswahl. Der gestaltete Titelblatt-Export besitzt hier keine selektierbare
Textebene; die Brief-/CV-Textebene wird zusätzlich geprüft.

**Abschluss:** 8/8 Schrift-/Downloadabläufe und 3/3 reguläre Browserfälle
bestanden, jeweils ohne Retry, Skip oder instabilen Fall. Alle 1’535 Unit-Tests
in 289 Dateien bestehen im vollständigen isolierten Lauf. Ein paralleler
Vorlauf hatte einen Timeout im bestehenden 30-Sekunden-Test zur nativen
Importgrenze; der vollständige isolierte Wiederholungslauf besteht. App-/QA-
TypeScript, gezieltes ESLint, Prettier und Produktionsbuild bestehen.

Alle acht Downloads enthalten drei A4-Seiten. Die Web-/kanonischen Textknoten,
Schriften und Zeilenboxen stimmen überein; maximale gemessene Geometriedifferenz
ist 0 mm. Der vollständige Bildvergleich ergibt dennoch **6 PASS, 18 REVIEW,
0 FAIL**. Die Messung ist insgesamt **REVIEW**, keine pauschale visuelle Abnahme.

| Auswahl  | Tatsächliche Familie am Textbeispiel, alle drei Teile | RGB-SSIM Cover / Brief / CV |
| -------- | ----------------------------------------------------- | --------------------------- |
| Sans     | Liberation Sans                                       | 0,95331 / 0,94006 / 0,91880 |
| Serif    | Liberation Serif                                      | 0,94569 / 0,93490 / 0,91861 |
| Times    | Liberation Serif                                      | 0,94569 / 0,93490 / 0,91861 |
| Verdana  | DejaVu Sans                                           | 0,95915 / 0,94845 / 0,92611 |
| Cabin    | Cabin, lokale Webfont-Datei                           | 0,98229 / 0,97685 / 0,94449 |
| Schmal   | Liberation Sans                                       | 0,95331 / 0,94006 / 0,91880 |
| Maschine | Liberation Mono                                       | 0,92963 / 0,90653 / 0,87010 |
| Plakativ | Liberation Sans                                       | 0,95331 / 0,94006 / 0,91880 |

Die acht Auswahlwerte ergeben in dieser Umgebung fünf tatsächliche Familien.
Die PDF-Seiten von Sans/Schmal/Plakativ sind untereinander pixelgleich, ebenso
Serif/Times. Die 15 unterschiedlichen PDF-Seitenbilder wurden visuell geprüft;
ihre per Hash nachgewiesenen Duplikate decken alle 24 Seiten ab. Der Text bleibt
lesbar, ohne neue Seiten oder abgeschnittene Enden. Sichtbare vertikale
Glyphenversätze bleiben jedoch bestehen, besonders bei Maschine. Die Ursache
dieses Rasterbefunds ist noch nicht bestimmt; er wird nicht als ausschliesslich
harmlose Kantenglättung eingestuft.

[Zusammenfassung mit allen Messwerten und Hashes](dossier-font-choice-2026-11-16/summary.json) ·
[vollständige komprimierte Messdaten, Eingaben, Produktdiff und Laufprotokolle](dossier-font-choice-2026-11-16/report.json.gz)

Für den stärksten REVIEW sind die unveränderten vollständigen Seiten erhalten:
[Maschine-CV im Web](dossier-font-choice-2026-11-16/maschine-cv-web.png) und
[Maschine-CV aus dem echten PDF](dossier-font-choice-2026-11-16/maschine-cv-pdf.png).
Das sind Diagnosebelege, kein neues Benutzer-Prüfpaket.

**Nächster gezielter Schritt:** Den vertikalen Glyphenversatz am Maschine-CV
zwischen Web und echtem PDF isolieren. Mit dem erhaltenen Fixture und genau
dieser Schrift beginnen; keine erneute allgemeine Schrift-/Vorlageninventur,
keine weicheren Vergleichsschwellen. Die Korrektur der gespeicherten Schriftwahl
ist davon getrennt abgeschlossen.

## Reproduktion und Grenze

```sh
playwright test --config tests/qa/playwright.font-matrix.config.ts
python scripts/dossier_font_matrix_report.py
```

Voraussetzungen: der vorhandene gepinnte Playwright-Runner mit Chromium,
Anwendungsabhängigkeiten sowie PyMuPDF, Pillow, numpy und scikit-image.
Der Lauf zeichnet den Ausgangscommit und den vollständigen Produktdiff mit
SHA-256 auf. Die Ergebnisse beziehen sich auf genau diese Quellkombination.

Diese Prüfung gilt für kurze Modern-Dossiers in der benannten Linux-/Chromium-
Umgebung. Sie ist weder eine vollständige Font-/Gewichtsmatrix aller 39 Vorlagen
noch ein Nachweis für lange Texte, Windows-Substitutionen, DOCX oder Microsoft
Word. Die unveränderte DOCX-Schriftpolitik und ihre Freigabegrenzen gelten
weiterhin; die [stabile Writer-Gegenprobe](lo-stable-health-2026-11-16.md) bleibt
hier blockiert. Die zwei unabhängigen Foto-Kreisrand-REVIEWs sind kein Teil
dieser Schriftkorrektur.
