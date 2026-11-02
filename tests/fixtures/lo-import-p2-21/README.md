# P2-21 — neue Ausschnitt-Downloads

Zwei tatsächliche synthetische 18-Einträge-DOCX-Next-Downloads mit Download-
Manifesten aus Commit `887706640dba19aac621b13a7817e7efad6d8902`.
Links Zoom 1,8 / x20 y80, rechts Zoom 2,2 / x75 y30.

`crop-right-side-aware.docx` und `...-lo.pdf`: rechte Diagnosekopie und tatsächlicher
LO-PDF. Begrenzter Trial PASS; rechter Musterwert 90,62% bei 90%-Gate, kein
perfekter Bildgleichstand und keine Produkt-/Word-/39er-Freigabe.

Alle Dateihashes und CI-Provenienz stehen in `MANIFEST.json`.
Alle vier nativen PDFs und die beiden Original-App-PDFs liegen im 14-Tage-Artefakt.
App-Messungen/Originalhashes und Bildvergleiche bleiben im P2-21-Rohbericht erhalten.
Die JSON-Dateien verweisen auf App-PDFs, die hier ausdrücklich nicht dupliziert
werden. Für eine vollständige App-Neuvermessung wird das CI-Artefakt oder ein
erneuter echter Downloadlauf benötigt. Aus den gespeicherten DOCX-Quellen können
Diagnosekopien und native PDFs erneut erzeugt und mit den eingefrorenen App-
Messwerten verglichen werden.
