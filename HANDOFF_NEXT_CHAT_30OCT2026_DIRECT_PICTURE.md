# Übergabe: direkt verankertes Einzelbild, 30. Oktober 2026

## Abschluss nach Nutzerentscheidung: Word-Datei praktisch abgenommen

Neu maßgeblich: `docs/qa/word-practical-acceptance-31okt.md` samt JSON.
Der Nutzer akzeptiert die sichtbare Darstellung, sofern Speichern und erneutes
Öffnen in Word keine Reparatur verlangen, und hat den lokalen Commit beauftragt.
Unveränderte Originalpixel und exakte unsichtbare Bildmatrizen sind dafür keine
zusätzlichen Abnahmebedingungen. Keine weitere Engine-/Variantenrunde beauftragt.

Der echte dreiseitige Hauptfall als Rich-Text-Variante besteht den Word-Ablauf:
zwei dokumentierte Save/Reopen-Zyklen, beim Abschluss nochmals reparaturfrei
geöffnet; alle drei PDF-Seiten geprüft, rot/blaues Testfoto vollständig sichtbar.
Lokale bytegleiche Auslieferung: `artifacts/word-practical-31okt/Dossier-Word-final.docx`.
Dies ist die Word-Abnahme dieses Testdossiers, keine pauschale 22er-Freigabe.
Der normale Produktexport bleibt unverändert; Varianten bleiben explizit wählbar
und gegen versehentliche Aktivierung abgesichert.

Wichtiger echter Gegenbeleg aus der Abschlussprüfung: Rich Text nach zwei
Writer-Saves öffnet zwar ohne Reparatur in Word, zeigt dort aber nur den leeren
Fotoumrandungsring. Dieser Rücklauf ist NICHT abgenommen. Er liegt getrennt als
`artifacts/word-practical-31okt/Dossier-Word-geprueft.docx` mit Fehler-PDF vor;
der vorläufige Dateiname ist keine Freigabe. Nicht mit `Dossier-Word-final` verwechseln.

Abschlusschecks: 1495/1495 Unit-Tests in der eingerichteten Linux-Testumgebung,
Typprüfung, Lint und Format der geänderten TS-Dateien bestanden. Die vorhandenen
148 Python-Prüfungen sind an unveränderte aktuelle Skripthashes gebunden.
Erster eingeschränkter Windows-Unit-Lauf: 1486 bestanden, neun Fehler bei
gesperrten Kindprozessen; vollständiger Linux-Lauf danach grün.
Lokaler Commit autorisiert; kein Push und kein Merge.
Die folgenden Abschnitte sind historische Untersuchungsstände mit strengeren
Verträgen. Deren offene Engine-Arbeit wird nicht stillschweigend fortgesetzt.

## Neuester Stand: echte Engine-Gegenprobe und Besitzvertrag 2

Bericht `docs/qa/writer-crop-engine-31okt.md` samt JSON ist jetzt maßgeblich.
Keine neue DOCX-Variantenrunde: unveränderte Minimalquellen wurden mit frischer
Referenz und isolierter Diagnosekopie der Engine ausgeführt. Global deaktivierter
Bitmap-Crop erhält Originalpixel, zeigt aber den falschen Ausschnitt: verworfen.
Referenzbibliothek unverändert (SHA beginnt 7b931192), Diagnosekopie b8b17c5f.
16 neue Saves, 24 PDFs/24 Seiten. Kein Engine-Austausch oder Push/Merge.
NEUE PRÜFLÜCKE GESCHLOSSEN: Writer ersetzt pic:pic durch WPS bei Ellipsen auch
ohne Crop. Original-Ellipse und Writer-Rechteck öffnen in Word ohne Reparatur;
Writer-Ellipse ohne Crop verlangt Reparatur (abgelehnt). Beide Writer-Kontrollen
haben zudem dieselben sechs Schemafehler; nicht jede Warnung allein WPS zuschreiben.
Besitzvertrag 2 verlangt jetzt echtes pic:pic mit passender URI. Erhaltene Pixel
in WPS genügen nicht. Historische 4/4-Besitzaussagen waren Vertrag 1, keine Abnahme.
148 fokussierte Python-Tests bestanden, darunter 29 Besitz- und 10 Nachweisguards.
Neuer wiederverwendbarer Runner: scripts/docx-next-picture-crop-engine-qa.py.
Ungebaute Upstream-Test-/Kernbaustein-Patches unter docs/qa/patches/ mit README:
nur Kontext geprüft, KEIN C++-Build, KEINE angebundene Import-/Exportkorrektur.
WSL hat keinen vorbereiteten LO-Build; Windows-VS2022-C++ ist vorhanden, aber
ebenfalls kein eingerichteter LO-Entwicklungsbuild. Nächster Schritt: echter
LO-Build, Tests zuerst, koordinierte Modell-/Render-/PIC-Exportkorrektur.
Keine weiteren Formatvarianten auf Verdacht. Alte Rohberichte/Gegenbelege erhalten.

