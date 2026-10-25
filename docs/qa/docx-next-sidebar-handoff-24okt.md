# Handoff CV Cover Charm Sidebar und gemeinsamer DOCX Stand

**Word-Foto am 25. Oktober vom Benutzer abgenommen:** Rückmeldung zur zuletzt aktualisierten `CV-Foto.docx` (Version 2; Quellstand `36854783d755a28610770a5a5d6d40b05acea5ef`): «sieht super aus, lässt sich wie ein normales bild verschieben done». Darstellung und normale Fotobewegung sind damit benutzerbestätigt; der gezielte Foto-Fix ist erledigt. Keine weitere Foto-/Umbenennungs-/Speichermatrix. Die früheren Hinweise auf fehlende Word-Fotobedienungsabnahme sind historisch überholt. Keine neue gespeicherte Word-Datei ausgewertet und keine separate Aussage zur exakten Seitenzahl oder zum Referenz-Zeilenumbruch ableiten. Rubrikkomfort bleibt optional; kein Merge und keine allgemeine Exportfreigabe.

**Referenzumbruch am 25. Oktober umgesetzt:** [Belegte Referenzzeilen](docx-next-reference-occupied-row-25okt.md). Ungepaarte Referenzen nutzen in Canvas und DOCX Next die volle Zeile; echte Paare bleiben nebeneinander, Sidebar-Referenzen gestapelt. Wortlaut/Schriftgrösse/144 Textfelder samt Formatierung und der komplette Fotoanker unverändert. Im internen vierseitigen Dossier ist die Referenzfunktion bei 10,5 pt einzeilig; erste drei Seiten pixelgleich. Gesamtsuite 1425 PASS / 0 FAIL, Typecheck/Build und geändertes Lint/Format PASS. Vorhandene `CV-Foto.docx` mit gleicher Identität aktualisiert. Word-Anzeige/Fotobedienung weiterhin nicht vom Agenten ausgeführt; keine neue Speichermatrix. Rubrikkomfort optional. Keine allgemeine Exportfreigabe und kein Merge.

**Fotoseiten-Regression und Priorität korrigiert:** [Aktueller Fotobericht](docx-next-ordinary-photo-25okt.md). Benutzer-Screenshot zeigt fünf Seiten der vorherigen Fassung: separates Foto vor CV-Tabelle. Der zusätzliche Body-Absatz ist entfernt; gewöhnliches Bild jetzt am vorhandenen strukturellen Tabellenabsatz, ohne SDT/Textrahmen, `layoutInCell=0`, automatische vertikale Absatzposition 0. Interner Render vier Seiten ohne Überlappung, nicht als neue Word-Abnahme ausgeben. Bestehende `CV-Foto.docx` aktualisiert, keine neuen Dateinamen/Speichermatrix. 1418 Unit-Tests und Typecheck bestehen. **Danach Referenzumbruch; Rubrikverschiebung optional und kein Must-fix.** Die früheren Aussagen zum vollständig tabellenexternen Anker sind durch diese Korrektur überholt.

**Foto am 25. Oktober konkret umgebaut:** [Gewöhnliches Word-Foto](docx-next-ordinary-photo-25okt.md). Ein einziges direkt im Body verankertes Bild ersetzt Foto-Control und Tabellen-/Textrahmenbesitz; Original/Crop/Rahmen und alle 144 Textfelder erhalten. Vollständige Suite 1418 PASS / 0 FAIL, TypeScript/Build und geänderte Lint-/Formatdateien PASS; vier Seiten geprüft. Einzelfile `CV-Foto.docx` bereitgestellt. Word-Ziehen bleibt vom Agenten nicht selbst ausführbar. Benutzer verlangt ausdrücklich keine weiteren Umbenennungs-/Save1-/Save2-Proben. Keine erneute Speichermatrix anfordern. Brief-Standard zwischen Save1 und Save2 visuell/inhaltlich stabil; Rubrikverschiebung und Referenzumbruch separat offen. Kein Merge, normaler Export gesperrt.

Stand der neuesten Ergänzung: 25. Oktober 2026. Ursprüngliche Übergabe: 24. Oktober. Diese Übergabe ersetzt die Fortsetzungsanweisungen älterer Berichte. Repository: `modebrecht/cv-cover-charm`.


## Aktualisierung nach der Übergabe

**Formataltlasten am 25. Oktober geschlossen:** [Projektweite Formatbereinigung](docx-next-global-format-cleanup-25okt.md), Ausgangskopf `558b9ec7bb2fabd69e4fb6c4c43bc8e072f1560e`. Die vollständige Formatprüfung besteht jetzt: alle 169 alten Warnungen behoben. 168 Dateien nur formatiert; ein weiterer Test prüft den Ribbon-Positionsvertrag nun über tatsächliches Verhalten statt eine einzeilige Quelltextsuche. Alle 85 Produktquelldateien sind über unverändertes normalisiertes JavaScript/AST beziehungsweise identisches komprimiertes CSS abgesichert. Gesamte Unit-Suite 1412 PASS / 0 FAIL, vollständiges TypeScript, ESLint (0 Fehler / 21 bestehende Warnungen) und Produktionsbuild PASS. Zwei synthetische DOCX-Ausgaben bleiben bytegleich; beide Word-Prüfpakete unverändert. Die unten genannten 169 Formataltdateien sind damit erledigt, keine neue Word-Abnahme oder Produktionsfreigabe. Nächste Produktentscheidung bleibt am echten Word-Rücklauf orientiert.

