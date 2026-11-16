# PDF-Schriftgrundlinien folgen wieder den Browsermetriken

Stand 16.11.2026 · Ausgangsstand `3f7ffae6108fca0195f5ad1b4c44c8c13d9b8846`

Die sichtbare vertikale Verschiebung der Maschine-Schrift entsteht bereits
beim Rasterisieren. Die installierte `html2canvas-pro`-Version 2.3.0 zeichnet
alphabetischen Text bei `Range.top + fontSize`. Der tatsächliche Browserabstand
zur Grundlinie ist jedoch font- und grössenabhängig. Bei der geprüften 40-px-
Monospace-Schrift beträgt er 33 px: Die bisherige Ausgabe liegt 7 px zu tief.
Der Fehler ist unabhängig von PDF-Kodierung, Word oder LibreOffice.

## Korrektur und Grenze

Der gemeinsame PDF-Rasteradapter erzeugt eine eigene Export-Zeichenfläche.
Nur deren `fillText`-/`strokeText`-Aufrufe ersetzen für alphabetische Grundlinien
die angenommene Schriftgrösse durch den gemessenen Font-Ascent.
Die Kontrollproben umfassen dabei auch kleine und nicht ganzzahlige
Schriftgrössen; die gemessene Metrik entspricht jeweils der Browser-Range.

Die Methoden werden auch bei einem Fehler wieder entfernt. Kein Canvas-
Prototyp und keine Abhängigkeit wird verändert. Andere Grundlinienmodi und
Browser ohne die benötigte Fontmetrik behalten ihr bisheriges Verhalten.
Die Korrektur gilt für Titelblatt-/CV-Einzeldownload und die gemeinsamen
Brief-/Dossier-PDF-Pfade.

Quell-DOM und Exportkopie, Schriftfamilien, Schriftgrössen, Zeilenumbrüche,
Hintergründe und unsichtbare PDF-Textebene bleiben im bisherigen Ablauf.
Die Vorprüfungen laufen mit denselben Grenzen und ohne neue Ausnahmen.
Es gibt keinen festen pauschalen Pixelversatz und keinen vorlagenspezifischen
Offset. Die Änderungen an den beiden React-Routen betreffen ausschliesslich
Import und Rasteraufruf; JSX, Hooks und Benutzerbedienung bleiben gleich.

## Messung

Der Browser-Regressionsfall enthält acht kontrollierte Proben: grosse und
kleine Monospace-Schrift, kursiven Text, Sans, Cabin und nicht ganzzahlige
Cabin-Schriftgrössen. Der tatsächliche Abstand einer Inline-Grundlinienmarke
wird gegen die gemessene Fontmetrik geprüft. Die unbearbeiteten Browser-PNGs
werden anschliessend direkt mit den Canvas-Pixeln verglichen.

Die synthetische Kontrollfläche erhält dafür eine eigene Compositing-Ebene
(`translateZ(0)`). So zeichnet auch der Browser ihre Schrift in Graustufen
wie die Canvas-Zeichenfläche. Das ursprüngliche Browserbild wird vorher
separat gesichert; Elementgrösse, Position und Grundlinie müssen durch die
Ebene exakt gleich bleiben. Produktdokumente und ihre vollständigen
Web-/PDF-Vergleiche erhalten diese Testeinstellung nicht.

Alle acht korrigierten Proben sind **pixelgleich** mit ihrem Browserbild.
Die unberichtigte Kontrollausgabe weicht in den sieben Proben mit unterschiedlicher
Schriftgrösse und Grundlinienhöhe ab; die bereits korrekte 14-px-Cabin-Probe
bleibt unverändert. Das Quell-HTML bleibt bytegleich, und die zurückgegebene
Zeichenfläche besitzt keine verbliebenen Methodenüberschreibungen.

Die Unit-Tests prüfen Fill/Stroke einschliesslich Breitenlimit,
andere Grundlinien und fehlende Metriken sowie Kontextisolation und Aufräumen
bei fehlgeschlagenem Rendern. Der Browserfall lädt zusätzlich ein CV- und ein
Titelblatt-PDF über die normalen Einzelmenüs herunter und kontrolliert, dass
die gespeicherten Dokumente dabei unverändert bleiben.

Die vollständige Acht-Schriften-Matrix besteht mit **8/8 Browserabläufen**,
ohne Retry, Skip oder instabilen Fall. Alle 24 Web-Referenzbilder sind bytegleich
mit den Vorher-Bildern. Die kanonischen Texte und Zeilenboxen bleiben gleich;
die maximale gemessene Geometriedifferenz beträgt 0 mm.

| Abgegrenzte Messung      | Vorher                      | Nachher                     |
| ------------------------ | --------------------------- | --------------------------- |
| 24 Web-/PDF-Seitenpaare  | 6 PASS / 18 REVIEW / 0 FAIL | 23 PASS / 1 REVIEW / 0 FAIL |
| Maschine, Cover RGB-SSIM | 0,92963                     | 0,98998                     |
| Maschine, Brief RGB-SSIM | 0,90653                     | 0,98324                     |
| Maschine, CV RGB-SSIM    | 0,87010                     | 0,96004                     |
| Cabin, CV RGB-SSIM       | 0,94449 REVIEW              | 0,93980 REVIEW              |

