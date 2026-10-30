# Übergabe: direkt verankertes Einzelbild, 30. Oktober 2026

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
