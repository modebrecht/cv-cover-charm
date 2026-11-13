# Historische Projektwiederherstellung: repräsentativer Prüfblock

Stand 13.11.2026 · [Issue #207](https://github.com/modebrecht/cv-cover-charm/issues/207)

Die Importprüfung ergänzt zwölf unveränderte historische Projekte um den
vollständigen Ablauf: bestätigter Dateiimport, Betreff-Autosave, Neuladen,
echter PDF-/JSON-Download, erneuter bestätigter Import in einen anderen
gespeicherten Stand und erneute Downloads. Zusammen mit den bisherigen Fällen
umfasst der Block 17 historische Originale und eine Modern-Sidebar-Kontrolle.
Die Anwendung und die 67 Originaldateien bleiben unverändert.

<!-- RESULTS:START -->
**Lokal bestanden: 50/50 Browserfälle** in 7,3 Minuten, ohne übersprungene, fehlgeschlagene oder wiederholte Fälle.

**18 vollständige Abläufe**: 17 unveränderte historische Originale und eine Sidebar-Kontrolle. **36 echte PDF-Downloads mit 124 Seiten**; sämtliche **62/62 Seitenpaare waren pixelgleich**.

Alle 18 Seitenübersichten wurden visuell geprüft. Sie zeigen die restaurierten Inhalte einschliesslich der Fortsetzungsseiten und der unterschiedlichen Kopffarben.

Der 40-mm-Fall ergibt im Browser 39,980 mm für die Inhaltsfläche; die Referenzüberschrift liegt im tatsächlich heruntergeladenen PDF bei 40,177 mm. Bei den getrennten PDF-Kopffarben beträgt die maximale Kanalabweichung 1 RGB-Stufe für den Brief und 0 für den CV (Grenze: 3).

| Fall | PDF-Seiten je Download | Pixelgleiche Paare |
| --- | --- | --- |
| historical Freundlich | 3 | 3/3 |
| historical Modern with custom margins and two references | 3 | 3/3 |
| historical long Modern legacy 115 percent | 3 | 3/3 |
| historical contact with 40 mm continuation | 4 | 4/4 |
| historical Brief without header | 3 | 3/3 |
| historical long Brief v2 115 percent | 3 | 3/3 |
| historical long Brief v3 115 percent | 3 | 3/3 |
| historical long Modern v2 115 percent | 3 | 3/3 |
| historical Neon with saved spacing | 5 | 5/5 |
| historical separate letter and CV chrome | 3 | 3/3 |
| historical Modern with 20 mm spacing | 3 | 3/3 |
| historical Brief with saved reading settings | 5 | 5/5 |
| historical Modern with 12 mm spacing | 3 | 3/3 |
| historical long Brief legacy 115 percent | 3 | 3/3 |
| historical Brief with portrait photo | 3 | 3/3 |
| historical Verlauf with saved reading settings | 5 | 5/5 |
| historical Modern with two CV pages | 4 | 4/4 |
| reviewed Modern Sidebar | 3 | 3/3 |

<!-- RESULTS:END -->

## Neue Fallfamilien

| Originale | Geprüfte Besonderheit |
| --- | --- |
| Modern und Brief, ursprünglicher 19.-Oktober-Batch, jeweils «Lang – 115 Prozent» | Alte Schrift-Doppelangaben und 1,15-fache Titelblatt-Schrift |
| Modern und Brief, Feedback v2, jeweils «Lang – 115 Prozent» | Gespeicherte Chrome- und Silbentrennungsoptionen |
| Brief, Spacing v3, «Lang – 115 Prozent» | Überarbeiteter CV und unveränderte Titelblattskalierung |
| Modern, Spacing v3, «Kontakt senkrecht» | 40 mm Fortsetzungsrand und auf Seite 2 platzierte Referenzen |
| Modern, «header-inline-unsynced» | Getrennte Brief-/CV-Kopf- und Fussfarben bei `sync: false` |
| Modern, «cv-spacing-settings» und «defaults-footer/override» | Gespeicherte 20-/12-mm-Fortsetzungsränder und 14-/18-px-Rubrikentitel |
| Brief und Verlauf, «cohort/*-saved» | Gespeicherte Leseeinstellungen und mehrseitige Dokumente |
| Brief, «no-header-proof» | Kanonische Einstellung ohne Kopfzeile trotz veralteter Brief-Aliase |

«115 Prozent» bezeichnet in diesen Originaldateien `cover.fontScale: 1.15`.
Eine zusätzliche 115-%-CV-Skalierung ist dort nicht gespeichert und wird durch
diese Prüfung nicht unterstellt. Die vollständige Cover-Struktur einschliesslich
Skalierung wird im JSON vor und nach dem Reimport verglichen.

## Einstellungen und sichtbarer PDF-Nachweis

- Beim 40-mm-Fall prüft der Browser die physische Oberkante der zweiten
  CV-Inhaltsfläche, den CSS-Wert `40mm`, den gespeicherten Schlüssel und den
  Referenztext. Der Report prüft zusätzlich die Referenzüberschrift auf der
  vierten Seite des tatsächlich heruntergeladenen PDFs. Ihre Textbegrenzung
  muss in der ersten Textzeile unter 40 mm liegen; die PDF-Schriftmetriken
  werden dabei nicht mit der Oberkante der Inhaltsfläche verwechselt.
- Beim nicht synchronisierten Farbfall bleiben alle drei Chrome-Konfigurationen
  getrennt erhalten. Der Report misst die tatsächlichen PDF-Kopffarben für
  Brief und CV. Die maximale Kanalabweichung darf wie beim bestehenden
  Hintergrundnachweis 3 RGB-Stufen betragen.
- Der PDF-Suchtext enthält jetzt sämtliche Titel, Orte und Beschreibungen der
  Schul- und Praxiseinträge sowie sämtliche Referenzangaben. Leerraum,
  weiche Trennzeichen und Zero-Width-Spaces werden für diesen Textvergleich
  normalisiert; sichtbare Bindestriche bleiben erhalten.
- Alle vollständigen A4-Seiten vor und nach Reimport werden bei 90 DPI
  ohne Masken und ohne Glättung auf exakte RGB-Gleichheit verglichen.

Alte Schrift-Aliase werden nur für die ausdrücklich benannten Dateien erwartet:
Die bestehende Dossier-Synchronisierung übernimmt den expliziten CV-Wert
`sans`; Brief normalisiert seinen ungenutzten `fontOverride` auf `null`.
Der Browser prüft die wirksame Briefschrift vor und nach Reimport. Beim
getrennten Farbfall wird das alte `icons` in allen drei Chrome-Blöcken als
`dot` gespeichert. Die kanonische Brief-Konfiguration wird in die älteren
Brief-Aliase projiziert. Der übrige Designvergleich bleibt vollständig erhalten.

Der erste vollständige lokale Lauf endete mit 49/50 bestandenen Fällen.
Beim Fall ohne Kopfzeile fehlte in der Testerwartung die bereits bestehende
Projektion von `chrome.shared.headerContinuationMode: none` in den alten
Briefdesign-Alias. Die kanonische Einstellung blieb erhalten. Die Erwartung
erlaubt genau diesen zusätzlichen Alias für genau diese Originaldatei; der
abschliessende Gesamtlauf erfolgt mit dieser korrigierten Erwartung.

## Zuordnung zu #207

| Akzeptanzkriterium | Vorhandener Nachweis und Grenze |
| --- | --- |
| Historische und aktuelle Strukturen inventarisieren | 67 unterschiedliche Originale mit fixierten SHA-256 im historischen Katalog; aktuelle und ältere Formate in der Importprüfung |
| Bestätigten UI-Import und verlustfreie Daten/Einstellungen prüfen | 17 Originale und Sidebar-Kontrolle; Daten aller drei Teile, Medien/Crops, Designs, Ränder, Schrift und Chrome; separate Fälle für freie Elemente und CV-Seitenzuordnung |
| Save/Reload, PDF/DOCX und erneuten JSON-Import prüfen | Vollständige PDF-/JSON-Abläufe; zwei echte DOCX-Downloads im freigegebenen Sidebar-Kontrollfall mit Vergleich sämtlicher Paketbestandteile und Bildbeziehungen |
| Ungültige/zu neue Daten verständlich ablehnen und alten Stand erhalten | Bestehende Import-, Rollback-, IndexedDB-, Sperr- und Wiederherstellungsfälle laufen im selben Browserlauf |

Die historischen Dateien ohne gespeicherte freigegebene Sidebar-Auswahl behalten
ihre Entwürfe und zeigen vor sowie nach Reimport die bestehende DOCX-Beschränkung.
PDF und JSON bleiben dabei verfügbar. Dieser Block erweitert den freigegebenen
DOCX-Umfang nicht.

Die Kriterien verlangen repräsentative historische Projekte. Die übrigen
50 Originale aus dem 67er-Katalog müssen für diesen abgegrenzten Prüfblock
nicht sämtlich um denselben PDF-Ablauf ergänzt werden. Der frühere JSON-Restore-
Nachweis für den vollständigen Katalog ist separat dokumentiert.

## Reproduktion und Nachweise

```sh
playwright test --config tests/qa/playwright.import-recovery.config.ts
python scripts/historical_roundtrip_report.py
```

Die lokale Anwendung entspricht `e3fd26a` mit den hier beschriebenen
uncommittierten QA-Änderungen. Die lokalen Dateien kennzeichnen dies ausdrücklich
mit `sourceDirty: true`. CI protokolliert den geprüften Commit und Dirty-Status
erneut und verwendet Pillow 11.3.0 sowie PyMuPDF 1.26.4. Der Report verzeichnet
auch die tatsächlich verwendeten Render-Versionen.

Pro Ablauf liegen Originalpfad/-Hash, Download-Hashes, JSON, PDF und
`roundtrip-evidence.json` im Browser-Ausgabeordner. Der unabhängige Python-Report
prüft die Hashes erneut und schreibt Seitenbilder, Übersichten und
`artifacts/import-recovery/comparison/report.json`. Der Import-CI lädt diese
Dateien gemeinsam mit dem Browserbericht hoch.

Der Vergleich belegt Wiederherstellungskonsistenz für die gewählten Fälle.
Eine allgemeine visuelle Gleichheit mit historischen Word-Dateien und
Speichern/Wiederöffnen in Microsoft Desktop Word sind damit nicht abgenommen.
Die beiden Kreisrand-REVIEWS für Terracotta und Studio 3 bleiben separat offen.

Nach diesem Block stehen die konkrete Desktop-Word-Abnahme und die bestehenden
Kreisrand-REVIEWS an. Eine weitere allgemeine historische Inventur ist dafür
nicht nötig.
