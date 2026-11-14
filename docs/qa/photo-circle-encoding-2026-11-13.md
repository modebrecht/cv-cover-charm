# Kreisrand-REVIEWs: JPEG als Hauptursache ausgeschlossen

Stand 13.11.2026 · Anwendungsbasis `3a996d837fab5d67bcf51d44c03abe5a6df08674`

Diese Prüfung ergänzt die [Konturdiagnose und Langdossiers](photo-circles-long-dossiers-2026-11-12.md).
Die Anwendung bleibt unverändert. Terracotta und Studio 3 bleiben im normalen
Export **REVIEW**; die Untersuchung erteilt keine neue Layoutfreigabe.

## Ergebnis

Aus derselben 288-dpi-html2canvas-Aufnahme entstehen drei diagnostische
Einseiten-PDFs: PNG, JPEG mit der normalen Qualität 0,94 und JPEG mit Qualität 1.
Alle Bilder liegen unverändert bei 0/0 auf 210 × 297 mm. Die PDFs werden mit
demselben Verfahren wie die Galerie bei 96 dpi gerendert und gegen deren
ursprüngliche sichtbare Browseraufnahme verglichen. Die Browseraufnahme wird
nicht aus dem 288-dpi-Diagnosebild abgeleitet.

| Vorlage | Normaler PDF-Download | Verlustfreies PNG-PDF | JPEG Qualität 1 |
| --- | --- | --- | --- |
| Terracotta | 0,93062 | 0,93493 | 0,93432 |
| Studio 3 | 0,94838 | 0,95029 | 0,95009 |

Die Tabelle zeigt die vollständige rohe RGB-SSIM des Fotos samt Rahmen und
3-Pixel-Saum. Keine Pixel werden maskiert. Die Grenze bleibt 0,95. Die
zusätzlich protokollierte Glättung von 0,4 Pixeln bleibt ebenfalls unverändert.

Die Fotoausschnitte der diagnostischen JPEG-0,94-PDFs sind für beide Vorlagen
**pixelgleich mit den tatsächlichen normalen Dossier-Downloads**. Damit ist
für diese Ausschnitte nachgewiesen, dass die isolierte Diagnose denselben
Raster- und PDF-Abbildungsweg reproduziert.

Das Entfernen der JPEG-Verluste beseitigt Terracottas Abweichung nicht. Studio 3
überschreitet die Grenze verlustfrei nur knapp. JPEG Qualität 1 verbessert
den Rohwert ähnlich wenig und vergrössert die diagnostischen Einseiten-PDFs
von 519’526 auf 1’129’475 Bytes beziehungsweise von 547’573 auf 1’191’811 Bytes.
Diese Grössen betreffen nur die jeweilige Rasterseite, keine vollständigen
Dossiers. Die günstige PNG-Grösse der synthetischen Farbflächen erlaubt keine
allgemeine Aussage über Dossiers mit echten Fotografien.

Schon vor der JPEG-Kompression beträgt die rohe SSIM zwischen der direkten
Browseraufnahme und html2canvas bei 288 dpi rund 0,94259 für Terracotta und
0,94223 für Studio 3. Die bekannte Konturdifferenz bleibt unter 0,3 mm. Die
Restabweichung entsteht damit wesentlich vor der verlustbehafteten Kodierung.
Die Diagnose trennt noch nicht zuverlässig zwischen den einzelnen Beiträgen
von Beschnitt, Rahmenpfad, Kantenglättung und Subpixelpositionierung.

Eine generelle Änderung von Qualität, Bildformat oder Renderfaktor wäre aus
diesem Befund keine belegte Korrektur für beide Fälle. Sie wird nicht in die
Anwendung übernommen. Die beiden REVIEWs bleiben sichtbar; wiederholte
Kompressionsversuche sind ohne neue Ursache kein sinnvoller nächster Schritt.

## Reproduktion und Absicherung

```sh
playwright test --config tests/qa/playwright.web-pdf-gallery.config.ts -g ' (terracotta|studio3|neon)$'
playwright test --config tests/qa/playwright.photo-circle.config.ts
python scripts/photo_circle_encoding_report.py
```

Lokal: 3/3 echte Dossier-Downloads und 2/2 erweiterte Kreisdiagnosen bestanden,
ohne Retry oder Skip. QA-TypeScript, gezieltes ESLint und Prettier bestehen.
Dies ist kein erneuter vollständiger 39er-Lauf. Der letzte vollständige
Galeriestand bleibt **115 PASS / 2 REVIEW / 0 FAIL**.

Der Report verlangt zwei erfolgreiche Browserdiagnosen, dieselbe Quellen-SHA,
unveränderte Anwendungsdateien und pixelgleiche JPEG-0,94-Rekompositionen.
Ein um zwölf Pixel verschobener Fotoausschnitt muss bei allen sechs Varianten
unter der unveränderten SSIM-Grenze liegen. Der Bericht enthält Quellenstand,
Dateihashes, tatsächliche Renderversionen und Dateigrössen. Die bestehende
Foto-CI führt ihn zusätzlich zu den Kontur-, Langdossier- und Randprüfungen aus
und archiviert alle Varianten sowie Vergleichsbilder.

Die historische Wiederherstellung ist im [abgeschlossenen repräsentativen Prüfblock](historical-restore-release-gate-2026-11-13.md)
nachgewiesen. Speichern und Wiederöffnen in Microsoft Desktop Word bleiben
eine separate, hier mangels Microsoft Word nicht ausführbare Abnahme.

Die [anschliessende Rahmen-/Beschnittdiagnose vom 14.11.](photo-circle-isolation-2026-11-14.md)
schliesst diesen gezielten Untersuchungsblock ab. Keine der geprüften
Ersatzzeichnungen rechtfertigt eine Anwendungskorrektur für beide Vorlagen;
die zwei optischen REVIEWs bleiben offen. Nächste praktische Abnahme: Desktop Word.
