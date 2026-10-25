# DOCX Next – 12 frische Abnahme-Dossiers / Abschluss Cover-Testregressionen (21.10.2026)

**Arbeitsbranch:** `fix/docx-next-shared-fidelity-18okt`  
**Geprüfte Ausgangsbasis:** `097629906ece14235418ce40433bca124ca7d487` nach PDF-Fix `ad3e0161`.  
**Status:** Automatische QA **PASS**, Desktop-Word-Abnahme **OFFEN**; kein Merge oder Deployment.

## Änderungen in dieser Runde

- Vier vormals fehlgeschlagene Cover-Tests an die inzwischen gültigen und durch Produktionscode belegten Regeln angeglichen: Inhaltsanpassung statt künstlich voller Badge-Breiten, Quelldaten-Geometrie bleibt erhalten, gültige nichtquadratische Kreise/Fotorahmen, getrennte Schutzprüfung für transparente Schrift auf Dekoration. Keine globalen Schutzprüfungen entfernt.
- Drei zwischenzeitlich aufgetretene Fehler des neuen Initialen-Platzhalters behoben: `afterMm: 0` am nativen Fotobox-TableBlock ohne Sonderfreigabe blockierte den normalen DOCX-Renderer. Diese überflüssige Null-Abstandsangabe entfernt; die editierbaren Initialen und die gespeicherte Position bleiben erhalten.
- Kein Eingriff in JSON-Import, Projektmigrationen, `main`, `dev`, `render`, Native Sidebar oder Standardexport.

## Automatisierte Ergebnisse

| Prüfung | Ergebnis |
| --- | --- |
| Vollständige Unit-Suite | **1’279 PASS, 0 FAIL** in 262 Dateien |
| Gezielte Cover- und Platzhaltertests | **63 PASS, 0 FAIL** |
| TypeScript | **PASS** |
| Produktions-Build | **PASS** |
| Frische App-Exporte, DOCX + PDF | **12/12 PASS** |
| Projekt speichern/laden und Zustandsstabilität | **12/12 PASS** |
| UI-DOCX-Download bytegleich zum generierten Export | **12/12 PASS** |
| Archiv-/DOCX-Integrität | Bei der finalen Paketbildung separat geprüft |
| Desktop-Word, Bearbeiten/Speichern/Wiederöffnen | **UNVERIFIED** |

## Gelieferte Matrix (neu exportiert nach dem PDF-Fix und der Cover-Folgänderung)

| Fall | Vorlage | CV-Seiten Web | Besonderheit |
| --- | --- | ---: | --- |
| 01 | Modern | 1 | Rubrik-Pillen, Sprachzeilen, Referenzen |
| 02 | Modern | 2 | Umbrüche und Folgerand |
| 03 | Modern | 1 | Waagrechter Kontakt |
| 04 | Modern | 2 | Senkrechter Kontakt, Referenzen auf Seite 2 |
| 05 | Modern | 1 | Eigene Werte und Referenzen |
| 06 | Modern | 1 | Foto mit Zoom/Ausschnitt |
| 07 | Modern | 1 | Lang und 115 % |
| 08 | Brief | 1 | Zweite repräsentative Familie |
| 09 | Brief | 1 | Lang und 115 % |
| 10 | Brief | 1 | Hochformat-Foto |
| 11 | Brief | 1 | Einseitenaktion, Sprache und Listen |
| 12 | Brief | 2 | Zweiseitenaktion, Umbrüche |

Pro Fall: echte Browser-App-Wiederherstellung aus gespeicherten Projektdaten, DOCX-Ausgabe durch den bestehenden Testpfad, **produktiver App-PDF-Export** in lokaler Testumgebung, Cover-/Letter-/CV-Screenshots, Projekt-JSON und maschinenlesbarer Nachweis. Dateien der vorherigen Batches sind **keine Abnahmegrundlage**.

Die CV-Screenshots aus dem zweiten Neu-Export sind in allen 12 Fällen pixelidentisch zum ersten Neu-Export vom selben Tag. Kein künstlicher Vergleich durch alte DOCX-/PDF-Dateien.

## Grenzen und Word-Akzeptanz

Das moderne Rubrik-PDF-Schattenartefakt wurde zuvor auf der bestehenden Live-Website reproduziert und im html2canvas-Klon gezielt korrigiert. Es gibt weiterhin keinen Produktivdeploy.

**Empfohlene kurze Desktop-Word-Stichprobe:** 01 (Pillen, «Französisch», «Beilagen»), 04 (Kontakt/Folgerand), 11 (Einseitenmodus, eine Sprache/einen Listenpunkt bearbeiten und wieder öffnen), 12 (Zweiseitenmodus). Die 12 übrigen visuellen Detailprüfungen, weitere Coverfamilien, Fontvarianten und 39-Vorlagen-Vollmatrix werden hier **nicht** als freigegeben erklärt.

**Paketdatei:** `CV-Cover-Charm-DOCX-PDF-Neuabnahme-21okt.zip` mit 12 DOCX, 12 App-PDFs, Screenshots, Projektdateien, Prüfnachweisen, einer 12-seitigen visuellen PDF-Übersicht und Prüfsummen. ZIP bleibt ausserhalb des Repositorys, damit Testartefakte nicht die Git-Historie aufblähen.
