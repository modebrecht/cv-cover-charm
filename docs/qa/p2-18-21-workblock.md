# CV Cover Charm — Arbeitsblock P2-18 bis P2-21

**Befund: rechter Fotoversatz und lange Einträge/Referenzen sind in Diagnosekopien
behoben. Eine allgemeine Lösung für die unveränderten Originalexporte fehlt weiterhin.**

Alle Arbeiten liefen auf separaten Research-Branches in Cloud/Linux/GitHub Actions,
auf Basis von P2-17 `7d937d504d583ee6cc7d373df38ccd20baa2121c`.
Kein Produktcode/normaler Export geändert, kein Merge. Der vorhandene Workflow mit
fünf Jobs bleibt bestehen; pro Versuch lief genau der ausgewählte bestehende Job.

## Was jetzt tatsächlich nachgewiesen ist

| Prüfpunkt | Status | Aussage |
|---|---|---|
| Langer CV links, 18 wechselnde Beschreibungen | PASS der Kopie | Alle 18 Einträge auf passenden 5 Seiten, keine geteilten Einträge, Referenzüberschrift und Text zusammen; geschützte Folgezeilen |
| Langer CV rechts, gleiche Quelle gespiegelt | PASS der Kopie | Gleicher Inhalt/Layoutbefund plus rechter Fotoanker innerhalb des bisherigen Gates |
| Normaler 18er-CV links/rechts auf P2-17-Struktur | PASS der Kopien | Die explizit gewählte feste Struktur plus seitenabhängiger Fotoanker bestehen; keine automatische Strukturauswahl |
| Frischer linker Ausschnitt, Zoom 1,8 / x20 y80 | PASS der Kopie | Echte neue App-/Next-Downloads, 18/18 Einträge auf 3 Seiten, Musterwert 98,44% |
| Frischer rechter Ausschnitt, Zoom 2,2 / x75 y30 | PASS der Kopie, knappe Reserve | 18/18 auf 3 Seiten; Musterwert 90,62% bei 90%-Gate, kein pixelgenauer Bildgleichstand |
| Eine geschützte Struktur für normale 17/18/19 und lange 18 Einträge | FAIL als allgemeine Lösung | Normale Einträge 06/15 wechseln zu spät die Seite, bis 26,044 mm Titelabweichung; alle Inhalte/Fotos trotzdem erhalten |
| Sieben verkleinerte Leerabsätze als Reparatur | FAIL der Hypothese | Sichtbare Pixeländerung, aber keine Behebung der falschen Seitenbelegung; wird verworfen |
| Unveränderte neue 18er-Crop-Next-Importe | FAIL | Jeweils 14/18 vollständige Einträge, rechts zusätzlich Fotoversatz; Kopien-PASS ersetzt diesen Original-Fail nicht |
| 39 Vorlagen insgesamt | BLOCKED / nicht nachgewiesen | Der Verfügbarkeitsguard erlaubt Modern und blockiert 38; keine 39er-Layoutfreigabe |

Rechter Foto-x-Fehler: **+19,844 → +0,258 mm**, links bleibt der ursprüngliche Anker.
Die rechnerisch gleichwertige Randangabe wird nur rechts genutzt; eine globale
Randumstellung verschlechtert links den Fehler auf +7,935 mm. Reine Seiten-
Kompensation verändert die deklarierte OOXML-Position und wird nicht empfohlen.

Bei langen Beschreibungen beträgt die maximale Titelabweichung 1,631 mm.
Die normalen 18er-Kontrollen einschließlich frischer Ausschnitte liegen bei
1,984 mm, nur 0,016 mm unter der bestehenden 2-mm-Grenze. Keine Toleranz wurde
angepasst. Es bleiben begrenzte Modern-/Sidebar-Testfälle, keine beliebigen
Textlängen, Bildformen oder Word-Engine-Freigabe. Eine Word-Abnahme ist für diesen
Cloud-Auftrag nicht angefordert oder vorgenommen worden.

## Tatsächliche Läufe und SHAs

