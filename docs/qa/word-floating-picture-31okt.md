# Typisierter Bildbesitz in schwebender Tabelle, 31. Oktober 2026

Neuere Bewertung mit Besitzvertrag 2: [native Engine-Gegenprobe und Bildobjektart](writer-crop-engine-31okt.md). Frühere Bildbesitzwerte sind historische Werte des Vertrags 1.

Neuere Fortsetzung: [Konturkorrektur und minimale Crop-Gegenprobe](word-picture-crop-31okt.md).

Die einstündige lokale Untersuchung liefert einen reproduzierbaren Teilfortschritt: Alle vier Writer-Proben behalten den typisierten, textfreien Bildbesitz und die bisherige Writer-Ausgangsansicht über zwei Speicherzyklen exakt. Originalpixel gehen beim ersten Writer-Speichern weiterhin verloren. Desktop-Word öffnet den neuen Hauptfall reparaturfrei; sein einmal separat gespeicherter und wieder geöffneter Rücklauf bleibt paket- und geometriestabil. Die Word-Ausgangsansicht weicht jedoch vom bisherigen Word-Vergleich ab. **Keine Produktfreigabe.**

Maschinenlesbare Nachweise: [word-floating-picture-31okt.json](word-floating-picture-31okt.json). Vorheriger Stand: [word-tile-precision-31okt.md](word-tile-precision-31okt.md). Alle neuen Varianten sind ausdrücklich veränderte synthetische Diagnoseeingaben, keine unveränderten App-Exporte. Diese Stunde änderte den Produktrenderer nicht; frühere lokale Änderungen bleiben erhalten.

## Was geprüft wird

Prüfobjekt ist das Foto im Lebenslauf, nicht das alte Titelblatt des dreiteiligen Testdokuments. Getrennte Anforderungen sind: ein eigenes typisiertes Bildsteuerelement ohne Zusatztext, die vollständigen ursprünglichen Bildpixel, der richtige sichtbare Ausschnitt und exakte Position sowie Stabilität beim nativen Speichern und Wiederöffnen. Ein bestandenes Dateipaket allein ersetzt die sichtbare Prüfung nicht.

## Reproduzierbare Viererprobe

`scripts/docx-next-floating-picture-probe.py` erzeugt ausschließlich aus vier fest per SHA-256 gebundenen Testquellen neue Dateien. Das Bild bleibt ein `pic:pic` mit ursprünglichem Zuschnitt, Ellipse, Kontur und unveränderten Bildbytes. Sein typisiertes Steuerelement enthält einen Absatz mit `wp:inline`; eine schwebende Einzellentabelle übernimmt die Positionierung. Die Tabellenposition berücksichtigt den linken/oberen Konturraum aus `wp:effectExtent`, einmalig in Twips umgerechnet. Keine versteckten Zeichen, keine nachträgliche Reparatur gespeicherter Pakete, keine Anpassung an beobachtete PDF-Koordinaten.

Erzeugung aus dem lokal gesicherten vollständigen CI-Fixturesatz in ein neues Ausgabeverzeichnis. Im eingecheckten Import-Fixturesatz liegt nur `main`; dort muss `--cases main` angegeben werden. Die spätere Konturkorrektur ist im neuen Fortsetzungsbericht beschrieben; die ursprüngliche Produzentenversion wurde für diesen historischen Lauf archiviert.

```text
python scripts/docx-next-floating-picture-probe.py artifacts/ci-3972e87b/app-body/fixtures artifacts/new-floating-probe
```

| Fall     | Writer-Quellansicht gegen bisherigen Referenzexport | Bildbesitz Quelle / Save 1 / Save 2 | Geometrie über beide Saves | Originalpixel nach Save 1 / 2 |
| -------- | --------------------------------------------------- | ----------------------------------- | -------------------------- | ----------------------------- |
| main     | exakt                                               | bestanden / bestanden / bestanden   | exakt                      | verloren / verloren           |
| low      | exakt                                               | bestanden / bestanden / bestanden   | exakt                      | verloren / verloren           |
| portrait | exakt                                               | bestanden / bestanden / bestanden   | exakt                      | verloren / verloren           |
| chrome   | exakt                                               | bestanden / bestanden / bestanden   | exakt                      | verloren / verloren           |

Der unveränderte PDF-Vertrag 2 prüft Seitenzahl, Wortfolge und Wortpositionen, 2x-Seitenpixel, Seitengrößen und sämtliche platzierten Bildmatrizen. Zusätzlich bleibt der tatsächlich belegte Fotobereich bei 8x-Auflösung gegen die ursprüngliche Writer-Referenz und über alle Phasen pixelgleich. Tabellenraster, Feldreihenfolge und Pakettext bleiben erhalten. Diese vier Fälle ersetzen keine vollständige 22er-Abnahme.

## Tatsächlicher Word-Abgleich

