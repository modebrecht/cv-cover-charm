# Nächster Batch: gemeinsame CV-Textrollen und Rubrikmetriken

Basis des statischen Audits: `ae771cfece54c28891c08bfc7c69793c795afab4`. Bestehenden Branch `fix/docx-next-shared-fidelity-18okt` fortsetzen. Status: **Codepfade geprüft und Auftrag vorbereitet; Umsetzung/Runtime-Prüfung noch nicht durchgeführt**. Die Ausführungsumgebung war bei dieser Fortsetzung nicht verfügbar.

## Konkrete Befunde im Remote-Code

1. **Dokumenttitel:** `src/components/cv/CvCanvasBase.tsx` setzt bei `cv.documentTitle` Grossbuchstaben und `letterSpacing: 0.16em`. `src/lib/docx-next/build-model.ts` übernimmt für denselben Titel Grösse, Gewicht, Farbe, Kursiv/Unterstrichen und Abstand, aber keine entsprechende Grossschreibung oder Laufweite. Das ist eine nachweisbare Regelabweichung; ihre genaue sichtbare Auswirkung muss im App-/Word-Vergleich gemessen werden.
2. **Einfache Rubriken:** Web übernimmt das Standardgewicht aus `theme.headingStyle.weight` und die effektiven CSS-Regeln. Der Builder verwendet ohne eigene Vorgabe `bold: true` und einen eigenen 7-px-Abstand nach der Rubrik. Die CSS- und Vorlagenauflösung kann deshalb abweichen. Die heutige Rubrikmessung wird nur bei aktivierten Pills erzeugt und ihr Browser-Einstieg ist auf Modern begrenzt.
3. **Zeilenrhythmus:** Native Absätze beginnen allgemein bei `lineHeight: 1.2`; Web unterscheidet standardmässig Körpertext 1.23, zurückhaltende Texte 1.19 und Eintragstitel 1.13. Das Einseitenpreset setzt 1.14/1.12/1.08, das Zweiseitenpreset 1.3/1.25/1.17. Nicht jeder native Absatz wird noch durch eine tatsächliche Rollenmessung überschrieben. Ein globales Ersetzen von 1.2 wäre deshalb falsch und könnte Letter/Sidebar treffen.
4. **Messung ist bereits vorhanden, aber begrenzt:** `captureCvPersonalHeaderMetrics()` misst nur den normalen, foto-losen Sans-Kontaktkopf und iteriert die Felder des Kontaktgitters. Das ist keine Messung des ganzen CV, seines Namens oder Dokumenttitels. `InteriorTextMetrics.rubrics` verlangt derzeit eine Pill-Fläche; normale Rubriken sind dadurch noch kein allgemeiner Messverbraucher.

Diese Befunde erklären plausible Ursachen der beobachteten Unterschiede. Das Audit beweist keine vollständige Ursache der zusätzlichen nativen CV-Seite und keine Word-Abnahme.

## Gemeinsame Lösung und Grenzen

- Vorhandene Messadapter, Feldidentitäten und native Absatz-/Tabellenprimitiven wiederverwenden. Eine frische, vom Snapshot-Schlüssel abhängige Messung für effektive CV-Textrollen ergänzen; keine neue Layout-Engine und keine einzelnen Vorlagen-Patches.
- Dokumenttitel, Name/Untertitel, normale Rubriken, Titel/Datum/Ort/Beschreibung von Einträgen, Sprachzeilen und Listen ausdrücklich abdecken. Zusammengesetzte Word-Absätze behalten ihre Feldidentitäten; nicht blind einen DOM-Absatz auf mehrere native Rollen kopieren.
- Effektive Schrift, Punktgrösse, Gewicht, Grossschreibung, Laufweite, Zeilenrhythmus und Absatz-/Gruppenabstände aus derselben Web-Präsentation auflösen. Keine pauschalen 120-%-Korrekturen oder neuen Abstandsdefaults.
- Physische CSS-Werte verwenden; Vorschau-Transformationen dürfen keine Spaltenbreiten/Abstände verkleinern. Nicht die zufällige Editor-Zoomstufe messen.
- Eigene Werte und tatsächlich wirksame CSS-Overrides haben Vorrang. Messwerte gehören zum aufgelösten Snapshot, werden nicht in die gespeicherten Benutzerdaten geschrieben und müssen nach einer Änderung verworfen werden.
- Der kanonische Builder/Renderer bleibt unabhängig von DOM, Browser und PDF-Paginierung. Keine Web-Seitenzahlen oder PDF-Seitenfragmente als Ersatz für editierbaren Word-Fluss importieren.
- Den bisherigen Sans-/Layout-Gate beibehalten. Andere Fonts, verschobene persönliche Angaben, freie Elemente, Sidebar und die gesperrten Coverfamilien nicht nebenbei freigeben.
- Der 05-Kontaktfix bleibt erhalten: persönlicher Kopf ohne Rubrikeinzug, Inhaltsrubriken mit eigenem Einzug. Bewusste 05-Ränder nicht zurücksetzen.

