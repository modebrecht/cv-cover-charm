# Sidebar-Typografie: gesicherter Reparaturschritt, keine Word-Freigabe

22. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Basis: `aaaf88ac1e3587d3e377505abab2fae59002141a`.

Der interne gemeinsame Sidebar-Kandidat übernimmt jetzt die effektive App-Typografie, Rubrikabstände, Datums-Spalten und leere kompakte Kopf-/Fussstreifen. Die zuvor zusätzlich erfundene Namens-Fusszeile entfällt. Vier gespeicherte Modern-Projekte bestehen die normale PDF-Vorprüfung; ihre nativen Pakete behalten alle kanonischen CV-Texte und vollständigen Bildpixel. Die sichtbare Gesamtabnahme bleibt offen: Writer versetzt die freien Fotos ungefähr 10 mm nach unten, der vertikale Textfluss weicht ab und kurze Einträge können an der Seitengrenze auseinanderfallen. Das sind deutlich wichtigere Befunde als ein unsichtbarer Twip. Für diese neuen Bytes liegt keine Microsoft-Word-Abnahme vor.

## Änderung und Geltungsbereich

Der neue, ausdrücklich anzufordernde Parameter `cvSidebarTextMetrics` gilt ausschliesslich zusammen mit `cvSidebarComposition: "shared-body-stories"`. Er öffnet weder den regulären Sidebar-Export noch den Produktionsschalter. Die historischen Sidebar-Kompositionen und der klassische CV-Pfad erhalten keine neuen Messwerte.

Eine isolierte Instanz des echten `CvCanvas` liefert frische, an den vollständigen Quellsnapshot gebundene CSS-Schriftwerte. Kanonische Feld-IDs verbinden sie mit den bereits vorhandenen nativen Absätzen. Vollständige Messzeilen haben Vorrang vor sichtbaren Seitenfragmenten. Gemessen werden Schrift, Farbe, Laufweite, Zeilenhöhe und authored Abstände; keine absoluten Textkoordinaten, Feldrechtecke, Browser-Seitenzahlen oder fixen Word-Zeilenhöhen. Rubriktext bleibt nativer Text; nur die Linie ist Dekoration. Die Linienbreite folgt dem verfügbaren Rubrikbereich. Die Datums-Spalten verwenden den vorhandenen nativen Tabellenbaustein, Referenzen zwei gleich breite Tracks mit dem tatsächlichen App-Zwischenraum.

Die dokumenteigene Skalierung bleibt von der Anzeige getrennt: In diesen Modern-Entwürfen hat der Haupttext CSS-Zoom 0,9, die Sidebar 1. Diese Gestaltungsregel gehört ins DOCX. Der Vorschau-Zoom und die Pixeldichte dürfen es nicht verändern. Der neue Prüfvergleich fand tatsächlich vom äusseren CSS-Zoom abhängige Rundungen bei benutzten Border-/Spaltenbreiten. Die isolierte Messfläche neutralisiert deshalb ausschliesslich den Zoom ihrer Vorfahren. Die Skalierung innerhalb der CV-Seite bleibt erhalten. Anschliessend sind Snapshot, alle Messwerte, Modell und DOCX bei DPR 1 / 1440 px und DPR 2 / 390 px / äusserem Zoom 0,75 exakt gleich. Das ist ein fokussierter Nachweis, kein Test jeder Betriebssystem-/Browser-Zoomkombination.

Absatzabstände erhalten jeweils einen vorhandenen Besitzer, damit Word benachbarte Abstände nicht anders zusammenfasst als CSS-Flusszeilen. Wiederkehrende Zellabstände bleiben vom einmaligen Seitenanfang getrennt. Für Rubriktext ist auch der authored Abstand bis zur Linie nutzbar; die zuvor zu enge Reservierung der exakten Browser-Textbreite führte bei kursiver Schrift in Writer zu Wortumbrüchen wie `FAMILI / E`. Die korrigierten Renderings behalten `FAMILIE` und `KONTAKT` vollständig auf einer Zeile.

