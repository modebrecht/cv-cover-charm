# Writer-Croppfad: native Gegenprobe, stärkere Objektartprüfung und Patchstand

**Kein freigabefähiger Engine-Fix.** Die gezielte native Gegenänderung ist ausgeführt und verworfen: Das Deaktivieren des physischen Bitmap-Crops erhält Originalpixel, zeigt aber den falschen Ausschnitt. Zusätzlich ist ein bislang übersehener Exportfehler eingegrenzt: Writer ersetzt die native Bildobjektart durch einen WPS-Shape. Die strenge Besitzprüfung erkennt das jetzt. Alle 148 fokussierten Python-Tests bestehen; die neuen C++-Entwürfe sind dagegen ungebaute Vorschläge.

Nachweise: [writer-crop-engine-31okt.json](writer-crop-engine-31okt.json). Vorherige Runde: [word-picture-crop-31okt.md](word-picture-crop-31okt.md). Checkout unverändert `94d9021956734b39045c4aa3891c08fe6ae0e116`; bestehende lokale Änderungen erhalten. Kein Commit, Push, Merge, Engine-Austausch oder externer Fehlerbericht.

## Tatsächlicher Eingriff in eine isolierte Testengine

Die Referenz bleibt LibreOfficeKit 25.8.7.3 mit unverändertem Adapter, Paket- und Fontbestand. Referenzbibliothek `libmergedlo.so`: SHA-256 `7b931192643c86a733f49c363357324e9bd93c7619561e81c073044515dcde59`.

Für die negative Gegenprobe wurde die komplette vorhandene Laufzeit separat kopiert. Nur in dieser Diagnosekopie wurde der Eintritt in `BitmapEx::Crop` so geändert, dass die Funktion ohne Mutation zurückkehrt. Die Änderung ist an den exakten Bibliothekshash und die erwarteten ursprünglichen Bytes gebunden. Diagnosebibliothek: SHA-256 `b8b17c5f5b357e5a1be65f0edf48aa85e5032e9b54502e65262b5063d675d9f9`. Loader-Protokolle belegen die geladene Diagnosebibliothek. Ein erster Versuch mit einer unvollständigen Linkstruktur scheiterte bereits bei der Profilinitialisierung und wird nicht als erfolgreiche Konvertierung gezählt.

**Diese globale Deaktivierung ist kein korrekter Importpatch.** Sie dient ausschließlich dazu, die vermeintliche Abkürzung „Crop-Aufruf entfernen“ nativ zu widerlegen. Sie beeinflusst sämtliche Bitmap-Crop-Aufrufe dieses Diagnoseprozesses und darf nicht als Fallback oder Produktengine verwendet werden. Die Referenzbibliothek wurde nach den Versuchen erneut auf ihren ursprünglichen Hash geprüft.

Dieselben vier unveränderten einseitigen Kalibrier-DOCX wurden mit der Diagnosekopie und anschließend frisch mit der Referenz ausgeführt, jeweils Quelle und zwei Saves. Zusammen: 16 neue DOCX-Speicherungen, 24 PDF-Exporte mit 24 Seiten. Keine neuen DOCX-Darstellungsvarianten auf Verdacht.

| Fall               | Referenz: Originalpixel nach Save 1/2 | Diagnose: Originalpixel nach Save 1/2 | Diagnose gegen ursprüngliche Ansicht |
| ------------------ | ------------------------------------- | ------------------------------------- | ------------------------------------ |
| Rechteck ohne Crop | erhalten                              | erhalten                              | exakt                                |
| Rechteck mit Crop  | erhalten                              | erhalten                              | exakt                                |
| Ellipse ohne Crop  | erhalten                              | erhalten                              | exakt                                |
| Ellipse mit Crop   | verloren, 96×96 statt 120×180         | erhalten, 120×180                     | **falsch**                           |

Innerhalb jedes nativen Laufs bleiben die PDFs über beide Saves stabil. Ein stabil gespeicherter falscher Ausschnitt wird weiterhin zurückgewiesen. Pixelgleichheit ist getrennt vom gültigen nativen Bildbesitz beobachtet; beides muss gleichzeitig bestehen.

## Exportierte Objektart und tatsächliches Word-Verhalten

