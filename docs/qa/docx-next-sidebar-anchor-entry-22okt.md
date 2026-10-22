# Sidebar: Bildanker und kurze Einträge korrigiert

22. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`, Basis `7743e8c47fb27c1ba7e42d229a1df612df5b00cd`.

Die zwei konkreten Restfehler des letzten Checkpoints sind im Writer-Vergleich behoben: Freie Fotos sitzen wieder bei der gespeicherten Höhe von 210 mm; Schulstation 12 steht vollständig auf der zweiten CV-Seite. Alle Bilddaten, Crops und aktiven Feld-IDs bleiben gleich. Das ist ein geprüfter Reparaturschritt am internen Sidebar-Kandidaten, keine vollständige Sidebar- oder Microsoft-Word-Freigabe.

## Bildanker

Der vorherige Export schrieb bereits die richtige Seitenkoordinate und `layoutInCell="0"`, verankerte den Rahmen aber in einem Absatz innerhalb der kontinuierlichen Sidebar-Tabelle. In Writer erschien das Bild trotzdem um etwa den Tabellen-/Dokumentanfang von 10 mm nach unten versetzt. Der neue gemeinsame Aufbau legt freie seitengebundene Bilder vor die Tabelle. Der vorhandene Renderer setzt ihren Trägerabsatz damit in den Dokumentkörper. Die Fotozone wird weiterhin gegen den vollständigen linken beziehungsweise rechten Bereich geprüft; Bilder über dem Zwischenraum oder ausserhalb der Seite bleiben abgewiesen.

Unverändert bleiben Seitenbezug, deklarierte EMU-Offsets, Breite, Spiegelung, Rahmen, Crop und genau ein typisierter Picture-SDT mit einem nativen Inline-Bild im vorhandenen Rahmen. Es gibt keinen negativen Gegenversatz und keine andere LibreOffice-spezifische Zahl im Export. Automatische Inline-Fotos bleiben in ihrem Texttrack. Der Validator erkennt nur die ausdrücklich als `page-frame` gekennzeichneten Bilder vor der ersten Flusstabelle an. Ein gewöhnlicher Textabsatz vor der `section-start`-Tabelle wird weiterhin abgewiesen und ist eigens getestet.

| Fall | Gespeichertes Bild-y | Writer vorher | Writer nachher | x / Breite / Crop / Pixel |
| --- | --- | --- | --- | --- |
| 05, links, Portrait | 210 mm | 219,97486 mm | 209,97360 mm | unverändert |
| 06, rechts, grosses Foto | 210 mm | 219,99249 mm | 209,99123 mm | unverändert |
| 07, rechts, eigene Typografie | 210 mm | 219,99249 mm | 209,99123 mm | unverändert |

Die Werte sind die Bildrechtecke im tatsächlich gerenderten PDF, nicht nur Modellkoordinaten. Die verbleibende Abweichung unter 0,03 mm ist kein neues exaktes Geometrie-PASS und ersetzt das historische 22er-Gate nicht. Die Abhilfe ist im Writer-Ergebnis belegt; eine bestimmte interne Importerfunktion als Ursache wird nicht behauptet. Ob Microsoft Word auch mit der früheren Zellverankerung einen Versatz hatte oder den neuen Rahmen nach Bearbeitung stabil erhält, ist unbestätigt. Insbesondere ist Textumfluss um frei platzierte Bilder in langen Word-Tabellen noch kein allgemein abgenommenes Verhalten.

## Einträge am Seitenende

Der gemeinsame Sidebar-Pfad hob das Zusammenhalten aller Einträge auf. Die anschliessend erzeugten Datums-Tabellen erlaubten ebenfalls ausnahmslos geteilte Zeilen. Deshalb konnten Datum und Titel noch auf Seite 1 stehen, während Ort und Beschreibung bereits auf Seite 2 lagen.

Jetzt wird nach Übernahme der tatsächlichen Schriftwerte die konservative Texthöhe der beiden nativen Zellen bestimmt. Nur wenn sie höchstens ein Viertel der nutzbaren Seitenhöhe beansprucht, erhält die bestehende Datums-Zeile `w:cantSplit`. Der vorhandene Schätzer und die echten Trackbreiten inklusive Quell-Zwischenraum werden wiederverwendet. Es entstehen keine zusätzlichen Entry-Tabellen, sichtbaren Spacer oder duplizierten Felder. Grössere Einträge bleiben teilbar; Schriftgrössen, Abstände und bewusste Benutzereinstellungen werden dafür nicht verkleinert.

Diese Begrenzung ist absichtlich konservativ: Die Standardbeschreibung von `cantSplit` und die dokumentierte Word-Abweichung für überhohe Zeilen unterscheiden sich. Word kann überlaufenden Inhalt abschneiden. Deshalb ist ein pauschales `cantSplit` für jede Beschreibung keine robuste Lösung. Quellen: [Open XML SDK: CantSplit](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.cantsplit?view=openxml-3.0.1), [Microsoft Implementierungshinweis](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oi29500/a55188f7-2443-4c17-ba5a-75999085bab4).

Im normalen Langfall verschiebt sich Schulstation 12 nun als vollständiger Eintrag auf die zweite CV-Seite. Die zwölf Schulen, Praktika und Referenzen bleiben erhalten; der CV umfasst weiterhin zwei Seiten. Ein zusätzlicher gespeicherter App-Stressfall mit 90 nummerierten Beschreibungszeilen und Endmarke fliesst über vier native CV-Seiten. Alle 91 Quellzeilen sind extrahierbar, die Endmarke ist sichtbar, und der einzelne Beschreibungs-Control enthält auch sämtliche ursprünglichen harten Zeilenumbrüche. Seine Datums-Zeile hat weiterhin kein `cantSplit`.

## Verifikation

Die nach Bereinigung des temporären Arbeitsbereichs wiederhergestellten Quellen wurden gegen Git-Blobs geprüft. Die Originalabhängigkeiten wurden aus der unveränderten `bun.lock` eingefroren installiert: 463 Pakete, Installationsskripte deaktiviert. Browser: Chrome for Testing 156.0.8078.47; Schrift: Liberation Sans 2.1.5; native Render: LibreOfficeDev 26.8.0.0.alpha0, Build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Die App-Prüfung nutzt weiterhin einen temporären CSR-Einstieg mit echten App-Quellen; sie ist keine SSR- oder Produktionsabnahme.

Die drei geänderten Produktdateien wurden für den Vergleich kontrolliert auf den gepinnten Basisinhalt gesetzt und danach wieder durch die Reparatur ersetzt. Beide Läufe verwenden dieselben vier gespeicherten App-Projekte 03, 05, 06 und 07 und dieselbe Laufzeit. Der alte Bildversatz und der zerrissene Eintrag wurden so erneut reproduziert, bevor die Änderung bewertet wurde.

| Prüfung | Ergebnis und Umfang |
| --- | --- |
| Unit-Tests | 111 bestanden, 0 fehlgeschlagen, 1703 Erwartungen in 13 Dateien |
| Fokussiertes striktes TypeScript | PASS für Builder-/Renderer-Unterbau und die geänderten Module; keine Behauptung einer vollständigen Repository-Prüfung |
| Normale App-PDF-Vorprüfung / Download | Alle vier Vergleichsfälle vorher und nachher bestanden |
| Gespeicherte Eingaben / JavaScript-Seitenfehler | unverändert / keine erfasst |
| App-Snapshot, Cover- und Sidebar-Messwerte | in allen vier Vorher/Nachher-Paaren exakt gleich |
| App-CV-Screenshots | alle fünf Seiten bytegleich |
| Titelblatt / Anschreiben | Modelle und die ersten zwei nativen Seiten-PNGs jedes Dossiers bytegleich |
| Aktive SDT-IDs und Feldtexte | 128 / 88 / 88 / 91, vorher und nachher exakt gleich, ohne aktive Duplikate |
| Vollständige Bilder / Crop-Markup | im zuständigen DrawingML-Picture-SDT exakt gleich, einschliesslich 1920 × 2880 Pixel |
| Native Tabellenraster | exakt gleich; nur Zeilen-Gruppierung und Position des Bild-Trägerabsatzes geändert |
| Native CV-Seiten | weiterhin 2 / 1 / 1 / 1; alle fünf finalen CV-Seiten visuell geöffnet |
| Überlanger Eintrag | vier CV-Seiten, alle 90 Prüfzeilen plus Endmarke; alle vier CV-Seiten visuell geprüft |
| Anzeige-Skalierung, Fall 06 | DPR 1 / 1440 px gegen DPR 2 / 390 px / äusseren CSS-Zoom 0,75: Snapshot, Messwerte, Modell und DOCX bytegleich |
| Word Save/Reopen | UNVERIFIED, nicht durch Writer ersetzt |

Die Fotos bleiben synthetische interne Prüf-PNGs. Es wird weder unveränderte JPEG-/EXIF-/ICC-Identität noch Bild-/Absatzbesitz nach Speichern behauptet. Die unveränderten Cover-/Brief-Renderings betreffen diese vier Vergleichsprojekte; die frühere Modern-02-/Brief-12-Word-Abnahme wird nicht auf neue Bytes übertragen.

Das reproduzierbare Vergleichsskript ist `scripts/qa-sidebar-owner-entry-22okt.py BASELINE FIXED REPORT`, optional mit `--stress-case` und `--viewscale-case`. Es prüft aktive Felder, vollständige Bilder und Crops, sichtbare Fotorechtecke, Anker-Vorfahren, Seitenzahlen, kurze Einträge, lange Beschreibungen und die unveränderten angrenzenden Dokumente. Einzelergebnisse und Hashes stehen im [Nachweis](docx-next-sidebar-anchor-entry-22okt-evidence.json). Die gespeicherten App-Projekte 01–07 wurden nicht verändert. Die Stressquelle entsteht aus 03 durch Reduktion auf die erste Schule und deren Beschreibung mit den Zeilen `Stresszeile 001` bis `090` sowie `ENDE LANGER EINTRAG QA 22OKT`.

## Verbleibende Arbeit

Sidebar-Tönung, native Vorlagenmotive, Trennkante, Aufzählungsfarbe und der längere native Haupttextfluss unterscheiden sich weiterhin sichtbar vom App-PDF. Auch die zusätzliche Datumszeile bei eigener Schriftgrösse ist noch kein vollständiger Fidelity-PASS. Als Nächstes werden diese gemeinsamen Flächen- und Flussregeln abgeglichen. Erst danach ist ein konsolidiertes Word-Paket für Bild-/Crop-Bearbeitung, Save/Reopen und Kontrolle der semantischen Besitzer sinnvoll.

**Verdikt: zwei konkrete Fehler im internen Kandidaten behoben; Native Sidebar insgesamt weiterhin NO-GO für Produktion.** Der reguläre Sidebar-Export bleibt gesperrt. Kein Merge, Produktionsschalter, manuelles Deployment, CI-Dispatch, Engine-Patch oder erneuter 22-Fälle-Lauf.
