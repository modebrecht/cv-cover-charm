# P2-22 — unabhängiger Hauptspaltenfluss

Basis `d1ba99a3bb44aea4a733551bf80f35f8f3d50dc6`, separater Branch
`work/02nov-p2-22-detached-main`.

Vier echte eingefrorene P2-17-Next-Quellen (18 normale/längere Einträge links/rechts)
und passende eingefrorene App-Messwerte. Keine frischen Exporte, keine privaten Dateien.
Drei Profile je Quelle: bisheriger P2-19-Kontrollimport; getrennte schwebende
Sidebar und einspaltige Haupttabelle mit seitlichem Umfließen; dieselbe Trennung
mit auf die ursprüngliche Hauptspalte begrenztem Sektions-Textbereich. 12 native Konvertierungen.

Die neue Haupttabelle besitzt eine Vorlaufzeile bis Eintrag 01, dann je eine
ungeteilte Zeile pro Eintrag 02–18 und eine gemeinsame Referenzzeile. Dieselbe
Regel für beide Textlängen; keine festen 5/14-Seitengrenzen. Die Sidebar wird
an der ursprünglichen Seitenposition schwebend verankert. Ein neuer leerer
1-Twip-Absatz unmittelbar danach hält den logischen Anker vor der Haupttabelle.

Alle ursprünglichen Hauptblöcke, 19 inneren Eintrags-/Referenztabellen,
107 Inhaltssteuerelemente, Sidebar-Payload und Grafikpayloads bleiben gegenüber
dem Foto-Kontrollimport erhalten. Die Umflussvariante lässt die Sektion unverändert;
die Rahmenvariante ändert ausschließlich ihre beiden horizontalen Seitenränder.
Andere ZIP-Teile einschließlich aller Kopf-/Fußbereichsdateien bleiben bytegleich. Die äußere dreispaltige Tabelle und die leere Abstandszelle entfallen.
Globale XML-Lesereihenfolge kann sich ändern, keine Word-/Barrierefreiheitsfreigabe.

Unveränderte Inhalts-, Seiten-/2-mm-Geometrie-, Foto- und Referenzgruppen-Gates;
zusätzlich exakte Pixelhashes der Kopfregion bis 45 mm und des unteren Randes ab
292 mm gegen den jeweiligen nativen Kontrollimport. Ein Trial-PASS darf keine
neue Kopf-/Fußbereichsregression enthalten.

Nur bestehender Kompatibilitätsjob und Workflow. Produktcode, normaler Export,
Paketdateien und `dev`/`render`/`main` bleiben unverändert. Native Ergebnisse folgen.
