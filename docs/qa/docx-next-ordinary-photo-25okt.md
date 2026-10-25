# Gewöhnliches Word Foto ausserhalb der Sidebar Tabelle

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangskopf `a03f92128ff44ab78d576521d4bd86ac9a94312f`.

## Umsetzung

Auf ausdrücklichen Benutzerauftrag wird das Foto als einzelnes gewöhnliches
DrawingML-Bild ausgegeben. `cvPhotoComposition: "ordinary-picture"` verwendet
den vorhandenen gemeinsamen Sidebar-Export. Das Bild liegt in einem nativen
Body-Absatz vor der Tabelle: kein Inhaltssteuerelement, kein Textrahmen, keine
Tabellenzelle. `layoutInCell=0`, `locked=0`, Seitenkoordinaten und `wrapNone`.
Der native Objektname bleibt `cv.person.photo`.

Automatische Bilder erhalten ihren ersten Platz aus der vorhandenen gemeinsamen
Seitengeometrie. Das anfängliche Textinset reserviert Bildhöhe, Rahmen und den
bereits verwendeten 3-mm-Abstand. Freie Bilder behalten ihre gespeicherten
Koordinaten einschliesslich Spiegelung. Der Ankerabsatz bleibt beim folgenden
Inhalt; ohne diese Bindung strandete die erste interne Fassung auf einer
zusätzlichen Fotoseite. Diese Fassung wurde verworfen. Die ausgelieferte Fassung
hat vier Seiten, alle vier wurden visuell geprüft.

## Nachweise

- Endgültiger DOCX: `CV-Foto.docx`, SHA-256
  `9e70906511454b503135f2fb9fe1804ae91be0ad061a4f39e43fd14889140155`.
- Alle 144 Textfeldvorkommen in Body/Kopf-/Fusszeilen und der vollständige Text
  bleiben gegenüber dem Brief-v2-Kandidaten unverändert.
- Ein einziges Foto: Original-PNG 1920 × 2880 bytegleich, Crop, Geometrie,
  Rahmen und 28 × 35 mm Grösse erhalten; semantischer Bild-Unterbaum unverändert.
- Nur `word/document.xml` weicht im Paket ab. Titelblatt, Brief und zweite
  CV-Seite sind im internen PDF pixelgleich zur bisherigen Brief-v2-Fassung.
  Die erste CV-Seite enthält die neue Bild-/Textanordnung, ohne Überlappung.
- Vollständige Bun-Suite: **1418 PASS / 0 FAIL**, 276 Dateien,
  27018 Erwartungen. Sechs neue Fälle behandeln automatische, Hauptspalten-,
  freie und gespiegelte Fotos sowie den verbotenen Rückweg in eine Zelle.
- Vollständiges TypeScript und Produktionsbuild PASS. ESLint und Prettier für
  alle geänderten Code-/Skriptdateien PASS.

Reproduktion mit bereits verifizierten synthetischen Assets:

```sh
bun scripts/docx-next-letter-source-flow-probe.ts ASSET_DIRECTORY NEW_OUTPUT --ordinary-photo
```

Die historische Kontrollquelle wird vor der Kandidatenerzeugung weiterhin
bytegenau reproduziert. Ohne neue Option bleiben alte Replays unverändert.

## Geänderte Bildzuordnung und Grenzen

Das bisherige Foto-SDT wird bewusst entfernt. 144 Textfelder plus ein nativ
benanntes Bild ersetzen 145 SDT-Vorkommen. Das Bild gehört weiterhin semantisch
zum Modellfeld `cv.person.photo`, aber der alte Vertrag "Bild innerhalb eines
Foto-SDT" gilt für diese Komposition nicht. Alte Leser und Freigabegates werden
nicht umgeschrieben oder gelockert; Modellvalidierung verlangt den gewöhnlichen
Bildmodus direkt im CV-Body, und der unabhängige normale Export bleibt gesperrt.

Der neue Zustand beseitigt die konkret beanstandeten Container im Export.
Tatsächliches Ziehen/Textumbruch in Microsoft Word kann der Agent hier nicht
selbst ausführen und wird nicht als bereits bewiesen ausgegeben. Die Datei wird
einzeln bereitgestellt. Der Benutzer hat weitere Umbenennungs-/Save1-/Save2-
Aufforderungen ausdrücklich abgelehnt; keine neue Speichermatrix anfordern.
Rubrikverschiebung und Referenzumbruch werden in diesem Fotofix nicht verändert.

## Einordnung der eingegangenen Rückläufe

Der vorherige Rich-Owner-Rücklauf erhielt die Originalbytes und den Crop,
verschob das Foto aber als schwebendes Bild ins Geburtsdatum-SDT; das Foto-SDT
blieb leer. Dies ist keine erfolgreiche Erhaltung des alten Besitzervertrags.

Die neuen Brief-Standard-Speicherstände haben identischen Text/Feldinhalt und
pixelgleiche vierseitige Save1-/Save2-PDFs. Eine Titeltextänderung ist bereits in
der zurückgegebenen Standarddatei vor Save1 enthalten. Word liess ausserdem
`hRule` an der weiterhin 1381 Twips hohen Empfängerzeile weg. Microsoft beschreibt
für Word bei fehlendem `hRule` den Standard `atLeast`:
https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/5919e0bd-e6ce-477e-8d66-0e5282f5c506
Diese Rohabweichung ist allein kein nachgewiesener sichtbarer Briefverlust.
Der bestehende strengere Rücklaufprüfer bleibt in dieser Fotofix-Runde unverändert.
Der breite Empfänger-Upload ist die unveränderte ursprüngliche Quelle, kein
separater gespeicherter Word-Rücklauf. Kein weiterer Briefumbau aus diesem Befund.

Uploads, Screenshots, DOCX/PDF und Diagnoseausgaben bleiben ausserhalb von Git.
Kein Merge, keine Bereitstellung, kein allgemeiner Sidebar-Freigabewechsel.
