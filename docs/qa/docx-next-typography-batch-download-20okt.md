# DOCX Next — Typografie-Batch (20.10.2026)

Der geprüfte gemeinsame Batch umfasst 12 DOCX-Dateien, passende App-PDFs, 12 gespeicherte Projekte, Screenshot-Nachweise, die visuelle PDF-Übersicht und eine Word-Checkliste.

**Transporthinweis:** GitHub-Dateiübertragung begrenzt einzelne Uploads. Deshalb ist das eine ZIP-Archiv (16'779'249 Byte) ohne Inhaltsveränderung in acht fortlaufende Dateien `typografie-batch-20okt.zip.part00` bis `part07` aufgeteilt worden. Erst **alle acht** herunterladen und dann in dieser Reihenfolge zusammensetzen.

Auf macOS/Linux im Downloadordner:

```sh
cat typografie-batch-20okt.zip.part* > docx-next-typografie-batch-20okt.zip
unzip -t docx-next-typografie-batch-20okt.zip
```

Auf Windows in der Eingabeaufforderung im Downloadordner:

```bat
copy /b typografie-batch-20okt.zip.part00+typografie-batch-20okt.zip.part01+typografie-batch-20okt.zip.part02+typografie-batch-20okt.zip.part03+typografie-batch-20okt.zip.part04+typografie-batch-20okt.zip.part05+typografie-batch-20okt.zip.part06+typografie-batch-20okt.zip.part07 docx-next-typografie-batch-20okt.zip
```

Das Archiv selbst wurde vor der Aufteilung via ZIP-CRC-Dateitest geprüft; sämtliche 12 DOCX- und 12 App-PDF-Dateien bestanden die technischen Dateiprüfungen. Desktop Word bleibt **UNVERIFIED**, siehe `docx-next-typography-qa-20okt.md`.

Keine Änderungen an `main`, `dev`, `render`, kein Deployment oder Merge.
