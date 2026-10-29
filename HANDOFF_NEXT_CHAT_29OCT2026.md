# CV Cover Charm Fortsetzung vom 29 Oktober 2026

Matthias bat im Bett um eine autonome Arbeitsfortsetzung. Der bestätigte Stand
`b6b8994` wurde aus Basis und Abschluss-Delta wiederhergestellt. Diese Fortsetzung
behebt einen reproduzierten Fehler der intelligenten CV-Seitenanpassung.

## Verbindlicher Stand

- Branch: `work/29okt-smart-page-fit`.
- Geprüfter Produktcommit: `a30f6d1399dfff637c18ff5b9ebf713b8cd4d559`.
- Produktbaum: `9d5b2999ce4c3d11c108c4677b2cf1454094fde3`.
- Danach kommen ausschliesslich Nachweise, Prüfhilfe und Handoff. Der endgültige
  HEAD steht in `CHECKPOINT.json` des neuen Sicherungspakets.
- Nichts gepusht, gemergt oder veröffentlicht. Veröffentlichte Branches und
  Historie nicht umschreiben. Repository-Regel in `AGENTS.md` beachten.

## Abgeschlossen

Der automatische Entscheider misst Sidebar und Haupttext getrennt. Kurze
zweigeteilte Modern-CVs kehren auf eine Seite zurück; lange Inhalte und freie
Zweitseiten-Platzierungen bleiben berücksichtigt. Die zusätzliche Sidebar-
Messfassung existiert nur während der Aktion. Text, Typografie und Fotoquelle
bleiben erhalten. Details: `docs/qa/smart-page-fit-29okt.md`.

- 1’438 Unit-Tests bestanden, 278 Dateien.
- 16 neue Browserfälle bestanden; Desktop, Handy, links/rechts, Neuladen,
  Inhalts-/Platzierungsgrenzen und tatsächliche PDF-/DOCX-Downloads.
- 3 vorhandene DOCX-Importkontrollen bestanden und bytegleich zu den früheren
  gespeicherten Downloads.
- App-/QA-Typprüfung, vollständige Formatprüfung und Produktionsbuild bestanden;
  ESLint ohne Fehler, 21 bestehende Warnungen.
- Zwei neue CV-DOCX unabhängig geprüft: je 59 gleiche Feldvorkommen, gewöhnliches
  Foto ausserhalb der Content Controls, alle ursprünglichen Fotopixel erhalten.

## Offen und sinnvoller nächster Schritt

Desktop-Word ist hier nicht zugänglich. Der gespiegelte Fotofall bleibt deshalb
offen: XML x = 155 mm, LibreOffice weiterhin ungefähr 111 mm. Keine neue globale
Foto-Umgehung daraus ableiten. Das Original ist weiterhin unter der Dateiidentität
`libfile_babc0a61bfc48191858d7f36ee944d59` verfügbar. Die bereits akzeptierte
gewöhnliche Fotobewegung bleibt abgenommen; keine neue Speichermatrix verlangen.

Ohne Word lässt sich als nächster lokaler Schwerpunkt die Messzuordnung bereits
kompakter Standard-/Masonry-Rubriken untersuchen. Der bestehende Haupttext-Messer
liefert dort teilweise zusammengefasste bzw. unvollständige Werte; die
Zweiseiten-Verteilung fällt dann auf Quellgewichte zurück. Zuerst einen konkreten
falschen Verteilungsfall reproduzieren und sichern, bevor dieser Bereich geändert
wird. Die heutige Sidebar-Korrektur nicht zu einer allgemeinen Neugestaltung
ausweiten. Der seltene frühere Modern-/Sidebar-PDF-Clone-Abbruch bleibt ebenfalls
nicht kausal geklärt.

Die früheren 156 Vorlagenfälle und 70 Importfälle sind der historische Prüfstand
vom 28. Oktober. Sie wurden nicht erneut als Ganzes ausgeführt und werden nicht
als neue vollständige Abnahme dieses Produktbaums ausgegeben.

## Wiederherstellung

Die vollständige Basissicherung
`CV-Cover-Charm-recovery-28OCT2026-checkpoint-1.zip` behalten. Basis plus neues
`CV-Cover-Charm-Smart-Fit-29OCT2026.zip` genügen für alle bisherigen und neuen
lokalen Commits; der Abschluss-Delta vom 28. Oktober ist dann nicht zusätzlich
nötig. Die Anleitung und der frisch geprüfte Restore-Nachweis liegen im neuen
Paket. Abhängigkeiten und Browser werden separat gemäss Lockdatei eingerichtet.
