# Unabhängige Titelblatt- und Brief-Word-Downloads – 29. Oktober 2026

Titelblatt und Motivationsschreiben können jeweils einzeln als DOCX heruntergeladen
werden, wenn der ausgewählte Teil das bestehende Word-Profil erfüllt. Die Vorlage,
Schrift, Formatierung und Vollständigkeit der anderen Dossierteile blockieren diesen
Download nicht mehr. Dies ergänzt den bereits unabhängigen CV-Download aus `da0adfa`.

## Verhalten

- «DOCX» prüft und baut den ausgewählten Teil. «Dossier DOCX» verlangt weiterhin
  das vollständige unterstützte Dossier und zeigt seinen eigenen Hinweis.
- Die Auswahl gilt bereits für Schriftmessung, Header-Erfassung und Modellaufbau.
  Ein Titelblatt benötigt keine Brief- oder CV-Messwerte; ein Brief benötigt nur
  seine eigenen Header-Messwerte. Ungewählte Geschichten bleiben leer und erhalten
  weder native Seitenobjekte noch Medien.
- Das Teilmodell bewahrt die Auswahl nach JSON-Wiederherstellung; ein widersprechender
  Renderauftrag wird weiterhin abgelehnt. Ein leerer CV-Container erhält kein
  Sidebar-Layout, das fälschlich eine vollständige CV-Komposition versprechen würde.
- Verfügbare gemeinsame Kontakt- und Farbeinstellungen bleiben berücksichtigt.
  Fehlende oder unlesbare andere Teile erhalten leere interne Container, die weder
  exportiert noch gespeichert werden. Ein beschädigter CV kann deshalb auch die
  gemeinsam angezeigte Kontakt-/Dossiervorschau nicht mehr zum Absturz bringen.
- Gespeicherte Feldtypografie wird nur für den ausgewählten Teil gebunden. Ungeklärte
  eigene oder beim direkten Modellaufbau mehrdeutige Identitäten bleiben gesperrt.
- Brief-Dateiname und Metadaten verwenden Briefabsender beziehungsweise den
  bestehenden synchronisierten Kontakt sowie den Briefbetreff. Fremde Titelblatt-
  Metadaten werden nicht übernommen. Das Titelblatt behält seine eigenen Metadaten.

## Korrigierte Titelblatt-Grenze

Die native Sichtprüfung fand einen zusätzlichen Fehler beim einzelnen Titelblatt:
Ohne normalen Absatz nach dem letzten positionierten Textrahmen verschob Writer
«Beilagen» an den oberen Seitenrand und brach die Überschrift um. Die Rahmendaten
waren korrekt; im vollständigen Dossier stellt dessen Abschnittswechsel den
fehlenden normalen Absatz bereit. Zwei isolierte Paket-Gegenproben bestätigten
den Unterschied. Der Renderer ergänzt jetzt ausschliesslich bei einem abschliessenden
Titelblatt-Rahmen den vorhandenen minimalen normalen Grenzabsatz. Die vollständige Referenzdatei
bleibt bytegleich (`baab4a6ec960037978e88998aa03658f79e135d5606430fde1da5cb1c80f33a6`);
ihre Abschnittsgrenzen werden nicht verändert. Die native Prüfung vergleicht
nun auch die tatsächliche Position und Einzeiligkeit der Beilagenüberschrift mit
der im Originalpaket deklarierten Position – vor und nach zweimaligem Speichern.

## Bestehende Grenzen

Titelblatt und Brief bleiben auf Modern und die tatsächlich geprüfte Sans-Schrift
begrenzt. Beim Brief gelten weiterhin Kontaktkopf, kompakter Fuss und das bisherige
Plain-Text-/Layoutprofil. Formatierter Brieftext und individuelle Briefabstände
werden nicht freigegeben. Die CV-Grenzen bleiben unverändert.

Die Desktop-Word-Abnahme bleibt offen. Die vier bekannten roten Gruppen der nativen
Forschungs-QA werden weder durch neue Referenzwerte noch durch gelockerte Prüfungen
umgangen. Insbesondere ist ein erfolgreicher Writer-Textvergleich keine vollständige
Abnahme nativer Feld- und Tabellenidentitäten.

## Prüfstand

