# Sidebar: Testpaket zurückgezogen und konkrete Ursachen korrigiert

23. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`, Basis `fc0cafa8dc61437ee77f59031055ff6a5efd545d`.

**`CV-Cover-Charm-Sidebar-Word-Abnahme-22okt.zip` ist als Abnahmepaket zurückgezogen. Keine weitere Benutzerprüfung dieses Pakets.** Die frühere Empfehlung, es als konsolidierten Word-Test zu verwenden, war falsch. Automatische Modellprüfungen belegen nicht die Eignung eines Testzustands.

## Foto und Git

Das echte Foto wurde aus einem früheren privaten Projekt des Nutzers übernommen. Diese Wiederverwendung war nicht beauftragt und ein Fehler im Testaufbau. Das private Ausgangsprojekt blieb unverändert. Foto, privates Projekt und die daraus erzeugten Dokumente werden nicht veröffentlicht.

Die beiden betreffenden früheren Commits `4a66ef8` und `fc0cafa` ändern zusammen 23 unterschiedliche Textdateien: keine Bild-/DOCX-/ZIP-Datei und keine eingebetteten Daten des Originals oder der verwendeten PNG-Fassung.

Zusätzlich wurden alle **167 vorhandenen Branch-Spitzen mit 131 unterschiedlichen Köpfen** gepinnt und ihre vollständigen Bäume geprüft. Kein Blob entspricht dem Original-JPEG oder seiner verwendeten PNG-Fassung. In 440 unterschiedlichen Text-Blobs ab 30 KB wurde keine der beiden Bildsignaturen gefunden; die vollständigen kodierten Bilder überschreiten diese Untergrenze.

Von 289 unterschiedlichen Bild-/DOCX-/ZIP-/PDF-Blobs wurden 280 vollständig gelesen und gegen ihre Git-IDs verifiziert. Rekursiv untersucht: 99 ZIP-Container, 2486 ZIP-Einträge, 25 PDF-Container und 877 Bildvorkommen, davon 380 unterschiedliche Bilder. Kein Treffer für die Originaldateien, vollständige identische Bildpixel oder die zusätzlich geprüfte Ähnlichkeitsschwelle.

**Grenze:** Bei neun Dateien über 1 MB liefert die GitHub-Contents-Anbindung leere Daten. Zwei ZIPs und sieben PDFs bleiben unbestätigt; ihre Pfade, Grössen und Git-IDs stehen im Nachweis. Gelöschte Dateien in älteren Commits sowie sämtliche denkbaren Ausschnitte/Transformationen sind ebenfalls nicht vollständig untersucht. Keine pauschale Entwarnung für die gesamte Git-Historie oder jeden komprimierten Altbestand. Der Ausschluss des Fotos aus den eigenen betreffenden Commits ist separat belegt.

## Ursachen und Änderungen

| Beobachtung | Belegter Befund | Korrektur |
| --- | --- | --- |
| Foto ganz unten | Die Diagnose-Fixtures setzen ausdrücklich `frei`, `yMm: 210`. Das App-PDF zeigt dieselbe Position. Das war die gewählte Testposition, kein neuer Word-Ankerversatz. | Die tiefen freien Fälle bleiben Diagnosen. Neue getrennte Fixtures prüfen das bestehende automatische Layout mit dem öffentlichen synthetischen Testbild. |
| Automatisches Foto über Kontakttext | `CvPhotoPlaceControls` änderte gespeicherte automatische Modi beim Öffnen ungefragt auf freie Koordinaten. Der Platz im Textfluss entfiel. Vor dem Fix wird der automatische Import `frei`; die PDF-Vorprüfung weist die Überlappung ab. | Gespeicherte Modi bleiben beim Öffnen erhalten. Erst «Frei positionieren» wechselt bewusst zur freien Position. Bestehende freie Positionen und Crops bleiben erhalten. |
| Kurzer Hobby-Strich links/rechts | Der lange Web-Titel verbrauchte fast die ganze Flexzeile; rund 4 mm blieben für den Strich. Der Export übernahm diesen Quellzustand. | Lange Sidebar-Überschriften erhalten die Linie in einer eigenen vollen Zeile darunter. Kurze Titel behalten die Linie daneben. Word verwendet eine native Absatzkante; Text, Feldbesitzer und Editierbarkeit bleiben erhalten. |
| Alte Kopf-/Fusszonen | Der QA-Runner liess `compactChromeComposition: source-bands` weg. Das Anschreiben bekam die ältere implizite Namensfusszeile und rund 16,73 mm Fussfläche; die CV-Messung korrigierte nur den CV. | Aktuelle kompakte Komposition im Runner; ausdrückliche Besitzerprüfung. Frische Sidebar-Messwerte bleiben alleiniger Besitzer der CV-Bänder, ohne zweite Zeichnung. |

Die Rubriklösung hängt nicht am Wortlaut «Hobbys». Schrift, Farbe und «Keine» bleiben quellenbestimmt. Word besitzt den Abstand seiner Absatzkante; er wird nicht nochmals als Absatznachlauf addiert.

## Vorhandene Fixes und Grenzen

Fidelity `7be4006` ist Vorfahr dieses Arbeitsbranches. Web-Chrome-Komponente, Palettenresolver und Chrome-Snapshot sind identisch; der Compact-Chrome-Helfer entspricht Pagination `e1f1177`. Die älteren Chrome-/Rubrik-Fixbranches sind ebenfalls Vorfahren. Es fehlt kein weiterer Merge dieser Fixes.

Alle drei Dossierteile sind Modern. Die zwischenzeitliche Vermutung einer Mischung mit Brief war falsch: Der direkte Test-Export verwendete den falschen Aufbau. Der neue Stand unterstützt weiterhin nur die ausdrücklich geprüften leeren kompakten Zonen. Kontakt-Header, eigene Texte und andere Modi sind dadurch nicht Sidebar-abgenommen. Ein Bildschirmfoto allein beweist keinen zusätzlichen Word-Fehler an der oberen Seitenfläche.

## Prüfung

- Dedizierter DOCX-Befehl: **525 Tests, 74 Dateien, 9095 Assertions, keine Fehler**.
- Fokussiertes striktes TypeScript für beide geänderten React-Komponenten, Erfassung und native Abhängigkeiten besteht. Die fehlenden `bun:test`-Typdeklarationen sind aus dieser Typprüfung ausgeschlossen; Bun führt die Tests real aus.
- Fünf gespeicherte App-Fälle: frei links/rechts, automatisch links/rechts und langer CV. Alle liefern das normale App-PDF ohne Vorprüfungsfehler. Editoröffnung erhält die explizite Fotoposition; Export verändert die gespeicherten Eingaben nicht. Keine erfassten JavaScript-Fehler.
- Vollständige synthetische Pixel bleiben beim Normalisieren erhalten, auch bei 1920 × 2880 Pixeln. Der Runner akzeptiert nur die beiden geprüften synthetischen Assets und weist andere Fotoquellen ab.
- Die beiden automatischen Fälle wurden vollständig in LibreOfficeDev 26.8alpha0 gerendert: je drei Dossierseiten, davon ein CV. Titelblatt, Anschreiben und beide CVs wurden visuell geöffnet. Foto oben, Kontakt darunter, volle Linie unter der langen Rubrik. Verbleibende Umbruch-/Abstandsunterschiede zum App-PDF sind keine exakte Geometrie-Fidelity.
- Reale React-App in einem temporären Vite-CSR-Prüfserver mit eingefrorenen Repository-Abhängigkeiten und Chrome 156; Liberation Sans ersetzt Arial. Kein Nachweis für produktives SSR oder Microsoft Word.

Temporäre alte Vergleichstests wurden vor dem abschliessenden Testlauf ausserhalb des Projekts abgelegt. Ein vorheriger Lauf, der diese Kopie zusätzlich erfasste, zählt nicht als PASS. Die zuerst zu enge Foto-Prüfliste wurde auf beide vorhandenen synthetischen Testbilder korrigiert.

**Status: konkrete App-/QA-Fehler korrigiert; Sidebar-Produktionsfreigabe weiterhin NO-GO.** Kein neues Benutzer-Testpaket, keine Zwischenabnahme, kein Merge, kein Produktionsschalter, kein Engine-Patch und kein CI-Dispatch. Nächster technischer Schritt: die tatsächlich vorgesehene Dossier-Konfiguration samt Header-/Footer-Modi intern konsolidiert prüfen. Das zurückgezogene Paket wird nicht wiederverwendet.

[Maschineller Nachweis](docx-next-sidebar-feedback-23okt-evidence.json).
