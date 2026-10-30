# CV Cover Charm – Fortsetzung vom 30. Oktober 2026

Dieser Stand ergänzt den Handoff vom 29. Oktober. Dessen Aussage «nichts gepusht»
gilt für die damalige Sicherung, nicht mehr für die jetzige Fortsetzung.

## Verbindlicher Produktstand

- Repository: `modebrecht/cv-cover-charm`, veröffentlichter Branch `dev`.
- Ausgangspunkt dieser Integration: `80877763df6e80124ba9d42305e595a4fe1b97ae`.
- Neuer Produktcommit: `ea4584c73692138ab99eca03a006c9f1ded97cb1`;
  Produktbaum: `02d65f7bbaf5b6484df31df57a2e6eb803c61291`.
- Enthaltene Arbeitsbranches: `work/30okt-masonry-measurements` (`82cb02a`)
  und `work/30okt-word-photo-wrap` (`4fab404`). Beide Historien bleiben erhalten.
- Der vorherige unabhängige DOCX-Produktstand `19f8fe2` bleibt enthalten.
- Neuester geprüfter QA-Nachtrag: `c3e9f4f17b8493526a602efff1b7110622bb154c`;
  danach folgen nur seine Abschlussnachweise. Der App-Produktcode bleibt `ea4584c`.
- `main` und `render` wurden in dieser Fortsetzung nicht aktualisiert.
- Veröffentlichte Historie gemäss `AGENTS.md` nicht umschreiben.

## Bereits abgeschlossener unabhängiger DOCX-Export

Alle drei Editor-DOCX-Downloads prüfen und bauen ihren eigenen Dossierteil.
Titelblatt und Brief folgen jetzt dem bereits unabhängigen CV-Download.
Andere Teile dürfen fehlen, andere Vorlagen verwenden oder unlesbar sein.
Vorhandene synchronisierte Kontakt-/Farbeinstellungen bleiben berücksichtigt;
der Download schreibt keine Dossierteile zurück.

Die bestehenden Word-Grenzen gelten weiterhin je Dokument: Modern/Sans,
beim CV Sidebar, beim Brief Plain Text sowie geprüfter Kontaktkopf/kompakter Fuss.
Das vollständige Dossier behält seine gemeinsame Eingangsprüfung.

Ein zusätzlich gefundener einzelner Titelblattfehler ist korrigiert: Ein minimaler
normaler Schlussabsatz verhindert, dass Writer die positionierte Beilagenüberschrift
nach oben verschiebt. Die vollständige Dossier-Referenz bleibt bytegleich.

- Lokal: 1470 Unit-Tests; 24 Browserfälle einschliesslich zwölf neuer Fälle bestanden.
- Typprüfung, Formatierung und Build bestanden; keine Lintfehler, 21 bestehende Warnungen.
- Acht echte Downloads entsprechen drei Paket-SHA-256. Je ein natives Rendering
  und zwei Speicher-/Wiederöffnungszyklen pro unterschiedlichem Paket geprüft.
- Alle Inhaltsfeldwerte und Kennungen bleiben erhalten: Titelblatt 11, Brief 22.
  Writer verändert weiterhin Brief-Gruppierungs-/Tabellenkennungen; dies ist
  vom nachfolgenden tatsächlichen Word-Rücklauf zu unterscheiden.
- Release-CI vollständig grün: 1470 Unit-Tests und 206 Browserfälle in elf Gruppen.
- 35 Fit-Prüfungen, Web-Galerie, Kontaktintegrität und Pages-Build ebenfalls grün.
- Details: `docs/qa/independent-single-docx-29okt.md` und zugehöriges JSON.
- Früherer CV-Nachweis: `docs/qa/independent-cv-docx-29okt.md`.

## Word-Abnahme und neue Korrekturen

Der Nutzer hat alle vier angeforderten Dokumente in Desktop-Word geprüft.
Titelblatt, Brief und normaler CV sind nach Änderung und Speichern bestätigt;
die Rückläufer behalten 11/11, 28/28 und 53/53 eindeutige Feldkennungen.
Das gespiegelte Foto war mit «Quadrat» im Hauptbereich gefangen. Nur das bekannte
rechte Sidebar-Foto erhält jetzt «Vor den Text»; die normale Variante bleibt gleich.
Die neue 04b ist vom Nutzer bestätigt. Ihr Word-Rücklauf behält den Bildumbruch,
alle 53 Kennungen, alle Feldinhalte und die RGBA-Pixel aller neun Bilder; die
Foto-Koordinaten wurden tatsächlich geändert und gespeichert.
Private Word-Dateien und Screenshots dürfen nicht ins öffentliche Repository.
Details: `docs/qa/mirrored-photo-front-30okt.md`.

