# Word: Klickbereich der Farbbänder korrigiert – 17.11.2026

**Abnahme:** Der Benutzer bestätigt «ohja viel besser». Die akzeptierte
Variante wird [Standard, die alte bleibt nur als interner Dev-Rückfall](word-chrome-default-2026-11-17.md).
Der folgende Prüfbericht beschreibt die Vorbereitung vor dieser Rückmeldung;
ein gesonderter Speichern-/Wiederöffnen-Ablauf wird dadurch nicht behauptet.

**Aktueller Stand, 18.11.2026:** Farb- und Klickverhalten sind vom Benutzer
bestätigt; der normale Download verwendet seit `723d6cb` diese Variante.
Alle sechs Workflows dieses Produktstands sind erfolgreich. Der frühere
Versuchsparameter ist entfernt; die alte stabile Header-Variante bleibt nur
über `devCompactChromeInHeader: true` intern verfügbar. Keine neue Prüfung
der bereits bestätigten Datei anfordern.
Die technische Vorbereitung dieses Fixes erfolgte auf Basis `28b72ac`.

## Neue Nebenwirkung und Ursache

Der Benutzer zeigte einen Word-Screenshot der neuen Farbvariante: kräftige
Ränder, aber eine graue/blassbeige Briefseite und erschwertes Klicken in den
Text. Der bisherige Body-Drawing-Rahmen war weiterhin etwa 210 × 297 mm gross.
Die transparente Mitte verhinderte das Übermalen nativer Inhalte, entfernte
jedoch die auswählbare rechteckige Bildfläche nicht. Der Screenshot mit einem
Griff am oberen Seitenrand passt zu dieser seitenhohen Grafikmarkierung.

Das ist eine reale Nebenwirkung der vorgeschlagenen Variante und kein Anlass,
die Papierfarbe oder die Textfarben künstlich zu verändern.

## Korrektur

- Je ein eigener eng begrenzter Grafikrahmen für den oberen und unteren
  Farbstreifen: Brief jeweils 4,0003 mm hoch, CV jeweils 3,9980 mm hoch.
- Jeder Rahmen enthält die bisherige Fläche und ihre Trennkante zusammen.
  Zwischen beiden Rahmen existiert kein transparentes Body-Bild mehr.
- Die Geometrie wird proportional auf dasselbe native Seitengitter abgebildet.
  Im CV bleibt die bekannte Absatzkoordinate des vorhandenen Ankers erhalten.
- Die Bilder liegen hinter dem Text, ohne Textumbruch und ausserhalb des
  Textbereichs. Alle semantischen Absätze, Controls und das gewöhnliche Foto
  bleiben unverändert. Es wird kein Absatz eingefügt.

Die serialisierten vier Grafikrahmen des Dossiers werden zusätzlich geprüft:
alle Höhen kleiner als 4,1 mm; alle liegen ausschliesslich am oberen bzw.
unteren Rand. Die frühere seitenhohe Auswahlfläche ist damit aus der Datei
entfernt. Das ist ein Dateistrukturnachweis, keine simulierte Word-Mausabnahme.

## Tatsächliche Prüfung

- **1’549 Unit-Tests**, 0 Fehler; der Regressionstest prüft jetzt kleine
  Auswahlrechtecke statt eines seitenhohen Body-Drawing.
- App-/QA-TypeScript, ESLint, Formatierung und Produktionsbuild bestanden.
- **3/3 Browserfälle** ohne Retry: Standarddossier, CV ohne Foto, langer Brief.
  Nach der zusätzlichen Positionsprüfung wurde der Standardfall gezielt
  nochmals geprüft: **1/1 PASS**. Beide Protokolle bleiben getrennt erhalten.
- Native Textstruktur des exportierten DOCX nach Entfernen dekorativer
  Drawing-Runs weiterhin exakt gleich; semantische Bilder bytegleich.
- Ergänzende native Darstellung: **sieben Seitenpaare**, unverändert 3 / 1 / 3
  Seiten. Alle Texte und Wortpositionen identisch, maximale Abweichung 0 pt.
  Ausserhalb der oberen/unteren 6-mm-Randzonen sind alle Seiten pixelgleich.
  Die vollständigen Randdifferenzen bleiben im Bericht; ganze Seiten werden
  nicht als pixelgleich ausgegeben.
- Beide Farbbänder auf Brief und CV: RGB **17/24/39**, gleich und vollfarbig.
  Fotos, Rubriklinien, Seitenränder und Textenden visuell geprüft.

Der Renderer verwendet LibreOffice über den kanonischen `render_docx.py`.
Die anschliessende Benutzerrückmeldung bestätigt die Word-Farb-/Klickansicht.
Ein ausdrücklich protokollierter Save/Reopen-Lauf dieser Bytes liegt nicht
vor; die automatische Darstellung ersetzt keinen solchen Nachweis.

## Bestätigte Datei

[02_Word_Farben_Klicken_FIX.docx](https://chatgpt.com/library?file_id=libfile_7d23b55582f081918f191ed4e67e84e9&account_id=personal)

SHA-256: `65f2f1168b3f7660bd977806859053222adb5983feb9832489b6b8d7acb6128c`.
Die Datei ersetzt die bisherige Farbansicht-Prüfdatei, Version 1.

Der Benutzer hat die korrigierte Ansicht mit «ohja viel besser» bestätigt.
Der normale Dossier-Download entspricht dieser Datei bytegenau; der Fix ist
aktiviert. Es gibt hierfür keinen offenen Wiederholungsauftrag an den Benutzer.

Die bekannte Grenze des Vorgängers bleibt: Die Farbansicht-Korrektur betrifft
die erste Brief-/CV-Seite; automatische Brief-Folgeseiten behalten ihren
bisherigen wiederholten Header. Die verworfene Vorgängerdatei und das ältere
Header-Prüfpaket werden nicht erneut zur Abnahme angeboten.

[Grafikrahmen und native Positionen](word-body-click-fix-2026-11-17/drawing-bounds.json)
· [Sieben native Vergleiche und Datei-Hash](word-body-click-fix-2026-11-17/native-comparison.json)
· [Drei Browserfälle](word-body-click-fix-2026-11-17/three-browser-cases.txt)
· [Gezielter Positionsfall](word-body-click-fix-2026-11-17/focused-bounds-results.json)
· [Unit-Ergebnis](word-body-click-fix-2026-11-17/unit-summary.txt).

Reproduktion:

```sh
bun test tests/unit
playwright test --config tests/qa/playwright.word-body-paint.config.ts
```
