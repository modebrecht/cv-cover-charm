# Package 35 – automatischer PDF-Preflight

**B — PARTIAL. Keine Merge-Freigabe.** Die reproduzierten Preflight-Fehlklassifikationen sind korrigiert, 1’118 Units und 288 Browsertests bestehen. Die unabhängige strikte Rasterabnahme scheitert weiterhin an vorhandenen Kontrast- und CV-Clone-Abweichungen. Deshalb ist Package 35 / Masterliste Item 35 ausdrücklich **nicht vollständig abgenommen**. Kein Merge, kein gezieltes Deployment, keine Promotion.

Geprüfter letzter **Code-SHA:** `b81289d53171b4b4b3b756bfbd9b049ce83d9ee1`. Der anschliessende Abschlusscommit ergänzt ausschliesslich diesen Bericht und seine Belege; seine exakte Remote-SHA steht in der Abschlussmeldung und Git-Historie. [Vollständiger CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38504447640), [maschinenlesbare Abnahme](pdf-preflight-13okt-evidence/acceptance-summary.json), [unverändert strikte Rasterfehler](pdf-preflight-13okt-evidence/raster-failures.json).

## Abschliessendes Ergebnis

| Prüfung                                                   | Ergebnis am geprüften Code-SHA                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Units                                                     | 1’118 bestanden, 0 fehlgeschlagen; 243 Dateien, 22’249 Assertions                                               |
| TypeScript App und QA, Lint, Formatting, Produktionsbuild | Bestanden; Lint 0 Fehler / 21 bestehende Warnungen                                                              |
| Sicherheitsfälle / Produktregressionen                    | 36/36 und 31/31 bestanden                                                                                       |
| Vollständige Pagination-Integration                       | 208/208 bestanden, zwei Shards zu je 104                                                                        |
| Lange Combined-Dossiers                                   | 11/11 Browserfälle bestanden, 82 physische PDF-Seiten, maximal 12 pro Dossier                                   |
| Automatische Wortsuche                                    | 2/2 Tests bestanden: 39 reale Standalone-Letter-PDFs und Mixed-Inline Combined                                  |
| Browsermatrix 39 Produktionsvorlagen                      | 156/156 Standard-Fixtures bestanden: Letter und CV, jeweils eine/zwei Seiten; 234 echte PDF-Seiten              |
| Logische vollständige Felder, separater Reader            | 287/287 geeignete Audit-Dokumente, 11’386 Feldprüfungen; 0 Fehler                                               |
| Unabhängiger Rasterreader                                 | **FAIL**: 268 PDFs, 565 Seiten, 6’468 Markerrechtecke; 260 PDFs bestehen, 8 PDFs mit 44 fehlerhaften Rechtecken |
| Gesamt-CI                                                 | **7 Jobs erfolgreich, Evidence-Job fehlgeschlagen**; der Workflow ist rot                                       |

Die Raster-Gesamtzahlen stammen aus einer separaten diagnostischen Vollauswertung derselben CI-PDFs mit **unveränderten** Grenzen (Kontrast >=90, mindestens zehn kontrastierte Pixel). Sie sammelt Fehler, damit nach dem ersten CI-Abbruch auch die übrigen PDFs beurteilt werden können. Sie macht den Produktionsreader oder CI nicht grün. Der unmodifizierte CI-Reader bricht beim ersten Fehler `boundary-brief-cv-first-three.pdf`, physische Seite 2, `QAEND008`, ab. Dadurch wurden seine folgenden Feld-/Summary-Kommandos nicht erreicht; diese beiden vorhandenen Reader wurden anschliessend lokal auf den zusammengeführten unveränderten CI-Audits separat ausgeführt. Keine Skips, Snapshots, gelockerten Toleranzen oder verschluckten CI-Fehler.

## Offene Rasterblocker und Baseline-Nachweis

1. **Edel Dark, beide Standard-Letter-Fixtures:** Der Körper ist auf dunklem Papier kaum lesbar. Das echte Einseiten-PDF hat im Salutationsrechteck [26,990;117,908;33,643;3,967] mm nur Kontrast 25 und null Pixel oberhalb der bestehenden Kontrastschwelle. Der Suchtext ist vollständig und die Geometrie passt; beides beweist keine sichtbare Druckqualität. [Tatsächliches Raster](pdf-preflight-13okt-evidence/edel-dark-raster.png). Dieser Kontrastfall wird vom neuen geometrischen Guard weiterhin nicht gesperrt. Eine allgemeine Farb-/Kontrastpolitik wurde nicht spekulativ ergänzt.
2. **CV-Zoom-/Zeilenumbruchabweichung:** Die bereits bestehende `normalizeCssZoomForHtml2Canvas()` verändert im tatsächlichen html2canvas-Clone den Umbruch. `QAEND008` auf Brief-CV-Seite 2 liegt live und vor Normalisierung bei x=125,076 mm, y=101,846 mm, 22,746×5,025 mm; danach bei x=102,605 mm, y=101,843 mm, 22,632×5,000 mm. Der Marker ist sichtbar, aber um 22,471 mm verschoben. Das ursprüngliche Rechteck enthält nur sieben statt mindestens zehn kontrastierter Pixel. [Produktions-Clone-Messung](pdf-preflight-13okt-evidence/clone-layout.json), [Rasterausschnitt x=45–160 / y=90–112 mm](pdf-preflight-13okt-evidence/brief-cv-raster.png). Das ist kein belegter Glyphenverlust und keine Gelegenheit, den Reader grosszügiger zu machen; Web-/Canonical-/Raster-Positionsgleichheit ist hier nicht nachgewiesen.

