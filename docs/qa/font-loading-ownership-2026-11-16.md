# Eigene Briefschrift bleibt beim Laden erhalten

Stand 16.11.2026 · Korrektur zu `7b0ae881a64422d02c681b5ff3230f44dc89c989`

Die vollständige CI findet in `7b0ae88` einen Fehler, den die zuvor separat
ausgeführten Schriftprüfungen nicht abdecken: Im 91-Fall-Dossierlauf scheitert
der bestehende Einzeldownload eines Modern/Sans-Briefs neben einem Citrus/Serif-
CV. 90 Fälle bestehen; der ausgewählte Brief wird fälschlich auf Serif gestellt
und der DOCX-Download deshalb durch die unveränderte Sans-Freigabe gesperrt.
Die drei anderen Workflows dieses Commits bestehen.

## Ursache und Korrektur

Die vorige Änderung behandelte unterschiedliche Basis-/Override-Schriften beim
Laden pauschal als veraltet. Das ist unzulässig: Ein gespeicherter Brief kann
eine ausdrücklich gewählte eigene Schrift besitzen. Sein einzelner Download
muss unabhängig von der nicht unterstützten Gestaltung anderer Dokumente
bleiben. Eine unterschiedliche gespeicherte Schrift allein beweist keinen
beschädigten Zustand.

Beim anfänglichen Abgleich bleibt die konkrete Briefschrift deshalb erhalten.
Die bisherige Basisschrift-Migration wird beibehalten. Erst ein tatsächlicher
anschliessender Schriftwechsel durch den Benutzer aktualisiert die wirksame
Briefschrift gemeinsam mit der Basisschrift. Das gilt auch dann, wenn der
Basiswert bereits stimmt. Individuelle Rollenschriften bleiben erhalten.

Die Produktkorrektur beschränkt sich auf den vorhandenen Synchronisierungs-
Helper und seinen Live-Aufrufer. Die DOCX-Freigabe und der bestehende Test für
unabhängige Einzeldownloads werden nicht gelockert. Der ergänzte Schrift-
Browserfall prüft nun ausdrücklich beide Situationen: eigene Schrift nach
dem Laden, neue gemeinsame Schrift nach einem Benutzerwechsel.

## Nachweise

- Vorher: Zwei gezielte Unit-Gegenbeispiele schlagen auf `7b0ae88` fehl.
- Nachher: 11 gezielte Synchronisierungstests bestehen, darunter die tatsächliche
  Live-Propagation mit erhaltenen Rollenschriften in drei Vorlagenfamilien.
- Der unveränderte vollständige Einzeldownload-Test und die Schriftfälle
  bestehen zusammen mit **15/15 Browserfällen**, ohne Retry, Skip oder Flaky.
- Alle **1’536 Unit-Tests in 289 Dateien** bestehen im vollständigen isolierten
  Lauf. App-TypeScript, gezieltes ESLint und Prettier bestehen.

[Messnachweis mit Browserergebnissen und Quellhashes](font-loading-ownership-2026-11-16.json).

[Ursprünglicher fehlgeschlagener CI-Dossierlauf](https://github.com/modebrecht/cv-cover-charm/actions/runs/43946950504).
Die frühere positive Acht-Schriften-Prüfung betraf ausdrückliche Benutzerwechsel;
sie war kein Nachweis für die Unabhängigkeit unterschiedlicher gespeicherter
Dokumente. Ihre Raster-REVIEWs und der nächste Maschine-PDF-Befund bleiben
separat erhalten. Keine neue stabile Writer- oder Desktop-Word-Abnahme.
