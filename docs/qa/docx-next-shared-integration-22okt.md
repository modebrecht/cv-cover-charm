# Gemeinsamer DOCX Integrationsstand

**Korrektur 23. Oktober:** Das ausgelieferte Word-Paket ist als Abnahmepaket zurückgezogen. [Konkrete Ursachen, Korrekturen und Grenzen der Foto-/Branch-Prüfung](docx-next-sidebar-feedback-23okt.md). Keine weitere Benutzerprüfung dieses Pakets. Die folgenden Checkpoints bewahren ihren historischen Umfang.

Aktueller Reparaturschritt: [Kontaktköpfe und mehrseitiger Sidebar-Textfluss](docx-next-sidebar-contact-flow-24okt.md), auf Basis `faacd28a09d0651eb1b4166fa1253a993fb37928`. Der hängende Langfall ist auf den Umfluss nativer Kopf-Textframes eingegrenzt. Die gemeinsame Header-Komposition schaltet diesen Umfluss aus; Haupttext, Tabellen, Bilddaten und Crops bleiben bytegleich. Alle acht frischen App-Fälle rendern jetzt auf 26 Writer-Seiten, einschliesslich voller und reduzierter Folgeseitenköpfe. 528 Tests und fokussiertes striktes TypeScript bestehen. Normale Sidebar-Sperre und NO-GO bleiben erhalten; Word Save/Reopen und die wiederholten Header-Feldkennungen sind nicht abgenommen. Der folgende Text bewahrt die früheren Checkpoints.

22. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Basis: aktueller Fidelity-Kopf `7be40063856d1376acb60e917fe85599a6033dad`.

Die gesicherten Sidebar-, Pagination-, Seitenflächen- und Dokument-Skalierungs-Fixes sind hier zu einem gemeinsamen Quellstand zusammengeführt. Die lokale Projektion bestand 206 gezielte Tests und eine fokussierte strikte Typprüfung. Nach dem Ausfall der Ausführungsumgebung wurde die gleiche dokumentierte Patchfolge über die verifizierten GitHub-Quellen erneut zusammengesetzt und auf diesem Branch gesichert. Für den veröffentlichten Code-Commit `90216cb21ffeaf3b555ebde48b5e65c7bc64f602` ist inzwischen auch der vorhandene Vercel-Build anhand seiner Metadaten und Buildprotokolle bestätigt. Nach Wiederherstellung der Laufzeit wurden die unten beschriebenen fünf App-Downloads und drei primären PDF-Downloads frisch geprüft. Eine vollständige Produktions- oder Microsoft-Word-Freigabe folgt daraus weiterhin nicht.

## Gepinnte Quellen

| Anteil | Quellstand |
| --- | --- |
| Fidelity mit aktuellen Cover-/Avatar-Primitiven | `7be40063856d1376acb60e917fe85599a6033dad` |
| Sidebar-Fotos, Referenzen und halbe Textbreite | `f73c776e2eca6b9b0d858ee2ab997230259797ac` |
| CV-Pagination und Fusszeilenreserve | `e1f11779db1da78c08651b22b552cf6f54006e5d` |
| Durchgehende CV-Seitenfläche | `f256e1817bad54767f58cfba6c958d21a2151441` |
| Dokumenteigene Skalierung mit neuer Prüfung | `727124a7071aa6184b2e0976c6801a59ff5f14d0` |

Der bestehende 26-Dateien-Transport von Sidebar und Pagination wurde auf den aktuellen Fidelity-Stand angewendet. Darauf folgen der Seitenflächen-Patch und die Skalierung. Die ältere komplette Builder- oder Renderer-Datei wurde nicht über den aktuellen Fidelity-Stand kopiert.

## Aufgelöste Überschneidung

Ein Hunk des Skalierungs-Patches betraf eine Formatierungsstelle bei einer älteren Cover-/Avatar-Prüfung im Builder. Er lässt sich auf die neuere Fidelity-Fassung nicht direkt anwenden. Die aktuellen Fidelity-Bedingungen bleiben erhalten. Aus diesem Patch wurden im Builder ausschliesslich der Import von `scaleCvReadingFlow` und der Aufruf nach Übernahme der gemessenen CV-Textrollen ergänzt. Die übrigen Skalierungsdateien und der Seitenflächen-Patch wurden unverändert übernommen.

