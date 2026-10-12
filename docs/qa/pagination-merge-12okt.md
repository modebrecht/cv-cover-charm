# Pagination-Merge: PDF-Textprüfungen der regulären CI

PR #174 wurde mit ausdrücklicher Merge-Freigabe am 12.10.2026 nach `dev` übernommen: `63772eec67ac890378561b97bd2fa58c8579e8f3`. Der Mergebaum `38113013fc4cf6eb73876a1941a0a0e9711fb150` entspricht exakt dem gemeinsam geprüften Kandidaten. Die ursprüngliche Integrations-CI bleibt SUCCESS mit 250 Browser- und 1’111 Unit-Tests.

Die anschliessende [reguläre Dossier-CI 38261801908](https://github.com/modebrecht/cv-cover-charm/actions/runs/38261801908) meldet im Job `114854281167` **68 PASS / 2 FAIL**. Alle sieben anderen Browsergruppen bestehen. Die beiden alten Tests in `tests/e2e/dossier-regression.spec.ts` suchen vollständige Sätze direkt in PDF-Rohbytes. Der korrigierte unsichtbare Brief-Textlayer schreibt gemessene Wörter als separate PDF-Textobjekte. Beispielsweise ist die Anrede vorhanden, wird aber als `(Guten) Tj`, `(Tag) Tj`, `(Herr) Tj`, `(Weber) Tj` serialisiert. Eine Rohbyte-Suche prüft dieses Speicherformat, nicht den tatsächlich auslesbaren Satz. Die betroffenen Altprüfungen waren nicht Teil der fokussierten 250er-Integrationssuite.

## Testkorrektur

Branch `qa/pdf-text-extraction-12okt`, frisch vom gefetchten Merge-SHA erstellt. Kein Produktionscode, Renderer, PDF-Export, Schema, Template oder Benutzercontrol wird geändert.

Die beiden bestehenden Tests lesen nun den heruntergeladenen Produktions-PDF mit der bereits vorhandenen Abhängigkeit `pdfjs-dist`. Die ursprünglichen vollständigen Betreff-/Anredesätze bleiben Assertions. Zusätzlich werden der vollständige Briefkörper und Gruss, die logische Betreff → Anrede → Körper → Gruss → Unterschrift-Reihenfolge sowie die physische Seitenzahl geprüft. Standalone verlangt genau eine Seite; das Gesamtdossier verlangt die Anzahl des echten kanonischen DOMs und den Brief auf der physischen zweiten Seite. PDF-Dateien und extrahierte Seitentexte werden als Testattachments gespeichert. Keine gelockerten Toleranzen, Skips, Retries oder aktualisierten Snapshots.

Der neue opt-in Playwright-Config führt genau diese zwei bestehenden Fälle aus und verwendet den vorhandenen Produktionsserver, keine nachgebildete Pagination. Die reguläre Gesamtdossier-Suite führt sie weiterhin unverändert als Bestandteil ihrer 70 Fälle aus.

## Lokale Validierung

**2 PASS** in 19.2 Sekunden: echter einseitiger Brief und echtes dreiseitiges Gesamtdossier. [Kompakte Resultate](pagination-merge-12okt-evidence/focused-results.json) enthalten tatsächliche PDF-/Attachment-Hashes, vollständige ausgelesene Seitentexte und die sechs unveränderten Produktionsblob-SHAs.

Anwendungs-/QA-Typecheck, 1’111 Units, Lint (21 bestehende Warnungen), Release-Formatierung, geänderte Dateien und Produktionsbuild: **PASS**. Die erste lokale Browserausführung konnte nach Workspace-Wartung mangels Browserbinary nicht starten; nach Installation desselben gepinnten Chromium 1187 wurden beide Fälle ausgeführt und bestanden. Ein zusätzlich versuchter einzelner Komplett-Typecheck dieses alten E2E-Files meldet den bestehenden `TS2353` für eine `pastell`-Fixture. Derselbe Fehler wurde auf der unveränderten Baseline bestätigt; die regulären Typechecks bestehen. Dieser unabhängige Altbefund wird nicht als neuer Fehler ausgegeben oder verborgen.

Die automatisch von Vite geänderte Reihenfolge in `src/routeTree.gen.ts` wird verworfen. Der geänderte Sourceumfang bleibt auf Test und opt-in Config begrenzt. Die rote ursprüngliche CI wird nicht gelöscht oder erneut gestartet. Nach der Testkorrektur wird die reguläre `dev`-CI erneut geprüft; ihr abschliessender Status und Merge-SHA werden im Folge-PR und Abschlussbericht referenziert.
