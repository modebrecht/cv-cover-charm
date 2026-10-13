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
| Unveränderte gespeicherte Dokumente bei Fenster-Fokus | Die Startseite ersetzte identische Dokumentmodelle. Der finale Guard verweigerte deshalb einen plötzlich wieder ausstehenden Umbruch. | Identische gespeicherte Modelle behalten ihre Identität. Reale Änderungen werden weiterhin übernommen und lösen neue Messungen aus. Zuvor gescheiterte Gesamtdossier-Fälle erzeugen danach tatsächliche PDFs. |
| Titelblatt im ersten gemeinsamen Guard | Drei gezielte Tests des ersten Kandidaten ergaben fälschlich ADVISORY trotz Name oder Foto ausserhalb A4 bzw. Foto über dem Namen. Das Foto war vollständig geladen. | Glyphenprüfung auch auf dem Titelblatt; Fotos/Bilder gegen ihre druckbaren Rahmen statt absichtlich gezoomte Quellbilder prüfen. Harte Foto-/Textüberlappung bleibt gesperrt. BLOCKED ohne Override. [Unveränderter Vorher-Worktree und tatsächliche Geometrie](pdf-preflight-13okt-evidence/cover-policy.json). |
| Alter langer Sidebar-Paritätsfall | Das freie Foto wird beim Spiegeln von x=150 auf x=32 mm verschoben. Sein Rahmen y=24–52 mm überdeckt die Identität im bei y=34 mm beginnenden Hauptbereich. Dies ist ein echter unsicherer Fall. | Produktionssperre bleibt unverändert. Der ursprüngliche gespeicherte Fall besitzt jetzt einen ausdrücklichen UI-/API-Negativtest. Der positive lange Paritätsfall verwendet nur in seiner QA-Fixture y=4 mm (Rahmen endet vor dem Haupttext); keine automatische Änderung von Benutzerdaten, Schrift oder CV-Pagination. |
| Alter Empfänger-Negativtest | Eine feste Verschiebung um 900 px garantierte im tatsächlich passenden Satz keinen Glyphenverlust. Eine spätere DOM-Neumontage konnte zusätzlich einmalige inline-Stiländerungen verwerfen. | Persistenter adversarialer Teststil von 1200 px; vor der BLOCKED-Assertion wird ausdrücklich gemessen, dass echte Textgrenzen jenseits der A4-Seite liegen. Keine gelockerte Produktionstoleranz. |

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

Ein eigener Lauf auf dem passenden fünfseitigen Sidebar-CV zeigte 4’429 `getComputedStyle`-Aufrufe für einen vollständigen Dossier-Preflight. Ein nur für die Dauer dieser synchronen Prüfung gültiger Stil-/Box-Cache reduziert dies auf 685; spätere Prüfungen lesen erneut frisch. Die einzelnen Wallclock-Messungen (3,38 s und 3,65 s unter unterschiedlichen parallelen Lasten) belegen ausdrücklich noch keine feste Zeitverbesserung. Der Beobachter filtert nun zusätzlich reine UI- und html2canvas-Frame-Mutationen; Export-DOM, globale Styles, geänderte Vorfahren, Fonts/Bilder und geladene Stylesheets bleiben erfasst. Die abschliessende Exportprüfung wird immer ausgeführt. Die Budgetgrenze für den gesamten CI-Job beträgt 60 Minuten wegen der zusätzlichen 30 Sicherheitstests und vollständigen Rasterprüfung; keine individuelle Testfrist oder Geometrietoleranz wurde erhöht.

