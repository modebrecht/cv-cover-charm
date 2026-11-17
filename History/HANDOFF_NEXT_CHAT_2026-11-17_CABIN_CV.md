# CV Cover Charm – gezielter Handoff, 17.11.2026

## Startauftrag

Setze diesen Handoff fort. Arbeite direkt auf `dev` in `modebrecht/cv-cover-charm`. Der nächste fachliche Schwerpunkt ist ausschliesslich die verbleibende Cabin-CV-Web/PDF-Abweichung. Lies zuerst die unten verlinkten aktuellen Nachweise. Keine erneute allgemeine Inventur und keine Wiederholung bereits abgeschlossener Versuchsreihen.

## Verifizierter Ausgangsstand

- Repository: https://github.com/modebrecht/cv-cover-charm
- Produkt-/Prüfbaseline: `5af3c654334ba3b2f7b7c9838b640ff63cb2710c` auf `dev`.
- Dieser Handoff ergänzt nur Dokumentation unter `History/`; sein Commit ist kein neuer Produktstand mit erneut ausgeführten Tests.
- `dev` wurde beim Erstellen erneut auf die genannte SHA geprüft. Die drei zugehörigen Workflows wurden erneut als erfolgreich bestätigt.
- Vor dem Wegfall des Executors war das lokale Arbeitsverzeichnis sauber und mit `origin/dev` identisch. Ein heutiger lokaler Dateiabgleich ist mangels Executor nicht möglich.

**Aktuelle Blockade:** In diesem Chat ist der Executor nicht verfügbar. Terminal, Dateisystem und neue Browser-/PDF-Renderläufe sind damit blockiert; GitHub-Lesezugriff funktioniert. Am 17.11. wurden deshalb nur bestehender Code und gespeicherte Nachweise abgeglichen. Eine neue Cabin-Korrektur wurde weder implementiert noch als geprüft ausgegeben. Ein neuer Chat stellt eine Arbeitsumgebung nicht automatisch wieder her.

## Was abgeschlossen und gesichert ist

| Bereich | Belegter Stand |
| --- | --- |
| Neon-CV-Hintergrund | PASS in der aktuellen vollständigen Galerie; maximale gemessene RGB-Kanalabweichung 1,08 bei Grenze 3 |
| Unabhängige Briefschrift | Eine eigenständig gewählte Briefschrift bleibt beim Laden erhalten. Ein ausdrücklicher neuer Dossier-Schriftwechsel propagiert weiterhin. |
| PDF-Schriftgrundlinien | Gemeinsamer Rasteradapter verwendet tatsächlichen Font-Ascent statt pauschal Schriftgrösse. Gilt für gemeinsame PDF-Pfade sowie CV-/Titelblatt-Einzeldownloads. |
| Acht-Schriften-Matrix | 8/8 echte Browser-/Dossier-Downloadabläufe; 24 Seitenpaare: 23 PASS, 1 REVIEW, 0 FAIL |
| Maschine-CV | RGB-SSIM von 0,87010 auf 0,96004 verbessert |
| Isolierte Grundlinienproben | Acht Proben, einschliesslich kleiner/kursiver und nicht ganzzahliger Schriften; alle korrigierten Pixelvergleiche exakt 0 Abweichungen |
| Echte Einzel-PDFs | Maschine-CV und -Titelblatt über normale Downloadmenüs geprüft, je eine Seite; gespeicherte Dokumente unverändert |
| Vollständige Vorlagengalerie | 39/39 Browserfälle, 117 Seitenpaare: 115 PASS, 2 REVIEW, 0 FAIL |
| Unit-Tests | 1’539 bestanden, 0 Fehler, 290 Dateien |
| Weitere Prüfungen | TypeScript, Lint, Formatierung, Produktionsbuild und drei aktuelle CI-Workflows erfolgreich |

Die beiden Galerie-REVIEW sind **Terracotta-CV und Studio-3-CV, Foto-Kreisränder**. Der zusätzliche **Cabin-CV-REVIEW gehört zur separaten Schriftmatrix**. Diese Ergebnisse nicht zusammenzählen oder die unterschiedlichen Prüfumfänge vermischen.

Die vollständige Galerie stammt vom Produktcommit `f5260c06f1e57db30e4369599cc9932e41e06d26`. Bis `5af3c65` wurden danach nur Tests und Nachweise geändert; der Produktcode unter `src/` blieb bytegleich.

