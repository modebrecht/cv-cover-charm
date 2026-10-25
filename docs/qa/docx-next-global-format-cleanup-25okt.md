# Projektweite Formatprüfung geschlossen

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangskopf `558b9ec7bb2fabd69e4fb6c4c43bc8e072f1560e`.

## Ergebnis

**Die 169 bestehenden Prettier-Fehler sind behoben.** Die vollständige
Formatprüfung, Unit-Suite (1412 PASS / 0 FAIL), TypeScript-Prüfung, ESLint und der
konfigurierte Produktionsbuild bestehen. ESLint hat weiterhin dieselben 21
Warnungen. Es gibt keine neue Word-Abnahme und keinen neuen Prüfkandidaten.

Bearbeitet wurden 85 Produktquelldateien (79 TS/TSX und sechs CSS) sowie 84
Testdateien. 168 Dateien enthalten ausschliesslich Formatänderungen. In einer
weiteren Testdatei wurde zusätzlich eine formatabhängige Quelltextsuche durch
echte Verhaltensprüfungen ersetzt. **Die Produktlogik bleibt erhalten.**

## Formatierung und Äquivalenz

Eine separate lokale Projektion wurde aus dem gepinnten Repository-Stand
zusammengesetzt; die andere vorhandene Prüfkopie wurde nicht formatiert. 1019
vorhandene Quell-/Prüfeingaben wurden über Bytelängen und tatsächliche Git-Blob-
Hashes kontrolliert. Das ist kein vollständiger Repository-Clone und keine
erneute Datenschutzprüfung. Paket-, Lock-, Compiler-, Formatter-, Lint- und
Build-Konfigurationen wurden nicht verändert.

Prettier 3.8.3 fand genau 169 Dateien. Vor dem Schreiben der Änderungen wurde
für jede Datei ein separater Vorher-/Nachher-Vergleich ausgeführt:

| Bereich | Vergleich | Ergebnis |
| --- | --- | --- |
| 158 TS/TSX-Dateien | TypeScript 5.9.3, ES2022/ESNext, ReactJSX, Kommentare erhalten; kompiliertes JavaScript mit derselben Prettier-Konfiguration normalisiert | Identische Ausgabe |
| Weitere fünf TS/TSX-Dateien | Strukturvergleich desselben kompilierten JavaScripts über den gepinnten Babel-Parser | Identische Syntax-/Kommentarstruktur |
| Sechs CSS-Dateien | LightningCSS 1.32.0 mit gleichen Optionen; normalisierte Kommentartexte zusätzlich verglichen | Identische komprimierte CSS-Ausgabe und Kommentare |

Bei den fünf Strukturvergleichen behielt der JavaScript-Drucker unterschiedliche
Zeilenumbrüche innerhalb von Template-Ausdrücken bei. Der AST-Vergleich entfernt
nur Positions-, Raw-Schreibweisen- und Klammermetadaten (`start`, `end`, `loc`,
`range`, `extra`, `tokens`, `errors`). Die tatsächliche Ausdrucksstruktur samt
Operatorrangfolge, Direktiven, Kommentarinhalten/-zuordnung sowie rohen und
interpretierten Template-Textteilen bleibt erhalten. Sechs separate
Kontrollbeispiele bestätigen: Ausdrucks-Zeilenumbrüche dürfen gleich sein;
veränderter Template-Inhalt, rohe Tagged-Template-Zeichen, Operatorgruppierung,
Strict-Direktive oder Compiler-Kommentar werden unterschieden.

Die Vergleiche sind begrenzte Quell-/Compiler-Nachweise, keine formale
Programmäquivalenz oder neue Browser-/Word-Pixelabnahme. Alle 85 Produktdateien
bestehen den jeweiligen Vergleich. Die anfängliche reine Formatstufe der
Ribbon-Testdatei besteht ihn ebenfalls; ihre anschliessende bewusste
Prüfvertragsänderung wird separat ausgewiesen.

## Ein Test muss Verhalten statt Zeilenumbruch prüfen

Der bestehende Ribbon-Test verlangte die exakte einzeilige Zeichenfolge
`custom.y !== undefined && custom.follows === undefined`. Prettier bricht dieselbe
Bedingung über mehrere Zeilen um. Der unveränderte Produktadapter verhält sich
weiterhin korrekt; die Textsuche scheiterte an der Formatierung.

Diese einzelne Erwartung wurde durch Aufrufe des tatsächlichen
`applyForestFlowCoverDefaults` ersetzt. Sie prüfen normale automatische
Verknüpfung, gespeicherte manuelle Y-Werte **0 und 137**, bewusste explizite
Verknüpfung sowie unveränderte Eingaben/Overrides. Andere bestehende Erwartungen
bleiben erhalten. Es wird kein künstlicher Zeilenumbruch im Produktcode erhalten
und keine Formatter-Regel deaktiviert.

