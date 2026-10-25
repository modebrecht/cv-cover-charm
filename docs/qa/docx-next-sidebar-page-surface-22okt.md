# CV Sidebar als durchgehende Seitenfläche

22. Oktober 2026. Commit-Checkpoint auf `fix/docx-next-cv-page-surface-22okt`, aufgebaut auf verifiziertem Sidebar-Stand `f73c776e2eca6b9b0d858ee2ab997230259797ac`.

Die unterhalb des Textes abbrechende Sidebar-Farbfläche ist ein DOCX-Fidelity-Fehler. Sie ist keine persönliche Geschmacksfrage. Der bisherige Export verwendet dafür ausschliesslich die Schattierung einer Tabellenzelle. Diese folgt der Inhaltshöhe und beginnt innerhalb der Seitenränder. Eine solche Zelle kann die im PDF sichtbare durchgehende Seitenspalte allein nicht abbilden.

Die gelieferten Screenshots zeigen eine ganze Seitenhöhe im PDF und eine auf den Textbereich begrenzte Fläche im DOCX. Sie haben unterschiedliche Seiten- und Fotokonfigurationen; deshalb begründen sie keinen pixelgenauen Vorher/Nachher-Vergleich. Der Fehler wurde zusätzlich mit identischen gespeicherten Diagnosequellen vor und nach dem Fix reproduziert.

## Prüfung der aktiven Stände

Die aktiven Köpfe sind unverändert: Fidelity `7be40063856d1376acb60e917fe85599a6033dad`, Sidebar `f73c776e2eca6b9b0d858ee2ab997230259797ac`, CV-Pagination `e1f11779db1da78c08651b22b552cf6f54006e5d`. Auch der ältere Foto-Ownership-Branch und der Architektur-Audit-Branch enthalten an dieser Stelle ausschliesslich Zellenfarbe. Kein bereits vorhandener Fix für den durchgehenden Hintergrund wurde gefunden. Foto-, Referenz- und Seitenumbruchkorrekturen sind davon unabhängig.

163 vorhandene lokale Quell- und Testdateien wurden gegen die Git-Blob-IDs des aktuellen Sidebar-Kopfes geprüft; keine Abweichung. Die neue Arbeit erfolgt in einer separaten lokalen Kopie. Die vorherige kombinierte Zoom-Kandidatur ist kein Bestandteil dieser Kopie und wurde damit nicht erneut als Gesamtstand getestet.

## Änderung

Der gemeinsame Sidebar-Composer ergänzt den bestehenden Seitenhintergrund um die Farbfläche und ihre innere Begrenzung. Beide beginnen bei y = 0 und verwenden die volle Seitenhöhe. Die Fläche reicht vom unveränderten inneren Sidebar-Rand bis zum äusseren Papierrand. Der Renderer verwendet dafür seine bestehenden nichtsemantischen Artwork-Primitiven und seitenbezogene Hintergrundanker in der CV-Kopfzeile. Ohne Seitenbeschränkung gilt dieselbe Fläche für die erste Seite und Folgeseiten.

Die bestehende Zellenfarbe und Zellenbegrenzung bleiben erhalten, damit sich weder Textgeometrie noch Seitenumbrüche verändern. Es wird keine Tabellenzeile auf Papierhöhe gestreckt und kein leerer Absatz ergänzt. Text, Tabellen, Bilder, Bildausschnitte, Seitenränder und Content Controls bleiben identisch. Bei ausgeblendeter Dekoration wird keine neue Fläche ergänzt; klassische CV-Aufbauten bleiben ausserhalb dieses Pfades.

Der Fix übernimmt die bisherige native Farbe und Spaltenkante. Er ist keine Zertifizierung der vollständigen Web-Farben, Breiten oder Typografie. Der Unterschied zwischen Seitenfläche und Textfluss ist damit behoben; weitere Abweichungen müssen mit identisch konfigurierten Web- und Word-Quellen geprüft werden.

## Lokale Verifikation