Die Schriftmatrix vermerkt als Basis `3f7ffae` plus exakt gesicherten Produktdiff. Dieser Diff entspricht der auf `f5260c0` veröffentlichten Rasterkorrektur; das ist kein erneuter Lauf auf unverändertem alten Produktcode.

## Wichtige Commits

- `3f7ffae6108fca0195f5ad1b4c44c8c13d9b8846`: unabhängig gewählte Briefschriften beim Laden erhalten.
- `f5260c06f1e57db30e4369599cc9932e41e06d26`: PDF-Grundlinien nach gemessenem Font-Ascent korrigieren.
- `16eae146a2be40891076eabacd74b182a1f73b42`: Diagnose-/Compositing-Versuch für CI-Pixelprobe; eigene Ebene erwies sich in CI als unwirksam.
- `5af3c654334ba3b2f7b7c9838b640ff63cb2710c`: unwirksame Ebene entfernt; separater Browser ohne LCD-Text nur für synthetische Grundlinienproben; endgültige CI grün.

Die frühere Annahme, jede beim Laden abweichende Brief-`fontOverride` sei veraltet, war falsch. Eigenständige Schriftwahl darf nicht wieder überschrieben werden. Die Korrektur auf `3f7ffae` unterscheidet Laden und ausdrückliche neue Dossier-Schriftwahl.

## CI-Nachweise für 5af3c65

Alle drei Workflows sind abgeschlossen und erfolgreich:

- Dossier Regression: https://github.com/modebrecht/cv-cover-charm/actions/runs/43962847170
- Dossier Visual Parity: https://github.com/modebrecht/cv-cover-charm/actions/runs/43962847269
- Pages build and deployment: https://github.com/modebrecht/cv-cover-charm/actions/runs/43962844596

Die Regression enthält zwölf Browsergruppen, schnelle Prüfungen und abschliessende Statusveröffentlichung. Der optionale `native-print-benchmark` war übersprungen; dies ist **keine Desktop-Word-Abnahme**.

Die zuvor fehlerhafte Gruppe `cv-pdf-paint` besteht auf diesem Stand mit 3/3 Fällen. Ihr Artefakt `14274203474` enthält auch acht einzelne Grundlinienmessungen: jeweils 0 korrigierte Pixelabweichungen und 0 farbige Referenzpixel.

## Weshalb die CI-Pixelprobe einen eigenen Browser benötigt

Der ursprüngliche lokale Browser zeichnet DOM-Text in Graustufen. Die CI zeichnet ihn teils mit farbigen LCD-Subpixel-Kanten, während Canvas Graustufen verwendet. Bei Mono 40 px enthielt das native CI-Bild 1’915 farbige Kantenpixel. Trotz richtiger Grundlinie blieben dadurch 1’987 unterschiedliche Pixel.

Die Ursache wurde lokal mit Fontconfig-`rgba=rgb` nachgestellt: Das native PNG war sogar bytegleich mit dem ursprünglichen CI-PNG. `--disable-lcd-text` ergab 0 farbige Pixel; beide Browserfälle bestanden auch unter dieser nachgestellten Umgebung.

Nur der synthetische Grundlinienfall startet einen separaten Chromium mit `--disable-lcd-text` und schliesst ihn im Fehlerfall. Der echte Einzeldownloadfall und die vollständigen Produktvergleiche behalten ihre normale Browserumgebung. Die Null-Pixel-Schwelle sowie die Roh-SSIM-Grenzen wurden nicht gelockert. Die fehlgeschlagenen Zwischenversuche bleiben nachvollziehbar dokumentiert.

## Aktueller offener Cabin-Befund

