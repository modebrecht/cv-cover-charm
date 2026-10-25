# Gesicherte lokale DOCX Arbeit

22. Oktober 2026. Der Benutzer hat den bisherigen Commit-Stopp ausdrücklich aufgehoben und die Sicherung aller lokalen Arbeiten beauftragt.

| Arbeit | Dauerhafter Stand |
| --- | --- |
| Sidebar-Fotos, Bildrahmen, Referenzen und halbe Textbreite | Bereits auf `fix/docx-next-sidebar-word-layout-21okt`, Kopf `f73c776e2eca6b9b0d858ee2ab997230259797ac` |
| Bisherige Word-Pagination und Fusszeilenreserve | Bereits auf `fix/docx-next-word-pagination-21okt`, Kopf `e1f11779db1da78c08651b22b552cf6f54006e5d` |
| Durchgehende CV-Seitenfläche | Neu auf `fix/docx-next-cv-page-surface-22okt`, Commit `f256e1817bad54767f58cfba6c958d21a2151441`; Produktcode, Tests, QA-Skripte und Nachweise |
| Dokumenteigene 90-Prozent-Skalierung | In diesem neuen Checkpoint rekonstruiert, separat geprüft und veröffentlicht |
| Bisher nur lokale Pagination-Edge-Probes | Mit diesem Checkpoint unter `scripts/qa-pagination-edge-probe.ts` und `scripts/qa-pagination-edge-one-probe.ts` gesichert |
| Frühere kombinierte Sidebar/Fidelity-Projektion | Reviewbarer Transport bereits in den Remote-QA-Dokumenten; keine neue Branch-Integration |

Die Bestandsaufnahme verglich die vorhandenen Quellen mit den aktuellen Git-Blob-IDs. Die vollständige lokale CV-App-Kopie entspricht dem aktuellen Pagination-Stand; der Sidebar-Prüfbaum entspricht dem aktuellen Sidebar-Stand. Frühere Arbeitskopien und verworfene Experimente sind historische Zwischenstände und werden nicht über neuere Produktdateien geschrieben. Die früheren Foto-Ownership-Skripte und Berichte sind weiterhin über den historischen Foto-Ownership-Branch erreichbar.

Die verschwundene lokale Skalierungs-Kandidatur konnte nicht bytegenau wiederhergestellt werden. Der neue Skalierungsstand erhält deshalb eigene Quell-Hashes und neue Testergebnisse. Die im früheren Chat genannten 183 Tests und zehn Exporte werden nicht als aktuelle Zertifizierung übernommen.

Nach diesen Sicherungen ist der nächste Produkt-Schritt die kontrollierte Zusammenführung der gepinnten Fidelity-, Sidebar- und CV-Fixes und eine konsolidierte Prüfung dieses Gesamtstands. Die aktuelle Anweisung führt Commits und deren Verifikation aus; `dev`, `main`, `render`, Merge und Deployment bleiben unverändert.