Erster veröffentlichter Kandidat: `cdd11363352e90a172ad94b2e6c9dfbb60c4c054`. Lokal: 1’118 Units und 26 Browser-Sicherheitstests bestanden. [Erster CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38430366179): Units, Types, Lint, Formatting und Build bestanden; 25 von 26 Browser-Sicherheitstests bestanden. Der Bildlade-Test überschritt beim wiederholten kompletten Preflight-Poll die 5-s-Frist; der Artefakt-Snapshot allein beweist keinen Produktionsdefekt. Die vollständige Matrix wurde nach diesem Fehler nicht gestartet. Die Fehler-Fixture wird jetzt mit einem dauerhaft defekten gespeicherten Bild statt nachträglicher `src`-Mutation erzeugt; ein separater, günstiger Ressourcen-Poll belegt `complete=true`, `naturalWidth=0`, bevor die tatsächliche Policy und Export-API geprüft werden. Der korrigierte fokussierte Test besteht lokal (36,9 s), ohne Retry, Skip oder gelockerte Geometrie. [Fehlerartefakt](https://github.com/modebrecht/cv-cover-charm/actions/runs/38430366179/artifacts/11831471079), ZIP-SHA-256 `a4837dea86ce6245f94b7f9104fe44ed766a99ca2abad5e99e1a995f44f31c76`.

Vercels Git-Integration erzeugte beim Push automatisch eine erfolgreiche [Preview](https://vercel.com/modebrechts-projects/cv-cover-charm/2jyK7GQ8SPx1zneUjotf8bUpmdjS). Kein manuell ausgelöstes Deployment und keine Promotion.

[Zweiter CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38433029167), Code `79180bacb8a6934cdad8c366732c3ff3644f5082`: 1’118 Units und 26 Sicherheitstests bestanden; 20 Produktfälle bestanden, 11 scheiterten. Neun betrafen unveränderte Dokumente nach Fenster-Fokus, einer das tatsächlich überlagernde freie Foto, einer den nicht zuverlässig gefährlichen Empfänger-Test. Die vollständige Matrix wurde deshalb noch nicht ausgeführt. [Dauerhaftes Fehlermanifest](pdf-preflight-13okt-evidence/ci-initial-failures.json) bewahrt Counts, Jobs und Artefakthash.

Die Workspace-Bereinigung entfernte zwischenzeitlich den lokalen Checkout. Er wurde aus exakt diesem veröffentlichten Branch wiederhergestellt; nicht gepushte Korrekturen wurden aus den festgehaltenen Diffs rekonstruiert und erneut geprüft. Ein zwischenzeitlicher lokaler Gegenbeleg traf eine laufende HMR-Änderung und wird nicht als stabiler Vorher-/Nachher-Lauf gewertet. Die drei belastbaren Titelblatt-Gegenbelege stammen aus einem eigenen unveränderten Worktree. Der lange Sidebar-Export bestand einzeln innerhalb der bestehenden Fristen (2,7 min); ein gleichzeitig mit weiteren Browser-Suiten laufender Entwicklungsversuch hatte einen Download-Timeout. Dieser Fehlversuch bleibt als solcher dokumentiert.

## Grenzen, Entwicklungsbefunde und Empfehlung

Native Chromium bleibt im normalen Menü verborgen; automatische html2canvas/jsPDF-PDFs und die vorhandene unsichtbare Textebene bleiben erhalten. DOCX-Renderer/Schema und CV-Paginator sind unverändert. Eine isolierte Legacy-API-A4-Seite bleibt unterstützt; echte Produktions-Dokumente verlangen die kanonische Struktur und vollständige Seitenverträge.

Zwischenläufe enthielten einen Readiness-/Source-Identity-Loop, einen korrigierten SSR-Null-Snapshot, einen zunächst nicht installierten adversarialen Init-Stil (documentElement war noch null), einen veralteten UI-Hinweis bei Head-CSS-Mutation sowie eine falsche Testannahme, dass wiederholte Kopfmarken nur einmal im Gesamtdokument vorkommen. Diese wurden behoben, nicht durch Toleranzen, Skips oder Snapshots versteckt. Der Sender wird jetzt ausdrücklich einmal je physischer Seite geprüft; bestehende einmalige Body-Marker bleiben unverändert streng.

UNVERIFIED bleiben beliebige Drittanbieter-CSS, alle denkbaren Farbkombinationen/Schriften, Firefox/Safari, vollständiges OCR/Tagged-PDF/Screenreader-Verhalten und Native/Word-Visual-Fidelity. Authored colours are preserved; no general contrast redesign is claimed.

Die endgültige Produkt- und Merge-Empfehlung folgt nach CI und der vollständigen Matrix.