Der kurze klassische CV mit bestehenden Halbbreiten/Masonry wurde konkret als
falsche Zwei-Seiten-Entscheidung reproduziert (rund 68 Prozent Höhenbedarf).
Die automatische Entscheidung verwendet dort die vollständige Paginatormessung
mit zehn Prozent Reserve und behält vorhandene Breiten/Packungsarten. Freie
Zweitseiten-Inhalte, lange CVs und Sidebar-Verhalten behalten ihre Schutzregeln.
Details: `docs/qa/compact-classic-fit-30okt.md`.

Gemeinsame lokale Integration: 1474/1474 Unit-Tests, 41/41 Fit-Browserfälle,
App-/QA-Typprüfung, vollständige Formatprüfung und Build bestanden; keine
Lintfehler und die 21 bestehenden Warnungen. Die neun Zwei-Seiten-, 22 automatischen
und zehn Ein-Seiten-Fälle umfassen echte PDF-/DOCX-Downloads, Neuladen, lange
Inhalte sowie den Schutz freier Zweitseiten-Positionen.

## CI-Abschluss der gemeinsamen Integration

Alle folgenden Läufe prüfen den Produktcommit `ea4584c73692138ab99eca03a006c9f1ded97cb1`.
Ein nachfolgender Nachweiskommit ändert ausschliesslich Markdown-Dateien.

- [Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033496172):
  1474 Unit-Tests, Format, Typprüfung, Lint, Build und 206 Browserfälle in elf
  Gruppen bestanden; `M6 Release Candidate: success`.
- [CV measured page fit](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033497111):
  41/41 Browserfälle bestanden (9 + 22 + 10).
- [Dossier Web Gallery](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033496223):
  alle 39 Vorlagensätze und Aggregation bestanden.
- [Template Contact Integrity](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033496266)
  und [Pages](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033495396) bestanden.
- [Native Forschungs-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41033496277):
  unverändert 11/15 Gruppen bestanden; die vier bekannten Gegenbefunde unten
  wurden anhand der aktuellen Joblogs einzeln bestätigt.

## Weiterhin offen

Desktop-Word ist hier nicht verfügbar; die Abnahme oben stammt vom Nutzer und
den gespeicherten Rückläufern. Sie gilt für die vier repräsentativen Dateien,
nicht automatisch für sämtliche Vorlagen.

Die Forschungs-CI vor dem nachfolgenden Nachtrag bestätigt elf erfolgreiche und vier bekannte fehlschlagende Gruppen:
`stable-comparison` mit derselben Paket-Prüfsumme `09155d10…707b`,
`picture-identity` mit derselben Paket-Prüfsumme `61444b40…1032`,
`app-body-content` mit demselben 60-Sekunden-Speicherabbruch des experimentellen
`app-body-both-long-right` (`body-stories`) sowie `verlauf-hero-long` mit sechs
statt fünf Seiten. Diese Referenzen nicht blind ersetzen.

## Nachtrag: historische native Prüfverträge

Ausgangspunkt dieses Nachtrags ist `69f61be`. Die produktive Word-/PDF-Komposition
bleibt vollständig gleich. Details und maschinenlesbarer Nachweis:
`docs/qa/native-historical-contracts-30okt.md` und `.json`.

- Historische Hilfsmodelle stellen den ursprünglichen Brief ohne die später
  hinzugefügte Beilagenüberschrift und die ursprüngliche Referenzzeile der
  Floating-Versuche wieder her. Die korrigierte aktuelle App-Referenzzeile
  bleibt erhalten. Alle bisherigen Paket-Pins bleiben unverändert.
- Zwölf neue Prüfungen reproduzieren vier Container- und sechs Floating-Pakete
  gegen ihre unabhängig ausgeführten historischen Hashes und sichern die
  weiterhin erkannte CV-Manipulation sowie die aktuelle App-Beilagenüberschrift.
