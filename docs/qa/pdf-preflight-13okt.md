# Package 35 – automatischer PDF-Preflight

**Abnahme läuft.** Die abschliessende A/B/C-Einstufung, der geprüfte Code-SHA und CI-Belege werden nach dem vollständigen Lauf eingetragen. Kein Merge und kein gezieltes Deployment.

## Basis und Schutz der Branches

- Autoritative, frisch gefetchte Basis: `dev` **`1f4696ee520724466457dacbecc19fffe34ff1ff`**.
- Neuer Arbeitsbranch: `fix/pdf-preflight-13okt`; vorher kein veröffentlichter Branch dieses Namens.
- Ausgangs-`main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`.
- Ausgangs-`render`: `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`.
- Basis-CI: 25 erfolgreiche Checks, ein absichtlich nicht ausgeführter Native-Benchmark; [Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/38412622106).
- AGENTS.md und alle drei angeforderten Pagination-Berichte gelesen. F01–F06 sind integriert. Der Paginator und die CV-Fragmentierung wurden nicht ersetzt.

## Tatsächliche Entscheidungskette und Audit

| Station | Bisheriger Eigentümer | Befund / jetzige Verantwortung |
| --- | --- | --- |
| Gespeicherter Editorinhalt, Typography, Ränder, Bilder | jeweilige Route, Dossier-Stores | Keine Schemaänderung; relevante Änderungen invalidieren die Messung. |
| Körperfragmente und Seitenzahl | `LetterDocument` / `letter-pagination.ts` | Wartet auf Ressourcen und reale Probes; nur dieser Paginator weist Seiten zu. |
| Sichtbare A4-Seiten und Chrome | `LetterCanvas`, `DossierHeaderFooterChrome` | Physische Seiten bleiben die Grundlage. UI-Bildgriffe sind kein Druckinhalt. |
| Bisheriger Überlauf | `letterPageOverflows()` | Sichtbare Nachfahren waren besser als aggregate scrollHeight, aber semantische Boxhöhe war noch nicht gleich Glyphenverlust. Verschachteltes `overflow:clip` und weitere Footer-Überlappungen fehlten. |
| Standalone-Menü | `anschreiben.tsx` / Pagination-Callback | Bisher nur boolesches Issue/Ready. Jetzt kanonische gemeinsame Policy inklusive Ressourcen und Inhaltsvollständigkeit. |
| Dossier-Dialog | eigenes Mutation-/Resize-Messen | Doppelte boolesche Briefentscheidung ersetzt durch dieselbe Policy; CV-Readiness und harte CV-Geometrie werden mitgeprüft. Bestehende Versand- und DOCX-Checks bleiben. |
| PDF-Generator | `dossier-pdf.ts` | Bisher einmalige Briefprüfung vor Imports und Raster. Jetzt eigener Guard vor allen Warte-/Rasterphasen, vor jeder Seite und vor dem Download; zusätzlich Prüfung der tatsächlichen Letter-Raster-Clone-Geometrie. |
| PDF-Belege | Browser-QA + PDF.js + Rasterleser | Inhalt/Marker, physische Verteilung und tatsächlich gerenderte Raster werden separat geprüft. Suchtext allein gilt nicht als sichtbarer Drucknachweis. |

Die gemeinsamen Zustände sind `pending`, `pass`, `advisory`, `blocked`. Ein harter Fehler hat Vorrang vor noch offenen Ressourcen. PENDING wird nie als PASS ausgegeben. CV-Layout-Hinweise bleiben redaktionelle Hinweise; echte Glyphen-/Fotoverluste werden unabhängig von diesen Hinweisen im Generator gesperrt.

## Reproduktionen und generische Korrekturen

Die drei ursprünglichen Assertions schlagen auf einem separaten, unveränderten Worktree der tatsächlichen Dev-Basis fehl. [Fixture-Hashes und Vorher/Nachher-Messungen](pdf-preflight-13okt-evidence/reproductions.json) enthalten die synthetischen gespeicherten Eingaben; der SHA-256 der Basis-Fixture ist `9106e8d80551e8f914d6bf6ac7efd4730f68d216563b9343077bc5a53f3b36f0`.

