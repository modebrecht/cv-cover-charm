# P2-20 — einheitliche geschützte Folgezeilen

Basis P2-19 `f02e8cea8b24b858d201792d41a274c94a846145`, separater Branch
`work/02nov-p2-20-unified-rows`.

Acht tatsächliche eingefrorene P2-17-Next-Quellen mit ihren zugehörigen App-Messungen:
17/18/19 Einträge mit normalen und 18 Einträge mit wechselnden Beschreibungen,
links/rechts. Die vier zusätzlichen 17-/19-Originale sind aus dem hashgeprüften
P2-17-Artefakt übernommen und mit Provenienz dauerhaft gespeichert.

Zwei Profile je Quelle (16 native Konvertierungen): gleiche geschützte Folgezeilen
ab Eintrag 06 und gemeinsame Referenzzeile, einmal mit bisherigen 20-Twip-Leerzeilen,
einmal mit 1 Twip auf genau sieben leeren Absätzen im ersten Hauptspaltenblock.
Der ursprüngliche Zellanfang wird nicht geändert. Keine Auswahl nach Textlänge
oder erwarteter App-Seitenbelegung. Fotos: bei linkem Seitenrand 0 ursprünglicher
Seitenanker, bei dem rechten Layout mit linkem Rand 1134 Twips rechnerisch gleiche
Randkoordinate. Keine bloße Verschiebung der deklarierten OOXML-Fotoposition.

Alle 18/19/20 inneren Eintragstabellen und 103/107/111 Inhaltssteuerelemente je
17/18/19-Quelle, Textreihenfolge je Story, alle Bild-/Crop-Payloads und übrigen
ZIP-Teile bleiben erhalten. Gegenüber der Basis ändert die Gegenprobe ausschließlich
sieben leere Absatzhöhen 20→1; keine Änderung von Inhalt, Toleranzen oder
Referenz-/Fotoprüfung. Die bekannte globale XML-Lesereihenfolge rechts bleibt
als Einschränkung der Strukturkopie ausgewiesen.

Die gemeinsamen Helfer unterstützen nun explizite Eintragszahlen und einen
QA-Layoutparameter. Ihre P2-19-Standardeinstellungen wurden gegen alle 16 gespeicherten
Fälle geprüft: Falldaten identisch, 0 native Neukonvertierungen. Fünf neue
Invariantenprüfungen für alle acht Quellen bestehen.

Nur der bestehende Kompatibilitätsjob. Produktcode, normaler Export, Paketdateien
und `dev`/`render`/`main` bleiben unverändert. Keine frischen App-Exporte und keine
Word-/39er-/Produktfreigabe. Native Ergebnisse stehen noch aus.