In den minimalen Writer-Rückläufen bleiben Rechtecke `pic:pic`. Ellipsen werden dagegen zu WPS-Bitmap-Shapes, auch ohne Source-Crop. Das war durch die bisherige Prüfung eines einzelnen Drawings und einer eigenen Bildreferenz nicht ausreichend erfasst.

Desktop-Word wurde über die vorhandene Computer-Use-Steuerung nur zum Öffnen der unveränderten Nachweise verwendet:

- Die ursprüngliche minimale Ellipse ohne Crop öffnet reparaturfrei und zeigt ein Bildsteuerelement `cv.person.photo`.
- Der Writer-Rechteck-Rücklauf mit Crop öffnet reparaturfrei und zeigt dasselbe native Bildsteuerelement.
- Der Writer-Ellipsen-Rücklauf ohne Crop verlangt Reparatur. Diese wurde abgelehnt; keine reparierte oder nachgebesserte Datei wurde als Erfolg verwendet.

Die minimale Schema-Gegenprüfung fand in **beiden** Writer-Rückläufen dieselben sechs zusätzlichen Fehler (ein ungültiger `docGrid/@charSpace`-Wert und fünf ungültige Charset-Werte). Die ursprüngliche PIC-Quelle und der bereits früher abgewiesene, prospektive WPS-Gegenfall sind schemafehlerfrei. Daher wird die Bildobjektart nicht als alleinige Ursache jeder Word-Warnung ausgegeben. Dateipaket, tatsächliches Öffnen und semantisch zulässiger Steuerelementinhalt sind getrennte Anforderungen. Die Rückläufe dieser isolierten Umgebung wurden nicht repariert.

## Vertragslücke geschlossen

`scripts/docx_next_picture_owner_qa.py` verwendet jetzt Besitzvertrag 2: Das typisierte, textfreie Bildsteuerelement muss genau ein eigenes Drawing und eine eigene eingebettete Bildreferenz **sowie** genau eine native `pic:pic` mit passender GraphicData-URI enthalten. Ein WPS-Shape mit erhaltenem PNG genügt nicht. Drei neue adversariale Fälle prüfen den WPS-Ersatz sowie gefälschte Payload-/Namespace-Kombinationen; insgesamt 29 Besitzvertragstests bestehen.

`compare_image_data` trennt die rein beobachtete Gleichheit decodierter Pixel (`decodedPixelsEqual`) von der bestandenen strengen Bilddatenprüfung. Erhaltene Pixel retten einen ungültigen Besitzer nicht. Der neue Engine-Regressionstest verlangt Bildobjektart, Originalpixel, ursprüngliche Ansicht und Speicherstabilität gleichzeitig.

**Historische „4/4 Bildbesitz“-Aussagen gehörten zum früheren physischen Bindungsvertrag.** Sie belegen nach der tatsächlichen Word-Gegenprobe keine aktuelle Abnahme der Ellipsen-Rückläufe. Die damaligen Rohberichte bleiben unverändert als historische Befunde erhalten. Vertragsversion 2 weist beide Ellipsen-Rückläufe wegen der Objektart zurück; bei Ellipse mit Crop kommt der Pixelverlust hinzu.

## Wiederverwendbarer nativer Regressionstest

`scripts/docx-next-picture-crop-engine-qa.py` trennt Sammlung und lesende Prüfung. Die Sammlung verwendet nur die Python-Standardbibliothek und den bestehenden LibreOfficeKit-Adapter. Die Prüfung verwendet die vorhandenen Pillow-/PyMuPDF-Abhängigkeiten. Quell- und Phasenhashes, eigene Dateien für die Speicherphasen, vier eindeutige Fälle und unveränderte Engine-Dateien werden geprüft. Auditberichte überschreiben keine Gegenbelege. Ein Audit allein behauptet keine native Ausführung oder Word-Abnahme.

```text
python scripts/docx-next-picture-crop-engine-qa.py collect --sources SOURCE_DIR --output NEW_COLLECTION --engine LOK_ADAPTER --engine-library LIBMERGEDLO
python scripts/docx-next-picture-crop-engine-qa.py audit --collection NEW_COLLECTION --reference TRUSTED_REFERENCE --report NEW_REPORT.json
```