| Fall | Vorher | Korrektur / Klassifikation |
| --- | --- | --- |
| Leere Verlängerung der letzten semantischen Textbox | BLOCKED trotz passender Glyphen. Boxende 1269,422 px, Glyphenende 708,047 px, Textlayer 975,609 px; die leere Box überschreitet den Layer um 293,813 px ≈ 77,7 mm. | Tatsächliche Range-/Canvas-Ink-Grenzen und Clip-Ahnen statt leerer Boxhöhe. PASS; vollständiges Produktions-PDF wird zusätzlich geprüft. |
| Verschachtelter Absatz mit `overflow:clip` | Falsches PASS; effektive Clip-Höhe 21,688 px ≈ 5,74 mm, mehrere Textzeilen bleiben dahinter. | Glyphen gegen jeden echten Clip-Ahnen prüfen, ausdrücklich inklusive `clip`. BLOCKED. |
| Zusätzlicher Footer über dem Körper | Falsches PASS; der alte Selektor prüfte nur den zuerst gefundenen Footer. | Sämtliche Chrome-Flächen und tatsächliche Textüberlappung prüfen. BLOCKED. |
| Nachladende UI-Schriften während Dossier-Erzeugung | Eine zu pauschale Kandidatenprüfung mit globalem `document.fonts.status` blockierte einen bereits passenden Drucksatz. | Nur tatsächlich verwendete Druckschriften/Zeichen prüfen. Reale ausstehende/fehlgeschlagene Druckschriften bleiben PENDING/BLOCKED. |
| Safe kompletter Mess-Fallback | Nach Leeren der alten Seitenmessungen konnte ein unveränderter Fallback auf weitere, nie ausgelöste Canvas-Callbacks warten. | Fertig gemessene, bereits montierte physische Seiten einmal explizit nachmessen. Keine zweite Pagination. |
| Kontaktkopf/Details-Footer und dekorative Vorlagen-CSS | Der Rastertest fand einen unsichtbaren Beilagen-Footer, obwohl dessen Ghost-Text vollständig war. Ein 32-mm-Kontaktkasten mit 14-pt-Schrift konnte weisse Zeilen über dem Ende eines 22-mm-Motivs haben. | Generische inhaltstragende Letter-Chrome-Regel: bereits aufgelöste Benutzerflächen/-farben gehören zu den gemessenen Kontakt- und Details-Footer-Boxen. Keine Vorlagen-ID-Sonderbehandlung, kein Shrink. |

Die vorhandenen 12-pt/24-mm-F06-Fixtures sind bereits auf Dev korrekt. Ihre tatsächliche Seitenzahl wird beibehalten; kein spekulativer weiterer Margin-Fix. Bilder bleiben gesondert geprüft: freie Bilder dürfen in den A4-Randbereich, Flow-Bilder müssen im Textlayer liegen; verschachtelte Bild-Clips und Überlappung mit Text/Chrome bleiben hart.

## Override-Vertrag und UX

