# Writer-Crop: ungebaute Upstream-Entwürfe

Diese Dateien sind **keine freigegebene Engine-Korrektur**. Sie wurden gegen exakt gebundene Originaldateien aus `libreoffice-25.8.7.3` erzeugt und mit `git apply --check` geprüft. Ein C++-Build und die enthaltenen CppUnit-Tests wurden hier nicht ausgeführt. In der vorhandenen WSL-Testumgebung fehlen C++-Bauwerkzeuge und ein konfigurierter LibreOffice-Entwicklungsbuild. Unter Windows sind CMake und eine per `vswhere` gefundene Visual-Studio-2022-Community-Installation mit C++-Komponente vorhanden. Auch dort ist kein LibreOffice-Entwicklungsbuild eingerichtet; die erste reine PATH-Suche hatte diese Installation nicht erfasst.

## Test zuerst

`lo-crop-pixel-and-kind-regression-unbuilt.patch` ergänzt den bestehenden Writer-Testbereich um zwei unabhängige Anforderungen:

- Die identischen 120×180-Kalibrierpixel müssen unmittelbar nach Import und nach zwei DOCX-Saves vollständig erhalten bleiben. Als Rohpixelreferenz dient das unveränderte Rechteck ohne Zuschnitt. DIB und Alphamaske werden verglichen.
- Ein typisiertes Bildsteuerelement muss beim Speichern eine native `pic:pic` behalten. Ein gleich aussehender WPS-Bitmap-Shape erfüllt diese Anforderung nicht.

In einem vorbereiteten LibreOffice-Checkout die vier synthetischen Dateien mit dem Projektproduzenten erzeugen und unverändert nach `sw/qa/extras/ooxmlexport/data/` kopieren:

```text
python scripts/docx-next-picture-crop-repro.py artifacts/fresh-crop-repro
```

Die Dateien heißen `crop-repro-rect-full.docx`, `crop-repro-rect-crop.docx`, `crop-repro-ellipse-full.docx` und `crop-repro-ellipse-crop.docx`. Die Quelle ist vollständig synthetisch und hat ein einziges Bildsteuerelement. Der native Befund lässt scheiternde Upstream-Tests erwarten; die CppUnit-Ausführung selbst ist noch unbestätigt.

Im LibreOffice-Checkout:

```text
git apply --check /absolute/path/lo-crop-pixel-and-kind-regression-unbuilt.patch
git apply /absolute/path/lo-crop-pixel-and-kind-regression-unbuilt.patch
make CppunitTest_sw_ooxmlexport18
```

## Möglicher Kernbaustein, noch nicht angebunden

`lo-bitmap-source-window-support-unbuilt.patch` ergänzt `SdrFillGraphicAttribute` um ein ausdrückliches Quellfenster für gestreckte, nicht gekachelte Bildfüllungen. Die bestehende Konstruktor-Schnittstelle bleibt erhalten. Der Entwurf verändert Texturkoordinaten innerhalb der bereits vorhandenen Polygonmaske; die Originalbitmap bleibt erhalten. Quellfenster sind Teil des Attributvergleichs, damit ein veränderter Ausschnitt den Rendercache ungültig macht. Der zusätzliche `svx_unit`-Test beschreibt Originalpixel, Fensterabbildung, Cache-Unterschiede, leeres Fenster und Auffüllen außerhalb des Originalbereichs.

```text
git apply --check /absolute/path/lo-bitmap-source-window-support-unbuilt.patch
git apply /absolute/path/lo-bitmap-source-window-support-unbuilt.patch
make CppunitTest_svx_unit
```

**Dieser Baustein allein verändert den Import nicht.** Keine vorhandene Importstelle verwendet die neue Überladung. Er ist ein ungeprüfter Ansatz für die fehlende Kernfunktion, kein als fertig ausgegebener Fix.

## Noch notwendige Integration und Abnahme

1. Das ursprüngliche Source-Crop mit seinen vier Prozentwerten im nativen Modell erhalten. Es darf nicht auf gerundete Tile-Skalierung oder ein vorab verkleinertes Modellbitmap reduziert werden.
2. Den Import erst dann vom physischen Crop auf die neue Darstellung umstellen, wenn Anzeige und Speichern denselben Ausschnitt verwenden. Source-Crop und Ziel-FillRect haben unterschiedliche Vorzeichen-/Bezugsregeln. Die vorhandenen `GraphicCrop`-Werte dürfen deshalb nicht ungeprüft neu interpretiert werden.
3. Beim DOCX-Export die vollständige Originalbitmap aktiv im eigenen Bildsteuerelement referenzieren, den Crop serialisieren und die native Bildobjektart erhalten. Die aktuelle Umwandlung `pic:pic` → WPS muss gesondert korrigiert werden.
4. Source-Crop-Präzision, Rundung an Pixelgrenzen, Spiegelung, Drehung, Transparenz und Farben prüfen. Diese Integration ist im Entwurf nicht implementiert. Auch eine rein renderseitig zugeschnittene Kopie bei unverändertem Modell ist als Möglichkeit zu bewerten, falls die bisherigen PDF-Bildmatrizen erhalten bleiben müssen.
5. Beide nativen Sammlungen mit `scripts/docx-next-picture-crop-engine-qa.py` getrennt sammeln und gegen eine vertrauenswürdige unveränderte Referenz prüfen. Bildobjektart, Originalpixel, ursprüngliche Ansicht und Speicherstabilität müssen gleichzeitig bestehen. Danach Desktop-Word ohne Reparatur und schließlich die vollständige Projektmatrix prüfen.

Die lokal isolierte Binär-Gegenprobe mit deaktiviertem `BitmapEx::Crop` ist ausdrücklich verworfen: Sie erhält die Pixel, zeigt aber den falschen Ausschnitt. Ihre Bibliothek oder Startdatei darf nicht als Produktengine übernommen werden. Der unveränderte Referenzlauf bleibt getrennt und hashgebunden.
