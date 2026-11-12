# Freie CV-Fotos an A4-Rändern – 12.11.2026

Fortsetzung von [#204](https://github.com/modebrecht/cv-cover-charm/issues/204)
und den [gespiegelten Langdossiers](photo-circles-long-dossiers-2026-11-12.md).
Anwendungsbasis: `d460755e23cd9273aef69a44714e68299f2dfce8`.
Dieses Paket erweitert Tests, Auswertung und CI.

## Ergebnis und Eingaben

**9/9 Browserfälle bestanden**, ohne Retry, Skip oder instabilen Fall.
Fünf gültige Randpositionen liefern je ein dreiseitiges Dossier: **15 echte
PDF-Seiten**, mit vollständiger Text-/Marker-Verteilung und erhaltenen Fotos.
Vier unsichere Positionen bleiben gesperrt.

Vorlage Brief, ein Schul- und ein Praxiseintrag, zwei Briefabsätze.
Kopf-/Fusszeilen sind in diesem abgegrenzten Randtest ausgeschaltet.
Classic und gespiegelte Sidebar verwenden ein asymmetrisches synthetisches
PNG, Zoom 1,65, Ausschnitt 85/20, Rahmen 1,2 mm und Rahmenfarbe `#0b7362`.

| Gültiger Fall | Gespeichertes x/y | Physisches x/y | Foto | Roh-SSIM | Geglättet |
| --- | --- | --- | --- | --- | --- |
| Links, Standard | 0/259 mm | 0/259 mm | Quadrat, 24×24 mm | 0,9516 | 0,9647 |
| Rechts, Standard | 186/230 mm | 186/230 mm | Hochportrait, 24×30 mm | 0,9573 | 0,9684 |
| Oben, Standard | 180/0 mm | 180/0 mm | Kreis, 24×24 mm | 0,9703 | 0,9799 |
| Unten, gespiegelt | 150/267 mm | 36/267 mm | Hochportrait, 24×30 mm | 0,9617 | 0,9722 |
| Links, gespiegelt | 186/230 mm | 0/230 mm | Quadrat, 24×24 mm | 0,9678 | 0,9790 |

Die Tabelle zeigt deklarierte Millimeterwerte. Vorschau-/Exportboxen stimmen
innerhalb der bestehenden 0,3-mm-Toleranz überein. Die gerundete A4-Pixelgrösse
kann gegenüber Millimeterwerten einen kleinen Rasterrest am Rand lassen.
Bildfilter, Rahmenfarbe und Rahmenstärke stimmen ebenfalls überein.

| Gesperrter Fall | Nachgewiesener Fehler |
| --- | --- |
| Rechts, x=195 mm / Breite 24 mm | Foto ragt rechts über A4 hinaus |
| Unten, y=282 mm / Höhe 30 mm | Foto ragt unten über A4 hinaus |
| Gespiegelt, x=195 mm / Breite 24 mm | Physischer linker Rand liegt bei −9 mm |
| Links, x=0/y=230 mm | Foto überdeckt einen Teil des Datumsfeldes im Projektabschnitt |

Alle vier Negativfälle deaktivieren die normale PDF-Aktion, bieten keinen
Bestätigungs-Bypass und weisen den direkten Export-API-Aufruf mit einem
Lebenslauf-Fehler ab. Kein Download entsteht; gespeicherte Fotopositionen
bleiben erhalten. Der Überlappungsfall war zunächst als gültiger linker
Randfall angelegt und scheiterte zu Recht. Seine sichtbare Datumsüberdeckung
bleibt eine eigene Gegenprobe; der gültige Fall liegt darunter bei y=259 mm.
Die Produktionssperre wurde nicht verändert.

## Foto- und Rahmenmessung

Die echte CV-PDF-Seite wird bei 96 dpi gerendert. Die bisherigen Grenzen
bleiben **0,95 RGB-SSIM nach 0,4 Pixel Glättung**; Rohwerte bleiben sichtbar.
Foto, Rahmen, Hintergrund und ein 3-Pixel-Saum innerhalb A4 gehören zum
Vergleich. Nur der nicht gedruckte Editorgriff `data-cv-photo-handle` wird
bei der Referenzaufnahme ausgeblendet; sein absolutes Layout verändert
den Dokumentfluss nicht.

Zusätzlich wird die grüne Farbdeckung für jede Rahmenseite geschätzt.
Bekannt sind die synthetische Fotopalette, der gemessene Filter
`contrast(1.01) saturate(0.94)`, grüner Rahmen und weisses Papier.
Die Filterrechnung folgt [W3C Filter Effects](https://www.w3.org/TR/filter-effects-1/).
Gemischte Kantenpixel zählen anteilig. Das Verhältnis PDF/Web muss je Seite
zwischen 0,8 und 1,25 bleiben; gemessen wurden **0,9445 bis 1,0678**.
Das Modell gilt ausschliesslich für diese bekannte synthetische Palette.

Die erste Auswertung zählte nur fast rein grüne Pixel und verlor an
JPEG-/Rasterkanten rechnerisch ganze Pixelreihen. Sie wurde durch die
Farbdeckungsmessung ersetzt; Foto-SSIM und Geometriegrenzen blieben gleich.
Ein gezielt entfernter linker Rahmen und ein um zwölf Pixel verschobener
Ausschnitt müssen die Gegenproben verfehlen. Nach Entfernen des linken
Rahmens bleiben nur rund 1,5–2,1 % seiner Referenzdeckung übrig.

## Reproduktion und Grenze

```bash
playwright test --config tests/qa/playwright.free-photo-edges.config.ts
python scripts/free_photo_edge_report.py
```

Chromium und Python-Abhängigkeiten sind im Workflow `photo-dossier-variants.yml`
gepinnt. Er führt zusätzlich die bisherigen sieben Foto-/Langdossierfälle aus
und archiviert beide Auswertungen, Eingaben, Vorschau-/PDF-Bilder,
Seitenübersichten und Sperrbelege. Quellen-SHA, Anwendungsdatei-Hashes und
Änderungsstatus stehen in den Belegen.

Lokal bestanden die neun Browserfälle, QA-TypeScript, gezieltes ESLint,
Prettier und die Foto-/Rahmenkontrollen. Das ist keine vollständige Freigabe
aller Vorlagen, Randpositionen oder Rahmenbreiten. Die zwei Standard-Kreis-
REVIEWs bleiben bestehen. Weitere historische Projektabläufe und die
Desktop-Word-Abnahme bleiben offen.