- Alle 29 Erzeugungsschritte des nativen Forschungsjobs bestehen lokal.
- `verlauf-hero-long`: Der editierbare Initialen-Platzhalter benötigt seinen
  Fotoplatz; mit 40 Namenszeilen braucht das Titelblatt drei Seiten. Entfernt
  man nur diesen Platzhalter als Gegenversuch, ergeben sich wieder zwei.
  Die korrigierte Erwartung ändert kein Exportpaket: alle 16 DOCX-Dateien sind
  bytegleich. Die vollständige native Matrix besteht mit 112 Quellseiten und
  Save/Reopen. Feldkennungen bleiben erhalten; Tabellenkennungen gehen weiterhin
  verloren und begründen keine neue Word-/Architekturfreigabe.
- 1486/1486 Unit-Tests, App-Typprüfung sowie geänderte Lint-/Formatprüfung bestehen.
- [Release-CI dieses Nachtrags](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739360):
  1486 Unit-Tests und alle 206 Browserfälle in elf Gruppen bestanden;
  `M6 Release Candidate: success`. Web-Galerie (39 Vorlagen) und Pages grün.
- [Native Forschungs-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41047739388):
  **13/15 Gruppen bestanden**, zuvor 11/15. Historische Vergleiche und Verlauf
  sind grün. `picture-identity` stoppt weiter am unveränderten historischen
  Foto-Paket-Pin; `app-body-content` weiter beim bekannten 60-Sekunden-Speichern.

Die Foto-Paket-Pins und das experimentelle `body-stories`-Speichern bleiben
separat offen. Ein neuer tieferer Forschungsfehler darf nicht durch veränderte
Referenzen oder erhöhte Geometrietoleranzen verdeckt werden.

## Getrennt gesicherter Kandidat und nächster Schwerpunkt

Branch `work/30okt-body-boundary-candidate`, Commit
`3628412b811f784f01fdfd9571b676e3df032660`, Ausgangspunkt `c3e9f4f`.
**Nicht in `dev` enthalten; keine neue Word-Freigabe.** Der Bericht liegt nur
auf diesem Arbeitsbranch unter `docs/qa/body-boundary-candidate-30okt.{md,json}`.

Der Speicherabbruch ist auf die Kopplung zweier leerer Zellanfänge eingegrenzt.
Nur deren `keepNext=false` beendet den isolierten Speicherversuch in 0,822 Sekunden;
alle 383 Feldkennungen, ihre Texte und Reihenfolge bleiben erhalten. Modell,
Renderer und Validierung deklarieren diesen optisch/semantisch begrenzten
Versuch. Die native QA verlangt den ausdrücklichen Parameter
`--detached-cell-starts` und prüft seine tatsächlichen XML-Flags.

Kandidat: 1487 Unit-Tests, 13 nachgeprüfte betroffene Tests, elf Python-Vertragstests,
Typprüfung, Format/Lint bestanden. Die ersten 13 nativen App-Fälle bestehen
mit jeweils zwei Speicherzyklen, inklusive des langen rechten CVs. Der nächste
Fall `app-body-photo-free-main` stoppt korrekt an doppelten Fotokennungen.
Nach diesem Stopp keine vollständige 22er-Abnahme behaupten.

Vier kleine freie Rahmenfotos reproduzieren die Duplikation unabhängig von
Sidebar und Tabellenposition: eine Fotokennung vor, zwei nach Save/Reopen.
Inline-Fotos behalten ihre eine Kennung. Die Ursache liegt im freien Rahmen-
Kontrollaufbau, nicht allein in der grossen App-Komposition.

Eine äussere typisierte Bildkontrolle um den kompletten Rahmen wurde verworfen:
22 native Inhaltsfälle bestehen damit zwar, aber drei bestehende Word-Bildstruktur-
Tests schlagen an (zwei Drawings/Textrahmen innerhalb einer Einzelbildkontrolle).
Diese Alternative ist zurückgenommen und nicht im Kandidaten enthalten.
Die Tests nicht zum Verdecken dieses Fehlers umschreiben. Nächster Schwerpunkt:
ein einzelnes gültiges Word-Bild pro Fotokontrolle bei freier Platzierung, ohne
duplizierte native Kennung; danach den Kandidaten erneut vollständig prüfen.

Der seltene historische Modern-/Sidebar-PDF-Clone-Abbruch ist nicht kausal geklärt.

Die Vorlagen-/Importmatrix vom 28. Oktober bleibt ein historischer Prüfstand;
sie wurde für diese Fortsetzung nicht erneut vollständig ausgeführt.
