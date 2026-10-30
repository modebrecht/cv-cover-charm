# Direkt verankertes Einzelbild: CI-Auswertung, 30. Oktober 2026

**Entscheidung: keine Freigabe, kein Merge.** Der Versuch bewahrt sichtbare
Inhalte, loest aber weder die Bildzuordnung nach Writer-Speichern noch die
unveraenderten Bilddaten. Vier rechte Sidebar-Faelle driften ausserdem weiter.
Dies sind Befunde des isolierten Kandidaten, keine neue Word-Abnahme.

## Gepruefter Stand

- Code: `3972e87b2723dd9199b184ec1e0936c9e9c2617f`.
- [Native Matrix](https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788805):
  14/15 Jobs erfolgreich, einschliesslich aller zehn Vorlagengruppen,
  `stable-comparison`, `entry-flow-content`, `supported-sidebar`, `app-body-content`.
- [Release-Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788695):
  erfolgreich; 1490 Unit-Tests, Format, Typpruefung, Lint, Build und elf
  Browsergruppen erfolgreich. Der optionale native Print-Benchmark wurde uebersprungen.
- `picture-identity` scheitert vor den nativen Bildpruefungen am bekannten Pin:
  aktuell `61444b4077529c8eff3ec14013f744c63066995947ec51f3613551e3dc821032`,
  erwartet `8dfabf25a4097cc4ce6065e5a8998713bbd37bc4dfe15bd3e317d22850ac92df`.
  Der Pin wurde nicht ersetzt. Dieser Job liefert keine neue Bildfreigabe.

## Verifizierte Artefakte

[App-Archiv 12989866764](https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788805/artifacts/12989866764),
SHA-256 `f18a21fb52a7c92150df42c447c0c2f10dc42e01bbe503ca108126f0a83a4d73`.
Das heruntergeladene Archiv stimmt mit dem GitHub-Digest ueberein. Alle 66
DOCX- und 66 PDF-Hashes wurden gegen die Phasenbelege geprueft; der Inhaltsbericht
stimmt mit dem im Geometriebericht gebundenen SHA ueberein.

Die vollstaendige Auswertung mit Feldnamen, Phasen, exakten Koordinaten, Rastern,
Medien-Hashes und Bildzuordnung steht in `direct-picture-ci-30okt.json`.
Es wurden ausschliesslich vorhandene Artefakte gelesen und dekodiert: kein neuer
nativer Lauf, kein Export und kein erneuter Aufbau der Testumgebung.

## Inhalt und Geometrie

22/22 Faelle bestehen die vorhandene Inhaltspruefung ueber Quelle und zwei
Speicherzyklen. Dieser Vertrag sichert Kennungen, Texte, Reihenfolge und sichtbare
Fotos; er beweist keine fortbestehende Bildzuordnung innerhalb der Kontrolle.

18/22 Faelle bestehen exakte sichtbare, serialisierte und oeffentliche
Rasterstabilitaet. Folgende vier scheitern in beiden Speicheruebergaengen:

| Fixture | Raster Quelle (Twips) | nach 1x Speichern | nach 2x Speichern |
| --- | --- | --- | --- |
| app-body-both-long-right | 6508,341,2789 | 6507,341,2790 | 6506,341,2791 |
| app-body-right | 6508,341,2789 | 6507,341,2790 | 6506,341,2791 |
| app-body-photo-right | 6508,341,2789 | 6507,341,2790 | 6506,341,2791 |
| app-body-photo-free-mirrored-side | 6508,341,2789 | 6507,341,2790 | 6506,341,2791 |

Die Tabelle bleibt insgesamt 9638 Twips breit; je Zyklus wandert ein Twip von
der linken in die rechte Spalte. Maximale Wortverschiebung pro Uebergang:
0.017656114366319444 mm horizontal, 0 mm vertikal. Seitenzahl und Wortfolge
bleiben in allen 22 Faellen gleich. Auch Pixelbilder aendern sich in diesen vier
Faellen. Es wurde keine Toleranz vergroessert.

Der gruene Job `app-body-content` bestaetigt die erfolgreiche Sammlung des
Geometrieberichts. Dieser meldet ausdruecklich `exactVisibleGeometryAcceptance:
fail`, `exactSerializedGeometryAcceptance: fail`, `exactPublicGridStabilityAcceptance:
fail`, `geometryAcceptance: unaccepted`, `productionAcceptance: blocked`.
Der Workflow ruft den Geometriesammler ohne `--require-stable` auf.

