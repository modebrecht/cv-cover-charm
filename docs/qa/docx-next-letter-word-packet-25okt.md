# Separates Word-Paket für die Empfänger-Mindesthöhe

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangskopf: `7b4d7a444551d05eca9f8e1db71a17fe8c3a3153`.
Veröffentlichung auf dem inzwischen fortgeschrittenen Kopf
`e51a94cd870d1373dc4b068611e122df5d5d1771`; dessen neue Build-/Lint-Befunde
und Handoff-Ergänzungen bleiben erhalten. Der DOCX-Replay-Bereich ist unverändert.

## Ergebnis und Paketgrenze

Die neue Brief-Komposition liegt jetzt in einem **eigenen Word-Prüfpaket** vor:
`CV-Brief-Empfaenger-Word-v2-25okt.zip`, 1820379 Bytes, SHA-256
`3cd2ee59d0e83e6610b14d38a7b65e17a170da9c62e1dcaf79dd28166ce5359a`.
Das Paket ist separat bereitgestellt; Library-ID
`libfile_0fc827a8c3f48191b79346cf69758434`.

Es enthält zwei vollständige synthetische Dossiers: Standard und eine breite
Empfängerzeile, deren Umbruch den früheren Leerraumfehler sichtbar machte.
Hinzu kommen die vorhandene App-PDF des Standardfalls, eine deutsche Anleitung
und ein Herkunfts-/Hash-Manifest. Es gibt keinen neuen Benutzer-Rücklauf und
keine neue Word-Abnahme. Der Benutzer muss die Prüfung nicht während einer
laufenden autonomen Arbeitsrunde ausführen.

Die Dokumente sind die bereits intern geprüften Empfänger-Kandidaten, bytegenau
aus dem aktuellen Quellstand reproduziert. **Keine neue Produktlogik, keine neue
Fotoverankerung und kein Austausch des bisherigen Fotoprüfpakets.** Beide neuen
Brief-Dateien behalten den ursprünglichen typisierten Inline-Fotobesitzer.
Sie sind kein weiterer Versuch, das Word-Menü für Bildumfluss zu reparieren.

| Datei im neuen Paket | Umfang | SHA-256 |
| --- | --- | --- |
| `01-Brief-Standard.docx` | Vollständiges Standarddossier, intern vier Seiten | `b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b` |
| `02-Brief-Breiter-Empfaenger.docx` | Dasselbe Dossier; zehn W-Gruppen als breite erste Empfängerzeile, intern vier Seiten | `b157868f87d21ff065f2af798add7375542b306f1ca2cb11940607b636b841bc` |
| `03-App-Referenz-Standard.pdf` | Ursprüngliche App-Referenz, kein frischer Browserexport | `031159442ef39dc2f7191d409b1e507cc45fccf6b591f39d474976d70fe5345b` |

Das bisherige `CV-Word-Pruefkandidat-25okt.zip` bleibt SHA-256
`430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509`.
Es wurde abschliessend erneut gegen diesen Hash geprüft. Es enthält weiterhin
den älteren Brief und den Inline-Rich-Text-Foto-Prototyp. Seine bisherigen
Paket- und Rücklauf-Hashverträge bleiben unverändert.

## Durchgeführte Prüfung

Der aktuelle Bun-Replay hat zunächst den ursprünglichen vollständigen Kontroll-
DOCX-Hash `5e469d60...` exakt rekonstruiert und dann die beiden Kandidaten mit
ihren unveränderten oben genannten Hashes geschrieben. 164 vorhandene Quellen/
Fixtures des Replay-Bereichs wurden gegen die Git-Blobs des Ausgangskopfs
geprüft; dies wird nicht als neue vollständige Repository-Integritätsprüfung
ausgegeben. Die beiden unveränderten Python-Leserabhängigkeiten wurden ebenfalls
gegen den aktuellen Remote-Baum geprüft. Eine zusätzliche lokale Schluss-LF der
Inventar-Kopie wurde dabei entfernt; die Paketbytes blieben mit dem verifizierten
Leser erneut identisch.

