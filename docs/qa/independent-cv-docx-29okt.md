# Unabhängiger CV-Word-Download – 29. Oktober 2026

Ein Modern-CV mit Sidebar kann als einzelnes DOCX heruntergeladen werden,
auch wenn Titelblatt und Brief andere Vorlagen oder nicht unterstützte
Formatierungen verwenden oder fehlen. Der bisher gemeinsame Eingangscheck
und der vollständige Modellaufbau blockierten diesen CV-Download.

## Änderung

- Der Menüpunkt «DOCX» im CV prüft den CV. «Dossier DOCX» behält die vollständige
  Dossierprüfung. Die Oberfläche nennt den jeweils betroffenen Download.
- Der CV-Aufbau überspringt Brief und Titelblatt sowie ihre Schriftmessungen,
  Bilder und Layoutprüfungen. Vorhandene gemeinsame Kontakt- und Farbeinstellungen
  bleiben berücksichtigt. Fehlende andere Teile erhalten nur leere interne
  Container; nichts wird in den Browserstand geschrieben.
- Das Teilmodell trägt seinen Exportumfang durch JSON-Wiederherstellung. Es
  erzeugt standardmässig ausschliesslich den CV und lehnt einen widersprüchlichen
  Export eines anderen Teils ab.
- Dateiname und DOCX-Metadaten stammen beim CV aus dessen Namen und Titel.
  Unabhängige Titelblatt-Metadaten werden nicht übernommen.
- Die bisherigen CV-Grenzen bleiben geprüft: Modern, Sidebar, Sans und das
  freigegebene Kopf-/Fusszeilenprofil. Ungeklärte CV-Typografie bleibt blockiert.
- Beschädigte andere Dossierteile können den CV weder über den Exportcheck noch
  über die gemeinsame Kontaktanzeige abstürzen lassen. Die gespeicherten Daten
  werden unverändert aufbewahrt. Die lesenden Adapter prüfen konsumierte Felder;
  ältere flache Farbpaletten bleiben kompatibel.

## Nachweise

Der Ausgangsfehler ist im unveränderten Stand `67ff634` im Browser reproduziert:
Bei anderem Titelblatt-/Briefdesign ist der CV-Menüpunkt deaktiviert. Derselbe
Fall erzeugt mit der Änderung eine echte CV-Datei.

| Prüfung                                       | Ergebnis                                                       |
| --------------------------------------------- | -------------------------------------------------------------- |
| Vollständige Unit-Suite                       | 1461/1461, 280 Dateien                                         |
| Neue unabhängige CV-Browserfälle              | 7/7                                                            |
| Bestehende Word-Download-/Ausrichtungsfälle   | 5/5                                                            |
| App-Typprüfung und vollständige Formatprüfung | bestanden                                                      |
| ESLint                                        | keine Fehler; 21 bekannte Warnungen                            |
| Produktionsbuild                              | bestanden                                                      |
| Fünf tatsächliche CV-DOCX                     | ZIP/XML, Beziehungen und jeweils ein Dokumentabschnitt geprüft |
| Fotos in diesen fünf Dateien                  | Originalmasse und alle RGBA-Pixel erhalten                     |

Drei heruntergeladene CVs wurden zusätzlich nativ gerendert und jeweils zweimal
in LibreOffice gespeichert: je eine PDF-Seite, vollständiger sichtbarer Haupttext und
43/43 gleiche Feldkennungen im Haupttext in beiden gespeicherten Fassungen.
Ein ergänzender Scan aller Word-XML-Dateien erfasst auch die anders benannten
Kopfzeilen: Alle 47 eindeutigen Inhaltsfelder behalten ihre Kennungen und Werte.
Writer entfernt sechs äussere Kopfzeilen-Gruppierungskennungen und wiederholt
einzelne Kontaktfelder; die Anzahl der Steuerelement-Vorkommen steigt von 59
auf 63. Die bekannten internen Tabellenbeschriftungen gehen weiterhin verloren.
Daraus folgt keine vollständige Struktur- oder Desktop-Word-Abnahme.
Maschinenlesbarer Nachweis: `independent-cv-docx-29okt.json`.

Die Browserfälle umfassen gemischte Vorlagen, formatierten Brieftext, fehlende
andere Teile, beschädigtes JSON, strukturell unlesbare andere Teile, die eigene
nicht unterstützte CV-Schrift, einen normalen vollständigen Entwurf sowie die
Handyansicht mit gespiegelter Sidebar und gewöhnlichem Foto. Die gespeicherten
JSON-Strings bleiben nach dem Download bytegleich bzw. weiterhin abwesend.

Die normale Editor-Initialisierung kann unabhängig vom Export einen fehlenden
Brief-Fontstatus anlegen. Der Export-Isolationstest entfernt die anderen Teile
nach dieser Initialisierung und prüft, dass der Download sie nicht neu anlegt.

Die sieben Fälle sind in der bestehenden CI-Gruppe `dossier-flow` aufgenommen.
Ihre erzeugten Dateien werden als eigenes GitHub-Artefakt aufbewahrt. Der
Release-Lauf umfasst damit 194 statt zuvor 187 Browserfälle.

Auf dem veröffentlichten Produktcommit `da0adfa` ist die
[Release-CI](https://github.com/modebrecht/cv-cover-charm/actions/runs/40928354152)
vollständig grün: 1461 Unit-Tests und 194 Browserfälle in elf Gruppen;
Gesamtstatus `M6 Release Candidate: success`. Die 78 Dossierfälle enthalten
alle sieben neuen CV-Fälle. Zusätzlich bestanden alle 35
[Fit-Prüfungen](https://github.com/modebrecht/cv-cover-charm/actions/runs/40928354129),
Web-Galerie, Kontaktintegrität und Pages-Build. Die
[native Forschungs-QA](https://github.com/modebrecht/cv-cover-charm/actions/runs/40928354133)
bestätigt unverändert elf erfolgreiche und vier bekannte fehlschlagende Gruppen.
Der nachfolgende Dokumentationscommit ändert keinen Produktcode.

## Weiterhin offen

Die Desktop-Word-Abnahme bleibt offen. Ein separater Writer-Gegenversuch zum
Firmenfeld im Brief bestätigte den dokumentierten Kennungsverlust beim zweiten
Speichern; eine andere Inline-Platzierung verlor die Kennung schon beim ersten
Speichern. Daraus wurde keine globale Änderung der Feld- oder Fotoobjekte abgeleitet.

Die vier bekannten roten Gruppen der nativen Forschungs-QA bleiben separat:
historische Paket-Prüfsummen, experimentelle `body-stories` und die zusätzliche
Seite im Stressfall `verlauf-hero-long`. Diese Änderung erweitert weder die
Vorlagenfreigabe noch die Word-Unterstützung für formatierten Brieftext oder
feste CV-Seite-2-Zuweisungen. Titelblatt- und Brief-Einzelexporte verwenden
weiterhin ihre bisherige vollständige Prüfung.
