# CV Cover Charm – Fortsetzung vom 30. Oktober 2026

Dieser Stand ergänzt den Handoff vom 29. Oktober. Dessen Aussage «nichts gepusht»
gilt für die damalige Sicherung, nicht mehr für die jetzige Fortsetzung.

## Verbindlicher Produktstand

- Repository: `modebrecht/cv-cover-charm`, veröffentlichter Branch `dev`.
- Produktcommit: `19f8fe27b3b0526e341b78ba276eea22ec23d966`.
- Produktbaum: `937d1ae35eb5638d81e9664bd2331627604dbb48`.
- Nachfolgende Abschlussänderungen betreffen nur README und Prüfnachweise.
- `main` und `render` wurden in dieser Fortsetzung nicht aktualisiert.
- Veröffentlichte Historie gemäss `AGENTS.md` nicht umschreiben.

## Abgeschlossen

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
  Writer verändert weiterhin Brief-Gruppierungs-/Tabellenkennungen; Word bleibt offen.
- Release-CI vollständig grün: 1470 Unit-Tests und 206 Browserfälle in elf Gruppen.
- 35 Fit-Prüfungen, Web-Galerie, Kontaktintegrität und Pages-Build ebenfalls grün.
- Details: `docs/qa/independent-single-docx-29okt.md` und zugehöriges JSON.
- Früherer CV-Nachweis: `docs/qa/independent-cv-docx-29okt.md`.

## Weiterhin offen

Desktop-Word ist hier nicht verfügbar. Keine neue Foto-Umgehung oder allgemeine
Word-Abnahme aus einem LibreOffice-Ergebnis ableiten. Die gespiegelte Fotoabnahme
und die bekannten nativen Forschungsbefunde bleiben separat.

Die aktuelle Forschungs-CI bestätigt elf erfolgreiche und vier bekannte fehlschlagende Gruppen:
`stable-comparison` und `picture-identity` mit historischen Paket-Prüfsummen,
`app-body-content` mit experimentellem langem `body-stories`-Speichern sowie
`verlauf-hero-long` mit sechs statt fünf Seiten. Diese Referenzen nicht blind ersetzen.
Der aktuelle CI-Abschluss steht im verlinkten QA-Bericht.

Ein sinnvoller nächster lokaler Schwerpunkt bleibt ein **konkret reproduzierter**
falscher Verteilungsfall bei bereits kompakten Standard-/Masonry-Rubriken:
Deren Messzuordnung kann unvollständig sein und auf Quellgewichte zurückfallen.
Zuerst Quelle und Fehlverteilung sichern; keine allgemeine Neugestaltung beginnen.
Der seltene historische Modern-/Sidebar-PDF-Clone-Abbruch ist nicht kausal geklärt.

Die Vorlagen-/Importmatrix vom 28. Oktober bleibt ein historischer Prüfstand;
sie wurde für diese Fortsetzung nicht erneut vollständig ausgeführt.
