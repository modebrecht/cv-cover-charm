# Dossier-Import mit erneutem Export

Stand 03.11.2026 · [Issue #207](https://github.com/modebrecht/cv-cover-charm/issues/207) · Prüfstufe für zwei repräsentative Dateien

Geprüfter Testcommit [`03a5e9fc0776`](https://github.com/modebrecht/cv-cover-charm/commit/03a5e9fc077649ae8002a4c9b8ac52c0ad4a7d0f). Zwei Fälle ergänzen `tests/e2e/dossier-import-recovery.spec.ts` im bestehenden Import-Workflow. Der Produktcode blieb unverändert.

| Projektdatei | PDF und JSON | DOCX |
| --- | --- | --- |
| `tests/fixtures/import/modern-sidebar-from-23okt.json` | Bestätigter Import, Editor-Autosave, Neuladen und erneuter Export aus heruntergeladenem JSON | Beide Downloads enthalten drei Dossierteile, Referenztext, Kopf- und Fusszeilenreferenzen und die auflösbare Bildbeziehung zum zugeschnittenen CV-Foto |
| `docs/qa/docx-next-design-fidelity-16okt/audit/freundlich/project.json` | Derselbe Ablauf mit unveränderter historischer Datei aus dem 67er-Katalog | Dialog zeigt vor und nach dem Reimport die erwartete Word-Beschränkung. PDF und JSON sind weiterhin verfügbar. |

Der Test vergleicht alle drei importierten Nutzdatenblöcke, den im Editor gespeicherten Betreff und die PDF-Seiten mit Suchtext und gerenderten Bildobjekten. Beim Modern-Profil werden auch CV-Sidebar, Bildstil, Bildplatzierung und Dossier-Chrome verglichen. Die Originaldateien sind per SHA-256 fixiert.

Beim erneuten JSON-Export wird `savedAt` neu gesetzt. Der Import ergänzt im älteren Briefdesign fünf aus der kanonischen Kopf- und Fusszeilenkonfiguration abgeleitete Werte. Die Prüfung erlaubt genau diese kanonischen Ergänzungen. Ein leerer Seitenrand-Block und der automatische CV-Rubrikenabstand dürfen im JSON entfallen.

## Ergebnisse

- GitHub Actions auf dem Testcommit: **31/31 Browserfälle** und **1’513 Unit-Tests** bestanden, ebenso Typen, Lint und Build. [Importlauf 41699090472](https://github.com/modebrecht/cv-cover-charm/actions/runs/41699090472) · [Downloads und Browserbericht](https://github.com/modebrecht/cv-cover-charm/actions/runs/41699090472/artifacts/13262458495)
- Lokal Chromium 140 mit Liberation Sans, **31/31 Browserfälle** in 116,8 Sekunden. Keine Ausfälle, Wiederholungen oder übersprungenen Fälle. 1’513 Unit-Tests, TypeScript, Lint der Testdatei und Produktionsbuild bestanden.
- Vier echte PDFs mit jeweils drei Seiten. Alle sechs Vorher-/Nachher-Paare bei 90 DPI gerendert und visuell geprüft. Die Pixel waren pro Paar identisch. Beide Titelblätter, Anschreiben und Lebensläufe waren sichtbar. Beim Modern-CV war das synthetische Foto sichtbar.
- Die beiden Modern-DOCX-Dateien waren lokal bytegleich. SHA-256 `51c65760b336c90da14df2a984a52f3b64a99a690f497e0350e260b48508933b`.
- SHA-256 des lokalen Browserberichts `b36c053803cc1f86b2dbec660c9383b90b99b313d521a8feab80fa7e5f5da3de`.

Der Nachweis deckt diese beiden Projekte und den vorhandenen Modern-Word-Guard ab. Die übrigen historischen Varianten und eine allgemeine Word-Freigabe liegen ausserhalb dieser Stichprobe. Der DOCX-Nachweis prüft den Paketinhalt.

## Ergänzung vom 09.11.2026

Die Import-Regression enthält jetzt drei vollständige Wiederherstellungsfälle.
Der dritte verwendet das unveränderte [Projekt «Modern – Eigene Werte und Referenzen» vom 19. Oktober](docx-next-word-feedback-19okt-v2/05-Modern-Eigene-Werte-Referenzen-project.json)
aus dem historischen Katalog. Es enthält Brief- und CV-Ränder, explizit
gespeicherte Kopf- und Fusszeileneinstellungen und zwei Referenzen. Eine
Referenz enthält eine Telefonnummer, die andere eine E-Mail-Adresse.

- Die Originaldatei ist im Katalog per SHA-256 fixiert. Der Test bestätigt den
  echten Dateiimport und prüft anschliessend die Inhalte aller drei Teile.
- Ein geänderter Briefbetreff übersteht Autosave, Neuladen, PDF- und JSON-Export
  sowie einen weiteren bestätigten Import in einen anderen gespeicherten Stand.
- Der JSON-Export erhält die separaten Ränder einschliesslich 1 mm CV-Fussrand,
  die gespeicherten Chrome- und Briefdesignwerte und beide Referenzen. Beide
  Referenzen sind auch im PDF-Suchtext vollständig nachweisbar.
- Beim lokalen Vergleich waren Titelblatt, Brief und CV im PDF vor und nach dem
  Reimport sichtbar. Jedes der drei A4-Seitenpaare war bei 90 DPI pixelgleich.
- Der historische Stand hat keine gespeicherte Sidebar. Der Dialog zeigt die
  erwartete DOCX-Beschränkung und ermöglicht PDF und JSON.

Beim bestehenden Freundlich-Fall prüft der Test jetzt zusätzlich die alten
Briefdesignwerte. Die bisherige Migration von `icons` zu `dot` im Kopfbereich
wird ausdrücklich erwartet.
