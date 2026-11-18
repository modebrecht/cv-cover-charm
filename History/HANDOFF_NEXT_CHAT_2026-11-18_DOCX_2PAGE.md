# CV Cover Charm – Handoff vom 18.11.2026

## Start im neuen Chat

Setze diesen Handoff fort. Arbeite in `modebrecht/cv-cover-charm` direkt auf
`dev`. Nimm als Nächstes den regulären Word-Download für fest auf zwei Seiten
verteilte Modern-Sidebar-CVs in [#205](https://github.com/modebrecht/cv-cover-charm/issues/205)
auf. Arbeite den gewählten Prüfschritt zusammenhängend ab und melde das
Ergebnis. Für Routineprüfungen braucht es kein wiederholtes «Continue».

## Stand am Übergabepunkt

Der letzte Produktcommit ist [`c118e6e567f41f2d16fe6b90b01f02dd9dc69637`](https://github.com/modebrecht/cv-cover-charm/commit/c118e6e567f41f2d16fe6b90b01f02dd9dc69637).
`dev` und `origin/dev` zeigten beim Prüfen auf diesen Stand. Die Arbeitskopie
war sauber. Der Handoff-Commit ergänzt nur diese Dokumentation. Seine Eltern-SHA
ist der geprüfte Produktstand. `main` steht auf `44d7eb9`, `render` auf `1fe6dbe`.

Auf dem Produktcommit sind **6/6 CI-Workflows** beim ersten Versuch grün.
Die CV-Prüfung umfasst **57/57 Browserfälle** (13 Einseite, 16 Zweiseiten,
28 Automatik). Die Unit-Suite besteht mit **1’549 Tests**. Die Gruppe
`dossier-flow` besteht mit **91/91 Fällen**. Zum Übergabezeitpunkt sind diese
Läufe abgeschlossen. [Checks](https://github.com/modebrecht/cv-cover-charm/commit/c118e6e567f41f2d16fe6b90b01f02dd9dc69637/checks) · [Seitenanpassung](https://github.com/modebrecht/cv-cover-charm/actions/runs/44411857256) · [Dossier-Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/44411857185)

Zuletzt bearbeitet wurde **#226**. Die gemessene Masonry-Verteilung berücksichtigt
jetzt eine bessere Trennung zwischen aufeinanderfolgenden Rubriken. Im
reproduzierten Fall sinkt die Höhe von 663 auf 603 px. Vorschau und echter
PDF-Download stimmen bei der Platzierung überein. Die Tests decken Neuladen,
Live-Textänderungen und freie Referenzpositionen ab. Diese Änderung ist fertig.
Für #205 wurde der vorhandene Exportpfad und der CI-Nachweis abgeglichen.
Die Produktfreigabe des zweiseitigen Word-Downloads wurde noch nicht begonnen.
[#226](https://github.com/modebrecht/cv-cover-charm/issues/226)

## Nächster konkreter Prüfschritt für #205

Web und PDF sind für beide Seitenaktionen geprüft. Der reguläre Word-Download
verweist bei festen CV-Rubriken auf Seite 2 auf PDF. Der interne Aufruf mit
`cvTwoPagePreview: true` liefert in fünf Browserfällen ein bearbeitbares DOCX
mit zwei nativen Tabellen und genau einem Seitenumbruch im Paket. Die Fälle
`left`, `right`, `narrow`, `wide` und `long` prüfen Feldkennungen, die
Zuordnung der Referenz und das Foto. Diese Paketprüfungen belegen noch keine
tatsächliche Zweiseiten-Pagination in einem Word-Renderer.

1. Nutze die fünf vorhandenen `word-preview-*.docx` aus dem
   [CI-Artefakt](https://github.com/modebrecht/cv-cover-charm/actions/runs/44411857256/artifacts/14476959864).
   Falls das Artefakt abgelaufen ist, führe nur die bestehenden Fälle
   `two-page Word preview` aus
   `tests/qa/playwright.two-page-fit.config.ts` aus.
2. Prüfe zuerst den kurzen Standardfall `left` und den Grenzfall `long` auf
   gerenderte Seitenzahl, vollständige Einträge, Foto auf Seite 1 und Referenz
   auf Seite 2. Halte Renderer, Datei und Ergebnis fest. LibreOffice liefert
   technische Hinweise. Eine Aussage über Desktop Word braucht passende
   Word-Evidenz.
3. Behebe einen belegten Umbruch- oder Breitenfehler am aktuellen Modern-Pfad,
   falls er sich zeigt. Die Freigabe des normalen Downloads richtet sich nach
   diesem Nachweis. Der bisherige PDF-Hinweis im Menü ist bis dahin korrekt.

Einstieg im Code ist die Prüfung um `hasExplicitSecondCvPage` in
`src/lib/docx-next/app-source.ts`. Der Vorschauaufruf und die fünf
Paketprüfungen stehen in `tests/qa/cv-two-page-fit.qa.ts`.
Für diesen nächsten technischen Schritt ist kein erneutes Prüfen durch Matthias
nötig.

## Abgeschlossene Arbeit, die als Nachweis weiterverwendet werden kann

| Thema                       | Gesicherter Stand                                                                                                                                                                                                                                                      |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON-Import                 | #207 geschlossen. Bestätigung in allen Editoren, Abbruch erhält Entwurf, ungültige Teile werden abgelehnt. 67 Originale akzeptiert, 50/50 Importfälle und 62/62 pixelgleiche PDF-Seitenpaare. [#207](https://github.com/modebrecht/cv-cover-charm/issues/207)          |
| Word-Foto                   | #187 geschlossen. Vorhandene Word-Rückläufe und aktueller Importvergleich belegen Foto und Ausschnitt im unterstützten Pfad. [#187](https://github.com/modebrecht/cv-cover-charm/issues/187)                                                                           |
| PDF-Schutz                  | #208 geschlossen. Beim Gesamt-PDF werden auch Bildrahmen und freie CV-Elemente nach dem Zeichnen auf die Seitengrenzen geprüft. [#208](https://github.com/modebrecht/cv-cover-charm/issues/208)                                                                        |
| Word-Farbe und Klickansicht | Der bestätigte Modern-Sidebar-Fix ist normaler Standard. Die alte stabile Kopfzeilenvariante ist nur über `devCompactChromeInHeader` intern verfügbar. Die Bestätigung zu Farbe und Klickansicht gilt weiter. [Nachweis](../docs/qa/word-chrome-default-2026-11-17.md) |
| Cabin und Neon              | Cabin-CV und Neon-Hintergrund sind behoben. Der dokumentierte vollständige Web/PDF-Vergleich hat 39/39 Vorlagen und 117 Seitenpaare mit 115 PASS, 2 REVIEW und 0 FAIL. [Nachweis](CABIN_CV_COMPLETED_2026-11-17.md)                                                    |

## Was noch offen ist

**21 offene GitHub-Issues** zum Zeitpunkt der Übergabe. Das sind Arbeits- und
Sammelissues. Die Zahl beschreibt den Bestand der offenen Tickets.
[Aktuelle Liste](https://github.com/modebrecht/cv-cover-charm/issues?q=is%3Aissue+is%3Aopen)

| Bereich                 | Offene Issues und Schwerpunkt                                                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seitenaufteilung        | **#205** regulärer zweiseitiger CV-Word-Download. **#206** breitere Word-Abdeckung für mehrseitige Briefe. **#226** gleiche gemessene Zuordnung im klassischen Masonry-DOCX. Web/PDF für den bearbeiteten Masonry-Fall sind geprüft.          |
| Word-Unterstützung      | **#188, #191, #192, #196, #202, #203** für weitere Sidebar- und Layoutprofile, Stressfälle, LibreOffice sowie Desktop-Word-Matrix. Das unterstützte Modern-Profil hat bereits einen regulären Download.                                       |
| Darstellung und Abnahme | **#189, #190, #194, #195, #197, #200, #201, #204, #227** für Vorlagenfamilien, Seitenmatrix, Breite der Produktabnahme und Web/PDF/DOCX-Vergleiche. In #204 bleiben die Foto-Kreisränder von Terracotta und Studio 3 als REVIEW dokumentiert. |
| Schrift und Foto        | **#193, #198, #199** für breitere Schriften-, Fallback- und Bildmatrix. Der behobene Cabin-CV und das akzeptierte native Sidebar-Foto sind vorhandene Nachweise.                                                                              |

Halte die Arbeit auf `dev` und beachte `AGENTS.md`. Verwende die vorhandenen
Nachweise für erledigte Teilbereiche. Der historische Handoff und ältere
Oktober-Checklisten bleiben als Verlauf erhalten.
