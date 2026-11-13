# Kreisränder und gespiegelte Langdossiers – 12.11.2026

Fortsetzung von [#204](https://github.com/modebrecht/cv-cover-charm/issues/204)
und der [39er-Fotogalerie](web-pdf-photo-gallery-2026-11-11.md).
Anwendungsbasis: `5593f7d865057e562291ded44b4ccf64463aa22b`.
Die Änderungen dieses Prüfpakets betreffen Tests, Auswertung und CI.

## Kreisränder: Befund und Grenze

Die normalen Dossier-Downloads von Terracotta, Studio 3 und Neon wurden erneut
ausgeführt: 3/3 Browserfälle bestanden. Die zwei bekannten Kreisfälle bleiben
**REVIEW**. Ihre Rohwerte wurden weder auf PASS gesetzt noch durch eine
andere SSIM-Schwelle ersetzt.

Zusätzlich wurden die sichtbare Browserseite und die normale html2canvas-
Exportkopie bei 288 dpi aufgenommen. Beide verwenden denselben asymmetrischen
Foto-Input, Zoom 1,35, Ausschnitt 30/70 und 0,3-mm-Rahmen. Die Diagnose liegt
vor der JPEG-Kompression und PDF-Wiederrasterung.

| Fall | Maximale Konturdifferenz | Schwerpunktdifferenz | Radiusdifferenz aus Fläche |
| --- | --- | --- | --- |
| Terracotta | 0,1764 mm | 0,0202 mm | 0,0927 mm |
| Studio 3 | 0,1972 mm | 0,1629 mm | 0,0032 mm |

Diese Konturdiagnose benutzt ausschliesslich die feste synthetische Fixture
auf ihrem flachen Hintergrund. Sie misst keine beliebigen Benutzerfotos.
Der vollständige Fotovergleich enthält weiterhin alle Pixel und den
Hintergrund. Die Konturmessung ersetzt diesen Vergleich nicht.

Die stärksten Differenzen liegen an Rahmen, Kreisbeschnitt und scharfen
Motivkanten. Die gemessenen Konturen bleiben unter der bestehenden
0,3-mm-Geometriegrenze. Ein diagnostisches Vorberechnen der Foto-Filter
verbessert den Vergleich praktisch nicht; die Flächenfarben stimmen bereits
bis auf einzelne RGB-Stufen. Eine native Canvas-Zeichnung von Kreis und Rahmen
verbessert die Roh-SSIM ebenfalls nur geringfügig. Daraus folgt keine ausreichend
belegte generische Exportkorrektur. Die Versuche wurden nicht in die
Anwendung übernommen. Die genaue Aufteilung zwischen Rasterrundung,
Kantenglättung und Rahmenzeichnung bleibt offen.

Die beiden REVIEW-Fälle sind damit gezielt untersucht, aber nicht als
allgemein pixelgleiche Kreisrahmen freigegeben. Der letzte vollständige
39er-Stand bleibt **115 PASS / 2 REVIEW / 0 FAIL**. Dieser Lauf wurde nicht
nochmals als vollständige 39er-Prüfung ausgegeben.

## Zwei neue Langdossiers mit echten Foto-Downloads

Die bestehende Langdossier-Suite enthält jetzt zwei zusätzliche Fälle. Beide
verwenden die rechte, gespiegelte Sidebar, eigene Ränder, einen 1-mm-CV-
Fussrand, 12 Praxiseinträge, 6 Schuleinträge und 14 Briefabsätze. Das Foto
steht automatisch in der gespiegelten Sidebar und nur auf der ersten CV-Seite.

| Fall | Foto | Brief | CV | Dossier | Foto-SSIM roh | Geglättet |
| --- | --- | --- | --- | --- | --- | --- |
| Terracotta | Kreis; Zoom 1,35; 30/70; Rahmen 0,3 mm | 4 Seiten | 3 Seiten | 8 Seiten | 0,9662 | 0,9749 |
| Studio 3 | Hochportrait; Zoom 1,65; 85/20; Rahmen 1,2 mm | 4 Seiten | 4 Seiten | 9 Seiten | 0,9672 | 0,9758 |

Beide Fälle sind PASS. Titelblatt, Brief und CV werden über den normalen
Gesamtdossier-Dialog heruntergeladen. Die Suite prüft vollständige
Inhaltssegmente, genau einmal vorhandene Marker, Reihenfolge und Zuordnung
zu physischen Seiten sowie gleiche Vorschau-/Export-Geometrie. Zusätzlich
wird das tatsächliche Foto auf PDF-Seite 6 gerendert und samt Rahmen sowie
3-Pixel-Saum mit der Vorschau verglichen. Die Grenzwerte bleiben 0,95 SSIM
und 0,4 Pixel Glättung; Rohwerte bleiben sichtbar. Insgesamt sind 17 PDF-Seiten
nachgewiesen. Vollständige Seitenübersichten und Fotodifferenzbilder werden
archiviert.

Die Auswertung verlangt drei erfolgreiche Standard-Galeriefälle, zwei
hochauflösende Kreisdiagnosen und zwei erfolgreiche Langdossiers, jeweils
ohne Retry, Skip oder instabilen Fall. Eine künstlich verschobene Kontur und
ein falscher Fotoausschnitt müssen die Gegenproben auslösen. Quellen-SHA,
Eingaben und PDF-Hashes werden mitgeführt; gemischte Quellen werden abgelehnt.

## Reproduktion und CI

Nach Einrichtung des gepinnten Playwright-Runners und Chromium:

```bash
playwright test --config tests/qa/playwright.web-pdf-gallery.config.ts -g ' (terracotta|studio3|neon)$'
playwright test --config tests/qa/playwright.photo-circle.config.ts
playwright test --config tests/qa/playwright.combined.config.ts -g 'photo-crop'
python scripts/photo_variant_report.py
```

Python-Abhängigkeiten sind im Workflow `photo-dossier-variants.yml` gepinnt.
Der neue Workflow archiviert Eingaben, Browserbilder, tatsächliche PDFs,
288-dpi-Raster, Seitenübersichten und Messwerte. Ein erfolgreicher Lauf
bedeutet hier keine allgemeine Aufhebung der Kreis-REVIEWs.

Lokal bestehen die 7 Browserfälle, die QA-TypeScript-Prüfung, gezieltes ESLint
und Prettier. Die tatsächlichen PDF-Fotos bestehen die bisherigen Grenzen.
Die Anwendungsdateien bleiben unverändert; es wird keine neue allgemeine
DOCX- oder Word-Freigabe behauptet.

Weitere Vorlagen, freie Fotos an Seitenrändern, zusätzliche historische
Projekte und Speichern/Wiederöffnen in Microsoft Desktop Word bleiben offen.

Die [anschliessende Randprüfung](free-photo-edges-2026-11-12.md) ergänzt fünf
gültige freie Fotopositionen und vier harte Sperrfälle. Die Grenzen dieser
Langdossier- und Kreisprüfung bleiben davon unberührt.

Die [Kodierungsdiagnose vom 13.11.2026](photo-circle-encoding-2026-11-13.md)
reproduziert die tatsächlichen PDF-Fotoausschnitte pixelgleich und schliesst
JPEG-Kompression als Hauptursache aus. Die beiden Kreis-REVIEWs bleiben offen.
