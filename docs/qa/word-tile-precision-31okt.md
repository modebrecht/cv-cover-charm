# Writer-Bildskalierung und strengere PDF-Geometrie, 31. Oktober 2026

Neuere lokale Untersuchung: [typisierter Bildbesitz in schwebender Tabelle](word-floating-picture-31okt.md). Teilfortschritt, weiterhin keine Produktfreigabe.

**Die Tile-Variante bleibt verworfen fuer eine Produktfreigabe.** Die verbliebene Bilddrift ist reproduzierbar an die Skalierung gebunden. Eine Pruefluecke ist geschlossen: Gleichbleibende Wortpositionen und 2x-Seitenpixel reichen nicht mehr fuer exakte PDF-Geometrie. Der Vergleich verlangt zusaetzlich unveraenderte Seitengroessen und alle tatsaechlich platzierten Bildtransformationen.

Maschinenlesbare Bindungen: [word-tile-precision-31okt.json](word-tile-precision-31okt.json). Vorherige Desktop- und Writer-Ausfuehrungen: [word-direct-picture-31okt.md](word-direct-picture-31okt.md).

## Arbeitsstand abgeglichen

Der lokale Windows-Checkout stand noch auf `e395d4d6`. Nach Sicherung aller lokalen Aenderungen wurde der bereits gepushte Arbeitsbranch ohne Merge-Commit auf `94d9021956734b39045c4aa3891c08fe6ae0e116` vorgezogen. Die neun dazwischenliegenden Commits veraendern den Bildrenderer und die beiden jetzt verschaerften Geometriepruefdateien nicht. Die bisherigen synthetischen Quellen behalten daher ihre dokumentierte Bytebindung. Die aktuelle strenge Textpruefung und der vorbereitete Word-Ruecklaufleser werden jetzt ebenfalls verwendet. Keine Historie umgeschrieben, keine lokalen Aenderungen verworfen.

## Skalierung gezielt getrennt

Aus der detaillierten synthetischen Hauptfall-Kontrolle wurden drei ausdruecklich veraenderte Diagnosequellen erzeugt. Nur Attribute des einen `a:tile` wurden geaendert. Bildbytes, Formgeometrie, Bereichsmarker und alle anderen Paketbestandteile bleiben erhalten. Diese Quellen sind keine unveraenderten App-Exporte und stellen nicht den gewuenschten Fotoausschnitt dar.

Alle drei Quellen wurden mit derselben unveraenderten, hashgebundenen LibreOfficeKit-25.8.7.3-Umgebung dreimal gespeichert und jeweils erneut geladen. Quelle und drei Ruecklaeufe wurden als PDF exportiert: neun neue DOCX-Speicherungen, zwoelf PDF-Exporte, 36 PDF-Seiten. Der identische feste Fotobereich auf Seite 3 wird mit 8x-Aufloesung verglichen.

| Diagnosequelle                          | Tile-Skalierung nach Quelle / Save 1 / Save 2 / Save 3             | Geaenderte 8x-Pixel nach Save 1 / 2 / 3 |
| --------------------------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| 100 %, Verschiebung null                | `100000/100000` in allen vier Phasen                               | `0 / 0 / 0`                             |
| 100 %, bisherige Verschiebung           | `100000/100000` in allen vier Phasen                               | `0 / 0 / 0`                             |
| Bisherige Skalierung, Verschiebung null | `133858/133859`, `133826/133844`, `133763/133802`, `133732/133760` | `32077 / 32077 / 41603`                 |

Originalbytes, 120x180-RGBA-Pixel und physisch eigene Bildbeziehung bleiben in den Kontrollserien erhalten. Die erste Verschiebung wird von Writer in einen positiven Kachelversatz normalisiert; dies allein aendert bei der 100-%-Kontrolle keine Pixel. Die Skalierungsserie driftet dagegen auch ohne Verschiebung. Eine Korrektur des Pan-Versatzes allein behebt diesen Fehler deshalb nicht.

