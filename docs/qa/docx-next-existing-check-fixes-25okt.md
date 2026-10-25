# Vier bestehende Prüffehler behoben

25. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`.
Ausgangspunkt: `4e87dd8b88f2d1d3d4205d36f1efa956b5d61665`.

## Ergebnis

**Die vollständige Unit-Suite besteht jetzt: 1412 Tests, keine Fehler.** Vollständiges TypeScript sowie Prettier und ESLint der fünf geänderten Code-/Prüfdateien bestehen ebenfalls. Die vier zuvor separat reproduzierten Altfehler sind geschlossen: ein veralteter Foto-Quelltexttest und drei Folgen derselben uneinheitlichen Hintergrundebenen-Prüfung.

Die einzige Verhaltensänderung im Produktcode ist die untere Grenze einer Ebenen-Validierung: `0` wird wie im bestehenden Renderer akzeptiert. Weder Seitengeometrie noch Bilder, Textfluss, Ausgabe-Reihenfolge oder Word-Controls werden neu zusammengesetzt.

## Hintergrundebene null ist bereits der bestehende Vertrag

`compositePagePaint` gibt ausdrücklich `paintLayer: 0` für die unterste Seitenfläche zurück. Der native `pictureRun` akzeptiert bereits ganze Ebenen von 0 bis 2147483647. Bestehende native Ausgabetests verlangen `relativeHeight="0"`. Nur `validateDecoration` wies denselben Wert ab, weil seine Untergrenze versehentlich 1 war.

Die [Microsoft-SDK-Definition von Anchor.RelativeHeight](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.anchor.relativeheight?view=openxml-3.0.1) beschreibt das native Attribut als `UInt32Value`: Null ist kein ungültiger negativer Wert. Die engere bestehende Projekt-Obergrenze 2147483647 wird unverändert beibehalten; es wird nicht der ganze UInt32-Bereich freigegeben.

Die Korrektur gleicht den Prüfer an den bereits genutzten Composer-/Renderer-Vertrag an. Es ist keine Geometrietoleranz, kein Office-Rundungsausgleich und keine Lockerung der Bild-/Crop-/Control-/Word-Abnahme.

Die neue Grenzprüfung scheitert vor der Produktkorrektur und besteht danach. Sie akzeptiert 0, 1 und die unveränderte Obergrenze. Negative, gebrochene, nicht endliche und zu grosse Werte sowie eine ungültige verschachtelte Ebene werden weiterhin abgewiesen. Der Vergleich des kompilierten Produkt-JavaScripts bestätigt, dass ausser dieser Untergrenze keine weitere Produktlogik geändert wurde.

## Foto-Test auf das gewünschte Verhalten ausgerichtet

Der alte Test verlangte genau den Quelltext des früheren automatischen Wechsels auf freie Platzierung. Das widersprach der bereits am 23. Oktober beauftragten Korrektur: gespeicherte automatische oder feste Modi dürfen beim Öffnen des Formulars nicht ungefragt verschwinden.

Die einzelne falsche Implementierungs-Erwartung wurde durch vier gespeicherte Restore-Verträge für `auto`, `left`, `right` und `frei` ersetzt. Vorgaben für neue freie Fotos und die vorhandenen Rahmen-/UI-Prüfungen bleiben erhalten. **CvForm und die Foto-Produktlogik werden in dieser Runde nicht geändert.**

Zusätzlich führt ein neuer, separater DOM-Prüfer die tatsächliche `FormCvPerson` mit React 19.2.5 und `createRoot` im StrictMode aus. React wird nicht gemockt. jsdom 26.1.0 stellt ausschliesslich das DOM; es wird ausserhalb des Repository-Projekts installiert, ohne Paket-/Lockdateiänderung.

| Fall | Tatsächlich beobachtet |
| --- | --- |
| Vier gespeicherte Modi × Standard/gespiegelt, acht Fälle | Öffnen und erneutes Rendern erhalten den gesamten gespeicherten Zustand, Persondaten und Crop-Werte. |
| Sechs nichtfreie Fälle | Erst der reale Klick auf «Frei positionieren» wechselt bewusst zu den vorhandenen freien Standardwerten; Crop und Persondaten bleiben erhalten. |
| Zwei bereits freie Fälle | Kein zusätzlicher Aktivierungsbutton, gespeicherte Koordinaten bleiben erhalten. |
| Historische Form aus `fc0cafa8`, automatisch | Dieselbe Prüfung scheitert wie erwartet: beim Öffnen `auto -> frei`, X von 39 auf 20 mm. |
| Dieselbe historische Form, bereits frei | Besteht als positive Gegenkontrolle. |

Der historische Formular-Blob `6033a46bd6a2180e0b4c668dec2177b54d6cbf9b` wird unverändert in einem eigenen Testprozess geladen. Es gibt keine Änderung am historischen Branch oder an einer Office-Laufzeit.

Diese Prüfung belegt React-Mount-/Speicherverhalten mit leeren Persondaten und gespeicherten Einstellwerten. Sie ist keine Chromium-Pixelprüfung, kein Foto-Pixelvergleich und kein Word-Bedienungstest. Dass Word-Bildumfluss im bestehenden Prüfkandidaten funktioniert, wird weiterhin nicht behauptet.

## Ausgabe bleibt in drei synthetischen Kontrollen bytegleich

Vor und nach der Produktkorrektur wurden Brief, Neon und Verlauf aus ihren vorhandenen normalen synthetischen Fixtures durch denselben Modell-/DOCX-Pfad ausgegeben.

| Kontrolle | DOCX-Bytes | Feldvorkommen | SHA-256 vor und nach der Korrektur |
| --- | ---: | ---: | --- |
| Brief | 68100 | 79 | `d942dc8d5532f867d3bb1ae636c1e8880921f9fcd91bdd7f05983125e6c277a4` |
| Neon | 92465 | 96 | `16fc991211d20311959773f1427613af9fcb5a1c45ae41307fb73f23256d4551` |
| Verlauf | 91348 | 95 | `7d88c2f2ab2ed2318f241d2f5bb6bcf0946b76d941ba569b9e90e2ffe7515f55` |

Verwendet wird ein ausdrücklich synthetischer, deterministischer Ein-Pixel-Dekorationsadapter. Die Modelle bleiben unverändert. Die vollständigen DOCX-Bytes stimmen überein, nicht nur die Anzahl der Tags. Die normalisierten Asset-Schlüssel entfernen Identität und Ebene bereits vor dem Adapter; diese Gegenprobe behauptet daher nicht, vorher sei jeder normale Export an Ebene 0 gescheitert. Sie belegt unveränderte Paketserialisierung in den drei Kontrollen.

Es wurde kein neues Office-Rendering ausgeführt; ein solcher Wiederholungslauf liefert für bytegleiche Dateien keine neue Produktinformation. Die vorhandenen Word-/Foto-Prüfpakete wurden nicht angefasst.

## Prüfstand

| Prüfung | Ergebnis |
| --- | --- |
| Vier direkt betroffene Unit-Dateien | 33 PASS / 0 FAIL, 359 Erwartungen |
| Vollständiger `test:unit`-Befehl | **1412 PASS / 0 FAIL**, 275 Dateien, 26947 Bun-Erwartungen |
| Vollständiger `typecheck`-Befehl | PASS |
| Prettier / ESLint aller fünf geänderten Code-/Prüfdateien | PASS / PASS |
| Tatsächlicher React-Client-Mount | Acht aktuelle Fälle PASS; historische negative/positive Gegenkontrolle unterscheidet den Fehler |
| Drei vollständige synthetische DOCX-Pakete | Vor/nachher bytegleich |
| Projektweites `format:check` | Noch FAIL in 170 anderen Dateien |

Die fokussierten Tests und DOM-Fälle werden nicht zur Zahl der vollständigen Unit-Suite addiert. Die verbleibenden Formataltlasten wurden nicht pauschal umgeschrieben.

## Reproduktion

```sh
bun run test:unit
bun run typecheck
bunx --no-install prettier --check src/lib/docx-next/decoration.ts tests/unit/cv-photo-frame.test.ts tests/unit/docx-next-composite-paint.test.ts scripts/qa-cv-photo-preservation-25okt.mjs scripts/qa-docx-paint-layer-25okt.ts
bunx --no-install eslint src/lib/docx-next/decoration.ts tests/unit/cv-photo-frame.test.ts tests/unit/docx-next-composite-paint.test.ts scripts/qa-cv-photo-preservation-25okt.mjs scripts/qa-docx-paint-layer-25okt.ts
bun scripts/qa-docx-paint-layer-25okt.ts --validate-paint
DOCX_NEXT_DOM_MODULE=/absolute/external-tools/node_modules/jsdom bun scripts/qa-cv-photo-preservation-25okt.mjs auto standard
```

Den letzten Befehl je gespeicherten Modus `auto|left|right|frei` und Orientierung `standard|mirrored` ausführen. Der Helfer verlangt exakt jsdom 26.1.0. Für die historische Gegenprobe zusätzlich `DOCX_NEXT_CV_FORM_SOURCE` auf die vollständig verifizierte alte CvForm-Datei setzen; nur der oben gepinnte Blob wird akzeptiert. Die automatische Gegenprobe muss mit Exit 1 scheitern; dies ist ein beabsichtigter Testbefund, kein aktueller Produktfehler.

[Maschineller Nachweis mit Einzelwerten](docx-next-existing-check-fixes-25okt-evidence.json).

## Weiterhin offen

Die neue Empfänger-Komposition braucht ihre tatsächliche Word-Abnahme. Word-Fotobedienung/Speichern und der Referenzumbruch bleiben ebenfalls offen. Die grüne Unit-Suite ersetzt diese Nachweise nicht. Der normale Sidebar-Export bleibt gesperrt, allgemeine Sidebar-Freigabe bleibt NO-GO.

Kein Merge, Deployment, CI-Dispatch, weiterer Engine-Versuch, neuer Benutzer-Testauftrag oder Paketwechsel. Dev/main/render und die getrennten Datenschutz-Audits/Automationen bleiben unverändert. Rohlogs, DOM-Werkzeuge, generierte Pakete und Eingabedateien bleiben ausserhalb von Git.
