# Sidebar: Textfluss-Reparatur und konsolidierte Word-Abnahme

Stand: 23. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`; Basis `6bf49a9cba17d3ebb1012964b7ee204d1abb4176`. Dies ist die Fortsetzung der autorisierten Reparatur des internen `shared-body-stories`-Kandidaten. Keine Produktionsfreigabe.

## Diagnose

Der vorherige Kandidat hatte sichtbare Textflussfehler im Millimeterbereich. Diese lassen sich nicht mit dem historischen Speicherversatz von rund 0,018 mm erklären. Die seitlichen Texte hatten unterschiedliche vertikale Tabellenzellränder; im Writer-Import verschob der grössere Rand auch die benachbarte Hauptspalte. Dazu kamen zwei unterschiedliche Bedeutungen von Zeilenhöhe und mehrfach gezählte native Absatzgrenzen. Bei eigenen Schriftwerten brach ein Datum unnötig um. Im langen CV konnte eine Rubriküberschrift allein am Seitenende bleiben.

Die vollständigen Bildpixel und die Bearbeitung in Word bleiben die wichtigere Freigabefrage. Diese Runde bestätigt vollständige Pixel im frisch exportierten Paket und sichtbare Fotos im Writer-Render. Sie bestätigt weder die Word-Bildauswahl noch Zuschneiden, Ersetzen, SDT-Eigentümerschaft oder Save/Reopen in Microsoft Word. Die früheren Writer-Verluste werden dadurch nicht widerlegt.

## Befund und Änderung

| Bereich | Beobachtung und Eingrenzung | Reparatur im Kandidaten |
| --- | --- | --- |
| Vertikale Spaltenränder | Im kontrollierten CV-DOCX verschiebt allein das Entfernen des seitlichen oberen Zellrands beide Textspalten um 3,49249 mm. Entfernen der benachbarten Dossierteile oder andere Schriftformatierung beseitigt das nicht. Für Word unbestätigt. | Jede Spur erhält bei Bedarf einen eigenen einspaltigen, teilbaren Tabellenbesitzer für ihren vertikalen Innenrand. Die gemeinsame äussere Zeile hat keinen vertikalen Zellrand. Keine x/y-Gegenverschiebung. |
| Zeilenhöhe | CSS-Zeilenhöhe verwendet Schriftgrösseneinheiten; der native proportionale Abstand hängt zusätzlich von der natürlichen Schriftzeile ab. Die bisherige direkte Übernahme addierte im getesteten Lauf zu viel Höhe. | Frische Messung der natürlichen Schriftzeile im isolierten Browser-Messbereich. V3-Messwerte konvertieren diese Basis in native proportionale Zeilenhöhe. Keine exakten Textzeilenboxen, kleinere Schrift oder gespeicherten Benutzeränderungen. Arial/Liberation-Profil bleibt begrenzt. |
| Datumsspalte | `2023 – heute` wird bei eigenen Schriftwerten auf zwei Zeilen verteilt, obwohl die vorhandene CSS-Lücke noch Platz bietet. | Datum darf die bestehende Lücke nutzen. Die Grenze der Zelle verschiebt sich, der Beginn des benachbarten Eintragstexts bleibt exakt gleich. |
| Abstände | Ein nativer Datumseintrag enthält bereits Zell- und Tabellen-Endabsätze von je einem Punkt. Das bisher zusätzlich übernommene volle CSS-After-Gap zählt deren Höhe doppelt. | Vorhandene Grenzen werden vom selben authored After-Gap abgezogen, mit Minimum null. Kein negativer Abstand und kein Entfernen benötigter Absatzgrenzen. |
| Verwaiste Überschrift | `keepNext` allein bindet die Rubrik im untersuchten Writer-Aufbau nicht zuverlässig über eine verschachtelte Tabelle. | Die Überschrift und der erste kurze Eintrag nutzen den bestehenden nativen Entry-Besitzer gemeinsam. Nur begrenzte Gruppen bis zu einem konservativ geschätzten Viertel der verfügbaren Seitenhöhe; lange Einträge bleiben teilbar. |
| Kerning | Frische Web-Schriftwerte enthielten keine ausdrückliche native Kerning-Angabe. | Gemessenen Zustand als native Run-Eigenschaft übertragen. Ohne neue Eigenschaft bleiben bestehende Exporte unverändert. |

Die zusätzliche Gruppierung hat einen messbaren Preis: Bei einer Rubrik mit erstem kurzen Datumseintrag sind vier statt zwei native Ein-Punkt-Grenzen nötig. Das Minimum beträgt rund 1,411 mm. Der Demo-Abstand von rund 0,720 mm kann dies nicht vollständig aufnehmen; rund 0,691 mm zusätzlicher Abstand bleiben. Diese Grenze wird ausdrücklich ausgewiesen und nicht als exakte Geometriegleichheit ausgegeben.

## Frische Prüfung

Der [maschinelle Nachweis](docx-next-sidebar-flow-22okt-evidence.json) bindet Ergebnisse an Produkt-Blobs und DOCX-Hashes. Die Browser-Exporte stammen aus wiederhergestellten gespeicherten App-Projekten. Projekt-Speichern und der normale PDF-Download wurden tatsächlich ausgeführt. Der native Sidebar-Download nutzt den ausdrücklichen internen Diagnosepfad. Der reguläre Export bleibt gesperrt.

| Prüfung | Ergebnis |
| --- | --- |
| 118 gezielte Tests, 13 Dateien, 1787 Assertions | PASS |
| Fokussierte strikte Typprüfung einschliesslich Browser-Capture | PASS |
| Vier gespeicherte App-Fälle: langer rechter CV, linkes Foto, rechtes Foto, eigene Typografie | 2 / 1 / 1 / 1 CV-Seiten in App-PDF und Writer; alle kanonischen CV-Texte sichtbar |
| Aktive eindeutige Feld-IDs | 128 / 88 / 88 / 91; Identitäten und vollständige Texte gegenüber dem Ausgangspaket gleich |
| Schriftwerte und Bilder | Vorhandene Run-Werte unverändert; nur Kerning hinzugefügt. Bilder, Crops und Bildpositionen gegenüber der Basis gleich |
| Halbe Textbreite / Referenzen | Hauptspaltenbeginn und Referenzspuren unverändert; Datumskorrektur schiebt den Text nicht nach rechts |
| Kurzer Schuleintrag 12 | Vollständig auf CV-Seite 1; nächste Rubrik samt erstem Eintrag auf CV-Seite 2 |
| Überlanger einzelner Eintrag | 90 Stresszeilen plus Endmarker vollständig über vier CV-Seiten; ein vollständiges Description-SDT; Tabellenzeile bleibt teilbar |
| DPR 2, schmale 390-Pixel-Ansicht, äusserer Vorschau-Zoom 75 % | Quelle, Cover-Messwerte, V3-Sidebar-Messwerte, Modell und DOCX bytegleich zum normalen Export |
| Titelblatt / Anschreiben | Vier Modellpaare und acht native Seitenbilder bytegleich zur Basis; fünf Web-CV-Bilder ebenfalls bytegleich |
| Zusätzliches echtes JPEG, links und rechts | 1200 × 994 browserdekodierte Pixel vollständig im zuständigen DrawingML-Bild-Control; identische Pixel vor und nach der Export-Normalisierung. Je eine CV-Seite; benachbarte Dossierteile unverändert |

Alle fünf Vergleichs-CV-Seiten, vier Stress-CV-Seiten, zwei echten Foto-CV-Seiten und das gemeinsame Titelblatt-/Anschreiben-Paar wurden visuell geöffnet. Sichtbare vollständige Sidebar-Flächen bleiben vorhanden. Die Foto-Abnahme enthält echte Foto-Demo-Kopien, keine synthetische Testgrafik. Das ursprüngliche Benutzerprojekt wurde nicht verändert; dessen Personendaten und Bild werden nicht ins Repository aufgenommen.

Die JPEG-Daten werden weiterhin in PNG normalisiert. Vollständige browserdekodierte Pixel sind bewiesen; identische ursprüngliche JPEG-Dateibytes, EXIF oder ICC-Metadaten sind damit nicht zugesichert. Nach Word-Speichern ist auch der Pixelerhalt noch unbestätigt.

## Verbleibende Abweichung und Laufzeitgrenzen

Bei Fall 06 verringert sich der Writer-Baseline-Abstand zur frisch gemessenen physischen Web-Vorschau beim Dokumenttitel von etwa 5,26 auf 0,20 mm, beim Namen von 5,73 auf 0,51 mm und bei der Referenzüberschrift von 11,31 auf 2,60 mm. Die Rubrikgruppierung ist in diesen letzten Werten enthalten. Vorschau-Rundung beeinflusst die Vergleichsbaseline; dies ist keine exakte Messung der Word-Geometrie. Auch der verbleibende Referenz-Zeilenumbruch und weitere sichtbare Abstände gelten nicht pauschal als abgenommen.

Die QA nutzt die eingefrorene Repository-Lockdatei mit echten React-/Vite-Abhängigkeiten und eine temporäre CSR-App. Sie ersetzt keine Browser-Abnahme des produktiven SSR-Servers. Der native Renderer ist LibreOfficeDev 26.8 alpha, nicht Microsoft Word. Der gesamte 39-Vorlagen-Fidelity-Lauf und die historische 22er-Geometriematrix wurden nicht wiederholt. Ihre Gates und bisherigen Ergebnisse bleiben unverändert.

## Kleinstes sinnvolles Word-Paket

Ein Paket mit drei Dossiers reicht für die nächste Architekturentscheidung: linkes gerahmtes Foto, rechtes rundes Foto und der zweiseitige lange CV. Die identischen App-PDFs dienen als visuelle Referenz. Geprüft wird nur der CV ab Dossierseite 3.

1. Unverändert öffnen und einmal unter neuem Namen speichern, schliessen, erneut öffnen. So bleibt Bild-/Control-Erhalt von absichtlicher Bearbeitung unterscheidbar.
2. In einer zweiten Kopie einen kurzen Text ändern; links den Fotoausschnitt verändern und rechts das Foto durch das beiliegende Original ersetzen. Wieder speichern und neu öffnen.
3. Beide Speicherstände zurückgeben. Nachkontrolle trennt sichtbare Texte, kanonische Feld-IDs, SDT-/Absatzidentität, Bildbesitz, vollständige Pixel, Crop-Wirkung und Seitenumbrüche. Geänderte Texte und Crops werden nur gegen die beabsichtigte Änderung beurteilt. Bei fehlender Bildauswahl, Reparaturdialog oder verlorener Bearbeitbarkeit ist die Word-Abnahme fehlgeschlagen.

Für eine Produktionsfreigabe ersetzt diese kleine Triage die vollständigen bestehenden Akzeptanzgates nicht. Eine vorherige Modern-02-/Brief-12-Abnahme wird nicht auf neue Bytes übertragen.

## Entscheidung

**CONDITIONAL GO für diese konsolidierte Desktop-Word-Abnahme; NO-GO für Produktion und Merge der Sidebar.** Keine weitere geometrische Feinkorrektur vor dem entscheidenden Word-Ergebnis.

Würden wir frisch beginnen, würden wir Native Sidebar genauso bauen? **Die früheren mehrfach positionierten und voneinander getrennten Text-/Bildbesitzer: nein.** Beibehalten würden wir gemeinsame authored Spaltenzonen, kontinuierliche native Textspuren, unabhängig verankerte frei platzierte Originalbilder und kanonische native Controls. Die verschachtelten Besitzer müssen so wenige wie möglich bleiben. Scheitert Word-Bildbearbeitung oder Besitzererhalt, ist die nächste gezielte Vereinfachung eine gewöhnliche DrawingML-Bildkomposition im nativen Zell-/Absatzfluss für automatisch platzierte Bilder; frei gesetzte Bilder behalten einen separaten Seitenanker. Keine Office-Binärpatches und keine templateabhängigen Gegenoffsets.

Dieser Checkpoint verwendet vorhandene Shared-Primitives. Ein erneuter kompletter Unterbau ist erst sinnvoll, wenn die Word-Triage einen Fehler dieser Komposition nachweist. Die viel kleineren historischen Save-Rundungen sind für diese Entscheidung nachrangig.
