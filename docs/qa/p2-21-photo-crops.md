# P2-21 — frische verschobene Fotoausschnitte

Basis P2-20 `068c804396f628aac0ae01318883d6e3118ca35f`, Branch
`work/02nov-p2-21-photo-crops`.

Zwei frische echte App-/Next-Downloadpaare mit 18 normalen Beschreibungen:
links Zoom 1,8 / Ausschnitt x20 y80, rechts Zoom 2,2 / x75 y30.
Ausschließlich synthetisches Canvas-Kalibrierbild, keine privaten Fotos.
Je Quelle unveränderter DOCX-Download und Diagnosekopie: 4 native Konvertierungen.
Die Kopie nutzt die bewährte normale P2-17-Struktur `fixed-5-14`, links unveränderten
Seitenanker, rechts die rechnerisch gleichwertige Randkoordinate. Keine zusätzlichen
Leerabsatzänderungen und keine Auswahl nach einem erwarteten Messergebnis.

Beide Quellen werden im selben Implementierungs-Commit über echte Download-Menüs
exportiert. App-PDFs werden neu vermessen, Quell-/Manifest-/PDF-Hashes und sämtliche
App-Messwerte im Rohbericht mitgeführt. Gemischte SHAs, manipulierte Downloads oder
fehlende Dateiformate werden vor Konvertierung verworfen. Kandidaten reproduzieren
auf den vorhandenen 18er-Kontrollen die P2-19-Eingaben bytegenau.

Der bestehende semantische Prüfjob führt Browser, LibreOffice und OCR aus;
kein neuer Workflow/Job. Alle bisherigen Inhalts-, 2-mm-Geometrie-, Foto-/Muster-
und Referenzgruppen-Gates gelten. Produktcode/normaler Export und geschützte
Branches unverändert. Keine Word-/39er-Freigabe. Native Ergebnisse stehen noch aus.