## Neueste lokale Fortsetzung: Kontur korrigiert, Writer-Crop minimal isoliert

Bericht `docs/qa/word-picture-crop-31okt.md` mit JSON. Neue reproduzierbare
Minimalprobe `scripts/docx-next-picture-crop-repro.py`: gleiche 120x180-RGB-Bitmap,
Rechteck/Ellipse jeweils mit/ohne Crop. Nur Ellipse plus Crop verliert Pixel
(96x96 nach Save 1/2); alle vier behalten typisierten textfreien Bildbesitz und
stabile sichtbare Geometrie. Offizieller Writer-Importcode ruft dafür physischen
Bitmap-Zuschnitt auf. Keine Engine geändert oder externe Meldung veröffentlicht.
Tabellen-Diagnoseproduzent reserviert jetzt die volle effectExtent-Breite:
rechte Word-Kontur geschlossen, alle vier Writer-Quellen weiter exakt.
Originalpixel weiterhin 4/4 verloren; Word-Hauptfall zwei reparaturfreie Zyklen,
alle Paketprüfungen bestanden. Word-PDF-Vergleich noch NICHT abgenommen:
Druckerwechsel zwischen Exporten änderte PDF-Seitengrößen trotz unverändertem A4
im DOCX. Fehlvergleich erhalten. Quelle und Save 2 sind in Word geöffnet.
Nächster Schritt: beide mit demselben bereiten PDF-Drucker neu exportieren.
26 neue native Saves, 39 PDFs/147 Seiten; acht neue Quellen schemafehlerfrei.
Rohdaten `artifacts/word-picture-crop-31okt/`. Runde endete an Nutzungsbegrenzung;
keine neue volle Testsuite, kein Commit/Push/Merge, keine Produktfreigabe.

## Neue lokale Stunde am 31. Oktober: typisierter Tabellen-Bildbesitz

Bericht: `docs/qa/word-floating-picture-31okt.md` samt JSON. Reproduzierbare
Diagnose: `scripts/docx-next-floating-picture-probe.py`; kein Produktrendererwechsel
in dieser Stunde, kein Commit/Push/Merge. Vier feste Writer-Quellen treffen die
bisherige Writer-Ansicht exakt, behalten typisierten textfreien Bildbesitz und
exakte Geometrie über zwei Saves. Originalpixel gehen weiterhin in 4/4 verloren.
Word-Hauptfall öffnet ohne Reparatur, einmal separat gespeichert/geschlossen/
wieder geöffnet; Paket und Word-PDF bleiben stabil. Gegen bisherige Word-Ansicht
aber 0,05 pt horizontale Abweichung und unterbrochene rechte Kontur: keine Abnahme.
Custom-Geometrie erhält Originalpixel, trifft jedoch die Ausgangsansicht nicht;
WPS-Picture-Variante fordert Word-Reparatur. Diese Gegenbelege nicht übergehen.
42 neue native DOCX-Saves, 63 PDFs/243 Seiten, Rohdaten ignoriert unter
`artifacts/word-native-model-31okt/`. Nächster Schritt: Crop-Pixelverlust und
Word-Kontur/Position lösen, dann volle Matrix und vier Word-Fälle mit zwei Zyklen.

## Lokale Windows-Fortsetzung am 31. Oktober: Word-Fehler und Tile-Drift getrennt

Aktueller lokaler Checkout jetzt `94d9021956734b39045c4aa3891c08fe6ae0e116`,
ohne Merge-Commit vorgezogen; lokale Aenderungen gesichert und erhalten.
Die folgende Momentaufnahme ist noch nicht committet oder gepusht.
Verbindliche neue lokale Berichte: `docs/qa/word-direct-picture-31okt.md`
und `docs/qa/word-tile-precision-31okt.md`, jeweils mit gebundenem JSON.

- Die unveraenderte synthetische Quelle verlangt in Word Reparatur; auch
  ihre separat gespeicherte Reparaturdatei verlangt beim Wiederoeffnen wieder
  Reparatur. Kein zweiter reparaturfreier Zyklus und keine Word-Abnahme.
- Diagnostisches Rich Text oeffnet und speichert in Word reparaturfrei, bleibt
  aber ausserhalb des typisierten Bildvertrags. Writer verliert damit allein
  weiterhin die eigene Bildzuordnung.
- Rich Text plus fuehrender versteckter Bereichsmarker und Tile-Fuellung
  erhaelt in vier Writer-Faellen physisch eigenes Drawing und Originalpixel.
  Es verletzt aber Kontrolltyp/Textvertrag und driftet in der Bildskalierung.
  Drei neue Speicherzyklen trennen die Ursache: 100-%-Skalierung bleibt exakt,
  benoetigte Skalierung schrumpft auch bei Verschiebung null. Kein Produktfix.
