# Abschluss und gezielter Wiedereinstieg — 28. Oktober 2026

Auftrag: Prüfungen abschliessen, alles committen und übergeben. Die vollständigen Browserläufe sind abgeschlossen und gesichert; keine erneuten Langläufe nur für diese Übergabe starten. Dieser letzte Schritt ändert ausschliesslich den Handoff.

- Wiederhergestellter Checkout: `/workspace/scratch/2349c07d0534/cv-cover-charm-verified`; Branch `recovery/28okt-import-safety`.
- Bestätigter Entwicklungs-/Berichtsstand vor diesem Dokumentationscommit: `9c2aede25dc964b3e78f44b7a75797110b03012a`. Der endgültige Übergabe-HEAD steht im beigefügten Abschlussnachweis.
- Browser-Prüfstand weiterhin `ebf6a4c3b58b2e73f08c0a1610308820cf49f479`; Produktbaum weiterhin `9492baf4589b47e60f5b3eb30666e65a054112f2`.
- Bei dieser Übergabe nochmals geprüft: 1’413 Dateiprüfsummen des vollständigen Nachweispakets, Basis-Bundle-Prüfsumme, Offline-Wiederherstellung bis `9c2aede`, identischer Produktbaum, sauberer Checkout und `git fsck --full`. Ein unvollständiger lokaler Entpackversuch wurde verworfen; die gespeicherten Archive sind intakt.
- **Nächster gezielter Schritt:** das gespiegelte Original-DOCX in Desktop-Word öffnen, speichern und neu laden; Fotoanker prüfen. LibreOffice verschiebt das Foto gegenüber dem XML von 155 mm auf ca. 111 mm. Keine globale Exportänderung aus diesem Einzelbefund ableiten.
- Keine neue Produktarbeit für die Übergabe. Nichts gepusht, gemergt oder veröffentlicht.

Dauerhafte Nachweise:

- [Vollständiger Prüfbericht](https://chatgpt.com/library?file_id=libfile_73375b3158cc8191a63c3976ec334a46&account_id=personal)
- [156 PDFs, Import-/DOCX-Nachweise und Delta bis 9c2aede](https://chatgpt.com/library?file_id=libfile_311b3087fb6481918d0b6ca9b7df9ab6&account_id=personal)
- [Erforderliche vollständige Basissicherung ab 881b96c](https://chatgpt.com/library?file_id=libfile_9ae0f7b81048819189c8adefcfc4ef6e&account_id=personal)

Der neue Abschluss-Delta enthält alle lokalen Commits ab der Basissicherung; zur Wiederherstellung genügt Basis plus Abschluss-Delta. Das grosse Nachweispaket wird für die Prüfdokumente benötigt.

---

# Vorheriger Handoff nach Fortsetzung — 28. Oktober 2026

Dieser Abschnitt ersetzt den alten nächsten Arbeitsauftrag weiter unten. Die Fortsetzung (`C 1h`, danach `Continue this chat`) ist bearbeitet. Nichts gepusht, gemergt oder veröffentlicht.

- Branch: `recovery/28okt-import-safety`; Checkout aktuell `/workspace/scratch/2349c07d0534/delta-restore-current`.
- Produktkorrekturen in `eff347b`: Sonne-Briefkopf begrenzt durch tatsächlichen Textbeginn; Studio-3-CV weiss nur bei echtem Bandkopf.
- QA-Suite in `ebf6a4c3b58b2e73f08c0a1610308820cf49f479`; danach nur dieser Dokumentationsstand. Produktbaum unverändert `9492baf4589b47e60f5b3eb30666e65a054112f2`.
- **Vollständiger neuer Matrixlauf am sauberen `ebf6a4c`: 156/156**, 39 Vorlagen × CV/Brief × ein-/zweiseitig. Zwei sequenzielle Shards; keine Wiederholungen, Auslassungen oder Flakes. 156 PDFs, 234 Seiten, 2’730 Rasterbereiche und 5’460 logische Felder ohne Befund. Dieser Lauf ersetzt den früheren gemischten Satz aus 148 alten und acht nachgeprüften Fällen.
- **Historische Importsuite: 70/70** am selben sauberen Commit. 67 originale SHA-256-gesicherte Projekte mit echtem Dateiimport, JSON-Download, Rückladen, 201 Editoröffnungen und vier Bild-Decodes. Drei aus dem freigegebenen Snapshot abgeleitete DOCX-Kontrollen: Basis, gespiegelte Sidebar, eingebetteter Legacy-Brief-Chrome.
- Drei tatsächlich heruntergeladene DOCX unabhängig geprüft: ZIP/XML/Beziehungen, A4, je 14 logische Felder und ein gewöhnliches CV-Foto ausserhalb von Content Controls. Alle bestanden. Keine Erweiterung der DOCX-Unterstützungsgrenze.
- LibreOffice erzeugt je drei Seiten. **Offener konkreter Befund:** im gespiegelten CV steht das Foto bei ca. 111 mm statt der im DOCX korrekt angeforderten 155 mm. PDF mit MuPDF und System-Poppler gegengeprüft. Basis und Legacy-Kontrolle zeigen diese Verschiebung nicht. Ein anfänglicher Verdacht auf verdeckten Kontaktkopf war eine falsche Sichtinterpretation und ist zurückgezogen; der Kopf ist auch im ursprünglichen PNG sichtbar.
- Desktop-Word-Speichern/Neuladen bleibt ungeprüft. Keine Word-Foto-Umgehung ohne konkreten Auftrag beginnen. Nächster sinnvoller Abnahmeschritt: tatsächliches gespiegeltes DOCX in Word öffnen/speichern/neuladen und Fotoanker vergleichen; keine globale Exportänderung aus dem LibreOffice-Befund ableiten.
- Der frühere seltene Modern-/Sidebar-Clone-Abbruch ist weiter nicht kausal geklärt; in diesen Läufen nicht aufgetreten.

Kompakte Nachweise: `docs/qa/evidence/matrix-historical-28okt.json`, `docs/qa/evidence/historical-docx-render-review-28okt.json`; reproduzierbarer historischer Lauf in `docs/qa/historical-import-28okt.md`.

Bericht und vollständiges Nachweispaket werden unter den bestehenden Dateinamen aktualisiert. Das Paket enthält den Delta-Bundle ab `881b96c`; die vollständige Basissicherung `CV-Cover-Charm-recovery-28OCT2026-checkpoint-1.zip` behalten. Frische Offline-Wiederherstellung einschliesslich Delta wird geprüft. Interne Screenshots/Seiten-PNGs gehören nicht zum Nachweispaket.

---

## Historischer Handoff vor dieser Fortsetzung

# Gezielter Handoff — CV Cover Charm, 28. Oktober 2026

## Auftrag und Haltelinie

Matthias ist am Handy. Er hat die Entwicklungsarbeit gestoppt und danach ausdrücklich verlangt: alles Lokale committen, dann einen gezielten Handoff. In diesem Übergabeschritt keine weiteren Produktänderungen oder langen Testläufe starten. Dieser Handoff wird als zusätzlicher Commit gesichert. Ein neuer Arbeitsauftrag soll im nächsten Chat erfolgen.

## Verbindlicher Ausgangspunkt

- Repository: `https://github.com/modebrecht/cv-cover-charm.git`.
- Aktueller Checkout: `/workspace/scratch/abfb168b500e/cv-cover-charm-published-recovery`.
- Branch: `recovery/28okt-import-safety`.
- Letzter Entwicklungs-/Prüfstand: `bf3a7062b33c94cd16f19a471cb71f16cd0f94bc`; danach kommt nur dieser Handoff-Commit.
- Produkt-Quellbaum: `40d3c8fed495a34f228f9d63758f50c2ba396c22`. Beim Start mit `git rev-parse HEAD:src` vergleichen.
- Sieben Wiederaufbau-Commits liegen vor dem Handoff lokal oberhalb `origin/dev` (`c63fc793a293c3925281a752bbf11e55a6428518`). Der Checkout war vor dem Handoff sauber.
- Kein Push, Merge oder Deployment ist autorisiert. `main`, `render` und das veröffentlichte `dev` nicht verändern; veröffentlichte Historie gemäss `AGENTS.md` nicht umschreiben.

Die früheren 41 unveröffentlichten Commits bis `436b8e6` wurden durch eine Workspace-Bereinigung entfernt. Sie sind nicht in diesem Checkout oder auf GitHub vorhanden. Die aktuelle Arbeit ist eine neue, teilweise Rekonstruktion. Nicht erneut den mobilen Nutzer um eine alte ZIP bitten und alte Testergebnisse nicht als aktuelle Abnahme übernehmen.

## Was tatsächlich fertig ist

1. Bild-erhaltender JSON-Import mit temporärem IndexedDB-Journal, exaktem Rohwert-Rollback, Wiederherstellung geladener Einstellungen, Startschutz vor Autosave und allen vier Ladewegen. Das aktive Dossier bleibt in localStorage. Auch gültige leere v1-Projekte bleiben ladbar.
2. Historische ungekapselte Cover-/CV-Dateien und Brief-Chrome-Migration beim vollständigen Restore. Beschädigte bekannte Datenstrukturen werden vor Schreibzugriffen abgewiesen.
3. Zehn zusätzliche PDF-Consent-Grenztests; aktuelle Menürollen, tatsächliches Image-Decoding, Ressourcenfehler und historische Ribbon-Transformationen sind abgedeckt.
4. Reproduzierter Georgia-zu-Cabin-Schriftwechsel im PDF-Clone behoben: gemessene Typografie wird auf eingefügte Zeilen-/Wort-Spans übernommen. Die Live-Editoren werden dadurch nicht verändert.

## Akzeptierte Nachweise — keine erneuten Läufe nur für den Handoff

| Bereich                                 | Ergebnis                                                        |
| --------------------------------------- | --------------------------------------------------------------- |
| Unit-Suite                              | 1’436 bestanden, 0 Fehler; 278 Dateien                          |
| Native Import-/Recovery-Fälle           | 25/25, ohne Wiederholungen                                      |
| PDF-Sicherheitskern                     | 49/49 nach Schriftkorrektur, ohne Wiederholungen                |
| Rasterfälle                             | 6/6, einschliesslich MonoLuxe mit eigener Georgia-Namensschrift |
| App-/QA-Typprüfung, Formatierung, Build | bestanden                                                       |
| ESLint                                  | 0 Fehler, 21 bestehende Warnungen                               |
| Unabhängige PDF-Prüfung                 | 14 PDFs, 23 A4-Seiten, 238 Markerrechtecke ohne Befund          |

Details und genaue getestete Commits stehen in `RECOVERY_STATUS_28OCT2026.md`, `docs/qa/evidence/reconstruction-28okt.json` und `docs/qa/evidence/reconstruction-28okt-pdf.json`. Die 80 Browserfälle sind drei getrennte, bestandene Läufe. Sie ersetzen keine vollständige Vorlagenmatrix. Die letzte Importänderung nach dem PDF-Lauf betraf nur gültige leere Projekte; die PDF-Quelldateien blieben identisch.

## Empfohlener nächster Arbeitsauftrag

**Zuerst die vollständige Web-/PDF-Vorlagenmatrix am bestehenden Quellbaum prüfen.** Noch keine neuen Features, kein DOCX-Umbau und keine gestalterische Überarbeitung beginnen.

Der frühere Ausdruck „78-Vorlagenlauf“ bedeutet hier 39 Vorlagen × zwei Dokumentarten (CV/Brief). Die vorhandene Suite prüft zusätzlich ein- und zweiseitige Szenarien: **156 `matrix`-Tests**, nicht 78 einzelne Tests. Boundary- und weitere Integrationstests sind zusätzliche Fälle.

Die Matrix steht in `tests/qa/pagination-2page.qa.ts`; Konfiguration: `tests/qa/playwright.integration.config.ts`. Die Liste zuerst kontrollieren, dann sequenziell in zwei begrenzten Shards laufen lassen. Je Shard eigene Berichtsdatei verwenden und Ergebnisse beider Shards zusammenführen; kein Teilresultat als gesamte Abnahme ausgeben.

```sh
playwright test --config tests/qa/playwright.integration.config.ts --grep 'matrix ' --list

PAGINATION_QA_DIR=artifacts/recovery-matrix \
PAGINATION_QA_REPORT=artifacts/recovery-matrix/shard-1.json \
playwright test --config tests/qa/playwright.integration.config.ts \
  --grep 'matrix ' --shard=1/2 --workers=1 --global-timeout=3300000

PAGINATION_QA_DIR=artifacts/recovery-matrix \
PAGINATION_QA_REPORT=artifacts/recovery-matrix/shard-2.json \
playwright test --config tests/qa/playwright.integration.config.ts \
  --grep 'matrix ' --shard=2/2 --workers=1 --global-timeout=3300000
```

Bei einem Fehler: zuerst genau den fehlerhaften Fall mit Fixture, Fehler, Source-SHA und Messwerten sichern. Einen Modern-/Sidebar-Clone-Fehler am echten fehlgeschlagenen Clone untersuchen; keinen anderen Export als Ersatzbeweis verwenden. Nach bestandener Matrix können `scripts/pdf_preflight_raster.py`, `scripts/pagination_qa_fields.mjs` und `scripts/pagination_qa_summary.mjs` die vorhandenen Nachweise prüfen. Alle Zähler und Vollständigkeit separat kontrollieren.

## Umgebung und Sicherung

- Bun 1.3.13, Playwright 1.56.1, Chromium 141.0.7390.37; lokaler Node 24.22.1. Abhängigkeiten gemäss `bun.lock`; Setup in `.github/workflows/dossier-import-recovery.yml`.
- Falls noch vorhanden: Playwright unter `/workspace/scratch/abfb168b500e/recovery-tools/node_modules/.bin/playwright`, Bun unter `/workspace/scratch/abfb168b500e/recovery-tools/node_modules/@oven/bun-linux-x64/bin/bun`. Bei fehlender Umgebung aus Workflow/Lockdatei neu installieren.
- Dauerhafte Sicherung im Ordner „CV Cover Charm“: `CV-Cover-Charm-recovery-28OCT2026-checkpoint-1.zip`. Der Handoff ist zusätzlich direkt im ZIP lesbar.
- Bei erneut fehlendem Checkout diese Sicherung über die Dateisuche holen. Offline-Restore mit dem enthaltenen `RESTORE.sh` in ein neues Verzeichnis. Ein blosses `git clone` des Bundles genügt wegen des flachen Ausgangscheckouts nicht; `shallow-boundaries` wird vom Skript berücksichtigt.
- Das Paket wurde durch Entpacken, Offline-Restore, identische HEAD-/Quellbaum-Werte, sauberen Checkout und `git fsck` geprüft. Ein lokaler Commit allein schützt nicht vor einer erneuten Workspace-Bereinigung.

## Danach weiterhin offen

Historische JSON-/DOCX-nach-Import-Matrix und weitere verlorene Änderungen systematisch rekonstruieren. Der aktuelle grosse Importtest prüft einen 2-MiB-Bilddatenstring; keine erneute 12-MiB- oder unbegrenzte Speicherzusage. Der seltene frühere Modern-/Sidebar-Clone-Abbruch ist nicht kausal geklärt. Desktop-Word-Speichern/Neuladen wurde nicht geprüft. Keine Migrationsarbeit an der permanenten Speicherarchitektur und keine Word-Foto-Umgehung ohne konkreten Auftrag beginnen.
