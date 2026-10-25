# Brief-Kandidat mit echten Repository-Prüfungen abgesichert

**Nachtrag 25. Oktober:** Die vier hier dokumentierten bestehenden Unit-Fehler sind im [anschliessenden Korrekturschritt](docx-next-existing-check-fixes-25okt.md) geschlossen. Aktuell 1412 Unit-Tests bestanden, keine Fehler. Dieser Bericht bewahrt den vorausgehenden Prüfschritt auf `4e87dd8`.

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangspunkt: `9eb1494017bf8f0f9e01dcd2e6235fac14f8dd3f`.

## Ergebnis

Die zuvor fehlende **vollständige TypeScript-Prüfung besteht**. Die 19 Empfänger-/Brief-Tests wurden jetzt unter echtem Bun im gesamten Unit-Lauf ausgeführt, ohne Node-Testadapter. Alle 19 bestehen. Die acht TypeScript-Dateien des neuen Arbeitsblocks sind formatiert und bestehen ihren ESLint-Lauf.

Die **gesamte Unit-Suite bleibt rot: 1403 bestanden, vier fehlgeschlagen**, ohne unbehandelten Importfehler. Dieselben vier Fälle scheitern in einer isolierten Gegenprobe bereits mit den Produktmodulen vor dem Brief-Prototyp. Sie sind nicht durch die neue Empfänger-Mindesthöhe verursacht. Die projektweite Formatprüfung bleibt mit 171 Dateien ausserhalb der hier formatierten acht Dateien ebenfalls offen.

Diese Fortsetzung ändert ausschliesslich Formatierung, keine Brief-/Foto-/Seitenflusslogik. Das normalisierte kompilierte JavaScript ist vor und nach der Formatierung in allen acht Dateien identisch. Kein Akzeptanztest und kein Gate wurde gelockert.

## Reale Umgebung und Eingangsprüfung

- Echte Bun-Laufzeit **1.3.13**, Build `bf2e2cec`; Node 24.22.1.
- 463 Repository-Abhängigkeiten über `bun install --frozen-lockfile --ignore-scripts` installiert. Keine Aktualisierung der Paket- oder Lockdatei.
- Repository-Pins: TypeScript 5.9.3, Prettier 3.8.3, ESLint 9.39.4.
- Vollständige Textprojektion der relevanten Quellen und Tests über GitHub, kein Git-Clone. Die TypeScript-Eingaben umfassen alle 429 vorhandenen TS-/TSX-/CSS-Quelldateien; alle 275 Unit-Testdateien sind vorhanden.
- Insgesamt 918 verwendete Repository-Textdateien abschliessend gegen ihre tatsächlichen Git-Blob-Hashes und Bytelängen geprüft, mit den acht veröffentlichten Formatänderungen als ausdrücklicher Ausnahme zum Ausgangskopf.
- Drei anfänglich lokal unvollständige Textkopien wurden erkannt und vollständig aus den gepinnten GitHub-Blobs ersetzt. Die daraus entstandenen frühen Syntax-/Testfehler sind keine Repository-Befunde und zählen nicht als Prüflauf. Die Originale auf GitHub waren vollständig.
- Eine zuvor fehlende, bereits veröffentlichte JSON-Fixture des Reading-Spacing-Tests wurde wiederhergestellt. Der abschliessende Lauf enthält keinen unbehandelten Importfehler.

## Prüfungen

| Prüfung | Ergebnis | Reichweite |
| --- | --- | --- |
| `bun run typecheck` | PASS, Exit 0 | Vollständiges unverändertes Repository-tsconfig |
| `bun run test:unit` | 1403 PASS / 4 FAIL, 275 Dateien, 26770 Bun-Erwartungen | Gesamter Unit-Befehl; kein pauschaler PASS |
| Neue Brief-Source-Flow-Tests | 14/14 PASS | Bestandteil des obigen Bun-Laufs |
| Neue Tabellen-Mindesthöhen-Tests | 5/5 PASS | Bestandteil desselben Bun-Laufs, nicht zusätzlich addieren |
| Prettier auf acht bearbeiteten TS-Dateien | PASS | Aktiver neuer Arbeitsblock |
| ESLint auf denselben acht Dateien | PASS | Kein vollständiger Repository-Lint behauptet |
| `bun run format:check` | FAIL, 171 übrige Dateien | Verbleibende Warnungen liegen ausserhalb dieses Formatierungsumfangs |
| Kompiliertes JavaScript vor/nach Formatierung | 8/8 identisch | TypeScript-Transpilation ES2022/ESNext, Kommentare entfernt, anschliessend identisch kanonisch formatiert |
| Abschliessende Dateiintegrität | 918/918 PASS | Erwartete Bytes/Blobs einschliesslich Formatänderungen; kein weiterer lokaler Produktpatch |

## Vier bereits bestehende Unit-Fehler

Die drei betroffenen Testdateien sind gegenüber dem Ausgangspunkt des Brief-Prototyps unverändert. Für die unabhängige Gegenprobe wurden Builder, Modell, Renderer und Validierung aus `b03be5da3adb6a340f8477dbf90b2583c104fe56` vollständig per Git-Hash wiederhergestellt; der neue Brief-Helfer ist in dieser isolierten Projektion entfernt. Die unveränderten übrigen Testabhängigkeiten stammen aus dem aktuellen gepinnten Baum. Nur diese drei Dateien wurden dort erneut ausgeführt, nicht eine vollständige historische Suite.

