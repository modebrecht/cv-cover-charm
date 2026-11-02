# CV Cover Charm — Arbeitsblock P2-22/P2-23

**Die Hauptspalte lässt sich unabhängig von der Sidebar und ohne äußere
Haupttabelle rendern. Lange Texte bestehen mit ergänzten Zeilen-Guards und
Vordergrundlinien beidseitig. Die allgemeine Umbruchabweichung kurzer Texte
ist weiterhin nicht gelöst.**

Basis `d1ba99a3bb44aea4a733551bf80f35f8f3d50dc6`. Alle Änderungen auf separaten
Research-Branches, ausschließlich Diagnosekopien und bestehender Cloud-Workflow.
Keine Produkt-/Normalexportänderung, keine privaten Dateien, kein Benutzer-PC
oder manuelle Word-Abnahme. Kein Merge nach `dev`, `render` oder `main`.

## Was geprüft und eingegrenzt wurde

Vier tatsächliche eingefrorene P2-17-Next-Quellen aus
`42bab2e13572145b201d1e9deabfa3baa8dab426`: je 18 normale und längere Beschreibungen,
links/rechts. App-Referenz sind ihre unveränderten P2-17-Messwerte. Keine neuen
App-Exporte in diesem Block; auch die zuletzt geprüften Crop-Fälle werden nicht
als Freigabe der neuen Struktur ausgegeben.

| Prüfpunkt | Ergebnis | Bedeutung |
|---|---|---|
| Sidebar vom Haupttabellenfluss getrennt | Teilweise | Alle Inhalte erhalten; einfacher Umfluss positioniert links falsch, begrenzter Sektionsrahmen korrigiert dies |
| Hauptinhalt vollständig ohne äußere Haupttabelle | Ausführbar | Ursprüngliche Blöcke bleiben erhalten, Umbrüche kurzer Texte bleiben trotzdem falsch |
| Lange Einträge mit fehlenden Guards | FAIL | Ohne Ergänzung wird Eintrag 09 zwischen Seiten geteilt |
| Lange Einträge mit allen Guards und Vordergrundlinien | PASS der Kopien links/rechts | 18/18 Einträge auf passenden fünf Seiten, keine Eintragsteilung, Referenzgruppe zusammen, vier dunkle Linien |
| Normale kurze Beschreibungen | FAIL im neuen Aufbau | Einträge 06/15 wechseln weiterhin auf spätere Seiten, bis 26,379 mm Titelabweichung |
| Neue Kopf-/Randpixelprüfung | PASS | Alle 28 nativen Fälle stimmen dort exakt mit ihrer jeweiligen nativen Kontrolle überein |
| Inhalte | PASS | Alle 28 Fälle enthalten 18/18 vollständige Einträge; gleiche Seitenanzahl allein beweist keine gleiche Seitenbelegung |
| Allgemeine Lösung / 39 Vorlagen | Nicht nachgewiesen / BLOCKED | Nur begrenzte Modern-/Sidebar-Testfamilien, keine Produktfreigabe |

## Neue belastbare Einzelbefunde

Die normalen Originalquellen besitzen schon 18 innere Zeilen-Guards, die längeren
12. Es fehlen nur der Referenz-Guard bzw. zusätzlich sechs Guards an den langen
Einträgen. Die Diagnose ergänzt **1 bzw. 7** und erhält vorhandene Guards.
Nach Neutralisierung genau dieser Formatierung bleiben alle 19 kritischen
Tabellen kanonisch gleich; Text und 107 Inhaltssteuerelemente bleiben erhalten.

Die vier Hauptlinien sind transparente PNGs. Eine Veränderung von genau vier
`behindDoc`-Flags stellt rechts die dunklen Linien wieder her. In allen vier
Eingaben bleiben dabei Seitenzahl, Text-/Titelpositions- und Fotomesswerte exakt
gleich zur jeweils vorherigen Variante. Der Ebenenwechsel ist ein Grafikbefund,
keine Lösung der Umbrüche. Die Prüfung wurde an zwei echten positiven nativen
PDFs und einem echten blassen negativen PDF kalibriert, unveränderte 0,85-Grenze.

Bei langen geschützten Texten maximal **1,631 mm** Titelabweichung, innerhalb des
bisherigen 2-mm-Gates. Fotos bestehen das bisherige Gate; die rechte neue
Floating-Sidebar erreicht 0,9688 Musterübereinstimmung und bis 1,587 mm
Größenabweichung. Das ist keine pixelgenaue Fotofidelity. Die ursprünglichen
DOCX-Stresstestimporte werden durch Kopien-PASS weiterhin nicht zu PASS erklärt.

## Tatsächliche Native-Läufe und Prüfnachweise