Die CV-Seitenfläche ist seitengebundene Dekoration. Tabellenbreiten, Content Controls, Fotos und Textpositionen behalten ihre bestehenden Besitzer. Die Skalierung greift nur im klassischen gemessenen CV-Lesefluss. Der Sidebar-Pfad bleibt davon ausgeschlossen. Die Fusszeilenreserve und die expliziten Benutzereinstellungen behalten ihre zuvor geprüften Regeln.

## Prüfung und Grenzen

| Prüfung | Ergebnis |
| --- | --- |
| Frisch verifizierte Fidelity-Anwendungsquellen vor den Patches | 417 Dateien |
| Zusätzlich benötigte Remote-Eingaben | 40 Dateien einschliesslich Root-Konfiguration |
| Gezielte Tests des gemeinsamen lokalen Standes | 206 bestanden, 0 fehlgeschlagen, 27 Testdateien, 2851 Erwartungen |
| Fokussiertes striktes TypeScript | PASS für Builder, Renderer und Browser-Skalierungshelfer |
| Unveränderte Übernahme der beiden neuen Quell-Checkpoints | 7 betroffene Quell-/Testdateien exakt gleich; Builder bewusst kombiniert |
| Repository-Lockdatei | Originalabhängigkeiten eingefroren installiert, 463 Pakete |
| Originaler Vite-Buildbefehl | Prozess meldete Exit 0; Buildlog und Artefakte danach nicht mehr lesbar |
| Vorhandener Vercel-Build für Code-Commit `90216cb` | PASS: Client und SSR gebaut, Ausgabe erzeugt, Preview READY |
| Neue UI-Downloads des integrierten Branches | 5 bestanden, 3 unterschiedliche Dossiers; temporäre QA-SPA mit unveränderten App-Quellen |
| Neues natives Rendering des integrierten Branches | 3 App-Dossiers und 3 interne Sidebar-Diagnosen; 26 LibreOffice-Seiten erzeugt |
| Microsoft Word für diesen gemeinsamen Stand | Unbestätigt |

Die erste Testausführung enthielt zwei Modul-Ladefehler wegen der fehlenden jsPDF-Abhängigkeit in der partiellen Prüfumgebung. Nach Verknüpfung mit der vorhandenen echten jsPDF-4.2.1-UMD-Abhängigkeit lief die vollständige hier materialisierte 27-Dateien-Auswahl grün. Das ist kein Mock und keine Produktänderung. Diese anfänglichen Läufe werden nicht als PASS gezählt.

Die Auswahl umfasst die vorhandenen CV-/Pagination-/Modelltests, Sidebar-/Foto-/Tabellen-Tests, die kombinierte Cover-/Sidebar-Ownership-Prüfung und angrenzende Cover-/Brief-Tests. Das Repository hat weitere Unit-Testdateien; eine vollständige Repository-Suite wird nicht als bestanden erklärt.

Nach Installation der unveränderten Repository-Lockdatei wurde `vite build` mit der Originalkonfiguration gestartet. Die Prozessschnittstelle lieferte Exit 0. Beim anschliessenden Lesen des Protokolls brach die Verbindung ab; danach meldet die Umgebung ausdrücklich `environment_offline`. Deshalb wird der Build hier nur als erfolgreich beendeter Prozess, nicht als vollständig geprüfter Produktionsbuild mit inspizierten Artefakten geführt.

### Nachträglich bestätigter Remote-Build

Die bestehenden Vercel-Metadaten nennen exakt `90216cb21ffeaf3b555ebde48b5e65c7bc64f602` und `fix/docx-next-shared-integration-22okt`; Ziel ist eine Preview, nicht Produktion. Das vorhandene Deployment `dpl_J1oekFwwk8BZZaSY4xN6ym4NAoRp` ist `READY`. Die Protokolle bestätigen `bun run build` / `vite build`, einen erfolgreichen Client-Build in 5,96 Sekunden, SSR in 1,81 Sekunden, erzeugtes `nitro.json`, `Build Completed` und `Deployment completed`. Damit ist der Build-Nachweis für diesen Code-Stand geschlossen. Die Dateien der Ausgabe wurden nicht inhaltlich inspiziert; Bundle-Auflistungen ersetzen keine Exportprüfung.

Der direkte Preview-Abruf über den Vercel-Connector endete mit einem Timeout. Ein separater Web-Abruf konnte die URL ebenfalls nicht erreichen. Das belegt keine Störung der Anwendung und keine erfolgreiche Browser-Prüfung. Frische UI-Downloads, natives Rendering und die Word-Abnahme dieses gemeinsamen Standes bleiben offen. Es wurden nur bestehende Deployment-Daten gelesen; weder Redeploy noch CI-Dispatch oder eine Produktionsänderung wurden ausgelöst. Der folgende Dokumentations-Commit ändert den geprüften Produktcode nicht.

