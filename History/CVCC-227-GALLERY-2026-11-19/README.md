# #227 · 39 Vorlagen mit belegtem DOCX-Status

Der Visual-Parity-Workflow erfasst pro Vorlage die sichtbaren Web-Seiten, einen regulären PDF-Download und den DOCX-Status aus demselben gespeicherten Entwurf. Die einzelnen Vergleiche verwenden jeweils dieselben Dokumente, Chrome- und Foto-Einstellungen. Modern erhält das unterstützte Sans/Sidebar-Profil. Der interne Brief-Prüfexport verwendet Sans mit klassischem CV.

| DOCX-Status                   | Bedeutung                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Regulärer Export              | Die Browserprüfung lädt das Dossier über das normale Menü herunter.                                                          |
| Erwartete Sperre              | Die Prüfung bestätigt den deaktivierten DOCX-Eintrag und den konkreten Vorlagenhinweis im Menü. PDF und JSON sind verfügbar. |
| Interner Prüfexport           | Die Prüfung verwendet den vorhandenen Brief-Prüfexport. Die reguläre Sperre wird ebenfalls beobachtet.                       |
| Prüfexport nicht eingerichtet | Für diesen Vorlagenfall werden die drei Web/PDF-Seiten und der reguläre DOCX-Status berichtet.                               |

Der Bericht enthält die Eingabeprüfsumme jedes Falls und die Prüfsummen der vorhandenen DOCX-Pakete. Fehlende Web/PDF-Dateien, nicht erfasste Vorlagen, unerwartete DOCX-Dateien oder ein anderer Quellcommit lassen die Auswertung scheitern. Die Übersicht führt LibreOffice-Scores für regulären Download und internen Prüfexport getrennt. Bei fehlendem DOCX bleiben die Scores leer.

## Geprüfter Stand

**39/39 Browserfälle**, 117 Web/PDF-Seitenpaare, **ein regulärer DOCX-Download, 38 beobachtete Sperren und ein interner Prüfexport**. Die beiden DOCX-Dateien ergeben in LibreOffice sechs A4-Seiten für den Vergleich. Der Web/PDF-Mittelwert beträgt 0,993 RGB-SSIM. Die DOCX-Abdeckung bleibt **PARTIAL**.

Der lokale Volllauf verwendet Produktstand `228b12d` mit dem hier versionierten QA-Code. Die Auswertung verarbeitet die Browser-Artefakte in zehn Paketen. Fünf Gegenproben mit falschem Commit, fehlendem Paket, fehlendem oder unerwartetem DOCX und falscher DOCX-Prüfsumme werden abgelehnt. TypeScript, ESLint und die Workflow-Syntax wurden geprüft. [Messwerte und Prüfprotokoll](report.json)

## Sichtbare Abweichung

Der reguläre Modern-DOCX rendert im geprüften Kurzfall in LibreOffice auf drei A4-Seiten. Die Sidebar-Fläche ist in Web und App-PDF farbig, im Writer-Render hat die Sidebar dieselbe Hintergrundfarbe wie der Hauptbereich. Im unteren, textfreien linken Bereich liegen die häufigsten RGB-Werte bei 246/239/240 im Web, 245/239/239 im App-PDF und 250/250/250 in Writer. Der rechte Writer-Bereich hat ebenfalls 250/250/250. Der Vergleich zeigt den Unterschied in Writer. Ob und wie Word Desktop die Fläche zeichnet, bleibt offen. [Modern im direkten Vergleich](modern-comparison.jpg)

Beim internen Brief-DOCX bleiben die zuvor dokumentierten Unterschiede bei Kopf- und Fussbändern sowie Abständen sichtbar. [Brief-Prüfung](../CVCC-227-BRIEF-2026-11-19/README.md)

## Reproduktion

Der Workflow `Dossier Visual Parity` verwendet dafür `qa_suite=gallery`. Ein vollständiger lokaler Lauf nutzt dieselbe Testkonfiguration. Playwright 1.56.1 und Chromium 141 entsprechen der bestehenden Web/PDF-Fotogalerie. Der bisherige Modern-Smoke-Modus verwendet weiterhin seinen Playwright-Stand.

```sh
DOSSIER_VISUAL_PARITY_DIR=artifacts/parity-source/gallery \
  playwright test --config tests/qa/playwright.web-pdf-gallery.config.ts
python scripts/dossier_visual_parity.py \
  --batch-dir artifacts/parity-source/gallery \
  --sha "$(git rev-parse HEAD)" \
  --out-dir artifacts/dossier-visual-parity-39
```

Für einzelne CI-Teile setzt der Workflow `DOSSIER_VISUAL_PARITY_BATCH_INDEX` von 0 bis 9 und übergibt die zehn Verzeichnisse gemeinsam an die Auswertung. Die Auswertung erwartet 39 eindeutige Vorlagen und prüft den Git-Stand jedes Teilpakets.
