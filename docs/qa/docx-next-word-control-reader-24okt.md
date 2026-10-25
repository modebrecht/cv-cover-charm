# Word-Control-Vergleich nach Quellkennung und Dokumentbereich

24. Oktober 2026, Arbeitsbranch `fix/docx-next-shared-integration-22okt`, Basis `9e7579c08527310d8b21bba2807924fb0c8de463`.

Der bisherige Vergleichsleser konnte wiederholte Quellkennungen in Erstkopf, Folgekopf und Haupttext nicht unabhängig zuordnen. Seine globale Eindeutigkeitsprüfung schlug deshalb auch für ein unverändertes Kontakt-DOCX fehl. Umgekehrt erfasste die Crop-Prüfung nur DrawingML-`srcRect`: Änderungen an `fillRect` oder VML-Crop-/Füllattributen konnten unbemerkt bleiben. Dieser Checkpoint korrigiert den Prüfer. Er ändert keinen Exporter und vergibt keine neue Office-Abnahme.

## Getrennte Prüfaussagen

- `fields` bewahrt die bisherige Ansicht nach Tag-Schlüssel. Ein mehrfach verwendeter Tag bleibt dort global nicht eindeutig. Diese Eigenschaft allein bedeutet nicht, dass ein Control verschwunden ist.
- `instances` prüft jedes Quellvorkommen separat anhand seines Tags und der referenzierten Abschnitts-/Story-Rolle. Header-Dateien dürfen beim Office-Speichern umbenannt werden. Die Zuordnung folgt den Paketbeziehungen und Abschnittsreferenzen; sie sucht nicht nach gleichem sichtbarem Text.
- Haupttext wird ebenfalls nach Abschnitt unterschieden. Ein verschobenes Control aus dem CV kann nicht durch denselben Text im Anschreiben ersetzt werden. Controls im Abschnitts-Endabsatz gehören noch zum endenden Abschnitt.
- Gleichnamige Mehrfachvorkommen innerhalb derselben Rolle bleiben ohne eindeutige persistierte Word-ID mehrdeutig. Es gibt keine Paarung nach Reihenfolge oder Wert. Numerisch gleiche IDs wie `+00101` und `101` gelten als Kollision. Referenzfehler und doppelte Header-Rollen werden abgewiesen.
- Texttokens, kanonischer Dokumentbereich, physischer Partname, Control-Verschachtelung und persistierte Absatzmetadaten bleiben getrennte Ergebnisse. Eine veränderte Absatzstruktur beweist keine intern gemessene Objekt-Disposal-Ursache.
- Bildprüfung unterscheidet aktiven typisierten Besitzer, Originalpixel im Besitzer, Pixel an anderer Stelle und bloss unbenutzte Medien. `srcRect`, `fillRect` und VML-Attribute werden getrennt erfasst. Ein ursprüngliches Crop-Fenster wird nach Pixelverlust oder bei nicht vergleichbaren Füll-Koordinaten nicht rechnerisch als gleich erklärt.

`sourceFields` und `savedFields` zählen aus Kompatibilitätsgründen alle unterschiedlichen getaggten Schlüssel, einschliesslich erzeugter Absatz-/Layoutträger. `instances` zählt deren Vorkommen. Das sind keine Zahlen ausschliesslich editierbarer Benutzerfelder. Bildbesitz und der Erhalt kanonischer App-Felder müssen zusätzlich ausgewertet werden.

Microsoft beschreibt `w:tag` als programmatische Kennung und `w:id` als numerische Control-Identität. Fehlt eine ID, darf Word beim Öffnen eine vergeben; eine fehlende numerische ID ist daher für sich kein Beleg einer ungültigen Datei oder der Ursache eines Control-Verlusts. Gleiche Tags erzeugen auch keine automatische synchronisierte Bearbeitung. Quellen: [Tag](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tag?view=openxml-3.0.1), [SdtId](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtid?view=openxml-3.0.1).

## Prüfung und Benutzung

Im ersten Checkpoint bestanden 36 adversariale Python-Tests. Nach der unten beschriebenen Bildrollen-Korrektur bestehen **51 Tests**. Sie erhalten die bisherigen Break-/Tab-, Bildpixel-, Besitzer-, Absatz-ID-, Revision- und Markup-Compatibility-Prüfungen und ergänzen wiederholte Tags, umbenannte und geerbte Header, getrennte Haupttextabschnitte, verlorene einzelne Kopf-Controls, veränderte Elternbesitzer, verwaiste Parts, ID-Kollisionen sowie VML-/`fillRect`-Änderungen. Eingabe-DOCX werden nur gelesen.