- PDF-Geometrievertrag 2 erkennt jetzt Bildmatrizen und Seitengroessen exakt.
  Vier neue Gegenproben, insgesamt 135 fokussierte Python- und acht gezielte
  Renderer-Tests bestanden. Historische 22er-PDFs erneut hashgebunden gelesen:
  weiter 18/22; neue Writer-Tile-Faelle 0/4; bestehender Word-Tile-Hauptfall
  Quelle gegen Save 2 exakt. Strenge Bildvertraege wurden nicht gelockert.
- Die vorher offenen GitHub-Laeufe auf `7035fc2` sind abgeschlossen:
  Release samt elf Browsergruppen erfolgreich; native Matrix 12/15 mit den
  drei bekannten Fehlern. Keine neuen GitHub-Laeufe fuer lokale Aenderungen.

Rohdateien lokal unter `artifacts/word-desktop-31okt/`. Die neuen Varianten
sind zweifach gesperrte Diagnoseoptionen. Nicht als fertige Foto-Loesung
uebernehmen und keine Referenzwerte anpassen. Naechste Produktentscheidung
braucht eine andere verlustfreie Crop-/Kontrollabbildung oder eine eigenstaendig
belegte Engine-Korrektur; weitere identische Tile-Saves ersetzen das nicht.
Kein Commit, Push, Produktionsfreigabe oder Merge in dieser lokalen Fortsetzung.
Die folgenden Abschnitte sind historische Uebergabestaende.

## Neuester Stand: CI-Abhaengigkeit des Word-Lesers repariert

`7035fc228bd41be771f86b898c6155d7f6b2fed1` korrigiert eine eigene
Setup-Regression auf `33f0affe`: Dem GitHub-App-Job fehlte `lxml` fuer den
neu eingebundenen Word-Leser. Die Abhaengigkeit ist nun auf `6.1.1` gepinnt.
In einer frischen Python-3.12-Umgebung zuerst reproduziert, danach alle
115 fokussierten Tests bestanden. Neuer nativer App-Job `124500550125`
bestaetigt die Installation und alle zwoelf neuen Ruecklaufpruefungen.
Die native Sammlung erreicht wieder 22/22 Inhaltsfaelle und 18/22 exakte
Geometriefaelle; Bildbesitz und Originalpixel bleiben fehlerhaft. Sechs
Importproben erneut gesammelt. Archiv `13037742273` samt Digest, allen
66 DOCX-/PDF-Phasen und sechs Import-Eingabehashes lokal verifiziert.
Details und vollstaendige Hashes: `docs/qa/picture-word-31okt.md`.

Vorheriger Release `41167821056` auf `33f0affe` vollstaendig erfolgreich
mit 1490 Unit-Tests und elf Browsergruppen. Neuer Release `41188610365`
auf `7035fc2`: Fast-Checks mit 1490 Tests bestanden, Browser noch offen.
Neuer nativer Lauf `41188610434` bei dieser Momentaufnahme noch offen.
Kein Produktionsfix, kein Word-Lauf, kein Merge; Desktop-Word bleibt der
naechste fachliche Abgleich. Geschuetzte Branches unveraendert.

---

## Neueste Fortsetzung: Word-Ruecklauf fuer zwei Speicherzyklen vorbereitet

`docs/qa/picture-word-31okt.md` beschreibt den begrenzten Desktop-Word-Ablauf
fuer genau die unveraenderte, textfreie Quelle. Der neue lesende Befehl
`scripts/docx-next-picture-word-return.py` wertet beide Rueckdateien gegen
die hashgebundene Quelle und zusaetzlich gegeneinander aus. Er verwendet
die bestehenden strengen Feld-/Bildleser; ein Erstverlust kann nicht hinter
einer stabilen zweiten Datei verschwinden. Zwoelf neue Gegenproben, 51 alte
Word-Leserpruefungen und die 52 fokussierten Bild-/Inhaltspruefungen bestehen
erneut, insgesamt 115. Neue CI-Ergebnisse erst nach tatsaechlichem Lauf melden.
Die Ruecklaufpruefung startet kein Office und vergibt auch fuer bytegleiche
Kopien keine Word-Abnahme. Keine neue Word-Ausfuehrung, keine nativen
Importe/Speicherungen und kein Produktionsfix in dieser Fortsetzung.
Die Ausfuehrung in Desktop-Word bleibt der naechste fachliche Schritt.
Der Windows-Checkout wurde nicht verbunden. Kein Merge.

---

## Neuester Arbeitsblock: aktive Bilddaten direkt nach Originalimport

