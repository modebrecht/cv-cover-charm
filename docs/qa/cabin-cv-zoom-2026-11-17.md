# Cabin-CV: Schrift im PDF mit der tatsächlich verwendeten Zoom-Grösse zeichnen

Stand 17.11.2026, Ausgangsstand `26ab4acf34115563500f62dd1c9674a6c3ad88a8`.

Der offene Modern-/Cabin-CV-Befund ist im begrenzten kanonischen Fall behoben:
Der unveränderte vollständige RGB-Vergleich steigt von **0,939804 REVIEW auf
0,965618 PASS**. Die Acht-Schriften-Matrix besteht mit **24/24 Seitenpaaren
PASS**, unveränderten Webbildern und 0 mm Text-/Zeilenbox-Geometriedifferenz.
Das ist keine Freigabe aller langen Dossiers oder von Microsoft Desktop Word.

## Belegte Ursache

Der erste erneute Lauf reproduzierte den alten CV-Wert exakt. Bereits die
unmittelbare Export-Zeichenfläche erreichte nur 0,940488 gegenüber dem Webbild;
das heruntergeladene PDF lag bei 0,939804. Die Abweichung entsteht damit
überwiegend vor der JPEG-/PDF-Einbettung. Cabin Regular und Bold waren sowohl
im Quelldokument als auch im Export-Clone geladen.

Die bestehende CSS-Zoom-Normalisierung erhält Zeilen und Wortbreiten, indem
sie CSS-Zoom durch Transformationen ersetzt und einzelne Wörter passend
skaliert. CSS-Zoom verwendet aber bereits bei der Glyphenformung die gezoomte
Schriftgrösse. Eine Transformation der ursprünglichen Schriftgrösse zeichnet
einen anderen Glyphenlauf, auch wenn dessen äussere Breite nachher stimmt.

Die isolierte Probe mit 15,52 px Cabin und Zoom 0,9 belegt den Unterschied:
Der ursprüngliche native Text ist 106 px breit, dieselbe ungezoomte Schrift
125 px; eine reine Skalierung ergäbe 112,5 px. Der alte Export kompensiert
zwar die Breite, verändert dabei aber die Schriftform. Der neue Browsertest
scheitert mit dem alten Produktcode bereits an dieser Probe mit **597
unterschiedlichen Pixeln**; die korrigierte Ausgabe ist pixelgleich.

## Änderung

Nur die bereits erzeugten Wortspannen im wegwerfbaren Export-Clone erhalten
die tatsächlich verwendete Schriftgrösse sowie entsprechend gezoomte Zeichen-
und Wortabstände. Ihre Transformation hebt den entfernten CSS-Zoom für die
Glyphen wieder auf. Die vorhandene Breitenanpassung bleibt bestehen; die
vertikale Position wird nach dieser Transformation gegen die ursprüngliche
Text-Range abgeglichen.

Verschachtelte Zoomwerte werden durch Multiplikation ihrer Faktoren
berücksichtigt. Berücksichtigt werden ausschliesslich Zoom-Elemente,
die dieser Normalisierungsschritt tatsächlich umwandelt. Quell-DOM, gespeicherte
Dokumente, Seitenzuweisung und die allgemeinen Grundlinienregeln bleiben
unverändert. Es gibt keinen Cabin-spezifischen Offset und keine neue
Bildglättung, Maskierung, Ausrichtung oder gelockerte Schwelle.

## Lokale Prüfung

Playwright 1.56.1 / Chromium 141.0.7390.37, Bun 1.3.13 und Abhängigkeiten aus
dem unveränderten Lockfile. Der vollständige Produktdiff und sein Hash sind
in den Nachweisen enthalten.

