# Desktop-Word und freie Bildzuordnung, 31. Oktober 2026

**Begrenzter Fortschritt, keine Produktionsfreigabe und kein Merge.** Der bisherige direkte Kandidat verlangt in Desktop-Word eine Reparatur. Eine Rich-Text-Kontrolle behebt diesen Word-Fehler. Writer braucht zusaetzlich eine nichtleere Kontrollspanne; eine skalierte native Bildfuellung erhaelt dort erstmals auch die Originalpixel in allen vier freien Fotofaellen. Kontrolltyp, versteckter Bereichsmarker und weiterhin messbare Rundungsdrift verhindern eine gleichwertige Produktfreigabe.

Hashbindungen und getrennte Kriterien: [word-direct-picture-31okt.json](word-direct-picture-31okt.json).

**Aktueller Nachtrag nach Checkout-Abgleich auf `94d9021`:**
[word-tile-precision-31okt.md](word-tile-precision-31okt.md) grenzt die Skalierungsdrift mit drei neuen Writer-Speicherzyklen ein, schliesst die 2x-PDF-Pruefluecke und wertet die vorhandenen Word-Dateien mit dem vorbereiteten aktuellen Leser erneut aus. Der aktuelle strenge Bildvertrag weist Tile-Varianten sowohl wegen fehlendem Bildtyp als auch wegen Zusatztext zurueck. Jetzt bestehen 135 fokussierte Python-Pruefungen, darunter 26 aktuelle Besitzvertragstests. Die unten dokumentierten 23 Tests und Quellbindings gehoeren zur ersten lokalen Runde auf `e395d4d6`.

## Ausgangsstand und Word-Fehler

Arbeitsbasis: `e395d4d662ebbc7cf59b231efb3dcbf9bd10604f`. Die echte App-Fixture `app-body-photo-free-main` stammt aus `3972e87b` und hat SHA-256 `7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923`. Der Renderer unter `src/lib/docx-next` war zwischen diesen beiden Commits unveraendert. Das Artefakt bleibt an seinen historischen Erzeugungsstand gebunden.

Das Dossier enthaelt Beispiel-Titelblatt, Brief und Lebenslauf. Geprueft wird das frei verankerte rot/blaue Testfoto im Lebenslauf, nicht die Gestaltung des Titelblatts.

Der Nutzer oeffnete die Quelle; Word meldete nicht lesbaren Inhalt und verlangte Wiederherstellung. Nach der Wiederherstellung war das Dossier sichtbar. Der Stand wurde ueber Word separat als `free-main-word-recovered.docx` gespeichert, geschlossen und wieder geoeffnet. **Auch diese von Word gespeicherte Kopie verlangt erneut Wiederherstellung.** Der zweite Reparaturversuch wurde abgelehnt. Die Quelle blieb unveraendert.

Der strenge Paketpruefer bestaetigt in Quelle und erstem Word-Ruecklauf eine eigene typisierte Fotokontrolle mit einem Drawing und einer gueltigen Bildbeziehung. Originalbytes, 120 x 180 RGBA-Pixel, Feldreihenfolge, XML-Text und Tabellenraster sind erhalten. Das beweist kein reparaturfreies Wiederoeffnen. Auch Microsoft Open XML SDK Validator 3.3.0 meldet fuer beide Dateien keine Office-2019-Schemafehler.

## Gezielte Rich-Text-Gegenprobe

Der echte Renderer rekonstruiert `photo-free-main`, `photo-free-low`, `photo-free-portrait` und `photo-free-chrome` mit den bestehenden normalisierten Browser-Bilddaten. Sein bisheriger direkter Modus muss dabei Byte fuer Byte den vier gebundenen CI-Quellen entsprechen. Kein Quellmodell wird umgeschrieben.

`rich-text` entfernt ausschliesslich `w:picture` aus der Fotokontrolle. Drawing, Verankerung, Zuschnitt, Rand, IDs, Originalmedien und alle anderen Paketdateien bleiben gleich.

| Word-Fall | Ohne Reparatur geoeffnet | Save/Reopen-Zyklen | Eigene Bilddaten, Feldfolge, Text, Raster |
| --------- | ------------------------ | -----------------: | ----------------------------------------- |
| main      | ja                       |                  2 | exakt erhalten                            |
| low       | ja                       |                  1 | exakt erhalten                            |
| portrait  | ja                       |                  1 | exakt erhalten                            |
| chrome    | ja                       |                  1 | exakt erhalten                            |