Die beiden repräsentativen Fälle wurden zusätzlich **auf einem separaten unveränderten Worktree der frisch gefetchten Dev-Basis `1f4696ee...` über die normalen automatischen Downloadaktionen** erzeugt. Dev-Edel-Dark hat dieselben Kontrastwerte 25/0; Dev-Brief-CV denselben Fehler 518/7 im Markerrechteck. Alle drei tatsächlich gerenderten CV-Seiten sind bei 1× Rasterauflösung bytegleich zu den CI-Kandidatenseiten. Dev- und Kandidaten-SHAs, PDF-Hashes, Raster-Hashes und Messungen stehen in `unchangedDevRendererProof` des Abnahmemanifests. Beim Letter sind die ganzen Raster wegen der gültigen Chrome-Korrekturen nicht bytegleich; der dunkle Body-Fehler ist dennoch vor und nach dem Paket direkt gemessen. `html2canvas-export.ts`, `CvCanvasBase.tsx` und `flow-pagination.ts` sind gegenüber Dev unverändert. Diese Befunde sind bestehende Renderer-/Designprobleme, keine eingeführten Pagination-Regressionsbelege.

Alle acht betroffenen PDFs: `boundary-brief-cv-first-three`, `boundary-brief-cv-last-two`, Combined `brief`, `matrix-edelDark-one-letter`, `matrix-edelDark-two-letter`, `matrix-studio-one-cv`, `matrix-studio-two-cv`, `variant-gallery-timeline-cv`. Für Studio/Gallery sind die strikten Rechteckfehler belegt; ohne weitergehenden Abgleich wird kein vollständiger Inhaltsverlust oder eine abschliessende gleiche Ursache behauptet. Die repräsentativen Brief- und Studio-Raster zeigen die betroffenen Marker sichtbar. Der Combined-Brief besitzt dieselbe CV-Abweichung; deshalb bestehen dort 11/11 Browserfälle, aber nur 10/11 strikte Rasterdokumente.

## Finale 39er-Matrix

Dies ist die vorhandene autoritative Registry, kein neuer Produktionskatalog. Jede Zeile umfasst genau die bestehenden vier Standard-Fixtures. L1/L2 und CV1/CV2 geben echte PDF-Seitenzahl plus striktes Rasterergebnis an. Alle 156 Browser-/Inhalts-/Seitenverteilungsprüfungen bestehen, alle verwendeten Audits nennen den Code-SHA und `sourceDirty=false`. **37/39 Familien bestehen alle vier Raster-Fixtures; 38/39 Letter-Familien und 38/39 CV-Familien bestehen beide.** Eine vollständige 39/39 sichtbare Exportfreigabe wird nicht behauptet.

| Registry-Vorlage | Letter 1 | Letter 2 | CV 1     | CV 2     |
| ---------------- | -------- | -------- | -------- | -------- |
| aurora           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| blockig          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| brief            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| citrus           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| colorful         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| cove             | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| diagonal         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| edel             | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| edelDark         | 1 / FAIL | 2 / FAIL | 1 / PASS | 2 / PASS |
| edge             | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| forestFlow       | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| freundlich       | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| gallery          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| glow             | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| horizon          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| human            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| klassisch        | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| ledger           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| modern           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| monoLuxe         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| neon             | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| orbit            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| pastell          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| prism            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| ribbon           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| serioes          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| sonne            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| studio           | 1 / PASS | 2 / PASS | 1 / FAIL | 2 / FAIL |
| studio2          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| studio3          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| sunrise          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| terracotta       | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| verlauf          | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| verlauf2         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| verlauf3         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| violetPulse      | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| warm2            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| warm3            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
| welle            | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |

Alle elf Combined-Fälle verwenden das gleiche sichere Produktions-Cover «Brief» und unterschiedliche echte Letter-/CV-Strukturen, einschliesslich linker/rechter Sidebar, langem CV, langem Brief, freien/Flow-Bildern, langen Wörtern und Custom-Rändern. Seitenreihenfolge ist Cover → Letter → CV. Das unveränderte ursprüngliche Ribbon-Cover bleibt ein separater bestätigter harter Negativfall; die Standard-Letter-Ribbon-Fixtures bestehen. Die 39er-Suchprüfung betrifft Standalone-Letter, nicht 39 ungeprüfte Default-Cover-Dossiers.

## Produktentscheidung und verbleibende Grenzen

Der kleine generische Preflight-Fix ist fachlich begründet: Leere Boxfläche sperrt passenden sichtbaren Text nicht mehr; tatsächliches verschachteltes Clipping, zusätzliche Chrome-Überlappungen, fehlende semantische Felder, unsichtbare erforderliche Bilder und echte Cover-/CV-Verluste bleiben gesperrt. Ressourcen und provisorische Pagination bleiben PENDING. Der Generator erzwingt die gemeinsame Entscheidung vor Beginn, vor jeder Seite und vor Download; der Letter-Raster-Clone hat zusätzlich seine echte Geometrieprüfung. Es gibt keine Template-Ausnahme, Schriftverkleinerung, Textkürzung oder zweite Pagination.

Der implementierte Override ist **nur** für den vollständig gerenderten, inhaltlich vollständigen, geometrisch geprüften Standalone-Letter-Fallback mit `measurement-failed` vorhanden. Er ist explizit, genau einem unveränderten Root/Zustand und einem Versuch zugeordnet, wird bei Änderungen ungültig und niemals gespeichert. Bestätigungen können harte Sperren nicht ausschalten. Dossier-Override bleibt absichtlich NO-GO: Ein vollständig unabhängiger Source-Vertrag für alle CV-/Cover-Inhalte ist nicht vorhanden. Die bekannten Kontrast-/Rasterabweichungen zeigen zusätzlich, warum diese Paketfassung keine allgemeine sichere Druckfreigabe oder vollständige A-Abnahme versprechen darf.

