# Word-Pruefung des unveraenderten runden Fotoausschnitts

31. Oktober 2026. Branch `work/30okt-body-boundary-candidate`.
**Vorbereitet; Desktop-Word wurde in dieser Fortsetzung nicht ausgefuehrt.**
Diese Linux-Umgebung hat keinen Zugriff auf die Windows-Word-Instanz.
Der zuletzt bestaetigte Windows-Checkout bleibt `e395d4d6`.
Kein Produktionsfix, keine Office-Abnahme, kein Merge.

## Genau eine Quelle

`tests/fixtures/docx-next/picture-import/app-body-photo-free-main.docx`

- SHA256: `7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923`
- 73 069 Bytes; synthetisches rot-blaues Testbild, keine Nutzerfotografie.
- Ein textfreies typisiertes Foto-Control mit frei verankertem Drawing.
- Originalbild 120x180 Pixel. Der bereits nachgewiesene Writer-Importverlust
  auf 96x96 Pixel ist kein vorweggenommenes Word-Ergebnis.

Der Vergleich muss dieselbe unveraenderte Quelle verwenden. Keine Joiner,
keine Nullhoehen-Blockvariante und kein rechteckiger Ersatz.

## Durchfuehrung in Desktop-Word

1. Eine Arbeitskopie der Quelle ausserhalb des Repository anlegen. Das
   Original behalten. Betriebssystem, Word-Version inklusive Build und
   Datum notieren. Die Kopie in Desktop-Word oeffnen. Eine Reparaturmeldung
   dokumentieren; eine reparierte Datei gilt nicht als unveraenderte Quelle.
2. Vor jeder Aenderung den runden Fotoausschnitt und die Seitenansicht
   festhalten, moeglichst als `source-word.pdf`. Zusaetzlich notieren, ob
   die Fotokontrolle angewaehlt werden kann. Noch kein Foto ersetzen und
   keine Felder bearbeiten: Dieser Durchlauf misst unveraendertes Speichern.
3. Als **`saved1.docx`** im DOCX-Format speichern. Dokument schliessen und
   genau diese Datei erneut oeffnen. Ansicht und Auswahl der Fotokontrolle
   dokumentieren, moeglichst auch `saved1-word.pdf` exportieren.
4. Daraus als **`saved2.docx`** speichern. Schliessen, genau diese Datei
   erneut oeffnen und denselben Sicht-/Auswahlcheck wiederholen. Optional
   `saved2-word.pdf` exportieren. Die beiden DOCX-Dateien getrennt behalten.
5. Beide Dokumente schliessen. Quelle, beide DOCX-Rueckdateien und die
   Word-/Sichtnotizen gemeinsam zuordnen. Ein spaeterer separater
   Bearbeitungstest darf diesen unveraenderten Durchlauf nicht ersetzen.

Das Dateipaket allein kann die Word-Ausfuehrung, Bedienfolge und aktive
Kontrollzuordnung im nativen Dokumentmodell nicht beweisen. Sichtpruefung
und nativer Auswahlbefund bleiben eigene Aussagen. Die Quelle wird nicht
zur angenommenen visuellen Referenz erklaert.

## Automatische Auswertung der beiden Rueckdateien

Im aktualisierten Repository mit den expliziten Python-QA-Abhaengigkeiten
(in einer eigenen Python-Umgebung installieren):

```sh
python -m pip install PyMuPDF==1.26.4 Pillow==11.3.0 numpy==2.2.6 lxml==6.1.1
python scripts/docx-next-picture-word-return.py saved1.docx saved2.docx word-return.json
```

Der Befehl startet kein Office, liest alle drei DOCX und schreibt eine neue
JSON-Datei. Bestehende Berichte und Eingabedateien werden nicht ueberschrieben.
Quelldatei, erster und zweiter Speicherstand muessen separate Dateien sein;
auch Hardlink-Aliase werden abgewiesen. Alle drei Eingabehashes sind gebunden.