| Phase | Tatsächlich nativ getesteter Commit | Konvertierungen | PDF-Seiten | Kontrolltests | Actions |
|---|---|---:|---:|---:|---|
| P2-22 | `e79480aed22c6e5d3b8fd33bd47b29fa3b867841` | 12 | 48 | 151 | [41425693219](https://github.com/modebrecht/cv-cover-charm/actions/runs/41425693219) |
| P2-23 | `9b37e77b36bd66011f5a7479f06ca744f1975774` | 16 | 64 | 158 | [41428995677](https://github.com/modebrecht/cv-cover-charm/actions/runs/41428995677) |

**Gesamt: 28 tatsächliche native Konvertierungen, 112 PDF-Seiten.**
Die vier Eingaben wurden mit Varianten und reproduzierten Kontrollen geprüft;
das sind keine 28 verschiedenen Quelldokumente. Alle erhaltenen Rohberichte,
PDF-/Eingabehashes und wiederaufgebauten Kopien wurden zusätzlich unabhängig
geprüft. Audit-Wiederholungen erzeugten **0 weitere native Konvertierungen**.

Es gab außerdem einen fehlgeschlagenen Kontrolllauf, nicht einen nativen Renderer-
Fail: `c4d051c775b9f4f8b51b1ef2e01cd3bcd6973097` wurde trotz drei lokal
fehlgeschlagener Tests veröffentlicht. Die anfängliche Annahme fehlender Guards
war falsch. [CI 41428504053](https://github.com/modebrecht/cv-cover-charm/actions/runs/41428504053)
verhinderte die native Ausführung vollständig (SKIPPED, 0 Konvertierungen).
Der Fehler ist mit Folgecommit `9b37e77b…` korrigiert, ohne Historienänderung.
Der korrigierte Stand besteht alle sieben neuen lokalen und alle 158 CI-Kontrolltests.
Fehler und Korrektur bleiben in Bericht/Verlauf sichtbar.

[Gesamtbeleg](p2-22-23-workblock-proof.json) ·
[P2-22: getrennte Sidebar/Haupttabelle](p2-22-detached-main.md) ·
[P2-23: direkter Dokumentfluss, Zeilenschutz und Linien](p2-23-body-flow.md).
Jeder Detailbericht enthält rohe Messungen, ZIP-/Dateihashes, Artefakt-ID und
Bildvergleiche. Ausgewählte tatsächliche DOCX-/PDF-Kandidaten und der negative
Linien-PDF sind dauerhaft im Repository erhalten. Vollständige CI-Artefakte haben
**14 Tage Aufbewahrung**. Kontaktbögen zeigen native Kontrollen/Kopien; App-
Vergleich bleibt der eingefrorene passende P2-17-Messsatz.

## Empfehlung und nächster Prüfpunkt

**LibreOffice beibehalten.** Der ONLYOFFICE-Wasserzeichenbefund aus P2-01 ist
unverändert; kein neuer ONLYOFFICE-Lauf oder Installationsversuch. Die ursprüngliche
Titelblatt-/Brief-/kurze-CV-Matrix bleibt im P2-01-Bericht dokumentiert und wird
hier nicht als erneut ausgeführt gezählt. 39er-Next-Verfügbarkeit/Parität weiterhin
nicht freigegeben; Produktcode und normaler Export bleiben unverändert.

Beibehalten: getrennte Inhalte-/Seitenbelegungs-/Eintragsteilungs-/Referenzgruppen-
Gates, alle vier Linien, Kopf-/Randregressionsprüfung und die seitenabhängige
Foto-Kontrolle. Die neuen Kopien sind Forschungsbelege, keine stillen Ersatzdateien
für das Original-Paritätsgate. Keine weitere Suche durch Leerabsatzhöhen oder
weitere äußere Tabellenaufteilungen allein: beides reicht nachweislich nicht.

Nächster gezielter Prüfpunkt ist die tatsächliche Zeilen-/Seitenflächenbelegung
am kurzen Eintrag 06/15, einschließlich der dort wirkenden Formatierungs- und
Seitenflächenregeln. Deren genaue Ursache ist in diesem Block nicht nachgewiesen.
Neue Fotoausschnitte/Bildformen müssten für eine neue Struktur separat geprüft
werden; die P2-21-Crop-Pässe gelten für ihre dortige Kontrollstruktur.

## Ressourcen und geschützte Bereiche

LibreOffice 24.2.7.2 auf Ubuntu 24.04. Die erfolgreichen vollständigen Native-Jobs
dauerten 4:19 und 5:41. Der zusätzliche Fehlerlauf stoppte an den Kontrollen.
Konverter-Wandzeiten summiert **48,794 s**, größtes gemessenes Konverter-RSS
**245.688 KiB (239,93 MiB)**. Das ist kein Gesamt-RSS des CI-Jobs mit Python-Analyse.
Kein Browserstart in diesen beiden eingefrorenen Fixture-Läufen, keine Server-Suite.

Unverändert und erneut direkt auf GitHub geprüft:

- `dev`: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- `render`: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- `main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`

`src`, Paketdateien, normaler Export und `scripts/dossier_visual_parity.py` sind
seit Arbeitsblock-Basis unverändert. Bestehender Workflow mit fünf Jobs; nur der
bestehende Kompatibilitätsjob lief. Abschluss nur Dokumentation/Evidenz `[skip ci]`;
der letzte tatsächlich nativ getestete Code-SHA bleibt
`9b37e77b36bd66011f5a7479f06ca744f1975774`.
