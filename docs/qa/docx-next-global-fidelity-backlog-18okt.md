# Gemeinsame Standards und offene DOCX-Abnahme

Verbindlicher Stand vom 20. Oktober, nach `ae771cfece54c28891c08bfc7c69793c795afab4`. Arbeitsbranch: `fix/docx-next-shared-fidelity-18okt`.

Diese Liste ersetzt die früheren überholten Arbeitsvorschläge innerhalb dieses Backlogs. Die verlinkten Einzelberichte bleiben historische Nachweise; spätere Rückmeldungen haben Vorrang. Keine pauschale Freigabe aus einem einzelnen positiven Dossier.

## Umgesetzt: kein erneuter Entwicklungsauftrag

| Bereich | Stand und Grenze |
| --- | --- |
| Gemeinsamer Headerstandard | 20 mm sichtbare Headerfreiheit für Anschreiben und CV, erste und folgende Seiten. Eigene Ränder, eigener Headerregler und ausdrücklich gesetzte Folgeränder gewinnen. Web-Geometrie für 41 auswählbare Stile geprüft; keine Freigabe gesperrter nativer Familien. |
| Gemeinsamer klassischer CV-Lesefluss | Modern- und Brief-QA-Export nutzen Datums-/Sprachzeilen, native Listen, schmale Spalten und gespeicherte Seitenpresets. 11/12 liefern ergänzend gerendert genau eine/zwei CV-Seiten. Word-Abnahme dieses Brief-Pfads offen. |
| Kontaktblock 09 | Gemessene Web-Spalten/-Abstände, bündiges Geburtsdatum und Entfernung der zusätzlichen Kontaktüberschrift umgesetzt. Letzte Word-Abnahme offen. |
| Kontaktblock 05 | Benutzer: grundsätzlich gut, wirkt verschoben. 44-mm-Inhaltsanfang ist ein bewusst gespeicherter Randtest. Der unbeabsichtigte 6-mm-Kontakteinzug wurde gemeinsam korrigiert; Rubrik-/Seitenränder bleiben erhalten. Neue Word-Abnahme offen, kein zusätzlicher Einzeltest verlangt. |
| Palette und Testvarianten | 04-Farben sowie 05-Referenzen und 06-Foto/linke Pille positiv zurückgemeldet. Die von Codex erfundenen abweichenden QA-Farb-/Pill-/Fotovarianten sind korrigiert. |
| Technischer Nachweis | Letzte vollständige Unit-Suite: 1’254 bestanden. Neuester Kontaktfix: 442 DOCX-Tests, Typecheck, Lint, Format und Build bestanden; sieben andere Batch-Modelle unverändert. Diese Zahlen gehören zu den jeweiligen veröffentlichten Code-Checkpoints und sind keine Word-Freigabe. |

Nachweise: [Headerstandard](docx-next-header-default-19okt.md), [gemeinsamer Brief-Lesefluss und Acht-Dateien-Paket](docx-next-brief-reading-20okt.md), [Kontaktkorrektur 05](docx-next-contact-indent-20okt.md), [Kontaktkorrektur 09](docx-next-word-spacing-19okt-v3.md).

## Noch offen, in Arbeitsreihenfolge

