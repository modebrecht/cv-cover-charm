# Sidebar Flächen und Aufzählungen

22. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Basis: `5c79a08bd4a637431908eb132739b005fddb2718`.

Der explizite gemeinsame Sidebar-Kandidat übernimmt jetzt die tatsächliche App-Tönung und die Reihenfolge von Motiv, Lesefläche, Sidebar und kompakten Streifen. Der zusätzliche native Seitenrand entfällt. Aufzählungspunkte behalten ihre eigene Akzentfarbe, während der Text separat editierbar bleibt. Die vier gespeicherten Modern-Projekte behalten Bilder, Crops, Feldtexte, Tabellenraster und die bereits reparierten kurzen Einträge. Der längere native Textfluss bleibt sichtbar und offen. Eine Microsoft-Word-Freigabe folgt aus dieser Reparatur nicht.

## Ursachen und Änderung

Die bisherige native Tönung verwendete `0.08 * bgOpacity`, in den geprüften Projekten also 0,02. Das ergab `FBFBFC`. Die App verwendet dagegen ihre strukturelle Sidebar-Tönung unabhängig vom Motivregler: für diese Modern-Quellen eine Alpha von 0,055 über dem tatsächlichen Papier. Frisch erfasste effektive CSS-Farben ergeben `F3F5F6`. Die native 0,25-mm-Trennkante hatte hier keinen sichtbaren Besitzer in der App und wird im gemessenen Kandidaten entfernt. Nicht unterstützte Flächenverläufe, Filter, Mischmodi und Sidebar-Rahmen werden beim Erfassen abgewiesen.

`useElements: false` unterdrückt freie Elemente, nicht die dekorativen Vorlagenmotive. Der bisherige native Modern-Kreis hatte ausserdem eine andere Geometrie und lag oberhalb der Sidebar. Die App zeichnet ihn unter Lesefläche und opakem Seitentrack. Seine authored Geometrie liegt jetzt in einem kleinen gemeinsamen Baustein: rechts −20 mm, oben 14 mm, Grösse 62 mm und Grunddeckkraft 0,07. Web und gemessener nativer Modern-Kandidat verwenden dieselben Werte. Die fünf Web-CV-Bilder bleiben nach der Extraktion dieses Bausteins bytegleich.

Die native Lesefläche verwendet die vorhandene gemeinsame `cvSurface`-Geometrie und die frisch erfasste Vollfarbe/Deckkraft. Die Schichten werden vor dem Zusammenfassen der rein dekorativen Seitenfläche geordnet: Motiv, Lesefläche, Sidebar, kompakte Streifen. Sichtbarkeit wird damit durch die tatsächliche Komposition erreicht; Motive werden nicht pauschal gelöscht. Der Motivregler steuert weiterhin deren Intensität und nicht die tragende Sidebar-Farbe. Die Prüfung mit Reglerwerten 0, 0,25 und 1 deckt diese Trennung auf Modellebene ab; die vier App-/Writer-Vergleiche verwenden 0,25. Das ist keine Abnahme aller Vorlagen.

Der erste Render zeigte eine weitere echte Überlagerung: Ein später ausgegebener Seitenhintergrund konnte Teile einer Rubriklinie verdecken. Der gemeinsame Renderer gibt zusammengesetzter Seitendekoration deshalb ausdrücklich `relativeHeight="0"`. Textbezogene Rubrikdekoration bleibt darüber. Die Reihenfolge hängt nicht mehr zufällig von der Vergabe der Drawing-IDs ab. Microsoft dokumentiert das Attribut als [relative Z-Position](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.anchor.relativeheight). Das ist eine Exportkorrektur; eine Ursache innerhalb eines Office-Importers wird nicht behauptet.

Die Aufzählungsfarbe ging bisher verloren, weil das native Nummerierungszeichen die Absatzmarkenformatierung des schwarzen Textes übernahm. Das Modell kann nun Farbe und Gewicht des Markers unabhängig vom Text tragen. Der Renderer verwendet dafür native Absatzmarken-Eigenschaften; Nummerierung, hängender Einzug und kanonischer Text-SDT bleiben erhalten. Alle zwölf sichtbaren Punkte in den vier nativen CVs haben jetzt die Quellfarbe `244A61`. Die Text-Runs behalten ihre eigene Farbe und Schrift.

Die frischen Messwerte haben Version 2, bleiben an den vollständigen Quellsnapshot gebunden und enthalten zusätzlich Flächen- und Markerformatierung. Veraltete Versionen werden abgewiesen. Der reguläre Sidebar-Einstieg bleibt geschlossen; erforderlich sind weiterhin `shared-body-stories`, frische Messwerte und der explizite interne Renderer-Kandidat.

## Prüfung

| Gespeichertes Projekt | App und native CV-Seiten | Aktive Dossier-SDTs | Foto |
| --- | --- | --- | --- |
| 03 rechts mit Folgeseite | 2 / 2 | 128 | keines |
| 05 links mit freiem Portrait | 1 / 1 | 88 | 120 × 180 Pixel |
| 06 rechts mit grossem freiem Foto | 1 / 1 | 88 | 1920 × 2880 Pixel |
| 07 rechts mit eigener Typografie | 1 / 1 | 91 | 1920 × 2880 Pixel |

