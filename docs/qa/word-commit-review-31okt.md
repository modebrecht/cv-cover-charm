# Abschluss: c685bf43 gegen origin/dev

Geprüft: `c685bf4308235ac5fcc38957d45d9c9bf508eb21` gegen frisch abgerufenes
`origin/dev` auf `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`. Gemeinsame Basis:
`c3e9f4f17b8493526a602efff1b7110622bb154c`. Es gibt 20 lokale und einen nur
auf dev liegenden Commit. Der dev-Commit betrifft drei Dokumentationsdateien.
Es wurde nichts überschrieben, zurückgesetzt, rebasiert oder zusammengeführt.

Gesicherter Arbeitsbranch: `work/word-verified-onlyoffice-poc-31okt`.
Ausgangspunkt ist der unveränderte lokale Commit c685bf43. dev/render/main
werden nicht verändert. Die danebenliegende dev-Dokumentation bleibt erhalten.

## Testbewertung

Die 1495 bestandenen Unit-Tests aus dem vollständigen Linux/Bun-Lauf sind ein
gültiger Unit-Nachweis. Der an SHA-256 gebundene Testlog und alle weiteren
Dateibindungen des praktischen Abschlussberichts wurden frisch geprüft.
Der zuvor eingeschränkte Windows-Lauf hatte neun Fehler bei gesperrten
Kindprozessen; er wird nicht als vollständig bestanden ausgegeben.

Unit-Tests prüfen nicht die native Word-/Writer-Darstellung. Für den echten
Word-Hauptfall existieren gesonderte Desktop-Nachweise: zwei Speicher- und
Wiederöffnungszyklen ohne Reparaturwarnung und ein weiterhin sichtbares Foto.
Der zweite Word-Rücklauf und sein PDF stimmen mit der ausgelieferten lokalen
Abschlusskopie bytegenau überein. Die roten/blauen Fotoflächen sind auch bei
erneuter PDF-Auswertung erhalten. Das ist ein Nachweis für diesen Testfall,
keine vollständige Word-Produktfreigabe.

## Klassifikation

| Fall                                                              | Bewertung                               | Konsequenz                                                                                     |
| ----------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Rich-Text-Hauptfall direkt in Word, zwei Saves                    | Foto sichtbar, reparaturfrei            | Geprüfter Word-Fall bestanden                                                                  |
| Typisiertes frei verankertes Bild der gesperrten Diagnosevariante | Word-Reparatur reproduziert             | Fehler der experimentellen Word-Ausgabe; nicht auf den normalen Export übertragen              |
| Rich Text nach Writer-Saves, anschließend in Word                 | Foto leer, trotz reparaturfreiem Öffnen | Konverter-/Roundtrip-Kompatibilität; keine belegte Regression des normalen Word-Produktexports |

Die Aussage „Writer zeigt das Foto leer“ braucht eine Präzisierung: Im eigenen
Writer-PDF nach Save 2 sind die roten/blauen Fotoflächen vorhanden. Leer wird das
Foto im anschließenden Word-PDF des durch Writer gespeicherten DOCX. Der
Kompatibilitätsfehler liegt damit im editorübergreifenden Rücklauf. Ein bloßer
SSIM-Gesamtwert könnte die kleine fehlende Fotofläche verdecken; deshalb bleiben
gezielte Fotokontrollen und die sichtbare Prüfung erforderlich.

**Entscheidung:** Normalen Produktexport unverändert lassen. Gegen origin/dev
liegen sämtliche geänderten Anwendungsquellen unter dem isolierten
`src/lib/docx-next/`; der normale Exportpfad ist nicht verändert. Die neuen
direkten Bildvarianten benötigen weiterhin explizite Diagnoseoptionen.
Kein reproduzierter Fehler des normalen Word-Produktexports rechtfertigt dessen
Umstellung. Es wird kein Merge nach dev/render/main vorgenommen.

Der JSON-Begleitbericht enthält vollständige SHAs, geprüfte Artefaktbindungen und
die erneuten PDF-Farbkontrollen. Der nächste getrennte Schritt ist ein kleiner
ONLYOFFICE-Vergleich mit drei echten Renderer-Ausgaben im bestehenden
`dossier-visual-parity`-Workflow. Keine neue Workflow-Datei und keine Änderung
der Produktdateien sind dafür erforderlich.