**Merge-Empfehlung: derzeit nicht mergen.** Erst die vorhandene generische Zoom-Clone-Parität und eine begründete, allgemein gültige Behandlung der dunklen authored Papier-/Ink-Kombination separat klären, danach die strikte unveränderte Rasterabnahme grün nachweisen. Der echte Ribbon-Cover-Defekt benötigt eine eigene Layoutaufgabe; keine Template-spezifische Preflight-Ausnahme. Die bestätigten Preflight-Korrekturen können auf diesem Review-Branch weiter geprüft werden. Masterliste Item 35 bleibt offen; Klassifikation B bezeichnet die erzielten Teilverbesserungen und den bewusst beschränkten Override, keine erfolgreiche Gesamtfreigabe.

Der Legacy-Standalone-CV-Exporter und isolierte A4-API behalten ihren bisherigen Umfang; sie erhalten keine neue Override-Berechtigung. Beliebige Drittanbieter-CSS/Farbkombinationen, alle denkbaren Fontvarianten, Firefox/Safari, OCR/Tagged PDF und Native-/Word-Fidelity sind nicht vollständig geprüft. Die vorhandene invisible Textebene und DOCX bleiben erhalten; Native Chromium bleibt im normalen Menü verborgen.

Letzte Code-Preview: Vercels Git-Integration erzeugte automatisch eine erfolgreiche [Preview](https://vercel.com/modebrechts-projects/cv-cover-charm/EGX4FWJCQgWDAhhQwnKVXAuTuJ93). Auch der Dokumentationspush kann automatisch eine Preview erzeugen. Es wurde kein Deployment oder Promote-Befehl ausgeführt. Dev/Main/Render wurden nach der Abnahme erneut gefetcht und stimmen exakt mit den nachstehenden Ausgangs-SHAs überein; nur der Arbeitsbranch wird fortgeschrieben.

## Vollständige geänderte Dateien

- `.github/workflows/pdf-preflight.yml`
- `docs/qa/pdf-preflight-13okt-evidence/acceptance-summary.json`
- `docs/qa/pdf-preflight-13okt-evidence/after-footer.png`
- `docs/qa/pdf-preflight-13okt-evidence/before-footer.png`
- `docs/qa/pdf-preflight-13okt-evidence/brief-cv-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/ci-initial-failures.json`
- `docs/qa/pdf-preflight-13okt-evidence/clone-layout.json`
- `docs/qa/pdf-preflight-13okt-evidence/cover-policy.json`
- `docs/qa/pdf-preflight-13okt-evidence/edel-dark-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/raster-failures.json`
- `docs/qa/pdf-preflight-13okt-evidence/reproductions.json`
- `docs/qa/pdf-preflight-13okt-evidence/semantic-source-safety.json`
- `docs/qa/pdf-preflight-13okt.md`
- `scripts/pdf_preflight_raster.py`
- `src/components/dossier/DossierExportDialog.tsx`
- `src/components/dossier/DossierHeaderFooterChrome.tsx`
- `src/components/letter/LetterDocument.tsx`
- `src/components/letter/letter-pagination.css`
- `src/components/letter/preflight.ts`
- `src/lib/dossier-pdf.ts`
- `src/lib/pdf-preflight.ts`
- `src/routes/anschreiben.tsx`
- `src/routes/index.tsx`
- `src/routes/lebenslauf.tsx`
- `src/routes/titelblatt.tsx`
- `tests/e2e/cv-combined-parity.spec.ts`
- `tests/e2e/letter-physical-preflight.spec.ts`
- `tests/e2e/pdf-word-boundaries.spec.ts`
- `tests/qa/pagination-2page.qa.ts`
- `tests/qa/pagination-browser.ts`
- `tests/qa/pagination-combined.qa.ts`
- `tests/qa/pdf-preflight-safety.qa.ts`
- `tests/qa/pdf-preflight.qa.ts`
- `tests/qa/playwright.integration.config.ts`
- `tests/qa/playwright.preflight.config.ts`

## Audit- und Entwicklungshistorie

Die folgenden Abschnitte bewahren die ursprüngliche Entscheidungsrekonstruktion, Vorher-/Nachher-Belege und rote Zwischenläufe. Für die abschliessende Einstufung gelten die Ergebnisse oben.

## Basis und Schutz der Branches

- Autoritative, frisch gefetchte Basis: `dev` **`1f4696ee520724466457dacbecc19fffe34ff1ff`**.
- Neuer Arbeitsbranch: `fix/pdf-preflight-13okt`; vorher kein veröffentlichter Branch dieses Namens.
- Ausgangs-`main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`.
- Ausgangs-`render`: `4319c20fb85d3971ac355ae8898cdfef86ee7a8c`.
- Basis-CI: 25 erfolgreiche Checks, ein absichtlich nicht ausgeführter Native-Benchmark; [Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/38412622106).
- AGENTS.md und alle drei angeforderten Pagination-Berichte gelesen. F01–F06 sind integriert. Der Paginator und die CV-Fragmentierung wurden nicht ersetzt.

## Tatsächliche Entscheidungskette und Audit

| Station                                                | Bisheriger Eigentümer                       | Befund / jetzige Verantwortung                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gespeicherter Editorinhalt, Typography, Ränder, Bilder | jeweilige Route, Dossier-Stores             | Keine Schemaänderung; relevante Änderungen invalidieren die Messung.                                                                                                                                               |
| Körperfragmente und Seitenzahl                         | `LetterDocument` / `letter-pagination.ts`   | Wartet auf Ressourcen und reale Probes; nur dieser Paginator weist Seiten zu.                                                                                                                                      |
| Sichtbare A4-Seiten und Chrome                         | `LetterCanvas`, `DossierHeaderFooterChrome` | Physische Seiten bleiben die Grundlage. UI-Bildgriffe sind kein Druckinhalt.                                                                                                                                       |
| Bisheriger Überlauf                                    | `letterPageOverflows()`                     | Sichtbare Nachfahren waren besser als aggregate scrollHeight, aber semantische Boxhöhe war noch nicht gleich Glyphenverlust. Verschachteltes `overflow:clip` und weitere Footer-Überlappungen fehlten.             |
| Standalone-Menü                                        | `anschreiben.tsx` / Pagination-Callback     | Bisher nur boolesches Issue/Ready. Jetzt kanonische gemeinsame Policy inklusive Ressourcen und Inhaltsvollständigkeit.                                                                                             |
| Dossier-Dialog                                         | eigenes Mutation-/Resize-Messen             | Doppelte boolesche Briefentscheidung ersetzt durch dieselbe Policy; CV-Readiness und harte CV-Geometrie werden mitgeprüft. Bestehende Versand- und DOCX-Checks bleiben.                                            |
| PDF-Generator                                          | `dossier-pdf.ts`                            | Bisher einmalige Briefprüfung vor Imports und Raster. Jetzt eigener Guard vor allen Warte-/Rasterphasen, vor jeder Seite und vor dem Download; zusätzlich Prüfung der tatsächlichen Letter-Raster-Clone-Geometrie. |
| PDF-Belege                                             | Browser-QA + PDF.js + Rasterleser           | Inhalt/Marker, physische Verteilung und tatsächlich gerenderte Raster werden separat geprüft. Suchtext allein gilt nicht als sichtbarer Drucknachweis.                                                             |

Die gemeinsamen Zustände sind `pending`, `pass`, `advisory`, `blocked`. Bei abgeschlossener Pagination hat ein harter Fehler Vorrang vor noch offenen Ressourcen; ein noch ausstehender Paginator wird vor der Glyphenprüfung als PENDING gesperrt. PENDING wird nie als PASS ausgegeben. CV-Layout-Hinweise bleiben redaktionelle Hinweise; echte Glyphen-/Fotoverluste werden unabhängig von diesen Hinweisen im Generator gesperrt.

## Reproduktionen und generische Korrekturen

Die drei ursprünglichen Assertions schlagen auf einem separaten, unveränderten Worktree der tatsächlichen Dev-Basis fehl. [Fixture-Hashes und Vorher/Nachher-Messungen](pdf-preflight-13okt-evidence/reproductions.json) enthalten die synthetischen gespeicherten Eingaben; der SHA-256 der Basis-Fixture ist `9106e8d80551e8f914d6bf6ac7efd4730f68d216563b9343077bc5a53f3b36f0`.

| Fall                                                   | Vorher                                                                                                                                                                                                   | Korrektur / Klassifikation                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Leere Verlängerung der letzten semantischen Textbox    | BLOCKED trotz passender Glyphen. Boxende 1269,422 px, Glyphenende 708,047 px, Textlayer 975,609 px; die leere Box überschreitet den Layer um 293,813 px ≈ 77,7 mm.                                       | Tatsächliche Range-/Canvas-Ink-Grenzen und Clip-Ahnen statt leerer Boxhöhe. PASS; vollständiges Produktions-PDF wird zusätzlich geprüft.                                                                                                                                                                                 |
| Verschachtelter Absatz mit `overflow:clip`             | Falsches PASS; effektive Clip-Höhe 21,688 px ≈ 5,74 mm, mehrere Textzeilen bleiben dahinter.                                                                                                             | Glyphen gegen jeden echten Clip-Ahnen prüfen, ausdrücklich inklusive `clip`. BLOCKED.                                                                                                                                                                                                                                    |
| Zusätzlicher Footer über dem Körper                    | Falsches PASS; der alte Selektor prüfte nur den zuerst gefundenen Footer.                                                                                                                                | Sämtliche Chrome-Flächen und tatsächliche Textüberlappung prüfen. BLOCKED.                                                                                                                                                                                                                                               |
| Nachladende UI-Schriften während Dossier-Erzeugung     | Eine zu pauschale Kandidatenprüfung mit globalem `document.fonts.status` blockierte einen bereits passenden Drucksatz.                                                                                   | Nur tatsächlich verwendete Druckschriften/Zeichen prüfen. Reale ausstehende/fehlgeschlagene Druckschriften bleiben PENDING/BLOCKED.                                                                                                                                                                                      |
| Safe kompletter Mess-Fallback                          | Nach Leeren der alten Seitenmessungen konnte ein unveränderter Fallback auf weitere, nie ausgelöste Canvas-Callbacks warten.                                                                             | Fertig gemessene, bereits montierte physische Seiten einmal explizit nachmessen. Keine zweite Pagination.                                                                                                                                                                                                                |
| Kontaktkopf/Details-Footer und dekorative Vorlagen-CSS | Der Rastertest fand einen unsichtbaren Beilagen-Footer, obwohl dessen Ghost-Text vollständig war. Ein 32-mm-Kontaktkasten mit 14-pt-Schrift konnte weisse Zeilen über dem Ende eines 22-mm-Motivs haben. | Generische inhaltstragende Letter-Chrome-Regel: bereits aufgelöste Benutzerflächen/-farben gehören zu den gemessenen Kontakt- und Details-Footer-Boxen. Keine Vorlagen-ID-Sonderbehandlung, kein Shrink.                                                                                                                 |
| Unveränderte gespeicherte Dokumente bei Fenster-Fokus  | Die Startseite ersetzte identische Dokumentmodelle. Der finale Guard verweigerte deshalb einen plötzlich wieder ausstehenden Umbruch.                                                                    | Identische gespeicherte Modelle behalten ihre Identität. Reale Änderungen werden weiterhin übernommen und lösen neue Messungen aus. Zuvor gescheiterte Gesamtdossier-Fälle erzeugen danach tatsächliche PDFs.                                                                                                            |
| Titelblatt im ersten gemeinsamen Guard                 | Drei gezielte Tests des ersten Kandidaten ergaben fälschlich ADVISORY trotz Name oder Foto ausserhalb A4 bzw. Foto über dem Namen. Das Foto war vollständig geladen.                                     | Glyphenprüfung auch auf dem Titelblatt; Fotos/Bilder gegen ihre druckbaren Rahmen statt absichtlich gezoomte Quellbilder prüfen. Harte Foto-/Textüberlappung bleibt gesperrt. BLOCKED ohne Override. [Unveränderter Vorher-Worktree und tatsächliche Geometrie](pdf-preflight-13okt-evidence/cover-policy.json).         |
| Alter langer Sidebar-Paritätsfall                      | Das freie Foto wird beim Spiegeln von x=150 auf x=32 mm verschoben. Sein Rahmen y=24–52 mm überdeckt die Identität im bei y=34 mm beginnenden Hauptbereich. Dies ist ein echter unsicherer Fall.         | Produktionssperre bleibt unverändert. Der ursprüngliche gespeicherte Fall besitzt jetzt einen ausdrücklichen UI-/API-Negativtest. Der positive lange Paritätsfall verwendet nur in seiner QA-Fixture y=4 mm (Rahmen endet vor dem Haupttext); keine automatische Änderung von Benutzerdaten, Schrift oder CV-Pagination. |
| Alter Empfänger-Negativtest                            | Eine feste Verschiebung um 900 px garantierte im tatsächlich passenden Satz keinen Glyphenverlust. Eine spätere DOM-Neumontage konnte zusätzlich einmalige inline-Stiländerungen verwerfen.              | Persistenter adversarialer Teststil von 1200 px; vor der BLOCKED-Assertion wird ausdrücklich gemessen, dass echte Textgrenzen jenseits der A4-Seite liegen. Keine gelockerte Produktionstoleranz.                                                                                                                        |

Die vorhandenen 12-pt/24-mm-F06-Fixtures sind bereits auf Dev korrekt. Ihre tatsächliche Seitenzahl wird beibehalten; kein spekulativer weiterer Margin-Fix. Bilder bleiben gesondert geprüft: freie Bilder dürfen in den A4-Randbereich, Flow-Bilder müssen im Textlayer liegen; verschachtelte Bild-Clips und Überlappung mit Text/Chrome bleiben hart.

## Override-Vertrag und UX

- Nur beim **Standalone-Brief** kann **`measurement-failed`** eines bereits abgeschlossenen Paginators ADVISORY mit Override-Erlaubnis werden, wenn der vollständig gerenderte Fallback gemessen, inhaltlich vollständig und physisch sicher ist.
- Ausstehende Fonts/Bilder/Pagination, fehlender Text/Bilder, ungültige A4-/Seitenstruktur, Text-/Bild-Clipping, starke Überlappungen, überhohe unteilbare Blöcke/Bilder und unbekannte Algorithmusfehler erhalten keinen Override.
- Die normale PDF-Aktion bleibt optisch primär. Bei ADVISORY ist sie gesperrt; ein zusätzlicher ausdrücklich beschrifteter Knopf «PDF trotzdem herunterladen» bestätigt genau diesen Versuch. PASS zeigt keinen solchen Knopf.
- Die Bestätigung ist ein nicht serialisierbares, in einer WeakMap geprüftes Token: exakte Root-Identität, Dokumentart, DOM, gemessene Geometrie und berechnete relevante Stile. Keine gespeicherte boolesche Ausnahme. Verbrauch beim Exportbeginn; Replay, neuer Inhalt, Ränder, Schrift, Bildzustand, Root-Tausch oder Geometrieänderung invalidieren sie.
- Die PDF-Erzeugung prüft unabhängig erneut. Eine spätere harte Sperre gewinnt immer; Änderungen während der Erzeugung verhindern den Download.
- Die UI beobachtet bei geöffneten Downloadaktionen kanonisches DOM, globale Template-/Stylesheet-Änderungen, Ressourcenereignisse und Größenänderungen; ein erneutes Öffnen startet ohne altes Urteil. Fehlermeldungen nennen Dokument/Seite und die sinnvolle nächste Handlung.

## Validierung

Lokale fokussierte Läufe prüfen harte Sperren, direkte API-Aufrufe, normale UI-Aktionen, sichere Bilder, tatsächliche verzögerte Fonts/Bilder, Replay/Invalidierung, Standalone-Override sowie die ausdrückliche Gesamtdossier-Override-Sperre und einen Eingriff während echter html2canvas-Erzeugung. Fehlversuche der Entwicklung bleiben dokumentiert; kein automatischer Retry oder Skip.

Der neue dauerhafte Workflow `Automatic PDF preflight acceptance` läuft auf `fix/pdf-preflight-*` und relevanten PRs gegen Dev. Er benutzt die vorhandene 39er-Registry und die bestehende komplette Pagination-Integrationssuite, Produktregressionen, lange Gesamtdossiers und die 39 automatischen Wortsuche-PDFs. Keine obsolete datierte Dev-Trigger-Erweiterung. Typecheck, QA-Typecheck, 1’118 Units, Lint, Formatting und Produktionsbuild sind enthalten.

Die Rasterprüfung liest tatsächliche Produktions-PDFs mit PyMuPDF und prüft kontrastierte Farbe innerhalb der im kanonischen Browser gemessenen Markerrechtecke. Das ist ein unabhängiger sichtbarer Ink-Smoke-Test; kein OCR-Nachweis oder vollständiger Pixelvergleich. Geometrie, vollständige Inhaltssegmente, Suchtext und physische Markerreihenfolge besitzen eigene strengere Assertions.

Ein eigener Lauf auf dem passenden fünfseitigen Sidebar-CV zeigte 4’429 `getComputedStyle`-Aufrufe für einen vollständigen Dossier-Preflight. Ein nur für die Dauer dieser synchronen Prüfung gültiger Stil-/Box-Cache reduziert dies auf 685; spätere Prüfungen lesen erneut frisch. Die einzelnen Wallclock-Messungen (3,38 s und 3,65 s unter unterschiedlichen parallelen Lasten) belegen ausdrücklich noch keine feste Zeitverbesserung. Der Beobachter filtert nun zusätzlich reine UI- und html2canvas-Frame-Mutationen; Export-DOM, globale Styles, geänderte Vorfahren, Fonts/Bilder und geladene Stylesheets bleiben erfasst. Die abschliessende Exportprüfung wird immer ausgeführt. Der dritte einzelne CI-Job hatte 60 Minuten Budget; der spätere Kandidat verteilt die Suiten und zwei Integrationsshards auf unabhängige Jobs mit anschliessender Evidenzaggregation; keine individuelle Testfrist oder Geometrietoleranz wurde erhöht.

Erster veröffentlichter Kandidat: `cdd11363352e90a172ad94b2e6c9dfbb60c4c054`. Lokal: 1’118 Units und 26 Browser-Sicherheitstests bestanden. [Erster CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38430366179): Units, Types, Lint, Formatting und Build bestanden; 25 von 26 Browser-Sicherheitstests bestanden. Der Bildlade-Test überschritt beim wiederholten kompletten Preflight-Poll die 5-s-Frist; der Artefakt-Snapshot allein beweist keinen Produktionsdefekt. Die vollständige Matrix wurde nach diesem Fehler nicht gestartet. Die Fehler-Fixture wird jetzt mit einem dauerhaft defekten gespeicherten Bild statt nachträglicher `src`-Mutation erzeugt; ein separater, günstiger Ressourcen-Poll belegt `complete=true`, `naturalWidth=0`, bevor die tatsächliche Policy und Export-API geprüft werden. Der korrigierte fokussierte Test besteht lokal (36,9 s), ohne Retry, Skip oder gelockerte Geometrie. [Fehlerartefakt](https://github.com/modebrecht/cv-cover-charm/actions/runs/38430366179/artifacts/11831471079), ZIP-SHA-256 `a4837dea86ce6245f94b7f9104fe44ed766a99ca2abad5e99e1a995f44f31c76`.

Vercels Git-Integration erzeugte beim Push automatisch eine erfolgreiche [Preview](https://vercel.com/modebrechts-projects/cv-cover-charm/2jyK7GQ8SPx1zneUjotf8bUpmdjS). Kein manuell ausgelöstes Deployment und keine Promotion.

[Zweiter CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38433029167), Code `79180bacb8a6934cdad8c366732c3ff3644f5082`: 1’118 Units und 26 Sicherheitstests bestanden; 20 Produktfälle bestanden, 11 scheiterten. Neun betrafen unveränderte Dokumente nach Fenster-Fokus, einer das tatsächlich überlagernde freie Foto, einer den nicht zuverlässig gefährlichen Empfänger-Test. Die vollständige Matrix wurde deshalb noch nicht ausgeführt. [Dauerhaftes Fehlermanifest](pdf-preflight-13okt-evidence/ci-initial-failures.json) bewahrt Counts, Jobs und Artefakthash.

Die Workspace-Bereinigung entfernte zwischenzeitlich den lokalen Checkout. Er wurde aus exakt diesem veröffentlichten Branch wiederhergestellt; nicht gepushte Korrekturen wurden aus den festgehaltenen Diffs rekonstruiert und erneut geprüft. Ein zwischenzeitlicher lokaler Gegenbeleg traf eine laufende HMR-Änderung und wird nicht als stabiler Vorher-/Nachher-Lauf gewertet. Die drei belastbaren Titelblatt-Gegenbelege stammen aus einem eigenen unveränderten Worktree. Der lange Sidebar-Export bestand einzeln innerhalb der bestehenden Fristen (2,7 min); ein gleichzeitig mit weiteren Browser-Suiten laufender Entwicklungsversuch hatte einen Download-Timeout. Dieser Fehlversuch bleibt als solcher dokumentiert.

## Grenzen, Entwicklungsbefunde und Empfehlung

Native Chromium bleibt im normalen Menü verborgen; automatische html2canvas/jsPDF-PDFs und die vorhandene unsichtbare Textebene bleiben erhalten. DOCX-Renderer/Schema und CV-Paginator sind unverändert. Eine isolierte Legacy-API-A4-Seite bleibt unterstützt; echte Produktions-Dokumente verlangen die kanonische Struktur und vollständige Seitenverträge.

Zwischenläufe enthielten einen Readiness-/Source-Identity-Loop, einen korrigierten SSR-Null-Snapshot, einen zunächst nicht installierten adversarialen Init-Stil (documentElement war noch null), einen veralteten UI-Hinweis bei Head-CSS-Mutation sowie eine falsche Testannahme, dass wiederholte Kopfmarken nur einmal im Gesamtdokument vorkommen. Diese wurden behoben, nicht durch Toleranzen, Skips oder Snapshots versteckt. Der Sender wird jetzt ausdrücklich einmal je physischer Seite geprüft; bestehende einmalige Body-Marker bleiben unverändert streng.

UNVERIFIED bleiben beliebige Drittanbieter-CSS, alle denkbaren Farbkombinationen/Schriften, Firefox/Safari, vollständiges OCR/Tagged-PDF/Screenreader-Verhalten und Native/Word-Visual-Fidelity. Authored colours are preserved; no general contrast redesign is claimed.

Die endgültige Produktentscheidung und fehlende Merge-Freigabe stehen am Anfang dieses Berichts.

### Letzte Sicherheitsprüfung und begrenzte Override-Freigabe

Am 14. Oktober wurde auf `78f6a52` eine weitere echte Lücke reproduziert: Nach Entfernen des physisch gerenderten `data-letter-pdf-text="signature"` enthielt das Urteil noch PASS und keine Issues, obwohl `QASIGNATURE001 Lea Müller` im gespeicherten Brief vorhanden war. Der vorhandene Body-Hash umfasst diese Angabe nicht. Es wurde kein unsicheres PDF erzeugt. Der neue generische Abgleich benutzt die bestehenden realen First-/Continuation-/Final-Probes desselben Produktionsrenderers, einschliesslich der jeweiligen CSS-Seitenkontexte. Er prüft semantische Angaben, Kontakt-/Custom-Chrome und Felder gegen die physische Seite. Body-Hash und Bild-ID-Vertrag bleiben erhalten; keine neue Pagination oder gespeicherte Schemaänderung. Der gezielte Unterschrift-Test ergibt danach BLOCKED (`semantic-content-missing`). Weitere Löschtests prüfen Absender, Empfänger, Datum, Betreff, Anrede, Gruss und Unterschrift vor einer Bestätigung, im direkten Export-API und in der UI.

**Bewusste Begrenzung:** Nur das einzelne Motivationsschreiben besitzt damit einen vollständigen Quelle-/Probe-/Seitenvertrag für diese Override-Freigabe. CV-Seitenleisten/freie Elemente und Cover haben keinen gleichwertigen vollständigen Quellvertrag. ADVISORY im Gesamtdossier erhält deshalb `overridePermitted=false`; die UI bietet keine Bestätigung, und die API lehnt eine solche Bestätigung ab. Reguläre gemessene PASS-Dossiers bleiben exportierbar, ihre bestehenden Inhalts-/Fragmentierungsregressionen und finalen Geometrieprüfungen bleiben bestehen. Ein Gesamtdossier-Override ist in diesem begrenzten Package ausdrücklich NO-GO. Eine spätere Erweiterung braucht zunächst eine generische vollständige Quelle-Projektion aller CV-/Cover-Inhalte; sie wird hier nicht als zweite Pagination eingebaut. Die geplante Endklassifikation ist daher B, sofern sämtliche übrigen Abnahmetests bestehen.

[Dritter CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38467938009), unveränderter Code `78f6a52c8d53135ff0e788037d87a13c4c3a9bc2`: 30/30 Sicherheitstests und 31/31 Produktfälle bestanden. Alle 156 Standard-Matrix-Audits (39 Vorlagen × Brief/CV × ein/zwei Seiten) enthalten PASS und tatsächlich erzeugte PDFs. Sie sind jedoch kein grüner Gesamtlauf: Ein Live-Rand-Test und sieben Letter-Grenztests überschritten ihre Fristen; das gesamte Jobbudget lief nach 60 Minuten ab und die späteren Combined-/Search-/Rasterphasen wurden nicht erreicht. [Artefakt](https://github.com/modebrecht/cv-cover-charm/actions/runs/38467938009/artifacts/11854165356), 243’430’852 Bytes, SHA-256 `0644f9718815abf57fb966eee6b32ad300e6f802686a977336f7c0fde792d789`, Ablauf 27. Oktober.

Die gemeinsame UI-Prüfung vermisst nun keine provisorische komplette Langbrief-Fallbackseite, während der Paginator selbst noch aussteht. Sie gibt PENDING zurück und sperrt Export/Bestätigung; sobald die Seiten gemessen sind, läuft die vollständige Prüfung wie zuvor. Der dauerhafte CI-Workflow verteilt die unveränderten Browser-Suiten und zwei Shards der bestehenden Integrationssuite auf getrennte Runner und sammelt Raster-/Inhaltsbelege anschliessend. Individuelle Testfristen und Toleranzen bleiben unverändert. Ein lokaler Grenzlauf während dieser Änderungen war HMR-beeinflusst und gilt nicht als stabiler Abnahmebeleg.

Die Grenzsuche verwendet weiterhin ausschliesslich gemessene Produktionsseiten und unveränderte Grenzen/Restore-/Export-Assertions. Wiederholt abgefragte unveränderliche Fixtures behalten ihren bereits beobachteten Count; der erste Brief-Bracket beginnt bei 20 Absätzen und erweitert sich bei Bedarf auf die bisherige Maximalgrenze 40. Vor dem Setzen neuer Fixtures wird der tatsächliche App-Origin über die statische Cabin-Lizenzdatei geöffnet, damit nicht zuerst das gesamte alte Dossier hydriert wird. Danach wird ausschliesslich die reale Produktionsroute geladen, ohne Interception oder Export-Mocks. Das senkt redundante Testarbeit; es behauptet keine neue Pagination oder allgemein garantierte Performanceverbesserung. Lokale instrumentierte Läufe: 2 Absätze 17,590 s; 40 Absätze 77,257 s; 20 Absätze 38,754–45,420 s. Mit statischem Origin-Seed: 20 Absätze 39,064 s. Diese Einzelmessungen ersetzen keine stabile CI-Abnahme. Ein zusätzlicher fokussierter Dossierlauf hatte einen fehlerhaften Visibility-Assert in einem noch geschlossenen Details-Bereich; der Test öffnet diesen nun über die echte Summary-Aktion und wartet auf den tatsächlich als Advisory bezeichneten Hinweis.

### Ergänzende Sicherheitsbefunde des letzten Kandidaten

Die zusätzliche adversariale Messung bestätigte zwei weitere unsichere Freigaben auf `1085ef27`: Unsichtbare Unterschrift in Quelle **und** physischer Seite (`opacity:0`) sowie transparente physische Unterschrift (`rgba(0,0,0,0)`) wurden ADVISORY mit erlaubter Bestätigung. Das Textfeld lag korrekt bei x=23,989 mm, y=189,947 mm, Breite=163,021 mm, Höhe=5,479 mm. Nicht die Geometrie, sondern fehlende gedruckte Tinte ist hier der harte Fehler. Der Source-Abgleich darf unsichtbare Quellwerte nicht als absichtlich fehlenden Inhalt behandeln. Nur das etablierte `display:none` des jeweiligen First-/Final-Seitenkontexts unterdrückt solche Sektionen; die tatsächliche Seite muss sichtbare, nicht transparente Tinte enthalten. Vollständig transparente CSS-Farben werden unabhängig vom RGB-Kanal erkannt. Beide reproduzierten Fälle werden danach BLOCKED, Consent und API verweigern den Download. [Unveränderte Fixtures, Vorher/Nachher und Ribbon-Geometrie](pdf-preflight-13okt-evidence/semantic-source-safety.json).

Die ersten fünf fokussierten Prüfungen dieses Kandidaten bestanden: einmaliger Standalone-Override, tatsächliches gespiegeltes CV-Foto, beide unsichtbaren Unterschriften und das ursprüngliche Ribbon-Cover. Ein weiterer Negativtest prüft transparente weisse Body-Tinte. Keine der unsicheren Vorher-Fixtures wurde als PDF erzeugt.

Der vierte CI-Lauf auf `1085ef27` ist **nicht** grün: Produktregressionen bestanden; die Safety-Suite hatte 30/31 PASS und prüfte das CV-Foto noch während PENDING des Briefs. Der Test wartet nun ausdrücklich beide vorhandenen Ready-Verträge ab, bevor er den bestätigten CV-Überlauf als BLOCKED erwartet. Die erste Integrationshälfte hatte 103/104 PASS; der Live-Rand-Fall überschritt 180 s. Die Wortsuche erreichte Ribbon nach erfolgreichen vorigen Vorlagen und wurde dort durch den neuen finalen Cover-Guard gesperrt. 10/11 lange Combined-Fälle bestanden; Ribbon wurde ebenfalls gesperrt. Keine Frist wird verlängert.

**Echter vorhandener Ribbon-Defekt, kein False Positive:** `next-signature-templates.css` verschiebt das Datum um (-45,+26) mm und das Foto um (-57,-60) mm mit Skalierung 0,82. Auf den tatsächlichen aktuellen Registry-Slots liegt Datumtext bei x=-143,625 px und y=1134,846 px auf einer 794×1123-px-Seite; die Initialen liegen bei x=-66,482 px und y=-46,511 px. Beruf und Lehrbeginn besitzen zusätzlich überlappende Glyphen. Web und kanonisches Cover verwenden diese vorhandenen Regeln; es ist kein blosses Scroll-Metrik-Problem. Der Original-Demo-Fall bleibt unverändert in einem expliziten UI-/API-Negativtest. Eine Ribbon-spezifische CSS-Reparatur oder generelle Cover-Layout-Migration würde die ausdrücklich begrenzte Preflight-Aufgabe erweitern und wird hier nicht vorgenommen.

Damit die positiven Prüfungen keine tatsächlich unsichere Cover-Fixture exportieren, verwenden **alle** langen Combined-Struktur-Fixtures dasselbe sichere Produktions-Cover «Brief». Letter-/CV-Varianten, deren Web-/Canonical-Parität, Vollständigkeit und echte PDF-Seiten bleiben unverändert geprüft. Die 39er-Wortsuche läuft für sämtliche Letter-Vorlagen über deren normalen Standalone-Automatikexport; der Mixed-Inline-Test bleibt zusätzlich ein echtes Combined-PDF. Die ursprünglichen unsicheren Cover-Eingaben bleiben negative Belege, werden nicht durch Toleranzen, Template-Ausnahmen oder Ignorieren des Guards freigegeben. Eine vollständige Freigabe aller unveränderten 39 Default-Cover-Kombinationen wird ausdrücklich **nicht** behauptet.

Zwei redundante synchrone Messungen wurden zusammengeführt: Ein Glyphenlauf prüft Textlayer **und** A4 mit denselben Grenzen/Clip-Ahnen/Überlappungen, und der initiale Export-Guard setzt seine gerade gemessene Entscheidung direkt durch. Jeder spätere Guard misst weiterhin frisch. Menüprüfungen abonnieren das DOM nur solange die entsprechenden Aktionen sichtbar sind; Schliessen löscht das Urteil, Öffnen startet gesperrt und misst neu. Preview/Paginator und jeder direkte Export behalten ihre Guards. Die Pagination-Readiness vergleicht während des Renders den aktuellen vollständigen Inputschlüssel mit dem zuletzt gemessenen Schlüssel; ein Edit kann deshalb vor dem nächsten Effekt kein altes Ready-Ergebnis übernehmen. Keine zweite Pagination, kein Schemafeld, keine gelockerte Toleranz.

Ein zusätzliches echtes erforderliches Bild war trotz `complete=true`, `naturalWidth=120` und `opacity=0` noch bestätigbar. Seine unveränderte Geometrie x=23,989 mm, y=127,855 mm, 15,993×10,661 mm passte vollständig. Der Guard prüft jetzt die Sichtbarkeit des Bildes und seiner Ahnen bis zur physischen Seite unabhängig von Ladezustand und Bounds. Der Vorher-Test schlug erwartungsgemäss fehl; nach der Korrektur bestehen unsichtbares Bild, beide unsichtbaren Unterschriften, transparente weisse Body-Tinte und beide positiven realen Bild-PDFs (6/6). Die zwei zuvor gescheiterten Live-/Grenzfälle bestehen ebenfalls zusammen (2/2, 5,1 min insgesamt, bestehende einzelne Fristen 180/240 s). Alle drei Live-Rand-PDFs wurden tatsächlich erzeugt. 1’118 Units, App-/QA-Typechecks, Lint (0 Fehler/21 bestehende Warnungen), Formatting und Build bestanden für diesen Entwicklungsstand; die oben ausgewiesene abschliessende CI validierte den unveränderlichen Commit erneut; ihr Raster-Evidence-Job blieb rot.