Neue verbindliche Berichte: `docs/qa/picture-import-30okt.md` und `.json`.
Der vorherige Release-Lauf `41123950447` ist jetzt vollstaendig gruen:
1490 Unit-Tests und alle elf Browsergruppen. Native Matrix weiterhin 12/15.

Der Pixelverlust liegt bereits vor dem ersten Speichern in der aktiven nativen
Fuellbitmap. Sechs frische, lesende Originalimporte auf hashgepruefter
LibreOfficeKit 25.8.7.3 vergleichen Form und Zuschnitt bei identischen Bildbytes.
Nur die zugeschnittene Ellipse zeigt 96x96 statt 120x180 Pixeln; Rechteck und
Nullzuschnitt behalten das Original. Der 96x96-Bitmaphash ist exakt der
Integer-Ausschnitt `[10,44,106,140)` des Originals. Keine DPI-Hypothese daraus
machen: Die gemessenen Pixel passen ohne Resampling zum Zuschneideaufruf in
`GraphicProperties::pushToPropMap` / `lclCropGraphic`, versionsgebundene Quelle
`oox/source/drawingml/fillproperties.cxx`. Kein interner Breakpoint gesetzt.

Der neue reine Lese-Beobachter ist reproduzierbar und in der CI nach der
regulaeren App-Matrix eingebunden. Eine unveraenderte synthetische rot-blaue
Quellfixture ist dauerhaft im Repository gebunden; keine Nutzerfotografie.
Acht neue Decoder-/Crop-Vertragstests bestehen, insgesamt 52 gezielte Python-
Pruefungen. Der Nachweis umfasst sechs neue lesende Importe und null Exporte;
andere getrennte Geometrie-Gegenversuche haben eigene Speicher-/PDF-Laeufe.

Bildzuordnung bleibt ein zweiter Fehler: Freier Anker auf der nativen
Kontroll-Startgrenze, Inline-Anker danach. Leere sichtbare Control-Zeichenketten
allein unterscheiden beide nicht. Die Block-Bildkontrolle ist schon beim
Originalimport im nativen ContentControl-Supplier nicht vorhanden; ihre
Nullhoehenvariante verschiebt den Text nach Save/Reopen um 0.194045 mm.
Alternative Fill-/Tile-Zuschnitte behalten zwar Pixel, aber nicht die Ansicht.
Ein geplanter Ein-Schritt-Ankerversuch wurde vor dem Setzen abgebrochen, weil
keine strikt innere Cursorposition erreicht wurde. Keine Reparatur freigegeben.

Kein Produktionsfix integriert, kein Merge, keine neue Word-Abnahme.
Desktop-Word bleibt der naechste fachliche Abgleich fuer den unveraenderten,
textfreien Fotofall. Der Windows-Checkout wurde nicht erneut verbunden.
Dieser Arbeitsblock laeuft isoliert unter Linux. Abschluss auf `d98f5490`: Release `41132330872` vollstaendig erfolgreich mit
1490 Unit-Tests und allen elf Browsergruppen. Native `41132330670`: 12/15;
Bildvertrag, historischer Paket-Pin und dieselbe begrenzte gotoRange-Beobachtung
bleiben fehlerhaft. Neuer Importbeobachter und acht neue Tests in der CI
bestaetigt. Archiv `13013528300` heruntergeladen, Digest und alle sechs
Quellbindungen geprueft: Bitmap-/Kontrollbeobachtungen exakt gleich wie lokal.
`dev`, `main` und `render` unveraendert. Vorherige Momentaufnahmen folgen unten.

---

## Neueste Fortsetzung: Bereichs-Workaround verworfen, Textvertrag verschaerft

Details: `docs/qa/picture-range-30okt.md` und `.json`.
Das Archiv zu `e395d4d6` ist jetzt auch lokal byteweise gegen seinen
veroeffentlichten Digest verifiziert; alle 66 DOCX-/PDF-Bindungen und alle 44
PDF-Vergleiche sind erneut bestaetigt. Weiterhin 18/22 Faelle exakt stabil.

Zwei WORD JOINER-Zeichen um das freie Drawing erhalten auf der Entwicklungsengine
physisch die Bildzuordnung und die exakte sichtbare Ausgangsgeometrie ueber zwei
Speicherzyklen. Dieser Ansatz ist trotzdem verworfen: Die ISO-Regel fuer eine
typisierte Bildkontrolle erlaubt nur das einzelne Bild, keine Zusatztexte.
Ein Versuch mit Ausblendung liess ausserdem das Foto verschwinden und ist
separat verworfen. Die Pixelneubildung runder Fotos bleibt bestehen.

