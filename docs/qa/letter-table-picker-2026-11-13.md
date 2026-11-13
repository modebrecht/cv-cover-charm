# Brief: stabile Tabellengrössenauswahl

Stand 13.11.2026

Der historische Restore-Prüfblock ist auf `14f59fa` mit 50 Browserfällen und
62 pixelgleichen PDF-Seitenpaaren gesichert. Im anschliessenden allgemeinen
Regressionslauf schlug ein bestehender Brief-Formatierungstest fehl:
`letter layout controls and Word-like formatting persist` erhielt zwei statt
drei Vorschau-Absatzblöcken. Die neue Importprüfung blieb erfolgreich.

Bei der lokalen Nachstellung mit dem CI-Standardviewport 1280 × 720 wurde
ein konkreter Bedienfehler sichtbar: Das Auswahlraster für Tabellen war
schmaler als seine Zellen. Beim Wechsel der Titelzeile konnten benachbarte
Zellen den Klick auf «2 × 3» abfangen. Playwright meldete dabei ausdrücklich
«Tabelle 2 × 4 einfügen intercepts pointer events».

Das Popup erhält jetzt seine Max-Content-Breite (`w-max`). Seine Grösse richtet
sich damit nach dem achtspaltigen Raster und bleibt beim Wechsel der
Grössenanzeige stabil. Die Korrektur betrifft die Auswahloberfläche;
Import-, PDF- und DOCX-Exportlogik wurden dafür nicht geändert.

Der bestehende Browserfall prüft zusätzlich:

- gleiche Rasterbreite vor und nach dem Fokussieren von «2 × 3»;
- nicht überlappende Zellflächen in der ersten Rasterzeile;
- weiterhin den echten Mausklick, die 2-×-3-Tabelle, den leeren Folgeabsatz,
  Listen, Spalten, Fett/Kursiv/Unterstrichen, Schriftfarbe und gespeichertes HTML.

Lokal bestand dieser vollständige Fall **3/3-mal** bei 1280 × 720 in
52,6 Sekunden, ohne Retries. Anwendungs-TypeScript, ESLint der beiden
geänderten Dateien, Prettier und `git diff --check` bestanden.
Der neue Commit durchläuft erneut die regulären CI-Jobs.

Das separate Word-Prüfpaket verwendet die tatsächlichen UI-Downloads aus
dem historischen Sidebar-Kontrollfall auf dem Exportstand `14f59fa`.
Die hier geänderte Popup-Breite ist kein Bestandteil dieser Exportdokumente.