Die normale App stellt jedes gespeicherte Projekt wieder her, speichert es erneut und lädt sein primäres PDF herunter. Der interne native Kandidat verwendet denselben frischen Snapshot. Gespeicherte Daten bleiben unverändert; keine erfassten JavaScript-Seitenfehler. Titelblatt und Anschreiben sind modellgleich und ihre acht nativen Seitenbilder bytegleich zur Basis. Alle fünf Web-CV-Seitenbilder sind ebenfalls bytegleich. Die Original-Textmetriken bleiben bis auf die zusätzlichen V2-Daten gleich.

Alle fünf finalen nativen CV-Seiten wurden visuell geöffnet. An 20 dokumentierten freien Sidebar-Stellen über beide Seiten und die Folgeseite stimmen die gerenderten RGB-Werte mit dem App-PDF überein. Das prüft Farbe und sichtbare Überdeckung an diesen Stellen, nicht Pixelgleichheit der gesamten Seite. Die Rubriklinien sind im finalen Render vollständig sichtbar. Alle kanonischen CV-Texte werden im nativen PDF gefunden. Feld-IDs, Texte, Crops, vollständige normalisierte Bildpixel und Tabellenraster stimmen mit der Basis überein. Die Bildrechtecke sind exakt gleich zum vorherigen reparierten Render: weiterhin rund y=210 mm, ohne neuen Gegenversatz. Schulstation 12 bleibt vollständig auf der zweiten CV-Seite. Ein erneuter 90-Zeilen-Stresstest war für diese Flächen-/Markeränderung nicht erforderlich; die gezielten Tests für lange teilbare und kurze zusammengehaltene Einträge bestehen weiterhin.

Der fokussierte Zoomvergleich mit Fall 06 liefert bei DPR 1 / 1440 px und DPR 2 / 390 px / äusserem CSS-Zoom 0,75 identische Snapshots, alle Messwerte, Modelle und DOCX-Bytes. Browseranzeige und Dokumentgestaltung bleiben damit für diese Kombination getrennt.

113 gezielte Tests in 13 Dateien bestehen mit 1755 Erwartungen. Fokussiertes striktes TypeScript einschliesslich Browser-Capture und Web-Hintergrund besteht. Die Prüfdatei [`qa-sidebar-surfaces-22okt.py`](../../scripts/qa-sidebar-surfaces-22okt.py) und der [maschinenlesbare Nachweis](docx-next-sidebar-surfaces-22okt-evidence.json) enthalten Paket-Hashes, Bildinventare, Positionen und Farbstellen.

Laufzeit: Chrome for Testing 156.0.8078.47; temporärer CSR-Prüfeinstieg mit echten App-Quellen und unverändert eingefrorenen Repository-Abhängigkeiten; Liberation Sans 2.1.5 für Arial. Native Render: LibreOfficeDev 26.8.0.0.alpha0, Build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Das ist kein Desktop-Microsoft-Word-Nachweis und keine neue vollständige Repository-/SSR-Abnahme. Die Fotos sind synthetische Prüf-PNGs. Erhaltene normalisierte Pixel beweisen weder ursprüngliche JPEG-Metadaten noch spätere Bildbearbeitung.

## Offener Textfluss und nächster Schritt

Der Haupttext beginnt im nativen Ergebnis weiterhin tiefer und der Abstand wächst im Verlauf. In 07 bricht `2023 – heute` noch um; die Referenzrolle `Klassenlehrer, Schulhaus Zentrum` benötigt nativ eine zusätzliche Zeile. Die halbe Referenzbreite ist dabei tatsächlich auch im App-Grid vorhanden und kein Grund, Referenzen unbemerkt auf volle Breite umzubauen. Diese Flächenreparatur ändert weder Datums- noch Referenzraster und behauptet keinen Textfluss-Fix.

Der vorhandene Export enthält minimale native Tabellen-/Zellabschlussabsätze und `atLeast`-Zeilenabstände. Diese sind belegbare strukturelle Unterschiede zum CSS-Fluss, aber noch kein isolierter Beweis für den gesamten vertikalen Unterschied. Der nächste begrenzte Schritt muss Start des Textflusses, Zeilenmetriken und zusätzliche Tabellenabschlüsse getrennt prüfen. Keine pauschalen negativen Offsets, keine Schriftverkleinerung und kein Entfernen von Identitätsträgern ohne Besitzprüfung.

Danach folgt ein einziges konsolidiertes Word-Paket mit sinnvoll beurteilbaren Foto-, Crop- und Langtextfällen. Originalbild, Crop, sichtbarer Text, Feld-ID, Absatz- und Bildbesitz sind nach Bearbeiten/Speichern/Schliessen/Wiederöffnen getrennt zu prüfen. Keine Zwischenabnahme und keine Übertragung der alten Modern-02-/Brief-12-Abnahme auf neue Bytes.

**Verdikt: Flächen-/Marker-Reparatur verifiziert; gesamte Native Sidebar bleibt für Produktion NO-GO.** Word Save/Reopen und vertikale Fidelity sind offen. Keine bestehenden Gates wurden gelockert. Kein Merge, CI-Dispatch, manuelles Deployment oder Produktionsschalter.
