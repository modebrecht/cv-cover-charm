# Kontaktabstände und Header auf Folgeseiten

Arbeitsbranch `fix/docx-next-shared-fidelity-18okt`, Basis `8dded5d7391158b162074b5f8a0bf61f2c44ce2c`. Nachtrag zur bereits gelieferten Zehnerrunde, keine neue vollständige Benutzerabnahme.

## Rückmeldung zu Revision 2

- **04 Farben gut**, Headerabstand auf der zweiten CV-Seite weiterhin nicht akzeptiert.
- **05 Referenzen gut**, einschliesslich der benannten zweiten Referenz mit E-Mail.
- **06 gut**, Foto und normale linke Datum-Pille optisch bestätigt.
- **09 weiterhin auffällige Abstände**, durch den Benutzer-Screenshot belegt. Die Wertespalte war bereits bündig; die zusätzliche Kontaktüberschrift und eigene native Zeilen-/Spaltenabstände blieben jedoch sichtbar.

Die Rückmeldungen werden nicht durch eine pauschale Word-Freigabe ersetzt. Der Screenshot enthält keine neuen Word-PDF- oder Save/Reopen-Nachweise. Benutzerdateien werden nicht öffentlich eingecheckt.

## Korrektur

Die bestehende gemeinsame native Kontakttabelle erhält am App-Einstieg frische Messwerte des tatsächlichen Web-CV: physische CSS-Spaltenbreite, Kontaktabstand unter dem Namen, Abstand vor persönlichen Angaben sowie die jeweiligen Text- und wachsenden Zeilenmetriken. Die zusätzliche native Kontaktüberschrift entfällt in dieser Komposition, weil der normale Web-Kopf keine solche Rubrik enthält. Die zusätzlichen 0,6 mm nach jeder Tabellenzeile werden in diesem gemessenen Pfad nicht mehr auf den Web-Abstand aufgeschlagen. Name und Dokumenttitel behalten ihre bisherige native Typografie.

Die erste Messfassung verwendete transformierte Begrenzungsrechtecke. Bei Modern waren sie schmaler als die physische CSS-Spalte; dadurch brach der Doppelpunkt von «Geburtsdatum:» um. Der endgültige Pfad verwendet die aufgelösten CSS-Grid-Tracks und CSS-Abstände. Ein automatischer PDF-Gegentest verlangt nun für alle neun Fälle eine einzeilige Datumsbeschriftung.

Die Messwerte liegen getrennt vom gespeicherten semantischen Snapshot. Geänderter Quellzustand, falsches Profil oder ungültige Geometrie werden abgewiesen. Renderer und kanonisches Modell lesen keinen DOM und keinen PDF-Renderer. Die Messung ist auf Sans, den klassischen Standardkopf in voller Breite und Textfluss ohne CV-Foto beschränkt. Freie Elemente, verschobene persönliche Angaben und eingefrorene Sidebar-Kompositionen werden nicht dafür gemountet. Die bisherige unabhängige native Komposition bleibt als Rückfall für nicht gemessene Fälle erhalten.

## Zwei Dateien im Benutzer-Nachtrag

| Datei | Zweck und gespeicherter Zustand |
| --- | --- |
| 04 Modern Kontakt senkrecht | CV-Folgeseitenregler ausdrücklich **40 mm**: unter dem 32-mm-Header verbleiben 8 mm statt zuvor 4 mm. Referenzen im Testprojekt ausdrücklich auf CV-Seite 2, damit auch das normale App-PDF tatsächlich eine zweite CV-Seite für den Vergleich enthält. Seite 1 bleibt bei 53 mm. Farben synchronisiert; keine App-Defaults geändert. Der separate Letter-Folgerand bleibt unverändert |
| 09 Brief lang | Kontaktblock ohne zusätzliche native Kontaktüberschrift, gleichmässige Kontaktzeilen und Web-Abstand vor dem Geburtsdatum. Adresse, Telefon und Label stehen auf derselben linken Achse; Ort, E-Mail und Datum auf derselben Wertespalte |

Das Paket enthält diese zwei DOCX, zwei normale App-PDFs, zwei ausdrücklich als LibreOffice bezeichnete native Vorschau-PDFs, Projektdateien, eine zweiseitige Übersicht und Prüfnachweise. Nur **04 Header auf CV-Seite 2** und **09 Kontaktabstände** benötigen eine gemeinsame neue Word-Rückmeldung. 05/06 werden nicht erneut zur Benutzerprüfung vorgelegt.

## Nachweise

Neun tatsächliche App-Restores und Exporte für 01/02/03/04/05/06/08/09/10; Reload sowie DOCX-/PDF-Export erhalten den gespeicherten Zustand. Alle UI-DOCX-Downloads sind bytegleich zur frischen App-Erzeugung, alle Modell-Issues leer. 01 bleibt ein nativer Einseiten-CV, 02 ein Zweiseiten-CV. Bei 04 sind beide PDF-Pfade ausdrücklich zweiseitig.

35 ergänzende native A4-Seiten, davon 26 unterschiedliche Rasterseiten, visuell geprüft. 721 semantische native Textfelder, 42 Pill-Innenlagen und Original-PNGs geprüft. 15 zusätzliche Layoutbeziehungen bestanden, darunter sämtliche einzeiligen Datumslabels, gemeinsame Wertespalten und der gespeicherte 40-mm-Folgerand in beiden PDF-Vergleichen. Die endgültigen Ergebnisse und automatischen Testzählungen stehen im [Nachweisordner](docx-next-word-spacing-19okt-v3/).

Der Referenzfall 09 hat im normalen App-PDF für Ort/E-Mail/Datum dieselbe X-Koordinate 49,450 mm; in der nativen Vorschau 49,636 mm. Diese begrenzte Achsenprüfung behauptet keine vollständige Pixelgleichheit von Web und Word. Bei 04 liegt die Referenzrubrik auf der zweiten CV-Seite in beiden PDF-Pfaden im geprüften Bereich 38–42 mm vom Papierrand. Der physische Inhaltsanfang ist auf 40 mm aufgelöst.

437 DOCX-Tests sowie die gezielte Kontakt-/Integrations-/Geometrieprüfung, Typecheck, Lint, Format und Build bestanden. Die vollständige allgemeine Unit-Suite wurde nicht wiederholt. Kein CI-Dispatch, Merge, Deployment, Standardexportwechsel oder Sidebar-/Agent-A-Eingriff.

**Offen:** Microsoft-Word-Abnahme dieses Nachtrags; weitere native Schrift-/Absatzmetriken und vollständige Web-/Word-Gleichheit; gesperrte Coverfamilien, andere Schriften und All-39. Die bisherige Freigabegrenze bleibt bestehen.

Reproduktion verwendet die vorhandenen Skripte `docx-next-word-batch19okt.ts`, `docx-next-word-batch19okt-verify.py` und `docx-next-word-feedback19okt-verify.py`. Der Browser benötigt das dokumentierte Sans-Profil; `WORD_BATCH_CASES=04,09` liefert nur die zwei Benutzerfälle.