Beide Dossiers wurden mit dem gebündelten LibreOfficeDev 26.8 alpha0 frisch in
PDF/PNG gerendert. **Alle acht Seiten wurden visuell geprüft** und sind zu ihren
bereits geprüften Empfänger-Kandidaten pixelidentisch. Titelblatt, CV, Bildausschnitt
und die bekannte zweizeilige CV-Referenz bleiben erhalten. Auf der breiten
Briefseite sind alle 60 W sichtbar; Datum und Folgeinhalt überlappen nicht.
Diese Wiederholung schliesst die ausgelieferten Dateien ab; sie ist keine neue
37-Seiten-Abnahme oder neue Office-Engine-Gegenprobe.

Beide DOCX haben jeweils 145 Feldvorkommen aus 134 kanonischen Tags und ein
Originalfoto innerhalb seines typisierten Besitzers. Die einzige native
Empfänger-Mindesthöhenzeile hat 1381 Twips mit `hRule="atLeast"`, vier zugehörige
Empfängerfelder und kein `cantSplit`. Selbstvergleiche mit dem unveränderten
Word-Leser bestätigen, dass die Rücklaufkontrollquellen vollständig lesbar sind.
**Ein Selbstvergleich ist kein Speicher-/Wiederöffnungsnachweis.**

Der neue Paketbauer kopiert die Eingabedokumente unverändert, verlangt ihre
exakten Hashes und prüft die erwartete anfängliche Feld-/Bild-/Zeilenstruktur.
Drei getrennte Paketbauten waren bytegleich. ZIP-Prüfsumme, innere Dateihashes und
unveränderte DOCX-Bytes bestehen. Eine falsche Eingabe und ein bereits vorhandener
Ausgabepfad werden abgewiesen; bestehende Pakete werden nicht überschrieben.

Es wurden keine neuen Unit-Tests für das reine Kopier-/Paketwerkzeug angelegt.
Die vorher bei `7b4d7a4` berichteten 1412 grünen Unit-Tests und der vollständige
Typecheck wurden in dieser produktlogikfreien Paketrunde nicht wiederholt oder
als neue Ergebnisse gezählt. Auch die zuletzt berichteten 169 Formataltlasten wurden
nicht bearbeitet. Einzelwerte stehen im [Nachweis](docx-next-letter-word-packet-25okt-evidence.json).

## Reproduktion und spätere Rückläufe

```sh
python scripts/docx-next-letter-flow-control-assets.py ORIGINAL-CONTROL.docx NEW-ASSETS
bun scripts/docx-next-letter-source-flow-probe.ts NEW-ASSETS NEW-REPLAY --recipient-cases
python scripts/docx-next-letter-word-packet-25okt.py NEW-REPLAY APP-REFERENZ.pdf NEW-PACKET.zip
```

Der Paketbauer akzeptiert nur die oben gepinnten Eingaben und einen neuen ZIP-
Pfad. Alle DOCX/PDF/PNG/ZIP, Eingabedaten und Rohprotokolle bleiben ausserhalb Git.

Die Anleitung sieht für jeden Fall getrennt unveränderte Save1-/Save2-Dateien mit
Schliessen/Wiederöffnen vor. Eine PDF des jeweils wieder geöffneten Falls erlaubt
den sichtbaren Vergleich. Jede zurückgegebene DOCX wird gegen ihre **eigene**
enthaltene unveränderte Quelle mit `docx-next-word-acceptance-23okt.py` geprüft.
Danach Feldvorkommen/Inhalte/Rollen, Originalbild/Crop, native Empfängerzeile und
sichtbaren Fluss gemeinsam beurteilen. Der Leser ist ein Bericht, kein pauschales
Freigabe-Gate; die Anleitung sagt dies ausdrücklich. Der bestehende Rich-Owner-
Rücklaufprüfer wird für diese typisierten Brief-Dateien nicht umkonfiguriert.

## Noch offen

Tatsächliche Word-Abnahme der Empfänger-Komposition, Word-Fotobedienung/Speichern
und der enge Referenzumbruch fehlen weiterhin. Der breite Fall verwendet bewusst
eingefrorene ursprüngliche Stile und hat keine eigene frische Browseraufnahme.
Keine vollständige Schema-Zertifizierung und kein frischer App-Export.
Der normale Sidebar-Export bleibt gesperrt; allgemeine Sidebar-Freigabe NO-GO.
Kein Merge, Deployment, CI-Dispatch, Eingriff in dev/main/render oder die getrennten
Datenschutz-Audits/Automationen.