Der strenge Pruefer lehnt zusaetzlichen Text in Bildkontrollen jetzt explizit ab;
26 Vertragstests bestehen. Alle alten 66 Phasen wurden damit erneut geprueft:
dieselben vier Zuordnungsfehler, keine neue pauschale Freigabe. Der Bereichs-
Gegenversuch muss bereits an seiner nicht konformen Quelle scheitern und bleibt
nur als ausdruecklich ungueltige Mechanismus-Diagnose messbar.

Native CI auf `84df3749`: Lauf `41123950685`, alle acht Gegenversuche gesammelt.
Die gepinnte Engine bestaetigt den physischen Bereichseffekt bei gleicher
sichtbarer Geometrie. Archiv `13010975631` heruntergeladen, Digest verifiziert,
alle 24 Probenbindungen und 66 App-Phasen mit dem neuen Textvertrag erneut
geprueft: Der Bereichsversuch faellt in allen Phasen durch. Der vorherige
CI-Pruefer kannte diese Beschraenkung noch nicht. Ein hashgebundener Replay des
neuen Sammlers und alle 44 lokalen Bild-/Inhalts-/Medientests bestehen. Dieser
QA-Nachtrag startet keine erneute volle Browsermatrix. Kein Produktfix integriert.
Die Desktop-Word-Abnahme der normalen textfreien Quelle bleibt offen.
Die Fortsetzung lief isoliert unter Linux; der Windows-Checkout wurde nicht
erneut verbunden oder synchronisiert (letzter bestaetigter Stand: `e395d4d6`).
CI-Abschluss: native Matrix 12/15 erfolgreich; `app-body-content`,
`picture-identity` und erneut `stable-comparison` (urspruengliche gotoRange-Auswahl)
scheitern. Release: Fast-Checks mit 1490 Unit-Tests und zehn von elf Browsergruppen
bestanden; `cv-pdf-core` noch offen. Vollstaendige Details und Zeitpunkt im neuen
Bericht. `dev`, `main` und `render` sind unveraendert.
Die folgenden Abschnitte dokumentieren den vorherigen Abschlussstand.

---

## Aktueller Abschluss: strenge Bildzuordnung und sieben native Gegenversuche

**Keine Freigabe, kein Merge.** Code-Commit:
`e395d4d662ebbc7cf59b231efb3dcbf9bd10604f`, Branch
`work/30okt-body-boundary-candidate`. Die normale App-Komposition und alle
bestehenden Bildstrukturtests bleiben unveraendert. Geaendert wurden QA,
Diagnoseerzeugung und CI; die Produktdateien unter `src/` wurden in diesem
Arbeitsblock nicht veraendert.

Verbindliche neue Berichte:
`docs/qa/picture-owner-contract-30okt.md`,
`docs/qa/picture-owner-contract-30okt.json` (lesende Bindungspruefung der
alten 66 Phasen) und `docs/qa/picture-owner-native-30okt.json`
(neue tatsaechliche CI-Befunde aus den abgeschlossenen Joblogs).

### Was konkret behoben ist

- Der bisherige Inhaltsvertrag konnte eine erhaltene Fotokennung und ein
  daneben sichtbares Foto als Erfolg behandeln. Die zusaetzliche strenge
  Bildpruefung verlangt jetzt eine typisierte aktive Kontrolle mit einem
  eigenen Drawing und einer eigenen gueltigen eingebetteten Bildbeziehung.
- Leere Kontrollen, fremde Nachbarbilder, verschachtelte Rahmen und falsche
  Beziehungen werden abgelehnt. Originale RGBA-Pixel und Abmessungen werden
  separat geprueft. Die vorhandenen Grenzwerte wurden nicht gelockert.
- Die durch diesen Renderer erzeugten `mc:AlternateContent`-Zweige werden
  anhand lokal gebundener `wps`-Anforderungen ausgewertet. Ein inaktiver
  VML-Fallback ist keine zweite aktive Kontrolle; echte Duplikate im aktiven
  Zweig bleiben Fehler. Die vier leeren direkten Kontrollen bleiben Fehler.
- 23 lokale adversarielle Bild-Vertragstests, 10 bestehende Import-Vertragstests,
  Format-/Diff-Pruefung und App-Typpruefung bestanden. Linux-CI bestaetigt auch
  die aktualisierten dateibasierten Pakettests; deren lokaler Windows-Tempfehler
  wurde nicht als Erfolg gewertet.

### Gemessener Bildbefund

Der direkte Kandidat besteht erneut alle 22 Inhaltsfaelle, scheitert aber
korrekt an `pictureOwnershipAcceptance` und `imageDataAcceptance`.
Die Geometriesammlung ist vollstaendig und meldet weiterhin alle drei exakten
Geometrie-Gates als fehlgeschlagen. Die fruehere detaillierte 18/22-Zaehlung
stammt aus dem Bericht zu `3972e87b`; fuer das neue Archiv wurde sie nach
Verbindungsabbruch nicht lokal erneut gezaehlt.

