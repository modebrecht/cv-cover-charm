# Word Abnahme Batch 19 Oktober 2026

Zehn echte App-Exporte. Bitte die DOCX-Dateien 01 bis 10 nacheinander in Desktop Microsoft Word öffnen und einmal gesammelt Rückmeldung geben.

1. **Visuelle Runde:** Deckblatt, Anschreiben und sämtliche CV-Seiten kurz ansehen. Achten auf überlappende/fehlende Texte, Pills, Header-/Footer-Flächen, Spalten und Bildausschnitt. In 01 sind insgesamt 3 Seiten vorgesehen, in 02 insgesamt 4; die Ein-/Zweiseiten-Aktion betrifft den CV.
2. **Kurzer Bearbeitungstest nur mit 06 und 10:** Im Deckblatt August 2028 zu August 2029 ändern, einen kurzen Satz im Anschreiben ändern, speichern, schliessen und erneut öffnen. Prüfen, ob Text, Foto und Seitenaufteilung erhalten bleiben. Diese zwei Dateien decken beide Coverfamilien und beide Fototypen ab.
3. **Eine Rückmeldung:** z. B. `01 ok; 02 ok; 05 Seite 4 Referenz zu weit rechts; 06/10 nach Wiederöffnen ok`. Nur bei Abweichungen Screenshot/Word-PDF und möglichst die gespeicherte DOCX zurückgeben. Nicht jede Kleinigkeit einzeln abnehmen.

`00-Uebersicht.pdf` zeigt die zehn Fälle und ihre Prüfschwerpunkte. `00-Uebersicht.html` enthält vergrösserbare Web-Bilder und direkte Links zu den Dateien und PDF-Referenzen.

## Grenzen dieser Runde

- Microsoft-Word-Darstellung, Bearbeitung und Save/Reopen sind **noch nicht abgenommen**. Die DOCX-Vorschaubilder stammen aus unverändertem LibreOfficeDev 26.8 und dienen nur als ergänzende Prüfung.
- Zwei Coverfamilien sind enthalten: Modern und Brief. Verlauf, Neon und Freundlich/Warm bleiben wegen der bereits dokumentierten Cover-Abweichungen gesperrt. Native Sidebar/Agent A bleiben eingefroren. Die All-39-Abnahme ist offen.
- Sans ist in den Testprojekten ausdrücklich gespeichert. Der Browser verwendet das geprüfte Liberation-Sans-Profil; Word wird Arial angefordert. Andere Schriften und Windows-Schriftersetzungen sind nicht durch diesen Batch freigegeben.
- Modern 01/02 verwenden die echte Ein-/Zweiseiten-Aktion. Die anderen Fälle wurden ohne diese Aktion exportiert; dort können zwei native CV-Seiten gegenüber einer Web-CV-Seite auftreten. Das ist dokumentiert und keine neue pauschale Verdichtung.
- Brief 08-10 behalten die vorhandene native CV-Komposition, darunter die zusätzliche Kontaktüberschrift und gestapelte Zeilen. Das ist keine Freigabe identischer Web-/Word-CV-Geometrie für Brief.
- Pill-Text bleibt nativ bearbeitbar. Die getrennte Hintergrundfläche vergrössert sich bei beliebig längerem Word-Text nicht automatisch. Die gesperrte Pill-Gruppierung wurde nicht aktiviert.
- Die Web-PDFs sind echte normale App-Downloads aus demselben Zustand. Manche Covertexte liegen dort in der Rasterebene und sind nicht vollständig extrahierbar; die Textprüfung und ihre Ausnahmen sind in `Nachweise/validation.json` erfasst. Es wird keine vollständige Cover-Suchbarkeit behauptet.
- Fotos in 06/10 sind bewusst farbige Crop-Testkarten, keine Bewerbungsfotos. Original-PNG-Daten sind in den DOCX-Dateien erhalten.

## Technischer Stand

Gemeinsame Korrekturen: schmale Datumsspalten und Sprachspalten verwenden wie im Web 20 statt 27 mm; reine E-Mail-/Zusatz-Referenzen bleiben im klassischen Web-CV sichtbar. Seitenpreset und gespeicherte Einstellungen gelangen unverändert durch Restore/Reload und Export.

1246 Unit-Tests einschliesslich 433 DOCX-Tests bestanden. Typecheck, Lint der geänderten Dateien, Formatprüfung und Build bestanden. 10/10 Projekt-Restores, unveränderter gespeicherter Zustand, tatsächlicher UI-DOCX-Download bytegleich zur frischen App-Erzeugung und 10 normale PDF-Downloads. 39 ergänzend gerenderte A4-Seiten, 805 native Textfelder und 49 CV-Pill-Flächen geprüft. Word-Freigabe bleibt offen.

Arbeitsbranch: `fix/docx-next-shared-fidelity-18okt`; Ausgangspunkt `702f714d348d698f911145406ca61b801f053c45`. Kein Merge, Deployment oder Wechsel des Standardexports.
