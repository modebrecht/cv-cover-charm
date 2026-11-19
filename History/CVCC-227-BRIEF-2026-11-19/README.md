# #227 · Web, PDF und DOCX für «Brief»

Geprüfter Produktstand `b2024ae1575e053e055e5d5a05c5f392b8283361` auf `dev`, 19.11.2026. Erster gezielter Vergleich ausserhalb von Modern. Die bestehende Galerie dient als Referenz für Web/PDF.

## Ergebnis

| Fall                                                  | Web und App-PDF                                                                      | Interner Brief-DOCX-Prüfexport                                                                            | Regulärer DOCX-Download |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ----------------------- |
| Kanonische Foto-Fixture, «Freundlich»                 | Drei A4-Seiten, identische gemessene Text- und Bildgeometrie in Web und PDF-Vorschau | BLOCKED. Die Schriftprüfung lehnt den Titelblock `eyebrow` ab. Die Prüfung des Exportpfads verlangt Sans. | BLOCKED                 |
| Dieselbe Fixture mit Sans in Titelblatt, Brief und CV | Drei A4-Seiten, identische gemessene Text- und Bildgeometrie in Web und PDF-Vorschau | REVIEW. Das bearbeitbare Paket rendert in LibreOffice Writer auf drei A4-Seiten.                          | BLOCKED                 |

Die beiden Browserfälle verwenden die gleiche Galerie-Fixture mit künstlichem Testfoto. Beim Sans-Vergleich verwenden alle drei Formate denselben gespeicherten Entwurf. Der PDF-Download läuft über das normale Dossiermenü. Der DOCX-Prüfexport verwendet `createSavedBriefDocxNext()` mit dem vorgesehenen QA-Schalter. Beide Läufe prüfen den deaktivierten normalen DOCX-Download. Gespeicherte Dokumente und Bildoptionen bleiben während der Word-Erzeugung erhalten.

Der Sans-Vergleich bestätigt 81 sichtbare, eindeutige Web-Textzeilen in Writer (16 Titelblatt, 18 Brief, 47 CV, normalisiert nach Grossschreibung und Leerzeichen). Das DOCX-Paket enthält 80 Inhaltssteuerelemente und drei Abschnitte. Brief und CV aus dem App-PDF enthalten ebenfalls alle geprüften Web-Zeilen. Das Titelblatt im App-PDF ist gerastert und wurde visuell geprüft.

| Seite      | Sichtbarer Befund im Writer-Render                                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titelblatt | Inhalt, Fotoausschnitt und Platzierung sind im direkten Vergleich nah beieinander.                                                                                                                                          |
| Brief      | Die gezeichneten Kopf- und Fussbänder fehlen. Statt des Fussbands erscheint der Name als Textfusszeile. Der Beginn der Anrede liegt ca. 8,9 mm tiefer, die Grusszeile ca. 12,9 mm. Basis sind die jeweiligen PDF-Textboxen. |
| Lebenslauf | Kopf- und Fussband fehlen auch hier. Rubriken, Linien und Abstände unterscheiden sich. Die Referenzperson liegt ca. 18,3 mm tiefer. Das CV-Foto bleibt rund, ist in Writer etwa 34 mm breit und im Web etwa 31,8 mm.        |

[Web, App-PDF und Writer im direkten Vergleich](brief-web-pdf-writer.webp) · [Messwerte, Dateihashes und 39er-Katalog](report.json)

## Stand der 39 Vorlagen

Der aktuelle CI-Katalog zählt **1/39 regulär zulässige Dossiervorlagen (Modern/Sans/Sidebar) und 38 gesperrte**. Die Freigabeprüfung allein belegt keine Layouttreue. Im Modern-Smoke-Lauf bestehen die regulären Originale für Titelblatt und Brief. Beide Original-CVs mit Foto und 18/19 Einträgen sind dort als FAIL dokumentiert. Die getrennten QA-Kandidaten bestehen diese Vergleichsfälle. Der grüne Workflow bestätigt damit die erwarteten Prüfergebnisse.

Der vollständige Web/PDF-Bericht von `e816f95` bleibt bei 115 PASS, 2 REVIEW, 0 FAIL auf 117 Seitenpaaren. Die aktuelle Prüfung trägt für «Brief» einen ergänzenden DOCX-Prüfexport und eine konkrete Einschränkung der Standardschrift bei. Desktop Word und Save/Reopen waren in diesem Lauf nicht abgedeckt.

Der Workflow bezeichnet seinen 39er-Modus als Legacy. Sein DOCX-Skript öffnet auf diesem Stand jedoch dasselbe reguläre Dossiermenü und erwartet dort einen aktiven DOCX-Schalter für alle Fälle. «Brief» ist Fall 1 und wird in beiden geprüften Varianten ausdrücklich vom Produktmenü abgewiesen. Vor einem vollständigen Lauf sollte der Modus je Vorlage den tatsächlich verfügbaren Exportpfad und eine erwartete Sperre ausweisen.

[CI-Katalog und Modern-Smoke](https://github.com/modebrecht/cv-cover-charm/actions/runs/44530696918) · [Früherer 39er-Web/PDF-Bericht](../CABIN_CV_COMPLETED_2026-11-17/gallery-ci-e816f95.json) · [Issue #227](https://github.com/modebrecht/cv-cover-charm/issues/227)

## Reproduktion

Auf dem oben genannten Produktstand in einer lokalen Arbeitskopie mit installierten Projektabhängigkeiten und Playwright 1.56.1 / Chromium 141:

```sh
git apply --unidiff-zero History/CVCC-227-BRIEF-2026-11-19/brief-probe.patch
CVCC_227_FONT=default playwright test --config tests/qa/playwright.web-pdf-gallery.config.ts
CVCC_227_FONT=sans playwright test --config tests/qa/playwright.web-pdf-gallery.config.ts
soffice --headless --convert-to pdf --outdir artifacts/cvcc227-brief-sans/writer artifacts/cvcc227-brief-sans/01-Brief.docx
```

Beide Browserfälle bestanden ohne Retry. Sie speichern Webbilder, echten App-PDF-Download, DOCX-Entscheid, gemeinsame Eingaben und Geometrie unter `artifacts/cvcc227-brief-*`. Der ergänzende Render stammt aus LibreOfficeDev 26.8.0.0.alpha0, Build `2c87e51e`. Der Patch ist ein lokal anwendbarer Reproduktionsbeleg.