Sidebar-Rubriken erhalten ihre kanonischen IDs sowie dieselben Marker für benutzerdefinierte Schriftgrösse, Farbe, Gewicht, Kursiv und Unterstreichung wie Haupttext-Rubriken. Die App berücksichtigt diese schon vorhandenen Benutzerwerte damit auch im Seitentrack. Listen behalten ihre Feld-IDs und erhalten native Aufzählungen mit dem Quell-Einzug. Fehlende oder veraltete Messwerte werden abgewiesen. Pills, verschobene Rubriken, eigene Inhalts-Einzüge, andere Schriftprofile und nicht leere oder nicht kompakte Kopf-/Fusszonen werden in diesem neuen Kandidaten ausdrücklich abgewiesen; Benutzerinhalt wird nicht entfernt, um einen scheinbaren Erfolg zu erzeugen.

Die leeren kompakten Streifen sind in den geprüften Quellen rund 4 mm hoch. Sie verlaufen wie im App-PDF über beide Tracks und liegen oberhalb der Sidebar-Fläche. Es gibt keinen impliziten Kontaktnamen im leeren CV-Fuss. Der Entfall der zwei bisherigen `cv.footer.*.content`-Controls ist eine bewusste Korrektur erfundenen Inhalts; sämtliche tatsächlichen CV-Felder bleiben erhalten. Titelblatt und Anschreiben sind modellgleich zum jeweiligen Export ohne diese Sidebar-Schriftwerte.

## Gezielte Prüfung

| Gespeichertes App-Projekt | Browser / normales App-PDF / Writer-CV-Seiten | Aktive SDTs im Dossier | Kanonische CV-Textfelder |
| --- | --- | --- | --- |
| 03: rechts, lange Schulliste | 2 / 2 / 2 | 128 | 88 |
| 05: links, freies Portrait | 1 / 1 / 1 | 88 | 47 |
| 06: rechts, grosses freies Foto | 1 / 1 / 1 | 88 | 47 |
| 07: rechts, eigene Typografie und zwei Referenzen | 1 / 1 / 1 | 91 | 50 |

Die Fälle 05–07 sind neue, über die echte App-Speicherfunktion gesicherte Diagnose-Projekte. Fotos liegen im freien unteren Bereich der Sidebar (`x=25`, `y=210`, Breite 34 mm; gespiegelt physisch `x=151`). Die bisherigen überdeckenden Quellen 01, 02 und 04 bleiben unverändert erhalten. Die neuen Fotozustände sind keine nachträgliche Reparatur der alten Eingaben. Hier bezeichnet 05 den Sidebar-Fotofall, nicht den früheren klassischen Matrixfall Modern 05.

Alle vier normalen PDF-Downloads gelingen. Gespeicherte Eingaben bleiben unverändert, es gibt keine erfassten JavaScript-Seitenfehler und der reguläre geschützte Sidebar-DOCX-Einstieg weist weiterhin ab. Die nativen Diagnosepakete werden über den vorhandenen Download-Helfer aus dem expliziten internen Kandidaten geladen. Sie sind keine freigegebenen Sidebar-Produktdownloads.

Die vier finalen Pakete wurden mit LibreOffice gerendert: insgesamt 13 Dossierseiten, davon fünf CV-Seiten. Alle fünf CV-Seiten wurden visuell geöffnet; die Foto-Fälle wurden zusätzlich direkt mit ihrem normalen App-PDF verglichen. Die Feldprüfung wählt jeweils genau eine aktive Markup-Compatibility-Repräsentation und zählt keine Fallback-Duplikate. Alle erwarteten CV-Feld-IDs und ihre vollständigen Modelltexte sind im frischen DOCX vorhanden. Auch die normalisierte Textextraktion der nativen CV-Seiten findet alle Feldtexte. Das beweist weder unveränderte Absatzbesitzer nach Speichern noch Word-Editierbarkeit.

Die Bilder bleiben im zuständigen DrawingML-Picture-SDT: 120 × 180 beziehungsweise 1920 × 2880 Pixel, gleicher dekodierter RGBA-Hash wie die Quelle, gleicher vollständiger normalisierter PNG-Hash und unverändertes Crop-Markup. Der Normalisierer erhält damit die geprüften Pixel, nicht zwingend JPEG-Dateibytes, EXIF oder ICC-Metadaten. Die Fotos sind synthetische Prüf-PNGs, keine echten Benutzerportraits. Es wurde kein neuer Save/Reopen-Versuch ausgeführt und kein weiteres Zwischenpaket zur Benutzerabnahme verschickt.

