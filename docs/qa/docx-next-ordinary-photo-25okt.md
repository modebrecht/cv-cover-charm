# Gewöhnliches Word Foto und Korrektur der zusätzlichen Fotoseite

**Abnahme am 25. Oktober:** Der Benutzer bestätigt zur zuletzt aktualisierten `CV-Foto.docx` (Version 2; Quellstand `36854783d755a28610770a5a5d6d40b05acea5ef`): «sieht super aus, lässt sich wie ein normales bild verschieben done». Darstellung und normale Bildbewegung in Word sind damit abgenommen; der Foto-Fix ist erledigt. Die untenstehenden Hinweise zur fehlenden Fotobedienungsabnahme beschreiben frühere Zwischenstände. Keine weitere Fotodiagnose oder Speichermatrix. Kein neuer gespeicherter DOCX-Rücklauf wurde ausgewertet; eine exakte Seitenzahl wird aus dieser Meldung nicht abgeleitet.

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangskopf dieser Korrektur: `7b424023d286b4fc47ccebdbc8f86ab923156f3b`.

## Aktueller Befund und Korrektur

Der Benutzer meldet nach dem gewöhnlichen Foto-Kandidaten eine eigene Fotoseite.
Sein Screenshot zeigt fünf Dossierseiten, mit dem Foto auf Seite 3 und dem
CV-Tabellenbeginn erst auf Seite 4. Der frühere interne Vierseiten-Render war
kein ausreichender Nachweis für die tatsächliche Word-Pagination.

Der zusätzliche Body-Ankerabsatz vor der kontinuierlichen CV-Tabelle wird jetzt
vollständig entfernt. Das gewöhnliche Bild nutzt den bereits vorhandenen
strukturellen Absatz am Anfang der ersten Tabellenzeile. Es bleibt ein einzelnes
DrawingML-Bild ohne Foto-SDT und ohne Textrahmen. Der Anker ist somit zwar in
einem Tabellenabsatz, die Bildbegrenzung auf die Zelle ist mit `layoutInCell=0`
ausgeschaltet und `locked=0` bleibt erhalten. Die frühere Behauptung, die native
Bildverankerung müsse vollständig ausserhalb der Tabelle liegen, ist für diese
Korrektur ausdrücklich überholt.

Das automatische Foto verwendet vertikal den natürlichen Absatzursprung mit
Offset 0; gespeicherte freie Positionen behalten ihre Seitenkoordinaten.
Die normale Bildumbruchart ist Quadrat. Eine intern verworfene Zwischenfassung
mit weiterhin absoluten Y-Koordinaten in der Zelle überlagerte Sidebar-Text;
sie wurde nicht ausgeliefert. Die finale Fassung ist überlappungsfrei geprüft.
Die anfängliche Flächenreserve folgt weiterhin Bildhöhe, Rahmen und Abstand.
Keine Dummy-Grafik und kein leerer Foto-Besitzer bleiben zurück.

## Verifikation und Auslieferung

- Datei bleibt **CV-Foto.docx**, bestehende Dateiidentität und Link aktualisiert;
  keine neue Benennungs-/Save1-/Save2-Aufgabe für den Benutzer.
- Neuer SHA-256:
  `03379503d8f09a8362b13f78f07c2eadedaf6c74d1c5aaa1a13a2254f957f018`.
- Genau ein natives Foto. Original-PNG, Crop, Rahmen, Bild-Unterbaum und
  28 × 35 mm Grösse sind zur vorherigen Fassung unverändert.
- Keine zusätzliche Body-Fotozeile vor der CV-Tabelle. Native Bild-Vorfahren
  enthalten genau die äussere Tabelle, keinen SDT und keinen Textrahmen.
- Vollständiger Body-Text und alle Textfeld-Tags bleiben gleich. Nur
  `word/document.xml` verändert sich im DOCX-Paket.
- Interner Render: vier Seiten, alle vier visuell geprüft; Foto und Text auf
  derselben ersten CV-Seite. Titelblatt, Brief und zweite CV-Seite sind
  pixelidentisch zur vorigen internen Fassung.
- Vollständige Bun-Suite **1418 PASS / 0 FAIL**, 276 Dateien,
  27038 Erwartungen. Die fünf serialisierten Fotofälle prüfen nun den tatsächlichen
  strukturellen Ankerpfad statt lediglich das Vorhandensein eines Bildnamens.
- Vollständiger Typecheck und geänderte ESLint-/Prettier-Dateien PASS.
  Produktionsbuild stammt vom vorigen Checkpoint und wurde nicht neu beansprucht.

Die Word-Pagination und tatsächliche Mausbedienung der korrigierten Fassung
wurden vom Agenten nicht ausgeführt. Die Korrektur entfernt die konkret neu
hinzugefügte Absatzstruktur; der interne Render wird nicht erneut mit einer
Word-Abnahme gleichgesetzt. Keine allgemeine Exportfreigabe und kein Merge.

## Verbindliche Prioritäten des Benutzers

1. Regression mit eigener Fotoseite beheben.
2. **Referenzumbruch bereinigen**, als nächster inhaltlicher Darstellungsfehler.
3. Ganze Rubriken komfortabler verschieben: **optional, kein Must-fix**.
   Der Benutzer akzeptiert vorerst die etwas kompliziertere Tabellenbedienung.

Keine weitere Speichermatrix anfordern. Bestehende Bild-/Feldleser und normale
Exportgates bleiben unverändert. Das frühere Foto-SDT wird in dieser expliziten
Komposition bewusst durch ein nativ benanntes Bild `cv.person.photo` ersetzt;
144 Textfelder plus ein Bild sind nicht als 145 erhaltene SDTs auszugeben.

Reproduktion:

```sh
bun scripts/docx-next-letter-source-flow-probe.ts ASSET_DIRECTORY NEW_OUTPUT --ordinary-photo
```

Uploads, Screenshots und Office-Ausgaben bleiben ausserhalb von Git.