Eine getrennte Gegenkontrolle führt denselben Verhaltensvertrag mit dem alten
unformatierten Adapter und dem formatierten Adapter aus: beide bestehen. Eine
isolierte Kopie mit ausschliesslich entfernter manueller Schutzbedingung scheitert
am erhaltenen Link `name` statt `null`. Der neue Vertrag erkennt damit einen
relevanten Fehler. Die fehlerhafte Kopie ist kein Produktpatch und bleibt ausserhalb
Git. Die Zahl der Tests bleibt 1412; die vorhandene Prüfung hat mehr Erwartungen.

## Abschliessende Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Projektweites `format:check` | **PASS, keine übrigen Formatwarnungen** |
| Vollständige Unit-Suite | **1412 PASS / 0 FAIL**, 275 Dateien, 26956 Erwartungen |
| Vollständiges TypeScript | PASS |
| Vollständiges ESLint nach letzter Testkorrektur | PASS, 0 Fehler / 21 bestehende Warnungen |
| Konfigurierter `vite build` | PASS; vorhandene `inlineDynamicImports`/`codeSplitting`-Warnung bleibt |
| Ribbon-/Reading-Spacing-Fokus | 9 PASS / 0 FAIL, Bestandteil der obigen Suite |
| Tatsächlicher synthetischer DOCX-Replay nach Formatierung | Kontrollquelle und aktueller Brief-Kandidat bytegleich |
| Abschliessende Eingabeintegrität | 1019 Eingaben entsprechen Ausgangskopf plus genau dem beschriebenen 169-Dateien-Umfang |

Die DOCX-Kontrollquelle bleibt SHA-256
`5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0`, der
Brief-Kandidat bleibt `b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b`.
Es gibt für diese bytegleichen Dateien keinen weiteren Office-Render.

Eine bereits veröffentlichte JSON-Fixture wurde anfangs in der lokalen Projektion
nachgeladen; ihr vorheriger Importfehler ist kein Repository-Defekt. Ein weiterer
paralleler Zwischenlauf endete ohne vollständige Suite-Zusammenfassung trotz
gemeldetem Exit 0 und wurde ausdrücklich verworfen. Der anschliessende sequenzielle
Lauf wurde erst mit vollständiger 1412/0-Zusammenfassung, 275 Dateien und Exit 0
angenommen. Es wird keine Ursache dieses unvollständigen Zwischenlaufs behauptet.

## Reproduktion

```sh
bun run format:check
bun run test:unit
bun run typecheck
bun run lint
bun run build
```

Der abschliessende Unit-Lauf verwendet denselben konfigurierten Befehl
`bun test tests/unit` unter Bun 1.3.13. TypeScript, ESLint, Prettier und Vite wurden
mit den vorhandenen gepinnten Abhängigkeiten und Node 24.22.1 gestartet. Kein
Paketinstallations-/Lockfile-Update und kein CI-Dispatch. Ein zusätzlicher
zusammenhängender `check:release`-Aufruf wird nicht behauptet.

[Dateiweise Blob-/Äquivalenznachweise, Kontrollfälle und Log-Digests](docx-next-global-format-cleanup-25okt-evidence.json).

## Word-Abendrunde bleibt gültig

Beide ausgelieferten ZIPs sind unverändert: Fotoprüfpaket SHA-256
`430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509`, Brief-v2-Paket
`3cd2ee59d0e83e6610b14d38a7b65e17a170da9c62e1dcaf79dd28166ce5359a`.
Die [Abendreihenfolge](docx-next-evening-word-review-25okt.md) bleibt aktuell:
Foto-Bedienung/Speichern, separate Brief-Abnahme, Referenzumbruch aus derselben PDF.
Die dort genannten 169 Formataltdateien sind mit dieser Fortsetzung erledigt.

Word-, Schrift-/Familien-, Bearbeitungs- und relevante Speicheranforderungen werden
durch die technische Bereinigung nicht geschlossen. Allgemeine Sidebar-Freigabe
weiterhin NO-GO, normaler Export unverändert. Keine Änderung an bestehenden
Akzeptanzlesern, Foto-/Paket-Pins oder historischen Gates. Kein Merge, Deployment
oder Eingriff in dev/main/render, getrennte Datenschutz-Audits oder Automationen.
Rohlogs, Vergleichskopien und erzeugte Build-/DOCX-Dateien bleiben ausserhalb Git.