**Vorbereitung für die Word-Prüfung am Abend, 25. Oktober:** [Aktuelle offene Punkte, Dateizuordnung und Rücklaufprüfung](docx-next-evening-word-review-25okt.md). Beide ausgelieferten Pakete bleiben bytegleich; kein neuer Prüfkandidat und keine Render-/Engine-Runde. Für das separate Brief-v2-Paket gibt es jetzt einen lesenden, hashgebundenen Rücklaufprüfer mit **39 bestandenen Gegenproben**: Mindesthöhe/Zeilenwachstum, direkte und geerbte Aufteilung, Feldzuordnung, Originalfoto/Crop/Rahmen und Datei-/Berichtsschutz. Bestehende Leser und Foto-Pins bleiben unverändert. Ein positiver XML-Bericht bleibt ausdrücklich ohne Word-/UI-/Save-Reopen-Abnahme. Der Referenz-Run enthält bereits `w:kern=0`; kein weiterer Kerning-Toggle ist durch ein fehlendes Attribut begründet. Benutzer kann abends testen: Foto zuerst, Brief-Standard/breiter Empfänger danach, Referenz aus derselben PDF mitprüfen. Ausgangskopf `718296ece72a78d71eb15091b9f6ead79a4033f3`. Weitere Produktentscheidung braucht nun den tatsächlichen Word-Rücklauf; keine neue Zwischen-Testserie, keine Produktionsfreigabe.

**Eigenes Brief-Word-Paket am 25. Oktober:** [Die Empfänger-Mindesthöhe ist separat zur späteren Word-Abnahme bereitgestellt](docx-next-letter-word-packet-25okt.md). `CV-Brief-Empfaenger-Word-v2-25okt.zip` enthält zwei vollständige Dossiers (Standard/breiter Empfänger), die vorhandene App-Referenz und eine genaue Save1/Save2-Anleitung. Die beiden Kandidaten wurden aus dem aktuellen Stand bytegenau reproduziert; alle acht frisch gerenderten Seiten geprüft und pixelidentisch zum bisherigen Empfänger-Stand. Je 145 Feldvorkommen, Originalfoto im unveränderten typisierten Inline-Besitzer und growable Empfängerzeile erhalten. Paket-SHA `3cd2ee59d0e83e6610b14d38a7b65e17a170da9c62e1dcaf79dd28166ce5359a`. Ausgangskopf `7b4d7a444551d05eca9f8e1db71a17fe8c3a3153`. Kein neuer Word-Rücklauf, keine Änderung an Produktlogik oder Foto und keine erneute Gesamtsuite. Das bisherige Fotoprüfpaket bleibt exakt unverändert; die separate Paketvorbereitung für den neuen Brief ist damit abgeschlossen. Seine tatsächliche Word-Abnahme und die übrigen Foto-/Referenzgates bleiben offen.

**Neuester technischer Check am 25. Oktober:** [Produktionsbuild und Release-Prüfblocker](docx-next-build-and-release-checks-25okt.md), Ausgangskopf `7b4d7a444551d05eca9f8e1db71a17fe8c3a3153`. Tatsächlicher Produktionsbuild und vollständiges TypeScript PASS; vollständiges ESLint nach vier rein typbezogenen QA-Korrekturen 0 Fehler / dieselben 21 Warnungen. Release-Formatcheck nach Formatierung von `package.json` und `DossierExportDialog.tsx` PASS. Alle Änderungen erhalten kanonisch dasselbe ausgeführte JavaScript beziehungsweise denselben geparsten JSON-Inhalt. 977 Eingaben geprüft; alle sechs öffentlichen Assets bytegleich im Build. Gesamte Unit-Suite bleibt beim bisherigen Nachweis 1412 PASS / 0 FAIL und wurde nicht wiederholt. Projektweite Formatprüfung weiterhin FAIL in 169 anderen Dateien. Kein neuer DOCX-/Word-Befund; Foto-/Brief-/Referenzfragen und Paketgrenzen bleiben wie unten beschrieben offen.

**Aktuellste Korrektur am 25. Oktober:** [Die vier bestehenden Unit-Fehler sind geschlossen](docx-next-existing-check-fixes-25okt.md), Ausgangskopf `4e87dd8b88f2d1d3d4205d36f1efa956b5d61665`. Gesamtsuite jetzt 1412 PASS / 0 FAIL; vollständiges TypeScript und die geänderten Code-/Prüfdateien in Prettier/ESLint bestehen. Die Dekorationsprüfung akzeptiert die bereits verwendete Hintergrundebene 0 wie der vorhandene Renderer; negative/gebrochene/nicht endliche/zu grosse Ebenen bleiben verboten. Der falsche Foto-Stringtest wurde durch Restore-Verträge und acht tatsächliche React-Client-Mount-Fälle mit alter negativer Gegenkontrolle abgesichert. Drei synthetische vollständige DOCX bleiben bytegleich. Keine neue Fotoverankerung, Word-Abnahme oder Produktionsfreigabe. Projektweite Formataltlasten: 170 andere Dateien. Die folgenden Meldungen über vier aktuell rote Unit-Fälle sind damit historische Prüfschritte.