Die Rekonstruktion nach dem Ausfall nutzt dieselben drei veröffentlichten Patches in derselben Reihenfolge und die oben beschriebene gezielte Builder-Auflösung. Die 17 benötigten Basis-Blobs wurden unabhängig gegen ihre Git-IDs geprüft. Die veröffentlichten Dateihashes stehen im [Integrationsnachweis](docx-next-shared-integration-22okt-evidence.json). Der vollständige lokale Baum konnte nach dem Ausfall nicht erneut ausgelesen werden.

## Frische App-Prüfung nach Wiederherstellung der Laufzeit

Der Remote-Kopf wurde vor Arbeitsbeginn erneut geprüft: `59ec45f740c45b1277d33b5b719f1cc9af1313c0`. Ein späterer Commit auf diesem Branch war nicht vorhanden. Die Laufzeit enthielt ältere Arbeitsverzeichnisse. Diese wurden erhalten; der aktuelle Remote-Stand wurde in einem neuen Prüfverzeichnis materialisiert. 432 Quell-, Konfigurations- und Prüfdateien stimmen vor und nach der QA mit ihren Git-Blobs überein. Zusätzlich wurden alle vier verwendeten Cabin-TTF-Dateien gegen die Remote-Hashes geprüft.

| Fall | Frisches Ergebnis |
| --- | --- |
| Modern 05 mit eigenen Werten, ohne Seitenanpassung | 1 CV-Seite im Browser, App-PDF und LibreOffice-Rendering; beide Referenzen auf dieser Seite |
| Modern 05 bei DPR 1, DPR 2 und schmaler Ansicht mit Vorschau-Zoom | 3 bytegleiche UI-DOCX; Modell und Messwerte gleich; gespeicherte Werte unverändert |
| Modern 02 mit bestehender intelligenter Seitenaktion | Automatik wählt 1 CV-Seite; Browser, App-PDF und LibreOffice stimmen bei der Seitenzahl überein; Referenz bleibt im CV |
| Brief 12 mit derselben Seitenaktion | Ebenfalls 1 CV-Seite; Seitenzahlen stimmen überein; Referenz bleibt im CV |
| Aktive SDT-IDs in den drei unterschiedlichen App-Paketen | 88 / 85 / 85; keine doppelten aktiven IDs |
| Sidebar-Portrait 04 und gespiegeltes freies Foto 05 | Interne Diagnose: Original-PNG vollständig und bytegleich im zuständigen Bild-Control; 80 eindeutige Controls je Paket |
| Rechter Sidebar-Langfall | Interne Diagnose mit 8 Hobbys und bestehender langer Schulliste: 9 CV-Seiten; 337 eindeutige Controls; vollständiger CV-Text |
| Durchgehende Sidebar-Fläche | Auf allen 11 CV-Seiten der drei Diagnosen am oberen, mittleren und unteren Aussenrand bestätigt |

Die drei App-Dossiers wurden aus gespeicherten Projekten über die vorhandenen App-Importe restauriert. Die bestehenden Download-Schaltflächen lieferten exakt die zuvor frisch vom jeweiligen Export-Einstieg erzeugten Bytes. Alle fünf DOCX-Downloads und drei normalen PDF-Downloads liessen die gespeicherten Eingaben unverändert und hatten keine erfassten JavaScript-Seitenfehler. Die neun nativen Seiten dieser drei App-Dossiers wurden visuell geöffnet; das bestätigt für diese Fälle lesbare Seiten ohne verlorene Referenzen, aber keine vollständige Web/Word-Fidelity.

Die QA nutzte Chrome for Testing 156.0.8078.47 und eine temporäre Vite-SPA mit den unveränderten App-Quellen. Echte vorhandene jsPDF-4.2.1-UMD- und quellbasierte Query-/html2canvas-Abhängigkeiten ersetzten fehlende Installationspakete der Prüfumgebung. Es gab keine gemockten App-Komponenten oder Exporter. Dies ist keine neue saubere Installation der Original-Lockdatei und keine Browser-Abnahme des produktiven SSR-Servers. Dessen bestehender Build-Nachweis bleibt separat gepinnt. Im Browser wurde Liberation Sans verwendet; identische Arial-Schriftmetriken in Word sind nicht bewiesen.

