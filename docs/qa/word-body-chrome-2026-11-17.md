# Word: volle Farbbänder beim Schreiben – 17.11.2026

**Word-Rückmeldung:** Diese erste Variante wurde wegen der seitenhohen
Auswahlfläche zurückgewiesen. Die Farben sind kräftig, aber ein transparentes
Bild über die ganze Seite erschwert das Klicken und kann die Seite grau
hervorheben. Der [Klick-Fix mit zwei schmalen Grafikrahmen](word-body-click-fix-2026-11-17.md)
ersetzt diese Prüfdatei unter derselben Identität, Version 1. Der folgende
Bericht und sein Hash beschreiben die historische Version 0.

**Konkrete Prüfdatei fertig; Word-Bearbeitungsansicht noch nicht abgenommen.**
Die neue Variante ist ausdrücklich über `compactChromeBodyPaintPreview: true`
im vorhandenen App-Export aufrufbar. Der normale Download wird erst nach einer
Prüfung der Word-Ansicht umgestellt. Basis: `0e65c9f` auf `dev`.

## Benutzerbefund und Ziel

Der Benutzer meldet das neue dreiseitige Standard-Paket als optisch passend,
ausser den beim Schreiben blassen Kopf-/Fusszeilen. Seine neue PDF stammt aus
Microsoft Word für Microsoft 365: drei Seiten, Brief und CV haben oben und
unten jeweils exakt RGB 17/24/39. Alle 14 ursprünglichen Mediendateien bleiben
im gespeicherten DOCX bytegleich erhalten. Das belegt die Druckfarben und die
Medienerhaltung, keinen ausdrücklich beobachteten Schliessen-/Wiederöffnen-Ablauf.

Der 16.-Oktober-Fix verschob das Deckblatt-Badge in den Dokumentkörper. Die
Farb-/Deckkraftkorrektur vereinheitlichte später die tatsächlichen Farben.
Die übrigen Kopf-/Fussbänder wurden weiterhin über die Kopfzeile gezeichnet
und blieben beim Schreiben von Words Abblenden inaktiver Stories betroffen.

## Begrenzte Umsetzung

`firstPageChromePaintOwner: body` verschiebt **nur die kompakten Farbbänder
der ersten Brief-/CV-Seite** in den Dokumentkörper. Papier, seitliche Flächen,
Motive und die Hintergrundgrafiken der Folgeseiten behalten ihren bisherigen
Träger. Die Körpergrafik hat eine transparente Mitte, damit sie keine nativen
Rubriklinien oder anderen Zeichnungen verdeckt.

Der Renderer verwendet den vorhandenen ersten Absatz bzw. den vorhandenen
strukturellen Absatz der CV-Tabelle als Anker. Er fügt keinen Textkasten,
Absatz, manuellen Seitenumbruch oder festen Textinhalt hinzu. Die CV-Bänder
verwenden dieselbe bekannte Absatzkoordinate wie das gewöhnliche CV-Foto;
ihre Position wird aus dem Seitenrand abgeleitet. Text und Foto bleiben nativ.

Die Prüfung ist auf kompakte, leere Kopf-/Fusszeilen begrenzt. Kontaktheader,
semantische Header-/Footer-Inhalte, fehlende native Seitenabdeckung und
explizite zweiseitige CV-Varianten werden für diesen Versuch abgewiesen.
Die Hintergrundfarben werden nicht künstlich verdunkelt.

**Bekannte Grenze:** Auf automatisch entstehenden Folgeseiten eines langen
Briefs bleiben die Bänder im wiederholten Header. Dort wird die blasse
Bearbeitungsansicht durch diesen begrenzten Versuch noch nicht geändert.
Der konkrete Benutzer-Prüffall hat ein Deckblatt, einen einseitigen Brief
und einen einseitigen CV. Eine allgemeine Lösung für alle Folgeseiten und
Vorlagen ist nicht behauptet.

## Tatsächliche Prüfung

- **1’549 Unit-Tests**, 0 Fehler; darunter vier neue Prüfungen für den
  unveränderten semantischen Modellinhalt, den transparenten Mittelbereich,
  Story-Zuordnung/Seitenabdeckung und gesperrte semantische Kopfzeilen.
- App-/QA-TypeScript, ESLint, Formatierung und Produktionsbuild bestanden.
- **3/3 Browserfälle**, ohne Retry: normales Dossier, unabhängiger CV ohne
  Foto und langer unabhängiger Brief. Echte frische Browser-Schriftmesswerte
  und derselbe App-Export wie beim Download, mit der ausdrücklichen Prüfoption.
- Nach Entfernen rein dekorativer Drawing-Runs ist `document.xml` in jedem
  Paar exakt gleich. Semantische Bilddateien bleiben bytegleich. Der Browser-
  Zustand wird durch keinen Export verändert.
- Ergänzende native Darstellung von sieben Seitenpaaren: **3 / 1 / 3 Seiten**
  in beiden Fassungen; Text und sämtliche Wortpositionen identisch, maximale
  Abweichung 0 pt. Ausserhalb der jeweils 6 mm breiten oberen/unteren Randzonen
  sind alle Seiten pixelgleich. Die vollständigen Rohdifferenzen bleiben im
  Bericht erhalten; eine vollständige Pixelgleichheit wird nicht behauptet.
- Visuell geprüft: alle drei Seiten der Prüfdatei, einschliesslich CV-Rubrik-
  linien und Foto. Es gibt kleine Raster-/Transparenzunterschiede an den
  Farbkanten. Die zentrale Bandfarbe bleibt unverändert.

Die native Darstellung verwendet den kanonischen `render_docx.py` und
LibreOffice. Sie belegt das unveränderte Drucklayout, **nicht** die Word-
Bearbeitungsansicht. Die Farbansicht und das Speichern dieser neuen Bytes
müssen noch in Desktop Word geprüft werden.

## Konkrete Datei und nächster Schritt

[Prüfdatei-Identität, jetzt mit dem Klick-Fix](https://chatgpt.com/library?file_id=libfile_7d23b55582f081918f191ed4e67e84e9&account_id=personal)

SHA-256: `4a1da56edda8dc0bf601f526dac3dec853fc0cd5435f764bcf72316f2e09bb5e`.
Die bisherige Standard-Prüfdatei wird nicht überschrieben; die neue Variante
ist für den direkten Vergleich bestimmt.

Nächster kleiner Word-Schritt: Datei öffnen, in den Brieftext klicken und
prüfen, ob Kopf-/Fussbänder kräftig bleiben. Erst bei erfolgreicher Word-
Ansicht und unverändertem Word-PDF den geprüften Umfang normal aktivieren.
Das vorherige Paket nicht nochmals als Prüfung dieser neuen Bytes behandeln.

[Browserfälle](word-body-chrome-2026-11-17/results.json)
· [Exportnachweis](word-body-chrome-2026-11-17/evidence.json)
· [Ungefilterte native Unterschiede und Datei-Hash](word-body-chrome-2026-11-17/native-comparison.json)
· [Unit-Ergebnis](word-body-chrome-2026-11-17/unit-summary.txt).

Reproduktion:

```sh
bun test tests/unit
playwright test --config tests/qa/playwright.word-body-paint.config.ts
```

Die Browserprüfung startet Vite selbst auf Port 4173. Playwright 1.56.1,
Chromium 141.0.7390.37. Die automatischen GitHub-Läufe des veröffentlichten
Prüfpfads werden getrennt von der Word-Abnahme behandelt.
