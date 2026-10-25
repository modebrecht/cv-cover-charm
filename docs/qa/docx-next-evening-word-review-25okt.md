# Word-Prüfung am Abend: offene Punkte und Rücklaufprüfung

25. Oktober 2026. Ausschliesslich `fix/docx-next-shared-integration-22okt`.
Ausgangskopf `718296ece72a78d71eb15091b9f6ead79a4033f3`.

## Aktueller Abschluss dieses Arbeitsblocks

Die beiden vorhandenen Prüfpakete sind bereit und bleiben bytegleich. Für die
neuere Brief-Komposition existiert jetzt eine eigene lesende Rücklaufprüfung:
**39 adversarielle Tests bestanden.** Sie prüft insbesondere, dass die vier
Empfängerfelder beim Speichern in einer gemeinsamen wachsenden Tabellenzeile
bleiben. Es wurde kein neuer DOCX-/PDF-Kandidat erzeugt, kein weiterer
Office-Engine-Versuch ausgeführt und kein neuer Word-Rücklauf empfangen.

Die Produktarbeit an Foto-Bedienung und Word-Brief-Fluss hängt jetzt an echter
Word-Bedienungs-/Speicherevidenz. Dies ist kein zusätzlicher Freigabeantrag. Der
Benutzer hat angekündigt, am Abend wieder testen zu können. Weitere neue
Foto-/Breitenvarianten ohne diesen Rücklauf liefern momentan keine begründete
Produktentscheidung.

## Was tatsächlich noch offen ist

| Priorität | Frage | Vorhandener Nachweis | Noch erforderlich |
| --- | --- | --- | --- |
| 1 | Gewöhnliche Word-Fotobedienung | Aktuelles reales Word-Beispiel erhält Original/Crop/Besitzer; Rich-Owner-Prototyp anfänglich intern geprüft | Rich-Kandidat auswählen; Textumbruch/Bewegen und anschliessenden Besitzererhalt tatsächlich in Word prüfen |
| 2 | Neue Brief-Empfängerkomposition | Growable Mindesthöhe, acht interne Dossiers/37 Seiten am ursprünglichen Checkpoint; separates v2-Paket | Standard und breiten Empfänger in Word ansehen; unveränderte Save1/Save2 getrennt speichern, schliessen und wieder öffnen |
| 3 | Referenz-Funktionsumbruch | App einzeilig; bisher Word/Writer zweizeilig, enger Schrift-/Breiten-Grenzfall | Gleiche Referenz in der neuen Word-PDF beobachten; keinen Ausgleichs-/Schrumpfpatch ableiten |
| Anschliessend | Crop-Reset, Ersetzen, Mirror-/freie Platzierung und weitere Bearbeitung | Nicht durch den einzelnen aktuellen Auto-/Links-Fall freigegeben | Getrennte absichtliche Bearbeitungen und relevante Folgefälle; kein grünes Untouched-Gate aus veränderten Texten/Bildern |
| Technische Altlast | Projektweite Formatierung | Build, Typecheck, Lint und Release-Formatblock bestehen; global zuletzt 169 andere Formatdateien offen | Eigener begründeter Umfang; keine pauschale Massenformatierung für den Word-Test |
| Gesamtfreigabe | Alle relevanten Migrations-/Word-Verträge | Allgemeine Sidebar-Freigabe weiterhin NO-GO | Vertrag, Familien-/Schrift-/Bearbeitungs- und relevante Speichergates; danach gesonderte Integrationsentscheidung |

Die historischen globalen Fidelity-Backlogs sind keine neue Abnahmeliste für
diesen Abend. Dieser Arbeitsblock erklärt keine weitere Coverfamilie, keinen
Fontpfad und keine vollständige 39er-Matrix für fertig. Der bestehende
[Abnahmevertrag](../docx-next/acceptance-contract.md) bleibt massgeblich.

## Dateien und kurze Reihenfolge für den Abend

**Zuerst Foto:** Im bisherigen `CV-Word-Pruefkandidat-25okt.zip` die Datei
`01-Kombinierter-Kandidat.docx` verwenden. Eine frische Kopie unverändert als
Save1 speichern, schliessen, wieder öffnen und als getrennten Save2 aufbewahren.
Für Umfluss/Bewegen eine weitere frische Kopie benutzen: Foto auf CV-Seite 3
auswählen, verfügbaren Textumbruch prüfen und, wenn möglich, umstellen/bewegen.
Den tatsächlich gespeicherten Bearbeitungsstand getrennt behalten. Bleibt der
Befehl gesperrt, diesen Befund festhalten; Kopieren aus dem Control ist keine
erfolgreiche Lösung. Crop-Reset und Ersetzen bleiben weitere getrennte Kopien.

