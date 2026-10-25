# Kontaktköpfe und mehrseitiger Sidebar-Textfluss

24. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`, Basis `faacd28a09d0651eb1b4166fa1253a993fb37928`.

Der zuvor hängende Kontakt-Langfall ist als Interoperabilitätsproblem eingegrenzt und im gemeinsamen Header-Aufbau korrigiert. Native Kopf-Textframes erhielten bisher standardmässig Textumfluss. Allein das Ausschalten dieses Umflusses im Folgeseitenkopf beendet den reproduzierten Writer-Hänger. Kontakttext, natürliche Pagination, Tabellen-Zusammenhalte-Regeln, Feld-Controls, Fotodaten und Koordinaten bleiben erhalten. Die acht frischen App-Fälle rendern jetzt vollständig. Daraus folgt weiterhin keine Microsoft-Word- oder Save/Reopen-Abnahme.

## Reproduktion und Gegenproben

Die beiden Langfälle wurden erneut über den echten App-Import gespeicherter synthetischer Projekte und frische Erfassung erzeugt. Beide DOCX sind bytegleich zu den im [vorherigen Checkpoint](docx-next-sidebar-contact-chrome-23okt.md) dokumentierten Eingaben. Beide normalen App-PDF-Downloads bestehen. Damit wird derselbe Fehler untersucht, kein neu erfundener Testzustand.

Alle folgenden Änderungen sind ausschliesslich isolierte Diagnose-DOCX. Gelöschte Kopftexte oder aufgehobene Zeilenbindungen sind keine Produktlösung.

| Variante des bisherigen rechten Langfalls | Ergebnis im begrenzten Writer-Lauf |
| --- | --- |
| Unverändertes DOCX, voller Kopf auf beiden CV-Seiten | Nach 60 s ohne PDF beendet |
| Derselbe Inhalt, reduzierter Folgeseitenkopf | Vollständig in 4,78 s |
| Nur alle sechs CV-Kopf-Textframes entfernt | Vollständig in 4,33 s |
| Nur 16 verschachtelte `cantSplit`-Markierungen entfernt | Nach 35 s ohne PDF beendet |
| Nur die drei Folgeseiten-Kopf-Textframes entfernt | Vollständig in 4,13 s |
| Alle sechs CV-Kopf-Frames: `wrap="around"` → `wrap="none"` | Vollständig in 4,08 s |
| Nur drei Umfluss-Attribute im CV-Folgeseitenkopf geändert | Vollständig in 4,43 s |

Der kleinste erfolgreiche Gegenversuch ändert somit drei Attribute eines bestehenden Header-Parts. Er enthält dieselben Texte, aktiven Controls, Absatzbesitzer, Bilder und Crops wie die hängende Datei. Die durchgehende Sidebar-Tabelle bleibt splittbar und besitzt keine feste Zeilenhöhe. Ein künstlicher Seitenumbruch wird nicht entfernt oder hinzugefügt. Das pauschale Entfernen der kurzen Eintragsbindungen behebt den Hänger nicht.

**Bestätigt** ist die auslösende Umfluss-Konstellation im getesteten Writer-Import. **Nicht bestätigt** sind ein bestimmter interner LibreOffice-Fehler, dieselbe Auswirkung in Microsoft Word oder eine Änderung der Control-Besitzer beim Speichern. `around` ist ein gültiger OOXML-Wert; die Datei ist deshalb nicht allein aufgrund dieses Attributs ungültig.

## Gemeinsame Korrektur

`composeMeasuredHeaders` setzt für seine vorhandenen nativen Absatzframes ausdrücklich `wrapMode: "none"`. Kopftext gehört zur Header-Story; er soll keine Umfluss-Ausschlussflächen im kontinuierlichen Haupttext erzeugen. Dieselbe Regel gilt für CV und Anschreiben sowie für Erst- und Folgeseitenkopf. Der gemeinsame Absatzrenderer und seine allgemeinen Frame-Vorgaben bleiben unverändert.

Die Korrektur enthält keine Template-ID-Abzweigung, keinen LibreOffice-Test, keine Offset-Kompensation und keine Schrift- oder Abstandsänderung. Sie verwendet eine bereits vorhandene Modell-/Renderer-Option. Microsoft dokumentiert die beiden regulären Frame-Umflusswerte in [TextWrappingValues](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.textwrappingvalues?view=openxml-3.0.1). Die Wirkung von `cantSplit` ist separat in der [OOXML-Referenz](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.cantsplit?view=openxml-3.0.1) beschrieben; die Eintragsbindungen bleiben erhalten.

Für die beiden Langfälle bestätigt ein Paketvergleich: Nur vier XML-Header-Parts ändern sich, ausschliesslich durch `w:wrap="around"` → `w:wrap="none"`. `word/document.xml`, alle Tabellen, Seitenränder, Bilddateien, Bildbeziehungen, Crops, Schriften und übrigen Paketdaten sind bytegleich. Die vollständigen Control-Inventare mit Text, Story, Verschachtelung und Bildbesitz sind ebenfalls gleich. Die zwei kompakten Fälle ohne Kontaktframes behalten sogar das komplette frühere DOCX bytegleich.

## Prüfung nach der Korrektur

| Prüfung | Ergebnis |
| --- | --- |
| Kompakt, Kontakt inline, Kontakt gestapelt, jeweils links und rechts | 6 echte App-Importe, normale PDFs und interne DOCX erfolgreich |
| Rechter Langfall, voller und reduzierter Folgekopf | Beide vollständig; je 2 CV-Seiten in App-PDF und Writer |
| Frische Writer-Render | 8/8 Dossiers, 26 Seiten; voller Langfall 4,13 s |
| Seitenweise Kopfprüfung | Erwartete Kontaktfelder innerhalb des jeweiligen Kopfbereichs vorhanden, einschliesslich beider Folgeseitenvarianten |
| Sichtbarer Control-Text | In allen 8 gerenderten Dossiers vollständig in der normalisierten Textextraktion enthalten |
| Bildbesitz und Pixel | Je ein typisiertes `cv.person.photo`; vollständige synthetische Pixel und normalisierte PNG-Dateihashes erhalten |
| Gespeicherte Eingaben und Produktsperre | Unverändert; normaler Sidebar-Produkteinstieg bleibt geschlossen |
| DOCX-Suite | 528 Tests, 75 Dateien, 9234 Erwartungen, 0 Fehler |
| Fokussiertes striktes TypeScript und Formatprüfung | Bestanden |

Alle 26 gerenderten Seiten wurden über 13 nach Pixelhash verschiedene Seitenbilder visuell geprüft. Zusätzlich wurden die beiden Folgeseitenköpfe direkt aus dem PDF als oberer Seitenausschnitt geöffnet. Die zwischenzeitliche Vermutung einer fehlenden Kopfzeile war ein Fehlbefund der Bildansicht, kein weiterer Dokumentfehler. Die neue automatische Prüfung kontrolliert deshalb die erwarteten Kontaktfelder und die vorhandene Kopffläche auf jeder CV-Seite, nicht nur im Gesamttext des Dossiers. Der Farbabgleich protokolliert eine PDF-Rasterabweichung von einem Blaukanalwert; er behauptet keine exakte Farbfidelity.

Ein erster Suite-Lauf hatte einen Fehler in einer bestehenden Fehlermeldungs-Erwartung: Der vorherige Checkpoint formulierte die Fusszeilen-Sperrmeldung um, während der Test noch den alten Wortlaut erwartete. Der Test erwartet nun die aktuelle Bedingung eines leeren kompakten Fusses. Eigener Fusszeilentext wird weiterhin abgewiesen. Der anschliessende vollständige Lauf besteht; kein Export-Gate wurde gelockert.

Laufzeitgrenzen: Chrome for Testing 156, temporäre CSR-Prüfhülle mit echten App-Komponenten und gespeicherten Projekten; LibreOfficeDev 26.8 alpha0 mit Liberation Sans als Arial-Ersatz. Kein neuer Produktions-SSR-Build. Die Diagnosevarianten und frischen DOCX/PDF werden nicht als Benutzer-Abnahmepaket ausgeliefert. Es wurden ausschliesslich die bereits geprüften synthetischen Bildquellen verwendet.

## Verbleibende Grenzen und nächster Schritt

Die wiederholten kanonischen Kontaktkennungen in Erst- und Folgekopf sowie `cv.person.name` im Haupttext bleiben unverändert. Dieser Fix fügt keine neuen Feldinstanzen, Bindungen oder Importsynchronisierung hinzu. Der Erhalt der Quellbilder und Crops ist im frisch erzeugten Paket bestätigt, ihre Bearbeitbarkeit und ihr Erhalt nach Word Save/Reopen bleiben offen. Die frühere 02/12-Word-Abnahme wird nicht auf diese Bytes übertragen.

Der konkrete Writer-Importblocker ist geschlossen. Als Nächstes bleiben die getrennte Prüfung von Control-Instanzen und kanonischer Quellbindung sowie die Originalbild-/Crop-Bearbeitung nach Save/Reopen. Dafür wird jetzt keine zusätzliche Benutzer-Testrunde angefordert. Das zurückgezogene alte Paket bleibt zurückgezogen. Die vollständige Sidebar-Produktfreigabe bleibt **NO-GO**, bis die entsprechenden Word-Gates belegt sind; es erfolgen kein Merge und keine Produktionsumschaltung.

Reproduzierbarer Diagnose-/Evidenzleser: `scripts/qa-sidebar-contact-flow-24okt.py`. [Dateihashes, Gegenproben und frische Einzelwerte](docx-next-sidebar-contact-flow-24okt-evidence.json). Die Renderzeit ist begrenzt; ein Timeout wird als solcher gespeichert und nicht als bestandene Prüfung gezählt. Kein Engine-Patch, kein CI-Dispatch und kein historischer 22-Fälle-Lauf.
