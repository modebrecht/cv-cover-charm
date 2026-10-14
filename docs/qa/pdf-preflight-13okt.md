# Package 35 – automatischer PDF-Preflight

**B — PARTIAL, grüne begrenzte Abnahme.** Die belegten Preflight-Fehlklassifikationen und die tatsächlichen Rasterabweichungen sind generisch korrigiert. 1’119 Units und 293 Browsertests bestehen; 39/39 Produktionsvorlagen bestehen alle vier Standard-Fixtures. Der Override bleibt ausdrücklich auf den geprüften Standalone-Letter-Fallback beschränkt. Für das Gesamtdossier bleibt er NO-GO. Masterliste Item 35 wird deshalb nicht als vollständige A-Abnahme ausgegeben.

Autoritative, vor Arbeitsbeginn frisch gefetchte Basis: `dev` **`1f4696ee520724466457dacbecc19fffe34ff1ff`**. Geprüfter finaler **Code-SHA: `0c9abe948a29cb68261f91d6663cca338bd6a3f7`**; Branch `fix/pdf-preflight-13okt`. Der folgende Abschlusscommit enthält ausschliesslich diesen Bericht und seine Belege. Seine exakte Remote-SHA steht in der Abschlussmeldung und Git-Historie; sein Produktionscode ist bytegleich zum geprüften Code-SHA.

