# P2-23 — direkter Hauptfluss und Linienkontrollen

`p222-varied-right-faint-lines.pdf`: tatsächlicher nativer P2-22-Fehlerfall,
vier zu blasse Hauptlinien. Provenienz und Hash in `NEGATIVE.json`. Kein akzeptierter PDF.

`varied-right-body-flow-nosplit-front.docx` und `...-lo.pdf`: Diagnosekopie und
nativer begrenzter Trial PASS mit langen rechten Texten, direktem Hauptfluss,
sieben ergänzten fehlenden Zeilen-Guards und vier Vordergrund-Flags.
Keine Produkt-/Word-/39er-Freigabe; normale kurze Texte bleiben im Aufbau FAIL.

Hash- und CI-Nachweise, Rohdaten und Bilder: `docs/qa/p2-23-*`.
Quell-DOCX ist `lo-import-p2-18/cv-18-varied-right-original.docx`.
Native Negativ-/Positivkontrollen werden von den neuen Strukturtests verwendet.
