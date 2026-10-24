# Native Sidebar Root Cause and Architecture Audit

24. Oktober 2026. Repository `modebrecht/cv-cover-charm`, Arbeitsbranch `fix/docx-next-shared-integration-22okt`. Produktbasis `9e7579c08527310d8b21bba2807924fb0c8de463`; korrigierter Vergleichsleser `22f148553ad66b5eddb88be911ec46ef5396af4f`.

## Executive diagnosis

**Die grössten offenen Risiken sind Originalbilder, bearbeitbare Crops und der Erhalt semantischer Controls. Die etwa 0,018 mm historische Writer-Drift ist nachrangig.** Zwei aktuelle, unveränderte App-Exporte verlieren beim ersten Writer-Speichern Originalpixel und viele Controls, obwohl alle ursprünglichen Texte sichtbar bleiben. Beim automatischen Foto entsteht zusätzlich ein deutlich falsches Bild nach dem ersten Save. Das ist ein realer Fehler für Writer-Bearbeitung und kein bloss zu strenger Screenshot-Test.

**Ein entsprechender aktueller Microsoft-Word-Fehler ist nicht bewiesen.** Eine bereits zurückgegebene ältere Word-Datei liefert sogar ein begrenztes positives Gegenbeispiel: Alle 126 Controls mit denselben Quellkennungen, Dokumentbereichen und Verschachtelungen sind erhalten. Sie hat einen klassischen CV und kein Foto; sie kann die heutige Sidebar nicht freigeben. Eine komplette Neukonstruktion allein wegen der Writer-Befunde wäre daher voreilig.

Empfehlung für das bestehende Produkt: **A, begrenzte Weiterverwendung der gemeinsamen nativen Primitiven mit einer kleinen, entscheidenden Word-Abnahme.** Keine weitere Rundungsjagd und kein neuer Engine-Eingriff. Falls Word die aktuellen Bilder oder Controls tatsächlich beschädigt, wird gezielt die betroffene Komposition vereinfacht, statt den gesamten Exporter zu ersetzen. Die normale Sidebar-Sperre bleibt geschlossen.

## Evidenz und belastbare Grenzen

| Aussage | Einordnung | Beleg und Grenze |
| --- | --- | --- |
| Historisch 22/22 Inhalt, 18/22 exakte Geometrie | Historisch berichtet, hier kritisch geprüft | Bericht der unveränderten Matrix auf `fix/docx-next-sidebar-geometry-gate-15okt`; keine neue 22er-Ausführung |
| Vier rechte Root-Gitter verlieren pro Writer-Save ungefähr einen Twip | Historisch konkret belegt | Identisches konsistentes Quellgitter, vier gleiche Übergänge; keine neue native Instrumentierung in dieser Runde |
| Aktuelle Kopf-Abstände, gespeicherte Folgeränder und voller Kontakt-Langkopf wurden korrigiert | Im vorhandenen Produktcheckpoint belegt | `faacd28` und `9e7579c`; acht App-Fälle und 26 frische Writer-Seiten im vorigen Checkpoint |
| Aktuelle Quell-DOCX enthalten vollständige synthetische Bildpixel | Frisch bestätigt | Aktives typisiertes `cv.person.photo`, voller PNG-Asset und gespeicherter Crop; keine Dateiumwandlung als Testersatz |
| Writer ersetzt beide Originalbilder beim ersten Save | Frisch bestätigt | 120×180 → 120×150 bzw. 1920×2880 → 1536×1536; die Originalpixel fehlen auch im restlichen gespeicherten Paket |
| Viele Controls gehen verloren, obwohl Text erhalten bleibt | Frisch bestätigt | 145 → 51 und 86 → 37 Control-Vorkommen; alle nichtleeren Quell-Control-Texte in XML und gerendertem PDF vorhanden |
| Gleiche Tags in verschiedenen Stories bedeuten für sich Control-Verlust | Widerlegt als allgemeine Annahme | Unverändertes aktuelles Quell-DOCX lässt sich vollständig je Vorkommen zuordnen; historischer Word-Fall erhält ebenfalls alle wiederholten Tags |
| Fehlende numerische IDs verursachen den beobachteten Verlust | Nicht belegt | IDs dürfen beim Öffnen vergeben werden; im historischen Word-Fall ergänzt Word 126 eindeutige IDs und erhält alle Controls |
| Aktuelle Sidebar-Fotos und Controls sind nach Word Save/Reopen stabil | Ungeprüft | Kein aktueller Desktop-Word-Roundtrip dieser beiden Sidebar-Dateien vorhanden |
| Neue Eigentümerverluste sind durch den historischen `PopSdt`-Ablauf erklärt | Unbewiesen | Andere Quellstände, Versionen und Strukturen; keine gemessene Identitätskette für diese aktuellen Dateien |