Ergebnis: **10 PASS / dieselben 4 FAIL in 14 Tests**.

| Test | Bestehender Befund |
| --- | --- |
| CV photo defaults and frame: fresh placement / legacy auto | Ein Quelltext-Stringtest verlangt weiterhin den alten erzwungenen Frei-Setter. Dieser wurde bei der bewussten Erhaltung gespeicherter automatischer Modi entfernt. Den unerwünschten Moduswechsel nicht wieder einführen, um den Test grün zu machen. |
| Composite page paint: authored order/scopes | Der zusammengesetzte Seitenhintergrund trägt `paintLayer: 0`; `validateDecoration` verlangt eine positive Ebene. |
| Final graphics: Neon stress models | Derselbe Composite-Layer-Konflikt. |
| Final graphics: Verlauf stress models | Derselbe Composite-Layer-Konflikt. |

Diese Befunde werden als separate bestehende Qualitätsprobleme dokumentiert. Weder die drei Tests noch die Grafikvalidierung oder Cover-Komposition werden in dieser Brief-Fortsetzung verändert. Eine Korrektur braucht einen begründeten Vertrag für die Ebenen, keine Entfernung von Prüfungen oder Zahlenkorrektur nur für PASS.

## Formatänderung ohne Verhaltensänderung

Formatiert wurden genau:

- `scripts/docx-next-letter-source-flow-probe.ts`
- `src/lib/docx-next/build-model.ts`
- `src/lib/docx-next/letter-source-flow.ts`
- `src/lib/docx-next/model.ts`
- `src/lib/docx-next/renderer.ts`
- `src/lib/docx-next/validation.ts`
- `tests/unit/docx-next-letter-source-flow.test.ts`
- `tests/unit/docx-next-table-minimum-height.test.ts`

Die vollständigen Texte wurden vor dem Formatieren gesichert und gegen die Ausgangs-Blobs geprüft. Anschliessend wurden beide Fassungen mit derselben TypeScript-Version transpiliert. Ihr identisch kanonisiertes JavaScript stimmt überein; Einzelhashes stehen im [Nachweis](docx-next-letter-repository-checks-25okt-evidence.json).

Es gibt deshalb für diesen reinen Formatierungsschritt keinen neuen Office-Render und keine neue 37-Seiten-Prüfung. Die [acht Dossiers / 37 Seiten](docx-next-letter-recipient-minimum-25okt.md) bleiben Ergebnisse ihres ursprünglichen Empfänger-Checkpoints. Aus dieser Quellprüfung wird keine Word-Fidelity abgeleitet.

## Reproduktion

```sh
bun install --frozen-lockfile --ignore-scripts
bun run typecheck
bun run test:unit
bun run format:check
bunx --no-install prettier --check scripts/docx-next-letter-source-flow-probe.ts src/lib/docx-next/build-model.ts src/lib/docx-next/letter-source-flow.ts src/lib/docx-next/model.ts src/lib/docx-next/renderer.ts src/lib/docx-next/validation.ts tests/unit/docx-next-letter-source-flow.test.ts tests/unit/docx-next-table-minimum-height.test.ts
bunx --no-install eslint scripts/docx-next-letter-source-flow-probe.ts src/lib/docx-next/build-model.ts src/lib/docx-next/letter-source-flow.ts src/lib/docx-next/model.ts src/lib/docx-next/renderer.ts src/lib/docx-next/validation.ts tests/unit/docx-next-letter-source-flow.test.ts tests/unit/docx-next-table-minimum-height.test.ts
```

Der Bun-Binärpfad muss für den Repository-Befehl `test:unit`, der selbst `bun test` aufruft, im PATH liegen. Ein anfänglicher PATH-Setupfehler wird nicht als Testfehler gezählt.

## Anschluss und Grenzen

Der Empfänger-Kandidat ist jetzt vollständig typgeprüft und unter echtem Bun getestet. Die vier bestehenden Unit-Probleme und die übrige Formatierung bleiben sichtbar. Vor allgemeiner Repository-Freigabe müssen sie separat geklärt werden.

Tatsächliche Word-Bildbedienung/Speichern, die Word-Abnahme der neuen Empfänger-Komposition und der enge Referenzumbruch bleiben offen. Das vorhandene Fotoprüfpaket wird nicht verändert oder auf die neue Empfänger-Komposition umetikettiert. Kein neuer Testauftrag beim Benutzer, kein neuer Foto-Ankerversuch, kein Merge, Deployment, CI-Dispatch oder normaler DOCX-Export-Schalter.

Build, vollständiger Repository-Lint, frischer Browserexport, neue Save/Reopen-Zyklen und vollständige Schema-Zertifizierung wurden nicht ausgeführt. Rohlogs, Testumgebung und Eingabedateien bleiben ausserhalb von Git. Dev/main/render sowie die getrennten Datenschutz-Audits und Automationen bleiben unberührt.

**Urteil: Brief-Typ-/gezielte Prüfungen PASS; gesamtes Repository und allgemeine Sidebar-Freigabe weiterhin nicht freigegeben.**
