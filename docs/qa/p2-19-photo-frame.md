# P2-19 — horizontaler Bezugsrahmen des Fotos

Basis P2-18 `d3e764063fab5656e79724804654429a2621ff07`, separater Branch
`work/02nov-p2-19-photo-frame`.

Vier echte eingefrorene Next-Quellen mit den zugehörigen P2-17-App-Messungen:
normal/lange Beschreibungen links/rechts. Explizite QA-Kontrollauswahl:
normal `fixed-5-14`, länger `entry-rows-nosplit`. Dies ist keine automatische
Produktregel und löst die unterschiedliche Umbruchreaktion aus P2-18 nicht.

Vier Foto-Profile je Quelle (16 native Konvertierungen):

- `original-photo`: unveränderte P2-18-Kontrollkopie.
- `margin-equivalent`: Bezug `margin`, Offset minus linkem Seitenrand.
- `margin-unadjusted`: Bezug `margin`, bisheriger Offset als Gegenprobe.
- `page-compensated`: Bezug `page`, Offset minus Rand als reine LO-Kompensation.

Links ist der linke Rand 0, rechts 1134 Twips = 720090 EMU = 20,0025 mm.
Das Originalfoto liegt gemäß Seiten-Offset links bei 8 mm, rechts bei 155 mm.
Die rechnerisch gleichwertige Margin-Angabe ist rechts 134,9975 mm plus Rand.
Das ist eine Koordinatenbetrachtung der einen ersten Sektion, keine Word-Abnahme.
Die beiden anderen rechten Gegenproben verändern bewusst die deklarierte absolute
OOXML-Position; ein möglicher visueller PASS allein würde sie nicht qualifizieren.

Nur horizontales `relativeFrom`/`posOffset` am Foto werden geändert. Vertikaler
Anker, Bild-/Crop-Payload, alle anderen Grafiken und Eintragstabellen bleiben gleich.
Text und alle anderen ZIP-Teile sind unverändert. Fotoankeränderungen in der Sidebar
werden ausdrücklich ausgewiesen; keine Behauptung bytegleicher kompletter Sidebar.

Der gemeinsame Runner erhält optionale Hooks. Seine P2-18-Standardeinstellungen
wurden gegen alle zwölf gespeicherten Fälle ohne native Neukonvertierung geprüft;
sämtliche Falldatensätze identisch. Fünf neue Foto-Invariantenprüfungen bestanden.

Kein Produktcode/normaler Export verändert, keine neuen Workflows/Jobs.
Native Ergebnisse stehen noch aus.
