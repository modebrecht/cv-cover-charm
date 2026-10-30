# Kandidat: entkoppelte Zellanfänge – 30. Oktober 2026

**Nicht auf `dev` integriert.** Ausgangspunkt: `c3e9f4f17b8493526a602efff1b7110622bb154c`.
Die bestehende Export-Sperre für `body-stories` bleibt aktiv. Die normale,
vom Nutzer in Word bestätigte Komposition wird nicht umgestellt.

## Eingegrenzter Speicherabbruch

Frisch erzeugte lange linke/rechte App-Pakete sind bytegleich mit den bekannten
Gegenbeispielen. Das rechte Paket
`89d2b7f0a366f5b5cef3d353a3f1c0fbd736f8fedd8740fe962fe0a5044016e6`
überschreitet in der aktuellen CI weiterhin das 60-Sekunden-Limit beim Speichern.

Das Entfernen der CV-Feldkontrollen oder aller Story-Feldkontrollen beseitigt
das Problem nicht (jeweils 20-Sekunden-Diagnoselimit). Dagegen genügt es,
`keepNext` an den zwei leeren Zellanfängen auf false zu setzen: Speichern
benötigt im isolierten Versuch 0,822 Sekunden. Alle 383 Feldkennungen, ihre
Texte und Reihenfolge bleiben beim Speichern erhalten. Die deklarierten
Tabellen-/Zellgeometrien sind unverändert. Semantische Absatz-Kopplungen werden
nicht verändert. Weitere isolierte Kontrollen bestätigen die Beteiligung der
langen Hauptspur; die Gegenspur allein löst den Abbruch nicht aus.

Der Kandidat deklariert genau diese Strukturentscheidung im Modell und im
Renderer. Die Validierung erlaubt für section-start ausschliesslich den alten
impliziten Zustand oder explizit false. Die native QA prüft die beiden tatsächlichen
XML-Anker gegen die erklärte Eigenschaft. Der neue Modus verlangt ausdrücklich
`--detached-cell-starts`; die bisherige Standardprüfung akzeptiert ihn nicht still.

## Ergebnis und verbleibender Stopp

- 1487/1487 Unit-Tests bestanden; nach Rücknahme des Foto-Alternativversuchs
  die 13 betroffenen Tests nochmals bestanden.
- App-Typprüfung, geänderte Format-/Lintprüfung bestanden.
- Vier tatsächliche Exporte der normalen `shared-body-stories`-Komposition
  (links/rechts, jeweils ohne/mit Foto) behalten gegenüber `c3e9f4f` ihr
  vollständiges Modell und jedes DOCX-Paketbyte. Die Hashes stehen im JSON-Nachweis.
- 11/11 Python-Vertragstests, darunter vier neue Gegenprüfungen der Ankerpolitik.
- Die ersten 13 App-Fälle bestehen mit Quellzustand und zwei Save/Reopen-Zyklen,
  vollständigen nativen/sichtbaren Texten, Feldidentität, Reihenfolge, Kopf-/
  Fussbereichen, Fotoprüfungen und physischen Spaltenrändern. Dies umfasst den
  bisher abbrechenden langen rechten CV. Die erneute Prüfung verwendet nur
  erhaltene Beobachtungen mit exakt gebundenen Quell-/Speicher-/PDF-Hashes.
- Der 14. Fall `app-body-photo-free-main` stoppt weiterhin korrekt an doppelten
  `cv.person.photo`-Kennungen. Keine Fälle nach diesem Stopp werden als bestanden
  gezählt. Die vollständige 22er-Matrix und exakte Speichergeometrie bleiben offen.

## Kleiner Foto-Gegenbeweis und verworfene Alternative

Vier kleine Foto-Kontrollen (im Körper, in einer einzelnen, linken oder rechten
Zelle) erzeugen beim freien Word-Rahmen jeweils eine Fotokennung im Quellpaket
und zwei nach nativem Speichern. Alle Texte bleiben dabei erhalten. Vier
Inline-Kontrollen behalten ihre einzelne Kennung. Vier ungerahmte freie
Rohbilder enthalten bereits im Quellpaket keine solche Feldkennung; sie sind
deshalb kein positiver Nachweis für eine erhaltene Fotofeld-Identität.

Eine äussere Kontrolle um den gesamten Rahmen statt innerhalb seines Textinhalts
beseitigt die Duplikate in den vier Kontrollen und besteht die 22 nativen
App-Inhaltsfälle. Diese Alternative wurde dennoch zurückgenommen: Die vorhandene
typisierte Word-Bildkontrolle umschliesst dann einen Textrahmen mit zwei Drawings
statt eines einzelnen Bilds. Drei bestehende Bildstruktur-Tests schlagen an.
Sie wurden nicht umgeschrieben. Dieser Ansatz gehört nicht zum Kandidaten.

Nächster Schwerpunkt ist eine gültige einzelne Word-Bildkontrolle für das freie
Bild ohne duplizierte native Kennung. Das sichtbare Foto allein reicht nicht
als Identitätsnachweis. Details, Hashes und Gegenprüfungen stehen in
`body-boundary-candidate-30okt.json`.

## Reproduktion

```sh
bun test tests/unit
python scripts/docx-next-sidebar-body-test.py
bun scripts/docx-next-sidebar-body-probe.ts "$QA_ROOT/fixtures" \
  --normalized-cache "$VERIFIED_BROWSER_FIXTURES"
python scripts/docx-next-sidebar-body-qa.py "$QA_ROOT/fixtures" \
  --engine "$QA_ROOT/setup/runtime" --binding "$QA_ROOT/uno-binding" \
  --detached-cell-starts
```

Der Cache muss aus der vorhandenen tatsächlichen Browser-Normalisierung stammen;
die CI verwendet weiterhin frische Browserdaten. Der letzte Befehl soll bis zur
Behebung des freien Fotofalls genau am beschriebenen Identitätsfehler stoppen.
