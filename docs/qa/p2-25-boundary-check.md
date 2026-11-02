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

## Ausführung

Native Ergebnisse stehen beim Implementierungscommit noch aus. Execution
PASS ist keine Produktfreigabe. Workflow bleibt bei fünf Jobs/zehn Eingaben;
`src`, Exporter und Abhängigkeiten bleiben unverändert. Keine weitere
ONLYOFFICE-Installation oder Word-Abnahme.
