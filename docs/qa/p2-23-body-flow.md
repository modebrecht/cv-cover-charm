# P2-23 — Hauptinhalt direkt im Dokumentfluss

Basis `1eadc7d079e49204ed65b4768111099ca2eb62b2`, separater Branch
`work/02nov-p2-23-body-flow`.

Vier echte eingefrorene P2-17-Next-Quellen (18 normale/längere Beschreibungen,
links/rechts), passende eingefrorene App-Messwerte. Vier Profile je Quelle:
P2-22-Rahmenkontrolle; Hauptblöcke ohne äußere Haupttabelle direkt im Dokumentfluss;
dasselbe mit 19 `cantSplit`-Zusätzen an den inneren Eintrags-/Referenzzeilen;
zusätzlich vier Hauptabschnitts-Grafiken im Vordergrund statt hinter dem Dokument.
16 native Konvertierungen. Gleiche Regel für beide Textlängen, kein 5/14-Routing.

Default-Body-Flow behält alle 19 inneren Tabellen byte-/kanonisch gleich.
Die geschützte Variante verändert ausdrücklich nur deren Zeilenformatierung:
19 neue `cantSplit`-Elemente. Nach Entfernen ausschließlich dieser Guards stimmen
alle Tabellen wieder kanonisch überein. 107 Inhaltssteuerelemente, alle Texte,
Bild-/Crop-Payloads, übrige Absatz-/Tabellenformatierung bleiben erhalten.
Vordergrund-Gegenprobe verändert zusätzlich exakt vier `behindDoc`-Flags;
Grafikinhalt/Positionen werden nicht geändert. Alle anderen ZIP-Teile unverändert.
Die Sidebar und die auf den Hauptbereich begrenzte Sektion bleiben aus P2-22.
Globale XML-Lesereihenfolge bleibt eine bekannte Einschränkung der Diagnosekopie.

Zusätzliche Prüfung aller vier Hauptabschnittslinien: 15-mm-Streifen ab 5 mm nach
dem tatsächlichen Text-Boundingbox-Ende, unveränderte Dunkellaufgrenze 0,85.
Zwei erhaltene echte linke/rechte positive native PDFs liefern für alle vier
Linien 1,0; der erhaltene tatsächliche blasse rechte P2-22-PDF liefert jeweils 0.
Keine synthetisch erfundenen positiven PDF-Ergebnisse. Vorhandene 2-mm-, Inhalts-,
Foto-, Referenzgruppen- und Kopf-/Randpixel-Gates bleiben bestehen.

Nur bestehender Kompatibilitätsjob im bisherigen Workflow. Produktcode/normaler
Export, Paketdateien und geschützte Branches unverändert. Keine frischen App-
Exporte, privaten Dateien oder manuelle Word-Abnahme. Native Ergebnisse folgen.
