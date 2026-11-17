# Cabin-CV abgeschlossen – 17.11.2026

Produktstand: [`e816f95027afe9a8de737a28e5ec1340a6b5a251`](https://github.com/modebrecht/cv-cover-charm/commit/e816f95027afe9a8de737a28e5ec1340a6b5a251), direkt auf `dev`.
Dieser Abschluss ergänzt ausschliesslich Nachweise unter `History/`; er
ändert den verifizierten Produktcode nicht.

Die Arbeitsumgebung ist wieder verfügbar. Die im vorherigen Handoff genannte
Cabin-CV-Abweichung wurde reproduziert, auf die CSS-Zoom-Umwandlung eingegrenzt
und kausal behoben. Die tatsächlich verwendete Schriftgrösse wird jetzt auch
beim Zeichnen der Export-Glyphen erhalten. Der vollständige Cabin-CV-Rohvergleich
steigt von 0,939804 REVIEW auf **0,965618 PASS**.

## Abgeschlossene Prüfung

- Acht-Schriften-Matrix: **8/8 echte Dossier-Downloads, 24/24 Seitenpaare PASS**.
- Alle 24 Webbild-Hashes unverändert; maximale Text-/Zeilenbox-Abweichung 0 mm.
- Acht bestehende Grundlinienproben und acht neue Zoomproben pixelgleich.
- Derselbe neue Zoomtest scheitert mit dem alten Normalisierer an 597 Pixeln.
- Vier echte Einzeldownloads für Cabin/Maschine, jeweils CV und Titelblatt:
  einseitig, gespeicherte Dokumente unverändert. Cabin-Einzel-CV 0,965493 PASS.
- **1’539 Unit-Tests**, TypeScript, Lint, Formatierung und Produktionsbuild bestanden.
- Vollständige 39-Vorlagen-Galerie: **39/39 Browserfälle; 115 PASS, 2 REVIEW,
  0 FAIL bei 117 Seitenpaaren**. Die REVIEW betreffen unverändert Terracotta-CV
  und Studio-3-CV, Foto-Kreisränder. Neon-CV bleibt PASS, maximale gemessene
  Hintergrund-Kanalabweichung 1,08 bei Grenze 3.

Schriftmatrix und Vorlagengalerie sind getrennte Prüfumfänge. Die vollständigen
Seitenbilder und Rohschwellen wurden beibehalten. Die Foto-Auswertung der
bestehenden Galerie bleibt unverändert; ihre zusätzlichen geglätteten Werte
ersetzen weder die Rohwerte noch die beiden REVIEW.

## CI auf dem Produktcommit

Alle sechs ausgelösten Workflows sind abgeschlossen und erfolgreich:

| Workflow | Nachweis |
| --- | --- |
| Dossier Regression | [44003830434](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003830434) |
| Web PDF photo gallery | [44003830500](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003830500) |
| Dossier Visual Parity | [44003830505](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003830505) |
| Template Contact Integrity | [44003830497](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003830497) |
| Photo dossier variants | [44003830483](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003830483) |
| Pages build and deployment | [44003828791](https://github.com/modebrecht/cv-cover-charm/actions/runs/44003828791) |

Die Regression bestätigt zwölf erfolgreiche Browsergruppen, schnelle Prüfungen
und den abschliessenden Regressionsstatus. `cv-pdf-paint` besteht mit **5/5 Fällen**.
Die acht neuen Zoommessungen aus seinem echten CI-Artefakt bestätigen jeweils
0 abweichende Pixel, 0 farbige Referenzpixel und unverändertes Quell-HTML.
Der optionale `native-print-benchmark` wurde übersprungen; dies ist weiterhin
keine Desktop-Word-Abnahme.

## Dauerhafte Nachweise

- [Ursache, Änderung, lokale Prüfung und tatsächliche PDF-Downloads](../docs/qa/cabin-cv-zoom-2026-11-17.md)
- [CI-Läufe und sämtliche Regressionsjobs](CABIN_CV_COMPLETED_2026-11-17/ci-summary.json)
- [Vollständiger neuer Galeriebericht mit allen 117 Seitenpaaren](CABIN_CV_COMPLETED_2026-11-17/gallery-ci-e816f95.json)
- [Acht pixelgleiche Zoomproben aus der CI](CABIN_CV_COMPLETED_2026-11-17/zoom-ci-metrics.json)

Der veröffentlichte Produktdiff wurde bytegenau gegen den gesicherten Diff
der lokalen Schriftmatrix abgeglichen. Keine neuen Nebenbranches und keine
Promotion nach `main` oder `render`.

## Offene Grenzen und nächster Schritt

Der Cabin-Schwerpunkt ist abgeschlossen. Keine weitere allgemeine Schrift-
oder Grundlinienrunde ohne neuen konkreten Fehler starten. Die beiden
Foto-Kreisrand-REVIEW bleiben eigenständige, bekannte Befunde; die bisherigen
Variantenversuche nicht erneut bei null beginnen.

Der nächste ausstehende Abnahmeschritt ist **Speichern und Wiederöffnen des
bereits vorhandenen Word-Prüfpakets in Microsoft Desktop Word**. Dafür ist
eine Arbeitsumgebung mit Desktop Word nötig. Browser, Chromium-PDF und
LibreOffice ersetzen diese Prüfung nicht. Das vorhandene Paket verwenden;
kein neues kleines Prüfpaket ohne neuen Anlass erstellen.

Lange Dossiers, Spiegelvarianten und zusätzliche historische Projekte sind
durch die kurze Modern-Schriftmatrix weiterhin nicht pauschal freigegeben.
