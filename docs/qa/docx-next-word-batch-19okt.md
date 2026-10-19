# Word Abnahme als gemeinsamer Batch

**PARTIAL: Zehn technisch geprüfte echte App-Dossiers sind gemeinsam zur Word-Abnahme bereit. Microsoft Word, Bearbeitung und Save/Reopen bleiben UNVERIFIED.**

Branch: `fix/docx-next-shared-fidelity-18okt`. Verifizierter Ausgangspunkt: `702f714d348d698f911145406ca61b801f053c45`. Der Batch schreibt diesen Branch fort. Keine neue Engine, kein Merge, Deployment, CI-Dispatch oder Wechsel des Standardexports. Die genaue Veröffentlichung ist der Commit dieses Berichts; `git log -1 --format=%H` liefert seinen SHA.

## Gemeinsame Korrekturen

Der klassische Web-CV verwendet in halben Rubriken eine 20-mm-Rail für Datum und Sprache. Der native Lesefluss-Kandidat verwendete dort noch die volle 27-mm-Rail. Der Builder berücksichtigt nun die gespeicherte Rubrikbreite für beide Zeilentypen, ohne eine Vorlagennamen-Weiche oder Schriftverkleinerung. Volle Rubriken behalten 27 mm, der rechte Inhaltseinzug bleibt 5 mm. Originalfelder, freie Absatzhöhen und die bisherige normale Exportkomposition bleiben erhalten.

Im klassischen Web-CV verschwanden reine E-Mail-/Zusatz-Referenzen durch einen alten Sichtbarkeitsfilter; auch bei einer benannten Referenz blieb eine separate E-Mail ohne `kontakt` unsichtbar. Web-Lesefluss, Seitenplan und natives Modell verwenden nun dieselbe semantische Inhaltsregel. Die Kontaktfelder werden unabhängig von der alten Sammelzeichenfolge angezeigt. Das ursprüngliche Sidebar-Rendering bleibt unverändert; Native Sidebar und Agent A sind eingefroren.

## Die zehn Dateien

Alle Dateien sind echte Downloads über die vorhandenen opt-in App-Buttons nach Projektimport, CV-Mount, gespeicherter Seitenauswahl soweit angegeben und Reload. Frische App-Erzeugung und UI-Download sind jeweils bytegleich. Alle zehn Exporte erhalten den gespeicherten Zustand. Zu jedem Dossier gibt es den normalen PDF-Download aus demselben Zustand und sichtbare Web-Seiten. Keine Modell-Demodatei ersetzt einen App-Export.

| Nr. | Datei und Schwerpunkt | Web CV | Ergänzender DOCX CV |
| --- | --- | ---: | ---: |
| 01 | [Modern Eine CV Seite](docx-next-word-batch-19okt/01-Modern-Eine-CV-Seite.docx): echte Einseiten-Aktion, schmale Sprachspalten, Listen, Referenz, August 2028 | 1 | 1 |
| 02 | [Modern Zwei CV Seiten](docx-next-word-batch-19okt/02-Modern-Zwei-CV-Seiten.docx): echte Zweiseiten-Aktion und Folgeseiten | 2 | 2 |
| 03 | [Modern Kontakt waagrecht](docx-next-word-batch-19okt/03-Modern-Kontakt-waagrecht.docx): Kontakt-Header und eigene deckende Farben | 1 | 2 |
| 04 | [Modern Kontakt senkrecht](docx-next-word-batch-19okt/04-Modern-Kontakt-senkrecht.docx): unabhängig gespeicherte Letter-/CV-Palette | 1 | 2 |
| 05 | [Modern Eigene Werte Referenzen](docx-next-word-batch-19okt/05-Modern-Eigene-Werte-Referenzen.docx): 18-px-Rubriken, 4-mm-Offset, 6-mm-Einzug und unvollständige Referenzkontakte | 2 | 2 |
| 06 | [Modern Foto Pille rechts](docx-next-word-batch-19okt/06-Modern-Foto-Pille-rechts.docx): runder Fotocrop und rechtsbündige Datum-Pille | 1 | 2 |
| 07 | [Modern Lang 115 Prozent](docx-next-word-batch-19okt/07-Modern-Lang-115-Prozent.docx): langer Covername/-beruf, Cover-Skalierung 115 %, längere CV-Beschreibung | 1 | 2 |
| 08 | [Brief Standard](docx-next-word-batch-19okt/08-Brief-Standard.docx): zweite unterstützte Coverfamilie und bestehender Brief-CV | 1 | 2 |
| 09 | [Brief Lang 115 Prozent](docx-next-word-batch-19okt/09-Brief-Lang-115-Prozent.docx): langer Covername/-beruf und Cover-Skalierung 115 % | 1 | 2 |
| 10 | [Brief Foto Hochformat](docx-next-word-batch-19okt/10-Brief-Foto-Hochformat.docx): Hochformat, Zoom und Bildposition | 1 | 2 |

05 prüft oben 28 mm und seitlich 24 mm; unten gilt die bestehende gespeicherte CV-Regel 1 mm, beim Anschreiben 22 mm. Eine Wiederholung mit ausdrücklich unterstütztem CV-Unterrand 1 mm erzeugt dieselbe DOCX bytegleich. Es wird kein unveränderter CV-Unterrand 22 mm behauptet. Die tatsächlich exportierten Projektdateien sind im Downloadpaket enthalten; `proof.json` enthält jeweils `restoredProject` und Snapshot.