| Umfang | Ergebnis |
| --- | --- |
| Acht ausdrückliche Schriftwahlen, echte Dossier-Downloads | 8/8 Browserfälle; 24/24 Seitenpaare PASS |
| Cabin-CV, vollständiges PDF | 0,939804 → 0,965618 RGB-SSIM |
| Maschine-CV, vollständiges PDF | 0,960035 → 0,972860 RGB-SSIM |
| Webbilder der Schriftmatrix | 24/24 Hashes unverändert |
| Text-/Zeilenbox-Geometrie | maximale Differenz 0 mm |
| Bestehende isolierte Grundlinienproben | 8/8 exakt 0 Pixelabweichungen |
| Neue Zoomproben | 8/8 exakt 0 Pixelabweichungen |
| Negative Kontrolle mit altem Normalisierer | erwarteter Fehler, 597 abweichende Pixel |
| Echte Einzelmenü-Downloads, Cabin und Maschine | 4/4 einseitige PDFs; gespeicherte Dokumente unverändert |
| Cabin-Einzel-CV / -Titelblatt | 0,965493 / 0,988995 RGB-SSIM |
| Unit-Tests | 1’539 bestanden, 0 Fehler, 290 Dateien |
| App-/QA-TypeScript, gezielter ESLint, Formatierung, Produktionsbuild | bestanden |

Die Zoomproben umfassen kleine und grosse Cabin-Schrift, normale und fette
Schrift, Zoom 0,9, verschachtelten Zoom 0,9 × 0,8, unvergrösserte und vergrösserte
Schrift sowie eine Sans-Kontrolle. Nur die synthetischen Pixelproben verwenden
den bestehenden separaten Browser ohne LCD-Text. Die echten Downloads und
vollständigen Seitenvergleiche verwenden den gewöhnlichen Browser.

Alle acht vollständigen CV-Seiten wurden auf einer Kontaktübersicht geprüft,
Cabin zusätzlich in voller Grösse vor/nach der Änderung. Kein beobachteter
Textverlust, kein abgeschnittenes Textende und keine zusätzliche Seite.

Die bestehende CI startet durch diese Änderung auch die 39-Vorlagen-Galerie.
Dieser Bericht dokumentiert die lokal abgeschlossenen Prüfungen; deren
separate Vorlagenbefunde und CI-Ergebnisse sind nicht in die 24 Schriften-
Seitenpaare hineingerechnet.

## Nachweise

- [Vollständige Schriftmatrix, Werte und Hashes](cabin-cv-zoom-2026-11-17/summary.json)
- [Komprimierte Rohdaten, Produktdiff, negative Kontrolle und Prüfprotokolle](cabin-cv-zoom-2026-11-17/report.json.gz)
- [Einzel-PDF-Messwerte](cabin-cv-zoom-2026-11-17/single-downloads.json)
- [Cabin-Webreferenz](cabin-cv-zoom-2026-11-17/cabin-cv-web.png)
- [Cabin-PDF vorher](cabin-cv-zoom-2026-11-17/cabin-cv-before.png)
- [Unmittelbare Zeichenfläche vorher](cabin-cv-zoom-2026-11-17/cabin-cv-before-canvas.png)
- [Cabin-PDF nachher](cabin-cv-zoom-2026-11-17/cabin-cv-after.png)
- [Tatsächlich heruntergeladenes Cabin-Dossier](cabin-cv-zoom-2026-11-17/cabin-combined.pdf)
- [Tatsächlich heruntergeladener Cabin-Einzel-CV](cabin-cv-zoom-2026-11-17/cabin-single-cv.pdf)

## Reproduktion

```sh
playwright test --config tests/qa/playwright.text-baseline.config.ts
playwright test --config tests/qa/playwright.font-matrix.config.ts
python scripts/dossier_font_matrix_report.py
bun test tests/unit
```

Frischen Artefaktordner und die im Handoff beschriebenen gepinnten Runner
verwenden. Unit-Tests nicht gleichzeitig mit schweren Renderläufen ausführen.

Die bisherigen Foto-Kreisrand-REVIEW für Terracotta und Studio 3 und die
offene Desktop-Word-Abnahme sind eigenständige Punkte. Diese Korrektur macht
darüber keine neue Freigabeaussage.