**Neueste Repository-Prüfung am 25. Oktober:** [Echte Bun-/TypeScript-Prüfung und Formatierung](docx-next-letter-repository-checks-25okt.md), Ausgangskopf `9eb1494017bf8f0f9e01dcd2e6235fac14f8dd3f`. Vollständiges TypeScript PASS; alle 19 neuen Brief-/Mindesthöhen-Tests bestehen unter echtem Bun. Gesamter Unit-Lauf: 1403 PASS / vier bereits bei der Gegenprobe vor dem Brief-Prototyp bestehende FAIL; keine unbehandelten Importfehler. Acht aktive TS-Dateien bestehen Prettier und ESLint, ihr normalisiertes kompiliertes JavaScript bleibt identisch. Die volle Formatprüfung meldet noch 171 andere Dateien. Kein Gesamt-PASS, keine Verhaltensänderung und keine neue Word-Abnahme. Die folgenden früheren Aussagen, Bun/TypeScript/Prettier seien in dieser Umgebung grundsätzlich nicht verfügbar, sind damit für diesen aktuellen Prüfschritt überholt. Word-Fotobedienung, Empfänger-Word-Abnahme und Referenzumbruch bleiben offen; das vorhandene Fotoprüfpaket bleibt unverändert.

**Neuester inhaltlicher Stand am 25. Oktober:** Im [Brief-Kandidaten wurde die Empfänger-Mindesthöhe repariert](docx-next-letter-recipient-minimum-25okt.md). Der alte Durchschnittsbreiten-Test akzeptierte breite Namen/Adressen trotz Umbruch und reservierte dann zu viel Leerraum. Jetzt wächst eine native Mindesthöhen-Zeile mit dem Text; der Standardfall weicht nur um einen Twip vom vorherigen Brief-Kandidaten ab. 19 gezielte Tests bestanden; acht Dossiers / 37 Renderseiten, alle 13 veränderten Briefseiten geprüft. Titelblatt und beide CV-Seiten bleiben in allen Fällen pixelidentisch, alle jeweiligen Feldvorkommen sowie Originalbild/Crop anfänglich erhalten. Der normale Export bleibt gesperrt; auch die neue native Zeilen-Mindesthöhe besitzt ein unabhängiges Diagnose-Gate. Bun-Gesamtsuite, vollständiger Typecheck/Prettier und Word-Abnahme fehlen weiterhin. Ausgangskopf: `2f8801799bfc706b54a739303555c8d55a8d1082`.

**Paketgrenze beachten:** Das bisherige `CV-Word-Pruefkandidat-25okt.zip` ist unverändert und dient weiterhin dem separaten Fotobedienungstest. Die neue Empfänger-Komposition ist darin nicht enthalten. Der alte Paketgenerator akzeptiert bewusst nur seinen historischen Brief-Hash; aktuelle Replays nicht ungeprüft mit alten Paket-/Foto-Prüfverträgen mischen. Für die nächste Fortsetzung zuerst den neuen Empfänger-Bericht und danach die Foto-/Floating-Berichte lesen. Referenzumbruch und tatsächliche Word-Bedienung bleiben offen.

**Weitere Fortsetzung am 25. Oktober:** Eine [echte Floating-Gegenprobe](docx-next-photo-floating-flow-25okt.md) wurde mit Inline- und Block-Rich-Besitzern ausgeführt. Beide erhalten anfänglich Original/Crop und 145 Felder, verschieben aber das Foto um ca. 1,75 mm nach oben und 19 Sidebar-Textzeilen ebenso weit nach unten. Beide bestehen die anfängliche Layoutinvarianz daher nicht. Nach je einem Writer-Speichern verliert die Inline-Variante zusätzlich das aktive Bild aus ihrem Feldbesitzer; die Block-Variante behält den Besitzer, verliert aber weiterhin die Originalreserve durch physisches Beschneiden. Zehn gezielte Tests bestanden. Die Variante bleibt intern zurückgehalten; kein Ausgleichsoffset, kein neuer Word-Prüfkandidat und keine Änderung am normalen Export. Das bestehende kombinierte Prüfpaket bleibt für die echte Word-Abnahme gültig. Ausgangskopf dieser Fortsetzung: `3aa3f5c54971e3aade6b2b90d216ff8401653ebf`.

**Neu am 25. Oktober:** Der [vollständige interne Prüfkandidat](docx-next-sidebar-review-candidate-25okt.md) verbindet Brief-Abstände und den Inline-Rich-Text-Fotobesitzer. Alle vier Seiten sind zum separaten Brief-Kandidaten pixelidentisch; 145/145 Feldvorkommen, Originalbild und Crop bleiben anfänglich erhalten. Ein neuer separater Rücklauf-Prüfer hat 22 adversarielle Tests bestanden und erkennt auch verlorene/duplizierte Besitzer sowie Fotokopien ausserhalb des Controls. Die bisherige Typ-Bild-Prüfung bleibt unverändert. Zwei echte Writer-DOCX-Speicherzyklen scheitern bei **beiden** Besitzertypen: 49/145 Feldvorkommen, Original auf 1920 × 2400 physisch beschnitten. Keine Writer-Freigabe und weiterhin kein neuer Word-Bedienungs-/Speichernachweis. Elf isolierte Referenz-Gegenproben grenzen den Umbruch auf einen sehr engen Schrift-/Breiten-Grenzfall ein; kein Ausgleichs- oder Schrumpfpatch wurde eingeführt.