| Prüfung | Ergebnis |
| --- | --- |
| Gezielt betroffene Sidebar-, Foto-, Grid- und angrenzende Renderer-Suites | 64 Tests bestanden, 0 fehlgeschlagen; davon 3 neue Regressionstests |
| Fokussiertes striktes TypeScript für Builder, Composer und Renderer | PASS |
| Quellenvergleich | 163 Dateien stimmen mit dem Remote-Sidebar-Stand überein |
| Drei gleiche Quellen vor und nach der Änderung | Links kurz; rechts mit Foto; rechts mit Kontakt-Header und Fortsetzungen |
| Seitenzahlen vorher/nachher | 3/3, 3/3, 6/6 Dossierseiten |
| Gerenderte Seiten insgesamt | 24, unmodifiziertes LibreOffice als ergänzende Prüfung |
| Neue CV-Seiten visuell geprüft | Alle 6 |
| Titelblatt- und Anschreibenseiten | Alle 12 Vergleichsseiten pixelidentisch |
| Semantische Dokumentstruktur | `word/document.xml` in allen 3 Paaren byteidentisch |
| Text und Positionen im Render | Sämtliche extrahierten Textspans, Schriftattribute und Positionen exakt identisch |
| Neue Farbfläche | An beiden vertikalen Seitenrändern auf jeder CV-Seite nachgewiesen; Bilddifferenzen auf die Seitenspalte begrenzt |
| Originalfoto | Vollständige Quelldaten eingebettet und unverändert |
| Patchprüfung | Zweidateien-Patch sauber angewendet; Ergebnisbytes stimmen mit den getesteten Dateien überein |

Die Diagnosequellen werden direkt über den gemeinsamen Exporter erzeugt. Es handelt sich nicht um neue reale UI-Downloads, aktuelle App-PDFs oder eine Microsoft-Word-Abnahme. Der lange Diagnosefall behält seine bisherigen Absatz- und Referenzaufteilungen; deren Qualität wird durch diesen Hintergrund-Fix nicht als bestanden erklärt. Auch die historischen Writer-Geometrie- und Bildtreue-Gates werden nicht abgeschwächt.

## Übergabe

[Patch](docx-next-sidebar-page-surface-22okt.patch) mit einer Produktdatei und einer Regressionstestdatei. Basis ist der oben genannte Sidebar-Kopf oder eine nachweislich kompatible Projektion nach Übernahme des Sidebar-Transports. Nicht als alleinigen Gesamttransport auf den noch unintegrierten Fidelity-Branch anwenden.

[Maschinenlesbarer Nachweis](docx-next-sidebar-page-surface-22okt-evidence.json) enthält Quellstände, Paket- und Bildprüfungen sowie den Patch-Hash. Der Patch-SHA-256 lautet `3ca26f3326c76293b9801e46eb864c1a44bb7ebd05c6329daa01571f692a3c22`.

**Status: lokaler Fix für die durchgehende Seitenfläche verifiziert.** Die spätere gemeinsame Kandidatur benötigt eine konsolidierte Word-Prüfung; keine neue Zwischenrunde beim Benutzer. Die bereits bestandene Word-Abnahme der CV-Pagination 02/12 bleibt geschlossen. Keine neue globale Sidebar- oder Produktionsfreigabe.

Produktfix, Regressionstests, QA-Skripte und Nachweise werden mit diesem Checkpoint veröffentlicht. Kein Merge, Integration, Deployment, CI-Dispatch, Produktionsschalter oder Engine-Patch wurde ausgeführt.

## Reproduktion

Die Diagnosequelle wird mit `bun scripts/qa-sidebar-page-surface-22okt.ts OUTPUT ORIGINAL_PHOTO.png VERIFIED_BASELINE_DIRECTORY` erzeugt. Das Baseline-Verzeichnis muss den oben verifizierten Sidebar-Stand enthalten. Die sechs DOCX anschliessend mit dem vorhandenen Dokument-Renderer in jeweils `<name>-render/` rendern. `python scripts/docx-next-sidebar-page-surface-verify.py OUTPUT` prüft Seitenzahlen, Textspans, Pixelgrenzen und die unveränderten Titelblatt-/Anschreibenseiten. Die DOCX sind interne Diagnoseartefakte, kein neuer Word-Abnahmeauftrag.
