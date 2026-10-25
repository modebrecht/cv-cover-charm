# Gleicher Headerabstand auf allen Anschreiben und CV Seiten

Expliziter Benutzerauftrag vom 19. Oktober: dieselbe sichtbare Headerfreiheit auf erster Seite und allen Folgeseiten als Default, ausser bewusst überschrieben. Basis `47a97df96e932509108525e57dbb1c888912ca8d`, Veröffentlichung ausschliesslich auf `fix/docx-next-shared-fidelity-18okt`.

## Gemeinsame Regel

Die rendererunabhängige Default-Auflösung setzt den Inhaltsanfang bei sichtbarem Header auf dessen tatsächliche Höhe plus **20 mm**. Der bisherige zusätzliche Headerregler bleibt additiv: 12 mm Standard plus 8 mm physischer Grundrand ergeben diese 20 mm. Ein eigener Reglerwert verändert den Abstand entsprechend. Bei reduziertem Header folgt der Inhaltsanfang dessen tatsächlicher Höhe. Ohne Header gilt der normale 20-mm-Papierrand mit weiterhin geschützten Karten-/Rahmeninnenflächen.

Dieselbe Regel gilt im Web für alle 41 auswählbaren Stile und die CV-Aufbauten, über die gemeinsame Geometrie auch im normalen App-PDF. Freigegebene native App-Exporte erhalten die aufgelösten physischen Werte im detached Snapshot. Gesperrte DOCX-Familien werden damit nicht freigegeben. Der native Sidebar-Aufbau bleibt eingefroren; dessen Modell erhält weiterhin seine bisherige Geometrie. Der gemeinsame Web-Abstand ist keine Sidebar-Freigabe.

Eigene physische Seitenränder behalten ihre Werte und werden mit Header und eigenem Zusatzabstand genau einmal zusammengesetzt. Ein ausdrücklich gespeicherter Folgeseitenrand ersetzt den automatischen Inhaltsanfang ab Seite 2, einschliesslich der bisherigen Sicherheitsgrenzen. Numerische Legacy-Werte bleiben erhalten. Ohne gespeicherten Wert bleibt CV im automatischen Modus; Save/Restore darf den aktuellen Default nicht zu einem Benutzerwert machen. Reset entfernt den eigenen Wert und übernimmt wieder den gemeinsamen Abstand. Der physische Regler reicht nun bis 120 mm, damit auch automatische Inhaltsanfänge über 40 mm korrekt dargestellt und als eigener Wert gesetzt werden können.

Die bisherige Trennung erklärt den Befund: erste Seite enthielt Vorlagenabstand und zusätzlichen Headerabstand; Folgeseiten verwendeten einen unabhängigen Standard mit nur 4 mm Mindestfreiheit. Zusätzlich schob der native Anschreiben-Pfad nach korrekt gesetztem Seitenrand noch 12 mm vor den nun führenden Empfängerblock. Diese zweite Vorlagenreserve entfällt, wenn die gemessene Web-Geometrie den führenden Start bereits besitzt. Explizite Empfängerversätze behalten ihre bisherige Komposition.

## Echte App Nachweise

Vier Projekt-Restores mit Reload, echten UI-Downloads und normalem App-PDF. DOCX-Downloads jeweils bytegleich zur frischen App-Erzeugung; keine Modell-Issues und keine Änderung gespeicherter Eingaben durch den Export.

| Fall | Inhaltsanfang | Normaler App-PDF | Ergänzend gerendertes DOCX |
| --- | --- | --- | --- |
| 01 Modern Einseitenaktion | Letter/CV 24 mm bei 4-mm-Header | 3 Seiten, CV einseitig | 3 Seiten, CV einseitig |
| 04 Modern Kontakt senkrecht | Letter/CV erste und zweite Seite jeweils 52 mm bei 32-mm-Header | 5 Seiten | 5 Seiten |
| 05 Eigene Ränder | Letter/CV 44 mm, eigener Rand 28 mm plus Header 4 mm plus Zusatz 12 mm | 3 Seiten | 4 Seiten |
| 09 Brief lang | Letter/CV 24 mm bei 4-mm-Header | 3 Seiten | 4 Seiten |

Bei 04 wurde ausschliesslich im neuen QA-Projekt der zuvor von Codex angelegte 40-mm-Folgerand entfernt. Keine Migration überschreibt gespeicherte Benutzerwerte. Ein langer Anschreibentext und Referenzen auf CV-Seite 2 liefern je zwei tatsächlich sichtbare Vergleichsseiten. Der neue Abgleich prüft auch die erste Textkante: nativ 52,12–52,17 mm über alle vier Innenblätter, App-PDF 51,05–52,60 mm je nach Schrift/Zeilentyp. Die 2-mm-Toleranz erfasst Glyphenmetriken und würde die alte zusätzliche 12-mm-Reserve abweisen.

Alle 16 ergänzend gerenderten Seiten geprüft; 322 native Feldinhalte und sämtliche Absatztexte vorhanden. Originalbildprüfung und gespeicherter Einstellungszustand erhalten. Die älteren nativen Brief-/CV-Kompositionen und Seitenzahlabweichungen ohne Einseitenaktion sind weiterhin begrenzte Befunde, keine neue Abnahme. Die zusätzliche lokale LibreOffice-Vorschau ist kein Word-Nachweis; auf der CV-Folgeseite von 04 bleibt insbesondere die sichtbare Kontakttext-Ebene im lokalen Rendering offen, obwohl ihr nativer Text extrahierbar erhalten ist. Das Benutzerpaket enthält den normalen App-PDF als Referenz.

## Automatisierte Prüfung und Grenzen

1’254 Unit-Tests in 259 Dateien, 25’594 Assertions, 0 Fehler; abschliessender JUnit-Nachweis vollständig. Typecheck, Lint (0 Fehler, 21 bestehende Warnungen), Format und Build bestanden. Die Geometriematrix deckt alle 41 Stile, kompakte und Kontakt-Header, volle und reduzierte Folgeseitenheader, erste/dritte Seite, Web-CV-Aufbauten sowie eigene Werte, Reset und portable Legacy-Werte ab. Keine unnötigen CI-Neustarts.

Maschinenlesbare Ergebnisse im [Nachweisordner](docx-next-header-default-19okt/). Reproduktion: `WORD_HEADER_STANDARD=1 WORD_BATCH_CASES=01,04,05,09 bun scripts/docx-next-word-batch19okt.ts OUTPUT`; danach DOCX mit `render_docx.py --emit_pdf` rendern und `scripts/docx-next-header-default19okt-verify.py APP RENDERS OUTPUT_JSON` ausführen. Browser-/Sans-Profil wie beim bisherigen Batch beibehalten.

Microsoft-Word-Abnahme des neuen Standards bleibt offen. Weitere Coverfamilien, Schriftmetriken und die breite Freigabe bleiben getrennt. Kein Merge, Deployment oder produktiver Exportwechsel; kein Eingriff in die native Sidebar-Engine oder Agent A. Parallel geänderte Dateien im ursprünglichen Arbeitsordner wurden durch ein isoliertes Checkout vom geprüften Stand getrennt.