Der Bericht vergleicht **Quelle → saved1**, **Quelle → saved2** und
**saved1 → saved2**. Er verwendet die vorhandenen strengen Leser fuer
kanonische Feldvorkommen, textfreie typisierte Bildzuordnung, Originalpixel,
Crop-Markup, Abschnitte, Revisionen und numerische ID-Kollisionen.
Ein neben dem leeren Foto-Control erhaltenes Originalbild besteht nicht.
Ein stabiler zweiter Speicherstand heilt keinen Verlust im ersten.

`exactPackageContract` prueft genau diese Paketmerkmale. Geaendertes
Crop-Markup kann eine fachliche Sichtpruefung verlangen, ohne allein eine
sichtbare Aenderung zu beweisen. Rueckgabecode 1 bedeutet, dass mindestens
ein Paketvertrag verletzt ist; 0 bedeutet nur, dass die Paketpruefung besteht.
**`wordAcceptance` bleibt immer `UNVERIFIED`.** Selbst bytegleiche Kopien
koennen die Paketpruefung bestehen, ohne dass Word je gestartet wurde.
PDF-Geometrie, native Bereiche und Bearbeitbarkeit prueft dieser Leser nicht.

## Lokale Pruefung des neuen Ablaufs

Zwoelf Gegenproben bestehen: keine Freigabe durch Selbstkopien, bleibender
Erstverlust trotz stabiler zweiter Datei, sichtbares verwaistes Foto neben
leerem Besitzer, Crop-Aenderung bei Originalpixeln, unerlaubter Joiner,
geaenderter Text bei erhaltenem Foto, wiederverwendete Eingabepfade,
Hardlink-Aliase, geschuetzte bestehende Ausgaben sowie gebundene Hashes und
unveraenderte Eingabebytes, Zurueckweisung einer geaenderten Quelle und
ein Fehlerbericht mit Rueckgabecode 1 bei Vertragsverletzung.
Der neue Test ist im vorhandenen nativen
App-Job eingetragen. Das sind Leserpruefungen ohne neue native Importe.

Lokal erneut bestanden: 12 neue Ruecklaufpruefungen, 51 bestehende
Word-Paketleserpruefungen sowie 52 Import-/Besitz-/Inhalts-/Medienpruefungen,
insgesamt **115**. Workflow-YAML ohne doppelte Schluessel und `git diff --check`
ebenfalls bestanden. Keine neue Unit-/Browsermatrix lokal gestartet.
Die abgeschlossenen Release-/Native-Laeufe auf `d98f5490` bleiben historische
Evidenz. Neue CI-Ergebnisse duerfen erst nach tatsaechlichem Lauf genannt werden.

## Fortsetzung: fehlende CI-Abhaengigkeit korrigiert

Auf `33f0affe` ist Release-Lauf `41167821056` vollstaendig erfolgreich:
1490 Unit-Tests und alle elf Browsergruppen. Native `41167821081` hat 12/15
erfolgreiche Jobs. Der App-Job `124439099526` scheitert diesmal jedoch bereits
vor seiner nativen Sammlung: Der neu ergaenzte Word-Leser importiert `lxml`,
das lokal vorhanden war, aber in der CI-Installation fehlte. Das ist eine
neue Setup-Regression und kein neuer Bildbefund. Die zwoelf neuen Tests
wurden in diesem fehlgeschlagenen Job noch nicht ausgefuehrt.

Die Abhaengigkeit ist im App-Job nun auf `lxml==6.1.1` gepinnt; derselbe
Installationsbefehl steht oben. Der Fehler wurde in einer frischen Umgebung
mit Python 3.12.14 und ausschliesslich den vorherigen drei QA-Paketen
reproduziert. Nach Installation von `lxml==6.1.1` bestehen darin alle 115
gezielten Python-Pruefungen. YAML-Pruefung und `git diff --check` bestehen.
Der erneute GitHub-Lauf ist damit noch nicht als bestanden behauptet.

Die beiden anderen nativen Fehler auf `33f0affe` bleiben der historische
Paket-Pin (`picture-identity`) und die begrenzte urspruengliche
gotoRange-Beobachtung (`stable-comparison`). Keine Referenzwerte gelockert,
kein Produktionscode geaendert und kein Merge.