Microsoft Word `16.0.20527.20112` unter Windows `10.0.22631.0` wurde über die Desktop-Oberfläche bedient. Ein nativ in Word angelegtes Bildsteuerelement lieferte einen positiven Inline-Kontrollfall. Bei diesem konkreten Objekt waren die Befehle für freie Positionierung und Textumbruch deaktiviert; daraus folgt keine allgemeine Spezifikationsaussage.

Der neue normale Tabellen-Hauptfall öffnete ohne Reparatur. Save 1 wurde separat gespeichert, geschlossen und von der Festplatte erneut geöffnet, ebenfalls ohne Reparatur. Alle fünf strengen Paketprüfungen bestehen: kanonische Felder, typisierter Bildbesitz, Originalbilddaten, exaktes Crop-Markup und Abschnitts-/Revisionsvertrag. Quelle gegen Save 1 hat exakt dieselbe Word-PDF-Geometrie; auch der feste, tatsächlich belegte Fotobereich bleibt bei 8x-Auflösung pixelgleich. **Für diesen Hauptfall wurde nur ein Word-Speicher-/Wiederöffnungszyklus abgeschlossen.** Bearbeitungssynchronisation und native Kontrollbereiche wurden damit nicht abgenommen.

Die Word-Quelle gegen den bisherigen Rich-Control-Word-Export besteht die strenge sichtbare Prüfung dennoch nicht: nur Seite 3 unterscheidet sich, ohne verschobene Wörter. Die Bildmatrix liegt horizontal 0,05 pt weiter links; außerdem zeigt die visuell geprüfte Vergleichsgrafik eine unterbrochene rechte Bildkontur. Das ist kein akzeptierter Ersatz der alten Word-Ansicht. Grafik lokal: `artifacts/word-native-model-31okt/renderer-table-four/word-writer-table-fidelity.png`.

## Verworfene Alternativen und Gegenbelege

- Eigene Clip-Geometrie mit vollem Originalbitmap kann in schwebender Tabelle oder Absatzrahmen Bildbesitz und Originalpixel erhalten und innerhalb des Editors stabil bleiben. Sie trifft aber den ursprünglichen Ausschnitt und/oder die Position nicht; Absatzvarianten erzeugen eine vierte Seite. Kein Erfolg durch bloß stabile falsche Darstellung.
- Die entsprechende Tabellen-PIC-Variante wurde in Word zweimal separat gespeichert, geschlossen und wieder geöffnet. Alle Paketprüfungen und die Word-PDF-Stabilität bestehen; die falsche Ausgangsansicht bleibt der Ausschlussgrund.
- WPS-Shape unter typisiertem Bildsteuerelement verlangte in Word Reparatur, obwohl der geprüfte Paketaufbau schemaformal gültig war. Reparatur wurde abgelehnt; keine gerettete Datei als Erfolg gewertet.
- Block-SDT oder WPS-Textrahmen allein erhalten die strenge Writer-Bildzuordnung nicht. Der nativ von Word erzeugte Inline-Kontrollfall besteht dagegen die strengen Prüfungen.

## Umfang, Sicherung und nächste Arbeit

Die unveränderte, hashgebundene LibreOfficeKit-25.8.7.3-Umgebung führte diese Stunde 42 DOCX-Speicherungen und 63 PDF-Exporte mit insgesamt 243 Seiten aus. Darin sind die einmalige Konturraum-Gegenprobe und die anschließende unabhängige Viererprobe getrennte tatsächliche Ausführungen. Word-Ausführungen zählen separat. Vollständige Phasen, Hashes und Befunde liegen lokal unter `artifacts/word-native-model-31okt/`; die Rohdateien bleiben ignoriert.

Die Diagnoseerzeugung ist bei Wiederholung bytegleich für alle vier Quellen; bestehende Ausgaben und eine veränderte gepinnte Quelle wurden zurückgewiesen. Python-Kompilierung, 26 adversariale Bildbesitztests, zwölf Geometrie- und zwölf Word-Rücklauftests bestanden erneut. Die letzten beiden Testgruppen brauchten nach verweigertem Zugriff auf temporäre Dateien einen Lauf mit normalem Dateizugriff; anschließend bestanden alle Fälle. Alle vier neuen Quellen haben null Fehler im Open-XML-Schema-Validator. Frühere 135 fokussierte Tests sind im vorherigen Bericht dokumentiert, nicht als neue Vollprüfung dieser Stunde ausgegeben. Keine Verträge oder Referenzwerte gelockert, kein Commit, Push oder Merge.

Nächster sinnvoller Schritt ist eine unabhängig belegte Lösung für Writers verlustbehafteten Crop-Export und die Word-Kontur-/Positionierungsabweichung. Erst danach lohnt die volle native Matrix und die Word-Abnahme aller vier Fälle mit jeweils zwei Zyklen. Weitere identische Saves dieser verworfenen Varianten ersetzen das nicht.
