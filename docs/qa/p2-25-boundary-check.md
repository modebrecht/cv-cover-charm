# P2-25 — benachbarte Umbruchfälle

Basis `73e59b0d47865dc510233777ef569e46a45f6056`, separater Branch
`work/02nov-p2-25-boundary-check`. Erstes von zwei geplanten nativen Restpaketen;
siehe [Fortschrittsanzeige und Endbedingung](cloud-proof-progress.md).

## Feste Matrix

Acht archivierte echte Next-Exporte aus P2-17: 17/18/19 normale Einträge und
18 Einträge mit variabler Beschreibung, jeweils Sidebar links/rechts. Quellen
werden über den eingefrorenen P2-17-Report und DOCX-Hashes geprüft. Keine neuen
synthetisch umgeschriebenen DOCX-Quellen; keine privaten Dateien.

Pro Quelle genau zwei Konvertierungen: P2-23-Body-Kontrolle und unveränderter
P2-24-Kandidat mit überprüft leerer Fusszeile/Abstand null. Geplant **16 native
Konvertierungen**. Die vier 18er-Quellen reproduzieren beide früheren Profile
über DOCX-Hash und sämtliche Seitenpixel (acht Kontrollen). Vier neue Fälle
prüfen die 17er-/19er-Grenzen. Lange 17er/19er-Texte sind nicht Teil der Matrix.

Die bestehenden Forschungshelfer erhalten ausschliesslich einen optionalen
Eintragszähler (Standard weiterhin 18). Semantische Grenzen, Kopierregel und
Gates werden beibehalten; keine vom App-Umbruch abgeleiteten Schnitte. Alle
vorhandenen 18er-Hashkontrollen müssen unverändert bestehen.

Gates: vollständige Beschreibungen, identische App-Seitenbelegung, keine
geteilten Einträge, Titel ≤2 mm, Foto-BBox ≤2 mm und Muster ≥0.90, Referenzlinie
und alle vier Hauptlinien mit dunklem Lauf ≥0.85, Referenzgruppe sowie exakte
Kopf-/Bodenpixel zur jeweiligen Kontrolle. Tabelleninhalte, Texte, sämtliche
Content Controls und alle Nicht-Dokument-ZIP-Teile werden geprüft.

## Tatsächliche Ergebnisse

**PASS: 8/8 Kandidaten**, darunter alle vier neuen 17er-/19er-Grenzfälle.
Execution ebenfalls PASS; keine Produktfreigabe.

| Quelle | Einträge vollständig | Seiten App/LO | Body-Kontrolle | Fussabstand 0 | Max. Titelabweichung des Kandidaten |
|---|---:|---:|---|---|---:|
| 17 normal links | 17/17 | 3/3 | FAIL | PASS | 1.665 mm |
| 17 normal rechts | 17/17 | 3/3 | FAIL | PASS | 1.665 mm |
| 18 normal links | 18/18 | 3/3 | FAIL | PASS | 1.665 mm |
| 18 normal rechts | 18/18 | 3/3 | FAIL | PASS | 1.665 mm |
| 18 variabel links | 18/18 | 5/5 | PASS | PASS | 1.631 mm |
| 18 variabel rechts | 18/18 | 5/5 | PASS | PASS | 1.631 mm |
| 19 normal links | 19/19 | 3/3 | FAIL | PASS | 1.665 mm |
| 19 normal rechts | 19/19 | 3/3 | FAIL | PASS | 1.665 mm |

Kein geteilter Eintrag; Referenzinhalt/-gruppe, Referenzlinie, alle vier
Hauptlinien, Foto und Kopf-/Bodenpixel bestehen bei allen acht Kandidaten.
Foto-Muster links 1.0000, rechts 0.9688; maximale Foto-BBox-Abweichung
1.323/1.587 mm. Alle Grenzwerte unverändert. Die sechs normalen Kontrollen
bleiben erwartungsgemäss FAIL; insgesamt 10/16 Trial-PASS, kein BLOCKED.

Die acht 18er-Kontroll-/Kandidatentrials reproduzieren die früheren DOCX-Hashes
und vollständigen Seitenpixel exakt. Die zwölf Seiten der vier neuen
17er-/19er-Kandidaten wurden als Raster visuell geprüft: vollständige Einträge,
Foto nur auf Seite 1, sichtbare Haupt-/Referenzlinien und gruppierte Referenzen.
App-Vergleich über die eingefrorenen tatsächlichen P2-17-PDF-Messwerte;
keine neuen App-Exporte oder Pixelidentität zur App behauptet.

Getesteter Commit `49d3a6c8f1f765ca89678ee98d28653baf21f701`, Tree
`9c1c48ab04bbe71b3fd508e1f3e12f3d9428358f`.
[CI 41477205657](https://github.com/modebrecht/cv-cover-charm/actions/runs/41477205657),
Job `125385818703`, 02.11.2026 **17:00:36–17:05:45 MEZ** (5:09).
**167/167 Tests** lokal und in CI. LibreOffice 24.2.7.2, Ubuntu 24.04.
**16 Konvertierungen, 56 Seiten**; summierte Konverterzeit **23.619 s**,
maximaler Konverter-RSS **245212 KiB / 239.46 MiB**. Gesamtjob-Spitzen-RSS
nicht gemessen. Nachgelagerter Audit: gespeicherte DOCX-/PDF-Hashes und
Messungen identisch, **0 neue Konvertierungen**.

## Belege und Abschluss dieses Pakets

- [Native Rohdaten](p2-25-native-results.json), SHA256
  `cbff2a39ff35549a32e21e6c01fc56d91cf42b88081e11066e22cdf90b62c790`.
- [Audit](p2-25-audit-results.json), [Vergleich CSV](p2-25-comparison.csv),
  [CI-/Hashnachweis](p2-25-proof.json).
- [Vier neue Kandidaten-PDFs und ein DOCX](../../tests/fixtures/lo-import-p2-25/README.md)
  dauerhaft versioniert; alle 16 Trials im CI-Artefakt `13158725372`,
  9,205,638 Bytes, SHA256
  `f0d48cd1b305188462ab6fb978a930970e6ddc8c2a5e4bba8b807e3f00218132`,
  Retention bis 16.11.2026.

**Restlauf 1/2 abgeschlossen; 4/6 Prüfpakete erledigt.** Es verbleiben der
geplante frische Foto-Lauf und die Abschlussentscheidung. Keine weitere
Umbruchmatrix wird automatisch angehängt. Lange 17er/19er-Texte, beliebige
Fotos, Produktintegration und 39-Next-Freigabe bleiben ausserhalb des Pakets.

Workflow bleibt bei fünf Jobs/zehn Eingaben; `src`, Exporter, Abhängigkeiten,
`dev`, `render`, `main` bleiben unverändert. Keine weitere ONLYOFFICE-Installation
oder Word-Abnahme.
