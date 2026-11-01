# P2-17 — feste Tabellenaufteilung bei anderen Inhalten

Basis: `4f0cccea40628bbee0c22dc447f11c7088190dee` (P2-16).
Arbeitsbranch: `work/02nov-p2-17-row-generalization`.

## Begrenzter Versuch

Acht neue echte Download-Paare über die bestehenden App-Menüs: 17/18/19 Einträge
mit linker/rechter Sidebar sowie 18 Einträge mit 1/2/3 zusätzlichen Textabschnitten
im Wechsel. Nur synthetische Namen, Telefonnummern und ein Canvas-Kalibrierbild.
Die Zusatzbeschreibungen enthalten eindeutige `P217ZusatzXX`-Markierungen und enden
erst danach mit `Arbeitsschritte`, damit Titelpräsenz keine Vollständigkeit vortäuscht.

Je Quelle werden der unveränderte DOCX-Next-Download und eine Diagnosekopie mit
festen Zeilengrenzen vor Eintrag 06 und 15 konvertiert (16 native Konvertierungen).
Die Grenzen werden nicht anhand der neuen App-Seiten nachjustiert. Die Kopie setzt
nur die bekannten leeren Hauptspalten-Abstände auf null und verschiebt ganze
Hauptspaltenblöcke. Pro Quelle bleiben alle Eintragstabellen, Inhaltssteuerelemente,
Grafiken, Sidebar-Inhalte und alle anderen ZIP-Teile unverändert. Die globale
XML-Lesereihenfolge ändert sich rechts weiterhin; keine Word-/Barrierefreiheitsabnahme.

Die eingefrorenen P2-16-Kandidaten werden durch den neuen variablen Builder
bytegenau reproduziert. Inhalts-, Seiten-/2-mm-Geometrie-, Foto- und Linienprüfungen
bleiben getrennt. Ein erfolgreicher CI-Lauf bedeutet keine Produktfreigabe.

Der bestehende Workflow und sein bestehender `semantic-parity`-Job werden genutzt;
kein zweiter Workflow/Job. Produktcode und normaler Export werden nicht geändert.
Der rechte Fotoanker wird hier nicht geändert.

## Ergebnis

Native Ergebnisse stehen noch aus. Dieser Abschnitt wird nach dem Lauf mit
getestetem Commit, Lauf-/Artefakt-ID, Rohdaten-Hash und Einzelbefunden ersetzt.