Sieben begrenzte Gegenversuche wurden frisch mit zwei Speicherzyklen ausgefuehrt:
direkte Ellipse, direkte Rechtecke mit/ohne Crop, Inline-Ellipse,
Inline-Rechteck ohne Rand, zeichenbezogene Verankerung und der unveraenderte
urspruengliche freie Bildrahmen. Nur die beiden reinen Inline-Kontrollen behalten
ihre Bildzuordnung. Nur die rechteckige Inline-Kontrolle besteht zusaetzlich den
Originalpixelvertrag; sie hat ein anderes Form-/Positionierungsverhalten und
ist kein gleichwertiger Produktfix.

Beim urspruenglichen freien Rahmen ergibt sich roh `1,2,2`, aktiv `1,1,1`
Foto-Kontrollen. Auch seine aktive typisierte Kontrolle besitzt nach Speichern
**0 Drawings und 0 Bildbeziehungen**. Die Alternativen-Korrektur loest diesen
tatsaechlichen Besitzverlust nicht. Sein App-Versuch scheitert zudem an nativer
Feldreihenfolge. Er wurde nicht als neue Loesung integriert. Der direkte
Diagnosemodus ist wiederhergestellt und wird korrekt streng zurueckgewiesen.

### CI-Abschluss und Restfehler

Native Matrix:
https://github.com/modebrecht/cv-cover-charm/actions/runs/41093747738

12/15 Jobs erfolgreich, einschliesslich aller zehn Vorlagengruppen,
`entry-flow-content` und `supported-sidebar`. Drei getrennte Fehler:

1. `app-body-content`: strenger Bildbesitzvertrag nach 22 bestandenen Inhaltsfaellen.
2. `picture-identity`: unveraenderter historischer Paket-Pin `61444b40...`
   statt `8dfabf25...`. Kein neuer Hash wurde akzeptiert.
3. `stable-comparison`: `native-pop-qa` konnte die vollstaendige urspruengliche
   `gotoRange`-Auswahl in drei begrenzten Importversuchen nicht messen.
   Keine Lockerung; dieser Befund bleibt offen. Der vorausgehende
   Import-Callback-Vertrag wurde nicht geaendert. Dessen Rohdaten werden nun vor
   der Validierung aufbewahrt, damit kuenftige Abweichungen belegbar bleiben.

Aktuelle Release-Regression:
https://github.com/modebrecht/cv-cover-charm/actions/runs/41093747710
Der gesamte Release-Lauf ist erfolgreich abgeschlossen: Fast-Checks einschliesslich 1490 Unit-Tests sowie alle elf Browsergruppen bestanden.

### Lokaler Zustand und sinnvoller naechster Schritt

Die Rechnerverbindung wurde nach gesichertem Code-Commit `e395d4d6`
unverfuegbar. Der lokale Checkout wurde zuletzt bei diesem Commit sauber
bestaetigt. Dieser Abschlussnachtrag wurde danach direkt auf GitHub geschrieben;
vor lokaler Fortsetzung die aktuelle Branchspitze per Fast-forward uebernehmen.
Kein neues Klonen und kein Umschreiben veroeffentlichter Historie erforderlich.

Word wurde ueber die UI gestartet, aber kein Testdokument erfolgreich geoeffnet
oder gespeichert. **Keine neue Desktop-Word-Abnahme.** Auf dem Rechner liegt
die synthetische Kopie
`artifacts/word-owner-30okt/word-free-main-source.docx`
(SHA `7dd758c9...1923`). Die aelteren Nutzerfreigaben 01–04b gelten nicht
automatisch fuer diesen Versuch.

Naechster begrenzter Schwerpunkt: genau diesen freien Fotofall in Desktop-Word
oeffnen, unter getrennten Namen zweimal speichern/wiederoeffnen und die eigenen
Bildbeziehungen, Originalpixel, Feldidentitaet und PDF-Positionen kontrollieren.
Erst dieser Nachweis trennt einen Writer-spezifischen Grenzfall von einem
ungeeigneten Word-Quellmodell. Die gespeicherten Pakete nicht nachtraeglich
reparieren und fehlende Bildzuordnung nicht als Sichtbarkeitsfreigabe ersetzen.

`dev`, `main` und `render` wurden gegen die urspruenglichen SHAs geprueft
und bleiben unveraendert. Die folgenden Abschnitte sind historische
Momentaufnahmen; der damalige lokale Pruefstopp lag vor diesem ausdruecklich
beauftragten Arbeitsblock.

---

## Aktualisierung: bestehende CI vollstaendig ausgewertet

Die unten dokumentierten laufenden Jobs sind inzwischen beendet. Verbindlicher
neuer Befund: `docs/qa/direct-picture-ci-30okt.md` und `.json`.

