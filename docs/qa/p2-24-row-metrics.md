# P2-24 — leere Fusszeile und nutzbare Seitenfläche

Ausgangspunkt: P2-23 `840f6be1eac99a6e5057ba71948a7568c57a389c`.
Separater Branch `work/02nov-p2-24-row-metrics`; keine Produktänderung.

## Fragestellung und begrenzter Test

P2-23 erhält alle 18 Einträge, lässt aber bei normaler Textlänge 06/15 eine Seite zu spät beginnen. Folgende Titel liegen dadurch bis 26.379 mm zu tief. Bei längeren Texten besteht diese Abweichung nicht.

Die vier eingefrorenen echten Next-Exporte (normal/variabel, Sidebar links/rechts) bleiben unverändert. Basis jeder Diagnosekopie ist `body-flow-nosplit-front`. Die Quell-DOCX haben A4, 2948 Twips oberen Rand, 283 Twips unteren Rand (~5 mm) und 680 Twips Fusszeilenabstand (~12 mm). Beide referenzierten Fusszeilen bestehen nur aus einem leeren Absatz; das wird vor jedem Eingriff geprüft.

| Profil | Einziger neuer Eingriff gegenüber P2-23-Kontrolle |
|---|---|
| prior-control | keiner; identischer DOCX-Hash und native Seitenpixel erforderlich |
| footer-distance-zero | `pgMar.footer`: 680 → 0 |
| footer-references-off | zwei leere Fusszeilenverweise aus `sectPr` entfernen; ZIP-Teile und Beziehungen bleiben erhalten |
| bottom-margin-zero | `pgMar.bottom`: 283 → 0 als Gegenprobe |

Geplant: genau 16 native LibreOffice-Konvertierungen im bestehenden Kompatibilitätsjob. Kein neuer Workflow/Job, keine neue ONLYOFFICE-Installation. Anschliessende Audits verwenden gespeicherte PDFs und starten keine Konvertierung.

Die unveränderten Gates prüfen 18 vollständige Einträge, identische App-Seitenbelegung, keine geteilten Einträge, Titel innerhalb 2 mm, Foto innerhalb 2 mm mit Musterkorrelation ≥0.90, Referenzüberschrift/-inhalt auf derselben Seite, Referenzlinie und alle vier Hauptlinien mit dunklem Linienlauf ≥0.85. Kopfbereich 0–45 mm und unterer Streifen ab 292 mm müssen seitenweise zur Kontrolle identisch sein.

Gemessen werden ausdrücklich **sichtbare Text-Bounding-Boxes**, keine effektiven Writer-Zeilenboxen. Titeloberkante und letzte Beschreibungszeile `Arbeitsschritte` werden pro Eintrag gespeichert; OOXML-Zeilen-/Absatzregeln werden separat protokolliert. Eine tatsächlich durch Writer reservierte Fusszeilenhöhe wird nicht aus Textpixeln behauptet.

19 kritische Tabellen sind gegenüber der P2-23-Kontrolle identisch. Gegenüber dem ursprünglichen Export bleiben die bereits dokumentierten P2-23-Änderungen bestehen: fehlende `cantSplit`-Guards (1 normal/7 variabel), entkoppelte Sidebar, aufgelöste Haupttabelle und vier Vordergrundflags. Nicht-Dokument-ZIP-Teile, 107 SDTs, Texte und Bilder werden geprüft.

## Ergebnis

Native Ausführung und abschliessende Bewertung stehen beim Implementierungscommit noch aus. Execution PASS ist keine Produktfreigabe. Originalexport, 39-Next-Abnahme und Word-Abnahme bleiben davon getrennt.