Abschluss und Veröffentlichung am 30. Oktober 2026.

- 1470 Unit-Tests in 280 Dateien bestanden, darunter neun neue gezielte Modellfälle.
- Zwölf neue Browserfälle: jeweils gemischte Designs, fehlende andere Teile,
  beschädigtes JSON, strukturell unlesbare andere Teile, eigene nicht unterstützte
  Einstellungen und ein leerer ausgewählter Teil.
- Acht echte Einzeldownloads: vier Titelblätter und vier Briefe. Die Browserfälle
  prüfen genau einen Dokumentabschnitt, keine fremden Geschichten und unveränderte
  gespeicherte JSON-Strings beziehungsweise weiterhin fehlende andere Teile.
- Die bisherigen zwölf CV-/Dossier-Browserfälle werden zusätzlich ausgeführt.
- Die zwölf neuen Fälle erweitern die Release-CI von 194 auf 206 Browserfälle;
  ihre Word-Dateien erhalten ein eigenes CI-Artefakt.

Der letzte lokale Browserlauf besteht mit **24/24 Fällen**, ohne Fehler oder
Wiederholungen. Typprüfung, vollständige Formatprüfung und Produktionsbuild
bestehen; ESLint meldet keine Fehler und 21 bereits bestehende Warnungen.

Die acht Downloads ergeben drei verschiedene Paket-SHA-256. Jedes Paket bleibt
nativ einseitig und behält seinen vollständigen Text. Beide Speicher-/Wiederöffnungs-
zyklen erhalten beim Titelblatt alle 11 und beim Brief alle 22 eindeutigen
Inhaltsfeldkennungen samt Werten. Bytegleiche Downloads verwenden denselben
nativen Nachweis. Beim Brief verliert Writer weiterhin sechs Kopfzeilen-
Gruppierungskennungen und die interne Tabellenkennung des Empfängerblocks;
das ist ausdrücklich keine vollständige Strukturabnahme. Die Beilagenüberschrift
bleibt im Titelblatt auch nach beiden Speicherzyklen korrekt positioniert.

Die Export-Isolationsfälle warten auf «Automatisch gespeichert», bevor sie den
Speicherstand vergleichen oder andere Teile entfernen. So prüfen sie den Download
nach den normalen Editor-Lademigrationen (CV-Fingerabdruck beziehungsweise
Brief-Header-Normalisierung). Der Vergleich bleibt bytegenau. Der gemeinsame
Importhelfer wartet zudem gezielt auf die abgeschlossene initiale IndexedDB-
Wiederherstellung; hierfür gilt derselbe 20-Sekunden-Rahmen wie für den Import-Reload.

Maschinenlesbare Ergebnisse stehen in `independent-single-docx-29okt.json`.

## GitHub-Abschluss vom 30. Oktober 2026

Der veröffentlichte Produktcommit
[`19f8fe2`](https://github.com/modebrecht/cv-cover-charm/commit/19f8fe27b3b0526e341b78ba276eea22ec23d966)
hat die vollständige
[Release-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/41014301912)
bestanden: **1470 Unit-Tests und 206 Browserfälle in elf Gruppen**,
Gesamtstatus `M6 Release Candidate: success`. Die Dossiergruppe enthält 90 Fälle,
darunter alle zwölf neuen Einzelexport-Fälle; die acht erzeugten Word-Dateien
werden als eigenes CI-Artefakt aufbewahrt.

Zusätzlich bestanden alle 35
[Fit-Prüfungen](https://github.com/modebrecht/cv-cover-charm/actions/runs/41014301906),
Web-Galerie, Kontaktintegrität und Pages-Build. Die
[native Forschungs-QA](https://github.com/modebrecht/cv-cover-charm/actions/runs/41014301932)
bestätigt elf erfolgreiche und die vier bekannten fehlschlagenden Gruppen.
Beide historischen Ist-Prüfsummen sind zum vorherigen Stand identisch;
der experimentelle lange Speicherfall und `verlauf-hero-long` bleiben unverändert offen.

Der nachfolgende Dokumentationscommit aktualisiert README, Handoff und diese
Prüfnachweise. Er ändert keinen Produktcode. Veröffentlicht wurde nur auf `dev`.
