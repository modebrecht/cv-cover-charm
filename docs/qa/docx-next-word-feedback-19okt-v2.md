# Word-Rückmeldung und Korrekturbatch — 19. Oktober 2026

Branch `fix/docx-next-shared-fidelity-18okt`; Ausgangspunkt `ccbc6e8d35d3adc4bc01bb8bfd5bacf77b03404f`. Zehn tatsächliche App-DOCX-Downloads plus zehn normale App-PDFs aus jeweils demselben wiederhergestellten Projekt. Die ursprüngliche Runde bleibt als historischer Nachweis erhalten. Keine Änderung an geschützten Branches, Exportstandard, Sidebar/Agent A oder gesperrten Coverfamilien.

## Benutzerbefunde und Entscheidung

| Datei | Rückmeldung | Ergebnis dieser Revision |
| --- | --- | --- |
| 01 | Sieht gut aus | DOCX bytegleich zur ersten Runde |
| 02 | Mehr Luft auf zwei Seiten erwogen; längerer Inhalt könnte dann überlaufen | Keine automatische Vergrösserung; DOCX bytegleich. Dynamisches Strecken ist kein Abnahmeblocker |
| 03 | Unterschiedlicher Abstand unter dem Header; PDF und Word prüfen | Bereits korrekt übernommene Web-Einstellung, kein Anlass zur Defaultänderung. DOCX bytegleich |
| 04 | Wie 03; ungewollt unterschiedliche Letter-/CV-Farben | QA-Projekt wieder synchronisiert, keine Produkt-Farblogik geändert |
| 05 | Zweck der isolierten E-Mail unklar | Technischer Filtertest bleibt automatisiert. Das reguläre QA-Projekt zeigt jetzt eine benannte zweite Referenz mit E-Mail ohne Telefon |
| 06 | Unbeauftragte rechte Pille; Foto verschoben | QA-Projekt wieder mit normaler linker Datum-Pille. Foto wieder 52 statt 44 mm breit, mittig auf dem dekorativen Kreis |
| 07 | OK | DOCX bytegleich |
| 08 | OK | Cover und Letter unverändert; dieselbe Kontaktkorrektur wie 09 |
| 09 | Geburtsdatum nicht bündig; schon im Web? | Web und normales App-PDF waren korrekt. Brief-DOCX verwendete getrennte Tabellen mit 50/50- und 30/70-Spalten. Der App-Einstieg verwendet jetzt die bestehende gemeinsame native Kontakttabelle wie Modern |
| 10 | OK | Cover/Foto und Letter unverändert; dieselbe Kontaktkorrektur wie 09 |

Die nächste Benutzerprüfung darf sich auf **04 Farben, 06 Foto/Pille und 09 Kontaktspalten** beschränken. Kein erneuter vollständiger Zehnerrundgang und keine Einzelabnahmen pro Commit nötig.

## Headerabstände: vorhandene Einstellungen respektieren

Der Hinweis des Benutzers auf **«Oberer Rand ab Seite 2»** ist massgeblich. Unterschiedliche erste und folgende Inhaltsanfänge sind allein kein Exportfehler. Der gemeinsame Web-Resolver und der DOCX-Snapshot liefern:

| Fall | Gespeicherter Folgerand | Inhaltsanfang Seite 1 | Geschützter Inhaltsanfang ab Seite 2 |
| --- | --- | --- | --- |
| 03, waagrechter Kontakt-Header | 20 mm | 47 mm | 30 mm |
| 04, senkrechter Kontakt-Header | 20 mm | 53 mm | 36 mm |

Die Headerhöhen 26/32 mm benötigen den bereits vorhandenen Schutzabstand von 4 mm. Auf Seite 1 wirken zusätzlich die vorhandenen Erstseitenränder und Headerabstände. Letter und CV verwenden in beiden Fällen dieselben aufgelösten Inhaltsanfänge. Keine Abstands-, Schriftgrössen- oder Seitenfüllungsdefaults wurden geändert.

PDF-Prüfung: Farbe eines unbeschrifteten Headerpixels ist innerhalb jedes Ausgabepfades für Letter/CV identisch. Die CV-Titel-Tintenoberkante liegt im Web-PDF bei 46,051/52,052 mm, in der ergänzenden nativen Vorschau bei 47,178/53,175 mm. Das sind weiterhin unterschiedliche native Schrift-/Zeilenmetriken, **keine Pixelgleichheit**. Für 03/04 liegt kein zurückgegebenes Word-PDF vor; der Screenshot ersetzt keine vollständige Word-PDF-Messung.

## Tatsächliche Word-Evidenz aus Runde 1