Beim Hauptfall wurden Quelle und der nach zwei Speicherzyklen erneut geoeffnete Stand durch Word als PDF ausgegeben. Alle drei Seiten stimmen im 2x-Pixelrender, Wort-/Bildpositionen und Seitengroessen exakt ueberein.

**Writer-Gegenbeleg:** Alle vier einfachen Rich-Text-Quellen verlieren nach dem ersten und zweiten Writer-Speichern ihr eigenes Drawing in `cv.person.photo`. Kennung, sichtbares Foto, Text und Raster bleiben bestehen. Die unveraenderte typisierte Hauptfall-Kontrolle reproduziert denselben Besitzverlust. Word-Erfolg wird deshalb nicht auf Writer uebertragen.

## Kontrollspanne und Originalbild getrennt eingegrenzt

Vier isolierte Gegenproben setzen ein verborgenes U+200B-Zeichen vor, nach oder beidseitig um das Drawing beziehungsweise sichtbare Kontrollzeichen. Ein Zeichen **vor** dem Drawing erhaelt die eigene Bildzuordnung in beiden Writer-Zyklen; ein Zeichen nur danach hilft nicht. Beidseitige Zeichen helfen ebenfalls. Die fuehrende verborgene Variante bleibt im nativen PDF pixelgleich zur bisherigen direkten Quelle. Diese A/B-Gegenprobe grenzt eine positionsabhaengige leere Kontrollspanne ein; sie misst keine interne C++-Lebenszeit.

Eine WPS-Ellipse mit einfacher Bitmap-Stretchfuellung behaelt mit diesem Marker die Originalbytes und RGBA-Pixel, behandelt aber den benoetigten Zuschnitt anders. Negative Ziel-FillRect-Koordinaten stellen das bisherige sichtbare Bild wieder her, fuehren beim Speichern jedoch wieder zur Neurasterung. Das sind verworfene Gegenproben, keine angenommenen Reparaturen.

`rich-text-tile` verwendet stattdessen die Originalbitmap als native WPS-Formfuellung mit expliziten 96 DPI, Skalierung und Verschiebung. Die Transformation entsteht aus Originalgroesse und bestehendem Crop; kein Bild wird vorab zugeschnitten. Aeussere Verankerung, Formkontur und Randgeometrie stammen vom bestehenden Renderer. Genau ein fuehrendes verborgenes U+200B-Zeichen bildet die nichtleere Kontrollspanne.

## Frische native Vierermatrix

Engine: hashgepruefte unveraenderte Pakete fuer LibreOffice 25.8.7.3; bestehender LibreOfficeKit-C-Adapter mit unveraendertem Quell-Digest. Lauf isoliert in WSL. Fehlende Hostbibliotheken und TinyCC wurden nur in Diagnose-/Tempordner entpackt; keine Systeminstallation und kein Engine-Patch. Diese lokale Umgebung ist nicht identisch mit dem CI-Host; Compiler und Manifestbindungen stehen im JSON.

| Tile-Fall | Seiten je Phase | Eigene Bildzuordnung ueber 2 Saves | Originalbytes/RGBA | Seitenpixel und Wortpositionen | Rohe Bitmaprahmen exakt |
| --------- | --------------: | ---------------------------------- | ------------------ | ------------------------------ | ----------------------- |
| main      |               3 | ja                                 | exakt erhalten     | exakt stabil                   | nein                    |
| low       |              11 | ja                                 | exakt erhalten     | exakt stabil                   | nein                    |
| portrait  |               3 | ja                                 | exakt erhalten     | exakt stabil                   | nein                    |
| chrome    |              13 | ja                                 | exakt erhalten     | exakt stabil                   | nein                    |

Alle 12 DOCX- und 12 PDF-Phasen sind durch SHA-256 gebunden. Feldkennungen samt Reihenfolge, XML-Text **innerhalb dieser Variante** und Tabellenraster bleiben exakt erhalten. Insgesamt wurden 90 native PDF-Seiten dieser Matrix ausgewertet.

Trotz pixelgleicher synthetischer Seiten driften rohe PDF-Bitmaprahmen gegen die Quelle nach zwei Saves um maximal 0.03529070 mm (main/low/chrome) beziehungsweise 0.05291451 mm (portrait). Die Bitmap wird innerhalb der Form gekachelt und beschnitten; rohe Bildrahmen sind deshalb nicht gleich dem sichtbaren Formrand. Daraus folgt keine exakte serialisierte Geometriefreigabe.

