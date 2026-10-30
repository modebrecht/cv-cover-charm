# Bildverlust im nativen Import eingegrenzt, 30. Oktober 2026

**Keine Produktions- oder Word-Freigabe.** Neue Messung am unveraenderten,
hashgeprueften LibreOfficeKit 25.8.7.3: Die aktive Bildfuellung ist bereits nach
dem Oeffnen beschnitten, vor jedem Speichern. Die urspruengliche DOCX bleibt
bytegleich. Der neue Beobachter veraendert keine geladenen Dokumente.

## Exakte Bildkontrollen

Eine unveraenderte synthetische App-Quelle ist jetzt dauerhaft als Testfixture
gebunden. SHA-256:
`7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923`.
Das Foto ist das bekannte undurchsichtige rot-blaue Testmuster mit 120x180
Pixeln. Alle Kontrollen behalten genau dieselben Bildbytes und alle anderen
Paketbestandteile. Im Haupt-XML variieren nur Form, Zuschnitt oder Kontrollart.

| Originalimport, noch kein Speichern | Aktive Pixel | Originalpixel | Native Bildkontrollen |
| --- | --- | --- | --- |
| Verankerte Ellipse, zugeschnitten | 96x96 | verloren | 1 |
| Verankertes Rechteck, derselbe Zuschnitt | 120x180 | erhalten | 1 |
| Verankerte Ellipse, Zuschnitt null | 120x180 | erhalten | 1 |
| Verankertes Rechteck, Zuschnitt null | 120x180 | erhalten | 1 |
| Inline-Ellipse, zugeschnitten | 96x96 | verloren | 1 |
| Block-Bildkontrolle, zugeschnittene Ellipse | 96x96 | verloren | 0 |

Die 96x96-Pixel-Fuellbitmap ist **exakt** der ganzzahlige Ausschnitt
`[10,44,106,140)` aus dem Original: identische dekodierte RGB-/RGBA-Werte,
SHA-256 `76485387d2173fe1f8aec1cd93ce77e38d3a894d919915e2eb7fa6c7acf5ef19`.
Das entspricht der Rundung der authored srcRect-Werte
`8400/24400/11600/22267`. Es ist in diesem Fall kein belegtes Herunterskalieren
auf eine neue DPI-Zahl. Die fruehere Bezeichnung Neurasterung war ungenauer als
der jetzt direkt gemessene destruktive ganzzahlige Zuschnitt.

Der versionsgebundene [Importer](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/oox/source/drawingml/fillproperties.cxx)
passt zu dieser Messung: `GraphicProperties::pushToPropMap` ruft bei positivem
Zuschnitt und `mbIsCustomShape` die Funktion `lclCropGraphic` auf. Diese schneidet
die Bitmap an gerundeten Pixelkanten zu. Rechtecke benutzen hier ein natives
Graphic-Objekt, Ellipsen eine CustomShape-Fuellbitmap. Der Aufruf wurde aus dem
passenden Quelltext gelesen; ein interner Laufzeit-Breakpoint wurde nicht gesetzt.
Die direkte Bitmapmessung und die kontrollierten Form-/Zuschnittspaare sind
unabhaengige tatsaechliche Laufzeitbelege.

## Bildkennung und Anker sind ein zweiter Fehler

Die weiterhin vorhandene native Bildkontrolle liefert bei beiden Bildarten
eine leere sichtbare Zeichenkette. Das allein beweist keinen Bildverlust.
Die oeffentlichen Bereichsvergleiche unterscheiden jedoch die Anker: Der freie
Anker liegt auf der Startgrenze der Kontrolle, der Inline-Anker danach und vor
deren Ende. Diese Werte werden roh erfasst und nicht als Ersatz fuer die
strenge eigene Bildbeziehung beim gespeicherten Paket ausgegeben.

Die Absatz-/Blockkontrolle behaelt zwar ihre XML-Kennung nach dem Speichern,
ist aber im nativen ContentControl-Supplier schon nach dem Laden nicht vorhanden.
Sie verschiebt zudem das Layout: Die Nullhoehenvariante wird von `exact` auf
`atLeast` umgeschrieben und bewegt den Text beim ersten Speichern um rund
0.194045 mm. Ein stabiler Ein-Twip-Absatz veraendert bereits die Ausgangsgeometrie
um rund 0.017656 mm. Diese Wege sind deshalb verworfen.

## Gegenversuche und klare Grenzen

Die zusaetzlich geprueften Darstellungen ueber `fillRect` (Dev 26.8) und `tile`
(gepinnte 25.8.7.3) erhalten
zwar die Originalpixel, aber nicht denselben sichtbaren Zuschnitt. Im untersuchten
Picture-Import werden diese alternativen Parameter nicht gleichwertig umgesetzt.
Eine gruen gemeldete Pixelidentitaet waere hier kein Produktfix. Diese Kontroll-
quellen bleiben ausdruecklich unangenommen; bestehende Grenzen bleiben bestehen.

Ein geplanter Ein-Schritt-Ankerversuch auf einer veraenderbaren Wegwerfkopie
wurde vor dem Setzen der Ankerposition abgebrochen: Die oeffentliche Cursor-
Bewegung lieferte keine strikt innere Position. Daraus wird kein Reparaturnachweis
und keine Aussage ueber alle moeglichen internen Positionen abgeleitet.

Der neue Importnachweis besteht aus sechs ausschliesslich lesenden nativen
Ladevorgaengen und **null Dokumentexporten**. Andere, getrennte Geometrie-
Gegenversuche haben ihre eigenen Save/Reopen-/PDF-Exporte. Die Messung ist auf
die gebundene undurchsichtige Fotoquelle begrenzt; eine separate native
Transparenzmaske wird nicht gemessen. Desktop-Word ist weiterhin ungeprueft.

## Reproduktion und CI

```sh
python scripts/docx-next-picture-import-test.py
python scripts/docx-next-picture-import-qa.py \
  tests/fixtures/docx-next/picture-import /tmp/picture-import \
  --engine /tmp/docx-next-app-body/setup/runtime \
  --binding /tmp/docx-next-app-body/uno-binding/binding
```

Die vorhandenen Setup-Skripte bauen genau diese isolierte Engine und Bindung.
Die CI sammelt den neuen Nachweis getrennt nach der regulaeren App-Matrix und
bewahrt ihn auch bei den bestehenden Fehlern auf. Die normale App-Komposition
und ihre Freigabekriterien bleiben davon unabhaengig.

Der vorausgehende Release-Lauf auf `84df3749` ist nun vollstaendig erfolgreich:
1490 Unit-Tests und alle elf Browsergruppen. Die native Matrix bleibt 12/15;
Bildbesitz, historischer Paket-Pin und die begrenzte gotoRange-Beobachtung bleiben
offen. Dieser neue Arbeitsstand wird gesondert geprueft.

Naechster fachlicher Schwerpunkt: den urspruenglichen textfreien Fotofall mit
zwei Speicherzyklen in Desktop-Word pruefen. Ein quellgetreuer Fix fuer Writer
muss die Importbehandlung von zugeschnittenen CustomShape-Bildern und die
Kontroll-Ankergrenze beruecksichtigen; weitere DPI-Schalter oder das Beilegen
eines unbenutzten Originalbildes liefern dafuer keinen Nachweis. Kein Merge.
