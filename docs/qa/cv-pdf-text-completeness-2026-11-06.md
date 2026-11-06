# CV-Quelltext im Gesamt-PDF prüfen – 6. November 2026

Arbeitsstand auf `dev`, Ausgangspunkt
`36f7d0680a16c8e65adee1a212e747438111b50b`. Ergänzt den Titelblatt-Textschutz
für #208; keine vollständige Freigabe des Gesamtdossier-Overrides.

## Reproduzierter Fehler

Der neue Browserfall entfernt den vollständigen ersten Berufseintrag aus den
physischen CV-Seiten. Gegen den unveränderten Ausgangscode bleibt die gemeinsame
PDF-Policy auf `pass`, obwohl der gespeicherte Eintrag fehlt. Die unsichtbare
Messansicht enthält weiterhin den ganzen Eintrag. Der Test erwartet `blocked`
und scheitert vor der Korrektur reproduzierbar an diesem Unterschied.

## Änderung

Der CV-Renderer legt aus seinen effektiven Eingabedaten einen Textvertrag an,
bevor Inhalte auf Seiten, Hauptspalte, Sidebar oder freie Rubriken verteilt
werden. Er umfasst persönliche Angaben, Dokumenttitel, gefüllte Rubriken und
Einträge, Sprachwerte, Stärken, Hobbys, Referenzen und eigene Rubriken.
Ausdrücklich ausgeblendete Rubriken und der bewusst ausgeschaltete Dokumenttitel
benötigen keine Druckkopie. Kontaktwerte, die der bestehende Renderer an den
Dossierkopf delegiert, werden nicht zusätzlich im CV-Textkörper verlangt.

Der Abgleich liest ausschliesslich sichtbaren semantischen Text der physischen
CV-Seiten. Die Messansicht kann fehlenden Drucktext nicht ersetzen. Beschreibungen
dürfen in der richtigen Reihenfolge über mehrere Seiten verteilt sein. Stabile
Zeilen- und Eintragskennungen bleiben erhalten. Bei Familienrubriken folgt der
Vertrag der vorhandenen Doppelpunkt-Einstellung; deren altes Datumsfeld wird
absichtlich nicht gedruckt. Die bestehenden Namensblöcke erhalten die gemeinsame
semantische Kennung `cv.person.name`; ihre vollständigen Textknoten bleiben erhalten.

Fehlender oder unsichtbarer Quelltext sowie fehlende/ungültige Prüfmetadaten
sperren den Dialog und die direkte Generator-API. Vor jeder CV-Rasteraufnahme
hält der Generator zudem die bereits validierten sichtbaren Seitenfragmente
fest. Der tatsächliche html2canvas-Klon muss diese vollständig behalten; seine
abweichende Medienbreite kann Inhalte nicht unbemerkt entfernen.

## Lokale Verifikation

- **22/22 Browserfälle**, keine Wiederholungen, Auslassungen oder Flaky-Erfolge:
  die bisherigen 15 Fälle und sieben neue CV-Fälle. Fünf prüfen entfernten Eintrag,
  transparente Schrift, fehlenden Textvertrag, fehlende CV-Wurzelkennung und
  vollständig entfernten Namen, jeweils mit Dialogsperre, direkter API, null Downloads, unverändertem Speicher
  und Wiederherstellung nach Neuladen. Ein weiterer Fall prüft eine lange,
  aufgeteilte Beschreibung, weiterhin vollständige Messkopie, Sidebar-Werte,
  Familienrubrik und Reparatur. Der letzte blendet Text ausschliesslich im echten
  794-Pixel-Rasterklon aus, während der 1800-Pixel-Livedrucksatz gültig bleibt.
- Vier neue Unit-Tests prüfen die Quellzuordnung, stabile Listenkennungen,
  aufgeteilten Text, beabsichtigte Ausblendungen, delegierten Kontakt,
  Familienfelder, Referenz-Suffixe sowie beschädigte/doppelte Vertragswerte.
- Gesamte Unit-Suite: **1’530 bestanden**, 289 Dateien, **27’949 Assertions**.
- App- und QA-Typprüfung, Lint und Formatierung der geänderten Dateien sowie
  Produktionsbuild bestanden.
- Echter UI-Download `joint-ledger-masonry-long-word-margins`: **zwölf PDF-Seiten**,
  null Findings im vorhandenen Web-/PDF-Inhalts- und Geometrievergleich.
  SHA-256: `02fa6401cd109c67e2842f5e5a9d8015f36583d2067c25e9fe5963a26639740b`.
  Dieser erneute Lauf nennt `sourceSha=7019fc5` und `sourceDirty=true`, da er vor
  dem Korrektur-Commit auf dem geänderten Code ausgeführt wurde.

Die sieben CV-Fälle erweitern die bestehende reguläre `pdf-consent`-Prüfgruppe.
Der direkte `dev`-Workflow archiviert ihre JSON-Protokolle und PDF-Evidenz mit
der jeweiligen Commit-SHA. Dies ist keine neue visuelle 39-Vorlagen-Abnahme.

## Ergänzung: Namensmarkierung und Browserdruck

Der erste CI-Lauf auf `7019fc5` bestand die 21 damaligen Textschutzfälle, scheiterte
aber an zwei vorhandenen Druck-Geometriefällen (`glow` und `violetPulse`). Der
zwischenzeitlich in Vor- und Nachnamen-Spans geteilte Name lieferte der Messprobe
nur den ersten Textknoten „Lea“, während Chromium im PDF den ganzen Namen in einem
Textlauf zusammenfasste. Die exakte Markerzuordnung der Geometrieprüfung schlug
fehl. Die übrigen 31 Fälle der CV-PDF-Kerngruppe bestanden.

Die Korrektur markiert den vorhandenen vollständigen Namensblock und vergleicht
Vor- und Nachnamen gemeinsam mit der Quelle. Sie erhält dessen ursprünglichen
Textknoten; die bestehenden Geometrieprüfungen und Grenzwerte wurden nicht
verändert. Beide betroffenen Fälle bestehen danach lokal, einschliesslich ihrer
Gegenproben für Glyphengrösse, Position und A4-Einpassung. Zusätzlich sperrt ein
neuer Browserfall den Export bei vollständig entferntem CV-Namen. Die gesamten
22 Textschutzfälle und der zwölfseitige Kontrollexport wurden auf der korrigierten
Fassung erneut erfolgreich ausgeführt.

## Verbleibende Grenze und nächster Schritt

Noch offen sind unabhängige Quellinventare für Bilder, freie Elemente sowie
Kopf- und Fusszeilen im Gesamtdossier. Der Klon-Abgleich schützt vorhandene
semantische Seitenfragmente zusätzlich, ersetzt diese fehlenden unabhängigen
Inventare aber nicht. Die bestehenden Geometrie-, Bildlade- und Sichtbarkeits-
prüfungen bleiben aktiv. Der Gesamtdossier-Override bleibt gesperrt.

Als Nächstes die erwarteten Bild- und freien Elementinstanzen aus den
normalisierten Eingabeblöcken ableiten und Entfernung eines ganzen Elements
vor sowie während der Rasteraufnahme als Browserfehler absichern.