| Reihenfolge | Offener Block | Konkreter Abschluss |
| --- | --- | --- |
| 1 | Gemeinsame CV-Schriftrollen und Rubrikmetriken | Dokumenttitel, Name, einfache Rubriken, Eintragstitel, Fliesstext, zurückhaltende Texte und Listen aus derselben effektiven Web-Präsentation auflösen. Gross-/Kleinschreibung, Laufweite, Gewicht, Zeilen- und Absatzabstände sowie Seitenpresets prüfen. Eigene Werte gewinnen; keine neuen Font-Fallbacks. |
| 2 | Word-Abnahme des aktuellen Pakets | 04: gleicher Headerabstand auf beiden Letter-/CV-Seiten. 09: Kontaktblock. 11/12: neuer Brief-Lesefluss und Ein-/Zweiseitenaktion; an 11 eine Sprache und einen Listenpunkt bearbeiten, speichern, schliessen, wieder öffnen. 05-Korrektur in die nächste gemeinsame Lieferung aufnehmen. Eine gemeinsame Rückmeldung, keine Abnahme pro Commit. |
| 3 | Weitere Coverfamilien | Verlauf, Neon und Warm/Freundlich bleiben wegen dokumentierter Abweichungen gesperrt. Verläufe/Transparenz, authored Geometrie, Initialen/Fotos und Rundformen gemeinsam diagnostizieren und beheben. Brief/Modern begründen keine Freigabe dieser Familien. |
| 4 | Weitere Schriften | Bisher nur begrenzter Sans-Pfad. Andere Vorlagenschriften, Gewichte, Laufweiten, Skripte und Windows-Ersatzschriften ausdrücklich prüfen. Keine stille Ersetzung. |
| 5 | Pills und Dekorationen | Lange/mehrzeilige Rubriken, schmale Spalten, manuelles Verschieben und Seitenumbrüche. Cover-Pill und Text wachsen in Word noch nicht gemeinsam; der in Word gescheiterte Gruppierungsversuch bleibt gesperrt. |
| 6 | Vollständige Chrome-/Bild-Fidelity | Randlose Header-/Footer-Kanten, waagrechte/reduzierte Kontakt-Header, Brief-Chrome, Farben, Formen, Initialen und Bild/Crop-Varianten einschliesslich Speichern/Wiederöffnen. Einzelne bestätigte Farben schliessen diesen Block nicht. |
| 7 | Belastung, Restore und Vollmatrix | Weitere alte Projektformate/Sonderfälle; lange Namen und Titel, 115 %, ausgeblendete/verschobene Elemente, Fotos, Listen und mehrere Seiten. Zuerst die repräsentativen Familien sauber abschliessen, danach alle 39 ursprünglichen Vorlagen. 41 auswählbare Web-Stile sind keine 41 freigegebenen nativen Vorlagen. |
| Separat | Native Sidebar / Agent A | Weiter eingefroren. Kein neues Engine-/Geometrieexperiment. Bestehender NO-GO bleibt bestehen; konkrete neue Desktop-Word-Evidenz wäre ein eigener Auftrag. #14/#25/#38 behalten ihre Branch-/Freeze-Grenzen. |
| Danach | Integration / produktiver Export | Merge, Deployment und Umschalten des Standardexports sind nicht freigegeben. Dafür ist eine eigene Integrationsentscheidung nach den Nachweisen erforderlich. |

## Was nicht zum künstlichen Blocker wird

- Zwei natürliche CV-Seiten ohne Einseitenaktion sind nach Benutzerpräzisierung akzeptabel. Die zusätzliche native Referenzseite bei 05/08/09/10 bleibt als Web-/Word-Abweichung dokumentiert, wird aber nicht durch beliebige neue Defaults oder erzwungene Textverkleinerung kaschiert.
- Ein Zweiseiten-CV wird nicht automatisch mit grösserer Schrift und mehr Abstand aufgebläht. Zusätzliche Schnuppertage dürfen Platz benötigen; bewusste Einstellungen bleiben massgeblich.
- Die Anhänge 01/04 vom 20. Oktober allein gelten nicht als ausdrückliche neue positive Abnahme. 05 wurde ausdrücklich grundsätzlich positiv beurteilt.
- Die neue 05-Korrektur und die gemeinsame Brief-Komposition sind nicht durch ältere positive 05-/08-/10-Rückmeldungen bereits in Word freigegeben.

## Nächster technischer Block

[Konkreter Auftrag: gemeinsame CV-Textrollen und Rubrikmetriken](docx-next-typography-next-batch-20okt.md).

Am 20. Oktober um 18:11 wurde die Ausführungsumgebung als nicht verfügbar gemeldet. Remote-Code und Backlog wurden geprüft und dieser Arbeitsauftrag konkretisiert. In dieser Fortsetzung wurden keine Produktänderungen, Exporte oder Tests ausgeführt. Die zuletzt bestandenen Prüfungen bleiben historische Nachweise der oben genannten Code-Stände.

## Historische Berichte

[Gemeinsamer Arbeitsvertrag](docx-next-shared-fidelity-18okt.md), [gemeinsame Settings/Restore](docx-next-shared-settings-18okt.md), [gemeinsame Palette](docx-next-shared-chrome-18okt.md), [Zeilen/Listen](docx-next-shared-reading-rows-18okt.md), [Seitenpresets](docx-next-shared-page-fit-19okt.md), [erster Zehnerbatch](docx-next-word-batch-19okt.md), [Revision 2](docx-next-word-feedback-19okt-v2.md), [Cover-Kohorten-Audit](docx-next-design-fidelity-16okt.md), [Pill-Rückgabe](docx-next-modern-rubric-word-return-18okt.md), [Modern-Abstände](docx-next-modern-cv-spacing-settings-18okt.md).
