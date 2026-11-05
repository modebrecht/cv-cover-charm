# PDF-Freigaben in der regulären dev-Regression

Fortsetzung von [#208](https://github.com/modebrecht/cv-cover-charm/issues/208),
auf `dev` ab `3c7348714653117e2dcacf5002e38abccf3ff53e`.

Der bestehende Workflow `Automatic PDF preflight acceptance` führt die
Freigabetests auf passenden Pull Requests, früheren `fix/pdf-preflight-*`-Branches
und bei manuellem Start aus. Direkte Pushes auf `dev` lösen ihn nicht aus.
Die allgemeine `Dossier Regression` deckte die zehn gezielten Fälle aus
`pdf-consent-boundaries.qa.ts` bisher nicht ab.

Die vorhandene Browser-Matrix erhält deshalb die Gruppe `pdf-consent`. Sie
verwendet die bestehende Preflight-Konfiguration und genau diese Testdatei.
Playwright startet und beendet für diese Gruppe selbst den Entwicklungsserver;
die übrigen Gruppen behalten ihren bisherigen Serverstart. Das gemeinsame
Regressionsergebnis hängt bereits von der gesamten Browser-Matrix ab und
schliesst dadurch auch diese Gruppe ein. Messprotokolle und tatsächlich erzeugte
PDFs werden zusätzlich zum JSON-Testbericht als Artefakt archiviert. Der
JSON-Ausgabepfad ist absolut, damit die QA-Konfiguration den Bericht nicht
relativ zu ihrem eigenen Verzeichnis ablegt.

Die zehn unveränderten Fälle prüfen:

- gefälschte Freigaben, einen identisch ersetzten Dokumentbaum und den Verbrauch
  einer Freigabe beim Versuch, sie für ein anderes Dokument zu verwenden;
- das Ablaufen nach Farb-, Rand- oder Quelltextänderungen sowie unbekannten Warnungen;
- eine sichere Farbänderung während der tatsächlichen PDF-Rastererzeugung;
- das offene Downloadmenü bei einem Druckfehler und nach dessen Behebung;
- den ausdrücklichen Download trotz zulässiger Warnung, ohne eine dauerhafte
  Freigabe beim Wiederöffnen oder Neuladen zu speichern.

Lokal wurde derselbe Aufruf wie in der Matrix mit einem Worker und ohne
Wiederholungen ausgeführt: **10 bestanden, 0 Fehler**. Die YAML-Struktur,
Zuordnung zum gemeinsamen Regressionsergebnis und Formatierung sind geprüft.
Die gespeicherten PDFs und JSON-Protokolle liegen in
`pdf-consent-evidence-<Commit-SHA>` und `regression-pdf-consent-<Commit-SHA>`.

Die PDF-Policy und ihre Freigabebedingungen werden durch diese Änderung nicht
erweitert. Der Override bleibt auf den geprüften Standalone-Brief mit
vollständigem Inhalt und zulässiger Messwarnung begrenzt. Harte Druckfehler,
ausstehende Ressourcen und unbekannte Warnungen bleiben gesperrt. Für das
Gesamtdossier ist weiterhin keine Override-Freigabe belegt; #208 bleibt deshalb
teilweise offen. Die grosse Vorlagen- und Rastermatrix wird nicht zusätzlich
bei jedem direkten dev-Push gestartet.
