# Gemeinsame Standards und offene DOCX Abnahme

Arbeitsauftrag am 18. Oktober erweitert und bestätigt: neuer Branch `fix/docx-next-shared-fidelity-18okt`, ab jetzt gemeinsame Lösungen für CV und Anschreiben. Die Liste ist die Grundlage für die weitere Arbeit. Technischer Arbeitsvertrag und Prüfgates: [gemeinsame Design-Fidelity](docx-next-shared-fidelity-18okt.md).

Die vorherige Begrenzung auf Modern folgte dem bisherigen Auftrag: erst eine repräsentative Vorlage in Word beweisen, danach 3–5 unterschiedliche Vorlagen und schliesslich alle 39. Der neue Auftrag erweitert die gemeinsame Standardregel auf CV und Anschreiben. Die Werte dürfen dabei nicht ungeprüft auf verschiedene Textrollen und Seitenzonen übertragen werden.

Übernommener veröffentlichter Untersuchungsstand: `719e6da6c1c6117ea111129d5af65b56ed47ae87` von `investigate/docx-next-design-fidelity-16okt`; enthält den erneut geprüften Remote-dev `8901a830a792d75e9e792345c5180827218b4e1e`. Die Modern-Defaults und der Footer-Kandidat 06 sind weiterhin separat als lokale, uncommittete Vorarbeit vorhanden. Die Branch-Eröffnung veröffentlicht nur diesen Arbeitsplan und den Deployment-Ausschluss, keine neue Modern-Sonderkorrektur. Der Produktionsstand ist unverändert.

## Gemeinsame Regeln vor der Ausweitung

| Bereich | Arbeitsvorschlag | Noch zu prüfen |
| --- | --- | --- |
| CV-Rubriktitel | 14 px als gemeinsame Ausgangsgrösse | Hierarchie, unterschiedliche Schriften, Umbruch und Pills in allen Layouts; eigene Werte bleiben erhalten |
| Oberer Rand ab Seite 2 | 20 mm als gemeinsame Ausgangsbasis für CV und Anschreiben | Headerhöhe und sichtbarer Mindestabstand müssen berücksichtigt werden; ein 26-/32-mm-Header passt nicht unter einen pauschalen 20-mm-Inhaltsanfang |
| Erste Seite | Eigene Regeln für CV-Kopf und Anschreiben mit Empfänger/Datum/Betreff | Der Folgeseitenwert darf diese Bereiche nicht nach oben ziehen oder zusätzlich doppelt Abstand erzeugen |
| Anschreiben-Fliesstext | Bestehende 10,5 pt (= 14 px) zunächst beibehalten | Das ist eine andere Rolle als CV-Rubriken; Header, Betreff und Fliesstext nicht gemeinsam skalieren |
| Einheiten und Vorrang | Web px, Word pt und physische mm ausdrücklich auflösen; gespeicherte Werte vor Defaults | Ein vorhandener Wert ist keine fehlende Einstellung; Reset, alte Projektformate und Font-/Farbvererbung müssen dieselbe Regel verwenden |
| Ausgabepfade | Dieselben aufgelösten Vorgaben für Editor, PDF/Print und DOCX | Kanonisches Modell bleibt vom Browser/PDF-Renderer getrennt; keine neue Export-Engine als Standard aktivieren |

## Offene Liste in Ausführungsreihenfolge