Die Sidebar-Fälle sind ausdrücklich interne Modell-/Renderer-Diagnosen mit einem vollständigen synthetischen 120×180-PNG. Sie sind keine regulären Sidebar-App-Downloads und kein Ersatz für ein echtes Benutzerfoto. Der vorhandene geschützte App-Einstieg akzeptiert weiterhin nur das klassische CV-Layout. Der Portrait- und Spiegelungsfall wurden visuell geprüft; beim langen Fall wurden alle Seitenflächen und Feldtexte automatisiert sowie eine Gesamtübersicht geprüft. Die Feldtextprüfung berücksichtigt getrennte Spalten über Seiten hinweg: Der zunächst scheinbar fehlende Text von Hobby 5 steht vollständig am Ende der ersten und Anfang der zweiten Sidebar-Seite. Das war eine Einschränkung der seitenweisen Textextraktion.

Speichern und erneutes Öffnen in Word oder LibreOffice wurde in dieser Runde nicht ausgeführt. Die Originalbilder sind in den frisch erzeugten Diagnosepaketen erhalten; das beweist ihre Word-Bearbeitbarkeit oder den Erhalt nach Save/Reopen noch nicht. Der 22-Fälle-Lauf und die Unit-Suite wurden nicht erneut ausgeführt, weil kein Produktcode verändert wurde. Bestehende Unterschiede bei Überschriften und Pills werden nicht als neue vollständige visuelle Abnahme geführt.

Die Dateihashes, Laufzeitgrenzen und Einzelergebnisse stehen im [App-QA-Nachweis](docx-next-shared-integration-app-qa-22okt.json).

## Bestehende Word-Ergebnisse bleiben begrenzt

Die ursprüngliche 02/12-Word-Abnahme einschliesslich Speichern und erneutem Öffnen bleibt geschlossen. Sie wird nicht auf neue Paketbytes übertragen. Die bisherigen Sidebar-Foto-Ergebnisse behalten ihren genauen bisherigen Umfang. Die drei App-Downloads der rekonstruierten Skalierung und die früheren Seitenflächen-Render sind Ergebnisse der jeweiligen Einzel-Checkpoints und keine neue Abnahme dieses gemeinsamen Branches.

Die vollständige Sidebar-Geometrie, Bildbearbeitbarkeit, All-39-Fidelity und allgemeine Browser-/Word-Seitengleichheit bleiben getrennte Gates. Es wurde kein Gate abgesenkt und keine Zwischenrunde beim Benutzer angefordert.

## Neuer Bildfix und tatsächliche Sidebar-Geometrie

Die anschliessende Prüfung aus gespeicherten App-Projekten fand eine exporterinterne Verkleinerung von 1920 × 2880 auf 1067 × 1600 Pixel vor jedem Office-Import. Diese 1600-Pixel-Grenze ist im gemeinsamen Normalisierer entfernt; die vollständigen Pixel sind im erzeugten DOCX bestätigt. 38 angrenzende Tests bestehen. Gleichzeitig ist die Seitenspalte in der App 63 mm breit, im bisherigen nativen Aufbau bei diesen Einstellungen aber 71,4 mm links und 69,4 mm rechts. Zwei freie Fotozustände scheitern schon an der PDF-Vorprüfung. Native Sidebar bleibt NO-GO; es wird kein fertiges Word-Paket behauptet. Details und die drei reproduzierbaren App-Speicherdateien sind im [neuen Befund](docx-next-sidebar-saved-projects-22okt.md) beschrieben.

## Gemeinsame Sidebar-Geometrie als neuer interner Kandidat

Auf Basis von `037bceb5c506685be25fb8c20b9283591f06fcd1` verwenden Web und `shared-body-stories` dieselben authored Rail- und Textzonen. Links/rechts ergeben sich nun jeweils 63 mm Sidebar und 8 mm Standardgutter. Der ursprüngliche freie x25-Fotofall exportiert ohne Verschiebung oder Verkleinerung. Volle Bildpixel, Crops und Feld-IDs bleiben erhalten; Titelblatt- und Anschreiben-Modelle sind in den drei wiederholten App-Fällen unverändert. 74 gezielte Tests und die fokussierte strikte Typprüfung bestehen. Die normale Sidebar-Sperre bleibt geschlossen.

