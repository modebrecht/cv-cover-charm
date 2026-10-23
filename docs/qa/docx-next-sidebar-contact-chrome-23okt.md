# Sidebar: gemeinsame Kopfabstände und Kontaktköpfe

23. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`, Basis `4521a8451dd04273a9788cba5dc3feefda134d48`. Interner Reparaturschritt; keine Produktions- oder Microsoft-Word-Freigabe. Das [zurückgezogene Benutzerpaket](docx-next-sidebar-feedback-23okt.md) bleibt zurückgezogen.

Die Sidebar übernahm den gemeinsamen Abstand unter dem Kopf nicht vollständig. Das automatische Foto begann rund 12,5 mm nach dem Kopf, während der Haupttext den bereits vorgesehenen Abstand von 20 mm einhielt. Hinzu kam ein Exportfehler auf Folgeseiten: Fehlte ein gespeicherter eigener Wert, erfasste der Snapshot weiterhin den historischen Sidebar-Standard von 10 mm. Die aktuelle App-Geometrie verwendet dort längst den gemeinsamen automatischen Abstand. Das sind konkrete Inkonsistenzen zwischen Quellerfassung und gemeinsamer Geometrie, keine Rundungsabweichung von einem Twip.

## Änderung

Die gemeinsame Sidebar-Geometrie berücksichtigt den tatsächlichen Haupttextbeginn auch für den Inhalt der Seitenspalte. Tiefere bestehende Template-Einzüge bleiben erhalten. Die Fläche bleibt durchgehend; Breite, horizontale Position und Spiegelung ändern sich nicht. Freie Fotos behalten ihre gespeicherten Koordinaten. Es erfolgt keine automatische Umstellung ihrer Platzierung.

Der Snapshot erfasst nur einen tatsächlich gespeicherten Folgeseitenrand. Ohne diesen Wert berechnet die gemeinsame Komposition den passenden Anfang aus dem Kopf und dem vorgesehenen Abstand. Bewusst gespeicherte Werte, einschliesslich 0 und 10 mm, bleiben erhalten; ein eigener Rand wird nicht durch den neuen Standard ersetzt.

Der interne Sidebar-Kandidat kann nun die bereits vorhandenen gemessenen nativen Kontaktköpfe für Modern/Sans verwenden. Diese besitzen weiterhin Textframes und semantische Controls in den Erst-/Folgeseitenkopf-Stories. Es gibt keinen zweiten Kontaktkopf-Exporter. Frische Messungen für CV und Anschreiben sowie passende Quell- und Schriftprofil-Schlüssel sind erforderlich. Gemischte Kopfmodi, eigene Kopftexte, Verläufe und andere Schriften werden dadurch nicht allgemein freigegeben. Der normale geschützte Sidebar-Produkteinstieg bleibt geschlossen.

Die isolierte Kopfmessung erbt jetzt dieselbe Dokumentschrift wie das echte Blatt. Zuvor konnte sie ausserhalb des Blatts versehentlich die globale Cabin-Schrift erben; der bestehende Schriftvergleich lehnte das korrekt ab. Die Prüfung wurde nicht entfernt. Ein gemeinsamer Helfer neutralisiert zudem nur den Zoom der äusseren Messvorfahren. Die dokumenteigene Skalierung bleibt wirksam.

## Frische Prüfung

Alle Fälle stammen aus dem echten App-Import gespeicherter synthetischer Projekte mit anschliessenden Editorbesuchen, frischer Quellerfassung und normalem primärem App-PDF-Download. DOCX sind ausdrücklich interne Diagnosekandidaten. Die temporäre CSR-Prüfhülle verwendet die tatsächlichen App-Komponenten; sie ist kein neuer Produktions-SSR-Build. Laufzeit: Chrome for Testing 156, unveränderte installierte Lockdatei-Abhängigkeiten; Liberation Sans als Arial-Ersatz für die lokale Darstellung.

| Fall | Nativer Textanfang, erste / weitere CV-Seite | App-PDF | Writer-Import/Render |
| --- | --- | --- | --- |
| Kompakt, links und rechts | 24 / 24 mm | 2 bestanden | 2 gerendert, je 1 CV-Seite |
| Kontakt inline, links und rechts | 46 / 46 mm, Kopf 26 mm | 2 bestanden | 2 gerendert, je 1 CV-Seite |
| Kontakt gestapelt, links und rechts | 52 / 52 mm, Kopf 32 mm | 2 bestanden | 2 gerendert, je 1 CV-Seite |
| Rechts, zwölf Schuleinträge, voller Kontaktkopf auf Folgeseite | 52 / 52 mm | Bestanden, 2 CV-Seiten | Hängender Import abgebrochen; Render offen |
| Derselbe Langinhalt, reduzierter Folgeseitenkopf | 52 / 38 mm, Köpfe 32 / 18 mm | Bestanden, 2 CV-Seiten | Gerendert, 2 CV-Seiten |

Die Live-Vorschau misst rund 19,99 mm Abstand statt zuvor rund 12,49 mm; das reine Modell verwendet 20 mm. Das ist eine praktische Abstandsprüfung mit Vorschau-Rundung, keine Aufweichung der historischen exakten Geometrieprüfung. Beide zweitseitigen App-Fälle halten den Abstand auch auf Seite 2 ein. Die sechs kurzen Fälle und der reduzierte Langfall ergeben 22 gerenderte Dossierseiten. CV-Seiten sowie die verschiedenen Anschreiben-Kopfvarianten und ein unverändertes Titelblatt wurden visuell geöffnet. Für die sieben gerenderten Dossiers sind alle nichtleeren Control-Texte in der normalisierten PDF-Textextraktion enthalten; das ersetzt keine pixelgenaue Gesamt-Fidelity.

Der volle Langkopf blieb in LibreOfficeDev 26.8 alpha0 bei der DOCX→PDF-Konvertierung ohne Ergebnis und verbrauchte bereits über 400 CPU-Sekunden. Der Lauf wurde beendet. Dass der reduzierte Kopf mit gleichem Inhalt rendert, grenzt die Konstellation ein; es beweist weder einen bestimmten Importerfehler noch gültiges Word-Paginieren. Dieser Fall ist ausdrücklich kein PASS. Es wurden keine Office-Binärdateien verändert und keine Ausgleichsoffsets eingebaut.

Weitere Prüfungen:

- 528 Tests in 75 Dateien, 9206 Erwartungen, kein Fehler; fokussierte strikte TypeScript-Prüfung bestanden. Nach Formatierung und abschliessender Präzisierung erneut 15 betroffene Tests mit 1709 Erwartungen bestanden.
- Inline-Kontaktkopf und reduzierter Langfall bei DPR 2 und äusserem CSS-Zoom 0,75: jeweils bytegleiches DOCX zum normalen Lauf. Diese Anzeigeparameter verändern das Dokument nicht.
- Bestehende App-Fälle 03, 05 und 06 erneut importiert, gespeichert und exportiert: Folgeseite, freie Fotopositionen links/rechts, vollständige synthetische Bildpixel, aktuelles kompaktes Chrome und unveränderte gespeicherte Eingaben bestätigt. Kein zusätzlicher Writer-Render dieser drei Regressionen behauptet.
- Alle acht Fälle behalten den geschlossenen normalen Sidebar-Export und unveränderte angrenzende Cover-/Briefmodelle gegenüber demselben aktuellen Chrome-Aufbau ohne Sidebar-Schriftübernahme. Die bewusste Wahl eines Kontaktkopfs ändert selbstverständlich das gemeinsame Chrome beider Innen-Dokumente.

## Bilder und semantische Grenzen

In allen acht frischen DOCX liegt genau ein typisiertes Bild-Control `cv.person.photo`. Seine DrawingML-Beziehung verweist auf die vollständigen normalisierten Pixel des ausschliesslich synthetischen Quellbilds; auch der eingebettete PNG-Dateihash stimmt. Der automatische Portraitrahmen enthält weiterhin seinen vorgesehenen vertikalen Crop von 8333/100000 oben und unten. Vollständige Originalpixel im Paket bedeuten nicht, dass ein absichtlich zugeschnittener Rahmen das gesamte Bild sichtbar zeigt. Die freien Fotofälle 05/06 behalten ihre gespeicherte Darstellung. Private Fotos, Projektdateien oder alte Benutzerbilder wurden für diesen Schritt nicht verwendet oder committed.

Control-Tags sind je XML-Story eindeutig. Kontaktfelder wiederholen ihre kanonischen Quellkennungen jedoch bereits im bestehenden Header-Aufbau zwischen Erst- und Folgeseitenkopf; `cv.person.name` steht zusätzlich im CV-Hauptteil. Bei vollen Kontaktköpfen betrifft das zehn kanonische Kennungen. Das ist kein Beleg für verlorenen Text und kein global eindeutiger Feldbesitz. Der bisherige Vergleichsleser darf solche Fälle nicht als globale Unique-ID-Abnahme ausgeben. Die Evidenz führt jede wiederholte Kennung mit ihren Stories auf.

Word Save/Reopen, synchronisierte Bearbeitung wiederholter Quellfelder, persistierte Absatzidentität und Erhalt von Foto/Crop/Control nach dem Speichern sind weiter unbestätigt. Es gibt keine neue `PopSdt`- oder Absatzdisposal-Ursachenbehauptung. Sichtbarer Text, kanonische Quellkennung, konkrete Control-Instanz und Bildbesitz sind verschiedene Prüfungen.

## Nächster abgegrenzter Schritt und Urteil

Die beiden Abstandsfehler sind behoben und als gemeinsamer Quellstand gesichert. Der Kontaktkopf bleibt ein interner Kandidat. Vor einem neuen Abnahmepaket wird der hängende volle Langkopf auf eine kleine DOCX-Struktur eingegrenzt und gegen den bereits rendernden reduzierten Kopf verglichen. Ein einfacher Aufbau mit klar getrennten Instanzkennungen und kanonischer Quellbindung ist einer weiteren Importer-Sonderbehandlung vorzuziehen. Daraus folgt noch keine Umstellung der Architektur in diesem Commit.

Danach genügt zunächst eine kleine Word-Abnahme: ein gespiegelt platzierter Foto-CV mit Kontaktkopf und einer natürlichen Folgeseite, plus der freie Fotofall, jeweils bearbeiten, speichern und erneut öffnen; Bildpixel/Crop, Control-Zuordnung, Textfluss und Seitensymmetrie getrennt auswerten. Jetzt wird keine weitere Benutzerprüfung angefordert. Die bestehende 02/12-Abnahme wird nicht auf diese neuen Bytes übertragen.

**Urteil: NO-GO für eine Sidebar-Produktfreigabe oder einen Merge als fertig abgenommenen Sidebar-Fix.** Der dokumentierte Reparaturschritt kann auf dem Arbeitsbranch bleiben. Voller Langkopf, Office-Bearbeitung und Save/Reopen sind offen. Weder CI noch Merge, Deployment, Produktionsschalter oder historischer 22-Fälle-Lauf wurden ausgelöst.

Dateihashes, Einzelwerte und bekannte wiederholte Kennungen: [maschinenlesbare Evidenz](docx-next-sidebar-contact-chrome-23okt-evidence.json). Reproduktion: `qa-sidebar-chrome-23okt.mjs`, bestehende gespeicherte App-Prüfung und `qa-sidebar-chrome-evidence-23okt.py`; ein beobachteter abgebrochener Writer-Fall muss dem Evidenzleser ausdrücklich über `--aborted-writer-case` angegeben werden.
