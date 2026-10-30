# Direkt verankertes Einzelbild – lokaler Zwischenstand vom 30. Oktober 2026

Basis: `work/30okt-body-boundary-candidate`, `1ef024f5`.
**Keine Integration, keine native oder Word-Freigabe.**

Der Renderer bietet den Versuch ausschliesslich mit `directPictureOwnership: true`
zusammen mit `allowUnacceptedModelIssues: true` an. Bestehende Bildstrukturtests
sind unverändert. Der normale Rahmenpfad bleibt Standard. Der Versuch ersetzt
den Textrahmen durch eine typisierte Bildkontrolle um genau ein verankertes Bild.
Bildgeometrie und Ausschnitt stammen weiterhin aus `pictureGeometry`; explizite
Quellkoordinaten werden ohne zusätzliche Begrenzung übernommen. Der zusätzliche
Baseline-Raum des bisherigen Textrahmens entfällt. Dessen Auswirkung auf Textfluss
und Bildposition muss nativ geprüft werden.

Die App-Erzeugung und native QA verlangen ausdrücklich
`--direct-picture-ownership`. Der Bericht prüft diesen Modus gegen die
Fixture-Metadaten und kontrolliert im Quell-XML eine typisierte Kontrolle mit
genau einem Drawing und einem Bild ohne Textkasten. Die bestehenden Identitäts-,
Pixel- und Geometriegrenzen werden nicht gelockert.

## Tatsächlich ausgeführt

- Isolierter Aufruf des echten Renderers mit Node 22.19 und TypeScript-Stripping,
  lokalem Import-Resolver und einem minimalen synthetischen Modell: Körper,
  Einzelzelle, linke Zelle und rechte Zelle bestanden.
- Je Kontext: eine typisierte Kontrolle, ein verankertes Drawing, ein Bild,
  kein Textkasten; deklarierte X-/Y-Offsets, unverändertes Modell, deterministische
  Ausgabe, Bytegleichheit bei ausgeschalteter Option sowie unveränderte Medien
  und übrige Paketdateien geprüft. Die Diagnose-Sperre weist normale Aufrufe ab.
- Unabhängige ZIP-CRC-/XML-Prüfung aller vier Quellpakete bestanden.
- Python-Syntaxprüfung der geänderten QA und `git diff --check` bestanden.

Die maschinenlesbaren Quellpaket-Hashes stehen in
`direct-picture-candidate-30okt.json`. Der lokale Hilfsaufruf liegt unter
`artifacts/direct-picture/smoke.mjs`; diese ignorierten Diagnoseartefakte werden
nicht veröffentlicht. Dies sind **keine** neuen nativen Save/Reopen-Nachweise.

## Noch auszuführen

Der erneute Ubuntu-Zugriff ist möglich. Nach Einrichtung von Bun 1.3.13 und den
festgeschriebenen Projektabhängigkeiten bestehen **1490/1490 Unit-Tests unter
Linux**, einschliesslich der unveränderten Bildstrukturtests und drei neuer
Versuchsprüfungen. Typprüfung und geänderte Lint-/Formatprüfung bestehen ebenfalls.
Der erste Windows-Lauf hatte plattformspezifische Pfad-/Zeilenendenfehler;
er ist kein positiver Nachweis. Die neue Prüfung wurde zusätzlich einzeln
zusammen mit den bestehenden Besitztests ausgeführt: 7/7 bestanden.

Die native Forschungsmatrix und die Release-Regression sind nun ausdrücklich
für den separaten Kandidatenbranch zugelassen. Nur dessen `app-body-content`
aktiviert beide Versuchsparameter; andere Branches behalten ihre bisherigen
Parameter. Die historischen Foto-Paket-Pins bleiben unverändert. Ergebnisse
dieser CI-Läufe sind bei diesem Zwischenstand noch ausstehend.

Reproduktion der Quell- und nativen Prüfungen:

```sh
bun test tests/unit
bun run typecheck
bunx prettier --check src/lib/docx-next/renderer.ts tests/unit/docx-next-direct-picture.test.ts scripts/docx-next-sidebar-body-probe.ts
python scripts/docx-next-sidebar-body-test.py
bun scripts/docx-next-sidebar-body-probe.ts "$QA_ROOT/fixtures" --direct-picture-ownership
python scripts/docx-next-sidebar-body-qa.py "$QA_ROOT/fixtures" \
  --engine "$QA_ROOT/setup/runtime" --binding "$QA_ROOT/uno-binding" \
  --detached-cell-starts --direct-picture-ownership
```

Die Erzeugung benötigt wie bisher echte Bildquellen aus der vorhandenen
Fixture-Vorbereitung. Danach sind die komplette native Forschungsmatrix,
Bildpositionen vor/nach zwei Speicherzyklen und tatsächliches Desktop-Word zu
prüfen. Erst dann ist eine Merge-Beurteilung möglich. `main`, `render` und
veröffentlichte Historie bleiben unverändert.
