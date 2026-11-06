# Gesamt-PDF: Vollständigkeit des Titelblatttexts

Fortsetzung von [#208](https://github.com/modebrecht/cv-cover-charm/issues/208),
auf `dev` ab `a901155dcd1ac8160d5fbeca05e58f19a74e00d9`.

## Fehler und Änderung

Ein neuer Browserfall entfernt den Namensblock aus dem kanonischen Titelblatt.
Die bisherige gemeinsame PDF-Policy meldet danach weiterhin `pass`. Die frühere
Prüfung findet vorhandenen Text ausserhalb des Blatts oder verdeckte Bilder,
kennt aber nicht die vom Titelblatt erwarteten Textblöcke.

`CoverCanvas` gibt nun den erwarteten Text aus seinen normalisierten Quellblöcken
mit. Ausdrücklich ausgeblendete und leere Textblöcke sind ausgenommen. Der
Drucksatz erhält stabile Zeilenmarker. Die gemeinsame Preflight-Policy gleicht
jeden erwarteten Block und jede nichtleere Zeile mit dem sichtbaren Text ab.
Listenzeichen bleiben erlaubte Renderer-Präfixe, Rich-Text-Segmente bleiben
vollständig erforderlich. Fehlende, doppelte oder unsichtbare Blöcke sowie
fehlende oder ungültige Prüfmetadaten sperren den Gesamtdownload.

Die Quelldaten werden nicht verändert. Der bestehende Dialog beobachtet den
kanonischen Drucksatz und übernimmt die Sperre. Der Generator kontrolliert
zusätzlich unabhängig vor dem Download und während des Exports.

## Prüfung

- Der neue Fall mit entferntem Namen scheitert gegen den unveränderten
  Ausgangscode: erwartet `blocked`, tatsächlich `pass`.
- Vier neue Browserfälle bestehen mit der Korrektur: entfernter Block, leerer
  Text, `display:none` und gelöschte Prüfmetadaten. Sie prüfen tatsächliche
  Dialogsperre, direkte Generator-API mit null Downloads, unveränderten
  lokalen Speicher und die Rückkehr zum gültigen Zustand nach Neuladen.
- Die bestehende direkte-dev-Prüfgruppe führt jetzt insgesamt **14 Fälle** aus;
  lokal alle bestanden, keine Wiederholung oder Auslassung.
- Vier neue Units prüfen den Quellvertrag für alle **39** Produktionsvorlagen,
  Rich Text, leere Zeilen, bewusst ausgeblendete Inhalte, optionale Empfänger/
  Beilagen und beschädigte oder doppelte Metadaten. Das ist eine Prüfung der
  Quellzuordnung, keine neue visuelle 39er-Abnahme.
- Gesamte Unit-Suite: **1’526 bestanden**, 288 Dateien, 27’912 Assertions.
  App- und QA-Typprüfung, Formatierung der geänderten Dateien, Lint ohne neue
  Fehler und Produktionsbuild bestanden.
- Der vorhandene komplexe Fall
  `joint-ledger-masonry-long-word-margins` exportiert über die echte Oberfläche
  erfolgreich **zwölf PDF-Seiten**. Web-/PDF-Text und physische Seiten stimmen,
  der Test meldet null Findings. Er lief lokal auf dem geänderten Code; sein
  Protokoll nennt deshalb die Ausgangs-SHA und `sourceDirty=true`.
  PDF-SHA-256: `212fb8d043ae1fb96dac74fb51dcc9955e3f56f7e0471ea28627ae7f29225b9b`.

Die vier neuen Browserfälle liegen im bereits regulär ausgeführten
`pdf-consent-boundaries.qa.ts`; ihre Prüfprotokolle werden mit den bestehenden
Artefakten `regression-pdf-consent-<SHA>` und `pdf-consent-evidence-<SHA>` archiviert.

## Verbleibende Grenze

Dies ergänzt den Textvertrag des Titelblatts. Ein vollständiger unabhängiger
Quellvergleich für CV und Bilder ist noch offen. Der Gesamtdossier-Override
bleibt gesperrt; bestehende Warnungen, Geometriegrenzen und Word-Beschränkungen
bleiben erhalten. #208 wird dadurch nicht vollständig geschlossen.
