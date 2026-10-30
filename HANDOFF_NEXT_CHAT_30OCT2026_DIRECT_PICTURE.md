# Übergabe: direkt verankertes Einzelbild, 30. Oktober 2026

**Auf Nutzerwunsch gestoppt, committen und übergeben.** Keine weiteren lokalen
Prüfungen starten. Die schon gestartete GitHub-CI darf fertiglaufen; zuerst deren
Ergebnisse auswerten, keine erneute lokale Testumgebung aufbauen.

## Branches und Sicherung

- Repository: `modebrecht/cv-cover-charm`.
- Arbeitsbranch: `work/30okt-body-boundary-candidate`.
- Implementierung und CI-Konfiguration sind mit
  `3972e87b2723dd9199b184ec1e0936c9e9c2617f` committet und gepusht.
- Basis: `1ef024f59c3907a8424e3316af2f462c1a6cec85`.
- Kein Merge. `dev` bleibt `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`,
  `main` bleibt `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`,
  `render` bleibt `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.
- Keine veröffentlichte Historie umschreiben; `AGENTS.md` beachten.

## Was umgesetzt ist

Der Renderer besitzt die ausdrücklich unakzeptierte Versuchsoption
`directPictureOwnership: true`. Sie verlangt zusätzlich
`allowUnacceptedModelIssues: true`. Nur im bisherigen freien Rahmenpfad wird
der Textrahmen durch eine typisierte Bildkontrolle um ein einziges direkt
verankertes Bild ersetzt. Der Standardpfad bleibt unverändert.

Bestehende Bildstrukturtests wurden nicht geändert. Der Versuch übernimmt
Bildgeometrie, Crop, Rand und Quellkoordinaten, behält den Absatz-/Seitenbezug
und reserviert die entfallene Rahmen-Instanznummer, damit spätere Zeichnungen
in Kopfbereichen unverändert bleiben. Der bisherige zusätzliche Baseline-Raum
des Textrahmens entfällt: Auswirkungen auf Textfluss und Position sind offen.

Die App-Prüferzeugung und native QA verwenden ausdrücklich
`--direct-picture-ownership`; die QA kontrolliert Metadaten und Quell-XML
(eine typisierte Kontrolle, ein Drawing, ein Bild, kein Textkasten).
Bestehende Pixel-, Identitäts- und Geometriegrenzen wurden nicht gelockert.

Die Workflow-Dateien erlauben den separaten Kandidatenbranch. Nur dessen
`app-body-content` schaltet `--direct-picture-ownership` und
`--detached-cell-starts` ein. Die übrigen nativen Gruppen und historischen
Paket-Pins bleiben unverändert. Keine Freigabe für den normalen App-Export.

## Tatsächlich bestandene Prüfungen

- **1490/1490 Unit-Tests unter Linux**, Bun 1.3.13, 282 Dateien.
- **7/7 gezielte Bildtests**, darunter die bestehenden Besitz-/Strukturtests.
- **25/25 Python-Vertragstests**: 11 Body-Inventar, 6 Medien, 8 Speichergeometrie.
- App-Typprüfung, geänderte Lint-/Formatprüfung und Diff-Prüfung.
- Vier isolierte Quellkontexte im echten Renderer: Körper, Einzelzelle,
  linke und rechte Zelle. Eine typisierte Kontrolle mit einem verankerten Bild,
  unveränderte Medien/andere Paketdateien, deterministische Ausgabe,
  Bytegleichheit bei ausgeschalteter Option und unverändertes Modell.
- Release-CI `fast-checks` ist bereits vollständig erfolgreich
  (Unit-Tests, Format, TypeScript, Lint, Produktionsbuild).

Der erste Windows-Gesamtlauf enthielt Pfad-/Zeilenendenfehler und einen Fehler
im neuen Test. Er ist kein positiver Nachweis. Der korrigierte Linux-Gesamtlauf
ist vollständig grün. Die neuen Tests bestätigen auch, dass die normalisierte
gespiegelte Seitenfoto-Fixture inline bleibt; sie ist kein freier Bildfall.

## Laufende GitHub-Prüfungen – noch kein Gesamtergebnis

Beide Läufe beziehen sich exakt auf `3972e87b`:

- Native 15er-Matrix:
  https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788805
- Release-Regression mit Browserfällen:
  https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788695

Beim letzten Abruf sind fünf native Vorlagengruppen erfolgreich:
`gallery`, `studio2`, `studio`, `terracotta`, `aurora`.
`app-body-content` steht noch beim Aufbau der verifizierten Engine;
sein Job ist `124149015624`. **Noch keine vollständige 22er-App-Abnahme!**
Die übrigen nativen Gruppen sind noch nicht abschliessend ausgewertet.
Im Release-Lauf sind `fast-checks` und vier Browsergruppen erfolgreich;
weitere Browsergruppen laufen. Keine Aussage über 206 bestandene Fälle machen,
bevor der Gesamtlauf fertig ist.

Den unveränderten historischen `picture-identity`-Pinfehler weiterhin getrennt
behandeln und nicht durch neue Hashes verdecken. `stable-comparison` und die
übrigen Gruppen müssen ebenfalls bis zum Ende ausgewertet werden.

## Word-Zusatzversuch

Auf diesem Windows-Rechner ist Word installiert. Ein isolierter COM-Start für
die vier synthetischen Kontrollen ist jedoch an `0x80080005`
(`CO_E_SERVER_EXEC_FAILURE`) gescheitert. Kein Dokument wurde dabei erfolgreich
geöffnet oder gespeichert. **Keine neue Word-Abnahme.**
Computer Use zeigte nur ein bereits vom Nutzer geöffnetes, fachfremdes Dokument;
dieses wurde nicht bedient. Der Hilfsaufruf ist beendet. Private Word-Dateien und
Screenshots gehören weiterhin nicht ins öffentliche Repository.

## Nächste fachliche Schritte nach neuem Arbeitsauftrag

1. Die zwei bestehenden GitHub-Läufe abschliessend auswerten; Artefakte und
   exakte Commitbindung prüfen. Keine gleichen Läufe ohne neuen Grund starten.
2. `app-body-report.json` prüfen: alle 22 Fälle mit Quellzustand und zwei
   Save/Reopen-Zyklen, Feldidentität/-reihenfolge, Texte, Bilder und Pixel.
3. `app-save-geometry-report.json` und PDF-Fotokoordinaten vergleichen.
   Ein erfolgreicher Sammellauf ist nicht automatisch exakte Geometriefreigabe.
   Bildpositionen pro Foto und Speicherphase konkret beziffern; keine Toleranzen
   vergrössern. Eine Positions-/Layoutverschiebung verhindert eine Freigabe.
4. Tatsächliche Desktop-Word-Prüfung gesondert nachweisen. Frühere akzeptierte
   Word-Dateien 01–04b gelten nicht automatisch für diese neue Architektur.
5. Erst nach vollständigen positiven Nachweisen einen Merge beurteilen.
   `main` und `render` unverändert lassen.

## Lokaler Ort und Nachweise

Checkout: `C:\Users\gsu\Documents\ChatGPT\ib2026\cv-cover-charm`.
Berichte: `docs/qa/direct-picture-candidate-30okt.{md,json}`.
Neue Tests: `tests/unit/docx-next-direct-picture.test.ts`.

Ignorierte lokale Diagnoseartefakte liegen unter `artifacts/direct-picture/`,
unter anderem `unit-tests-linux.log`, `picture-tests.log`, vier synthetische
DOCX-Quellen, `smoke.mjs`, `loader.mjs` und der fehlgeschlagene Word-Hilfsaufruf.
Unter `artifacts/tools/` liegen lokale Bun-Binaries und eine Python-Umgebung.
Diese Hilfsdateien sind nicht Teil der öffentlichen Sicherung.