[Grüner vollständiger CI-Lauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/38539214888), [maschinenlesbare Abnahme](pdf-preflight-13okt-evidence/acceptance-summary.json), [Vorher-/Nachher-Clone-Messungen](pdf-preflight-13okt-evidence/follow-up-development.json). Alle acht CI-Jobs erfolgreich. Kein Merge, kein gezieltes Deployment oder Promotion; die Vercel-Git-Integration hat automatisch ein erfolgreiches [Preview](https://vercel.com/modebrechts-projects/cv-cover-charm/2nSghdz7p5bzLgSAZNuatXi9CzhL) erstellt.

## Abschliessendes Ergebnis

| Prüfung                                                                     | Ergebnis am finalen Code-SHA                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Units                                                                       | 1’119 bestanden, 0 fehlgeschlagen; 243 Dateien, 22’254 Assertions          |
| TypeScript App und QA, Lint, Release-/Änderungsformatting, Produktionsbuild | Bestanden; Lint 0 Fehler / 21 bestehende Warnungen                         |
| Sicherheitsfälle einschliesslich neuer Raster-Parität / Produktregressionen | 41/41 und 31/31 bestanden                                                  |
| Vollständige Pagination-Integration                                         | 208/208 bestanden; zwei Shards zu je 104                                   |
| Combined-Dossiers                                                           | 11/11 bestanden; 82 physische Seiten, maximal 12 pro Dossier               |
| Automatische Wortsuche                                                      | 2/2 bestanden: 39 echte Standalone-Letter-PDFs sowie Mixed-Inline Combined |
| 39 Vorlagen, Letter und CV jeweils eine/zwei Seiten                         | 156/156 Standard-Fixtures und 234 physische PDF-Seiten bestanden           |
| Integrationsevidence                                                        | 292/292 Audit-Dokumente PASS, 252 tatsächliche PDFs                        |
| Separater vollständiger Feldreader                                          | 287/287 geeignete Dokumente; 11’386 Feldprüfungen, 0 Fehler                |
| Separater sichtbarer Rasterreader                                           | 273/273 PDFs, 576 Seiten, 6’594 Markerrechtecke; 0 Fehler                  |
| Gesamt-CI                                                                   | SUCCESS; 1’412 Unit-/Browsertests bestanden, 0 fehlgeschlagen              |

Raster, vollständige Suchtexte und physische Marker-/Seitenverteilung sind eigenständige Prüfungen. Ihre Zahlen dürfen nicht als zusätzliche Browsertests addiert werden. Es gelten unverändert Kontrast >=90 und mindestens zehn kontrastierte Pixel; Clone-Parität maximal 0,3 mm pro Koordinate. Keine Skips, neuen Snapshots, Deadline-Verlängerungen oder gelockerten Produktionstoleranzen. Die 150 Fehler des repo-weiten `format:check` sind vorher vorhandene, nicht von diesem Paket geänderte Dateien; das bestehende Release-Formatting und sämtliche betroffenen Prüffiles bestehen CI. Eine pauschal grüne repo-weite Formatierung wird nicht behauptet.

## Was tatsächlich falsch war und jetzt korrigiert ist

Die unabhängige Audit-Historie unten rekonstruiert Editor → Paginator → physische Seiten → gemeinsame Policy → Download → Generator → tatsächliches Raster. Der Paginator bleibt alleiniger Eigentümer der Seitenaufteilung. Die gemeinsame typed Policy in `src/lib/pdf-preflight.ts` ersetzt widersprüchliche UI-Bools; `pending` sperrt, `pass` erlaubt, `advisory` erfordert ausdrücklich zulässigen Consent, `blocked` sperrt ohne Override. `LetterDocument` invalidiert Readiness sofort nach Eingabe-/Layoutänderungen. Beide UI-Pfade beobachten das echte kanonische Dokument; der Generator prüft selbst vor Beginn, vor jeder Seite und direkt vor dem Download. Zusätzlich prüft er nun **alle tatsächlichen Cover-/CV-/Letter-Raster-Clones** nach deren Normalisierung. Ein UI-PASS ist keine Erlaubnis, einen nachträglich unsicheren Clone zu speichern.

| Reproduktion / ursprünglicher Grund                              | Physischer Befund vor Änderung                                                                                    | Generische Korrektur / Endklassifikation                                                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leere letzte Textbox blockierte passenden Brief                  | Boxende 1269,422 px, Glyphenende 708,047 px, Layerende 975,609 px; 293,813 px ≈77,7 mm leere Boxfläche ausserhalb | Sichtbare Glyphen und echte Clip-Ahnen messen; PASS, tatsächliches PDF vollständig                                                                             |
| Verschachteltes Clipping und zusätzliche Footer wurden übersehen | Effektive Clip-Höhe 21,688 px ≈5,74 mm; weiterer Footer über echtem Body                                          | Alle Clip-Ahnen und Chrome-Flächen prüfen; BLOCKED                                                                                                             |
| Fehlende Signatur / transparente Pflichtfelder oder Bilder       | Body-Hash allein bestand trotz fehlender oder unsichtbarer Inhalte                                                | Produktions-Probe-Vertrag für Letter-Semantik, Ressourcen- und Sichtbarkeitsprüfung; BLOCKED                                                                   |
| Dunkler Letter erbte CV-spezifische Ink-Werte                    | Papier `#171716`, Body `rgb(17,17,17)`; Salutations-Raster Kontrast 25, 0 starke Pixel                            | CV-only `cvInk`/`cvMuted`/`cvHeading` nicht auf unabhängige Letter-Palette anwenden; automatischer Body `#ffffff`, explizites Letter-`textColor` bleibt gültig |
| Zoom-Normalisierung änderte reale CV-Zeilen                      | Brief Seite 2 `QAEND008`: vorher x125,076/y101,846 mm; alter Clone x102,605/y101,843 mm, 22,471 mm Verschiebung   | Native Zeilen und Wortpositionen vor Zoom-Konvertierung im Wegwerf-Clone bewahren; final x125,069/y101,843 mm, Schrift weiter 15,84 px                         |
| Erste Clone-Korrektur liess harte Zeilen und Blankzeilen aus     | Ledger-Clone hatte 2,689/18,188 px ≈0,712/4,81 mm tatsächliches Ancestor-Clipping; Guard blockierte korrekt       | Native Blockhöhe, Zeilentops und Wortbreiten erhalten; harte Newlines eingeschlossen, DOM-Messungen vor Mutationen gebündelt; alle langen Dossiers PASS        |

Der Letter-Farbfix verwendet keine Template-ID. Der Zoom-Fix betrifft nur bereits gemessene einfache Textblöcke mit LTR/Links-Ausrichtung im verworfenen Capture-Clone. Inline-Mischformatierung, RTL und Blocksatz behalten den bisherigen Renderer. Es gibt keine neue Pagination, Quellschrift-Verkleinerung, Textkürzung oder gespeicherte Schemaänderung. Die deklarierten Fontgrössen bleiben gleich; Worttransforms rekonstruieren die nativen verwendeten Metriken. Die tatsächlichen Clone-Messungen ergeben maximal 0,030420 mm Abweichung für Brief Boundary/Blank Lines und Gallery Timeline, 0,238030 mm für Studio. Der automatische Export bleibt html2canvas/jsPDF inklusive unsichtbarer Suchtextschicht.

Die früheren Rasterfehler sind weiterhin als historische Gegenbelege erhalten: [Brief vorher](pdf-preflight-13okt-evidence/brief-cv-raster.png), [Dark vorher](pdf-preflight-13okt-evidence/edel-dark-raster.png), [44 ursprüngliche fehlerhafte Rechtecke](pdf-preflight-13okt-evidence/raster-failures.json). Die finalen echten CI-PDFs wurden zusätzlich mit Poppler gerendert und visuell geprüft: [Brief nachher, Seite 2](pdf-preflight-13okt-evidence/after-brief-cv-raster.png), [Dark nachher](pdf-preflight-13okt-evidence/after-dark-raster.png). Brief-Boundary hat über alle Marker mindestens Kontrast 668 / 953 Pixel, Dark mindestens 696 / 2’340 Pixel. Die vollständigen ursprünglichen Fixture-/Template-Hashes stehen in der Abnahme und den unveränderten Reproduktionsbelegen. Der Dev-Baseline-Nachweis bleibt im Manifest erhalten.

## Override und harte Sicherheitsgrenzen

«PDF trotzdem herunterladen» erscheint nur für einen **fertigen Standalone-Brief** mit abgeschlossenem `measurement-failed`-Fallback, dessen tatsächliche Seiten messbar, Fonts/Bilder bereit und erforderliche Inhalte vollständig sind und dessen Geometrie keinen sichtbaren Verlust oder harten Überlapper zeigt. Die Meldung nennt Seite und Unsicherheit. Die normale PDF-Aktion bleibt primär; bei sauberem PASS gibt es keinen Override.

Consent ist ein opakes, einmalig verwendbares Token für genau den validierten Root, Inhalt, Layout, Geometrie und Issue-Zustand. Content-/Typografie-/Margin-/Image-/Paginationänderungen machen es ungültig; gefälschte, veraltete oder wiederverwendete Tokens werden verweigert. Es wird niemals im Dossier gespeichert und kann keine andere Fehlerklasse freigeben. Der Generator revalidiert auch nach Raster-Wartephasen und lehnt neue harte Fehler ab.

BLOCKED bleiben sichtbare Glyphen/Bilder ausserhalb A4 oder des Druckbereichs, echte Clip-Ahnen, Kontakt-/Header-/Footer-/Bildüberlappung, zu hohe unteilbare Blöcke, fehlende Pflichtinhalte, ungültige Seitenstruktur oder bekannte unsichere Geometrie. Ausstehende Pagination, benötigte Fonts oder Bilder bleiben PENDING und erlauben keinen Download. Die 41 Sicherheits-/Paritätsfälle prüfen normale UI und direkte API, darunter Hard-Overflow, Bild ausserhalb A4, Chrome-Überlappung, unteilbare Tabellenzeile, Ressourcenübergänge, stale/fake/replayed Consent und Änderungen während tatsächlicher Rastererzeugung. Ein zusätzlicher lokaler direkter API-Negativfall nur im Export-iframe wurde im vorigen Arbeitsabschnitt mit 0 Downloads verweigert; er ist gesondert protokolliert und nicht in die CI-Testzahl eingerechnet.

Für **Combined-Dossier** wird keine Override-Berechtigung erteilt: Ein unabhängiger vollständiger Source-Vertrag für sämtliche CV-/Cover-Inhalte fehlt. Die normalen sicheren Cover/Letter/CV-PDFs verwenden dieselbe harte Policy und etablierte CV-Fragmentierungs-/Content-Checks. Der Legacy-Standalone-CV-Exporter bekommt keine neue Override-Berechtigung. DOCX bleibt unverändert; Native Chromium Print bleibt aus normalen Menüs verborgen.

## Finale 39er-Matrix

Quelle ist die vorhandene autoritative Produktionsregistry; diese Ergebnistabelle ist kein zweiter Produktionskatalog. Alle vier Standard-Fixtures jeder Familie bestehen Browser-Readiness, Download, echtes PDF, Seitenzahl, Vollständigkeit, Marker-Verteilung und den strikten sichtbaren Rasterreader. Alle verwendeten Audits nennen den unveränderten Code-SHA und `sourceDirty=false`.

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
| edelDark         | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
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
| studio           | 1 / PASS | 2 / PASS | 1 / PASS | 2 / PASS |
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

Die elf Combined-Fixtures verwenden das gleiche sichere Produktions-Cover «Brief» und unterschiedliche echte Letter-/CV-Strukturen einschliesslich klassischem CV, linker/rechter Sidebar, langem CV/Brief, freien/Flow-Bildern, langen Wörtern und Custom-Druckrändern. Reihenfolge Cover → Letter → CV, insgesamt 82 Seiten. Das ursprüngliche **Ribbon-Cover bleibt bestätigt unsicher und wird gesperrt**; sein Date-/Fotobereich liegt tatsächlich ausserhalb A4. Keine Preflight-Ausnahme und keine stille Benutzerdatenkorrektur. Die 39 Standalone-Letter/CV-Fixtures bestehen einschliesslich Ribbon-Letter; eine 39er-Abnahme aller unveränderten Default-Cover-Dossiers wird nicht behauptet.

## CI-Verlauf, Risiken und Produktentscheidung

| Code-SHA / Lauf                                                                                   | Resultat                          | Bedeutung                                                                                                   |
| ------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `b81289d5` / [38504447640](https://github.com/modebrecht/cv-cover-charm/actions/runs/38504447640) | Raster rot: 8 PDFs / 44 Rechtecke | Vorhandene Farb-/Clone-Probleme belegt; ursprüngliches NO-MERGE korrekt                                     |
| `75b70118` / [38534643622](https://github.com/modebrecht/cv-cover-charm/actions/runs/38534643622) | Combined 7/11; vier echte Fehler  | Zwei bestehende Downloaddeadlines überschritten, zwei korrekt verweigerte Clone-Clips; nicht grün behauptet |
| `0c9abe94` / [38539214888](https://github.com/modebrecht/cv-cover-charm/actions/runs/38539214888) | Alle acht Jobs SUCCESS            | Alle required bounded fixture suites und unverändert strikter Reader bestehen                               |

**Merge-Empfehlung: JA für diese begrenzten generischen Sicherheits-/Renderer-Korrekturen nach Review, ohne Dossier-Override.** Es wurde nicht gemergt. **B — PARTIAL** bleibt absichtlich bestehen: Die getesteten automatischen PDFs sind freigegeben, die gewünschte allgemeine Override-Funktion für den Dossierpfad ist nicht vollständig abgenommen. Für Masterliste Item 35 diese Einschränkung ausdrücklich führen. Das Ribbon-Cover benötigt eine separate Layoutkorrektur; Dossier-Consent benötigt zuerst einen unabhängigen CV-/Cover-Inhaltsvertrag. Beliebige ausdrückliche Benutzerfarben, sämtliche Drittanbieter-CSS, alle Fonts und Browserengines sind kein universelles Fidelity-Versprechen.

Die letzten frisch gefetchten geschützten Remote-Refs sind unverändert: `dev=1f4696ee520724466457dacbecc19fffe34ff1ff`, `main=44d7eb950b4fe972d6e890a72b6d3256ce365bc9`, `render=4319c20fb85d3971ac355ae8898cdfef86ee7a8c`. Keine Änderungen an CV-Engine, Letter-Paginator, DOCX, Package-/Lockdateien oder historischen Native-Branches. Es gibt keine absichtliche Deployment-Aktion; weitere automatische Git-Previews beim Dokumentationspush sind möglich. CI-Artefakte sind für 14 Tage gespeichert (bis 28.10.2026); IDs, SHA-256-Digests und Ablaufzeit stehen im Manifest.

## Vollständiger geänderter Dateiumfang

42 Dateien gegenüber der frisch gefetchten Dev-Basis; der Abschlusscommit ändert ausschliesslich Dokumentation und Belege:

- `.github/workflows/pdf-preflight.yml`
- `docs/qa/pdf-preflight-13okt-evidence/acceptance-summary.json`
- `docs/qa/pdf-preflight-13okt-evidence/after-brief-cv-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/after-dark-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/after-footer.png`
- `docs/qa/pdf-preflight-13okt-evidence/before-footer.png`
- `docs/qa/pdf-preflight-13okt-evidence/brief-cv-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/ci-initial-failures.json`
- `docs/qa/pdf-preflight-13okt-evidence/clone-layout.json`
- `docs/qa/pdf-preflight-13okt-evidence/cover-policy.json`
- `docs/qa/pdf-preflight-13okt-evidence/edel-dark-raster.png`
- `docs/qa/pdf-preflight-13okt-evidence/follow-up-development.json`
- `docs/qa/pdf-preflight-13okt-evidence/raster-failures.json`
- `docs/qa/pdf-preflight-13okt-evidence/reproductions.json`
- `docs/qa/pdf-preflight-13okt-evidence/semantic-source-safety.json`
- `docs/qa/pdf-preflight-13okt.md`
- `scripts/pdf_preflight_raster.py`
- `src/components/dossier/DossierExportDialog.tsx`
- `src/components/dossier/DossierHeaderFooterChrome.tsx`
- `src/components/letter/LetterDocument.tsx`
- `src/components/letter/letter-pagination.css`
- `src/components/letter/letter-paper.ts`
- `src/components/letter/preflight.ts`
- `src/lib/dossier-pdf.ts`
- `src/lib/html2canvas-export.ts`
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
- `tests/qa/pdf-raster-parity.qa.ts`
- `tests/qa/playwright.integration.config.ts`
- `tests/qa/playwright.preflight.config.ts`
- `tests/unit/letter-paper-color.test.tsx`

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

Die endgültige Produktentscheidung und aktuelle Merge-Empfehlung stehen am Anfang dieses Berichts; die roten Zwischenläufe in dieser Historie sind durch die abschliessende grüne Abnahme ersetzt.

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
