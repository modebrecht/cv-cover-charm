# Kolumne und Studio 3 Standard · erster DOCX-Seitenumbruch

Der interne DOCX-Prüfpfad verwendet den Satzspiegel, die Datumsspalte, den Fotorahmen und die Zeilenhöhen aus der Webvorschau. Für die Schrift verwendet der Writer-Test Liberation Sans. Die Referenz nutzt 18 gleich lange Praxisbeschreibungen. Beim zweiten Fall wechseln kurze, mittlere und lange Beschreibungen.

| Vorlage und Fall           | App-PDF                                | Bisheriges DOCX in Writer              | DOCX-Prüfpfad in Writer                |
| -------------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------- |
| Kolumne, Referenz          | 3 Seiten, Seite 1 bis Praxisstation 05 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 05 |
| Kolumne, gemischte Längen  | 3 Seiten, Seite 1 bis Praxisstation 06 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 06 |
| Studio 3, Referenz         | 3 Seiten, Seite 1 bis Praxisstation 06 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 06 |
| Studio 3, gemischte Längen | 3 Seiten, Seite 1 bis Praxisstation 07 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 07 |

In jedem Fall stehen alle 20 Textmarkierungen auf denselben Seiten wie im App-PDF. Alle 18 Praxisbeschreibungen stehen vollständig bei ihrem Titel. Nach zwei Speicher- und Wiederöffnungszyklen mit LibreOffice Writer 25.8.7.3 stimmen diese Prüfungen und die vier Prüfpunkte des Fotoausschnitts weiterhin.

Die leere kompakte CV-Fusszeile erhält im internen Lesefluss mit `cvFooterComposition: "painted-compact"` die Reserve aus dem Web-Satzspiegel. Der native Abstand der leeren Fusszeile beträgt 0 mm. Eigener Fusszeilentext verwendet seine native Textreserve. Im Prüffall setzt der zusätzliche Abstand mit automatisch eingefügtem Namen die verfügbare Unterkante rund 12 mm nach oben. Die weiteren Anpassungen berücksichtigen die nativen Absatzgrenzen nach einer Datumstabelle und halten einen Eintrag zusammen, wenn die Webvorschau ihn vollständig auf einer Seite zeigt.

Bei Studio 3 liegt der Beginn des Kopfblocks rund 14 mm unter der Oberkante des Satzspiegels. Die Testsuite übernimmt diesen Abstand einmalig am Dokumentanfang. Der native Fotorahmen liegt so auch nach dem Wiederöffnen innerhalb von 0,05 mm zur Webvorschau. Die erste Praxisstation beginnt in Writer bei Kolumne rund 7,4 mm tiefer und bei Studio 3 rund 1,6 mm höher als im App-PDF.

## Reproduktion

Die QA nutzt die synthetischen Projektdaten der bisherigen Layoutmatrix, Chromium und einen LibreOfficeKit-Adapter. Sie legt das App-PDF, die internen DOCX-Ausgaben, die gerenderten PDFs und die Prüfdaten unter `artifacts/classic-docx-pagination` ab.

```bash
CLASSIC_CV_QA_LO_KIT=/absoluter/pfad/zu/lo-kit \
  npx playwright test --config tests/qa/playwright.classic-docx.config.ts
```

Der Nachweis gilt für den internen DOCX-Prüfpfad in diesen vier Fällen. Typografie und Farbflächen weichen weiterhin ab. Kolumne hat in Writer eine schmalere, hellere linke Fläche. Studio 3 zeigt in Writer einen durchgehend dunklen Kopfstreifen. Beide Farbabweichungen sind bereits im bisherigen internen DOCX sichtbar. Die Abnahme in Microsoft Word Desktop steht aus.

## Sidebar rechts · Vorprüfung

Die interne gemeinsame Sidebar-Komposition mit normalem Word-Bild ergibt bei beiden Vorlagen vier statt fünf Writer-Seiten. Die App-PDFs haben weiterhin drei Seiten. Bei Studio 3 stimmen die ersten vier Einträge auf Seite 1, bei Kolumne fehlen dort noch zwei der sechs App-Einträge. In beiden Word-Dateien steht die Referenz auf Seite 4.

Die vorhandene gemessene Sidebar-Typografie stoppt bei diesen Vorlagen an transparenten Farbflächen. Bei Kolumne sind der kompakte Kopf und Fuss transparent. Studio 3 hat zusätzlich eine transparente Lesefläche über der Vorlagengrafik. Die nächste Reproduktion kann die Textmessung unabhängig von der zuständigen Farbfläche ausführen und anschliessend den ersten Seitenumbruch und den Fotoanker einzeln prüfen.

### Lokaler Versuch mit Sans und korrigierten DOCX-Kopien

Bei einer Kopie pro Vorlage wurde Sans ausdrücklich in den synthetischen Eingaben gespeichert. Die Testmessung zeichnete transparente Flächen ohne Füllung auf. Die daraus erzeugten DOCX-Dateien hatten drei Seiten, doch Writer zeigte im PDF nur 14 der 18 Praxiseinträge und keine Endreferenz. Das DOCX enthielt weiterhin alle Texte.

| Prüfung nach der Korrektur                 | Kolumne · Sidebar rechts | Studio 3 · Sidebar rechts |
| ------------------------------------------ | ------------------------ | ------------------------- |
| Praxisstationen pro Seite                  | 6 / 9 / 3                | 4 / 8 / 6                 |
| Prüfmarken wie im App-PDF                  | 20/20                    | 20/20                     |
| Vollständige Beschreibungen am Titel       | 18/18                    | 18/18                     |
| Erhaltene Feldwerte nach zweimal Speichern | 111/111                  | 111/111                   |
| Grösste Abweichung am Fotorahmen           | 0,020 mm                 | 0,009 mm                  |

Für den Versuch erhielten die DOCX-Kopien eine weitere Zeile in der vorhandenen Tabelle. Die neue Zeile beginnt in der Mitte der zweiten App-Seite vor Praxisstation 11 bei Kolumne und vor Praxisstation 09 bei Studio 3. Der Abstand der leeren Fusszeile wurde auf 0 mm gesetzt. Bei Studio 3 kamen der gemessene Abstand zum Namen (10,3 mm), der weitere Abstand vor der Familie (26,9 mm) und der gemessene Kontaktabstand in der Sidebar (45,7 mm) hinzu. Das Foto erhielt die gemessenen Rahmenmasse und einen horizontalen Anker relativ zum Seitenrand. Vier Farbstichproben im Foto blieben bei beiden Wiederöffnungen innerhalb von zwei RGB-Stufen zur synthetischen Vorlage.

Der Versuch bearbeitete Kopien der DOCX-Dateien. In der Testsuite auf `dev` läuft der Standard-Vergleich automatisch. Für Sidebar rechts sind die Übernahme ins DOCX-Modell, der Test mit gemischten Textlängen und die Word-Desktop-Abnahme offen.

[#194](https://github.com/modebrecht/cv-cover-charm/issues/194) · [#195](https://github.com/modebrecht/cv-cover-charm/issues/195) · [#227](https://github.com/modebrecht/cv-cover-charm/issues/227)
