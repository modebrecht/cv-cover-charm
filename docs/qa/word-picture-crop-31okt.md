# Word-Konturkorrektur und minimale Writer-Crop-Gegenprobe

Neuere Bewertung mit Besitzvertrag 2: [native Engine-Gegenprobe und Bildobjektart](writer-crop-engine-31okt.md). Frühere Bildbesitzwerte sind historische Werte des Vertrags 1.

Die weitere lokale Untersuchung behebt die abgeschnittene rechte Word-Kontur in der synthetischen Tabellenprobe. Der vollständige Bildrand muss zur festen Tabellenbreite zählen. Alle vier Writer-Fälle bleiben dadurch gegenüber ihren bisherigen Ausgangsansichten exakt und über zwei Saves stabil. **Der Originalpixelverlust bleibt offen; keine Produktfreigabe.**

Maschinenlesbare Bindungen: [word-picture-crop-31okt.json](word-picture-crop-31okt.json). Historischer Ausgangspunkt: [word-floating-picture-31okt.md](word-floating-picture-31okt.md). Checkout weiterhin `94d9021956734b39045c4aa3891c08fe6ae0e116`, lokale Änderungen uncommittet. Kein Push oder Merge. Die Runde erreichte die Laufzeit-/Nutzungsbegrenzung; ein abschließender Word-PDF-Vergleich unter identischen Druckbedingungen blieb offen.

## Konturfehler konkret behoben

`scripts/docx-next-floating-picture-probe.py` reserviert jetzt `cx + effectExtent.left + effectExtent.right` für die feste Tabellen-/Zellenbreite. Die frühere Breite reservierte nur `cx`; Word schnitt rechts einen Teil der Kontur ab. Die Korrektur verwendet ausschließlich vorhandene Quelldaten. Bildbytes, Crop-Markup, Bildsteuerelement und sämtliche anderen Paketbestandteile bleiben unverändert. Der Produktrenderer wurde in dieser Runde nicht verändert.

Die Word-PDF-Vergleichsgrafik zeigt den geschlossenen Rand mit der neuen Breite; der alte schmale Gegenfall bleibt erhalten. Die gemessene horizontale Abweichung von 0,05 pt gegenüber der früheren Word-Ansicht besteht im Vergleich mit denselben damaligen Druckbedingungen weiterhin. Kein Ausgleich über beobachtete PDF-Koordinaten und keine gelockerten Referenzwerte.

Vier neu erzeugte Quellen (`main`, `low`, `portrait`, `chrome`) wurden unabhängig nativ geladen, zweimal gespeichert und in allen drei Phasen als PDF exportiert. Alle vier bestehen den unveränderten strengen PDF-Vertrag 2, den typisierten textfreien Bildbesitz, die Feld-/Text-/Raster-Erhaltung und den 8x-Fotobereich. Der Originalpixelvertrag scheitert nach beiden Saves in allen vier Fällen weiterhin. Die vollständige 22er-Matrix wurde nicht erneut ausgeführt.

Der korrigierte Hauptfall wurde in Desktop-Word zweimal separat gespeichert, geschlossen und wieder geöffnet, jeweils ohne Reparatur. Alle fünf Paketprüfungen bestehen in allen drei Vergleichen (Quelle→Save 1, Quelle→Save 2, Save 1→Save 2). **Eine exakte Word-PDF-Stabilität ist für diese Runde nicht bestätigt:** Der erste Export entstand während der Initialisierung eines nicht erreichbaren Druckers. Danach wurde innerhalb Words Microsoft Print to PDF gewählt. Die Exporte haben unterschiedliche Seitengrößen (595,5 × 842 pt gegenüber 595,32 × 841,92 pt), obwohl alle DOCX-Abschnitte unverändert A4 enthalten. Der strenge Vergleich scheitert auf allen Seiten. Beide Exporte bleiben als Gegenbeleg erhalten; Druckerwechsel und Speichereffekt sind damit noch nicht sauber getrennt.

## Pixelverlust ohne Titelblatt oder Sidebar reproduziert

Der neue Produzent `scripts/docx-next-picture-crop-repro.py` erzeugt vier minimale einseitige DOCX-Dateien. Jede besitzt dieselbe vollständige synthetische RGB-Kalibrierbitmap mit 120 × 180 Pixeln in genau einem typisierten, textfreien Bildsteuerelement. Nur Rechteck/Ellipse und Vorhandensein des ursprünglichen `a:srcRect`-Zuschnitts unterscheiden sich. Keine personenbezogenen Inhalte, keine versteckten Zeichen, kein Reparieren gespeicherter Dateien.

```text
python scripts/docx-next-picture-crop-repro.py artifacts/new-crop-repro
```

