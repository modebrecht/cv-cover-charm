# Referenzzeilen nutzen belegte Spalten

**Benutzerrückmeldung am 25. Oktober zur aktualisierten Datei:** «sieht super aus, lässt sich wie ein normales bild verschieben done». Die Darstellung wird positiv bewertet und die normale Fotobewegung ist in Word abgenommen. Der unten genannte offene Foto-Bedienungsnachweis ist damit erledigt. Ein separater Referenz-Zeilenumbruch-Nachweis oder gespeicherter DOCX-Rücklauf wurde damit nicht geliefert; keine weitere Speichermatrix anfordern.

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangskopf `f78304e91d2c2ac8c378900f6e2ab20f9177379e`.

## Änderung

Eine allein stehende Referenz belegte bislang die erste Hälfte eines Rasters,
dessen zweite Hälfte leer blieb. Das machte den bekannten Schrift-/Breiten-
Grenzfall bei «Klassenlehrer, Schulhaus Zentrum» sichtbar. Die Änderung ist eine
allgemeine Layoutregel für Vorschau und DOCX Next: Eine ungepaarte Referenz
nutzt die volle Rubrikzeile. Zwei belegte Referenzen bleiben nebeneinander;
bei drei Referenzen erhält die letzte die volle Zeile. Leere Eingabeslots
zählen nicht als belegte Referenzen.

Schriftgrösse, Wortlaut, Feldzuordnung und Formatierung werden nicht verändert.
Es gibt keine vom konkreten Referenztext abhängige Breitenzugabe. Echte Paare
behalten ihre beiden gleich breiten Textspalten und den bestehenden Abstand.
Gestapelte/halbe Rubriken bleiben gestapelt. Zusätzlich folgt die native Sidebar
nun derselben Bereichsregel wie der Canvas: Referenzen im Sidebar-Bereich
bleiben untereinander und bekommen keine zusätzliche innere Halbierung.

Die Quellregel wirkt im gemeinsamen CV-Canvas und im nativen Next-Modell.
Sie ist keine Änderung am historischen Legacy-DOCX-Exporter und kein Nachweis
vollständig identischer Schriftformung aller Office-/Browser-Schriften.

## Verifikation

- Neue echte React-SSR-Prüfung: links/rechts, eine/zwei/drei Referenzen,
  zusätzliche leere Editorzeile und native Sidebar-Stapelung. Nur sichtbare
  CV-Seiten werden gezählt, nicht der zusätzliche verborgene Messbaum.
- Bestehende Layout-/Tabellen-/Typografieprüfungen werden auf die neue
  Belegungsregel aktualisiert; explizite Paarabstände bleiben geprüft.
- Gesamte Unit-Suite: **1425 PASS / 0 FAIL**, 277 Dateien,
  27072 Erwartungen. Vollständiges TypeScript und Produktionsbuild PASS;
  geänderte ESLint-/Prettier-Dateien PASS.
- Aktueller vierseitiger Gesamt-DOCX intern gerendert, alle vier Seiten visuell
  geprüft. Die vollständige Referenz-Funktionszeile steht auf einer Zeile bei
  unveränderten **10,5 pt**. Native einzelne Referenzzelle: **6746 Twips**;
  frühere erste Halbspalte: 3220 Twips.
- Alle **144 Textfeldvorkommen einschliesslich Formatmarkup** in Body/Kopf-/
  Fusszeilen stimmen mit der vorherigen Fotofassung überein. Der vollständige
  Text, das Originalbild und sein kompletter nativer Anker/Bild-Unterbaum bleiben
  gleich. Im Paket verändert sich nur `word/document.xml`.
- Titelblatt, Brief und erste CV-Seite sind im internen PDF pixelidentisch;
  nur die zweite CV-Seite enthält die neue Referenzanordnung.

Keine frische Browser-PDF wird behauptet: Der Canvas wurde als tatsächlicher
React-Renderer mit den serialisierten CSS-Rastern geprüft. In dieser Umgebung
liegt kein lokales Chromium-Executable mehr vor. Microsoft Word konnte der
Agent ebenfalls nicht selbst ausführen. Die interne einzeilige Darstellung
ist deshalb keine bereits erfolgte Word-Abnahme.

## Reproduktion und Datei

```sh
bun scripts/docx-next-letter-source-flow-probe.ts ASSET_DIRECTORY NEW_OUTPUT --ordinary-photo
```

Der QA-Replay stellt vor dem historischen Kontroll-Render ausschliesslich dessen
leere Referenz-Halbspalte wieder her; der Kontroll-DOCX bleibt dadurch bytegenau
`5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`.
Diese explizite inverse QA-Transformation wird nicht auf den Kandidaten oder
auf Benutzerdaten angewendet. Der Bericht bezeichnet die CV-Komposition deshalb
nicht mehr als unverändert gegenüber der historischen Kontrollquelle.

Die vorhandene **CV-Foto.docx** wurde unter derselben Dateiidentität aktualisiert.
Neuer SHA-256:
`82d28fb2d2a452f53ae1e7417084f4da9c113bb3c1acab09d7ba3fa8a7442210`.
Kein neues Dateinamen-/Save1-/Save2-Protokoll wird angefordert. Die alten
Prüfpakete werden nicht neu erstellt und ihre Hash-Verträge bleiben unverändert.

Die gewöhnliche Foto-Komposition und die Korrektur der zusätzlichen Body-Zeile
bleiben erhalten. Tatsächliche Word-Pagination/Fotobedienung und die Darstellung
dieser aktualisierten Fassung bleiben vom Benutzer noch nicht bestätigt.
Rubrikverschiebung ist auf Benutzerentscheid optional. Kein Merge, kein Deploy
und keine Öffnung des normalen Sidebar-Exportgates. Uploads und Office-/
Diagnoseausgaben bleiben ausserhalb von Git.