Das Benutzerarchiv enthält fünf gespeicherte DOCX und fünf PDFs für 06–10. PDF-Produzent jeweils `Microsoft® Word for Microsoft 365`, jeweils vier Seiten. Alle ursprünglichen Inhaltskontrollen über sämtliche Geschichten und alle ursprünglichen Medienbytes sind erhalten. Die gespeicherten Änderungen im Feld `cover.eyebrow` sind nachweisbar (`Bewerbun` bei 06, `BewerbungGGG` bei 07–10).

Bei 06 ist das native Foto in der zurückgegebenen DOCX um etwa +0,522 mm horizontal und −0,363 mm vertikal gegenüber der ursprünglichen Datei verschoben; Masse und Crop bleiben erhalten. Ob der Benutzer es manuell bewegt hat, ist nicht ableitbar. Davon unabhängig war bereits das QA-Projekt durch die Verkleinerung auf 44 mm gegenüber dem dekorativen Kreis um 4 mm nach links/oben versetzt. Revision 2 stellt die 52-mm-Fläche mit gemeinsamem Mittelpunkt **155/73 mm** wieder her. Die neue Word-Darstellung und Ankerstabilität bleiben zu bestätigen.

Prüfsummen und strukturierte Befunde: [word-return-analysis.json](docx-next-word-feedback-19okt-v2/word-return-analysis.json). Benutzer-Originaldateien und Screenshots werden nicht ins öffentliche Repository kopiert. Schliessen/Wiederöffnen ist aus den Dateien nicht unabhängig beweisbar. Positive Beobachtungen an Runde 1 sind keine Word-Abnahme der überarbeiteten Dateien.

## Prüfung dieser Revision

- 434 DOCX-Tests in 69 Dateien bestanden, 0 Fehler; zusätzlich 19 gezielte Kontakt-/Integrations-/Geometrietests bestanden. Der frühere vollständige Lauf mit 1246 Unit-Tests wurde nicht wiederholt.
- Typecheck, Lint und Format der geänderten TypeScript-Dateien sowie Produktionsbuild bestanden. Kein CI-Dispatch.
- Zehn Projekte über die tatsächliche Importoberfläche wiederhergestellt; gespeicherter Zustand nach Reload identisch. Alle zehn UI-DOCX-Downloads bytegleich zur frischen App-Erzeugung; DOCX- und normale PDF-Exporte verändern die gespeicherten Eingaben nicht. Alle Modell-Issues leer.
- 39 native A4-Vorschauseiten; sieben gegenüber Runde 1 geänderte Seiten visuell geprüft, übrige 32 Rasterseiten mit bekannten Seiten bytegleich. Neue Web-Ansichten für Farben, Referenzen und Fotofläche geprüft.
- 806 semantische native Textfelder, 49 CV-Pill-Innenlagen und die eingebetteten Original-PNGs geprüft. Zehn normale Web-PDFs mit insgesamt 31 Seiten als Vergleich.
- Sechs zusätzliche Layoutbeziehungsprüfungen bestanden: Farben/Inhaltsanfänge 03/04; Foto/Pille 06; Kontaktwertspalten 08/09/10. Alle drei Kontaktwerte liegen innerhalb jedes PDFs auf derselben X-Koordinate: Web 49,025 mm, native Vorschau 54,892 mm. Das behebt die Ausrichtung, behauptet aber keine absolute Web-/Word-Geometriegleichheit.

Nachweise, zehn DOCX, Projekte und Übersicht: [QA-Ordner](docx-next-word-feedback-19okt-v2/). Das Benutzerpaket enthält zusätzlich normale App-PDFs und visuelle Vergleiche.

Reproduktion:

```sh
bun scripts/docx-next-word-batch19okt.ts /tmp/word-batch-v2
# Dokumente mit dem unveränderten Dokument-Renderer rendern, dann:
python3 scripts/docx-next-word-batch19okt-verify.py /tmp/word-batch-v2 /tmp/native-renders /tmp/validation.json
python3 scripts/docx-next-word-feedback19okt-verify.py /tmp/word-batch-v2 /tmp/native-renders /tmp/layout-checks.json
```

Browser und Fontconfig müssen dem dokumentierten Sans-Prüfprofil entsprechen. `DOCX_NEXT_CHROMIUM_PATH` bestimmt Chromium; `WORD_BATCH_CASES` erlaubt gezielte Teilmengen. Ohne vorhandenen App-Server startet das Skript selbst Vite.

## Offene Grenzen

Die bestehende kompakte Kontakttabelle unterstützt nur das klassische CV mit voller Kontaktbreite im Textfluss; andere Kontaktkompositionen sind damit nicht freigegeben. Brief behält die zusätzliche native Kontaktüberschrift und gestapelte Eintragszeilen. Weitere Schriftmetriken, andere Schriften, Verlauf/Neon/Warm, All-39 und beliebig mitwachsender Word-Pill-Hintergrund bleiben offen. Native Sidebar/Agent A und die verworfene Pill-Gruppierung bleiben eingefroren. Keine neue Word-Abnahme ohne Rückgabe der überarbeiteten Dateien.