**Dann Brief:** Im separaten `CV-Brief-Empfaenger-Word-v2-25okt.zip`
`01-Brief-Standard.docx` und `02-Brief-Breiter-Empfaenger.docx` verwenden. Beide
haben intern vier Dossierseiten. Auf Briefseite 2 Empfänger, Datum, Folgeabstände,
Unterschrift und Beilagen ansehen. Beim breiten Fall muss die W-Zeile vollständig
sichtbar sein und natürlich umbrechen können. Für jeden Fall unveränderte
Save1/Save2 mit Schliessen/Wiederöffnen getrennt aufbewahren. Die jeweiligen
ursprünglichen Dateien aus dem ZIP bleiben ihre Kontrollquellen.

**Referenz mitprüfen:** Dieselbe CV-Funktionszeile «Klassenlehrer, Schulhaus
Zentrum» auf Seite 4 ansehen. Dafür ist kein weiteres Dossier erforderlich.
PDF-Ausgaben der wieder geöffneten Fälle und die tatsächlich gespeicherten DOCX
ermöglichen anschliessend Darstellungs- und Strukturvergleich. Word-Version und
System helfen bei der Einordnung, wenn verfügbar. Programm-Metadaten allein
beweisen weder die durchgeführte Bedienung noch Schliessen/Wiederöffnen.

| Paket | Aktueller unveränderter SHA-256 |
| --- | --- |
| `CV-Word-Pruefkandidat-25okt.zip` | `430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509` |
| `CV-Brief-Empfaenger-Word-v2-25okt.zip` | `3cd2ee59d0e83e6610b14d38a7b65e17a170da9c62e1dcaf79dd28166ce5359a` |

Beide SHA-256 und ZIP-Integritäten wurden in dieser Runde erneut geprüft. Es
gibt keinen Paketwechsel und keinen zusätzlichen Download allein für den neuen
Prüfer. Die native Fotoquelle ist weiterhin `wp:inline`; normale Word-Bedienung
wird nicht aus der Entfernung von `w:picture` im Rich-Prototyp abgeleitet.

## Neuer Brief-Rücklaufprüfer für den Agenten

```sh
python scripts/docx-next-letter-recipient-return-25okt.py ORIGINAL-BRIEF.docx WORD-SAVE1.docx NEW-REPORT.json
python scripts/docx-next-letter-recipient-return-25okt.py ORIGINAL-BRIEF.docx WORD-SAVE2.docx OTHER-NEW-REPORT.json
```

`ORIGINAL-BRIEF.docx` muss exakt einer der beiden v2-Quellen entsprechen:
Standard SHA-256 `b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b`,
breit `b157868f87d21ff065f2af798add7375542b306f1ca2cb11940607b636b841bc`.
Der Fall folgt aus dem Hash, nicht aus einem beliebigen Dateinamen. Standard
und breit gegeneinander zu prüfen scheitert am absichtlich anderen Feldinhalt.
Der neue Prüfer akzeptiert keine alten Foto-/Brief-Kontrollquellen als Ersatz.

Er importiert den vorhandenen Word-Leser und dessen Inventar unverändert und
prüft Feldanzahlen, Tokens, kanonische Rollen/physische Verschachtelung, fehlende
Textrevisionen, neue unerwartete Control-Eigenschaften sowie ungültige/duplizierte
native Control-IDs. Regenerierte gültige IDs allein bedeuten keinen verlorenen
kanonischen Besitzer. Das aktive Originalbild muss weiterhin im typisierten
Fotobesitzer liegen, mit numerisch gleichem Crop, Bildbytes und nativem Rahmen.
Eine unbenutzte Originalkopie irgendwo im ZIP rettet ein ersetztes aktives Bild
nicht. Ausdrücklich entfernte Null-Crop-Attribute werden numerisch verglichen.

Die Empfängerprüfung verlangt eine gemeinsame Zeile/Zelle mit den vier Feldern
in Quellreihenfolge, explizites `atLeast` und unveränderte 1381 Twips. Auch
zusätzlicher nicht zugeordneter Empfängertext, Eigenschaftsrevisionen und
mehrdeutige Container werden gemeldet. Zeilenaufteilung wird über direkte
OnOff-Werte sowie begrenzte explizite/Standard-Tabellenstil-/basedOn-Ketten
aufgelöst. Bedingte Split-Stile und nicht auflösbare Ketten brauchen getrennte
Prüfung und werden nicht als automatisch erhalten erklärt. Direkte explizite
Aufteilung kann eine geerbte Sperre überschreiben.

