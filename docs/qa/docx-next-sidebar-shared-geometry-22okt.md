# Gemeinsame Sidebar-Geometrie: Umsetzung und begrenzte Prüfung

22. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Basis: `037bceb5c506685be25fb8c20b9283591f06fcd1`.

Die unterschiedliche Bezugsbreite ist im neuen internen Kandidaten `shared-body-stories` beseitigt. App und DOCX beziehen die Sidebar jetzt aus derselben reinen A4-Geometrie. In den gespeicherten Modern-Projekten sind es links und rechts 63 mm. Das ist ein verifizierter Reparaturschritt, keine vollständige Sidebar- oder Word-Freigabe.

## Was geändert wurde

`src/components/cv/sidebar-geometry.ts` löst die bisher im Web-Renderer verteilten Regeln für Rail, Innenabstände, Haupttextzone, Spiegelung und automatische Portraitbreite auf. Der Web-Renderer verwendet diese Funktionen. Der neue native Kandidat erhält dieselben Regeln aus dem gespeicherten Entwurf, aufgelöster Chrome und Benutzerrändern. Keine DOM-Rechtecke oder Browser-Seitenfragmente bestimmen den Word-Fluss.

Die native Tabelle enthält zwei vollständige, unabhängig fliessende Geschichten und einen echten Zwischenraum. Bei den Standardprojekten sind die festen Spalten links 63 / 8 / 119 mm, rechts 119 / 8 / 63 mm. Die Sidebar-Textzone erhält dieselben physischen Innenabstände von 8 und 7,5 mm wie die App. Eigene Hauptränder werden berücksichtigt. Die automatische Sidebar-Fotobreite übernimmt die bisherigen kompakten Web-Grössen; frei platzierte Fotos behalten ihre gespeicherte Breite.

Die seitengebundene Sidebar-Fläche bleibt von Text und Bildern getrennt und reicht weiterhin über die vollständige Seitenhöhe. Ihre Kante verwendet jetzt die authored Rail statt des früheren Anteils an der bereits verkleinerten Inhaltsbreite. Die historischen `semantic-rows`- und `body-stories`-Pfade bleiben als eigene Diagnosepfade bestehen; ihre alten Ergebnisse werden nicht auf den neuen Kandidaten übertragen.

Ein freies Foto gehört zur vollständigen Sidebar-Fläche oder zum Hauptbereich. Es muss nicht vollständig innerhalb der gepolsterten Sidebar-Textzone liegen. Der vorhandene native Bildrahmen kann im neuen Kandidaten relativ zur Seite positioniert werden und besitzt weiterhin ein Inline-DrawingML-Bild in genau einem typisierten Picture-SDT. Spiegelung erfolgt einmal. Rahmenausdehnung wird beim Prüfen der Besitzerzone berücksichtigt; Fotos über dem Zwischenraum oder ausserhalb der Seite werden abgewiesen. Es gibt keinen x/y-Kompensationswert und keine Verkleinerung, um einen unpassenden Track zu erzwingen.

Der Rahmen nutzt standardisierte DrawingML-Seitenanker und `layoutInCell`. Das ist keine neue Open-XML-SDK-/XSD-Konformitätsprüfung und kein Nachweis seiner Word-Bearbeitungsstabilität. Die bestehende Rahmenrepräsentation wurde hier um die Seitenreferenz erweitert, nicht durch eine nachgewiesen save-stabile Alternative ersetzt. Quellen: [Microsoft Anchor](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.anchor?view=openxml-3.0.1), [LayoutInCell](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.anchor.layoutincell?view=openxml-2.20.0).

Bei der ersten Rendering-Prüfung fiel ausserdem ein wiederholter Anfangsabstand auf. Ein als Zell-Innenabstand gesetzter Erstseitenabstand wirkt auch auf Folgeseiten. Die endgültige Fassung verwendet den vorhandenen ersten Zell-Grenzabsatz für den einmaligen Vorlauf. Wiederkehrende Zell-Innenabstände und dieser Vorlauf sind getrennt. Im langen Writer-Fall beginnt der Datumsabsatz von Schulstation 8 auf der zweiten CV-Seite nun bei etwa 13,62 mm statt mit dem versehentlich wiederholten Vorlauf; Datum und Titel stehen dort wieder zusammen. Das ist ein begrenzter Writer-Nachweis, keine allgemeine Word-Seitenregel.

## Geprüfte Ergebnisse

