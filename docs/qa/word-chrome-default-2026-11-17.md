# Word-Farbbänder: Standard und Dev-Rückfall – 17.11.2026

Der Benutzer bestätigt die korrigierte Word-Variante mit «ohja viel besser»
und verlangt ausdrücklich: Die alte Option nur als Dev-Variante behalten,
keine Verdrahtung im UI.

## Verhalten

Die normalen Dossier-, Brief- und CV-Word-Downloads verwenden jetzt bei
kompakten Farbbändern die zwei schmalen Body-Grafiken. Der Textbereich bleibt
ausserhalb ihrer Auswahlrahmen. Kontakt-Header behalten ihre bestehende
native Header-Komposition. Der separate zweiseitige CV-Versuch bleibt ebenfalls
bei seiner bisherigen geprüften Komposition.

Die alte stabile Kompaktband-Variante ist über den internen Aufrufparameter
`devCompactChromeInHeader: true` weiterhin reproduzierbar. Der Parameter ist
ausschliesslich für Entwicklung/QA bestimmt: kein UI-Schalter, kein Menüpunkt,
kein URL-Parameter und kein gespeichertes Projektfeld. Alle UI-Aufrufer bleiben
unverändert und wählen durch den normalen parameterlosen Export die neue Lösung.

Entwicklervergleich im vorhandenen App-Exporter:

```ts
// Normaler Standard:
downloadSavedDossierDocxNext();

// Ausschliesslich interner Dev-Vergleich mit der alten Header-Variante:
downloadSavedDossierDocxNext(undefined, { devCompactChromeInHeader: true });
```

Der ehemalige Parameter `compactChromeBodyPaintPreview` entfällt. Die
Vergleichsprüfung erzeugt stattdessen explizit die alte Dev-Variante und
vergleicht sie mit dem neuen normalen Standard. Der zusätzliche verworfene
Versuch mit einer seitenhohen transparenten Body-Grafik wird nicht als
Rückfall aktiviert.

## Verifikation

- **1’549 Unit-Tests**, keine Fehler. Der Modellvergleich belegt, dass der
  explizite Dev-Rückfall die alte Komposition erhält und nur die Body-Zuordnung
  der Farbbänder vom Standard abweicht. Die Daten bleiben unverändert.
- **4/4 Browserfälle**, ohne Retry: Standard gegen Dev-Rückfall, CV ohne Foto,
  langer Brief und die tatsächlichen normalen Dossier-/Einzeldownload-Menüs.
  Der normale UI-Download wird auf vier kleine Body-Bandrahmen geprüft; die
  Einzeldownloads auf ihre eigenen beiden Rahmen.
- Der normale Dossier-DOCX ist **bytegenau identisch mit der vom Benutzer
  akzeptierten Datei** `02_Word_Farben_Klicken_FIX.docx`:
  SHA-256 `65f2f1168b3f7660bd977806859053222adb5983feb9832489b6b8d7acb6128c`.
  Es wird kein neu erzeugtes, abweichendes Design als abgenommen ausgegeben.
- App-/QA-TypeScript, ESLint, Formatierung und Produktionsbuild bestanden.
- Statische Prüfung: keinerlei Verweise auf den Dev-Parameter in
  `src/routes` oder `src/components`. Keine UI-Datei wurde verändert.

Die erste lokale normale Downloadprüfung erfasste den CV-Zustand vor dem
Abschluss der beim Editor-Laden anstehenden Speicherung. Während des Exports
wurde noch das abgeleitete `coverFingerprint` gespeichert. Die Prüfung wartet
jetzt vor der Momentaufnahme auf den bestehenden Status «Automatisch
gespeichert», wie die bisherigen unabhängigen Word-Tests. Der vollständige
Zustandsvergleich vor/nach dem Download bleibt erhalten; keine Datenabweichung
wird aus der Erwartung entfernt.

Beim Basiscommit `f2b325c` waren fünf Workflows erfolgreich. Die Dossier-
Regression scheiterte in `templates-layout` bei der Installation der Browser-
Systempakete (APT, Exit 100), vor den Tests dieser Gruppe. Die anderen Gruppen
einschliesslich der Word-Downloads bestanden. Neue automatische Läufe prüfen
den jetzigen Standard; ein noch ausstehender CI-Status wird nicht als grün
behauptet.

## Verbleibende Grenze

Die Bestätigung betrifft die Farben und die nun brauchbare Word-Klickansicht.
Ein neuer, ausdrücklich beobachteter Speichern-/Wiederöffnen-Ablauf wurde nicht
geliefert. Die Body-Farbbänder gelten weiterhin für die erste Brief-/CV-Seite;
automatische Brief-Folgeseiten behalten ihren wiederholten Header. Der Benutzer
hat keinen zusätzlichen sichtbaren Umschalter gewünscht.

[Identität mit den akzeptierten Bytes](word-chrome-default-2026-11-17/accepted-bytes.json)
· [Vier Browserfälle](word-chrome-default-2026-11-17/browser-results.json)
· [Bandrahmen](word-chrome-default-2026-11-17/drawing-bounds.json)
· [Unit-Ergebnis](word-chrome-default-2026-11-17/unit-summary.txt).