## Versionsgebundene Ursache und Grenzen

Im [Importcode von LibreOffice 25.8.7.3](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/drawingml/fillproperties.cxx#L609) wird die Tile-Skalierung in ganzzahlige Hundertstelmillimeter umgerechnet. Der [Hilfsaufruf](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/include/oox/helper/helper.hxx#L109) verwendet eine Ganzzahlkonvertierung nach Begrenzung. Im [Exportcode](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/export/drawingml.cxx#L2128) wird aus diesen Massen wieder ein ganzzahliger Prozentwert berechnet. Damit sind zwei verlustbehaftete Umrechnungen konkret belegt. Beispiel fuer den ersten horizontalen Hauptfall-Uebergang: `3175 * 133858 / 100000 = 4249.9915`, ganzzahlig `4249`; der Rueckwert wird `133826` und entspricht exakt dem beobachteten ersten Save.

Dies ist eine Quellcode- und A/B-Eingrenzung ohne internen Breakpoint. Weitere native Einheitenumrechnungen wurden nicht vollstaendig instrumentiert; die ganze spaetere Zahlenfolge wird nicht als allein durch dieses eine Rechenbeispiel erklaert ausgegeben. Der Engine-Code und die gepinnten Binaries wurden nicht geaendert. Eine 100-%-Skalierung ist eine Ursachen-Kontrolle, kein Ersatz fuer den authored Zoom/Crop. Keine vorausberechnete Gegenverschiebung, keine angepassten Sollwerte und keine groesseren Toleranzen wurden integriert.

## Pruefluecke geschlossen

`scripts/docx-next-sidebar-save-geometry-qa.py` meldet fuer PDF-Vergleiche jetzt Vertragsversion 2. Zusaetzlich zu den bisherigen Kriterien werden Seitengroesse sowie Anzahl, Reihenfolge, Rahmen, Matrix und Bitmapabmessungen aller gemalten Bilder exakt verglichen. PDF-Objektnummern, Kompression und Metadaten werden dabei nicht als Geometrie behandelt. Eine geaenderte rohe Kachelmatrix muss nicht in jedem einfarbigen, beschnittenen Bild sichtbar sein; ihr Erhalt wird als eigenes strenges Kriterium verlangt. Aus pixelgleichen Flaechen wird keine exakte Bildtransformation mehr abgeleitet. Dies ersetzt weder Bildbesitz- noch Originalpixel-, Crop- oder Bearbeitungspruefungen.

Vier neue Tests sichern beschnittene einfarbige Bilder mit verborgener Transformationsaenderung, doppelte deckende Bildplatzierung, minimale Seitengroessenaenderungen bei identischem Raster und die weiterhin ignorierten PDF-Metadaten ab. Alle zwoelf Geometrietests bestehen. Der vorhandene CI-Job fuehrt diese Testdatei bereits aus; es wurde kein neuer GitHub-Lauf gestartet.

Lesender Replay auf unveraenderten, einzeln hashgeprueften PDF-Dateien:

| Bestand                                                      | Streng exakt / Gesamt |
| ------------------------------------------------------------ | --------------------: |
| Historische 22 echte App-Faelle, jeweils zwei Uebergaenge    |               18 / 22 |
| Vier neue Tile-Rendererfaelle                                |                 0 / 4 |
| Zwei detaillierte Musterbilder                               |                 0 / 2 |
| Drei Skalierungs-/Verschiebungskontrollen                    |                 2 / 3 |
| Bestehender Desktop-Word-Tile-Hauptfall, Quelle gegen Save 2 |                 1 / 1 |

Die historischen vier rechten Sidebar-Fehler bleiben dieselben. Alte Berichte wurden nicht ueberschrieben. Insbesondere wird aus der stabilen Word-Kontrolle keine Writer- oder Produktfreigabe.

## Aktueller Word-Leser und strenger Bildvertrag

Der Leser von `94d9021` wurde lesend auf die vorhandenen Word-Dateien und Writer-Gegenbelege angewendet. Die urspruengliche typisierte Word-Reparaturdatei besteht die untersuchten Paketmerkmale, verlangt aber beim erneuten Oeffnen wieder Reparatur. Es gibt keinen zweiten abgeschlossenen reparaturfreien Zyklus und keine zweite echte Rueckdatei. Der zweistufige Ruecklaufbefehl wurde deshalb nicht mit einer Selbstkopie gefuettert. Eine bestandene Paketpruefung widerlegt den beobachteten Word-Oeffnungsfehler nicht.

Die einfachen Rich-Text-Varianten bleiben wegen `untyped-picture-control` abgelehnt. Die Tile-Varianten werden vom aktuellen unveraenderten Leser aus **beiden** Gruenden abgewiesen: `untyped-picture-control` und `non-picture-text-in-picture-control`. Physisch erhaltene Bildbytes und eigene Drawings werden nur als Mechanismusdiagnose ausgewiesen; sie machen den strengen Vertrag nicht erfolgreich. Der urspruengliche Bildvertrag und seine Textverbote wurden nicht gelockert.

Der Word-Leser meldet bei den Writer-Dateien ausserdem veraenderte Kontrollverschachtelung, obwohl Feldtokens und kanonische Story-Rollen gleich bleiben. Beim Hauptfall betrifft das 77 von 79 Instanzen; dieselbe Zahl tritt bereits in der unveraenderten typisierten Writer-Negativkontrolle auf. Diese Differenz ist kein neuer Tile-spezifischer Textverlust. Alle untersuchten Word-Ruecklaeufe behalten dagegen auch diese Verschachtelungsmerkmale. In dieser Fortsetzung wurde Word nicht erneut bedient; vorhandene, vorher tatsaechlich gespeicherte Ruecklaeufe wurden neu ausgewertet.

## Verifikation und abgeschlossene bestehende CI

- 135/135 gezielte Python-Pruefungen auf dem aktualisierten Checkout: 51 Word-Leser, 12 Ruecklauf, 8 Import, 26 Bildbesitz, 11 Inhalt, 7 Medien, 12 Geometrie und 8 PDF-Clipping.
- 8/8 gezielte Renderer-Tests, einschliesslich aller fuenf neuen Variantenpruefungen. Der zuvor dokumentierte Linux-Gesamtlauf mit 1495 Tests bleibt an seinen damaligen Arbeitsstand gebunden.
- Lokale Python-Version 3.13, PyMuPDF 1.26.4, Pillow 11.3.0, lxml 6.1.1 und pypdf 6.10.0; Abhaengigkeiten nur in der isolierten Artefakt-Umgebung ergaenzt.

Die bei der Uebergabe offenen GitHub-Laeufe auf `7035fc228bd41be771f86b898c6155d7f6b2fed1` sind jetzt abschliessend gelesen: [Release 41188610365](https://github.com/modebrecht/cv-cover-charm/actions/runs/41188610365) besteht Fast-Checks, alle elf Browsergruppen und die Statusveroeffentlichung; der optionale native Druckbenchmark ist uebersprungen. [Native 41188610434](https://github.com/modebrecht/cv-cover-charm/actions/runs/41188610434) endet mit 12/15 erfolgreichen Jobs. Die drei Fehler bleiben Bildbesitz/Originalpixel im App-Job, historischer Bildpaket-Pin und fehlende urspruengliche `gotoRange`-Auswahl nach drei begrenzten Importen. Jobschritte und Fehlerlogs wurden getrennt gelesen. Diese GitHub-Ergebnisse bestaetigen den gepushten Stand; die neuen lokalen Aenderungen wurden nicht auf GitHub ausgefuehrt.

Alle neuen Rohartefakte und Hilfsprogramme liegen lokal unter `artifacts/word-desktop-31okt/`. Keine Nachreparatur gespeicherter Pakete, keine geaenderten Referenzhashes, kein Produktionsfix und kein Commit, Push oder Merge-Commit in dieser Fortsetzung.
