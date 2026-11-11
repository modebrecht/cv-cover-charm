# Web/PDF-Abgleich mit zugeschnittenen Fotos

Teil von [#204](https://github.com/modebrecht/cv-cover-charm/issues/204).

Der Lauf verwendet die 39 aktiven Vorlagen mit ihren Standardlayouts. Pro
Vorlage werden Titelblatt, Brief und CV im Editor aufgenommen und über den
normalen Dialog als Gesamtdossier-PDF heruntergeladen. Ein asymmetrisches,
synthetisches PNG prüft Bildorientierung, Zoom und versetzten Ausschnitt.
Das Titelblatt behält seine vorlagenspezifische Rahmenform. Der CV verwendet
einen runden Rahmen und die automatische Fotoposition.

## Nachgewiesener Fehler

Die äusseren Titelblatt-Fotorahmen verwenden zwei scharfe CSS-Schatten. Im
Browser sind Abstand und Rahmen sichtbar. html2canvas lässt die Schatten im
PDF-Raster aus. Die Exportkopie setzt die beiden Ringe nun in ihrer bisherigen
Reihenfolge als absolut positionierte Ränder um. Bildbox und Ausschnitt
behalten ihre Geometrie. Das gilt auch für gerahmte freie Titelblattbilder.

| Fotoausschnitt | RGB-SSIM vorher | RGB-SSIM korrigiert |
| -------------- | --------------- | ------------------- |
| Modern         | 0,9419          | 0,9807              |
| Warm           | 0,9062          | 0,9786              |
| Edel           | 0,9107          | 0,9766              |

Die Vergleichsregion enthält das Foto und einen 3-Pixel-Saum für den äusseren
Rahmen. Beide Raster werden zuvor auf 794 × 1123 Pixel normiert.

## Prüfgrenzen und Nachweise

- Text und Schriftmetriken zwischen Editor und Export-DOM müssen übereinstimmen.
  Die maximale geometrische Abweichung beträgt 0,3 mm.
- Der Preflight muss den gewöhnlichen Download freigeben. Jede Referenz
  erwartet drei A4-Seiten und ein vorhandenes Titelblatt- und CV-Foto.
- Foto und Rahmen benötigen mindestens 0,95 RGB-SSIM nach einer Glättung von
  0,4 Pixeln (rund 0,11 mm), damit einzelne Rasterkanten nicht als fehlender
  Bildinhalt zählen. Unglättete Foto- und Seitenwerte unter 0,95 erhalten
  den Status REVIEW zur visuellen Prüfung. Fehlende Ausgaben,
  Browserfehler und verletzte Geometrie- oder Fotogrenzen ergeben FAIL.
- Der Workflow «Web PDF photo gallery» archiviert Eingabedaten, Quell-SHA,
  Editorbilder, echte PDFs, CSV- und JSON-Ergebnisse sowie Vergleichsbilder mit
  Web, PDF und Pixeldifferenz.

Auf dem Ausgangsstand `a371791` bestehen alle 39 Browserfälle und die 117 Seitenpaare ihre
Geometrie- und Bildgrenzen. Drei CV-Fotos bleiben als REVIEW ausgewiesen.
Terracotta und Studio 3 zeigen abweichende Rasterkanten am Kreisrand. Bei Neon
weicht zusätzlich die Hintergrundschattierung um das Foto sichtbar ab.

Langdossiers, frei platzierte Bilder an den Seitenrändern und gespiegelte
Sidebar-Varianten benötigen zusätzliche Fälle. Der Lauf ist auf die
beschriebenen Standardlayouts und Bildparameter begrenzt.

## Neon-Hintergrund: gezielte Korrektur am 11.11.2026

Die zusätzliche Neon-Abweichung ist reproduziert und behoben. Der
CSS-Hintergrund besteht aus einer Grundfarbe und zwei radialen Verläufen.
Der Browser setzt diese Ebenen zuerst zusammen und wendet danach die
Motiv-Deckkraft an. html2canvas wendet die Deckkraft dagegen auf die einzelnen
Hintergrundzeichnungen an; zudem verliert der Verlauf nach `transparent`
Farbsättigung. Zusammen erzeugt dies den sichtbaren Grau-/Violettstich.

Die Exportkopie rastert ausschliesslich den markierten Neon-Hintergrund vorab
auf einem transparenten Canvas. Grundfarbe und beide Verläufe werden in der
gleichen Reihenfolge zusammengesetzt. Jeder Verlauf endet bei seinem eigenen
RGB-Wert mit Alpha null. Positionen und Verlaufslänge teilen sich Editor und
Exporter über `src/lib/neon-sheet-background.ts`. Die bisherige Box und die
Deckkraft der übergeordneten Ebenen bleiben erhalten. Der Editor verwendet
weiterhin seine bisherigen CSS-Verläufe.

| Gezielter echter Neon-Download | Vorher | Korrigiert |
| --- | --- | --- |
| CV-Foto RGB-SSIM, roh | 0,941828 | 0,956843 |
| CV-Foto RGB-SSIM, geglättet | 0,951330 | 0,967342 |
| Maximale RGB-Kanalabweichung der Hintergrundproben | 43,04 | 1,08 |
| CV-Geometrieabweichung | 0 mm | 0 mm |

Die Web-Aufnahmen von Titelblatt, Brief und CV sind vor/nach der Änderung
pixelgleich. Der echte PDF-Download besteht alle drei Seitenprüfungen; Neon
wechselt damit von REVIEW zu PASS. Der Brief-RGB-SSIM steigt ebenfalls von
0,987844 auf 0,993500. Der Titelblatt-Export bleibt bei 0,986383.

Eine zusätzliche Regression misst zwei 5×5-Pixel-Farbproben in den oberen
Ecken der festen runden CV-Fotobox. Diese Stellen enthalten nur den
Hintergrund. Maximal 3 RGB-Stufen pro Kanal sind erlaubt. Der alte Neon-PDF
erhält damit ausdrücklich FAIL, der korrigierte PASS. Die bestehenden
Foto-/SSIM-/Geometrieschwellen bleiben unverändert; es wird kein
Hintergrundbereich aus dem Bildvergleich entfernt. Die Proben sind auf die
beschriebene Galerie-Fixture begrenzt.

Lokale Codeprüfungen: 1’530 Unit-Tests bestanden, Anwendungs- und
QA-TypeScript bestanden, gezieltes ESLint ohne Fehler und Prettier bestanden,
Produktionsbuild erfolgreich. Vollständiges ESLint ebenfalls ohne Fehler
(20 bestehende Warnungen). ESLint meldet weiterhin die bereits vorhandene
Fast-Refresh-Warnung bei `dossierSheetLayoutFor` in `DossierSheetBackground.tsx`.

Ein zusätzlicher lokaler Rasterdiagnoselauf mit eigener Grün-/Orange-Palette
prüft Motiv-Deckkraft 0 %, 65 % und 100 %. Die Hintergrundproben weichen dabei
um maximal 0, 2 bzw. 1 RGB-Stufen pro Kanal ab. Dieser Zusatzlauf untersucht
die tatsächliche html2canvas-Kopie, ist aber kein weiterer vollständiger
Dossier-Download und ersetzt die Galerie nicht.

Der anschliessende vollständige lokale Lauf besteht **39/39 Browserfälle**
ohne übersprungene oder instabile Fälle (rund 6,5 Minuten). Von **117
Seitenpaaren sind 115 PASS, 2 REVIEW und 0 FAIL**. Die maximale geometrische
Abweichung beträgt 0,004133 mm. Neon erreicht in diesem vollständigen Lauf
dieselben Messwerte wie im gezielten Lauf.

| Verbleibender REVIEW-Fall | Foto-RGB-SSIM roh | Geglättet |
| --- | --- | --- |
| Terracotta / CV | 0,930617 | 0,951322 |
| Studio 3 / CV | 0,948384 | 0,959431 |

Der Gesamtbericht bleibt deshalb REVIEW. Die beiden Kreisrandabweichungen
sind nicht durch die Neon-Korrektur behoben. Langdossiers, gespiegelte
Varianten, weitere historische Projekte und Speichern/Wiederöffnen in
Microsoft Desktop Word bleiben eigenständige offene Prüfungen.

Der Workflow «Web PDF photo gallery» erzeugt für den veröffentlichten Commit
erneut alle 39 Downloads, Hintergrundproben und Vergleichsbilder. Diese
CI-Artefakte enthalten den exakten Quell-SHA; die lokalen Werte oben wurden
auf dem Änderungskandidaten mit Basis `a371791` ermittelt. Der Workflow wird
nun auch bei Änderungen am gemeinsamen Neon-Hintergrund und am
`DossierSheetBackground` ausgelöst.
