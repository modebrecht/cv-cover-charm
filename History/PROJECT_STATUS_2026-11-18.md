# CV Cover Charm – aktueller Arbeitsstand, 18.11.2026

Produktstand auf `dev`:
[`723d6cbc7cba88e9b0415144e91f46b1e91e58ba`](https://github.com/modebrecht/cv-cover-charm/commit/723d6cbc7cba88e9b0415144e91f46b1e91e58ba).
Diese Aktualisierung korrigiert Statusangaben und alte Prüfaufforderungen;
sie ändert den bestätigten Produktcode nicht.

## Keine aktuelle Aufgabe für den Benutzer

Die Word-Farben und das normale Klicken im Text wurden mit «ohja viel besser»
bestätigt. Der normale Dossier-Download entspricht bytegenau der bestätigten
Datei `02_Word_Farben_Klicken_FIX.docx`, SHA-256
`65f2f1168b3f7660bd977806859053222adb5983feb9832489b6b8d7acb6128c`.
Es wird keine erneute Abnahme dieses Fixes oder des älteren Pakets verlangt.

Die neue Variante mit zwei schmalen Body-Farbbändern ist Standard. Die alte
stabile Header-Variante bleibt ausschliesslich über den internen Parameter
`devCompactChromeInHeader: true` verfügbar. Keine UI-, URL- oder
Speicherverdrahtung. Der verworfene Versuch mit seitenhoher transparenter
Auswahlfläche ist kein Rückfall.

Ein nicht ausdrücklich beobachteter Save/Reopen-Lauf der neuen Bytes wird
weiterhin nicht als bestanden ausgegeben. Diese Nachweisgrenze blockiert die
weitere technische Arbeit nicht. Eine spätere manuelle Prüfanfrage benötigt
einen konkreten neuen Anlass, die exakt aktuelle Datei und eine Erklärung,
welches neue Verhalten noch unbekannt ist. Alte Checklisten allein sind kein
solcher Anlass.

## Automatische Prüfung abgeschlossen

Alle sechs Workflows auf dem genannten Produktstand sind erfolgreich:

| Workflow                   | Lauf                                                                                 | Ergebnis        |
| -------------------------- | ------------------------------------------------------------------------------------ | --------------- |
| Dossier Regression         | [44142442375](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142442375) | PASS, Versuch 2 |
| DOCX Next Stable Sidebar   | [44142442336](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142442336) | PASS, Versuch 2 |
| Template Contact Integrity | [44142442515](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142442515) | PASS            |
| Dossier Visual Parity      | [44142442481](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142442481) | PASS            |
| CV measured page fit       | [44142442321](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142442321) | PASS            |
| Pages build and deployment | [44142441441](https://github.com/modebrecht/cv-cover-charm/actions/runs/44142441441) | PASS            |

Die beiden ersten Fehlversuche bleiben dokumentiert:

- Dossier-Flow: 90 Fälle bestanden, ein Download-Timeout bei einem sehr langen
  Brief. Der einzelne unveränderte Test bestand lokal in 40,3 Sekunden;
  anschliessend bestand der gezielte CI-Wiederanlauf auf derselben SHA.
- Nativer Vergleich: Erfassung einer alten `gotoRange`-Diagnose nach drei
  begrenzten Importversuchen fehlgeschlagen. Der gezielte Job-Wiederanlauf
  bestand auf derselben SHA. Kein Renderer-Fix und keine schwächere Erwartung.

Die anderen erfolgreichen Jobs wurden nicht als neue lokale Tests ausgegeben.
Die optionalen Jobs `native-print-benchmark` und `app-body-content` wurden
übersprungen; sie zählen nicht als bestanden. Aktuelle Statusdaten mit IDs:
[CI-Nachweis](PROJECT_STATUS_2026-11-18/ci-summary.json).

## GitHub: 24 offene Issues, keine 24 Benutzeraufgaben

Die offene Liste wurde erneut gelesen. Ihre Oktobertexte enthalten historische
Sammelkriterien; daraus folgt weder eine neue Regression noch ein neuer
Prüfauftrag. Die Anzahl ist keine Prozentanzeige des Projektfortschritts.
[Inventar der 24 offenen Issues](PROJECT_STATUS_2026-11-18/open-issues.json).

| Issue                                                                                 | Erledigter Teil                                                                                                                                              | Verbleibender Umfang                                                                                                                  |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| [#201 Header/Footer](https://github.com/modebrecht/cv-cover-charm/issues/201)         | Gleiche volle Farben und brauchbare Klickansicht im bestätigten Modern-Sidebar-Fall; Standard und interner Rückfall geprüft                                  | Weitere Vorlagen/Motive und automatische Folgeseiten sind durch diesen einzelnen Fix nicht pauschal abgedeckt                         |
| [#203 Desktop Word](https://github.com/modebrecht/cv-cover-charm/issues/203)          | Aktueller Farb-/Klickfall bestätigt; normale Downloadbytes identisch                                                                                         | Vollständige Word-Matrix aller Layoutfamilien bleibt ein grösserer technischer Prüfbereich; kein Wiederholungsauftrag für diesen Fall |
| [#192 regulärer DOCX-Export](https://github.com/modebrecht/cv-cover-charm/issues/192) | Unterstütztes Modern/Sans/Sidebar-Profil verwendet bereits den normalen Download auf `dev`                                                                   | Keine Freigabe aller Vorlagen und keine Promotion nach `main` oder `render`                                                           |
| [#208 PDF-Preflight](https://github.com/modebrecht/cv-cover-charm/issues/208)         | Einmalige Bestätigung beim vollständigen einseitigen Brief, auch im Gesamtdossier. Seitenrandprüfung für Bildrahmen und freie CV-Elemente im Raster ergänzt. | Bei fehlenden, abgeschnittenen oder noch nicht geladenen Inhalten bleibt der Export gesperrt.                                         |
| [#204 Web/PDF](https://github.com/modebrecht/cv-cover-charm/issues/204)               | Cabin-CV behoben; letzte vollständige Galerie 39/39 Fälle, 115 PASS, 2 REVIEW, 0 FAIL bei 117 Seitenpaaren                                                   | Die beiden Foto-Kreisrand-REVIEW betreffen Terracotta-CV und Studio-3-CV; keine neue allgemeine Schriftprüfung erforderlich           |

Die übrigen Issues wurden hier inventarisiert, nicht neu vollständig geprüft
oder geschlossen. Breite Sammelissues bleiben offen, solange ihre tatsächlich
weitergehenden Kriterien nicht belegt sind. Ihre erledigten Teilbereiche
werden dadurch nicht erneut zur Benutzerabnahme gestellt.

## Fortsetzung von #208

Die frühere Zusammenfassung hat die schon vorhandene Bestätigung beim
Gesamt-PDF übersehen. Eine erneute Prüfung hat eine Lücke zwischen Vorschau
und Raster gezeigt. Der Export prüft jetzt Seitenränder während der
Rastererzeugung. Der [Produktvertrag und die Prüfergebnisse zum Gesamt-PDF](../docs/qa/pdf-dossier-advisory-2026-11-07.md)
halten das Verhalten fest. Die 24 Issues oben sind die Momentaufnahme vor
dieser Fortsetzung.

Nachweise:
[Word-Standard und interne Rückfalloption](../docs/qa/word-chrome-default-2026-11-17.md),
[bestätigter Klickfix](../docs/qa/word-body-click-fix-2026-11-17.md),
[Cabin-Abschluss](CABIN_CV_COMPLETED_2026-11-17.md),
[PDF-Freigabe beim Gesamtdossier](../docs/qa/pdf-dossier-advisory-2026-11-07.md).
