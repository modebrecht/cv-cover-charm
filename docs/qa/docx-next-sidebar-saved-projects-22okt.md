# Sidebar Prüfung aus gespeicherten App Projekten

22. Oktober 2026. Arbeitsbranch: fix/docx-next-shared-integration-22okt. Geprüfte Basis: dfef6297f1b145c56140723957f092b659dde2d1. Diese Runde ergänzt die vorherigen Integrationsnachweise und ist keine vollständige Wiederholung des historischen Sidebar-Audits.

Die neue Prüfung bestätigt einen vom Exporter verursachten Bildverlust vor jeder Office-Anwendung. Dieser Fehler ist in dieser Runde behoben. Gleichzeitig zeigen aus der App gespeicherte Projekte einen wesentlich grösseren Geometrieunterschied als den historischen Writer-Versatz: Die App und der native Sidebar-Unterbau berechnen die Seitenspalte aus verschiedenen Bezugsflächen. Native Sidebar bleibt deshalb NO-GO. Ein weiteres Word-Zwischenpaket wäre verfrüht.

Der nachfolgende [Geometrie-Checkpoint](docx-next-sidebar-shared-geometry-22okt.md) behebt diese Breitenabweichung in einem neuen internen Kandidaten. Die folgenden Messwerte dokumentieren weiterhin den damaligen Aufbau und werden nicht als aktueller Kandidaten-PASS umgedeutet.

## Was tatsächlich geprüft wurde

Aus dem bereits verwendeten Modern-Demoprojekt wurden in der App drei Varianten geöffnet, gespeichert und erneut geladen: freies Portrait links, freies gespiegeltes Foto rechts und ein rechter CV mit zwölf Schuleinträgen und Folgeseite. Die JSON-Dateien unter tests/fixtures/docx-next/sidebar-saved-app-22okt sind tatsächliche App-Speicherdateien. Sie enthalten weiterhin die bekannte Demo-Person und das bekannte synthetische Testfoto, keine neu erfundenen Kundendaten oder echten Portraits.

Der normale DOCX-Next-Einstieg wurde für jede Variante aufgerufen und wies Sidebar weiterhin mit seiner bestehenden Beschränkung auf das Standard-CV zurück. Danach wurde der native Kandidat ausdrücklich intern aus dem frisch erfassten App-Snapshot erzeugt. Es gab keinen Produktionsschalter und keine Änderung an dieser Sperre. Der Default-Browser-Normalisierer und der Default-Dekorationsrenderer wurden verwendet, keine Bild- oder Rasterizer-Ersatzadapter.

## Belegmatrix

| Befund | Einstufung | Konsequenz |
| --- | --- | --- |
| 1920 × 2880 werden vor dem Fix zu 1067 × 1600 Pixeln | Exporterdefekt, reproduziert | Originalauflösung geht bereits vor Word/Writer verloren |
| Nach dem Fix bleiben 1920 × 2880 und der RGBA-Hash erhalten, auch im zuständigen DOCX-Bild-Control | Behoben und geprüft | Kein stiller 1600-Pixel-Deckel mehr |
| Kleine PNG- und fotoarme Kontrollpakete bleiben bytegleich | Bestätigte Regressionseingrenzung | Kein Layoutwechsel durch diesen Bildfix |
| Sidebar in der App rund 63 mm, im Modell 71,4 mm links und 69,4 mm rechts | Bestätigte Exporter-/Quellgeometrie-Abweichung | Sichtbarer Produktfehler, kein Office-Rundungsbeleg |
| Freies gespiegeltes Bild bei x = 25 mm passt im App-Projekt, wird vom nativen Track abgewiesen | Bestätigte Unterstützungsgrenze | App-erlaubte Koordinaten und native Inhaltszonen stimmen nicht überein |
| Zwei Fotoprojekte bestehen die normale PDF-Vorprüfung nicht; CV-Text überlappt | Bestätigter Zustand dieser Prüfprojekte | Nicht als fertige Vergleichs-PDF oder Word-Abnahme ausgeben |
| Der lange rechte CV erhält ein normales App-PDF; App und LibreOffice haben je zwei CV-Seiten | Bestätigter begrenzter Seitenzahltest | Kein Beweis für gleiche Typografie oder Geometrie |
| Aktive Controls 90 / 90 / 130 mit eindeutigen IDs; Bilder gehören cv.person.photo | Bestätigter Quellpaketbefund | Keine Aussage über Save/Reopen |
| Writer ersetzt Bilder beim Speichern | Historischer Befund, hier nicht neu getestet | Nicht Microsoft Word zuschreiben |
| Word erhält Pixel, Crops und Bearbeitbarkeit nach Save/Reopen | Unverifiziert | Bleibt eigenes Abnahme-Gate |
| PopSdt/Paragraph-Disposal erklärt diese Ergebnisse | Nicht bewiesen | Keine Importer-Hypothese zur Ursache erklären |

## Kleiner umgesetzter Bildfix