## Einmalige Word Runde

Die Downloadfassung enthält [00-Uebersicht.pdf](docx-next-word-batch-19okt/00-Uebersicht.pdf), eine HTML-Übersicht mit Web-Seiten und Datei-/PDF-Links, eine [kurze Prüfliste](docx-next-word-batch-19okt/00-START-HIER.md), die zehn nummerierten DOCX-Dateien, zehn normale Web-PDFs, wiederherstellbare Projekte und technische Nachweise.

01 bis 10 nacheinander in Desktop Word visuell ansehen. Nur in 06 und 10 `August 2028` zu `August 2029` ändern und einen kurzen Satz im Anschreiben bearbeiten; speichern, schliessen und erneut öffnen. Diese zwei Fälle decken beide Coverfamilien und Fototypen ab. Danach eine gemeinsame Rückmeldung mit Dateinummer, Seite und Abweichung; bei Problemen Word-PDF/Screenshot und gespeicherte DOCX. Keine Einzelabnahme pro Commit oder kosmetischer Korrektur.

## Nachweise und Grenzen

- 1246 Unit-Tests einschliesslich 433 DOCX-Tests bestanden; vollständige Suite einmal ausgeführt. Zusätzlich 28 gezielte Tests bei der Implementierung. Typecheck, Lint der geänderten Dateien, Formatprüfung und Build bestanden.
- 10/10 App-Restores, Reload-Erhalt, tatsächliche UI-DOCX-Downloads bytegleich zur frischen Erzeugung und 10 normale PDF-Downloads. Keine gespeicherten Eingaben durch Export verändert, keine Modellissues übergangen.
- 39 A4-Seiten mit dem unveränderten gebündelten LibreOfficeDev 26.8 gerendert. Alle 28 unterschiedlichen Seitenraster visuell geprüft; die restlichen 11 Seiten sind pixelgleich zu diesen. Alle extrahierten Textgrenzen innerhalb A4.
- 805 native semantische Textfelder im ergänzenden PDF erhalten. Die nativen Bildquellen der beiden Fotofälle sind bytegleich als Original-PNG im DOCX vorhanden. Alle 49 CV-Pill-Texte liegen im ergänzenden Render innerhalb ihrer Flächen.
- 01 und 02 liefern auch im normalen PDF die angeklickte CV-Seitenzahl. Die anderen Fälle enthalten keine Einseiten-Aktion; abweichende native Seitenzahlen sind entsprechend der Nutzerpräzisierung dokumentiert, nicht pauschal wegverdichtet.
- Brief 08-10 behalten die vorhandene zusätzliche native Kontaktüberschrift und gestapelte CV-Zeilen. Das ist keine Abnahme identischer CV-Geometrie. Die Textprüfung führt diese zusätzlichen nativen Labels ausdrücklich auf.
- Einige Coverfelder des normalen Web-PDF liegen im Raster und sind nicht vollständig extrahierbar. Die entsprechenden Felder werden einzeln in `validation.json` aufgeführt. Die Web-PDFs sind visuelle Referenzen, keine Zusage vollständiger Cover-Suchbarkeit. Die übrigen Letter-/CV-Felder sind im normalen PDF nachgewiesen.
- Sans wird in den Testquellen ausdrücklich gewählt, nicht beim Export still ersetzt. Browserprofil: Liberation Sans; Word-Ziel: Arial, dessen tatsächliche Realisierung in Desktop Word offen bleibt. Andere Schriften sind nicht freigegeben.
- Verlauf, Neon und Freundlich/Warm bleiben aufgrund der dokumentierten Coverabweichungen ausserhalb des App-Kandidaten. Die beiden unterstützten Familien werden deshalb mit weiteren sinnvollen Farb-, Geometrie-, Text- und Bildvarianten abgedeckt. Keine All-39-Freigabe.
- Der Pill-Text ist editierbar, seine getrennte Dekoration wächst bei beliebig längerem Word-Text nicht automatisch mit. Die von Word zurückgewiesene Gruppierung bleibt gesperrt. Mehrzeilige/überbreite Pills, andere Fontprofile und Native Sidebar wurden nicht umgangen.

Reproduktion: `scripts/docx-next-word-batch19okt.ts OUTPUT` erzeugt den vollständigen App-Batch. `WORD_BATCH_CASES=01,05` begrenzt eine begründete Wiederholung. Danach alle DOCX mit dem vorhandenen `render_docx.py --emit_pdf` rendern, `scripts/docx-next-word-batch19okt-verify.py APP RENDERS VALIDATION_JSON` ausführen und mit `scripts/docx-next-word-batch19okt-package.py APP RENDERS VALIDATION_JSON OUTPUT` bündeln. Schrift-/Browserprofil beibehalten. Sämtliche Ausnahmen sind im maschinenlesbaren Nachweis sichtbar.

Die vollständigen Web-PDF-Rohdateien und Vorschaubilder liegen im Downloadpaket; das Repository behält die zehn geprüften DOCX und kompakte Quellen-/Modellnachweise. [App-Downloads](docx-next-word-batch-19okt/app-downloads.json), [Inhalts-/Pill-Prüfung](docx-next-word-batch-19okt/validation.json), [Checks](docx-next-word-batch-19okt/checks.json).
