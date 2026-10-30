# Historische native Prüfverträge – 30. Oktober 2026

Ausgangspunkt: `69f61be5fd17da0cf89aa6ecb629455c57dbd703`.
Diese Änderung betrifft ausschliesslich synthetische Forschungsmodelle und ihre
Prüfung. Kein Produktcode, keine Word-Exportfreigabe und keine Geometrietoleranz
wird geändert. Maschinenlesbarer Nachweis: `native-historical-contracts-30okt.json`.

## Ursprüngliche Container- und Floating-Versuche reproduzieren

Die Container-Erzeugung stoppte beim historischen Paket-Hash, weil der heutige
Brief eine zusätzliche `letter.attachments-heading` enthält. Die ursprünglichen
CV-Experimente definierten diesen späteren Briefinhalt nicht. Ihr Hilfsmodell
stellt jetzt genau den früheren Brief ohne dieses eine Feld her. Der normale
App-Export und seine Beilagenüberschrift bleiben erhalten.

Hinter diesem ersten Stopp wurde ein zweiter sichtbar: Die Floating-Versuche
enthielten die frühere zweispaltige Referenzzeile mit leerer zweiter Zelle.
Die produktive Korrektur auf tatsächlich belegte Zellen hatte dieses synthetische
Eingabemodell verändert. Der ursprüngliche Quellstand `b874ade828b7c9393286e8051e4521fa5ae40eaf`
wurde separat ausgecheckt und erneut ausgeführt. Sein Paket-Hash
`c913c6514159e37c39aa9bfc125c76f8b5e3bf1bf53113ae5892b871d0008f29`
stimmt mit dem historischen Nachweis überein. Der Paketvergleich zeigt nach
Wiederherstellung des Briefs ausschliesslich die veränderte Referenzzeile.
Nur diese alte Versuchseingabe bekommt deshalb ihre ursprüngliche Zeile zurück.

Die bestehenden historischen Hash-Erwartungen bleiben sämtlich unverändert.
Zwölf neue Unit-Prüfungen sichern vier Container- und sechs Floating-Pakete gegen
ihre unabhängig ausgeführten Originale, die erhaltene aktuelle Beilagenüberschrift
und die weiterhin erkannte Manipulation von CV-Geometrie und Feldtext.
Alle 29 Erzeugungsschritte des Forschungsjobs bestehen lokal einschliesslich
der zuvor nicht mehr erreichten Anchor-, Inline-, Carrier- und Boundary-Kontrollen.
Dies bestätigt die Quellen; die anschliessende native Forschungs-CI bleibt
ein eigener Prüfstand.

## Verlauf: Ursache der zusätzlichen Titelblattseite

Die alte Erwartung von zwei Titelblattseiten übersah den heute editierbaren
Initialen-Platzhalter im ursprünglichen Fotoplatz. Bei 40 Namenszeilen folgen
die Kontakt- und Beilagenzeilen deshalb auf einer dritten Titelblattseite.
Ein isolierter Gegenversuch entfernt ausschliesslich diesen Platzhalter:
Das Dossier hat dann wieder fünf statt sechs Seiten. Kein anderer Inhalt,
Schriftwert oder Bildasset wird dafür verändert.

Die Seitenerwartung für genau `verlauf-hero-long` ist nach dieser Ursachenprüfung
auf drei Titelblattseiten korrigiert: insgesamt sechs Seiten mit einer Brief-
und zwei CV-Seiten. Der aktuelle Export wird dabei nicht geändert: Alle 16
vorher/nachher erzeugten DOCX-Pakete sind bytegleich. Im Manifest ändern sich
ausser den gemessenen Laufzeiten nur die Seitenzahl und die daraus berechnete
Anzahl wiederholter Hintergrundbilder dieses einen Falls.

Die vollständige Verlauf-Matrix besteht mit 16/16 Dossiers und 112 Quellseiten:
Paketstruktur, sämtliche semantischen Texte, Schrift-/Rand-/Bild-/Überlappungs-
prüfungen sowie natives Speichern und Wiederöffnen. Alle Feldkennungen bleiben
erhalten. Der bekannte Verlust nativer Tabellenkennungen besteht weiterhin
in allen 16 Fällen; daraus folgt keine neue Architektur- oder Word-Freigabe.

## Abschlussprüfungen

- 1486/1486 Unit-Tests bestanden, 281 Dateien.
- App-Typprüfung, Lint der geänderten Testdateien und deren Formatprüfung bestanden.
- 29/29 Erzeugungsschritte und 16/16 native Verlauf-Fälle bestanden.
- [Release-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739360)
  auf `c3e9f4f17b8493526a602efff1b7110622bb154c`: 1486 Unit-Tests und 206
  Browserfälle in elf Gruppen bestanden; `M6 Release Candidate: success`.
- [Native Forschungs-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739388):
  13/15 Gruppen bestanden, zuvor 11/15. `stable-comparison` und die vollständige
  Verlauf-Gruppe sind jetzt grün. Die zwei verbleibenden Fehler stimmen mit
  den bekannten Foto-Pins und dem 60-Sekunden-Speicherabbruch überein.
- [Web-Galerie](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739374)
  mit allen 39 Vorlagensätzen sowie
  [Pages](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739171) bestanden.

Die historischen Foto-Paket-Pins und der experimentelle native Speicherabbruch
von `app-body-both-long-right` bleiben separat offen. Alte Forschungsnachweise
werden weder überschrieben noch als neue Word-Abnahme ausgegeben.

Für den Speicherabbruch existiert ein separat gesicherter Kandidat
`3628412b811f784f01fdfd9571b676e3df032660` auf
[`work/30okt-body-boundary-candidate`](https://github.com/modebrecht/cv-cover-charm/tree/work/30okt-body-boundary-candidate).
Er behebt den Abbruch durch zwei entkoppelte leere Zellanfänge, besteht 1487
Unit-Tests und 13 native App-Fälle mit zwei Speicherzyklen, stoppt aber weiterhin
an der doppelten Fotokennung im freien Hauptfoto. Er ist nicht auf `dev`
integriert. Sein eigener QA-Bericht dokumentiert auch den verworfenen
Foto-Alternativversuch; dessen drei Bildstruktur-Tests wurden nicht abgeschwächt.