In src/lib/docx-next/images.ts begrenzte normalizeBrowserImage die lange Bildkante auf 1600 Pixel. Diese Normalisierung ist die Bildquelle des nativen Renderers, nicht bloss eine Vorschau. Der neue Browsertest zeigte vor dem Fix den Verlust der Originalauflösung und einen anderen Pixelhash.

Der Normalisierer verwendet jetzt die vollständigen dekodierten Bildabmessungen. Anzeigegrösse, Rahmen und Ausschnitt bleiben Sache der bestehenden nativen Bildgeometrie. Am gespeicherten App-Snapshot, am Modell und an den Schriftmesswerten änderte sich in keinem der drei Fälle etwas.

Das 1920-×-2880-PNG wurde im Browser vor und nach Normalisierung als sRGB-RGBA gelesen. Der Hash blieb nach dem Fix exakt gleich. Die anschliessende unabhängige DOCX-Inventur bestätigte dieselben Abmessungen und Pixel im Bild-Control. Das grosse Paket wuchs im Test von 237072 auf 283226 Bytes. Das 120-×-180-Kontrollpaket und das Dossier ohne Foto blieben bytegleich.

Das ist kein Nachweis für unveränderte JPEG-Dateibytes, EXIF- oder ICC-Metadaten: Die vorhandene Browser-Normalisierung dekodiert weiter und erzeugt PNG. Ebenso wenig beweist es den Erhalt nach Office-Speichern. Für die spätere Word-Prüfung ist auch die standardisierte Einstellung doNotAutoCompressPictures zu bewerten; sie kann automatische Bildkompression beim Speichern untersagen. In dieser Runde wurde diese Dokumenteinstellung nicht geändert. Quelle: [Microsoft Open XML Dokumentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.donotautocompresspictures?view=openxml-3.0.1).

## Geometrie als eigentliche Architekturabweichung

Die App-Funktion sidebarWidthMm berechnet die Breite für diesen Modern-CV aus der ganzen 210-mm-Seite: 30 Prozent ergeben 63 mm. Die DOM-Prüfung ergab unter der bestehenden Vorschau ungefähr 62,98 mm; diese kleine Messabweichung ist keine Word-Geometrieprüfung.

composeCvSidebar berechnet die Trackbreiten dagegen aus der verbleibenden Inhaltsbreite nach Seitenrändern und einem weiteren 6-mm-Zwischenraum. Die neue durchgehende Seitenfarbe folgt dieser nativen Trackkante. Bei den tatsächlichen Standardrändern dieser App-Projekte ergeben sich 71,4 mm links und 69,4 mm rechts. Die durchgehende Flächenzeichnung funktioniert, übernimmt aber eine vom Browser abweichende Spaltengrenze. Eine richtige Flächenhöhe allein bedeutet daher keine richtige Sidebar-Geometrie.

Der native Kandidat zeigte daneben andere Schriftgrössen, Abstände und kompakte Kopf-/Fussgestaltung. Diese Unterschiede wurden im LibreOffice-Rendering gesehen; der tatsächliche Word-Umfang ist unbestätigt. Die Berechnung der unterschiedlichen Spaltenbreiten steht bereits vor dem Office-Import fest und ist kein LibreOffice-Problem.

Beim gespiegelten freien Foto weist das native Layout x = 25 mm mit der bestehenden Rahmenstärke ab. Das ursprüngliche abgewiesene Projekt und die Fehlermeldung wurden lokal erhalten. Für den gesonderten Auflösungstest wurde ein zweites, innenliegendes Prüfprojekt mit x = 27 mm gespeichert. Diese Änderung des Testeingangs ist kein Exporter-Fix für x = 25 mm und keine Abnahme dieses ursprünglichen Falls. Es wurden keine kompensierenden Export-Offsets eingeführt.

Die freien Fotopositionen überdecken in diesen zwei App-Varianten Text. Die normale PDF-Vorprüfung sperrt sie. Diese Quellprojekte sind zur Fehlerabgrenzung nützlich, aber kein geeignetes fertiges Word-Abnahmepaket. Der lange CV besteht die PDF-Vorprüfung, macht die erheblichen typografischen Unterschiede trotzdem sichtbar.

## Drei Lösungswege

Die folgenden Bewertungen sind Architekturabschätzungen, keine bestätigten Word-Ergebnisse.

