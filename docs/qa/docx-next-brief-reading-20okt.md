# Gemeinsamer klassischer CV-Lesefluss im Brief-App-Export

Fortsetzung auf `fix/docx-next-shared-fidelity-18okt`, Basis des erneut gefetchten Remote-Branches `3f845b75082a47aa57672d5c814fceae238364ce`. Status: **technischer Teilnachweis PASS; neue Word-Abnahme offen**.

## Problem und gemeinsame Lösung

Der Brief-QA-App-Export verwendete noch die ältere CV-Komposition: Datum und Eintrag sowie Sprachname und Niveau standen untereinander, die Listen bestanden aus einfachen Absätzen. Der Modern-Lesefluss-Test verwendet bereits die gemeinsame klassische Zeilenkomposition. `createSavedBriefDocxNext()` reicht jetzt dieselbe bestehende Option `cvContentComposition: reading-rows` durch den vorhandenen Exportpfad. Keine neue Layout-Engine, keine zusätzlichen Vorlagenweichen im Builder und keine Änderung des gewöhnlichen Modell-/Standardexports.

Damit werden Datumsleisten, Sprachenspalten, echte native Listen und die vorhandenen schmalen CV-Spalten auch im Brief-QA-Export genutzt. Die echte Ein-/Zweiseitenaktion erreicht denselben Pfad. Der bestehende persönliche Kontaktblock samt gemessenen Web-Abständen bleibt erhalten. Die Änderung schreibt keine Projekteinstellungen, verändert keine Web-/PDF-Darstellung und setzt keine neuen Abstands-/Schriftdefaults.

Die zusätzliche native Seite ohne Seitenpreset ist **nicht behoben**. Die Zeilenkomposition verbessert den Fluss deutlich, reicht aber nicht für vollständige Web-/Word-Schriftrollen-, Rubrik- und Chrome-Fidelity. 08/09/10 behalten in der ergänzenden LibreOffice-Vorschau zwei CV-Seiten gegenüber einer im normalen App-PDF; 05 ist eine unveränderte Modern-Kontrolle mit derselben bekannten Seitenzahlabweichung. Zwei CV-Seiten ohne Einseitenaktion bleiben nach Benutzerpräzisierung kein eigenständiger Freigabeblocker. Das ist keine Behauptung gleicher Umbrüche oder neuer Word-Abnahme.

## Batch und belastbare Nachweise

[Konsolidiertes Word-Paket](docx-next-brief-reading-20okt/Word-Batch-20okt.zip): acht echte App-Downloads, normale App-PDFs aus denselben Projekten, portable Projekte, zweitseitige visuelle Übersicht, eine gemeinsame Prüfliste und technische Ergebnisse. Nummerierung bewusst mit den bisherigen Rückgaben kompatibel.

| Datei | Inhalt                                                                   | CV-Seiten App-PDF / ergänzend gerendert |
| ----- | ------------------------------------------------------------------------ | --------------------------------------- |
| 01    | Modern, Einseitenaktion; unveränderte Kontrolle                          | 1 / 1                                   |
| 04    | Modern, Kontakt-Header, zwei Letter-/zwei CV-Seiten; unverändert         | 2 / 2                                   |
| 05    | Modern, eigene Ränder, 18-px-Rubriken, zusätzliche Referenz; unverändert | 1 / 2                                   |
| 08    | Brief, Standard mit neuen Datums-/Sprachzeilen und Listen                | 1 / 2                                   |
| 09    | Brief, langer Name/Beruf, Cover 115 %, Kontaktblock                      | 1 / 2                                   |
| 10    | Brief, Hochformatfoto, Zoom/Crop und gemeinsame CV-Zeilen                | 1 / 2                                   |
| 11    | Brief, echte Einseitenaktion samt Referenz und schmalen Spalten          | 1 / 1                                   |
| 12    | Brief, echte Zweiseitenaktion                                            | 2 / 2                                   |

