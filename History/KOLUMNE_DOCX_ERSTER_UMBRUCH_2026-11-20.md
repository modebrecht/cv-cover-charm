# Kolumne Standard · erster DOCX-Seitenumbruch

Der interne DOCX-Prüfpfad verwendet den Satzspiegel, die Datumsspalte, den Fotorahmen und die Zeilenhöhen aus der Webvorschau. Für die Schrift verwendet der Writer-Test Liberation Sans. Die Referenz nutzt 18 gleich lange Praxisbeschreibungen. Beim zweiten Fall wechseln kurze, mittlere und lange Beschreibungen.

| Fall | App-PDF | Bisheriges DOCX in Writer | DOCX-Prüfpfad in Writer |
| --- | --- | --- | --- |
| Referenz | 3 Seiten, Seite 1 bis Praxisstation 05 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 05 |
| Gemischte Längen | 3 Seiten, Seite 1 bis Praxisstation 06 | 5 Seiten, Seite 1 bis Praxisstation 02 | 3 Seiten, Seite 1 bis Praxisstation 06 |

In beiden Fällen stehen alle 20 Textmarkierungen auf denselben Seiten wie im App-PDF. Alle 18 Praxisbeschreibungen stehen vollständig bei ihrem Titel. Nach zwei Speicher- und Wiederöffnungszyklen mit LibreOffice Writer 25.8.7.3 stimmen diese Prüfungen und die vier Prüfpunkte des Fotoausschnitts weiterhin.

Die leere kompakte CV-Fusszeile erhält im internen Lesefluss mit `cvFooterComposition: "painted-compact"` die Reserve aus dem Web-Satzspiegel. Der native Abstand der leeren Fusszeile beträgt 0 mm. Eigener Fusszeilentext verwendet seine native Textreserve. Im Prüffall setzt der zusätzliche Abstand mit automatisch eingefügtem Namen die verfügbare Unterkante rund 12 mm nach oben. Die weiteren Anpassungen berücksichtigen die nativen Absatzgrenzen nach einer Datumstabelle und halten einen Eintrag zusammen, wenn die Webvorschau ihn vollständig auf einer Seite zeigt.

## Reproduktion

Die QA nutzt die synthetischen Projektdaten der bisherigen Layoutmatrix, Chromium und einen LibreOfficeKit-Adapter. Sie legt das App-PDF, die internen DOCX-Ausgaben, die gerenderten PDFs und die Prüfdaten unter `artifacts/kolumne-docx-pagination` ab.

```bash
KOLUMNE_QA_LO_KIT=/absoluter/pfad/zu/lo-kit \
  npx playwright test --config tests/qa/playwright.kolumne-docx.config.ts
```

Der Nachweis gilt für Kolumne Standard in den beiden Prüffällen. Abweichungen in Typografie und Farbflächen sowie die Abnahme in Microsoft Word Desktop stehen weiterhin aus. Die nächste Reproduktion kann denselben Vergleich für Studio 3 Standard ausführen.

[#194](https://github.com/modebrecht/cv-cover-charm/issues/194) · [#195](https://github.com/modebrecht/cv-cover-charm/issues/195)