| Kriterium | A Aktuelle Primitive schrittweise reparieren | B Gemeinsame Seitenspalten-Geometrie und einfachere native Komposition | C Andere OOXML-Struktur mit Abschnittsspalten oder getrennten Rahmen |
| --- | --- | --- | --- |
| Word-Fidelity | Verbesserbar; bisher mehrere getrennte Mass- und Stilregeln | Beste Aussicht durch gemeinsame authored Regeln | Gute feste Optik möglich; Flussverhalten gesondert zu entwerfen |
| Editierstabilität | Bestehende Kopplungen bleiben zu prüfen | Native Absätze und Tabellen; Bild erhält klaren Besitzer | Zusätzliche Story-/Rahmenbesitzer erschweren Abnahme |
| Originalbilder | Bildfix ist unabhängig anwendbar | Volle Bildquelle, separater nativer Crop und Rahmen | Ebenfalls volle Assets möglich; Struktur allein garantiert nichts |
| Lange Inhalte | Bestehende Tabellen-/Zonenlogik weiter absichern | Word darf Text innerhalb deklarierter Spalten umbrechen | Abschnittsspalten sind kein fertiger Ersatz für zwei unabhängige Inhaltsgeschichten; Rahmenfortsetzung wäre zusätzliche Arbeit |
| Links/rechts | Asymmetrische Ränder weiterhin Teil der Rechnung | Eine logische Geometrie, danach physisch spiegeln | Eigene Spiegelungs- und Ankerregeln nötig |
| Aufwand | Zunächst klein, Gesamtrisiko schwer abzugrenzen | Mittel, klar begrenzter Unterbau | Hoch |
| Regressionen | Viele einzelne Wechselwirkungen | Bewusst neue Sidebar-Komposition mit alten Gates | Breiter Strukturwechsel |
| LibreOffice-Abhängigkeit | Keine nötig; keine Importer-Kompensation | Keine | Keine nötig, aber zusätzliche Interoperabilitätsfläche |

**Empfehlung B.** Eine reine, deklarative Sidebar-Geometrie soll Breite, physische Kante, Innenabstände und nutzbare Textzonen aus denselben gespeicherten Regeln liefern, die auch die App verwendet. Der DOCX-Renderer soll diese Regeln in native Tabellen-/Absatzstruktur übersetzen und die volle Seitenfarbe separat zeichnen. Textkontrollen und ein natives Bild mit Ausschnitt erhalten eindeutige Besitzer. Ein Foto darf seine editierbare Quelle nicht durch eine dekorative Rasterfassung ersetzen.

Die genaue Tabellen-/Ankerstruktur bleibt ein zu prüfender Entwurf. Insbesondere dürfen freie Bilder nicht still in eine andere Position verschoben werden, um sie in den aktuellen Track zu zwingen. Ein ungültiger oder überdeckender Quellzustand muss sichtbar abgewiesen werden. Browser-Seitenfragmente und DOM-Textpositionen werden nicht zur Word-Pagination kopiert.

Die OOXML-Abschnittsspalten unter Option C sind standardisiert, liefern aber allein keine passende semantische Sidebar-Abstraktion. Ihre Existenz ist kein Beleg für die nötige Bearbeitungsstabilität: [Microsoft Columns Dokumentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.columns?view=openxml-3.0.1).

**Wenn wir heute neu begännen, würden wir Native Sidebar so nicht bauen.** Beibehalten würden wir das kanonische Modell, native Texte, Originalbildquellen und die Trennung von Dekoration und Inhalt. Neu entwerfen würden wir die doppelte Spaltenberechnung, die Übertragung gespeicherter Foto-Koordinaten in die native Besitzerzone sowie die gemeinsamen Text-/Chrome-Regeln.

## Prüfung und nächste Umsetzung

38 angrenzende Modell-/Renderer-Tests bestehen mit 306 Erwartungen. Der neue Browserlauf scheitert vor dem Fix am grossen Foto und besteht die Pixelprüfung nach dem Fix. Ein weiterer Lauf lädt ausschliesslich die drei gespeicherten JSON-Dateien; alle drei DOCX stimmen bytegenau mit den vorherigen Ergebnissen nach dem Fix überein. Alle gespeicherten Eingaben bleiben unverändert, der reguläre Sidebar-Export bleibt gesperrt.

Die drei nativen Dossiers wurden mit LibreOffice gerendert, insgesamt zehn Seiten. Visuell geöffnet wurden die CV-Seiten beider Fotofälle und beide CV-Seiten des langen Falls. Diese Diagnosepakete werden wegen der festgestellten Abweichungen nicht als fertige Word-Prüfpakete ausgeliefert.

1. Gemeinsame reine Sidebar-Geometrie samt linken/rechten Inhaltszonen entwerfen; die vorhandenen Browser-/Word-Berechnungen auf dieselbe Quelle zurückführen.
2. Danach die native Bild-/Textbesitzerstruktur und die Übernahme der expliziten Typografie prüfen. Die neue Bildauflösungs-Regressionsprüfung beibehalten.
3. Drei nicht überdeckende App-Projekte mit normalem PDF-Export als Vergleich herstellen. Die heute abgewiesenen Koordinaten als eigene Grenzfälle erhalten.
4. Erst dann eine kleine konsolidierte Desktop-Word-Prüfung: links, rechts, editierbares Foto mit Crop und lange Inhalte. Speichern, schliessen, erneut öffnen; danach Text, Feld-IDs, Bildpixel, Crop und Editierbarkeit getrennt auswerten.
5. Die spätere vollständige 22er-Abnahme bleibt unverändert. Ein begrenzter Word-Smoke ersetzt sie nicht.

**Verdikt: Bildauflösungs-Fix verifiziert; Native Sidebar insgesamt NO-GO.** Die heutige 0,018-mm-Rundungsfrage ist für diese Entscheidung nachrangig. Kein Merge, kein manuelles Deployment, kein CI-Dispatch, kein Engine-Patch und keine neue Zwischenrunde beim Benutzer.