Die beiden zusätzlichen Browserfälle bestehen ebenfalls. Die separat
heruntergeladenen Maschine-PDFs haben je eine A4-Seite: CV **0,96002** und
Titelblatt **0,98998** RGB-SSIM. Alle 15 unterschiedlichen vollständigen
PDF-Seitenbilder der Dossiermatrix wurden visuell geprüft; ihre pixelgleichen
Duplikate decken die 24 Seiten ab. Keine zusätzlichen Seiten, abgeschnittenen
Textenden oder verlorenen Inhalte wurden beobachtet.

Der abschliessende vollständige Lauf besteht mit **1’539 Unit-Tests in 290
Dateien**, App-/QA-TypeScript, gezieltem ESLint, Prettier und Produktionsbuild.

Die Schriftmatrix bleibt insgesamt **REVIEW**. Der Cabin-CV-Rohvergleich wird
leicht schlechter und bleibt offen; er wird nicht durch Glättung, Ausmaskieren,
nachträgliche Ausrichtung oder eine weichere Schwelle in PASS umgedeutet.
Die Grundlinien-Korrektur ist durch die isolierten Pixelproben belegt; die
verbleibenden Rasterunterschiede des vollständigen Cabin-CV sind ein eigener
Befund. Eine zusätzliche Rundungsvariante änderte die Seitenpixel nicht und
wird nicht als zweite Korrektur eingeführt.

[Messwerte und Hashes](pdf-text-baseline-2026-11-16/summary.json) ·
[vollständige komprimierte Eingaben, Produktdiffs und Prüfprotokolle](pdf-text-baseline-2026-11-16/report.json.gz)

[Maschine-CV nach der Korrektur](pdf-text-baseline-2026-11-16/maschine-cv-after.png) ·
[verbleibender Cabin-CV-REVIEW](pdf-text-baseline-2026-11-16/cabin-cv-after.png) ·
[40-px-Kontrollprobe vorher](pdf-text-baseline-2026-11-16/mono40-default.png) und
[nachher](pdf-text-baseline-2026-11-16/mono40-corrected.png).

## Dauerhafte Absicherung

Der neue Browserfall läuft in der bestehenden CI-Gruppe `cv-pdf-paint`.
Seine Messbilder und Einzel-PDFs werden zusammen mit dem Browserbericht
archiviert. Änderungen am gemeinsamen Rasteradapter, Dossier-PDF-Modul und
den beiden Einzel-PDF-Aufrufern starten jetzt auch die vorhandene
39-Vorlagen-Web/PDF-Galerie.

Die Prüfung ist auf die dokumentierte Chromium-/Linux-Umgebung begrenzt.
Sie erweitert keine native DOCX-Freigabe und ersetzt keine Desktop-Word-
Abnahme. Die [Korrektur der Schrift-Eigentümerschaft beim Laden](font-loading-ownership-2026-11-16.md)
ist getrennt auf `3f7ffae` gesichert; alle vier Workflows dieses Stands sind
erfolgreich. Bestehende Foto-Kreisrand-Befunde bleiben getrennte QA-Punkte.

## Reproduktion

### CI-Rastermodus: Diagnose nach `f5260c0`

Die erste CI-Ausführung besteht in sechs Workflows einschliesslich der
39-Vorlagen-Galerie, scheitert aber an der neuen isolierten Pixelprobe.
Das archivierte 40-px-Monospace-Browserbild enthält **1’915 farbige
Subpixel-Kantenpixel**; das Canvas-Bild enthält keine. Nach dem belegten
7-px-Grundlinienausgleich bleiben **1’987 unterschiedliche Pixel**,
bei identischen vertikalen Tintengrenzen (Zeile 10 bis 47). Der ursprüngliche
lokale Browser verwendete bereits Graustufen. Beide Läufe verwenden
Playwright 1.56.1 / Chromium 141.0.7390.37; ein Versionsfehler ist damit
nicht belegt.

Die Compositing-Ebene begrenzt die Pixelprobe auf denselben Rastermodus,
ohne ihre Null-Pixel-Schwelle zu ändern. Alle acht Proben und beide realen
Einzeldownloads bestehen lokal erneut. Auch TypeScript und ESLint bestehen.
Bei einem erneuten Fehler werden das korrigierte PNG und die jeweiligen
Messwerte jetzt vor der Assertion gesichert. Das Produkt bleibt auf dem
unveränderten Rasteradapter von `f5260c0`.

[Diagnosewerte, lokale Proben und Dateihashes](pdf-text-baseline-2026-11-16/raster-mode-check.json) ·
[ursprüngliches CI-Browserbild mit LCD-Kanten](pdf-text-baseline-2026-11-16/mono40-ci-lcd.png).

### Befehle

```sh
playwright test --config tests/qa/playwright.text-baseline.config.ts
playwright test --config tests/qa/playwright.font-matrix.config.ts
python scripts/dossier_font_matrix_report.py
```

Der Schriftmatrix-Lauf benötigt einen frischen Artefaktordner, den gepinnten
Browserrunner sowie die bisherigen PDF-/Bildvergleichsabhängigkeiten.
Die Quellcommit-/Produktdiff-Hashes werden mitgesichert. Teilmengen bleiben
ausdrücklich INCOMPLETE; die SSIM-Schwelle 0,95, vollständigen Seitenbilder
und unveränderten Geometrietoleranzen werden beibehalten.