## Fotopositionen

Delta der linken Bildkante in mm, aus den PDF-Bildrahmen, nicht aus dem groben
Farbraster. Alle Hoehenkoordinaten bleiben ueber die Speicherzyklen unveraendert.
Die JSON-Datei enthaelt alle vier Rahmenkoordinaten pro Phase.

| Fixture (Praefix app-body-) | Quelle -> gespeichert | gespeichert -> gespeichert2 | Gesamt |
| --- | ---: | ---: | ---: |
| photo-left | 0 | 0 | 0 |
| photo-right | -0.01763458 | 0 | -0.01763458 |
| photo-main | 0 | 0 | 0 |
| photo-free-main | 0 | 0 | 0 |
| photo-free-side | 0 | 0 | 0 |
| photo-free-mirrored-side | -0.01763458 | -0.01763458 | -0.03526917 |
| photo-free-low | 0 | 0 | 0 |
| photo-free-portrait | 0 | 0 | 0 |
| photo-free-chrome | 0 | 0 | 0 |

Damit sind 7/9 Fotopositionen stabil. Die vier wirklich frei verankerten
Quellbilder sind `free-main`, `free-low`, `free-portrait`, `free-chrome`.
`free-side` und `free-mirrored-side` sind trotz ihres Fixture-Namens bereits im
normalisierten Quellmodell inline. Sie pruefen diese neue Verankerung nicht.
Positionsstabilitaet ist kein Nachweis, dass die Erstposition mit der App-Vorschau
oder Desktop-Word uebereinstimmt.

## Zusaetzlicher Befund: Bildzuordnung geht verloren

Bei allen vier tatsaechlich direkt verankerten Quellbildern enthaelt die
`cv.person.photo`-Kontrolle anfangs genau ein Drawing mit einem eingebetteten
Bild. Nach dem ersten und zweiten Writer-Speichern bleibt die typisierte
Kontrolle mit ihrer Kennung erhalten, ihr `sdtContent` enthaelt jedoch nur leere
Runs: kein `w:drawing`, kein `a:blip`. Das Foto bleibt ausserhalb dieser Kontrolle
sichtbar. Die fuenf Inline-Faelle behalten dagegen eine Bildbeziehung in der
Kontrolle. Dies ist eine XML-Feststellung; die native Import-Objektlebenszeit
wurde hier nicht gemessen.

Die vorhandene Inhaltspruefung erkennt diese Differenz nicht. Kennungserhalt
und globale Fotosichtbarkeit sind deshalb keine hinreichende Besitzfreigabe.

## Zusaetzlicher Befund: Bilddaten werden neu gerastert

Alle neun Quellfotos besitzen 120x180 RGBA-Pixel. Nach dem ersten Speichern
besitzen acht 96x96, `photo-free-portrait` 73x91 Pixel. Die Bilddaten und ihre
dekodierten RGBA-Hashes unterscheiden sich damit in allen neun Faellen von der
Quelle. Zwischen dem ersten und zweiten Speichern bleiben Groesse und RGBA-Pixel
je Foto exakt gleich (0 geaenderte Pixel). Dies ist keine reine Umkodierung.
Die beiden 1x1-Dekorationsbilder wurden getrennt von den Fotos behandelt.

Wenn eine Kontrolle kein Bild mehr besitzt, wird fuer die unabhaengige
Medienpruefung nur das einzige groessere Nicht-Dekorationsbild im Paket gelesen;
daraus wird ausdruecklich keine fortbestehende Kontrollzuordnung abgeleitet.

## Naechster begrenzter Schwerpunkt

Zuerst den Verlust der Bildzuordnung der vier verankerten Kontrollen bearbeiten.
Den bestehenden QA-Vertrag um diesen tatsaechlichen Quell-/Speicherbefund
ergaenzen, sodass leere Bildkontrollen nicht als Besitznachweis gelten. Danach
Bilddaten-Erhalt und rechte Rasterdrift getrennt loesen. Historische Pins und
exakte Grenzen bleiben erhalten. Desktop-Word muss fuer diese Architektur
gesondert geprueft werden. Bis dahin keine Integration oder Produktionsfreigabe.