- Release-Regression erfolgreich: 1490 Unit-Tests und alle elf Browsergruppen.
- Native Matrix: 14/15 Jobs erfolgreich, alle zehn Vorlagengruppen eingeschlossen.
  Der bekannte `picture-identity`-Pinfehler bleibt unveraendert.
- 22/22 Inhaltsfaelle bestanden, aber nur 18/22 exakt geometrisch stabil.
  Vier rechte Sidebar-Faelle verlieren pro Speichern einen Twip in der linken
  Spalte; zwei Fotopositionen verschieben sich, maximal 0.03526917 mm insgesamt.
- Alle neun Fotos werden beim ersten Speichern von 120x180 Pixeln neu gerastert
  (acht auf 96x96, Hochformat auf 73x91). Originale RGBA-Pixel bleiben nicht erhalten.
- Bei allen vier wirklich direkt verankerten Fotos ist die Bildkontrolle nach
  dem Speichern leer; Kennung und sichtbares Foto bleiben getrennt erhalten.
  Dieser Besitzverlust wird vom bisherigen Inhaltsvertrag nicht erkannt.
- Archiv-Digest und 66 DOCX-/66 PDF-Phasenbindungen geprueft. Nur vorhandene
  Artefakte ausgewertet; keine neuen nativen Tests oder Exporte gestartet.

**Keine Freigabe, kein Merge.** Naechster Schwerpunkt: Bildzuordnung nach
Save/Reopen mit einem strengen Vertrag absichern und ihren Verlust beheben.
Danach Bilddaten-Erhalt, rechte Rasterdrift und eigenstaendige Desktop-Word-Abnahme.
Die folgenden Abschnitte halten den vorherigen Uebergabezeitpunkt fest.

**Auf Nutzerwunsch gestoppt, committen und übergeben.** Keine weiteren lokalen
Prüfungen starten. Die schon gestartete GitHub-CI darf fertiglaufen; zuerst deren
Ergebnisse auswerten, keine erneute lokale Testumgebung aufbauen.

## Branches und Sicherung

- Repository: `modebrecht/cv-cover-charm`.
- Arbeitsbranch: `work/30okt-body-boundary-candidate`.
- Implementierung und CI-Konfiguration sind mit
  `3972e87b2723dd9199b184ec1e0936c9e9c2617f` committet und gepusht.
- Basis: `1ef024f59c3907a8424e3316af2f462c1a6cec85`.
- Kein Merge. `dev` bleibt `c8e0a4e306e2e519d2b9392b43fb9759fb8c5078`,
  `main` bleibt `44d7eb950b4fe972d6e890a72b6d3256ce365bc9`,
  `render` bleibt `1fe6dbe59184a759d97f9c393353a8a3d9e1f89a`.
- Keine veröffentlichte Historie umschreiben; `AGENTS.md` beachten.

## Was umgesetzt ist

Der Renderer besitzt die ausdrücklich unakzeptierte Versuchsoption
`directPictureOwnership: true`. Sie verlangt zusätzlich
`allowUnacceptedModelIssues: true`. Nur im bisherigen freien Rahmenpfad wird
der Textrahmen durch eine typisierte Bildkontrolle um ein einziges direkt
verankertes Bild ersetzt. Der Standardpfad bleibt unverändert.

Bestehende Bildstrukturtests wurden nicht geändert. Der Versuch übernimmt
Bildgeometrie, Crop, Rand und Quellkoordinaten, behält den Absatz-/Seitenbezug
und reserviert die entfallene Rahmen-Instanznummer, damit spätere Zeichnungen
in Kopfbereichen unverändert bleiben. Der bisherige zusätzliche Baseline-Raum
des Textrahmens entfällt: Auswirkungen auf Textfluss und Position sind offen.

Die App-Prüferzeugung und native QA verwenden ausdrücklich
`--direct-picture-ownership`; die QA kontrolliert Metadaten und Quell-XML
(eine typisierte Kontrolle, ein Drawing, ein Bild, kein Textkasten).
Bestehende Pixel-, Identitäts- und Geometriegrenzen wurden nicht gelockert.

Die Workflow-Dateien erlauben den separaten Kandidatenbranch. Nur dessen
`app-body-content` schaltet `--direct-picture-ownership` und
`--detached-cell-starts` ein. Die übrigen nativen Gruppen und historischen
Paket-Pins bleiben unverändert. Keine Freigabe für den normalen App-Export.

## Tatsächlich bestandene Prüfungen

- **1490/1490 Unit-Tests unter Linux**, Bun 1.3.13, 282 Dateien.
- **7/7 gezielte Bildtests**, darunter die bestehenden Besitz-/Strukturtests.
- **25/25 Python-Vertragstests**: 11 Body-Inventar, 6 Medien, 8 Speichergeometrie.
- App-Typprüfung, geänderte Lint-/Formatprüfung und Diff-Prüfung.
- Vier isolierte Quellkontexte im echten Renderer: Körper, Einzelzelle,
  linke und rechte Zelle. Eine typisierte Kontrolle mit einem verankerten Bild,
  unveränderte Medien/andere Paketdateien, deterministische Ausgabe,
  Bytegleichheit bei ausgeschalteter Option und unverändertes Modell.