- Schriftwahl im Produkt: `freundlich`; tatsächlich geladene Schrift: Cabin, kein nachgewiesener Fallback im geprüften Sample.
- Modern-CV mit kanonischem kurzem Dossier, 54 gemessene Textknoten.
- RGB-SSIM vorher 0,9444875254, nach Grundlinienkorrektur 0,9398043176: **weiterhin REVIEW**, leicht schlechter.
- Maximale gemessene Text-/Zeilenbox-Geometriedifferenz: 0 mm.
- Cabin-Titelblatt 0,98899 PASS, Cabin-Brief 0,97982 PASS.
- Die kontrollierten Cabin-Grundlinienproben bestehen bereits pixelgleich; daraus folgt keine vollständige Rastergleichheit des CV.
- Vollständige Seitenbilder wurden visuell geprüft; kein beobachteter Textverlust, kein abgeschnittenes Textende, keine zusätzliche Seite.
- Eine zusätzliche Ascent-Rundung änderte keines der 24 PDF-Seitenbilder und wurde verworfen. Nicht erneut als unbelegten Fix einführen.

**Die konkrete Ursache des verbleibenden vollständigen Cabin-CV-Rasterunterschieds ist noch nicht belegt.** Weder fehlende Schrift noch Textumbruchproblem als gesichert behaupten.

## Genau der nächste Arbeitsschritt

1. Sobald ein Executor verfügbar ist: aktuellen `dev`-Stand und Arbeitsverzeichnis prüfen; lokale Reste berücksichtigen. Frühere Scratch-Pfade und installierte Abhängigkeiten nicht als dauerhaft vorhanden voraussetzen.
2. Die bestehenden Cabin-Web-/PDF-Bilder und Metadaten aus den unten genannten Nachweisen als Referenz verwenden.
3. Einen begrenzten Modern-/Cabin-CV-Fall mit derselben kanonischen Fixture neu rendern. Webbild, unmittelbares Export-Canvas und tatsächlich heruntergeladenes PDF vergleichen, um die Abweichung einer Stufe zuzuordnen.
4. Auffällige konkrete Textzeilen untersuchen: Fontfamilie/-gewicht, echte Grundlinie, Zeichenabstände, Teilpixelpositionen und Exportkopie. Diese Punkte sind Prüfideen, keine bereits belegten Ursachen.
5. Nur eine kausal belegte Produktkorrektur umsetzen. Rohbilder, Textgeometrie und echte Downloads gegenprüfen. REVIEW bei fehlendem Beleg beibehalten.
6. Bei Änderung am gemeinsamen Rasterpfad: gezielte Grundlinienfälle und die Acht-Schriften-Matrix prüfen; die vorhandene CI startet zusätzlich die 39-Vorlagen-Galerie. Relevante Regressionen und CI abschliessen, direkt auf `dev` committen und sichern.

Keine Glättung, Maskierung, nachträgliche Bildausrichtung oder weichere Schwelle als Produktkorrektur ausgeben.

## Einstieg im Repository

Zentrale Dateien:

- `src/lib/pdf-raster.ts`
- `src/lib/dossier-pdf.ts`
- `src/routes/lebenslauf.tsx`
- `src/routes/titelblatt.tsx`
- `src/lib/dossier-font-sync.ts`
- `tests/unit/pdf-raster.test.ts`
- `tests/e2e/pdf-text-baseline.spec.ts`
- `tests/e2e/dossier-font-sync.spec.ts`
- `tests/e2e/dossier-docx-part-independent.spec.ts`
- `tests/qa/playwright.text-baseline.config.ts`
- `tests/qa/playwright.font-matrix.config.ts`
- `scripts/dossier_font_matrix_report.py`

Reproduktion mit funktionsfähiger Arbeitsumgebung und installierten Repo-/QA-Abhängigkeiten:

```sh
playwright test --config tests/qa/playwright.text-baseline.config.ts
playwright test --config tests/qa/playwright.font-matrix.config.ts
python scripts/dossier_font_matrix_report.py
bun test tests/unit
```

Die Schriftmatrix braucht einen frischen Artefaktordner und die vorhandenen PDF-/Bildvergleichsabhängigkeiten. Gepinnte Runner aus den jeweiligen Workflows übernehmen: Dossier Regression verwendet Playwright 1.56.1 / Chromium 141.0.7390.37, der separate Visual-Parity-Workflow verwendet Playwright 1.55.0. Nicht versehentlich diese Umgebungen vermischen. Unit-Tests nicht gleichzeitig mit schweren Renderläufen belasten; ein vorhandener zeitkritischer Test kann sonst irreführend auslaufen.

## Dauerhafte Nachweise

Alle folgenden Pfade sind im verifizierten Stand enthalten:

- Hauptbericht: https://github.com/modebrecht/cv-cover-charm/blob/5af3c654334ba3b2f7b7c9838b640ff63cb2710c/docs/qa/pdf-text-baseline-2026-11-16.md
- Schriftmatrix/Hashes: `docs/qa/pdf-text-baseline-2026-11-16/summary.json`
- Komprimierte vollständige Eingaben, Produktdiffs und Prüfprotokolle: `docs/qa/pdf-text-baseline-2026-11-16/report.json.gz`
- Aktuelle 39er-Galerie mit allen 117 Seitenpaaren: `docs/qa/pdf-text-baseline-2026-11-16/gallery-ci-f5260c0.json`
- Rastermodus-Diagnose: `docs/qa/pdf-text-baseline-2026-11-16/raster-mode-check.json`
- Sichtbarer offener Befund: `docs/qa/pdf-text-baseline-2026-11-16/cabin-cv-after.png`
- Schrift-Eigentümerschaft: `docs/qa/font-loading-ownership-2026-11-16.md` und zugehörige JSON-Datei.
- Ältere Schriftmatrix: `docs/qa/dossier-font-choice-2026-11-16.md`
- Begrenzte Stable-LibreOffice-Gesundheitsprüfung: `docs/qa/lo-stable-health-2026-11-16.md`

## Weitere offene Grenzen und bereits bearbeitete Themen

- Foto-Kreisränder Terracotta und Studio 3 bleiben begrenzte REVIEW-Befunde. Bisherige Untersuchungen nicht als endlose Variantenrunde neu starten.
- Lange Dossiers, Spiegelvarianten und zusätzliche historische Projekte sind nicht durch eine kurze Modern-/Schriftmatrix vollständig abgenommen.
- Historische Import-/Restoreabläufe wurden bereits breit bearbeitet: 18 Abläufe aus 17 Originalprojekten plus Modern-Kontrolle; frühere Prüfung mit 50 Browserfällen und 36 PDFs/124 Seiten. Nicht pauschal alle historischen Projekte als vollständig geprüft ausgeben und nicht ohne neuen Anlass erneut bei null beginnen.
- Speichern/Wiederöffnen in **Microsoft Desktop Word** bleibt offen. Browser-/PDF-/LibreOffice-Ergebnisse ersetzen diese Abnahme nicht.
- Bereits vorbereitetes Word-Prüfpaket: [Word_Pruefpaket_Modern_2026-11-13.zip](https://chatgpt.com/library?file_id=libfile_735203c7ffac81919d17ac19b43ba0ea&account_id=personal). Kein weiteres kleines Word-Prüfpaket ohne neuen Anlass erzeugen.
- LibreOffice-/LOK-/Binär- und Engine-Experimente wurden begrenzt und beendet. Stable 26.8.3 startete bei der Versionsprobe, lieferte aber selbst für einen einfachen TXT-zu-PDF-Gesundheitstest keine Ausgabe. Frühere Alpha-Speicher-/Wiederöffnungsverluste sind keine Aussage über Desktop Word. Diese Runtime-Runden nicht wiederholen.

## Arbeitsweise und Berichterstattung

- Direkt auf `dev`, keine neuen Nebenbranches und keine alten Branch-Inventuren.
- Veröffentlichte Git-Historie nicht umschreiben; vorhandenes `AGENTS.md` beachten.
- `main`/`render` nicht ohne entsprechenden Auftrag promoten.
- `c` = weiter; `cc/cn` = weiter und nächsten Schritt nennen; `l` = autonom bis verifiziert; `p` = belegten Fortschritt zeigen; `x` = stoppen, diagnostizieren, beheben.
- Keine unnötigen Rückfragen. Bei realer Blockade die konkrete fehlende Voraussetzung nennen.
- Kurze deutsche Statusmeldungen, bei längerer Arbeit spätestens ungefähr jede Minute. Keine stundenlange Funkstille.
- Prozentzahlen nur bei festem, belegtem Nenner; Schriftmatrix und Vorlagengalerie getrennt berichten. Keine erfundene Gesamtreife.
- Änderungen pro Arbeitslauf committen/sichern; Ergebnis, Prüfungen, offene Grenzen und genau den nächsten Schritt nennen.
- Die ersten Einstiegshandlungen sollen den Cabin-Fall konkret voranbringen, nicht alte Prüfprotokolle neu produzieren.
