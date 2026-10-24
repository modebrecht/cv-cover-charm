# Sidebar: Quellstruktur, Bildbesitzer und hochauflösender Kontrollfall

24. Oktober 2026. Arbeitsbranch `fix/docx-next-shared-integration-22okt`, Start `b1b10e350194286d3d146d021a6269bbea020b63`. Produktcode unverändert auf dem Stand von `9e7579c`. Diese Fortsetzung ergänzt den [Architektur-Audit](docx-next-sidebar-root-cause-audit-24okt.md), sie ersetzt keine Microsoft-Word-Abnahme.

## Ergebnis

**Es wurde kein neuer Fehler im geprüften Quell-XML der aktuellen Sidebar gefunden. Die Writer-Bildverluste sind auch mit einem grossen Original reproduziert.** Vier aktuelle Quell-DOCX bestehen zusammen 68 Word-XML-Prüfungen im ausdrücklich beschriebenen Schemaumfang. Sechs gezielt beschädigte Strukturen werden abgewiesen. Ein formal gültiges Quellpaket kann trotzdem anders dargestellt oder beim Speichern umgeschrieben werden; daraus folgt keine Word- oder Produktfreigabe.

Ein tatsächlicher Fehler lag im Abnahmeleser: Seine Bildprüfung konnte ein Original aus einem unreferenzierten Kopf-Part dem verlorenen Haupttextbesitzer zurechnen. Die Control-Instanzprüfung erkannte denselben Verlust bereits korrekt. Diese widersprüchlichen Aussagen sind behoben. **51 adversariale Tests bestehen**, einschliesslich 13 zusätzlicher Gegenproben für Bildrollen, Bildbeziehungen und ungültige Story-Referenzen. Die echten Writer-Dateien werden dadurch weiterhin nicht grün.

## Quellstruktur unabhängig von Writer prüfen

Der bisherige Runtime- und Rendering-Befund wird nicht als Beweis für formal richtige OOXML-Struktur verwendet. Die unveränderten Quellpakete werden separat mit lxml/libxml gegen gepinnte ECMA-376-Transitional-XSDs und einen begrenzten Office-2010-WPS-Prüfsatz validiert.

| Quelle | Word-XML-Parts | Ergebnis im Prüfsatz | Quell-DOCX SHA-256 |
| --- | --- | --- | --- |
| Rechter Kontakt-Langfall, automatisches Bild | 17 | Alle bestanden | `53d08cff0ecd37c261a70e82f8409fec6f58fd7f61964738504a73ff558875d3` |
| Rechter freier Bildfall | 17 | Alle bestanden | `90ca1d6752a7ded3fbfae1de0d71192b9ca5bbb89e34e1d02a647813584bb70c` |
| Neuer linker Kontakt-Langfall | 17 | Alle bestanden | `3a019acf98ef9168084615d3e6ab33759efb0693dfdea573df924c5a3fe6acd0` |
| Derselbe linke Langfall mit grossem Bild | 17 | Alle bestanden | `5e469d60181f8405fffcb43a57f92377fc6b0daa414d71ac22cd33ed3a6a25e0` |

Der Prüfsatz umfasst Haupttext, alle Kopf-/Fuss-Parts sowie Styles, Settings, FontTable und Numbering. Er kontrolliert unter anderem gültige Picture-Kinderfolgen, Drawing-Identitäten, Crop-Werte, Run-/Block-Controls sowie den verwendeten WPS-Textbox-Aufbau. Zusätzlich wird die Microsoft-Regel geprüft, nach der eine WPS-Shape direkt unter `graphicData` keine eigene `wps:cNvPr` trägt.

Die sechs negativen Kontrollen beschädigen genau diese Strukturen: vertauschte Picture-Kinder, fehlende Drawing-ID, nichtnumerischer Crop, Blockabsatz in einem Inline-Picture-Control, fehlende WPS-Body-Properties und ungültiger Ankerursprung. Alle werden abgewiesen. Das ist eine Gegenprobe gegen einen wirkungslosen Prüfsatz, kein Office-Lauf.

**Grenzen:** Die externen XSDs stammen aus einer bytegenau per Git-Blob gepinnten Kopie des ECMA-Schemas; Herkunft und jeder Dateihash stehen im Nachweis. Die WPS-Untermenge folgt den ebenfalls gepinnten Microsoft-SDK-Metadaten für `wsp`, `txbx` und `linkedTxbx`. Legacy-`wne` wird nicht unterstützt. Es gibt keine vollständige Open-XML-SDK-Semantikprüfung, keine Zertifizierung aller Markup-Compatibility-/Fallback-Regeln und keine Prüfung sämtlicher OPC-/Core-Properties durch diesen Word-XML-Lauf. Das ist ausdrücklich kein pauschales «DOCX standardskonform».

Der freie Bildpfad bleibt von der Office-2010-WPS-Erweiterung abhängig. Ein zusätzliches Verhalten für ältere Clients ist durch die Prüfung nicht freigegeben. Diese Versionskopplung ist ein Architekturargument für einen einfacheren Greenfield-Aufbau, aber kein Nachweis, dass aktuelles Microsoft Word das Bild beschädigt.

