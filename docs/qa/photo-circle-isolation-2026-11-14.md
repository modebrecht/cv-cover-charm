# Kreisranddiagnose abgeschlossen; zwei optische REVIEWs bleiben offen

Stand 14.11.2026 · Anwendungsbasis `2ebfa4ed7423524350d3c2778f296377312912a7`

Die gezielte Untersuchung von Rahmen, Beschnitt und Seitenursprung ist
abgeschlossen. Keine der geprüften Ersatzzeichnungen liefert für beide
Vorlagen eine belegte Korrektur. Die Anwendung bleibt auf dem zuvor geprüften
Stand; die normalen Terracotta-/Studio-3-Fälle behalten ihren REVIEW-Status.
Als nächster Abnahmeschritt bleibt Speichern/Wiederöffnen in Microsoft Desktop
Word. Das vorhandene Word-Prüfpaket enthält DOCX, Referenz-PDF und Projektdatei.

## Neue Eingrenzung

Bei beiden festen Fällen liegt die sichtbare Seite bei ganzen CSS-Pixeln
(`733/77`, Grösse `794 × 1123`). Die ursprüngliche Exportseite beginnt ebenfalls
bei ganzen Pixeln (`−20000/2246`). Ein einfacher Versatz beim Ausschneiden des
Screenshots erklärt die Abweichung daher nicht. Der native Screenshot der
Export-DOM wird zusätzlich bei `0/0` aufgenommen. Seine Foto-Geometrie ist in
allen zwölf Varianten exakt gleich der sichtbaren Browser-Geometrie.

Der native Fotovergleich zwischen Vorschau und Export-DOM ergibt **0,99960**
für Terracotta und **0,99973** für Studio 3. Der grössere Unterschied entsteht
erst bei html2canvas. Diese Werte betreffen die festgelegten Fotoausschnitte,
nicht den gesamten Inhalt beliebiger Projekte.

## Rahmen und Bild getrennt prüfen

Alle folgenden Werte sind rohe RGB-SSIM bei **288 dpi vor JPEG und PDF**.
Der Ausschnitt enthält den vollständigen Fotorahmen und neun Pixel Saum.
Es gibt keine Glättung, Maskierung oder nachträgliche Bildverschiebung.

| Diagnosevariante | Terracotta | Studio 3 |
| --- | --- | --- |
| Normaler Kreisrahmen | 0,94201 | 0,94230 |
| Kreis ohne Rahmen | 0,96521 | 0,96321 |
| Rechteckige Maske mit Rahmen | 0,93897 | 0,92335 |
| Rechteckige Maske ohne Rahmen | 0,96037 | 0,95329 |
| SVG-Ersatzrahmen mit dreifachen Quelldimensionen | 0,94746 | 0,94260 |
| Bildbeschnitt und Rahmen auf getrennten Ebenen | 0,93986 | 0,94231 |

Der Rahmen trägt deutlich zum Unterschied bei. Auch ohne Kreisbeschnitt
verschlechtert die Rahmenzeichnung den Vergleich. Die verbleibende Differenz
des rahmenlosen Bildes zeigt zugleich, dass der Rahmen nicht die einzige
Ursache ist. Die SSIM-Differenzen sind keine additive Zerlegung in Fehleranteile.

Die Varianten ohne Rahmen und mit rechteckiger Maske sind reine Gegenproben.
Ihre Box, ihr Bildausschnitt und ihr Zoom bleiben identisch; sie stellen keine
andere freigegebene Fotoform oder korrigierte Gestaltung dar.

Beim SVG-Versuch wird die von html2canvas materialisierte Rahmen-Pseudokopie
entfernt. Es bleibt eine einzelne transparente Ellipsenzeichnung mit der
ursprünglichen berechneten Rahmenfarbe und -breite. Auch mit dreifachen
SVG-Quelldimensionen verbessert sie nicht beide Fälle ausreichend. Beim
Ebenenversuch erhält das Bild einen eigenen Beschnitt, während der ursprüngliche
Rahmen ausserhalb dieses Beschnitts liegt. Das verbessert den Vergleich ebenfalls
nicht. Beide Versuche werden verworfen.

Die [Kodierungsdiagnose vom 13.11.](photo-circle-encoding-2026-11-13.md) hatte
bereits JPEG als Hauptursache ausgeschlossen. Die frühere Konturmessung bleibt
unter der bestehenden Grenze von 0,3 mm. Eine generelle Änderung von Bildformat,
Qualität, Rahmen, Beschnitt oder Renderfaktor ist durch diese Versuche nicht
gerechtfertigt. Die genaue Raster-/Kantenglättungsursache ist weiterhin nicht
vollständig aufgelöst.

Damit ist dieser Untersuchungsblock abgeschlossen, ohne eine Exportfreigabe zu
erfinden. Dieselben Kompressions-, SVG- und Ebenenversuche sollen beim nächsten
Fortsetzen nicht erneut durchlaufen werden. Weitere Kreisarbeit benötigt eine
neue konkrete Hypothese oder einen neuen sichtbaren Referenzfehler. Die beiden
optischen REVIEWs bleiben separat bestehen; die nächste praktische Abnahme ist
Desktop Word, das in dieser Linux-Umgebung nicht verfügbar ist.

## Nachweise und Reproduktion

**2/2 Browserläufe bestanden**, zwölf Diagnosevarianten, keine Retries oder
übersprungenen Fälle. Jede Variante prüft identische Foto-Geometrie. Zwölf um
zwölf physische Pixel verschobene Gegenproben unterschreiten die unveränderte
SSIM-Grenze von 0,95. QA-TypeScript, gezieltes ESLint und Prettier bestehen.
Es wurden keine neuen tatsächlichen PDF-Downloads als Teil dieses Sammellaufs
gezählt; er untersucht die Rasterstufe vor der bereits geprüften JPEG-/PDF-Stufe.

Die [Messdatei](photo-circle-isolation-2026-11-14/evidence.json) enthält Quelle,
Anwendungs-Blobs, Eingabe-/Dateihashes, Browserstatistik, Geometrie und sämtliche
Gegenproben. Die archivierten Vergleichsbilder zeigen jeweils nativ / html2canvas /
Differenz. Der Prüfaufbau liegt ausdrücklich als **opt-in Diagnosearchiv** vor;
er erweitert weder die normale CI noch die Produktfreigabe.

Mit dem bestehenden gepinnten Playwright-/Chromium-Aufbau, der synthetischen
Galerie-Fixture und den Python-Bildabhängigkeiten:

```sh
cp docs/qa/photo-circle-isolation-2026-11-14/probe.qa.ts.txt tests/qa/photo-origin-diagnostic.qa.ts
cp docs/qa/photo-circle-isolation-2026-11-14/playwright.config.ts.txt tests/qa/playwright.photo-origin.config.ts
playwright test --config tests/qa/playwright.photo-origin.config.ts
python docs/qa/photo-circle-isolation-2026-11-14/report.py.txt
```

Falls die synthetische Fixture fehlt, zuerst die bestehende gezielte Galerie
ausführen. Nach einer Reproduktion die beiden kopierten temporären TS-Dateien
wieder entfernen; sie gehören nicht in die normale Testauswahl.

Der letzte vollständige Galeriestand bleibt **115 PASS / 2 REVIEW / 0 FAIL**.
Dieser Diagnoseblock ist kein erneuter vollständiger 39er-Lauf.