**Zusaetzlicher sichtbarer Gegenbeleg:** Fuer main und portrait wurde ausschliesslich die Foto-Mediendatei durch ein nichtuniformes synthetisches 120-x-180-RGBA-Muster ersetzt. Das sind abgeleitete Diagnosepakete, keine unveraenderten App-Quellen und keine Nutzerfotos. Originalpixel und Bildzuordnung bleiben ebenfalls erhalten. Der normale 2x-Seitenrender bleibt gleich, ein 8x-Fotobereichsrender zeigt jedoch nach dem ersten und zweiten Save jeweils 23186 geaenderte Pixel im Hauptfall und 41252 im Hochformat. Die unveraenderten Toleranzen bleiben bestehen. Der Tile-Kandidat scheitert damit auch an einer tatsaechlich sichtbaren hochaufgeloesten Speichergeometrie, nicht nur an XML- oder Rohrahmenwerten.

## Implementierung und Grenzen

`directPictureVariant` bietet getrennte Diagnosevarianten `picture`, `rich-text` und `rich-text-tile`. Jede explizite Variante verlangt `directPictureOwnership: true` und `allowUnacceptedModelIssues: true`. Der normale Export und der bisherige direkte Modus ohne neue Variante bleiben bytegleich. Inline-Faelle und Vorlagen ohne Foto werden nicht veraendert.

- 1495/1495 Unit-Tests unter Linux, darunter fuenf neue Variantentests.
- 23/23 unveraenderte adversarielle Besitzvertragstests.
- Typpruefung, Lint und Format der geaenderten Dateien bestanden.
- Die vier echten bisherigen App-Quellen werden bytegleich rekonstruiert; neue Ausgaben sind deterministisch und veraendern das Quellmodell nicht.

**Der strenge typisierte Bildvertrag bleibt unveraendert und weist beide Rich-Text-Varianten weiter zurueck.** Kontrolltyp und versteckter Zusatztext sind bewusste semantische Aenderungen, keine gelockerten Tests. Die neue Form ist auf der Fotoseite zudem nicht pixelidentisch zum bisherigen Picture-Primitiv. Produktgleichwertigkeit und Bildbearbeitung sind noch nicht abgenommen.

**Gesonderter Tile-Word-Hauptfall abgeschlossen:** Die frisch erzeugte Rendererquelle wurde in Word ohne Reparatur geoeffnet, zweimal separat gespeichert, geschlossen und wieder geoeffnet. Eigene Bildbeziehung, Originalbytes/RGBA, Feldreihenfolge, Text samt Bereichsmarker und Raster sind exakt erhalten. Quelle und zweiter erneut geoeffneter Ruecklauf wurden durch Word als PDF ausgegeben: alle drei 2x-Seitenpixelbilder, Seitengroessen, Wort-/Bildrahmen und der 8x-Fotobereich stimmen exakt ueberein. Das ist ein begrenzter Word-Nachweis fuer den Hauptfall, keine Vierer- oder 22er-Tile-Word-Freigabe.

SDK-Zusatzbefund: Die neuen Tile-Quellen und der erste Word-Ruecklauf bestehen die Office-2019-Schemapruefung. Der zweite Writer-Ruecklauf meldet acht Schemafehler an Tabellenalignment und Font-Zeichensaetzen; dieselben acht Fehler treten bereits in der unveraenderten typisierten Writer-Negativkontrolle auf. Sie wurden nicht durch gespeicherte XML-Reparaturen verdeckt und werden nicht als neue Tile-Ursache ausgegeben.

Keine vollstaendige 22er-Produktabnahme, keine Behebung der bekannten rechten Tabellenrasterdrift und keine nachtraegliche Reparatur gespeicherter Pakete. Sperren bleiben geschlossen; kein Commit, Push oder Merge in dieser Runde.

Alle lokalen Dokumente, PDFs, Rohanalysen und Werkzeuge liegen im ignorierten Verzeichnis `artifacts/word-desktop-31okt/`. Private Screenshots und Dokumente werden nicht ins Repository aufgenommen. Reproduktion der vier Rendererquellen:

```text
bun scripts/docx-next-rich-picture-probe.ts VERIFIED_CI_FIXTURES OUTPUT_DIRECTORY
```

Naechster enger Schritt: Die nun auch sichtbar belegte native Tile-Transformationsdrift eingrenzen und Gleichwertigkeit sowie Bearbeitung des neuen Kontrolltyps beurteilen, bevor eine breitere Produktintegration erwogen wird. Die vorhandenen detaillierten Gegenbelege verhindern, dass der normale 2x-Render versehentlich als vollstaendige Geometriefreigabe gewertet wird.
