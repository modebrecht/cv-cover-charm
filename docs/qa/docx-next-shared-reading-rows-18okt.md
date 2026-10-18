# Gemeinsame CV Zeilen und Listen

Nachtrag vom 19. Oktober: Der Nutzer hat präzisiert, dass zwei CV-Seiten ohne Einseiten-Aktion allein kein Blocker sind. Die vorhandene Seitenauswahl ist inzwischen bis zum echten PDF-/DOCX-Download angebunden; [Kandidat 10 und Nachweis](docx-next-shared-page-fit-19okt.md). Die nachstehenden Zahlen beschreiben unverändert den historischen Kandidaten 09.

**PARTIAL. Die gemeinsame native Zeilenkomposition ist technisch geprüft; vollständige Web-/Word-Paginierung und Microsoft-Word-Abnahme bleiben offen.** Grundlage ist der veröffentlichte Farbstand `fc1a0caecc9eca9138444f9776342aefd8466ef0` auf `fix/docx-next-shared-fidelity-18okt`.

## Verhalten und gemeinsame Ursache

Der bisherige klassische Word-CV stapelte Datum, Titel, Ort und Beschreibung. Sprachname und Niveau standen ebenfalls untereinander. Stärken und Hobbys verwendeten keine native Nummerierung; im normalen CV-Kopf erschien zusätzlich eine Kontaktüberschrift, die die Web-Komposition dort nicht zeigt.

Die explizite Option `cvContentComposition: "reading-rows"` verwendet für klassische fliessende CVs die bestehende Datums-/Tabellenfunktion: 27 mm linke Spalte und 5 mm Einzug der rechten Inhalte, ohne sichtbare Tabellenränder. Sprachname und Niveau erhalten dieselbe zweispaltige Struktur. Listen nutzen die vorhandene semantische Nummerierung mit echten Aufzählungspunkten. Die bisherigen Feldidentitäten, Inhalte und eigenen Zeichenformate bleiben erhalten. Nur die zusätzliche Überschrift `cv.section.person.heading` entfällt.

Die Abstände der Eintrags- und Sprachzeilen folgen dem vorhandenen klassischen 0,6-mm-Rhythmus, Referenzfelder dem vorhandenen lokalen 0,35-mm-Abstand. Der gemeinsame Rubrikabstand beträgt in diesem Versuch 1,2 mm; ein explizit gespeicherter Rubrikabstand hat Vorrang. Es gibt keine Vorlagennamen-Weiche und keine Schriftverkleinerung. Tabellenhöhen sind nicht fixiert; lange Beschreibungen dürfen über Seiten fliessen. Leere Datumsfelder und einseitige Sprachangaben erzeugen keine erfundenen Textfelder.

Die Option ist ein Diagnosekandidat. Der bisherige Export ohne Option bleibt reproduzierbar. Sidebar, andere CV-Varianten, freie Elemente und verschobene persönliche Kopfbereiche werden für diesen Versuch ausdrücklich abgelehnt. Die vorhandene Modern-App-Grenze bleibt auf Brief/Modern begrenzt; die gemeinsame Modellfunktion enthält keine solche Vorlagenbegrenzung. Der kanonische Pfad liest weiterhin weder DOM noch PDF-Daten.

## Nachweise und Grenzen

| Prüfung | Ergebnis |
| --- | --- |
| Brief, Modern, Warm/Freundlich, Verlauf und Neon | Je ein echter Projektimport, sichtbarer CV und native Modell-/Paketerzeugung; identische Felder und unveränderte gespeicherte Quelle |
| Kontrollierter Modern-App-Einstieg | Frische Messungen, alter/neuer Export und unveränderte gespeicherte Daten bestanden; kein neuer UI-Button für den Diagnoseparameter |
| Kandidat 08 reproduzieren | Bytegleich zum früheren Kandidaten, Git-Blob `cf61812ee070cfe3d6630a986a0589279741bc75` |
| Kandidat 09 gegen 08 | Nur `word/document.xml` und `word/numbering.xml` ändern sich; alle Medien und Header-/Footer-XML bleiben bytegleich |
| Deckblatt und Anschreiben | Modelle unverändert und beide ergänzend gerenderten Seiten pixelgleich |
| Native Inhalte | Sämtliche Modelltexte im PDF vorhanden; bestehende Kontrollen erhalten, ausgenommen die bewusst entfernte Kontaktüberschrift |
| Pills und Listen | Alle sieben Überschriftentexte innerhalb ihrer Hintergrundflächen; sechs echte Listenabsätze |
| Lange Beschreibung | Textdiagnose mit 160 nummerierten Abschnitten über sieben Dossierseiten; alle 160 Marker vorhanden, Beschreibung fliesst über mehrere Seiten. Browserdekorationen sind in dieser Textdiagnose ausgelassen |
| Unit-/DOCX-Tests | 1238 Unit-Tests bestanden, einschliesslich 425 DOCX-Tests |
| Typecheck und Lint | Typecheck und Lint der geänderten Produkt-/Testdateien bestanden |

Alle vier Seiten des aktuellen Modern-Kandidaten wurden als PNG visuell geprüft. Das ist ergänzende LibreOffice-Evidenz. Die fünf generischen Modellpakete belegen keine visuelle Cover-Freigabe dieser Vorlagen und keinen realen App-/Word-Nachweis ausserhalb der begrenzten Modern-Grenze.

**Die Seitenabweichung ist nicht behoben:** Die Web-Quelle benötigt eine CV-Seite, Kandidat 09 weiterhin zwei. Auf der zweiten nativen CV-Seite stehen jetzt nur noch die Referenzen. Weiter offen sind die exakte Absatz-/Zeilenmetrik, vollständige Kontakthierarchie, die Dokumentschriftrollen und eine quellgetreue kompakte Referenzkomposition. Beliebige Umbrüche, halbe Spalten, Inline-Familienzeilen und die All-39-Matrix sind hier nicht abgenommen. Keine pauschale Verdichtung oder erzwungene Einseitigkeit hinzufügen.

## Word Test und Reproduktion

[09 Modern CV Zeilen und Listen](docx-next-shared-reading-rows-18okt/09-Modern-CV-Zeilen-und-Listen.docx) ist der neue Word-Testkandidat. Prüfen: Datums- und Sprachspalten, Listenpunkte, alle sieben Pills und Referenzen; danach einen Text ändern, speichern, schliessen/wieder öffnen und als Word-PDF exportieren. **Word-Darstellung und Save/Reopen: UNVERIFIED.**

`scripts/docx-next-reading-rows18okt.ts OUTPUT PROJECT_JSON` führt den Projektimport und die fünf Browser-/Modellfälle aus und erzeugt den Modern-App-Kandidaten. `scripts/docx-next-reading-rows18okt.py APP RENDER BEFORE_RENDER LONG_RENDER OUTPUT` prüft unveränderte Pakete und erzeugt den kompakten Nachweis. Rendern mit dem vorhandenen `render_docx.py`, Arial-/Liberation-Sans-Profil und unverändertem LibreOffice. [Prüfwerte](docx-next-shared-reading-rows-18okt/validation.json), [Browserfälle](docx-next-shared-reading-rows-18okt/results.json) und gespeicherte Quellen/Modelle liegen im Belegordner.

Die Veröffentlichung bleibt auf diesen Untersuchungsbranch begrenzt. Die Vercel-Sperre und Workflow-Branchfilter bleiben unverändert; kein CI-Dispatch, Merge, Deployment oder Wechsel des Standardexports.