**Nächster Einstieg:** zuerst den neuen Bericht zur Empfänger-Mindesthöhe, danach Floating-Gegenprobe und kombinierten Prüfkandidaten lesen; den Remote-Kopf prüfen. Das bestehende kombinierte Paket ist für getrennte Word-Fototests von unverändertem Speichern, Umfluss/Bewegen sowie Crop/Ersetzen vorbereitet; sein Foto ist weiterhin `wp:inline`. Die neuere Brief-Komposition braucht eine eigene Word-Abnahme und ist nicht in diesem Paket enthalten. Es ist noch kein nachgewiesener Fotoverankerungsfix. Keine weitere pauschale Rundungsjagd und keinen normalen Export freischalten. Der alte Text ab „Sofortiger Einstieg“ dokumentiert den Zustand der ursprünglichen Übergabe; die Ergänzungen oben haben Vorrang. Ausgangskopf der vorangegangenen kombinierten Prüfrunde war `cf736d8bb1c45c02d9d6f7ae7f619b6458384407`.

Fortsetzung am späten 24. Oktober: Der [Foto-Owner-Prototyp](docx-next-photo-rich-owner-24okt.md) ist bei `b0cfa99` gesichert und wartet weiter auf tatsächliche Word-Bildbedienung. Anschliessend entstand der separat aktivierbare [Brief-Source-Flow-Kandidat](docx-next-letter-source-flow-24okt.md): vollständige synthetische Quelle bytegenau rekonstruiert; 11 gezielte Tests; 145/145 Feldvorkommen erhalten; Titelblatt und CV-Seiten intern pixelidentisch. Der normale Export lehnt den neuen Brief-Modus weiterhin ab. Der Referenzumbruch bleibt offen. Für diese neuen Befunde gilt der verlinkte aktuelle Bericht; die ursprüngliche Übergabe unten bleibt historische Herkunft.

## Sofortiger Einstieg für den nächsten Agenten

Arbeite ausschliesslich auf **`fix/docx-next-shared-integration-22okt`**. Lies `AGENTS.md`, diese Übergabe und den [aktuellen Word-Rücklauf](docx-next-sidebar-word-return-24okt.md). Prüfe den aktuellen Remote-Kopf, bevor du Änderungen veröffentlichst.

Der letzte geprüfte inhaltliche Checkpoint vor dieser reinen Übergabe ist **`0d45ac822612a03cabe88efc1167345ce417c096`**. Der letzte Produktcode-Commit ist **`024515de9febd6ace85a29f2e3252f7a667a7ff6`**; spätere Commits ergänzen Browser/PDF-Evidenz und den Word-Befund.

**Nächste konkrete Arbeit: die eingeschränkte Word-Fotobearbeitung gezielt verbessern.** Der Benutzer kann das automatische CV-Foto nicht frei verschieben; Textumbruch/Wrap Text ist ausgegraut. Originalbild und Crop sind in seinem Word-Rücklauf erhalten. Deshalb keine neue Rundungsjagd, keine pauschale Neuerstellung der Sidebar und keine Wiederholung bereits bestandener Tests ohne neue Fragestellung.

Es läuft bei Übergabe kein beauftragter Hintergrund-Worker und keine weitere Export-/Implementierungsrunde. Es gibt keinen ungesicherten lokalen Produktpatch.

## Branches und warum sie existieren

Die Tabelle trennt den aktuellen Lieferbranch von früheren Teilständen dieses Arbeitsstrangs und der übernommenen Fidelity-Basis. Frühere Teilfixes nicht nochmals blind mergen.

| Branch | Geprüfter Kopf vor der Übergabe | Zweck und Rolle |
| --- | --- | --- |
| `audit/docx-next-sidebar-root-cause-21okt` | `c5882dd1ea2449b45477a7842488355a5ee40903` | Ursprünglicher Analyseauftrag: Geometrie, Bilder, Controls und Architekturentscheid trennen. Ein Dokument auf Basis von remote dev; keine Produktänderung. |
| `fix/docx-next-sidebar-photo-ownership-21okt` | `375075f7539de3ab588f0b9a0381ec920fde134c` | Früher Reparaturstand für Bildbesitz und angrenzende Referenz-/Spaltenprobleme. Sein letzter Commit korrigiert die Referenz-Ausrichtung. Historischer Teilstand, im weiteren Sidebar-Strang berücksichtigt. |
| `fix/docx-next-sidebar-word-layout-21okt` | `f73c776e2eca6b9b0d858ee2ab997230259797ac` | Konsolidierter früher Sidebar-Stand: Fotos, Referenzen und halbe Textbreite; dokumentierter Integrationstransport. Quelle der späteren Integration. |
| `fix/docx-next-word-pagination-21okt` | `e1f11779db1da78c08651b22b552cf6f54006e5d` | CV-Pagination und Fusszeilenreserve, insbesondere die 02/12-Problematik; gemeinsamer Transport gegen Fidelity. Quelle der späteren Integration. |
| `fix/docx-next-cv-document-scale-22okt` | `727124a7071aa6184b2e0976c6801a59ff5f14d0` | Verlorene lokale Skalierungskorrektur rekonstruiert und neu geprüft. Übernimmt die dokumenteigene CSS-Skalierung in physische DOCX-Einheiten. Kein browserabhängiges Dokument. |
| `fix/docx-next-cv-page-surface-22okt` | `f256e1817bad54767f58cfba6c958d21a2151441` | Durchgehende Sidebar-Farbfläche über die Papierhöhe statt nur bis zum Ende des Tabelleninhalts. Neuer abgegrenzter Fix mit Vergleichsnachweisen. |
| **`fix/docx-next-shared-integration-22okt`** | **`0d45ac822612a03cabe88efc1167345ce417c096`**, danach diese Übergabe | Einziger aktueller Schreib-/Lieferbranch. Verbindet die Teilstände mit aktuellen Fidelity-Primitiven; enthält alle anschliessenden Reparaturen und Befunde vom 22.–24. Oktober. |
| `fix/docx-next-shared-fidelity-18okt` | `7be40063856d1376acb60e917fe85599a6033dad` | Übernommene Arbeit des vorherigen Fidelity-Strangs, nicht als neuer eigener Fix ausgeben. Ist bereits Vorfahr der Integration. Keine erneute Übernahme erforderlich. |