| Minimale Quelle    | Originalpixel Quelle / Writer Save 1 / Save 2      | Exakte sichtbare Geometrie über beide Saves |
| ------------------ | -------------------------------------------------- | ------------------------------------------- |
| Rechteck ohne Crop | 120×180 / 120×180 / 120×180, identische RGBA-Daten | bestanden                                   |
| Rechteck mit Crop  | 120×180 / 120×180 / 120×180, identische RGBA-Daten | bestanden                                   |
| Ellipse ohne Crop  | 120×180 / 120×180 / 120×180, identische RGBA-Daten | bestanden                                   |
| Ellipse mit Crop   | 120×180 / 96×96 / 96×96, Originaldaten verloren    | bestanden                                   |

Bildbesitz besteht in allen zwölf Phasen. Die tatsächlichen Bildbereiche bleiben bei 8x-Auflösung innerhalb jedes Falls stabil. Das ist ein isolierter Gegenbeleg gegen die Annahme, der Verlust entstehe durch das alte Titelblatt, die Sidebar oder den schwebenden Tabellencontainer. Die minimale Probe wurde mit dem unveränderten LibreOfficeKit 25.8.7.3 ausgeführt; eine Desktop-Word-Abnahme dieser vier Minimaldateien fand in dieser Runde nicht statt.

Der offizielle Importcode passt zu dieser Beobachtung: Nicht rechteckige Bildgeometrie wird als CustomShape behandelt; bei positivem Source-Crop ruft der Grafikimport anschließend `lclCropGraphic` auf. Damit ist ein Importpfad für physischen Zuschnitt belegt, kein neuer Codec- oder Kompressionsfehler behauptet. Quellen: [Shape-Import, Zeilen 1002 ff.](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/drawingml/shape.cxx#L1002), [GraphicProperties-Crop, Zeilen 821–855](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/drawingml/fillproperties.cxx#L821). Dateiobjekte `63c77a2080f642aa3b9e79bad23be26ca15acd80` und `fc734b743a4616e44a98907cb0539bf95ac8b02e`. Der zusätzlich gelesene aktuelle Master enthält diesen Crop-Aufruf ebenfalls; ein neuerer nativer Binärlauf wurde damit nicht ersetzt oder geprüft.

## Weitere Gegenproben und Verifikation

Fünf getrennte Hauptfall-Proben vergleichen vollständige Tabellenbreite, Rechteck-Crop, Ziel-FillRect sowie 100-%-Tile mit zwei PNG-Dichteangaben. Nur die unveränderte Ellipsen-Crop-Darstellung trifft die bisherige Writer-Quellansicht. Die anderen Varianten behalten Originalpixel und bleiben stabil, treffen aber die gewünschte Ansicht nicht; insbesondere werden FillRect-/Tile-Transformationen nicht als akzeptierter Crop-Ersatz gewertet.

Die drei Sammlungen umfassen zusammen 26 neue native DOCX-Saves und 39 PDF-Exporte mit 147 Seiten. Word-Ausführungen zählen separat. Acht neue Quellen (vier minimal, vier mit vollständiger Konturbreite) bestehen den Open-XML-Schema-Validator ohne Fehler. Beide Produzenten erzeugen bei Wiederholung bytegleiche Dateien, lehnen bestehende Ausgaben ab und kompilieren erfolgreich. Der Tabellenproduzent weist veränderte gepinnte Eingaben vor Erzeugung des Ausgabeverzeichnisses zurück. Frühere Testzahlen werden nicht als neue vollständige Testsuite dieser Runde ausgegeben.

Rohdaten und vollständige gebundene Phasen liegen ignoriert unter `artifacts/word-picture-crop-31okt/`. Die exakte frühere Produzentenversion wurde unter `artifacts/word-native-model-31okt/producer-before-extent.py` archiviert; der historische Bericht bindet weiterhin deren unveränderten Hash. Ein falscher früherer Beispielpfad wurde korrigiert: Der eingecheckte Import-Fixturesatz enthält nur `main`; alle vier gepinnten Quellen liegen lokal unter `artifacts/ci-3972e87b/app-body/fixtures`.

## Konkrete Fortsetzung

Zuerst die unveränderte korrigierte Quelle und Save 2 mit demselben bereiten Drucker neu exportieren und streng vergleichen. Beim Ende dieser Runde sind beide in Word geöffnet; die Quelle ist `table-outer-width.docx`. Danach einen verlustfreien Engine-/Crop-Ansatz an der minimalen Viererprobe nachweisen. Eine Änderung muss weiterhin tatsächliche Originalpixel im eigenen Bildsteuerelement, richtigen Ausschnitt und exakte Geometrie zugleich bestehen. Die geschlossene Kontur allein ersetzt diese Abnahme nicht. Keine externe Fehlermeldung veröffentlicht und keine Engine geändert.