- Release-CI `fast-checks` ist bereits vollständig erfolgreich
  (Unit-Tests, Format, TypeScript, Lint, Produktionsbuild).

Der erste Windows-Gesamtlauf enthielt Pfad-/Zeilenendenfehler und einen Fehler
im neuen Test. Er ist kein positiver Nachweis. Der korrigierte Linux-Gesamtlauf
ist vollständig grün. Die neuen Tests bestätigen auch, dass die normalisierte
gespiegelte Seitenfoto-Fixture inline bleibt; sie ist kein freier Bildfall.

## Laufende GitHub-Prüfungen – noch kein Gesamtergebnis

Beide Läufe beziehen sich exakt auf `3972e87b`:

- Native 15er-Matrix:
  https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788805
- Release-Regression mit Browserfällen:
  https://github.com/modebrecht/cv-cover-charm/actions/runs/41080788695

Beim letzten Abruf sind fünf native Vorlagengruppen erfolgreich:
`gallery`, `studio2`, `studio`, `terracotta`, `aurora`.
`app-body-content` steht noch beim Aufbau der verifizierten Engine;
sein Job ist `124149015624`. **Noch keine vollständige 22er-App-Abnahme!**
Die übrigen nativen Gruppen sind noch nicht abschliessend ausgewertet.
Im Release-Lauf sind `fast-checks` und vier Browsergruppen erfolgreich;
weitere Browsergruppen laufen. Keine Aussage über 206 bestandene Fälle machen,
bevor der Gesamtlauf fertig ist.

Den unveränderten historischen `picture-identity`-Pinfehler weiterhin getrennt
behandeln und nicht durch neue Hashes verdecken. `stable-comparison` und die
übrigen Gruppen müssen ebenfalls bis zum Ende ausgewertet werden.

## Word-Zusatzversuch

Auf diesem Windows-Rechner ist Word installiert. Ein isolierter COM-Start für
die vier synthetischen Kontrollen ist jedoch an `0x80080005`
(`CO_E_SERVER_EXEC_FAILURE`) gescheitert. Kein Dokument wurde dabei erfolgreich
geöffnet oder gespeichert. **Keine neue Word-Abnahme.**
Computer Use zeigte nur ein bereits vom Nutzer geöffnetes, fachfremdes Dokument;
dieses wurde nicht bedient. Der Hilfsaufruf ist beendet. Private Word-Dateien und
Screenshots gehören weiterhin nicht ins öffentliche Repository.

## Nächste fachliche Schritte nach neuem Arbeitsauftrag

1. Die zwei bestehenden GitHub-Läufe abschliessend auswerten; Artefakte und
   exakte Commitbindung prüfen. Keine gleichen Läufe ohne neuen Grund starten.
2. `app-body-report.json` prüfen: alle 22 Fälle mit Quellzustand und zwei
   Save/Reopen-Zyklen, Feldidentität/-reihenfolge, Texte, Bilder und Pixel.
3. `app-save-geometry-report.json` und PDF-Fotokoordinaten vergleichen.
   Ein erfolgreicher Sammellauf ist nicht automatisch exakte Geometriefreigabe.
   Bildpositionen pro Foto und Speicherphase konkret beziffern; keine Toleranzen
   vergrössern. Eine Positions-/Layoutverschiebung verhindert eine Freigabe.
4. Tatsächliche Desktop-Word-Prüfung gesondert nachweisen. Frühere akzeptierte
   Word-Dateien 01–04b gelten nicht automatisch für diese neue Architektur.
5. Erst nach vollständigen positiven Nachweisen einen Merge beurteilen.
   `main` und `render` unverändert lassen.

## Lokaler Ort und Nachweise

Checkout: `C:\Users\gsu\Documents\ChatGPT\ib2026\cv-cover-charm`.
Berichte: `docs/qa/direct-picture-candidate-30okt.{md,json}`.
Neue Tests: `tests/unit/docx-next-direct-picture.test.ts`.

Ignorierte lokale Diagnoseartefakte liegen unter `artifacts/direct-picture/`,
unter anderem `unit-tests-linux.log`, `picture-tests.log`, vier synthetische
DOCX-Quellen, `smoke.mjs`, `loader.mjs` und der fehlgeschlagene Word-Hilfsaufruf.
Unter `artifacts/tools/` liegen lokale Bun-Binaries und eine Python-Umgebung.
Diese Hilfsdateien sind nicht Teil der öffentlichen Sicherung.