Beide tatsächlich geprüften Engines werden erwartungsgemäß mit Exitcode 1 zurückgewiesen: Die Referenz scheitert an den bekannten Fehlern; die Diagnosekopie zusätzlich an der Quellansicht. Zehn neue Schutztests verhindern unter anderem fremde Referenzquellen, manipulierte Dateien, Phasen-Aliase, unvollständige Sammlungen, Pfadausbrüche und Überschreiben älterer Berichte.

## Quellstand für eine echte Korrektur

Die vorhandene WSL-Testumgebung besitzt keine gefundenen C++-Bauwerkzeuge und keinen konfigurierten LibreOffice-Entwicklungsbuild. Unter Windows sind CMake und eine per `vswhere` gefundene Visual-Studio-2022-Community-Installation mit C++-Komponente vorhanden; die erste reine PATH-Suche hatte diese Installation nicht erfasst. Ein eingerichteter LibreOffice-Entwicklungsbuild fehlt weiterhin. Ein kompilierter C++-Fix konnte in dieser Runde nicht belegt werden.

Zwei präzise als ungebaute Entwürfe gekennzeichnete Patches und die Anwendungsschritte liegen unter [patches/README-writer-crop.md](patches/README-writer-crop.md):

- Ein Upstream-Regressionstest für vollständige Kalibrierpixel über Import/zwei Saves und für die erhaltene native Bildobjektart.
- Ein möglicher Kernbaustein für ein ausdrückliches Quellfenster in `SdrFillGraphicAttribute`, inklusive Attribut-/Cache-Test. Er ist noch an keine Import- oder Exportstelle angebunden und stellt allein keine Korrektur dar.

Die Entwürfe lassen sich auf die exakt per Git-Blob-ID geprüften Originaldateien aus `libreoffice-25.8.7.3` anwenden. **`git apply --check` ist nur eine Text-/Kontextprüfung; kein C++-Build und kein CppUnit-Erfolg.** C++-Tests sind in den 148 bestandenen Python-Prüfungen nicht enthalten.

Der offizielle Quellcode beschreibt den physischen Import-Crop und die fehlende Kernunterstützung ausdrücklich: [GraphicProperties und `lclCropGraphic`](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/drawingml/fillproperties.cxx), [CustomShape-Crop im Export](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/export/drawingml.cxx). Der Zeichenpfad kann Bildfüllungen bereits innerhalb einer Polygonmaske darstellen; seine Attribute erhalten momentan kein ausdrückliches ursprüngliches Crop-Fenster. [SdrFillGraphicAttribute](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/drawinglayer/source/attribute/sdrfillgraphicattribute.cxx).

Für die echte Integration müssen die ursprünglichen vier Crop-Werte ohne Tile-Quantisierung im nativen Modell erhalten, Anzeige und Export synchronisiert und die Bildobjektart bewahrt werden. Source-Crop und FillRect dürfen wegen unterschiedlicher Bezugs- und Vorzeichenregeln nicht gleichgesetzt werden. Spiegelung, Drehung, Padding, Alpha, Pixelgrenz-Rundung und PDF-Bildmatrizen bleiben gesonderte Abnahmepunkte. Kein Referenzwert wurde angepasst.

## Verifikation und nächste Grenze

148 fokussierte Python-Prüfungen bestanden: 51 Word-Leser, zwölf Word-Rücklauf, acht Bildimport, 29 Bildbesitz, elf Body-Inhalt, sieben Medien, zwölf PDF-Geometrie, acht PDF-Clipping und zehn neue Engine-Nachweisprüfungen. Die beiden erwarteten nativen Ablehnungen wurden separat protokolliert. Neue C++-Entwürfe und vollständige Browser-/Produktprüfungen bleiben unbestätigt.

Rohdaten lokal und ignoriert unter `artifacts/writer-crop-engine-31okt/`. Der nächste fachliche Schritt ist ein echter LibreOffice-Entwicklungsbuild: Regressionstests zuerst ausführen, die koordinierte Modell-/Render-/Exportkorrektur bauen und dann denselben nativen Test erneut ausführen. Weitere Diagramm- oder DOCX-Varianten ersetzen diesen Schritt nicht. Der frühere Word-PDF-Vergleich unter identischen Druckbedingungen bleibt zusätzlich offen.