Die neue [maschinenlesbare Evidenz](docx-next-sidebar-root-cause-audit-24okt-evidence.json) enthält sechs aktuelle DOCX-/PDF-Phasen mit Hashes und den begrenzten historischen Word-Abgleich. Es wurden nur geprüfte synthetische Bildquellen für neue Exporte verwendet. Historische Benutzerdateien wurden ausschliesslich gelesen; ihre Bytes, Bilder und Inhalte werden nicht in Git übernommen.

## Geometry

Die vier historischen Ausfälle haben dasselbe rechte Quellgitter `6508/341/2789` bei insgesamt 9638 Twips. Bevorzugte Tabellenbreite, Gitter und Zellenbreiten stimmen überein. Writer serialisiert daraus `6507/341/2790`, danach `6506/341/2791`. Das erklärt die gemeinsame Betroffenheit der rechten Varianten besser als eine spezielle Foto- oder Langtextursache. Die dokumentierte relative Separator-Konvertierung mit anschliessender Ganzzahlabbildung passt zu diesen Übergängen. Die historischen Live-Beobachtungen und die spätere arithmetische Übereinstimmung werden nicht zu einem neuen Trace zusammengezogen.

Der gemeinsame Exporter verwendet bereits kumulativ gerundete Kanten und bewahrt die Gesamtbreite. Ein widersprüchliches `tblW`/`tblGrid`/`tcW` ist in diesem Befund nicht nachgewiesen. Eine standardsaubere Quellrepräsentation garantiert nicht, dass eine andere Anwendung sie nach mehreren eigenen Ganzzahl-Konvertierungen exakt zurückschreibt. Für beliebige Benutzerbreiten ist daher keine allgemeine Anwendungslösung ohne Veränderung der Geometrie bewiesen. Spiegelung per RTL, vorweggenommene Gegenoffsets oder speziell auf Writer gerasterte Breiten werden nicht empfohlen.

Ein einzelner Twip ist im normalen Lesen und Druck praktisch sehr klein. Zwei historische Saves änderten weder Textfolge noch Seitenzahlen. Als alleiniger Release-Blocker wäre das ohne sichtbare Folge unverhältnismässig; die exakte technische Prüfung darf trotzdem weiterhin FAIL melden. Wiederholte Saves könnten die Abweichung akkumulieren, weshalb sie nicht grundsätzlich bedeutungslos ist. Diese Bewertung ersetzt keinen bestehenden Gate und macht aus FAIL kein PASS. Die aktuellen Bild- und Control-Verluste sind wesentlich schwerwiegender.