Primärreferenzen: [ECMA-376](https://ecma-international.org/publications-and-standards/standards/ecma-376/), [Microsoft WPS-Schema](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-odrawxml/f73ea06d-4749-4611-b20b-755df087eb21), [WPS-Shape-Regeln](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-odrawxml/69190647-27d1-4890-8089-a8aca57becb9). Der Prüfer behauptet nicht, die Microsoft-Schema-Website als vollständigen lokalen SDK-Validator auszuführen.

## Bildbesitz im Leser korrigiert

Die Bildzuordnung folgt jetzt der konkret über kanonischen Tag und Abschnitts-/Story-Rolle gefundenen Control-Instanz. Lokale Vorkommensadressen sind nur Referenzen auf diese bereits zugeordnete Instanz. Es gibt keine Paarung nach ähnlichen Bildpixeln, gleichem Text oder Reihenfolge zwischen Dateien.

- Ein verwaister Kopf kann weder den verlorenen Haupttextbesitzer noch ein aktives Original retten.
- Ein Original in einem anderen referenzierten Kopf belegt aktive Bilddaten irgendwo im Dokument, aber keinen Erhalt im ursprünglichen Haupttextbesitzer.
- Ein leerer typisierter Besitzer darf nicht das Original aus einem anderen Part borgen.
- Eine verwaiste Zusatzkopie macht einen gesunden Haupttextbesitzer nicht fälschlich mehrdeutig.
- Gleiche Foto-Tags in verschiedenen referenzierten Stories werden getrennt geprüft; Pixel aus dem Haupttext retten keinen beschädigten Kopf-Bildbesitzer.
- Ein PNG hinter einer Nicht-Bild-Beziehung wird nicht als aktives Bild gewertet. Externe und fehlende Bildbeziehungen bleiben eigene Befunde.

Die bestehende negative Prüfung neuer gleichnamiger Controls in derselben Rolle bleibt erhalten. Ungültige Relationship-Namespaces, fehlende Relationship-IDs und fehlende oder unbekannte Kopf-/Fussrollen werden abgewiesen. Die ursprünglichen Pixel in einem unbenutzten Asset bleiben weiterhin separat sichtbar. Details: [Leservertrag](docx-next-word-control-reader-24okt.md).

## Neuer Spiegelungsfall und Bildauflösung

Der vorhandene App-Runner kann nun auch den linken Kontakt-Langfall auswählen. Der Import läuft durch Titelblatt-, Anschreiben- und CV-Editor, erzeugt frische Messungen und lädt das normale App-PDF herunter. Der interne Sidebar-DOCX-Kandidat bleibt vom normalen gesperrten Produkteinstieg getrennt. Beide neuen App-Importe erhalten den gespeicherten Zustand, erfassen keine JavaScript-Fehler und bestehen die normale PDF-Vorprüfung.

Der linke Langfall hat zwei CV-Seiten, zusammen vier Dossierseiten. Beide CV-Seiten behalten den vollen Kontaktkopf und rund 19,99 mm sichtbare Headerfreiheit. Damit ist nun auch diese zuvor fehlende Kombination aus linker Sidebar, langem Text und Folgeseitenkopf intern geprüft. Es gibt keinen neuen Offset und keinen Eingriff in die natürliche Pagination.

Die zweite Eingabe ersetzt ausschliesslich das kleine automatische synthetische Bild durch das bereits geprüfte grosse synthetische Bild. Der direkte ZIP-Part-Vergleich findet **nur `word/media/image-1.png` verändert**. Haupttext, Styles, Tabellen, Kopf-/Fuss-Parts, Anker, Crops und alle übrigen Paketdateien sind bytegleich. Das ist ein Bildgrössen-Kontrollfall, keine zusätzliche Layoutvariante.

| Hochauflösender automatischer Bildfall | Quelle | Nach einem tatsächlichen Writer-Save/Reopen |
| --- | --- | --- |
| Bilddaten | 1920 × 2880, vollständiges Original | 1920 × 2400, Original ausserhalb des Ausschnitts entfernt |
| Assetinhalt | Ganzes diagonales Prüfmuster | Pixelgenau der Quellausschnitt `(0, 240, 1920, 2640)`; insgesamt 480 Zeilen fehlen |
| Repräsentation | Native DrawingML-Picture mit `srcRect` | DrawingML-Shape-Fill ohne ursprüngliches `srcRect`; `fillRect` oben/unten 264541 |
| Sichtbares Ergebnis | Diagonales Muster | Senkrechte Farbstreifen |
| Control-Vorkommen | 145 | 49; Anzahl ist kein Zähler ausschliesslich editierbarer Benutzerfelder |
| Sichtbarer Quelltext | Vollständig | Alle nichtleeren Control-Quelltexte in normalisierter PDF-Extraktion vorhanden |
| Dossierseiten | 4 | 4 |

Der Bildverlust und die falsche sichtbare Füllung beschränken sich somit nicht auf das kleine 120-×-180-Testbild. Der aktuelle Fall wurde **einmal** gespeichert; ein zweiter Save wird dafür nicht behauptet. Die unterschiedliche Control-Anzahl gegenüber dem alten rechten Fall ist eine Beobachtung an unterschiedlichen Sidebar-Seiten, keine behauptete Folge der Bildauflösung oder abgeschlossene Importer-Ursache.

Laufzeit: unverändertes LibreOfficeDev `26.8.0.0.alpha0`, Build `2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`, Liberation Sans als Arial-Ersatz. Alle neuen drei Phasen wurden gerendert: 12 Dossierseiten, sechs nach Pixelhash unterschiedliche Seitenbilder. Alle sechs wurden geöffnet; der erste CV-Kopf zusätzlich direkt als PDF-Ausschnitt. Die neue Bildverzerrung bleibt ein dokumentierter Fehler, kein visueller PASS. Kopf-/Fusszonen und Textüberleben sind getrennte Prüfaussagen.

Die zwei früheren echten Save1-/Save2-Fälle wurden mit dem korrigierten Leser erneut ausgewertet. Ihre ursprünglichen Dateihashes, Control-Zahlen, Textüberlebenswerte und negativen Bildurteile bleiben gleich. Der vorhandene ältere Word-Kontrollfall behält seinen begrenzten 126/126-Control-Beleg ohne Sidebar-Foto.

## Reproduzierbarkeit und Entscheidung

`scripts/qa-sidebar-source-schema-24okt.py` liest die Quellpakete und die extern bereitgestellten gepinnten XSDs. `tests/fixtures/docx-next/source-schema-pins-24okt.json` nennt die Herkunft und Blob-IDs; die kleine WPS-Untermenge liegt daneben. Der Prüfer lädt nichts herunter und verändert keine DOCX. Beispiel mit bereits vorhandenen externen Schemas:

```sh
python scripts/qa-sidebar-source-schema-24okt.py automatic.docx free.docx source-report.json --schemas /path/to/pinned/schemas --additional-source left.docx
python scripts/docx-next-word-acceptance-test.py
python scripts/docx-next-word-acceptance-23okt.py source.docx saved.docx ownership-report.json
```

Für den bestehenden App-Runner wählen `DOCX_NEXT_CHROME_CASE=left-contact-long` und optional `DOCX_NEXT_CHROME_PHOTO=high-resolution` die zwei neuen Eingaben. Er verwendet weiterhin ausschliesslich die vorhandenen synthetischen Repository-Bildquellen und benötigt die echte App-Prüfhülle. Ein Produktions-SSR-Build wird nicht behauptet. Die frühere Produkt-Suite wurde ohne Produktänderung nicht erneut ausgeführt; ihr letzter 528er-Checkpoint bleibt historisch.

**Entscheidung unverändert: NO-GO für die Sidebar-Produktfreigabe.** Der Quellenbefund stützt die begrenzte Weiterarbeit an A statt eines pauschalen Rewrite wegen vermuteter XML-Ungültigkeit. Writer verliert die bearbeitbare Bildreserve auch mit grossem Original. Ob die aktuellen Sidebar-Bilder und Controls denselben Schaden in Microsoft Word erleiden, bleibt die kleine entscheidende offene Frage. Es wird kein Word-PASS aus Schema-, App- oder Writer-Ergebnissen abgeleitet.

## Konkrete Word-Eingabe

`CV-Cover-Charm-Word-Entscheidung-24okt.zip` enthält genau **eine** aktuelle DOCX-Eingabe mit zwei CV-Seiten, die passende unveränderte App-PDF, das vollständige synthetische Originalmuster und eine kurze Anleitung. Prüfbereich sind die Dossierseiten 3 und 4. Die DOCX ist bytegleich zur oben gepinnten hochauflösenden Quelle `5e469d60…`; weder neue Titelblattvarianten noch private Projektbilder werden dafür übernommen.

Das Paket grenzt die erste Word-Frage auf das automatische Foto und die aktuellen Controls ein. Seine Anleitung trennt unangetastete Save1-/Save2-Dateien von einer ausdrücklich bearbeiteten Kopie. Die freie WPS-Komposition und weitere Spiegelungsfälle bleiben zusätzliche offene Gates. Dieses enge Entscheidungspaket ersetzt keine vollständige Sidebar-Freigabe und verwendet das zurückgezogene Paket vom 22. Oktober nicht wieder.

Paket-SHA-256: `4171ce50d3ae8eb72871ceefce23e6f365f80637a1514b7b354108f4374a4581`. Das ZIP und seine Dokumente werden ausserhalb von Git bereitgestellt; der maschinenlesbare Nachweis enthält nur ihre Identitäten und Prüfsummen.

Produktcode, Produktionsschalter und bisherige Geometrie-Gates bleiben unverändert. Keine privaten Fotos oder Word-Rückgaben werden veröffentlicht. Kein Zwischen-Testauftrag, Merge, Deployment, Engine-Patch oder CI-Dispatch.

[Maschinenlesbare Evidenz](docx-next-sidebar-source-structure-24okt-evidence.json).
