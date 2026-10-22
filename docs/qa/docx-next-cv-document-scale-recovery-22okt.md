# CV Dokument Skalierung wiederhergestellt und gesichert

22. Oktober 2026. Commit-Checkpoint auf `fix/docx-next-cv-document-scale-22okt`, Basis `e1f11779db1da78c08651b22b552cf6f54006e5d`.

Die bestehende CSS-Regel `zoom: 0.9` innerhalb des Modern-CV gehört zum Dokumentlayout. Die Browser-Zoomstufe ist davon unabhängig. Bisher übernahm der DOCX-Export die unskalierten berechneten CSS-Schriftgrössen und Abstände. Er erzeugte dadurch einen höheren Inhalt als das gleiche Web-Dokument.

Die früher nur lokal vorbereitete Korrektur samt Zehn-Fälle-Matrix war in der aktuellen Arbeitsumgebung nicht mehr vorhanden. Dieser Checkpoint stellt die Implementierung anhand des dokumentierten Befunds erneut her. Er ist keine bytegenaue Wiederherstellung des verlorenen Kandidaten. Frühere Testergebnisse werden nicht auf diese neuen Bytes übertragen. Der nun veröffentlichte Quellstand und die folgenden frischen Prüfungen sind die neue Grundlage.

## Änderung und Umfang

Die versteckte Messung des bestehenden CV-Renderers erfasst jetzt die dokumenteigene CSS-Skalierung als `InteriorTextMetrics.cvFlowScale`. Die Suche endet innerhalb der A4-Seite; äussere Editor-Skalierung und Browser-Pixeldichte werden nicht als Dokumentfaktor gelesen. Unterschiedliche Skalierungsfaktoren innerhalb derselben gemessenen Lesezeilen führen zu einem Fehler.

Der Builder wandelt die Geometrie nach Übernahme der gemessenen Textrollen genau einmal in physische Word-Einheiten um. Schriftgrössen, Zeichenabstände, Mindestzeilenhöhen, Absatzabstände, Einzüge, feste Tabellenspalten und Überschriftskapseln verwenden den gemessenen Faktor. Die verfügbare Papierbreite und flexible Spalten bleiben erhalten. Die Struktur von Tabellen, Textfeldern und semantischen IDs wird bewahrt. Die Umrechnung ist opt-in für klassische CV-Lesezeilen mit frischer Messung; ohne diese Eigenschaft bleibt das bisherige Modell unverändert. Sidebar, seitengebundene Bilder, Seitendekoration und die anderen Dossierteile werden nicht umskaliert.

Die Funktion lehnt ungültige Faktoren, positionierte Tabellen und nicht unterstützte Spaltenbesitzer ab. Mindestzeilenhöhen bleiben Mindestwerte; es wird keine abschneidende exakte Zeilenhöhe eingeführt. Das ist weiterhin der vorhandene Modern-QA-Pfad und kein Produktionsschalter oder Zertifikat für alle Vorlagen.

## Frisch ausgeführte Prüfungen

| Prüfung | Ergebnis |
| --- | --- |
| Fokussierte CV-, Pagination-, Renderer- und Modelltests | 97 bestanden, 0 fehlgeschlagen, 12 Testdateien |
| Neue Regressionstests | 4; physische Einheiten und unveränderter Input, feste/flexible Spalten, Kapseln und Mindestzeilenhöhe, sichere Grenzen |
| Striktes fokussiertes TypeScript | PASS für Builder, Renderer und Browser-Skalierungshelfer |
| Gespeichertes Modern-Projekt 05 mit eigenen Werten | Über echten JSON-Import wiederhergestellt; keine Seitenanpassungsaktion |
| Drei echte geschützte UI-Downloads | 1440 px/DPR 1, 1440 px/DPR 2, 980 px/Vorschau-CSS 0.7 |
| Exportbytes und frisch erfasste Modelle/Metriken | In allen drei Anzeigekonfigurationen identisch |
| Gespeicherte Einstellungen | Durch Wiederherstellung und Export unverändert |
| Normales App-PDF und nativer DOCX-Render | Je 3 Dossierseiten, davon 1 CV-Seite |
| Beide Referenzen | Thomas Weber und Anna Keller vollständig vorhanden |
| Kanonische Feld-IDs und Texte | Alle 80 Modellfelder unverändert |
| Native Content Controls | 84 unterschiedliche Tags; keine doppelten Tags |
| Titelblatt und Anschreiben im Modell | Identisch zum zuvor gespeicherten Ausgangsmodell |
| Visuelle Kontrolle | Alle drei neuen Dossierseiten geprüft |

Das native Rendering verwendet unverändertes LibreOffice als ergänzende Prüfung. Das normale PDF stammt aus der temporären QA-SPA; damit ist kein vollständiger Original-Produktionsbuild nachgewiesen. Die drei DOCX haben jeweils SHA-256 `82cdc8b191d868551ee13230ece39aa343ca7ec25e384f63b90afb2334e754ae`. Änderungen der Pixeldichte oder Vorschau sind keine Prüfung des Chrome-Menüzooms; dieser bleibt unbestätigt.

## Reproduktion und Anschluss

Der gespeicherte Ausgangszustand liegt unter `tests/fixtures/docx-next/cv-document-scale-custom-values-project.json`. Der Runner `scripts/qa-cv-document-scale-22okt.ts` benötigt einen laufenden QA-App-Server sowie `DOCX_NEXT_APP_URL`, `DOCX_NEXT_SAVED_PROJECT`, `DOCX_NEXT_CHROMIUM_PATH` und die Playwright-Abhängigkeit aus der primären Laufzeit. Die bisher nur lokalen beiden Pagination-Edge-Probes werden ebenfalls mitgesichert; ihre historischen Ergebnisse sind keine neue Abnahme dieses Kandidaten.

[Patch](docx-next-cv-document-scale-recovery-22okt.patch) und [maschineller Nachweis](docx-next-cv-document-scale-recovery-22okt-evidence.json) gehören zu diesem Stand. Der separate Seitenflächen-Fix ist unter `fix/docx-next-cv-page-surface-22okt` bei Commit `f256e1817bad54767f58cfba6c958d21a2151441` gesichert. Die beiden Zweige sind noch nicht zu einem neuen Gesamtkandidaten zusammengeführt.

**Status: rekonstruierter Fix mit frischer lokaler Prüfung, auf GitHub gesichert; Word-Freigabe offen.** Die bereits bestandene Original-Abnahme von 02/12 bleibt geschlossen. Die frühere Zehn-Fälle-Matrix, allgemeine Bildbearbeitbarkeit, vollständige Sidebar-Geometrie und die neue kombinierte Kandidatur werden nicht als bestanden erklärt. Keine neue Zwischen-Testanfrage beim Benutzer. Kein Merge, Deployment, CI-Dispatch oder Produktionsschalter.
