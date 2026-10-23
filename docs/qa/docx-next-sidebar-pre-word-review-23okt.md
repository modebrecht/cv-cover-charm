# Nachprüfung vor der Word-Abnahme — 23. Oktober 2026

Basis: `4a66ef8fc3bde82978e8444c4cccaabb1ad63fd5` auf `fix/docx-next-shared-integration-22okt`. Diese Runde ändert keine Produktquelle und keine bereits ausgelieferte DOCX-/PDF-Datei. Sie prüft die verbleibenden Risiken, vervollständigt den dedizierten DOCX-Testbefehl und bereitet die Auswertung der Word-Rückläufer vor.

## Ergebnis des breiteren Unittest-Laufs

`test:docx-next` enthielt die neuen Shared-Sidebar- und Typografie-Tests noch nicht. Die vollständige Unit-Suite hätte sie bereits gefunden; die Lücke betraf den dedizierten Befehl. Beide Dateien sind jetzt dort ausdrücklich enthalten.

Für den vollständigen Lauf wurden die vorher lokal fehlenden Testdateien und ihr Runtime-Graph-Helfer aus exakt diesem Remote-Commit wiederhergestellt. Der erweiterte Befehl führte tatsächlich 74 Testdateien aus. Zunächst bestanden 521 von 523 Tests; zwei ältere Erwartungen schlugen fehl. Beide Fehler wurden unabhängig auf der vorherigen Basis `6bf49a9cba17d3ebb1012964b7ee204d1abb4176` reproduziert. 426 Produktdateien dieser isolierten Vergleichsprojektion stimmen mit den Git-Blobs der Basis überein; die beiden betroffenen Produktpfade und Tests sind über den Textfluss-Fix hinweg unverändert.

| Erwartung | Warum veraltet | Jetzt verbindlich geprüft |
| --- | --- | --- |
| Ungerade Referenzzeile mit nur zwei Zellen | Web und bestehender Export haben zwei gleich breite Inhaltsbahnen mit einer eigenen 6-mm-Lücke. Der ältere Test liess diese dritte Zelle aus. | Drei Zellen; letzte Referenz links, leere Lücke und rechte Bahn. 6 mm Lücke, gleiche Bahnbreiten, ganze verfügbare Breite, kein zusätzlicher linker Einzug, identische Quellreihenfolge. Halbe Breite bleibt gestapelt. |
| Kompakter gezeichneter CV-Fussstreifen behält die alte Textfusszeilen-Reserve | Die leere gezeichnete Zone ersetzt die Textfusszeile. Die Web-Regel reserviert 1 mm physischen Rand plus die sichtbare Bandhöhe genau einmal. Die alte Erwartung verlangte weiterhin rund 26,73 mm. | Die konkrete 4-mm-Fixture reserviert 5 mm; eine gespeicherte 8-mm-Zone reserviert 9 mm. Übrige Seiteneigenschaften, Body-Blöcke und Anschreiben bleiben unverändert. |

Dies korrigiert Testverträge anhand des vorhandenen Web-/Produktverhaltens. Es ändert keine Geometrietoleranz, keine native Akzeptanzmatrix und keinen Produktcode. Die Referenzprüfung verwendet konkrete ID-/Arraywerte, damit die Assertions das weitergeprüfte Modell nicht durch verschachtelte Matcher beeinflussen.

**Endergebnis: 523 Tests in 74 Dateien, 9071 Assertions, 0 Fehler.** Die Formatprüfung der drei geänderten JSON-/TS-Dateien mit der Repository-Konfiguration besteht. Dies ist der gesamte dedizierte DOCX-Unittest-Befehl, keine vollständige Repository-/Browser-/Office-Abnahme. Die historische 22er- und die visuelle All-39-Matrix wurden nicht wiederholt.

## Was die bisherigen Belege nicht beweisen

Die historischen Berichte trennen bereits sichtbare Texte von kanonischen Feld-IDs und Originalbildern. Das bleibt entscheidend: [Picture Identity](../docx-next/sidebar-picture-identity-status.md) zeigt in Writer sowohl erhaltenen sichtbaren Inhalt bei verlorenen IDs als auch ersetzte Bildpixel; [Crop Precision](../docx-next/sidebar-crop-precision-status.md) beschreibt daneben geänderte Crop-Werte auf erhaltenen Originalpixeln. Das sind unterschiedliche Fehlerklassen.

Der [PopSdt-Bericht](../docx-next/sidebar-native-pop-status.md) beobachtet eine konkrete abgeschlossene Writer-Selektion, belegt aber die Identität mit einem später entsorgten Absatz nicht durchgängig über Callbacks. Daraus folgt keine bewiesene Ursache des jetzigen Word-Kandidaten. Es wird kein Importer-Befund auf Microsoft Word übertragen und kein weiterer Engine-Versuch gestartet.

