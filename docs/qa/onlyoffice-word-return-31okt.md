# ONLYOFFICE-Rücklauf in Desktop Word: zwei Fotofälle

Fortsetzung auf `work/word-verified-onlyoffice-poc-31okt`, ausgehend von
`7752187dc06760697750d97d31c10e036485779c`. Die beiden unveränderten Quellen
stammen aus dem an `3ac893f8` gebundenen nativen PoC-Abschlusslauf.
Es wurde kein Produktcode geändert und kein Merge vorgenommen.

## Tatsächlich ausgeführter Ablauf

Je Fall wurden die bereits **zweimal durch ONLYOFFICE gespeicherten** DOCX-Dateien
bytegleich in einen getrennten Word-Prüfordner kopiert. In Desktop Word:

1. ONLYOFFICE-Save-2 geöffnet: keine Reparaturwarnung.
2. Unter einem neuen Namen als DOCX gespeichert; Quelle unverändert belassen.
3. Word-Testkopie geschlossen und ihre Abwesenheit in der Fensterliste geprüft.
4. Word-Testkopie erneut geöffnet: keine Reparaturwarnung.
5. Aus dem erneut geöffneten Stand ein PDF für die Sichtprüfung exportiert.

Das sind **zwei ONLYOFFICE-Saves vor einem zusätzlichen Word-Save/Reopen-Zyklus
pro Fall**. Zwei weitere Word-Speicherzyklen oder ein allgemeiner Office-Nachweis
werden hier nicht behauptet.

| Fall               | Öffnen / Word-Save / Wiederöffnen | Foto im abschließenden Word-PDF | Text / Feldkennungen                        |
| ------------------ | --------------------------------- | ------------------------------- | ------------------------------------------- |
| 02-inline-photo    | ohne Reparatur                    | rot/blau vollständig sichtbar   | Text und Reihenfolge aller 79 Tags erhalten |
| 03-word-free-photo | ohne Reparatur                    | rot/blau vollständig sichtbar   | Text und Reihenfolge aller 79 Tags erhalten |

Beide Word-PDFs haben drei Seiten. Die vorhandene PyMuPDF-Fotokontrolle erkennt
im CV des Inline-Falls 15343 rote und 13884 blaue Pixel, beim freien Foto 15377
rote und 13861 blaue Pixel. Beide CV-Seiten wurden zusätzlich visuell geprüft.
Die Word-Rückläufe behalten somit das Foto, das im früheren Writer-zu-Word-Fall
leer wurde. Das ist ein konkreter Kompatibilitätsnachweis für diese zwei Fälle.

Die vorhandene SSIM-Funktion wurde ergänzend auf ONLYOFFICE-Save-2-PDF gegen
Word-Save-1-PDF angewendet. Die CV-Werte liegen bei 0,758868 und 0,761461;
Titelblatt und Brief jeweils bei 0,891765 und 0,815745. Das sind unterschiedliche
Programme mit abweichender Textdarstellung. Die sichtbaren Wasserzeichen der
ONLYOFFICE-Testversion bleiben erhalten. Fotoerhalt und Reparaturfreiheit sind
bestanden; Pixelgleichheit oder eine vollständige Layoutgleichwertigkeit werden
nicht aus diesen Zahlen abgeleitet.

## Nachweise und Sicherung

`onlyoffice-word-return-31okt.json` bindet die Quellen, unveränderten Eingabekopien,
Word-DOCX-Rückläufe, Word-PDFs und zehn Desktop-Prüfereignisse per SHA-256.
Die XML-Text-/Tagprüfung löst aktive Kompatibilitätsalternativen mit dem
vorhandenen Reader auf. Die vier Office-Öffnungen sind separat beobachtete
Desktop-Ereignisse; Paketprüfung allein wird nicht als Reparaturfreiheit ausgegeben.

Rohdateien: `artifacts/onlyoffice-word-return-31okt/`. Die großen Testdokumente,
PDFs und entpackten Testprogramme bleiben lokal im ignorierten Artefaktordner.
Code, Berichte und Prüfscripte sind versioniert; die Arbeitsbranch-Sicherung
erfolgt ohne Push oder Merge nach dev/render/main.

Es wurde keine identische Unit-Suite wiederholt: Seit dem verifizierten Stand
sind nur zusätzliche native Prüfdateien und Dokumentationsnachweise entstanden.
Die bestehenden 1495 Unit-Tests und sieben PoC-Prüfungen bleiben getrennte
Nachweise; sie werden nicht zu neuen Office-Testergebnissen umgezählt.

## Noch offen

Der kleine GitHub-Actions-Modus wurde nicht gestartet. Der GitHub-Connector
bietet keine Dispatch-Operation; die geprüfte verbundene In-App-Browser-Sitzung
zeigt „Sign in“ und keinen „Run workflow“-Schalter. Es wurde keine Anmeldung
automatisiert und kein fremder/älterer Lauf als Ersatz neu gestartet.
Der dokumentierte gezielte Workflow-Aufruf bleibt für eine authentifizierte
Sitzung vorbereitet. Der volle x39-Lauf wurde ebenfalls nicht gestartet.

Eine breitere Konverterentscheidung braucht eine faire Bewertung der
Wasserzeichen, Schriften und Umbrüche. Der normale Produktexport bleibt weiterhin
unverändert; ein normaler Word-Produktfehler wurde auch hier nicht reproduziert.