```sh
python scripts/docx-next-word-acceptance-test.py
python scripts/docx-next-word-acceptance-23okt.py source.docx saved.docx report.json
```

Die CLI nennt jetzt veränderte oder mehrdeutige Quellvorkommen, statt globale Tag-Wiederholung als Feldverlust zu zählen. Gleich gebliebene Tags oder Textwerte werden weiterhin nicht automatisch als stabile Bearbeitbarkeit ausgegeben. Auch ein Vergleich einer Datei mit sich selbst ist nur eine Kontrolle des Lesers. `wordAcceptance` bleibt `UNVERIFIED`, `saveReopenPerformedByThisTool` bleibt `false`.

Die Abschnittsrollen sind Strukturadressen, keine native Objektidentität und kein Nachweis tatsächlich dargestellter Seiten. Geänderte Abschnittszahlen, veränderte Rollenteilung und Tracked Changes benötigen eine eigene Bewertung. Eine vollständige OOXML-Schemavalidierung oder Microsoft-Word-Ausführung ist damit nicht behauptet. Die bestehenden Sidebar-Produkt- und Geometrie-Gates bleiben unverändert.

## Zweiter Checkpoint: Bildbesitz folgt demselben konkreten Control

Die erste Instanzkorrektur galt noch nicht vollständig für Bilder: Ein Original im unreferenzierten Kopf-Part konnte als aktives Bild gezählt werden. Ein aus dem Haupttext dorthin verschobenes Photo-Control erhielt sogar positive Bildbesitz-Aussagen, obwohl die separate Textinstanz korrekt als verschoben erkannt wurde. Umgekehrt konnte eine zusätzliche verwaiste Kopie einen gesunden Haupttext-Bildbesitzer fälschlich mehrdeutig machen. Diese Fälle sind mit kleinen DOCX-Gegenproben reproduziert und korrigiert.

Jedes Bild trägt nun die lokalen Adressen seiner umschliessenden Controls (`ownerOccurrences`). Sie verweisen auf die bereits anhand Kennung und Dokumentrolle zugeordnete Instanz; sie dienen **nicht** als Reihenfolge-Heuristik zwischen Dateien. `savedOccurrence` nennt die so gefundene Zielinstanz. Derselbe Foto-Tag in Haupttext und Kopf wird getrennt bewertet. Ein neues gleichnamiges Control in derselben Rolle bleibt durch den Besitzeranzahl-Vergleich auffällig; die bisherige negative Duplikatprüfung bleibt erhalten.

| Konstellation | Bildbesitz im ursprünglichen Control | Original in aktiv referenzierter Story | Original irgendwo im Paket |
| --- | --- | --- | --- |
| Haupttextbesitzer fehlt, Original nur im verwaisten Kopf | Nein | Nein | Ja |
| Haupttextbesitzer fehlt, Original in anderem referenzierten Kopf | Nein | Ja | Ja |
| Gesunder Haupttextbesitzer plus verwaiste Kopie | Ja | Ja | Ja |
| Leerer typisierter Haupttextbesitzer plus verwaistes Original | Nein; Typisierung wird separat erhalten gemeldet | Nein | Ja |
| Beziehung zum PNG ist kein Bildverweis | Nein | Nein | Ja |

Nur aufgelöste interne Beziehungen vom Typ `…/image` liefern aktive Bildpixel. Fehlende, externe und falsch typisierte Bildbeziehungen werden separat erfasst. Ungültige Relationship-Namespaces, fehlende Beziehungs-IDs sowie fehlende oder unbekannte Kopf-/Fussrollen werden abgewiesen. Die CLI zählt auch eine geänderte Besitzerrolle als fehlenden stabilen typisierten Besitzer.

15 zusätzliche Gegenproben decken diese Fehler und ihre positiven Nachbarn ab. Fünf erste Gegenproben schlugen vor der Bildkorrektur fehl; die bisherigen realen Writer-Verluste bleiben nach der Korrektur rot. Der Prüfer repariert keine Bilder und behauptet keine Word-Abnahme. [Quellstruktur, Spiegelung und hochauflösender Bildfall](docx-next-sidebar-source-structure-24okt.md).

Die Paketinventur dekodiert Bild-Parts auch ausserhalb von `word/media/`. Zwei Gegenproben sichern aktives beziehungsweise bloss unbenutztes Originalmaterial an anderen OPC-Pfaden ab. Dies ist eine Prüfung direkt dekodierbarer Bild-Parts; verschachtelte Fremdcontainer oder Base64-Nutzdaten in beliebigem XML sind keine forensisch vollständig untersuchten Originalarchive.