- Acht Restores mit tatsächlichem Dateiimport, Reload, gespeicherten Zuständen, UI-DOCX-Download und normalem UI-PDF-Download. Downloads bytegleich zu ihrer unmittelbar frischen App-Erzeugung, keine Modell-Issues, keine Konsolenfehler und keine Mutation gespeicherter Eingaben durch Export.
- 01/04/05 sind bytegleich zum veröffentlichten Headerstandard-Checkpoint. Keine erneute Word-Komplettabnahme dieser Kontrollen verlangt; die bereits offene 04-Abnahme wird nicht geschlossen.
- Unberührtes Baseline-Checkout von `3f845b75`: 08/09/10 haben identische Snapshots, Covermetriken und Web-Raster. Deckblatt-/Lettermodelle sind vollständig identisch; alle CV-Feldidentitäten und Texte bleiben in gleicher Häufigkeit erhalten. Der Unterschied liegt in den klassischen CV-Zeilen und nativen Listen.
- 31 A4-Vorschauseiten gerendert und visuell anhand aller 22 unterschiedlichen Seitenraster kontrolliert. 649 native Feldinhalte, alle Absatztexte und Original-PNGs erhalten. Beide Seitenaktionen liefern auch in der nativen Vorschau exakt die gewünschte CV-Seitenzahl. Gemeinsame Inhaltsanfänge und bewusste eigene Ränder aus dem vorherigen Headerstandard werden erneut nachgewiesen.
- 1’254 Unit-Tests in 259 Dateien, 25’594 Assertions, 0 Fehler. Typecheck, Lint (0 Fehler, 21 bestehende Warnungen), Format und Build bestanden. Keine wiederholte Vollsuite oder CI-Neustarts nach ausschliesslichen Paket-/Dokumentationsänderungen.

Die zusätzliche Vorschau verwendet unverändertes Runtime-LibreOffice und ist kein Microsoft-Word-Nachweis. Die Prüfung in Word bleibt für alle fünf veränderten/neuen Brief-Dateien offen. Vorherige positive Rückmeldungen zu älteren 08/10-Dateien werden nicht auf den geänderten CV-Pfad übertragen. Die separaten Kontaktkorrektur-09- und Headerstandard-04-Abnahmen bleiben offen.

## Grenzen und nächste Arbeit

Später einmal gesammelt zuerst 11 und 12 sowie den Kontaktblock von 09 ansehen; nur 11 mit einer Sprache und einem Listenpunkt bearbeiten, speichern, schliessen und wieder öffnen. 08/10 sind zusätzliche Standard-/Fotoproben desselben Pfads. Keine Zwischenabnahmen pro Commit.

Die Leseflusskomposition akzeptiert weiterhin nur klassisches CV ohne freie Elemente mit persönlichem Block am normalen ersten Platz. Verlagerte persönliche Angaben werden klar abgewiesen, statt eine ungeprüfte Ersatzkomposition herunterzuladen. Native Sidebar und Agent A bleiben eingefroren. Verlauf, Neon und Warm/Freundlich sowie weitere Schriften bleiben gesperrt. Der nächste technische Block ist die gemeinsame Auflösung tatsächlicher CV-Textrollen und Rubrikmetriken; danach folgen die verbleibenden Coverfamilien und die breite Belastungsmatrix.

`vercel.json` enthält weiterhin die explizite Sperre dieses Arbeitsbranches. Kein Merge, Deployment, produktiver Exportwechsel, Eingriff in geschützte Branches oder Engine-Experiment.

## Reproduktion

```sh
WORD_HEADER_STANDARD=1 WORD_BATCH_CASES=01,04,05,08,09,10,11,12 \
  bun scripts/docx-next-word-batch19okt.ts APP
# Baseline mit demselben Runner im unveränderten Checkout von 3f845b75:
WORD_HEADER_STANDARD=1 WORD_BATCH_CASES=08,09,10 \
  bun scripts/docx-next-word-batch19okt.ts BASELINE
# DOCX mit render_docx.py --dpi 110 --emit_pdf nach RENDERS/NUMMER rendern.
python scripts/docx-next-header-default19okt-verify.py APP RENDERS VALIDATION_JSON
# Rebuild all eight captured App models exactly from the retained source/metrics:
bun scripts/docx-next-brief-reading20okt.ts
```

Browser, Runtime-Node und verifiziertes Sans-Fontprofil entsprechen dem vorherigen Batch. Maschinenlesbare [App-Ergebnisse](docx-next-brief-reading-20okt/app-results.json), [Text-/Geometrienachweise](docx-next-brief-reading-20okt/validation.json), [Regression](docx-next-brief-reading-20okt/regression.json), je Fall vollständiges Proof-Paket und abschliessende Checklogs liegen neben dem ZIP.