Microsoft dokumentiert [die native Zeilenhöhe](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.tablerowheight?view=openxml-3.0.1)
und [die Stilabhängigkeit von cantSplit](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.cantsplit?view=openxml-3.0.1).
Der Prüfer ist keine vollständige Stil-/Schema-Implementierung. Ein nicht
aufgelöster Stil oder eine entfernte explizite Mindesthöhenregel ist ein
fehlgeschlagener **begrenzter Prüfvertrag**, nicht allein der Beweis sichtbaren
Word-Datenverlusts. Bei Abweichungen erst die Beobachtungen und die Word-PDF
beurteilen; keine automatische Toleranz oder nachträgliche Gate-Lockerung.

Exit 0 bedeutet nur `PRESERVED_WITHIN_BOUNDED_XML_CHECKS`, Exit 1 eine
Prüfabweichung, Exit 2 einen Eingabe-/Aufruffehler. Vorhandene Berichte und
Eingabedateien werden nicht überschrieben. Alle Ergebnisse behalten ausdrücklich
`wordAcceptance: UNVERIFIED`, `renderingChecked: false` und keinen behaupteten
Save/Reopen-/UI-Nachweis. Nicht-Feldinhalt, dekorative Bilder und vollständige
Typografie werden nicht lückenlos verglichen. Die sichtbare Word-/PDF-Prüfung
und der allgemeine Abnahmevertrag bleiben erforderlich.

Foto-Rückläufe verwenden weiterhin ihren eigenen
`docx-next-photo-rich-owner-return.py` mit **alter typisierter Brief-Kontrollquelle,
initialem Rich-Kandidaten und tatsächlichem Rücklauf**. Kein neuer Brief-Hash
wurde in dessen Vertrag eingetragen. Crop/Ersetzen oder bewusste Textbearbeitung
werden nicht als unverändertes Speichern durch diesen neuen Brief-Prüfer geschickt.

## Tests und zusätzlicher Quellcheck

```sh
python scripts/docx-next-letter-recipient-return-test-25okt.py STANDARD.docx WIDE.docx -v
python -m py_compile scripts/docx-next-letter-recipient-return-25okt.py scripts/docx-next-letter-recipient-return-test-25okt.py
```

**39 Tests bestehen** unter CPython unittest. Sie decken echte Parser-/Vertrags-
Gegenbeispiele einschliesslich fester/verlorener/duplizierter Mindesthöhen,
geerbter Sperren, direkter Überschreibung, ungültiger/zyklischer/bedingter Stile,
mehrdeutiger Eigenschaften, abgetrennter oder kopierter Felder, neuer Bindung,
regenerierter/duplizierter IDs, Crop-/Rahmenänderung, verwaistem Original und
Dateischutz-/Exitstatus ab. Vier gezielte Fälle deckten zunächst Lücken im
**neuen, noch unveröffentlichten Prüfer** auf; die abschliessende vollständige
39er-Ausführung besteht nach ihrer Härtung. Das waren keine vier zusätzlichen
Produktfehler. Selbstvergleiche beider Quellen prüfen nur Leserkompatibilität.

Fünf bestehende Leser-/Typografiequellen sind gegen die Remote-Blobs geprüft.
Eine zusätzliche Schluss-Leerzeile der lokalen Word-Leser-Kopie wurde entfernt;
der AST war unverändert, der abschliessende Testlauf benutzt die exakten
Repository-Bytes. Kein bestehender Leser wird veröffentlicht oder gelockert.

Beim Referenzumbruch wurde ein bisher nicht separat festgehaltener Vorschlag
quellseitig geprüft: Der erfasste Stil hat bereits `kerning: true`; genau dieser
Referenz-Run exportiert bereits `w:kern w:val="0"`. Ein fehlendes exportiertes
Kerning-Attribut ist hier folglich nicht der Fehler. Die
[Microsoft-Beschreibung](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.kern?view=openxml-3.0.1)
definiert den Wert als Schriftgrössenschwelle, und die
[CSS-Spezifikation](https://www.w3.org/TR/css3-fonts/#font-kerning-prop)
unterscheidet automatische und explizite Kerning-Anwendung. Diese Quelle beweist
keine identische tatsächliche Schriftformung in Browser und Word. Kein weiterer
Toggle, neuer Renderfall oder Referenz-Produktpatch wurde daraus erzeugt.

[Maschineller Nachweis](docx-next-evening-word-review-25okt-evidence.json).
Keine neue Gesamtsuite/Build-Wiederholung; die bisherigen 1412 Unit-Tests werden
nicht um diese Python-Fälle erhöht. Kein Merge, Deploy, CI-Dispatch,
Produktionsschalter oder Eingriff in dev/main/render, Datenschutz-Audits oder
Automationen. Generierte Gegenbeispiele, Rückläufe und Rohlogs bleiben ausserhalb Git.