| Prüfung | Ergebnis und genauer Umfang |
| --- | --- |
| Sidebar-Breite und Position aus App-DOM und nativem Modell | Links 0–63 mm, rechts 147–210 mm; App-Messung rund 62,976 mm durch Vorschau-Pixelrundung |
| Gemeinsame Geometrie | A4-Anteil 0,22 / 0,30 / 0,50, Karten-Inset, eigene Ränder und beide Seiten im Unit-Test |
| Drei bisherige gespeicherte App-Projekte | Wieder über echte Import-, Speicher- und Download-Funktionen geprüft |
| App-Vorschau nach Auslagerung der Geometrie | Alle vier CV-Seiten-PNGs der drei Projekte bytegleich mit der vorherigen Prüfung |
| Titelblatt und Anschreiben | Modelle und Cover-Messwerte in allen drei Projekten unverändert |
| Kanonische aktive Feld-IDs und Texte | 90 / 90 / 130; exakt wie vorher, ohne doppelte aktive IDs |
| Originaler gespiegelter Grenzfall x = 25 mm | Viertes gespeichertes App-Projekt exportiert; Quell-x 25, physisches Bild-x 151, y 20 und Breite 34 mm erhalten; 90 aktive Felder |
| Vollständige Bildpixel | 120 × 180 sowie 1920 × 2880, gleicher dekodierter RGBA-Hash auch im zuständigen DOCX-Bild-Control |
| Crop-Werte | In den drei Fotopaketen unverändert; genau ein aktiver Picture-SDT je Foto |
| Native Renderer-Prüfung | Die ersten drei finalen Pakete mit LibreOffice gerendert: 3 / 3 / 4 Dossierseiten, entsprechend 1 / 1 / 2 CV-Seiten; CV-Seiten visuell geprüft |
| Langer rechter CV | Normales App-PDF verfügbar; App und Writer jeweils zwei CV-Seiten; Referenzen vollständig im CV |
| Angrenzende Unit-Tests | 74 PASS, 0 FAIL, 809 Erwartungen, sechs Dateien einschliesslich unveränderter historischer Sidebar-/Parallel-Flow-/Image-Zone-Tests |
| Fokussierte strikte Typprüfung | PASS einschliesslich CvCanvasBase und geändertem DOCX-Unterbau |
| Gesamte Repository-Typprüfung in der rekonstruierten Umgebung | Kein PASS: fehlende Abhängigkeitstypen und nicht betroffene Calendar-/Chart-Typfehler; nicht als vollständige saubere Installation ausgeben |
| Regulärer geschützter Sidebar-Export | In allen vier Browserfällen weiterhin abgewiesen; neue Komposition nur mit explizitem internen Opt-in |
| Word Save/Reopen | Unverifiziert |

Die ersten drei Eingaben bleiben in den bestehenden Fixtures erhalten. Der zuvor abgewiesene Originalzustand ist zusätzlich als `tests/fixtures/docx-next/sidebar-saved-app-22okt/04-right-photo-x25.json` gesichert. Die bekannten Demo-Daten und das synthetische Testfoto sind ausdrücklich keine echten Kunden- oder Portraitdaten.

Der Browser-Nachweis verwendet den vollständigen Normalisierer und Dekorationsrenderer. Die Pixelprüfung ist kein Nachweis unveränderter JPEG-Dateibytes, EXIF- oder ICC-Metadaten. Historische Writer-Bildersetzungen nach Speichern bleiben ein eigener Befund. Word-Verhalten wird daraus nicht abgeleitet.

Die Laufzeit entspricht der vorherigen rekonstruierten QA-SPA mit Chrome for Testing 156.0.8078.47, realen quellbasierten Abhängigkeiten und Liberation Sans. Native Render: LibreOfficeDev 26.8.0.0.alpha0, Build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`. Dies ist keine neue saubere Original-Lockdatei-/SSR-Abnahme. Einzelwerte und Paket-Hashes stehen im [Nachweis](docx-next-sidebar-shared-geometry-22okt-evidence.json).

## Offene Produktgrenzen

Die beiden bisherigen Fotoprojekte und der ursprüngliche x25-Zustand überdecken schon in der App Text. Die normale PDF-Vorprüfung sperrt sie weiterhin. Die neue Besitzerzone behebt die unberechtigte Track-Abweisung, sie macht einen überdeckenden Quellzustand nicht zu einem fertigen Layout. Diese Dateien werden deshalb nicht als Word-Abnahmepaket ausgegeben.

Typografie, Rubrikabstände und die native kompakte Chrome unterscheiden sich weiterhin sichtbar von der App. In der linken Diagnose ist die weisse native Fusszeilenschrift über der hellen Sidebar schlecht lesbar. Das bleibt ein offener sichtbarer Befund dieser Writer-Diagnose, kein Word-PASS. Auch andere Vorlagenformen, grosse eigene Chrome-Zonen und lange Inhalte in beiden Geschichten benötigen noch gezielte Prüfung.

Seitengebundene Bildposition plus Picture-SDT im frischen Quellpaket beweist weder Bildbesitz noch Absatzidentität oder Bearbeitbarkeit nach Speichern. Die historische PopSdt-/Paragraph-Disposal-Hypothese wird durch diese Runde nicht bestätigt. Ebenso wurde das historische 22er-Gate nicht neu ausgeführt oder abgeschwächt.

## Nächste Schritte und Abnahme

1. Gemeinsame Typografie und Kopf-/Fusszonen an die authored Textbereiche anbinden; insbesondere die sichtbare linke Fusszeile und die Abstände zur ersten Rubrik prüfen. Die gespeicherten Source-Felder und Bildpixel müssen unverändert bleiben.
2. Zusätzlich zwei gültige, nicht überdeckende Foto-Entwürfe in der App speichern und über deren normale PDF-Vorprüfung bestätigen. Die heutigen Grenzfälle bleiben unverändert als Regressionseingaben erhalten.
3. Danach ein einziges konsolidiertes Desktop-Word-Paket vorbereiten: links/rechts, freies editierbares Foto mit Crop und ein langer CV. Textänderung und Bildausschnitt bearbeiten, speichern, schliessen und erneut öffnen; danach sichtbare Ausgabe, Feld-IDs, Absatz-/Bildbesitz, volle Pixel und Crop getrennt bewerten.
4. Erst danach die unveränderte vollständige Sidebar-Abnahme und die Merge-Entscheidung. Die ursprüngliche Word-Abnahme von Modern 02 und Brief 12 wird weder erneut angefordert noch auf diese neuen Sidebar-Bytes übertragen.

**Verdikt: gemeinsamer Geometrie- und Bildzonen-Schritt geprüft; Native Sidebar insgesamt weiterhin NO-GO für Produktion.** Kein Merge, keine Produktionsumschaltung, kein manuell ausgelöstes Deployment, kein CI-Dispatch und kein Office-Engine-Patch. Die Architektur folgt der empfohlenen Vereinfachung aus dem [vorherigen Befund](docx-next-sidebar-saved-projects-22okt.md); dies ist keine weitere Rundungskorrektur.
