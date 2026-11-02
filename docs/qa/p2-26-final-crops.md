# P2-26 — letzter geplanter Foto-Lauf

Basis `c5d854a8a9853fec9dcb71cae9fe381a03803372`, separater Branch
`work/02nov-p2-26-final-crops`. Zweiter und letzter geplanter CI-Lauf des
[festen Restpakets](cloud-proof-progress.md). Danach Abschlussauswertung;
keine automatische neue Forschungsphase.

## Methode

Zwei neue tatsächliche App-PDF-/DOCX-Next-Downloads über die bestehenden
Browser-E2E-Tests im bestehenden Semantic-Parity-Job. Synthetisches Farbfoto,
Modern, normale Beschreibungen mit 18 Einträgen:

| Quelle | Sidebar | Zoom | x | y |
|---|---|---:|---:|---:|
| cv-crop-left | links | 1.6 | 30 | 70 |
| cv-crop-right | rechts | 2.0 | 65 | 35 |

Andere Einstellungen als P2-21 (1.8/20/80 und 2.2/75/30). Der neue QA-Schalter
ändert ausschliesslich die Browser-Testdaten. Produktcode bleibt unverändert.
Source-Catalog und beide Manifest-SHAs müssen zum getesteten CI-Commit gehören;
PDF-/DOCX-Hashes, Crop-Absicht, Seite und Modern-Intent werden geprüft.
Der bestehende Browser-Test protokolliert separat 1/39 ELIGIBLE und 38 BLOCKED.

Pro Quelle ein unverändertes Original als Negativkontrolle und derselbe
P2-24/P2-25-Kandidat (`footer-distance-zero` auf guarded body flow). Genau vier
native Konvertierungen, zusätzlich zwei echte App-PDF-Downloads. Erwartete
Inhaltsverluste der Originalkontrolle werden als Trial-FAIL protokolliert und
dürfen die Ausführung der Kandidaten nicht abbrechen.

Unveränderte Gates: vollständige 18 Beschreibungen, App-Seitenbelegung und
keine geteilten Einträge, Titel ≤2 mm, Foto-BBox ≤2 mm/Muster ≥0.90, alle vier
Hauptlinien und Referenzlinie ≥0.85, Referenzgruppe sowie Kopf-/Bodenpixel.
Kandidat-Kopf-/Bodenpixel müssen zusätzlich zu den eingefrorenen P2-24-Werten
passen. Paket-/ZIP-Invarianten bleiben erhalten.

## Ausführung

Beim Implementierungscommit stehen Browser- und native Ergebnisse noch aus.
Execution PASS ist keine Produktfreigabe. Beliebige Fotos, lange 17er/19er,
Word und 39-Next-Abnahme bleiben ausserhalb dieses Restpakets. Kein Zugriff
auf den Benutzer-PC, keine weitere ONLYOFFICE-Installation, kein neuer Job.
