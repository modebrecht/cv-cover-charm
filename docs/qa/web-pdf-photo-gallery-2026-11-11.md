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

Im lokalen Lauf bestehen alle 39 Browserfälle und die 117 Seitenpaare ihre
Geometrie- und Bildgrenzen. Drei CV-Fotos bleiben als REVIEW ausgewiesen.
Terracotta und Studio 3 zeigen abweichende Rasterkanten am Kreisrand. Bei Neon
weicht zusätzlich die Hintergrundschattierung um das Foto sichtbar ab.

Langdossiers, frei platzierte Bilder an den Seitenrändern und gespiegelte
Sidebar-Varianten benötigen zusätzliche Fälle. Der Lauf ist auf die
beschriebenen Standardlayouts und Bildparameter begrenzt.
