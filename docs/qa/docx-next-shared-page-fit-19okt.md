# Gemeinsame CV Seitenauswahl

**PARTIAL. Der tatsächliche Einseiten-/Zweiseiten-Button ist bis zum PDF- und kontrollierten DOCX-Download geprüft. Desktop-Word und Save/Reopen bleiben UNVERIFIED.** Arbeitsbranch: `fix/docx-next-shared-fidelity-18okt`, Ausgangspunkt `447e95bc631513fc6cea4dfd48a3a4100f14cfea`.

## Abnahmekriterium und Ursache

Die Nutzerpräzisierung vom 19. Oktober ist massgebend: Referenzen auf CV-Seite 2 sind für sich allein kein Freigabeblocker. Wenn die Einseiten-Aktion gewählt wird, muss deren gespeicherte Anordnung auch im Export ankommen. Ein ungeänderter CV muss dafür nicht pauschal verdichtet werden.

Der echte Klick auf **Alles auf 1 Seite** speicherte bereits die Schriftwerte und die halbe Breite der kurzen Rubriken. Im Beispieldossier sind das 90 Prozent für den Namen, 86 Prozent für die Rubrikrolle und 85 Prozent für den übrigen Text. Die Werte überstanden Reload und gelangten ins native Modell. Der native Export lehnte jedoch die kompakten Rubriken ab: Die gemessene Sprachen-Pill war vorhanden, wurde wegen ihrer halben Breite trotzdem zurückgewiesen. Das allgemeine Modell meldete ausserdem drei `masonry-section-converted-to-rows`-Probleme. [Vorheriger Ablehnungsbefund](docx-next-shared-page-fit-19okt/before-error.json).

## Gemeinsame Korrektur

Web und native Komposition verwenden nun dieselbe reine Zuordnung der Rubriken zu zwei Spalten. Sie erhält die Quellreihenfolge innerhalb jeder Spalte und die bestehende Gleichstandsregel. Die native Seite verwendet die vorhandene Tabellenkomposition mit 6 mm Spaltenabstand und automatischen Zeilenhöhen. Es werden weder Inhaltsbilder erzeugt noch Vorlagennamen-Weichen ergänzt.

Bei einer Pill als erstem echten Absatz einer Spalte trägt der native Zellabstand die obere Freistellung. Auf expliziten Folgeseiten bleibt die Fläche an der ersten echten Textzeile. Vorhandene Absatzabstände zwischen weiteren Rubriken bleiben beim vorhergehenden Absatz bzw. Tabellenende. Es gibt keine neuen Abstandshalter-Absätze oder Textkästen. Überbreite, mehrzeilige oder nicht unterstützte Rubriken bleiben ausdrücklich abgelehnt. Die vorhandene Sidebar-Komposition und Engine bleiben unberührt.

Der kontrollierte Modern-Testpfad ist nun auch per echtem Download-Button erreichbar:

`/?docx-next-design-qa=1&docx-next-interior-qa=1&docx-next-reading-rows-qa=1`

Im CV zuerst die gewünschte Seitenauswahl klicken; dann im bestehenden Gesamtdossier-Export **Modern CV-Zeilen testen** wählen. Der QA-Einstieg für native Dateien liegt weiterhin beim Deckblatt/Gesamtdossier. Ohne die kombinierten Diagnoseparameter wird kein neuer Exportpfad eingeschaltet.

## Ergebnisse

| Gespeicherter Zustand | Web CV | Normaler PDF-Download CV | Nativer App-DOCX CV im ergänzenden Rendering |
| --- | ---: | ---: | ---: |
| Alles auf 1 Seite | 1 | 1 | 1 |
| Alles auf 2 Seiten | 2 | 2 | 2 |
| Wechsel 2 zu 1, dann nochmals 1 | 1 | nicht nochmals erzeugt | Bytegleich zur ersten Einseitendatei |
| Ohne Seitenauswahl | 1 | nicht nochmals erzeugt | Bytegleich zu Kandidat 09; weiterhin 2 native CV-Seiten |

Alle vier Fälle wurden aus einem echten Projektimport mit echten UI-Klicks, Autosave, Reload und dem anschliessenden DOCX-Download geprüft. Der heruntergeladene DOCX-Inhalt stimmt jeweils bytegleich mit der frischen App-Erzeugung überein. Die Warteschleife prüft die tatsächlich gespeicherten Schriftwerte, Seiten, Breiten und Packungsarten, bevor neu geladen wird.

Bei Ein- und Zweiseiten-Ausgabe sind sämtliche CV-Modelltexte in beiden tatsächlichen PDF-Ergebnissen vorhanden. Alle sieben Pill-Texte liegen im ergänzenden nativen Rendering innerhalb ihrer Flächen. Deckblatt und Anschreiben sind in beiden Fällen pixelgleich zum bisherigen Kandidaten. Alle drei Seiten von Kandidat 10 wurden als PNG visuell geprüft. Das ist LibreOffice-Evidenz, keine Microsoft-Word-Freigabe.

**1244 Unit-Tests bestanden**, einschliesslich **431 DOCX-Tests** im vollständigen Unit-Lauf; Typecheck, Lint der geänderten Produkt-/Testdateien und Build bestanden. Die reine gespeicherte Einseiten-Komposition ist zusätzlich für Brief, Modern, Warm/Freundlich, Verlauf und Neon auf Felderhalt, Quelle, native Spalten und Abstände geprüft. Die vollständige UI-/PDF-/App-DOCX-Seitenzahlkette dieses Schritts betrifft Modern. Sie ist keine All-39- oder allgemeine Einseitigkeitsgarantie für beliebige Inhaltsmengen und Schriftprofile.

## Word Kandidat und offene Arbeit

[10 Modern Alles auf 1 Seite](docx-next-shared-page-fit-19okt/10-Modern-Alles-auf-1-Seite.docx) enthält Deckblatt, Anschreiben und **einen CV inklusive Referenzen**. Die Vorlage bleibt nativ bearbeitbar. In Desktop-Word sind Seitenzahl, kompakte Rubriken, Textänderung und Speichern/Schliessen/Wiederöffnen noch zu prüfen. Die übrigen bekannten Design-Fidelity-Aufgaben bleiben in der [Gesamtarbeitsliste](docx-next-global-fidelity-backlog-18okt.md).

Reproduktion: `scripts/docx-next-page-fit19okt.ts OUTPUT PROJECT_JSON` mit `PAGE_FIT_CASES=one,two,toggle,default` und `PAGE_FIT_PDF=1`; vorhandenes Sans-/Chromium-Profil verwenden. `scripts/docx-next-page-fit19okt.py APP ONE_RENDER TWO_RENDER BASELINE_RENDER CANDIDATE09 OUTPUT` prüft und sichert den kompakten Nachweis. [Prüfwerte und Pill-Geometrie](docx-next-shared-page-fit-19okt/validation.json), [Checks](docx-next-shared-page-fit-19okt/checks.json) und die beiden vollständigen Quelle-/Modellnachweise liegen im Belegordner. Die grossen PDF-Rohdateien werden nicht erneut ins Repository kopiert.

Nur der vorhandene `18okt`-Untersuchungsbranch wird fortgeschrieben. Deployment-Sperre und Workflow-Filter bleiben unverändert; kein Merge, CI-Dispatch oder Standardexport-Wechsel.