| Phase | Nativer Implementierungs-SHA | Native Konvertierungen | PDF-Seiten | CI-Kontrolltests | Actions |
|---|---|---:|---:|---:|---|
| P2-18 | `744381e4e695b9eb56668861426fe977ea9de005` | 12 | 46 | 132 Python | [41406026494](https://github.com/modebrecht/cv-cover-charm/actions/runs/41406026494) |
| P2-19 | `aebcf91f5f9443ff452bc74624dabd8f6a056606` | 16 | 64 | 137 Python | [41407449666](https://github.com/modebrecht/cv-cover-charm/actions/runs/41407449666) |
| P2-20 | `f50706cb8a68467f468ebda67b6a6bb7e4081428` | 16 | 56 | 142 Python | [41408816525](https://github.com/modebrecht/cv-cover-charm/actions/runs/41408816525) |
| P2-21 | `887706640dba19aac621b13a7817e7efad6d8902` | 4 | 12 | 68 Python + 3 Browser | [41410023444](https://github.com/modebrecht/cv-cover-charm/actions/runs/41410023444) |

**Gesamt: 48 tatsächlich ausgeführte Konvertierungen,
178 native PDF-Seiten, vier erfolgreiche native CI-Läufe.**
Alle vier Rohberichte, ZIP-Hashes und behaltenen PDFs/Kopien wurden unabhängig
nachgeprüft. Die Audit-Wiederholungen erzeugten **0 zusätzliche native PDFs**.
Die Kontrolltestzahlen je Lauf werden nicht als Anzahl verschiedener Tests addiert.

[Maschinenlesbarer Gesamtbeleg](p2-18-21-workblock-proof.json).

- [P2-18: lange Einträge und Referenzgruppe](p2-18-entry-rows.md)
- [P2-19: rechter Fotoanker, linke Gegenprobe](p2-19-photo-frame.md)
- [P2-20: verworfene Leerabsatz-Hypothese](p2-20-unified-rows.md)
- [P2-21: zwei neue Ausschnitt-Downloads](p2-21-photo-crops.md)

Jeder Bericht verlinkt Rohdaten, Bildnachweise und Auditbeleg mit tatsächlichem
Implementierungs-/Quell-Commit. Ausgewählte Quellen und native Kandidaten sind
zusätzlich dauerhaft im Repository erhalten. Vollständige Actions-Artefakte
haben **14 Tage Aufbewahrung**; große App-Raster-PDFs werden dort gespeichert,
ihre Originalhashes, Messungen und Kontaktbögen bleiben im Repository.

## Ursprünglicher ONLYOFFICE-Auftrag und P2-02-Empfehlung

Die [P2-01-Entscheidung](p2-01-onlyoffice.md) bleibt unverändert; in diesem Block
gab es keinen neuen ONLYOFFICE-Lauf oder Installationsversuch:

| Ursprüngliches Dokument aus P2-01 | App-PDF | LibreOffice | ONLYOFFICE-Konvertierung | ONLYOFFICE als saubere visuelle Referenz |
|---|---|---|---|---|
| Titelblatt | PASS | PASS | PASS, wiederholbar | FAIL: Wasserzeichen |
| Motivationsschreiben | PASS | PASS | PASS, wiederholbar | FAIL: Wasserzeichen |
| Einseitiger CV mit Sidebar und synthetischem Bild | PASS | PASS | PASS, wiederholbar | FAIL: Wasserzeichen |

Das widerspricht den späteren CV-Stresstest-Fails nicht: es sind andere,
mehrseitige Eingaben. Die unregistrierte SDK-Ausführung ist trotz erfolgreicher
Konvertierung keine saubere visuelle Referenz. **LibreOffice beibehalten.**
Die neuen Diagnosekopien erklären und begrenzen seine Importprobleme; sie
rechtfertigen weder einen stillen Austausch des Originaldokuments im Paritätsgate
noch eine Änderung des normalen Produktexports.

P2-02 soll Original-Fails weiter sichtbar halten und Inhalt, Seitenbelegung,
Eintragsteilung, Referenzgruppe und Fotogeometrie getrennt ausweisen.
Die bewährten Layoutkopien bleiben explizite Kontrollen. Nächster Forschungsfokus:
eine Hauptspaltenstruktur, die bei beiden Texthöhen dieselbe Regel verwendet;
keine weitere Suche durch Leerabsatzhöhen und kein ungeprüftes Umschalten nach Textlänge.
Den knappen rechten Crop-Musterwert vor einer breiteren Foto-Fidelity-Aussage
mit weiteren synthetischen Ausschnitten/Bildformen untersuchen.

## CI-Ressourcen und unveränderte Bereiche

LibreOffice 24.2.7.2 auf Ubuntu 24.04. Die vier vollständigen CI-Läufe dauerten
3:34, 4:14, 3:13 und 6:09 einschließlich Einrichtung/Tests; zusammen 17:10 Runnerzeit.
Gemessene Konverter-Wandzeiten summiert **115.525 s**,
maximales gemessenes Konverter-RSS **245,920 KiB
(240.16 MiB)**. Das ist kein Gesamt-RSS des
Jobs mit Browser/Node/OCR. Keine Server-Suite/Docker-Infrastruktur und keine
endlosen Installationswiederholungen.

Geschützte Branches wurden erneut direkt auf GitHub geprüft:

- `dev`: `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`
- `render`: `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`
- `main`: `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`

`src`, Paketdateien, normaler Export und `scripts/dossier_visual_parity.py` sind
in diesem Arbeitsblock unverändert. Ausschließlich synthetische Testdaten; kein
Benutzer-PC, keine privaten Word-Dateien oder Fotos, keine manuelle Word-Abnahme.
Der Abschlusscommit enthält nur Dokumentation/Evidenz und `[skip ci]`; sein SHA
steht im Branchverlauf. Der letzte nativ getestete Code- und Export-SHA bleibt
`887706640dba19aac621b13a7817e7efad6d8902`.