95 gezielte Tests in neun Dateien bestehen mit 1120 Erwartungen. Die fokussierte strikte TypeScript-Prüfung einschliesslich Canvas, Snapshot, Capture, Builder, Renderer und Validierung besteht. Eine vollständige Repository-Suite, saubere Original-Lockdatei-/SSR-Installation oder neue Produktionsprüfung wird nicht behauptet. Einzelergebnisse und Paket-Hashes: [Prüfnachweis](docx-next-sidebar-typography-22okt-evidence.json).

Laufzeit: Chrome for Testing 156.0.8078.47, rekonstruierte QA-SPA mit echten App-Quellen und Liberation Sans; native Render mit LibreOfficeDev 26.8.0.0.alpha0, Build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Die bestehende Prüfung mit quellbasierten Query-/html2canvas-Abhängigkeiten und jsPDF 4.2.1 ist keine neue saubere Produktionsinstallation. Arial-Metriken und Desktop-Word-Verhalten sind nicht durch Liberation Sans und Writer bewiesen.

## Bestätigte Restfehler und offene Fragen

| Befund | Evidenz | Konsequenz |
| --- | --- | --- |
| Freie Fotos im Writer-Render etwa 10 mm tiefer | Quelle/Modell `y=210`; sichtbares PDF-Bildrechteck in 05/06 bei rund `y=219,98` mm. Frischer DOCX-Anker referenziert die Seite. | Sichtbarer Fehler im Writer-Ergebnis. Ob Import, Rahmen-/Tabelleninteraktion oder Exportdarstellung ursächlich sind, ist noch nicht isoliert. Microsoft Word unverifiziert. Keine Gegenversatz-Konstante. |
| Textfluss länger als im App-PDF | Haupttext beginnt tiefer; der Unterschied wächst bis zu den Referenzen. Bei 07 bricht das Datum `2023 – heute` im nativen Datumstrack um. | Typografische Annäherung und gleiche Seitenzahl sind kein visueller PASS. Zeilen-/Tabellenmetriken und Absatzbesitzer weiter prüfen. |
| Kurzer Schuleintrag über zwei Seiten | In 03 stehen Datum und Titel von Schulstation 12 auf Seite 1, Ort und Beschreibung auf Seite 2. | Konkreter Gruppierungsfehler im Writer-Render; keine allgemeine Atomarität behaupten. Lange Beschreibungen müssen trotzdem teilbar bleiben. |
| Weitere Flächen-/Vorlagendifferenzen | Native Sidebar-Tönung, sichtbare Vorlagenmotive, Trennkante und Aufzählungsfarbe stimmen noch nicht vollständig mit dem App-PDF überein. | Eigene visuelle Gates offen; nicht als All-39-Fidelity ausgeben. |
| Originalbilder und Controls nach Word-Bearbeitung | Nur frische Pakete inventarisiert. | Bildwechsel, Crop-Bearbeitung, Save/Reopen, Absatzidentität und SDT-Besitz bleiben UNVERIFIED. Historische Writer-Ersetzungen und PopSdt-Vermutungen liefern dafür keinen Word-Beweis. |

## Nächster begrenzter Schritt

1. Die bereits sichtbare freie Bildposition und die Gruppierung kurzer Einträge am gemeinsamen Modell-/Renderer-Unterbau untersuchen. Paket-Anker, erste Zell-/Absatzbesitzer und tatsächliche Renderposition getrennt erfassen. Keine neue 22-Fälle-Rundungsjagd und kein Engine-Patch.
2. Danach verbleibende Flächen- und Flussunterschiede gegen dasselbe gespeicherte Projekt bewerten. Quellzustände, Bilder und Benutzer-Schriftwerte erhalten; keine Schriftverkleinerung oder pauschale x/y-Kompensation.
3. Erst mit einem konsolidierten, sinnvoll abnehmbaren Stand ein einziges Desktop-Word-Paket vorbereiten: links/rechts mit Originalbild und Crop sowie ein langer CV. Sichtprüfung, Textänderung, Crop-/Bildbearbeitung, Speichern, Schliessen und Wiederöffnen; danach Pixel, Crop, Feld-ID, Absatz- und Bildbesitz getrennt prüfen. Keine neue Abnahme der ursprünglichen Modern-02-/Brief-12-Bytes verlangen.

**Verdikt: Typografie-/Chrome-Checkpoint gesichert; Native Sidebar für Produktion weiterhin NO-GO.** Die bestehenden Gates bleiben unverändert. Kein Merge, manuelles Deployment, CI-Dispatch, Produktionsschalter oder Office-Engine-Patch.