| Priorität | Punkt | Aktueller Nachweis und fehlender Abschluss |
| --- | --- | --- |
| P1 | Gemeinsame Standardregel | Lokal nur Modern/classic umgesetzt. Globale CV-/Anschreiben-Regeln samt rollenbezogenen Grössen und Folgeseitenabständen sind noch zu entwerfen und umzusetzen |
| P1 | Randloser Header/Footer | Echter schmaler Spalt im gelieferten Word-PDF bestätigt. Kandidat 06 verändert nur dekorative Zeichnungsausdehnungen; Word-Darstellung und Save/Reopen dieses Kandidaten fehlen |
| P1 | Kontakt-Header waagrecht/untereinander | Begrenzte gemessene Umsetzung vorhanden. Endgültige Word-Abnahme der aktuellen Farb-/Sync-/Symbolkorrekturen sowie Fortsetzungsheader und schmalere Kontaktzeilen nicht vollständig nachgewiesen |
| P1 | CV-Pills allgemein | Normaler Modern-Fall in Word sichtbar verbessert/bestätigt. Andere Vorlagen, manuell verschobene Rubriken, schmalere Spalten, lange/mehrzeilige Titel und Seitenumbrüche brauchen eigene Abnahme |
| P1 | Allgemeine Web-/Word-CV-Geometrie | Der bekannte Testzustand belegt eine Web-CV-Seite gegenüber zwei nativen CV-Seiten. Inhalt ist vorhanden; vollständige Layout-/Paginierungsparität ist damit nicht erreicht |
| P1 | Cover der übrigen Vorlagen | Verlauf, Neon und Warm/Freundlich wurden mit echten Abweichungen auditiert; ihre Korrekturen sind nicht abgeschlossen. Modern/Brief liefern keine Freigabe für diese Vorlagen |
| P1 | Schriften und Typografie | Unterstützter Sans-Pfad begrenzt geprüft. Andere Vorlagenschriften, Laufweiten, Gewichte, Grössen und Windows-Schriftersetzungen brauchen Prüfung; keine stillen Font-Fallbacks |
| P1 | Farben, Formen und Bilder | Verläufe/Transparenzen, nichtquadratische Rundformen, Platzhalterinitialen, Bildpositionen und Crop-Einstellungen über die repräsentativen Vorlagen prüfen |
| P2 | Pill und Text gemeinsam bearbeiten | Der gruppierte Cover-Pill-Versuch scheiterte in Word und bleibt gesperrt. Separate Dekoration passt sich beliebigen Word-Textänderungen nicht automatisch an; Gruppierung/Resize ist nicht abgeschlossen |
| P1 | Gespeicherte Projekte | Neue und alte Projekte, eigene Werte, Reset auf Standard, Wiederherstellung und Export über alle betroffenen Dokumenttypen prüfen. Zwei aktuelle Modern-Fälle beweisen keine globale Migration |
| P1 | Word-Bearbeitung und Save/Reopen | Für jede freizugebende Layoutfamilie native Texte, Kontrollen, Originalbilder/Crops, Anker und Seitenzahl nach Bearbeiten/Speichern/Schliessen/Öffnen vergleichen |
| P1 | Belastung und Vollmatrix | Normale/lange Namen und Titel, 115 %, ausgeblendete Elemente, Fotos, Verschiebungen und mehrere Seiten; zuerst 3–5 unterschiedliche Vorlagen, nach deren Nachweis alle 39 |
| Separater Blocker | Native Sidebar / #14 / #25 / #38 | Bestehende Freeze-/Branch-Grenzen bleiben bestehen. Der Auftrag zur allgemeinen Standardregel hebt den Native-Sidebar-NO-GO und die Engine-Sperre nicht automatisch auf |
| Abschluss | Integration und Veröffentlichung | Weiterhin kontrollierte QA-Einstiege. Merge, Deployment und produktiver Standardexport sind nicht freigegeben |

## Was bereits als begrenzter Fortschritt gilt

- Brief-Cover: vom Nutzer positiv in Word geprüft; begrenzte App-Integration vorhanden.
- Modern-CV-Pills: sieben Labels im zurückgegebenen Word-PDF innerhalb ihrer Hintergründe; der frühere fehlerhafte Versuch bleibt zurückgezogen.
- Native Bearbeitung: Kandidat 04 behielt die 82 Kontrollen und Originalbilddaten; eine Änderung am Dokumenttitel ist nachweisbar gespeichert.
- Modern 20 mm / 14 px: vom Nutzer optisch bestätigt; lokale Default-Umsetzung und gespeicherte 12 mm / 18 px als Gegenprobe erfolgreich.
- Aktueller lokaler Stand: 1222 Unit- und 409 DOCX-Tests, Typecheck, Lint ohne Fehler und Build bestanden. Das ist keine Word- oder All-39-Freigabe.

## Nächste Arbeitsfolge

1. Bestehende Fallbacks und Benutzerregler für CV und Anschreiben vollständig inventarisieren; eine gemeinsame Auflösung mit dokumentierten Ausnahmen für Textrollen und Headergrössen festlegen.
2. Defaults dort zentralisieren und fehlende Werte auflösen; explizite gespeicherte Einstellungen erhalten. Keine 39 unabhängigen Sonderkorrekturen.
3. Zuerst fünf unterschiedliche Vorlagen als Prüfkohorte: Brief, Modern, Warm/Freundlich, Verlauf und Neon. Jeweils CV und Anschreiben, erste/Folgeseite, relevante Header und Rubriken prüfen. Ungeeignete Mechanismen bei einem Fehler stoppen und diagnostizieren.
4. Footer-Kandidat und weitere Kandidaten in Word abnehmen, einschliesslich Bearbeitung und Save/Reopen. Web/PDF/DOCX müssen aus demselben gespeicherten Zustand stammen.
5. Erst nach diesen Nachweisen die übrigen Vorlagen und die vollständige Belastungsmatrix bearbeiten. Native Sidebar bleibt ein gesonderter Freigabeblocker.

Historische Befunde: [37D Kohorten-Audit](docx-next-design-fidelity-16okt.md), [Kontaktfarben und Synchronisation](docx-next-modern-contact-colors-18okt.md), [CV-Pill-Rückgabe](docx-next-modern-rubric-word-return-18okt.md), [20-mm/14-px-Vergleich](docx-next-modern-cv-spacing-settings-18okt.md), [lokaler Footer-/Default-Kandidat](docx-next-modern-defaults-footer-18okt.md). Spätere Rückgaben in den Folgeberichten haben Vorrang vor älteren UNVERIFIED-Aussagen; keine pauschale Freigabe aus historischen Einzeltests ableiten.
