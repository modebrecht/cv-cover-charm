# DOCX Next — Produktionsbuild und Release-Prüfblocker

Stand: 25. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Ausgangskopf: `7b4d7a444551d05eca9f8e1db71a17fe8c3a3153`.

## Ergebnis

Der echte Produktionsbuild besteht mit unveränderter Repository-Konfiguration. Die vollständige ESLint-Prüfung und der explizite Release-Formatcheck bestehen nach vier kleinen Korrekturen ebenfalls. Der abschliessende vollständige Typecheck besteht.

Diese Runde ändert keine Exportfunktion, Fotoverankerung, Sidebar-Geometrie oder Akzeptanzbedingung. Die tatsächliche Word-Fotobedienung, die Word-Abnahme der neuen Brief-Empfängerkomposition und der Referenz-Funktionsumbruch bleiben offen. Keine allgemeine Sidebar-Freigabe.

## Was gefunden und geändert wurde

Die vollständige Lint-Prüfung fand vier Fehler, die in den vorherigen auf aktive Dateien begrenzten Lint-Läufen nicht enthalten waren:

| Datei | Ausgangsbefund | Korrektur |
| --- | --- | --- |
| `scripts/qa-cv-document-scale-22okt.ts` | Drei verbotene `any`-Annotationen | Baseline als Buffer/Proof-Paar und die tatsächlich verwendeten Dialog-/Route-Methoden strukturell typisiert |
| `scripts/qa-sidebar-page-surface-22okt.ts` | Ein `any` für die ZIP-Ausgaben | Schlüssel `before`/`after` und tatsächlicher Rückgabetyp von `readZipEntries` |
| `package.json` | Release-Formatfehler | Überzählige abschliessende Leerzeile entfernt; geparster Inhalt identisch |
| `src/components/dossier/DossierExportDialog.tsx` | Release-Formatfehler | Bestehende Ausdrücke mit der Repository-Prettier-Konfiguration formatiert |

Keine ESLint-Regel wurde deaktiviert. Keine neue Abhängigkeit, kein Lockfile und kein Skriptbefehl wurden verändert. Die beiden QA-Programme wurden nicht erneut mit alten Benutzerprojekten oder privaten Fotos ausgeführt.

Für alle drei TS/TSX-Dateien ist das transpilierte JavaScript nach kanonischer Formatierung identisch. Die Normalisierung entfernt auch redundante Klammern, welche der TypeScript-Drucker sonst als Textunterschied stehen lässt. `package.json` ist als geparstes Objekt exakt gleich. Der abschliessende Produktionsbuild und Typecheck wurden nach diesen Änderungen tatsächlich ausgeführt.

## Prüfungen

| Prüfung | Ergebnis | Grenze |
| --- | --- | --- |
| `bun run build` | PASS, Exit 0 | Echter Client-/SSR-/Nitro-Build; kein Browser- oder Word-Bedienungstest |
| `bun run typecheck` | PASS, Exit 0 | Tatsächlicher vollständiger Repository-Typecheck |
| `bun run lint` | PASS, 0 Fehler / 21 Warnungen | Vorher 4 Fehler / dieselben 21 Warnungen |
| `bun run format:check:release` | PASS, alle 18 angegebenen Dateien | Vorher zwei Formatfehler |
| Prettier für die vier geänderten Dateien | PASS | Begrenzte Änderungsprüfung |
| `bun run format:check` | FAIL, 169 andere Dateien | Weiterhin sichtbare projektweite Formataltlasten; nicht in dieser Runde bereinigt |
| Gesamte Unit-Suite | Vorheriger Nachweis: 1412 PASS / 0 FAIL bei `7b4d7a4` | Nicht erneut ausgeführt oder als neuer Lauf gezählt; keine Laufzeitlogik verändert |

Der Build verwendet den unveränderten konfigurierten Nitro-Cloudflare-Zieltyp. Er meldet eine Warnung, dass `inlineDynamicImports` bei gesetztem `codeSplitting` ignoriert wird. Diese Runde ändert keine Bundler-Konfiguration. Es wurde kein Preview-Server gestartet und keine Bereitstellung ausgelöst.

Die vollständige Prüfung beruht auf aus dem gepinnten Remote-Baum rekonstruierten Eingaben, nicht auf einer behaupteten lokalen Git-Arbeitskopie. Vor dem ersten Build wurden 445 Build-Eingaben geprüft. Nach Ergänzung aller 76 Repository-JS-/TS-Skripte wurden sämtliche 977 für Build/Lint erfassten Eingaben über Byteanzahl und tatsächliche Git-Blob-Hashes kontrolliert; nach den Änderungen stimmen sie mit dem Remote-Ausgangspunkt plus genau den vier beschriebenen Änderungen überein. Keine unerwarteten Quelländerungen. Alle sechs öffentlichen Assets, darunter die vier Cabin-Schriften, sind auch im erzeugten öffentlichen Build bytegleich zur Quelle.

Einzelbefunde, geänderte Blob-Hashes und Log-Digests stehen im [maschinellen Nachweis](docx-next-build-and-release-checks-25okt-evidence.json). Die bereits geschlossene Unit-Ursache ist im [vorherigen Bericht](docx-next-existing-check-fixes-25okt.md) dokumentiert. Die einzelnen Komponenten des Release-Checks wurden getrennt geprüft; ein neuer zusammenhängender `check:release`-Lauf wird nicht behauptet.

## Was als Nächstes zählt

1. Den vorbereiteten Foto-Kandidaten anhand tatsächlicher Word-Bedienung beurteilen: unverändertes Speichern/Wiederöffnen, Bewegen/Umfluss, Crop-Reset und Ersetzen. Sein Bild ist weiterhin inline; normale Bildbedienung ist noch nicht bewiesen.
2. Die neuere Brief-Empfänger-Mindesthöhe separat in Word abnehmen. Sie ist nicht im bisherigen Fotoprüfpaket enthalten.
3. Beim Referenz-Funktionsumbruch den gemeinsamen Schrift-/Zeilenumbruchvertrag klären. Die elf früheren Breiten-/Schrift-Gegenproben nicht mit einem neuen Ausgleichsoffset fortsetzen.
4. Erst nach relevanter Word-Bild-/Bearbeitungs-/Speicherevidenz den nächsten Produktfix oder eine bewusste Kompositionsänderung wählen.

Das bestehende Fotoprüfpaket und alle erzeugten DOCX/PDF bleiben unverändert. Keine neue Zwischen-Testaufforderung, keine breite 22er-Matrix, kein Office-Engine-Experiment, kein Merge und kein Produktionsschalter. Die historischen exakten Gates bleiben sichtbar; ein grüner Build ersetzt keine Word-Abnahme.