Ein Word-/Writer-Unterschied lässt sich nur an denselben unveränderten Quellen mit getrennten Save1-/Save2-Dateien unterscheiden. Vergleich von Browser und zuerst in Writer gerendertem DOCX genügt nicht. Die historische 22er-Entscheidung und deren Quellen stehen im [Geometriebericht vom 15. Oktober](https://github.com/modebrecht/cv-cover-charm/blob/b473e568c41e10e6cd9f687dd8d55b4c585d373d/docs/qa/docx-next-sidebar-geometry-gate-15okt.md).

## Photos and cropping

Zwei aktuelle App-Projekte wurden importiert, durch die Editoransichten geführt und frisch exportiert. Die normale PDF-Funktion besteht; der normale Sidebar-DOCX-Produkteinstieg bleibt gesperrt. Jede Datei wurde anschliessend mit unverändertem LibreOfficeDev 26.8 alpha0 in einem separaten Prozess gespeichert, aus diesem Ergebnis erneut geöffnet und ein zweites Mal gespeichert. Alle drei Phasen wurden gerendert: zusammen 21 Dossierseiten, gleiche Seitenzahlen je Fall. Die Originaldateien bleiben bytegleich.

| Fall | Quelle | Nach erstem Save | Nach zweitem Save |
| --- | --- | --- | --- |
| Automatisches Foto, rechter Kontakt-Langfall | Native DrawingML-Picture, 120×180, `srcRect` oben/unten 8333 | DrawingML-Shape-Fill, 120×150; `srcRect` entfällt; `fillRect` oben/unten 264666 | Weiterhin 120×150; `fillRect` oben/unten 52146 |
| Frei positioniertes Foto | Native Picture in typisiertem Control innerhalb eines WPS-Rahmens, 1920×2880, authored Pan/Zoom/Crop | VML-Shape-Fill, 1536×1536; ursprüngliche Crop-Struktur entfällt | Weiterhin VML-Füllung und 1536×1536 |

Das gespeicherte automatische Asset ist pixelgenau der mittlere Quellausschnitt von y=15 bis y=165. Die ausserhalb liegenden 30 Pixelzeilen sind nicht bloss anders codiert; sie fehlen im gespeicherten Paket. Nach Save1 zeigt der Render vertikale Farbstreifen statt des synthetischen diagonalen Musters. Save2 ändert die Darstellung erneut, ohne die verlorenen Pixel wiederherzustellen. Beim freien Foto bleibt ein sichtbarer runder Ausschnitt, während die vollständige ursprüngliche Bilddatei und ihre Bearbeitungsreserve verloren sind.

**Die konkret problematische Transformation ist damit die Writer-Umschreibung einer nativen Picture-/Crop-Komposition in eine Bildfüllung mit neuem zugeschnittenem Asset.** Die Quelle ist keine vorab zugeschnittene Screenshot-Fotografie. Das freie Bild hat zusätzlich einen nativen WPS-Textcontainer als Positionsbesitzer. Die zwei Fälle zeigen unterschiedliche Zielrepräsentationen; ein einzelner allgemeiner Importerfehler wird daraus nicht behauptet.

Noch einmal auf PNG zu normalisieren hilft hier nicht: Die aktuellen Eingaben sind bereits vollständige, frisch normalisierte PNGs. In der aktiven ursprünglichen Picture liegen alle Pixel vor. Direktes Embedding eines Original-JPEG könnte dessen Dateimetadaten zusätzlich erhalten, ist aber kein nachgewiesener Schutz vor einer späteren Office-Crop-Umschreibung und benötigt eigene Orientierung-/Farbprüfungen. Ein unbenutztes zweites Original im Paket wäre ebenfalls kein Ersatz für ein vollständig bearbeitbares Bild im zuständigen Control.

Für Word ist eine echte native Picture mit separat gespeichertem Crop sachgerecht. Die vorhandene aktive Picture-Repräsentation ist deshalb kein ausreichender Grund für einen generellen Austausch. Ein einfaches inline verankertes Bild hat weniger Container als ein freies Bild im WPS-Rahmen. Der freie Pfad bleibt der vorrangige Kandidat für eine Vereinfachung, **falls der aktuelle Word-Test tatsächlich scheitert**. Fotos werden nicht still in ein anderes Layout verschoben; gespeicherte freie Koordinaten bleiben ein eigener Vertrag.

## Semantic content controls

Die globale Tag-Kennung, ein konkretes Control-Vorkommen, dessen Abschnitt/Story, sein Absatz und sein Bild sind unterschiedliche Identitäten. Der Leser wurde entsprechend korrigiert und separat mit [36 Gegenproben](docx-next-word-control-reader-24okt.md) gesichert. Er kann Header-Part-Umbenennungen über Beziehungen auflösen, unterscheidet Haupttextabschnitte und lehnt Mehrdeutigkeit ab. Gleicher Text irgendwo im Paket rettet keinen verlorenen Besitzer.

| Aktueller Writer-Fall | Unterschiedliche Tag-Schlüssel Quelle → Save | Control-Vorkommen Quelle → Save | Text im zugeordneten erhaltenen Control | Vollständige ursprüngliche Texte im PDF |
| --- | --- | --- | --- | --- |
| Kontakt-Langfall | 134 → 40 | 145 → 51 | Bei allen 51 zugeordneten Vorkommen unverändert | Ja |
| Freies Foto | 86 → 37 | 86 → 37 | Bei allen 37 zugeordneten Vorkommen unverändert | Ja |

Beide zweiten Saves behalten diese Zahlen. Die Schlüsselzählung umfasst auch erzeugte Absatz-/Layoutträger; sie ist nicht gleichbedeutend mit der Zahl editierbarer Benutzerfelder. Es fehlen jedoch auch eindeutig kanonische Haupttextfelder, beispielsweise Datums-, Titel-, Orts- und Beschreibungsfelder von Schuleinträgen. Das Problem beschränkt sich somit nicht auf entbehrliche Container-Captions.

Bei weiteren erhaltenen Controls verändert Writer die Verschachtelung. Das ist eine messbare Strukturänderung und kein Beweis eines intern beobachteten Paragraph-Disposals. In den aktuellen Quellen fehlen persistierte Absatz-IDs; nachträglich eingeführte IDs beweisen keine Kontinuität der nativen Absatzobjekte. Der historische [PopSdt-Bericht](../docx-next/sidebar-native-pop-status.md) wird als begrenzte Beobachtung an anderen Originaleingaben gelesen, nicht als abgeschlossene Ursache dieses aktuellen Verlusts. Neue Engine-Instrumentierung wurde nicht durchgeführt.

Ein bereits vom Benutzer zurückgegebenes Kontakt-DOCX aus dem Paket vom 20. Oktober wurde gegen genau dessen Original abgeglichen. Alle 115 Tag-Schlüssel und 126 Vorkommen bleiben zuordenbar; Bereich und Verschachtelung bleiben für 126/126 erhalten. Word ergänzt 126 eindeutige numerische Control-IDs, wo die Quelle keine gesetzt hatte. Ein Titelblatt-Control enthält drei zusätzliche Zeichen; 125/126 Texttokens sind unverändert. Das ist kein unveränderter Save-Test für sämtliche Texte, aber ein konkreter Beleg für Control-Erhalt auch bei bearbeitetem Dokument. Die Datei hat einen klassischen CV und keine Fotos. Zwei weitere Rückgaben sind bytegleich zum Original und liefern keinen unabhängigen Save/Reopen-Nachweis.

Die Word-Metadaten, die bekannte Rückgabe und die Dateiänderungen bilden gemeinsam diesen historischen Kontext; Metadaten allein wären kein Laufzeitnachweis. Er wird nicht auf die aktuelle Sidebar übertragen. Er widerlegt aber die pauschale These, dass wiederholte Tags oder fehlende numerische IDs zwangsläufig alle Word-Controls zerstören. Laut [Microsoft SdtId](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtid?view=openxml-3.0.1) darf Word fehlende IDs beim Öffnen vergeben; [Tag](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tag?view=openxml-3.0.1) ist die programmatische Kennung. Gemeinsame Tags sind keine automatische XML-Datenbindung und versprechen keine synchronisierten Bearbeitungen in verschiedenen Kopf-Stories.

## Three architecture options

| Kriterium | A – bestehende gemeinsame Primitiven gezielt reparieren | B – native Word-Komposition vereinfachen | C – anderes natives Sidebar-Raster |
| --- | --- | --- | --- |
| Aufbau | Authored Quelle, zwei natürliche Tabellen-Stories, vorhandene Header/Picture-Primitiven | Gleiche Quelle; normale Header-Absätze, weniger verschachtelte Datumstabellen/Control-Hüllen; automatische Fotos direkt inline | Semantisch gepaarte Tabellenzeilen mit deklarierter Zell-/Spaltenstruktur und gezielten Spans |
| Word-Fidelity | Aktuell hohe beabsichtigte Nähe; Sidebar noch unbelegt | Hohe beabsichtigte Nähe mit weniger Positionierungs-Layern; Details neu abzunehmen | Native Tabellenstabilität möglich; gekoppelte Zeilenhöhen ändern unabhängigen Textfluss |
| Bearbeitung | Historischer Word-Control-Erhalt positiv; aktuelle Sidebar/Pictures offen | Weniger bewegliche Container; Quellenzuordnung muss ausdrücklich erhalten bleiben | Klarer Zeilenbesitz; nachträgliche Zeilen-/Span-Bearbeitung komplexer |
| Originalbilder | Voll im Quell-Picture; Office-Speicherverhalten entscheidet | Direkte Picture bevorzugt; Rundung und freie Bilder brauchen weiterhin Word-Nachweis | Normale native Pictures in Zellen; freies Overlay ist eigener Pfad |
| Lange Inhalte | Zwei unabhängige Flüsse; kurze Eintragsbindungen bereits vorhanden | Nativer Flow bleibt; Vereinfachung darf weder Text fixieren noch Benutzerabstände übergehen | Relativ viel Leerraum möglich, wenn linke/rechte Einträge unterschiedlich lang sind |
| Links/rechts | Dieselbe geometrische Funktion, gespiegelt | Derselbe Vertrag, keine gespiegelten Sonderexporter | Durch gleiche Spaltenprimitiven möglich, neue Pagination nötig |
| Aufwand und Risiko | Niedrig bis mittel; geringster Eingriff in bereits geprüfte Arbeit | Mittel; fokussierte Word-Komposition statt kompletter Datenmodell-Neubau | Hoch; neue Zuordnung, Zeilenhöhen, Spans und breite Regression |
| LibreOffice-Abhängigkeit | Keine Engine-Internals; keine Writer-spezifischen Gegenoffsets | Keine Engine-Internals; Regeln aus nativer Word-Struktur | Keine Engine-Internals, aber neue Unterschiede der Tabellen-Importer möglich |

Mehrspaltige Word-Abschnitte mit `w:cols` sind kein einfacher Ersatz für unabhängige Sidebar-Stories: Sie lassen Text regulär in die nächste Spalte fliessen. Sie würden die Bedeutung der Seitenspalte verändern. C meint deshalb ein ausdrücklich anderes semantisches Tabellenraster, keine blosse Umschaltung auf Zeitungsspalten. Eine vollständige Raster-Neuentwicklung ist durch die vorliegenden Word-Belege nicht gerechtfertigt.

**Empfehlung A für das bestehende Produkt.** Die gemeinsamen Quellen und nativen Pictures werden bewahrt. Weitere Änderungen müssen einen nachgewiesenen Fehler vor/nach beheben. B ist der gezielte Rückfallplan, wenn Word die aktuelle freie Picture-/Control-Komposition beschädigt. C ist erst sinnvoll, wenn eine bewusst geänderte Word-Flow-Politik akzeptiert wird. Keine Option verspricht ungeprüft Writer- oder Word-Kompatibilität.

**“If we started fresh today, would we build Native Sidebar the same way?” – No.** Die gemeinsame authored Quelle und die nativen OOXML-Primitiven würden bleiben. Der Word-Aufbau würde jedoch von Anfang an weniger Container und eine eigene ausdrücklich definierte Editierpolitik erhalten: normale Header-Absätze, direkter Picture-Besitz, getrennte Quell- und Instanzidentitäten sowie ein klar abgegrenzter freier Bildpfad. Die historische Folge aus unterschiedlichen Exporter-Aufbauten, Mess-Candidaten und Engine-nahen Abnahmehüllen würde nicht erneut zum Produktfundament. Das ist B als bevorzugter Greenfield-Entwurf, kein Beleg dafür, dass heute ein kompletter Rewrite nötig ist.

## Minimal implementation plan

1. Den aktuellen Produktstand und die korrigierte Prüfung unverändert als Word-Triage-Eingabe pinnen. Kein neues Rundungs- oder Crop-Normalisierungsprojekt starten.
2. Die kleinste Word-Frage entscheiden: Bleiben vollständiges Bild, nativer Crop und konkrete Controls bei aktueller Sidebar nach Bearbeiten, Save und Reopen erhalten? Die historische Datei ohne Foto beantwortet das nicht.
3. Besteht dieser Test, nur belegte gemeinsame Exporterfehler weiter reparieren. Bei identischen Erst-/Folgeköpfen kann später ein gemeinsamer Header-Besitzer geprüft werden; separate Köpfe und deren Bearbeitung müssen eine bewusste Politik sein, keine zufällige Folge gleicher Tags.
4. Scheitert Word, genau den betroffenen Aufbau aus B umsetzen: zuerst den freien Bildcontainer beziehungsweise zusätzliche Control-Hüllen vereinfachen. Quelle, vollständiges Asset, Crops, authored Koordinaten und kanonische Kennungen bleiben Abnahmekriterien. Keine stillen Fallbacks auf versetzte Inline-Fotos.
5. Danach nur die betroffenen Varianten und Nachbarn frisch exportieren; Writer-Ergebnisse separat protokollieren. Breite Vorlagenregression erst bei einer tatsächlich breiten Produktänderung. Exakte alte Geometrieprüfung bleibt unverändert dokumentiert.

Diese Runde implementiert den Vergleichsleser und Evidenzprüfung, keine der vorgeschlagenen Produkt-Neukompositionen.

## Smallest meaningful Microsoft Word acceptance

Ein einziges kleines Paket mit zwei aktuellen, synthetischen Dossiers genügt zunächst zur Richtungsentscheidung: ein natürlich zweitseitiger Kontakt-Sidebar-CV mit automatischem Foto und ein gespiegelter freier Fotofall mit Pan/Zoom. Der Vergleich muss dieselben unveränderten Eingaben für source/save1/save2 verwenden.

- Zuerst ohne Inhaltsänderung speichern und erneut öffnen. Seitenzahl, Referenzen, Kopfbereiche und sichtbare Bildkontur prüfen; Controls, Originalpixel, aktiven Bildbesitz und Crop separat auslesen.
- Danach einen klar bezeichneten Textwert ändern und den Crop bewegen sowie zurücksetzen. Dass sichtbarer Text geändert werden kann, ist nicht gleichbedeutend mit erhaltener Feldzuordnung. Der ursprüngliche vollständige Bildausschnitt muss weiterhin erreichbar sein.
- Office-Version und konkrete Dateien erfassen. Ein verändertes Token ist als Bearbeitung auszuweisen, nicht als unangetasteter Save-PASS. Unbeabsichtigter Pixel-/Control-Verlust bleibt ein Blocker.

Das ist eine minimale Triage, keine Freigabe aller linken/rechten Layouts oder Vorlagen. Erst bei einem positiven Ergebnis folgt der kleine Symmetrie-/Langtext-Nachweis. Hier wird keine weitere Zwischenprüfung vom Benutzer angefordert und kein neues Abnahmepaket ausgeliefert.

## Verdict

**NO-GO für die Sidebar-Produktfreigabe. CONDITIONAL GO für die begrenzte Weiterarbeit nach A und die kleine Word-Richtungsentscheidung.** Für Writer-Bearbeitung sind aktuelle Originalbild- und Control-Verluste bewiesen. Für Word sind sie offen; der ältere Word-Control-Beleg ist positiv, aber zu eng für eine aktuelle Sidebar-Freigabe. Die winzige historische Geometriedrift ist kein sinnvoller Haupttreiber weiterer Monate Arbeit.

Der korrigierte Leser verhindert sowohl falschen globalen Feldverlust als auch übersehene Crop-Umschreibungen. Die tatsächlichen aktuellen Save/Reopen-Dateien bleiben bewusst rot für Originalbilder und Controls. Kein Gate wird abgesenkt, kein Engine-Patch ausgeführt, kein neuer 22er-Lauf gestartet und kein Merge, Deployment oder Produktionsschalter vorgenommen. `dev`, `main`, `render` und historische Untersuchungsbranches werden nicht verändert.
