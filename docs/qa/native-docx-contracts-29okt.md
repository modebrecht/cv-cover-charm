# Native DOCX QA: 29. Oktober 2026

Die Wiederaufnahme auf `eb3eae5` behebt veraltete QA-Verträge. Der Produktcode
und die Word-Freigaben bleiben unverändert. Die vollständige Forschungs-QA
ist weiterhin nicht abgenommen. Maschinenlesbarer Nachweis:
`native-docx-contracts-29okt.json`.

## Behobene Prüfungen

- Die Bildnormalisierung prüft die ursprünglichen, EXIF-korrigierten Masse und
  jedes dekodierte RGBA-Byte gegen das Browseroriginal. Die alte Obergrenze
  von 1600 Pixeln widersprach dem bereits umgesetzten Pixelerhalt. Das grosse
  Kontrollfoto bleibt bei 2400 × 3600 Pixeln.
- Der Python-Renderprüfer kontrolliert die Masse gegen die tatsächlichen
  synthetischen Eingabebilder. Transparenz, Orientierung und Farbflächen
  bleiben zusätzlich geprüft.
- Seitliche Farbflächen werden innerhalb ihres eigenen Rechtecks gemessen.
  Die bisherige feste linke X-Position lag bei gespiegelten Sidebars neben der
  Fläche. Vierfache Rasterauflösung ermöglicht die Farbmessung schmaler Kanten.
- Bei Inline-Fotozonen erwartet die Messung die bereits implementierte volle
  Rahmenreserve. Die bisherige halbe Rahmenbreite erklärte die Abweichung von
  0,6 mm beim Hochformat. Keine Geometrietoleranz wurde erhöht.
- Das lange freie Fotobeispiel benötigt neun CV-Seiten. Die veraltete Erwartung
  von zehn wurde nach vollständiger Inhalts-, Reihenfolge-, Rand- und
  Save/Reopen-Prüfung korrigiert. Andere Seitenzahlen bleiben exakt geprüft.
- Absatzfluss-Fälle vergleichen jede Modell-Feldkennung, ihren Text und ihre
  Reihenfolge mit dem erzeugten Paket. Eine feste Gesamtzahl übersah den neuen
  Beilagentitel und konnte gleichzeitig fehlende Felder mit gleicher Zahl
  nicht unterscheiden. Sieben Gegenprüfungen sichern das neue Inventar.
- Der App-Kompositionsversuch berücksichtigt neu angelegte erste Kopfbereiche
  samt ihrer Bildbeziehungen. Bestehende Stories müssen weiterhin exakt gleich
  bleiben; nur eine gemeinsame Verschiebung der internen Zeichnungsnummern
  ist erlaubt. Neun Tests weisen Text-, Geometrie-, ID- und Beziehungsänderungen
  weiterhin zurück.
- Die PDF-Fotoprüfung unterscheidet bekannte deklarierte Seitenfarbe von Fotos
  anhand ihrer dekodierten Pixel. Jedes andere Bild unterliegt weiter den
  Fotoanzahl-, Sichtbarkeits- und Geometrieprüfungen. Doppelte oder fehlende
  Feldkennungen bleiben Fehler und erhalten jetzt einen konkreten Hinweis.

## Lokal bestätigt

| Prüfung                                                       | Ergebnis                            |
| ------------------------------------------------------------- | ----------------------------------- |
| Vollständige Unit-Suite                                       | 1454/1454; 280 Dateien              |
| Neue Story-Gegenprüfungen                                     | 9/9, in obiger Unit-Suite enthalten |
| Python: Entry-Inventar / Medien / bestehende Story-Prüfung    | 7/7 + 6/6 + 7/7                     |
| Python: Native Foto / Bildidentität / stabile Vergleichslogik | 5/5 + 21/21 + 7/7                   |
| Sidebar: Inhalt, Layout, Bilder, Rendern, Save/Reopen         | 31/31; 252 Quellseiten              |
| Citrus: dieselben nativen Prüfungen                           | 17/17; 114 Quellseiten              |
| Absatzfluss: sechs normale und sechs Randfälle                | 12/12, je zwei Save/Reopen-Zyklen   |
| App-Typprüfung, geänderte TS-Lint-/Formatprüfung              | bestanden                           |

Renderer: unverändertes, hash-geprüftes **LibreOffice 25.8.7.3 580(Build:3)**
mit 50 geprüften Paketen und den vorhandenen festgelegten Schriften. Die
Bildnormalisierung lief frisch in Chromium 141.0.7390.37 (Playwright 1.56.1).
Es wurde kein Word-Abnahmestatus daraus abgeleitet.

## Noch offene Befunde

1. **Historische Paket-Prüfsummen:** Alle alten Erwartungen bleiben bestehen.
   Die acht Container-Kontrollen wurden mit dem ursprünglichen Commit
   `70a121b` erneut erzeugt. Der aktuelle Stand unterscheidet sich ausschliesslich
   in `word/document.xml` durch den ergänzten Beilagentitel. Die frühere
   Foto-Kontrolle wurde mit `8dc8bab` reproduziert; ihre alte Prüfsumme
   `8dfabf25…` stimmt. Aktuell ändern sich Bild-Control, Rahmenreserve und
   `doNotAutoCompressPictures`. Diese echte strukturelle Änderung benötigt
   neue unabhängige Referenzen; alte Forschungsbefunde nicht überschreiben.
2. **Experimentelles `body-stories`, nicht die freigegebene Komposition:**
   `app-body-both-long-right` hängt lokal beim nativen DOCX-Speichern. Der
   60-Sekunden-Abbruch wurde durch einen separaten 70-Sekunden-Versuch bestätigt.
   Die normalen linken/rechten Fotofälle bestehen. Beim freien Hauptfoto
   `app-body-photo-free-main` entstehen nach Save/Reopen doppelte Feldkennungen.
   Die bestehende Export-Sperre für diese experimentelle Variante bleibt aktiv.
3. **Desktop-Word:** Gespiegelte Fotoposition, Referenzumbruch und allgemeine
   Darstellung weiterhin offen. Ebenso die geplante Word-Unterstützung für
   formatierten Brieftext und feste CV-Zuweisungen auf Seite 2.

## Reproduktion

```sh
bun test tests/unit
python scripts/docx-next-entry-flow-test.py
python scripts/docx-next-sidebar-body-media-test.py
python scripts/docx-next-sidebar-body-test.py

python scripts/docx-next-fixture-images.py "$QA_ROOT/fixtures/images.json"
bun scripts/docx-next-fixtures.ts "$QA_ROOT/fixtures" --sidebar --verify-json
python scripts/docx-next-render-qa.py "$QA_ROOT/fixtures" \
  --libreofficekit "$QA_ROOT/setup/runtime/lo-kit" --require-stable --roundtrip
```

Der bestehende Workflow `DOCX Next Stable Sidebar` führt die vollständigen
Matrizen und die Gegenprüfungen weiterhin aus. Kein Fall und kein roter
Forschungsjob wurde ausgeblendet. `main` und `render` werden nicht verändert.