Die drei bereits ausgelieferten Dokumente enthalten 88 / 88 / 128 eindeutige kanonische Feld-Tags. Beide Fotodokumente haben genau ein getyptes Picture-Control mit genau einem zugehörigen DrawingML-Foto. **Keines der Dokumente besitzt für diese Controls bereits `w14:paraId`-Werte.** Beim ersten Word-Speichern kann daher keine Gleichheit solcher Absatzkennungen zur Exportdatei bewiesen werden. Erhaltene kanonische Feld-Tags sind wichtig, ersetzen diesen fehlenden Ausgangswert aber nicht. Neu vergebene numerische SDT-IDs sind ebenfalls getrennt von den kanonischen Tags zu beurteilen. Selbst gleiche persistierte Absatzkennungen beweisen keine Identität eines nativen Importer-Objekts.

## Auswertung für die gespeicherten Word-Dateien

Der neue rein lesende Helfer [`docx-next-word-acceptance-23okt.py`](../../scripts/docx-next-word-acceptance-23okt.py) vergleicht zwei DOCX-Dateien. Er erzeugt einen JSON-Bericht; seine erfolgreiche Ausführung ist keine Abnahme. Er startet weder Word noch LibreOffice und schreibt keine Eingabedatei um.

Er hält folgende Befunde getrennt:

- Kanonische Tags: fehlend, doppelt oder eindeutig; exakter Feldinhalt einschliesslich harter Umbrüche und Tabs.
- Quelltext noch irgendwo im ausgewählten XML-Zweig vorhanden, auch wenn der zugehörige Control-Besitzer fehlt. Das ist ausdrücklich kein Beweis sichtbarer Darstellung.
- Story und Control-Verschachtelung; numerische SDT-IDs; persistierte Absatzkennungen nur bei vorhandenem Ausgangswert.
- Getyptes Picture-Control und tatsächlich darin referenziertes Bild; vollständige Pixel im Control, in irgendeinem aktiven Bild oder lediglich noch irgendwo im Paket.
- Exakte Crop-Schreibweise, unabhängig vom Pixelerhalt. Gleichwertige sichtbare Crops können anders kodiert sein; dafür bleibt die visuelle Prüfung erforderlich.
- Deklarierte Anwendungsmetadaten und Änderungsverfolgung. Metadaten allein beweisen den verwendeten Editor nicht. Revisionsmarkup benötigt gesonderte Beurteilung; unbekannte Hauptdokument-Namespaces und doppelte ZIP-Teile werden vor einer Verlustbehauptung abgewiesen.

Ein ungeändert gespeicherter Rückläufer wird mit der Exportdatei verglichen. Die absichtlich bearbeitete Kopie wird getrennt von diesem unveränderten Speicherstand beurteilt. Der Helfer kennt die beabsichtigten Änderungen nicht; ihre Differenzen werden anschliessend anhand der Testanleitung zugeordnet und nicht pauschal als Speicherverlust gewertet. Es werden keine weiteren Benutzer-Testschritte benötigt.

```sh
python scripts/docx-next-word-acceptance-23okt.py Quelle.docx Gespeichert.docx Befund.json
python scripts/docx-next-word-acceptance-test.py
bun run test:docx-next
```

15 Gegenprüfungen bestehen. Sie erkennen unter anderem verlorene Umbrüche/Tabs trotz gleicher zusammengezogener Wörter, verlorene Controls bei erhaltenem Text, neue numerische IDs ohne kanonischen Verlust, vorhandene/fehlende Absatzkennungen, ungetypte oder mehrdeutige Bildbesitzer, ungenutzte Originaldaten im Paket, harmlose PNG-Neukompression sowie Crop-Änderungen ohne Pixelverlust. Inaktive Markup-Compatibility-Fallbacks zählen nicht doppelt. Eine Selbstkontrolle an einem Paket verifiziert nur den Leser; `wordAcceptance` bleibt stets `UNVERIFIED`.

## Verbleibende Produktrisiken und nächster Schritt

1. Das frei positionierte Foto liegt weiterhin als getyptes Inline-Picture-Control in einem nativen Seitenrahmen. Volle Pixel im Export sind belegt; Bildauswahl, Zuschneiden und Ersetzen in Word sind offen. Dies ist die wichtigste nächste Entscheidung.
2. Die V3-Zeilenhöhe ist gegen das begrenzte Browser-Schriftprofil geprüft. Die tatsächlichen Word-/Arial-Metriken und die im Textflussbericht dokumentierten Restabstände sind noch nicht vollständig abgenommen.
3. Kurze Rubrikgruppen sind begrenzt und lange Einträge bleiben teilbar. Die vorhandenen Writer-Grenzfälle ersetzen den tatsächlichen Word-Seitenumbruch nicht.

Bis zum Word-Ergebnis wird weder eine neue Bildarchitektur eingeführt noch eine weitere Offset-Korrektur vorgenommen. Das bestehende Paket `CV-Cover-Charm-Sidebar-Word-Abnahme-22okt.zip` ist bytegleich geblieben; seine drei Dokumente sind weiterhin die richtigen Testdateien. Keine neue Zwischenrunde, kein Merge und kein Produktionsschalter.

**Verdikt unverändert: CONDITIONAL GO für die Word-Triage, NO-GO für die Sidebar-Produktionsfreigabe.** [Maschineller Nachweis](docx-next-sidebar-pre-word-review-23okt-evidence.json).