- Nur **`measurement-failed`** eines bereits abgeschlossenen Paginators kann ADVISORY werden, wenn der vollständig gerenderte Fallback gemessen, inhaltlich vollständig und physisch sicher ist.
- Ausstehende Fonts/Bilder/Pagination, fehlender Text/Bilder, ungültige A4-/Seitenstruktur, Text-/Bild-Clipping, starke Überlappungen, überhohe unteilbare Blöcke/Bilder und unbekannte Algorithmusfehler erhalten keinen Override.
- Die normale PDF-Aktion bleibt optisch primär. Bei ADVISORY ist sie gesperrt; ein zusätzlicher ausdrücklich beschrifteter Knopf «PDF trotzdem herunterladen» bestätigt genau diesen Versuch. PASS zeigt keinen solchen Knopf.
- Die Bestätigung ist ein nicht serialisierbares, in einer WeakMap geprüftes Token: exakte Root-Identität, Dokumentart, DOM, gemessene Geometrie und berechnete relevante Stile. Keine gespeicherte boolesche Ausnahme. Verbrauch beim Exportbeginn; Replay, neuer Inhalt, Ränder, Schrift, Bildzustand, Root-Tausch oder Geometrieänderung invalidieren sie.
- Die PDF-Erzeugung prüft unabhängig erneut. Eine spätere harte Sperre gewinnt immer; Änderungen während der Erzeugung verhindern den Download.
- Die UI beobachtet kanonisches DOM, globale Template-/Stylesheet-Änderungen, Ressourcenereignisse und Größenänderungen. Fehlermeldungen nennen Dokument/Seite und die sinnvolle nächste Handlung.

## Validierung

Lokale fokussierte Läufe prüfen harte Sperren, direkte API-Aufrufe, normale UI-Aktionen, sichere Bilder, tatsächliche verzögerte Fonts/Bilder, Replay/Invalidierung, beide Override-Pfade und einen Eingriff während echter html2canvas-Erzeugung. Fehlversuche der Entwicklung bleiben dokumentiert; kein automatischer Retry oder Skip.

Der neue dauerhafte Workflow `Automatic PDF preflight acceptance` läuft auf `fix/pdf-preflight-*` und relevanten PRs gegen Dev. Er benutzt die vorhandene 39er-Registry und die bestehende komplette Pagination-Integrationssuite, Produktregressionen, lange Gesamtdossiers und die 39 automatischen Wortsuche-PDFs. Keine obsolete datierte Dev-Trigger-Erweiterung. Typecheck, QA-Typecheck, 1’118 Units, Lint, Formatting und Produktionsbuild sind enthalten.

Die Rasterprüfung liest tatsächliche Produktions-PDFs mit PyMuPDF und prüft kontrastierte Farbe innerhalb der im kanonischen Browser gemessenen Markerrechtecke. Das ist ein unabhängiger sichtbarer Ink-Smoke-Test; kein OCR-Nachweis oder vollständiger Pixelvergleich. Geometrie, vollständige Inhaltssegmente, Suchtext und physische Markerreihenfolge besitzen eigene strengere Assertions.

## Grenzen, Entwicklungsbefunde und Empfehlung

Native Chromium bleibt im normalen Menü verborgen; automatische html2canvas/jsPDF-PDFs und die vorhandene unsichtbare Textebene bleiben erhalten. DOCX-Renderer/Schema und CV-Paginator sind unverändert. Eine isolierte Legacy-API-A4-Seite bleibt unterstützt; echte Produktions-Dokumente verlangen die kanonische Struktur und vollständige Seitenverträge.

Zwischenläufe enthielten einen Readiness-/Source-Identity-Loop, einen korrigierten SSR-Null-Snapshot, einen zunächst nicht installierten adversarialen Init-Stil (documentElement war noch null), einen veralteten UI-Hinweis bei Head-CSS-Mutation sowie eine falsche Testannahme, dass wiederholte Kopfmarken nur einmal im Gesamtdokument vorkommen. Diese wurden behoben, nicht durch Toleranzen, Skips oder Snapshots versteckt. Der Sender wird jetzt ausdrücklich einmal je physischer Seite geprüft; bestehende einmalige Body-Marker bleiben unverändert streng.

UNVERIFIED bleiben beliebige Drittanbieter-CSS, alle denkbaren Farbkombinationen/Schriften, Firefox/Safari, vollständiges OCR/Tagged-PDF/Screenreader-Verhalten und Native/Word-Visual-Fidelity. Authored colours are preserved; no general contrast redesign is claimed.

Die endgültige Produkt- und Merge-Empfehlung folgt nach CI und der vollständigen Matrix.
