# CV Cover Charm — Wiederaufbau vom 28. Oktober 2026

Codeprüfstand: `6b7eb58af3d3c06c4c084ff8c616957390d227d1`. Quellbaum: `40d3c8fed495a34f228f9d63758f50c2ba396c22`. Arbeitsbranch: `recovery/28okt-import-safety`. Ausgangspunkt ist der veröffentlichte Stand `c63fc79`.

Die 41 früheren lokalen Commits bis `436b8e6` wurden durch die Workspace-Bereinigung entfernt. Dieser Stand rekonstruiert bekannte Änderungen; er ist keine vollständige Wiederherstellung jener Commits. Frühere Testergebnisse gelten nicht automatisch für diesen Quellbaum. Der mobile Nutzer muss keine alte ZIP bereitstellen: mit diesem Repository und der geprüften Sicherung weiterarbeiten.

## Wiederhergestellt und neu geprüft

- JSON-Import auf Übersicht, Titelblatt, Lebenslauf und Anschreiben mit vollständiger temporärer IndexedDB-Sicherung, einschliesslich Fotos und exakter Rohwerte. Das aktive Dossier bleibt in localStorage.
- Rücksetzung bei Schreibfehlern, auch bei intern abgefangenen Einstellungsfehlern. Bereits geladene Foto-, Typografie-, Layout- und Chrome-Zustände werden zurückgesetzt. Ein unvollständiger Rollback behält die Sicherung und blockiert die Editoren bis zur Wiederherstellung.
- Startschutz vor Editor-Autosave, Unterscheidung unterbrochener und abgeschlossener Importe, Sperre zwischen importierenden Fenstern. Erfolgreiches Laden aktualisiert den Editor durch Neuladen.
- Historische ungekapselte Titelblatt-/CV-Dateien; Übernahme eingebetteter Brief-Kopf-/Fusszeilen beim vollständigen Restore. Explizite Projekt-Einstellungen haben Vorrang. Gültige leere v1-Projekte bleiben ladbar. Beschädigte bekannte Datenstrukturen und fremde Projektformate werden vor dem Schreiben abgewiesen.
- Zehn zusätzliche PDF-Bestätigungsprüfungen. Aktuelle Menürollen, tatsächliches Bild-Decoding und fehlgeschlagene Schriftressourcen sind abgedeckt. Der Ribbon-Negativtest prüft zuerst die reparierte Geometrie und injiziert dann die historischen fehlerhaften Transformationen.
- Tatsächlich reproduzierter PDF-Schriftfehler behoben: Bei MonoLuxe wurde ein bewusst in Georgia gesetzter Name durch neu eingefügte Raster-Spans zu Cabin. Der Export-Clone übernimmt nun die zuvor gemessenen Schriftwerte. Schriftfamilie, Schriftgrösse, Zeilen und Markerpositionen bleiben innerhalb der bestehenden Geometrietoleranz.

## Aktuelle Prüfungen

| Prüfung                                | Ergebnis                                                  |
| -------------------------------------- | --------------------------------------------------------- |
| Gesamte Unit-Suite                     | 1’436 bestanden, 0 Fehler; 278 Dateien, 27’145 Assertions |
| Native Import-/Wiederherstellungstests | 25/25, keine Wiederholungen                               |
| PDF-Sicherheitskern                    | 49/49 nach der Schriftkorrektur, keine Wiederholungen     |
| Rasterfälle                            | 6/6, einschliesslich MonoLuxe mit eigener Namensschrift   |
| App-/QA-Typprüfung, Formatierung       | bestanden                                                 |
| ESLint                                 | 0 Fehler, 21 bestehende Warnungen                         |
| Produktionsbuild                       | bestanden                                                 |
| Unabhängige PDF-Prüfung                | 14 PDFs, 23 A4-Seiten, 238 Markerrechtecke ohne Befund    |

Die PDF-Prüfung kombiniert logischen Inhalt, kontrastreiche Rastertinte an kanonisch gemessenen Markerstellen und Sichtprüfung ausgewählter Seiten. Sie ist kein vollständiger Pixelvergleich. Die beiden neuen Brief-Downloads enthalten alle neun Marker und beide vollständigen Textabsätze; ihre Seitenraster bleiben vor/nach der Schriftkorrektur identisch.

Die PDF-/Rasterläufe wurden bei `1c504e4` geprüft. Danach änderte sich im Produktcode ausschliesslich die Annahme gültiger leerer Projekte im Importer; der letzte Importlauf und alle Qualitätsprüfungen wurden bei `6b7eb58` wiederholt. Die PDF-Quelldateien sind identisch. Details: [Prüfprotokoll](docs/qa/evidence/reconstruction-28okt.json) und [PDF-Nachweise](docs/qa/evidence/reconstruction-28okt-pdf.json).

## Reproduktion und Sicherung

Die neue CI-Datei `.github/workflows/dossier-import-recovery.yml` enthält die gesperrten Abhängigkeiten und Browserinstallation. Browserbefehle nach dieser Einrichtung:

```sh
playwright test --config tests/qa/playwright.import-recovery.config.ts
PAGINATION_QA_DIR=artifacts/pdf-core-recovery playwright test --config tests/qa/playwright.preflight-core.config.ts
playwright test --config tests/qa/playwright.preflight.config.ts --grep 'raster clone|dark authored'
```

Die normale Preflight-Konfiguration behält alle Rasterfälle. Der separate Kernlauf ersetzt keine vollständige Abnahme. Die ZIP-Sicherung enthält Quellcode, lokale Commits, Nachweise und `RESTORE.sh`. Da der Ausgangscheckout flach geklont ist, muss beim Offline-Restore die beigelegte Datei `shallow-boundaries` berücksichtigt werden; ein gewöhnliches `git clone` des Bundles reicht nicht. Das beigefügte Restore-Skript prüft nach Wiederherstellung HEAD, Quellbaum und Git-Objekte. Ein lokaler Commit allein gilt hier nicht als dauerhafte Sicherung.

## Nächste Arbeit

1. Den vollständigen 78-Vorlagenlauf mit dem rekonstruierten Quellbaum erneut ausführen. Den früheren seltenen Modern-/Sidebar-Clone-Abbruch weiter untersuchen; der frühere hängende Rasterlauf trat bei den sechs heutigen Fällen nicht erneut auf.
2. Weitere verlorene JSON-Altfixture- und DOCX-nach-Import-Prüfungen anhand vorhandener Projektdateien rekonstruieren. Der grosse heutige Backup-Test verwendet einen 2-MiB-Bilddatenstring; ältere 12-MiB-Ergebnisse werden nicht übernommen.
3. Die weiteren verlorenen Änderungen systematisch abgleichen, insbesondere verbleibende Font-/Schärfe- und Export-Diagnostik. Desktop-Word-Speichern/Neuladen bleibt offen.

Es wurde nichts gepusht, zusammengeführt oder veröffentlicht. `main`, `render` und das veröffentlichte `dev` bleiben unangetastet.