Die bisherige Dokumentation zu 71,4/69,4 mm beschreibt den älteren Kandidaten, nicht diesen neuen Geometriepfad. Sichtbare Typografie-/Chrome-Abweichungen, überdeckende Foto-Quellzustände und Word Save/Reopen bleiben offen. Der [neue Bericht](docx-next-sidebar-shared-geometry-22okt.md) enthält Umfang, Grenzen und den zusätzlichen gespeicherten x25-Grenzfall.

## Sidebar-Typografie und kompakte Zonen

Der nachfolgende [Typografie-Checkpoint](docx-next-sidebar-typography-22okt.md) bindet den internen gemeinsamen Kandidaten an frische kanonische App-Schriftwerte, Rubrikabstände, native Datums-/Referenzspalten und leere kompakte Kopf-/Fussstreifen. Drei zusätzliche gültige Foto-/Typografie-Projekte bestehen zusammen mit dem Langfall die normale PDF-Vorprüfung. 95 gezielte Tests und fokussierte strikte Typen bestehen; der Anzeige-Skalierungsvergleich liefert bytegleiche DOCX. Alle CV-Feldtexte und vollständigen Bildpixel sind in den frischen Paketen erhalten. Titelblatt und Anschreiben bleiben modellgleich.

Die neue direkte PDF-Gegenüberstellung bestätigt zugleich sichtbare Restfehler: Writer rendert freie Fotos bei rund y=220 statt authored y=210 mm, der Textfluss unterscheidet sich und ein kurzer Schuleintrag wird am Seitenende geteilt. Das korrigiert keine Word-Freigabe und überträgt auch keine alte Abnahme auf neue Bytes. Die vollständige Sidebar bleibt NO-GO; Messwerte und Bilder nach Word Save/Reopen sind weiter unbestätigt.

## Bildanker und Einträge am Seitenende

Der [anschliessende Reparaturschritt](docx-next-sidebar-anchor-entry-22okt.md) legt freie Seitenbilder mit unveränderten Offsets vor die kontinuierliche Sidebar-Tabelle. Im Writer-Vergleich verschwindet damit der etwa 10 mm grosse Versatz links und rechts. Kurze Datums-Einträge werden über die vorhandene Tabellenzeile zusammengehalten; überlange Beschreibungen bleiben teilbar. 111 gezielte Tests und fokussierte strikte Typen bestehen. Die vier Vergleichsfälle behalten ihre vollständigen Bilder, Crops, Feldtexte und Seitenzahlen; Titelblatt und Anschreiben sind auch im nativen Render pixelgleich. Ein zusätzlicher 90-Zeilen-Eintrag fliesst vollständig über vier CV-Seiten. Word Save/Reopen und die Gesamt-Fidelity bleiben offen.

## Flächen und Textfluss: konsolidierte Word-Abnahme vorbereitet

Der [Flächen-Checkpoint](docx-next-sidebar-surfaces-22okt.md) und der anschliessende [Textfluss-Fix](docx-next-sidebar-flow-22okt.md) sind auf demselben Branch integriert. Unabhängige vertikale Spaltenränder, gemessene native Zeilenhöhe, vorhandene Datumsbreite und native Absatzgrenzen sind korrigiert. Die Überschrift bleibt bei ihrem ersten kurzen Eintrag; lange Beschreibungen bleiben teilbar. 118 gezielte Tests, fokussierte strikte Typen sowie vier frische App-/Writer-Fälle bestehen. Ein echtes JPEG ist in zwei zusätzlichen Foto-Demo-Fällen mit allen 1200 × 994 browserdekodierten Pixeln im exportierten Bild-Control erhalten. Einzelheiten und verbleibende Millimeter-Abweichungen stehen im Bericht.

## Nächster ausführbarer Schritt

1. Das zurückgezogene Paket nicht weiter zur Abnahme verwenden. Die vorgesehene Konfiguration samt Header-/Footer-Modi zuerst intern konsolidiert prüfen; nur synthetische Testbilder verwenden.
2. Den neuen App-/QA-Befund von einer späteren Word-Save/Reopen-Prüfung trennen. Neue Paketbytes erben keine frühere Word-Abnahme.
3. Danach die offenen Fidelity-/Produktgates und die weitere Bildarchitektur entscheiden.

**Status: altes Abnahmepaket zurückgezogen; vollständige Sidebar weiterhin NO-GO.** Kein Merge nach `dev`, `main`, `render` oder in aktive Quellbranches. Kein manuell ausgelöstes Deployment, CI-Dispatch, Produktionsschalter oder Engine-Patch. Historische Word-Abnahmen werden nicht auf neue Bytes übertragen.