Die alten Gate-Branches `fix/docx-next-sidebar-gate-13okt` und `fix/docx-next-sidebar-geometry-gate-15okt` wurden als historische Evidenz gelesen, nicht verändert. Die Prüfung weiterer Branches ist kein eigener Lieferbranch und keine neue Implementierung.

Nicht verändert: `dev` bei `8901a830a792d75e9e792345c5180827218b4e1e`, `main` bei `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, sowie `render`. Der in der Benutzermemory ältere allgemeine dev-Workflow ersetzt nicht die ausdrücklich vereinbarte isolierte Integration.

## Was durch diese Arbeit neu hinzugekommen ist

### Integration und wiederhergestellte Teilfixes

- **`90216cb`**: aktuelle Fidelity-Basis mit Sidebar, Pagination, Seitenfläche und dokumenteigener CV-Skalierung kombiniert. Neuere Cover-/Avatar-Primitiven wurden nicht durch alte komplette Builder-/Renderer-Dateien überschrieben.
- **`037bceb`**: vollständige normalisierte Bildauflösung statt unbeabsichtigter Begrenzung der langen Bildseite auf 1600 Pixel.
- **`aaaf88a`, `7743e8c`**: gemeinsam erfasste Sidebar-Geometrie, Seitenbildbesitz und tatsächliche App-Text-/Chrome-Stile verbunden.
- **`5c79a08`**: freie Bilder ausserhalb der Zellen verankert und kurze Einträge zusammengehalten.
- **`6bf49a9`**: Sidebar-Flächen und native Markerformatierung abgeglichen.
- **`4a66ef8`**: gemeinsamer Sidebar-Textfluss und begrenzte Rubrikanfänge repariert.
- **`fc0cafa`**: dedizierten DOCX-Testbefehl um fehlende Tests ergänzt und den rein lesenden Word-Vergleich vorbereitet. Keine nachträgliche Word-Abnahme dieses alten Kandidaten behaupten.

Diese frühen Integrationsschritte sind in [Integration](docx-next-shared-integration-22okt.md), [Skalierung](docx-next-cv-document-scale-recovery-22okt.md) und [Seitenfläche](docx-next-sidebar-page-surface-22okt.md) mit ihren jeweiligen Grenzen dokumentiert.

### Korrekturen aus dem Benutzerfeedback

- **`4521a845`**: gespeichertes automatisches Foto bleibt automatisch. Das blosse Öffnen der Fotosteuerung schaltet nicht mehr ungefragt auf freie Koordinaten um.
- Derselbe Commit: lange Sidebar-Rubriken bekommen eine volle Linie unter dem mehrzeiligen Titel. Die kurze Linie bei Hobbys & Interessen war ein realer Quellzustand; der Fix ist allgemein und nicht an diesen Wortlaut gebunden.
- Das ungeeignete alte Abnahmepaket vom 22. Oktober wurde zurückgezogen. Seine freie Diagnoseposition `yMm: 210` war nicht das gewünschte automatische Foto. Kein weiteres Testen dieses alten Pakets.
- **`faacd28a`**: gemeinsame Kopfabstände und tatsächlich gespeicherte Folgeseitenränder berücksichtigt; Messung neutralisiert äusseren Vorschauzoom und behält die Dokument-Skalierung.
- **`9e7579c`**: gemessene Header-Textframes auf `wrapMode: none` gesetzt. Damit endet der reproduzierte Writer-Hänger beim langen CV mit vollem Folgeseitenkontaktkopf.
- **`024515de`**: drei veraltete Referenz-Sichtbarkeitsbedingungen in `CvCanvasBase.tsx` korrigiert. Separate E-Mail-/Zusatzfelder werden in beiden Sidebar-Orientierungen auch ohne altes Sammelfeld `kontakt` angezeigt.

Details: [Feedback](docx-next-sidebar-feedback-23okt.md), [Kopfabstände](docx-next-sidebar-contact-chrome-23okt.md), [Header-Textfluss](docx-next-sidebar-contact-flow-24okt.md), [Referenzfelder](docx-next-sidebar-reference-fields-24okt.md).

### Neue Diagnosewerkzeuge und belastbare Befunde

- **`22f1485`, `fdae776`**: Word-Vergleich ordnet Control-Vorkommen nach Abschnitt/Story zu; Originalbilder müssen im konkret zugeordneten Besitzer liegen. Gleiche Texte oder irgendwo im Paket liegende Originale retten einen verlorenen aktiven Besitzer nicht.
- **`b1b10e3`, `6ec6e56`, `04fd7f5`, `b33fb94`**: unabhängiger Architektur-/Quell-/Bild-Audit, begrenzte XML-Prüfung, genaue Runtime-Zuordnung und dokumentierte Grenze des stabilen Writer-Versuchs. `w:doNotAutoCompressPictures` existiert bereits.
- **`ab18310`**: vier frische echte Browser-/normale PDF-Exportfälle verifizieren alle 32 getesteten Referenzfelder. Halbe Textbreite fügt keinen Rechtsversatz hinzu.
- **`0d45ac8`**: tatsächlichen aktuellen Word-Rücklauf samt beiden PDFs ausgewertet. Originalbild, Crop und semantischer Bildbesitz bestehen in diesem Fall; freie Word-Fotopositionierung ist die verbleibende konkrete Einschränkung.

## Was jetzt tatsächlich belegt ist

### Aktueller Word-Rücklauf

Der Benutzer hat am 24. Oktober geliefert:

- `01-CV-Sidebar-Word.docx`
- `01-CV-Sidebar-Word.pdf`
- `01-App-Referenz.pdf`

Die letzte App-PDF stimmt bytegenau mit dem Entscheidungspaket überein. Original-DOCX SHA-256: `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`. Rücklauf-DOCX: `9a076520ada6e528def700594b8a010dcb5713b6b69687d53999312931491a33`.

- Beide PDFs: vier Dossierseiten, CV auf Seiten 3 und 4. Alle acht Seitenbilder wurden visuell verglichen. Benutzer sagt Test okay.
- Titelblatt nahe am Original; volle Sidebar-Höhe und CV-Seitenaufteilung erhalten.
- Restabweichungen: vertikale Abstände/Umbrüche im Brief, zweizeilige Referenz-Funktionsbeschreibung in Word.
- **1920 × 2880 Original-PNG bytegenau erhalten**, einschliesslich aller Originalpixel und der Reserve ausserhalb des Crops.
- Crop numerisch unverändert; Word entfernt nur ausdrücklich geschriebene Nullattribute. Rahmen weiterhin 28 × 35 mm mit gleicher runder Rechteckgeometrie.
- **145/145 Control-Vorkommen** aus **134 verschiedenen kanonischen Tags** korrekt zugeordnet; Verschachtelung und Abschnitt/Story-Rollen erhalten.
- **144/145 Feldinhalte exakt gleich**. Nur die Berufsbezeichnung auf dem Titelblatt wurde von `Informatiker/in EFZ` zu `Informatiker/innen EFZ` geändert. Beide PDFs haben die erste Form. Zeitpunkt/Grund nicht erraten.
- Eine gespeicherte DOCX ist kein Nachweis zweier separat aufbewahrter unveränderter Save1/Save2-Stände. Die Erstquelle hat keine persistierten Absatz-IDs; native Objektidentität wird nicht behauptet.
- Keine Dokumentenschutz- oder Foto-Bewegungssperre. Das Foto steckt als `wp:inline` in einem typisierten `w:picture`-SDT in der CV-Tabellenzelle. Der Benutzer meldet, dass Verschieben und Wrap Text nicht verfügbar sind.

**Aktueller Fall positiv für Bild-/Crop-/Besitzererhalt und vom Benutzer visuell akzeptiert. Keine pauschale Word- oder Sidebar-Gesamtfreigabe.** Die frühere Aussage, zum aktuellen Kandidaten gebe es gar keine Word-Rückgabe, gilt nicht mehr.

### Prüfungen und ihre Reichweite

| Checkpoint | Tatsächlich ausgeführte Prüfung | Grenze |
| --- | --- | --- |
| Seitenfläche 22. Oktober | 64 gezielte Tests; drei Quellen vorher/nachher, 24 Renderseiten; 12 benachbarte Cover-/Briefseiten pixelidentisch | Historischer abgegrenzter Stand, keine Gesamt-Word-Abnahme |
| Integration 22. Oktober | 206 gezielte Tests; vorhandener Preview-Build für `90216cb` verifiziert | Kein heutiger vollständiger SSR-/App-Test |
| Header-Fix `9e7579c` | 528 DOCX-Tests, 9234 Erwartungen; acht frische App-Fälle und 26 Writer-Seiten | Nicht nach jedem späteren reinen Dokumentations-Commit wiederholt |
| Vergleichsleser | 51 Gegenproben bestanden | XML-/Besitzerprüfung ist keine visuelle Word-Abnahme |
| XML-Quellen | Vier Quellen × 17 Teile = 68 begrenzte XML-Prüfungen | Kein vollständiges Open XML SDK-/OPC-/MC-Zertifikat |
| Referenzfix `024515de` | Original 6/12, Fix 12/12 Rendererfälle; 30 gezielte Tests / 340 Erwartungen; fokussiertes striktes TypeScript | Nicht die vollständige Repository-Suite |
| Browser/PDF `ab18310` | Vier Fälle, alle 32 Felder sichtbar; echte DossierPdfCanvas und normaler PDF-Exporter; Preflight ohne Übersteuerung bestanden | Öffentliches synthetisches Modern-Projekt, keine Foto-/Word-Abnahme |
| Word-Rücklauf `0d45ac8` | Tatsächlicher Benutzer-Rücklauf, Originalvergleich, vier PDF-Paare visuell geprüft | Links/automatisch; keine globale Mirror-/Free-Photo-/Editierabnahme |

Nicht Tests aus verschiedenen Quellständen addieren oder als aktuelle Vollabnahme ausgeben.

## Wichtigste technische Entscheidung für die Fortsetzung

Der bisher gravierende Bildverlust wurde am aktuellen Quellstand in **LibreOfficeDev 26.8 alpha0** beobachtet. Word reproduziert ihn im gelieferten Fall nicht. Das ist eine andere Evidenzlage als vor dem Rücklauf.

Die vier historischen gespiegelten Writer-Geometriefälle driften etwa einen Twip pro Speichern. Das bleibt ein fehlgeschlagenes exaktes Gate, hat aber gegenüber realer Bildbearbeitung geringe nachgewiesene visuelle Bedeutung. Keine Ausgleichsoffsets einbauen.

Die aktuelle Fotokonstruktion hält den Originalinhalt und den Besitzer zusammen, beschränkt aber das Word-Bearbeiten. Zwei Lösungen unterscheiden:

1. Bestehender `nativePictureFrameRun`: verschiebbarer äusserer Rahmen mit typisiertem Inline-Foto innen. Bewegung/Umfluss gelten für den Rahmen; das innere Foto bekommt dadurch nicht automatisch das gewöhnliche Wrap-Text-Menü. Noch kein nachgewiesener Word-Fix.
2. Gewöhnliches natives Bild mit einem Besitzer, der Inline-/Floating-Verankerung unterstützt. Das ist der gezielte Kandidat für normale Word-Bildbedienung. Kanonische Zuordnung muss ausdrücklich erhalten und geprüft werden. Nicht einfach das typisierte Besitzer-Gate löschen oder allein einen Objektnamen als bestandene Zuordnung erklären.

**Empfehlung:** einen kleinen isolierten Prototyp für Option 2 entwickeln. Getesteten Bildinhalt, Crop, anfängliche Optik und übrige Sidebar-Komposition erhalten. Die automatische App-Fotoposition nicht wieder ungefragt in freie Koordinaten umwandeln. Ein neuer Besitzervertrag ist eine bewusste, separat geprüfte Architekturänderung, keine stillschweigende Abschwächung eines bisherigen Tests.

Relevante Dateien:

- `src/lib/docx-next/cv-sidebar-shared.ts`
- `src/lib/docx-next/native-picture-frame.ts`
- `src/lib/docx-next/renderer.ts`
- `src/lib/docx-next/model.ts`
- `scripts/docx-next-word-acceptance-23okt.py`
- `scripts/docx-next-sidebar-word-layout-qa.py`
- `scripts/docx-next-word-acceptance-test.py`

## Nächste Schritte in Reihenfolge

1. Remote-Stand und `AGENTS.md` lesen. Als Kontrollquelle das bereits geprüfte aktuelle synthetische Word-DOCX verwenden; keine privaten Fotos, alten Projekte oder zurückgezogenen QA-Zustände.
2. Bestehende Foto-/SDT-Verträge lesen und den kleinsten neuen Besitzer-/Verankerungsaufbau entwerfen. Zunächst intern und isoliert; normaler Sidebar-Guard bleibt geschlossen.
3. Prototyp implementieren und gezielt prüfen: Originalbytes/Pixel, numerischer Crop, Rahmen und Startposition, kanonische Besitzerzuordnung, angrenzender Text, automatische/freie Zustände und Links-/Rechtsverhalten. Nur betroffene Tests plus erforderliche Checks; keine unnötige 22er-Neuausführung.
4. Einen konkreten vollständigen Kandidaten intern rendern und mit dem App-PDF vergleichen. Gewöhnliches Bild muss auswählbar sein; Verschieben, Wrap Text, Crop-Reset und Ersetzen sind ausdrückliche Word-Anforderungen, keine Folgerungen allein aus gültigem XML.
5. Den fertig vorbereiteten Kandidaten mit seinen verbleibenden Word-Anforderungen übergeben. Keine Zwischenrunde beim Benutzer nur wegen unvollständiger interner Vorbereitung. Interaktive Word-Bearbeitung nicht als bestanden ausgeben, solange sie nicht belegt ist.
6. Brief-Abstände und Referenz-Funktionsumbruch als getrennte Fidelity-Themen behandeln. Den bereits korrigierten Referenz-Feldverlust nicht mit diesem verbleibenden Zeilenumbruch verwechseln.
7. Erst nach den relevanten Bild-/Bearbeitungs-/Mirror-/Speichergates über Sidebar-Gesamtfreigabe und anschliessend einen ausdrücklich autorisierten Merge entscheiden.

Bis dahin: **NO-GO für die allgemeine Sidebar-Produktionsfreigabe.** Das nimmt dem akzeptierten linken Word-Test seinen positiven Befund nicht.

## Lokaler und veröffentlichter Stand

Vor dieser Übergabe wurde der vollständige Remote-Baum bei `0d45ac8` erneut gelesen. Die fünf noch vorhandenen Repository-Textkopien wurden über die tatsächlichen Git-Blob-Hashes geprüft:

| Lokale Kopie | Veröffentlicht unter | Ergebnis |
| --- | --- | --- |
| `docx-next-sidebar-word-layout-qa.py` | `scripts/docx-next-sidebar-word-layout-qa.py` | Bytegleich |
| `docx-next-word-acceptance-23okt.py` | `scripts/docx-next-word-acceptance-23okt.py` | Bytegleich |
| `docx-next-word-acceptance-test.py` | `scripts/docx-next-word-acceptance-test.py` | Bytegleich |
| `report.md` | `docs/qa/docx-next-sidebar-word-return-24okt.md` | Bytegleich |
| `word-return-summary.json` | `docs/qa/docx-next-sidebar-word-return-24okt-evidence.json` | Bytegleich |

Damit ist kein noch vorhandener lokaler Repository-Code-/Berichtsstand uncommitted. Die frühere grössere Prüfprojektion wurde durch automatisierte Workspace-Wartung entfernt; sie ist kein noch prüfbares Git-Checkout. Es wird deshalb kein erfundener sauberer `git status` behauptet. Veröffentlichte Quellen, Reproduktionsskripte und Nachweise sind auf GitHub gesichert.

Verbleibende lokale Uploads, PDFs/DOCX, PNG-Vergleiche, Extraktionstexte, roher Vergleichs-JSON und Library-Transferhelfer sind Eingaben/temporäre Diagnoseausgaben. **Diese nicht in Git committen.** Insbesondere wurden die gelieferten Benutzerdateien und ihre Dokument-Metadaten nicht veröffentlicht.

Die Eingabedateien und das Entscheidungspaket sind als Benutzer-Anhänge gespeichert. Bei Workspace-Wartung daraus wiederherstellen; keine privaten Daten aus alten Projekten verwenden.

## Grenzen und Arbeiten, die nicht neu gestartet werden

- Kein Merge, Deployment, CI-Dispatch oder DOCX-Next-Produktionsschalter.
- Keine Änderungen an dev, main, render, historischen Gate- oder aktiven anderen Fidelity-Branches.
- Keine Office-Binärpatches oder weitere Engine-Instrumentierung.
- Der lokale stabile Writer-Versuch scheiterte bereits am Gesundheitstest; null abgeschlossene Sidebar-Roundtrips und kein stabiler Fidelity-Befund. Nicht erneut eine lange Runtime-Reparatur beginnen.
- Keine erneute breite Branch-/Datenschutzprüfung in diesem Chat. Andere Audit-Chats/Automationen C2410, W2410 und P1/P2 sind getrennte Aufträge und dürfen nicht verändert werden.
- Der frühere begrenzte Foto-Abgleich ist kein vollständiger Git-History-Datenschutz-Audit.
- Alte historische Abschnitte in `next-handoff.md` nicht als aktuelle Fortsetzungsaufträge behandeln.
- Kein erfundener Fortschritt oder behauptetes Stundenbudget. Wiederholung bereits bestandener Tests braucht eine neue Änderung, ein Scheitern oder eine konkrete offene Frage.

## Reproduktion und Quellen

Die lokalen Pfade früherer Browser-/Office-Runtimes sind nach Wartung nicht verlässlich. Nutze veröffentlichte Quellen und erforderlichenfalls die gespeicherten Originalanhänge. Kein Checkout oder Direktnetzwerk ist für die reine Übernahme erforderlich; verbundene GitHub-Lese-/Schreibwerkzeuge genügen.

Reiner vorhandener DOCX-Vergleich:

```sh
python scripts/docx-next-word-acceptance-23okt.py Quelle.docx Word-Ruecklauf.docx Befund.json
```

Der Reader startet kein Office und sein `wordAcceptance: UNVERIFIED` bleibt absichtlich unverändert. Den separaten Benutzer-/PDF-Befund nicht mit diesem maschinellen Status verwechseln.

Priorisierte Berichte:

1. [Aktueller Word-Rücklauf](docx-next-sidebar-word-return-24okt.md)
2. [Referenzfix und Browser/PDF-Nachweis](docx-next-sidebar-reference-fields-24okt.md)
3. [Feedback-Korrekturen und zurückgezogenes Paket](docx-next-sidebar-feedback-23okt.md)
4. [Header-Textfluss-Fix](docx-next-sidebar-contact-flow-24okt.md)
5. [Quellstruktur und Bildrollen](docx-next-sidebar-source-structure-24okt.md)
6. [Unabhängiger Architektur-Audit 24. Oktober](docx-next-sidebar-root-cause-audit-24okt.md)
7. [Begrenzter stabiler Runtime-Versuch](docx-next-sidebar-stable-runtime-24okt.md)
8. [Integrationsherkunft](docx-next-shared-integration-22okt.md)

Die Dokumente bewahren historische Zwischenstände. Für den heutigen Word-Befund hat der aktuelle Rücklauf Vorrang.

