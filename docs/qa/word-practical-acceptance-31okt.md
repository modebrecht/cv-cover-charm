# Praktischer Word-Abschluss, 31. Oktober 2026

Der Nutzer hat die Abnahme ausdrücklich auf sichtbare Qualität und reparaturfreies
Speichern/Wiederöffnen in Desktop Word ausgerichtet und den lokalen Commit
beauftragt. Die Originalpixel außerhalb des sichtbaren Ausschnitts und exakte
unsichtbare PDF-Bildmatrizen sind dafür keine zusätzlichen Sperren.

## Geprüfte Word-Datei

Der Hauptfall ist das dreiseitige synthetische Bewerbungsdossier mit Titelblatt,
Brief und Lebenslauf. Relevant ist das rot/blaue runde Testfoto im Lebenslauf.
Es ist weiterhin ein Testdossier, keine neue Bewerbungsvorlage.

Die Rich-Text-Variante aus dem echten Renderer hat bereits zwei getrennte
Word-Save/Reopen-Zyklen ohne Reparatur durchlaufen. Die dazu gebundenen Rohdaten
liegen in `artifacts/word-desktop-31okt/richtext-word-analysis.json` und im
historischen Bericht `word-direct-picture-31okt.md`. Quelle und zweiter Word-Save
haben dort dieselbe sichtbare PDF-Darstellung.

Beim Abschluss wurde der zweite Word-Save bytegleich nach
`artifacts/word-practical-31okt/Dossier-Word-final.docx` kopiert und erneut in
Desktop Word geöffnet: keine Reparaturwarnung. Das ebenfalls bytegleich
übernommene Word-PDF wurde vollständig auf drei Seiten gerendert und visuell
geprüft. Titelblatt, Brief, Lebenslauf und gefülltes rot/blaues Foto sind sichtbar;
keine abgeschnittenen Texte oder überlappenden Bereiche festgestellt.

**Praktischer Word-Hauptfall: bestanden.** Diese Aussage gilt für diesen
gebundenen Hauptfall. Die Originalquelle mit typisiertem, frei verankertem
Bildsteuerelement, die wiederholt Reparatur verlangte, wird dadurch nicht
nachträglich für gültig erklärt.

## Writer-Rücklauf ausdrücklich ausgeschlossen

Zusätzlich wurde der vorhandene Rich-Text-Hauptfall nach zwei nativen Writer-Saves
in Word geöffnet, separat gespeichert, geschlossen und erneut geöffnet. Diese
Öffnungen verlangen keine Reparatur. Die abschließende PDF-Sichtprüfung zeigt
jedoch einen **leeren Fotoumrandungsring**. Damit scheitert der Rücklauf am nun
maßgeblichen sichtbaren Ergebnis, unabhängig von Originalpixeln und Feldmetadaten.

Dieser Gegenbeleg liegt ausschließlich im ignorierten Artefaktordner als
`Dossier-Word-geprueft.docx` und zugehöriges PDF. Der vorläufige Name bezeichnet
keine erfolgreiche Abnahme. Ausgeliefert wird ausschließlich `Dossier-Word-final`.
Ein reparaturfreies Öffnen allein genügt nicht als Bildnachweis.

## Commitumfang und Prüfung

Gesichert werden die reproduzierbaren Diagnosevarianten im Renderer, die
verschärften Bildbesitz-/PDF-Geometrieprüfungen, die nativen Gegenbelege und die
klar als ungebaute Entwürfe bezeichneten Upstream-Patches. Die Rendereroptionen
bleiben abgesichert. Der normale Produktexport wurde nicht umgestellt; eine
vollständige 22er- oder editorübergreifende Produktfreigabe wird nicht behauptet.

- 1495 Unit-Tests in der eingerichteten Linux-Testumgebung bestanden.
- Typprüfung, Lint und Format der geänderten TypeScript-Dateien bestanden.
- Vorhandene 148 fokussierte Python-Tests: alle Skripthashes weiterhin aktuell;
  kein unnötiger identischer Wiederholungslauf.
- Eingeschränkter Windows-Unit-Lauf: 1486 bestanden, neun Fehler durch gesperrte
  Kindprozesse. Der danach vollständig bestandene Linux-Lauf bleibt der
  vollständige Unit-Nachweis; der Windows-Fehllauf bleibt erhalten.
- Arbeitskopie und neue Dateien auf Whitespacefehler geprüft.

Die zugehörige JSON-Datei bindet Auslieferung, Fehlergegenprobe, historische
Word-Nachweise und aktuelle Testlogs per SHA-256. Private Screenshots, Dokumente,
Engine-Binärdateien und native Rohartefakte bleiben außerhalb des Commits.
Nur lokaler Commit; kein Push, Merge oder Engine-Austausch.
