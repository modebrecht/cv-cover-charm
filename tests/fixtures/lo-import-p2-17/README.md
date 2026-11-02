# P2-17 — längere Beschreibungen

Echter synthetischer DOCX-Next-Download und nachträgliche Tabellen-Diagnosekopie,
mit beiden tatsächlich erzeugten LibreOffice-PDFs. Kein Produktfix.

Der Original-Import enthält 8/18 vollständige Einträge auf 3 Seiten. Die Kopie
enthält 18/18 auf 5 Seiten, trennt aber Eintrag 09 zwischen zwei Seiten und die
Referenzüberschrift vom Referenztext. App-Vergleich: 5 Seiten ohne solche Trennungen.
Beide PDF-Dateien sind ausdrücklich FAIL-Prüfbelege, keine freigegebenen Dokumente.

Die Paket-, Seiten-, Foto- und Titelmessungen stehen unter
`docs/qa/p2-17-native-results.json`; Bildvergleich und Einordnung im zugehörigen
P2-17-Bericht. Das Manifest hält Download-/PDF-Hashes und CI-Provenienz fest.
Die vollständigen acht App-PDFs/DOCX-Quellen sowie alle nativen PDFs liegen im
verlinkten Actions-Artefakt (14 Tage Aufbewahrung). Der grosse App-Raster-PDF wird
hier nicht dupliziert; sein Originalhash und gemessene App-Seiten bleiben dokumentiert.

Neuberechnung der Kopie ohne Konvertierung:

```bash
PYTHONPATH=scripts python - <<'PY'
from pathlib import Path
from dossier_row_generalization import make_copy
p=Path('tests/fixtures/lo-import-p2-17')
make_copy(p/'cv-18-varied-left-original.docx',Path('/tmp/p217-varied-copy.docx'),18)
PY
```