## Kohärenter Prüfbatch

Die vorhandenen Projekte und Batch-Runner wiederverwenden. Umfang etwa acht bis zwölf Dossiers, nur so viele wie für sinnvolle Abdeckung nötig:

| Fall | Zweck |
| --- | --- |
| Modern normal / Brief normal | Dokumenttitel, Name, einfache Rubriken, Körpertext und Sprach-/Listenzeilen aus gleichen Rollen prüfen |
| 01 / 11 | Beide Familien mit echter Einseitenaktion; alle Inhalte einschliesslich Referenzen erhalten |
| 02 / 12 | Beide Familien mit echter Zweiseitenaktion und bewusster freier Fläche |
| 04 | Kontakt-Header, beide Letter- und CV-Seiten mit gemeinsamem Headerabstand |
| 05 | Eigene Ränder, 18-px-Rubriken, 6-mm-Inhaltseinzug, korrigierter Kontaktursprung und zusätzliche Referenz |
| 09 | Langer Name/Beruf, 115-%-Cover und korrigierter persönlicher Kopf |

Fälle dürfen sinnvoll zusammengelegt werden. Unveränderte Kontrollfälle nicht erneut einzeln vom Benutzer abnehmen lassen. Keine erfundenen rechten Pills, neuen Farbkombinationen oder verschobenen Fotos als normale Abnahmefälle.

## Nachweis vor Veröffentlichung von Produktcode

1. Tatsächlichen Remote-HEAD und `AGENTS.md` nach Wiederherstellung des Arbeitsraums erneut prüfen. Ausschliesslich auf dem bestehenden Arbeitsbranch arbeiten; Vercel-Sperre erhalten.
2. Fehlende/stale Messwerte, bewusste Benutzerwerte, CSS-Textrollen, Seitenpresets und Source-Immutability gezielt prüfen. Nur bei Bedarf eine vollständige Suite; keine unveränderten Untersuchungen oder CI-Läufe wiederholen.
3. Echte App-Restores und UI-DOCX-Downloads mit demselben gespeicherten Zustand wie Web/normalem App-PDF. Kein Modell-only-Demo als Ersatz.
4. Dokumenttitel-/Namens-/Rubrik- und Textabstände numerisch gegen die wirksamen Web-Werte prüfen. Semantische Feldidentitäten, Häufigkeiten, Originalbilder und unabhängige Nachbardokumente sichern.
5. Ergänzend rendern und alle unterschiedlichen Seiten visuell prüfen. Gesondert dokumentieren, wo native Umbrüche ohne Preset abweichen; keine automatische Aufblähung oder künstliches Zusammenquetschen.
6. Ein konsolidiertes Paket und eine gemeinsame Prüfliste liefern. Desktop-Word-Darstellung, Bearbeiten und Save/Reopen bleiben bis zu echten Word-Rückgaben offen.

Kein Merge, Deployment, produktiver Exportwechsel, Native-Sidebar-/Agent-A-Experiment oder Freigabe anderer Schrift-/Coverfamilien. Diese Fortsetzung ändert ausschliesslich die Dokumentation; die letzten Code-Tests stammen vom vorigen Checkpoint.
