# CV-Sidebar: fehlende Referenzfelder korrigiert

24. Oktober 2026. Branch `fix/docx-next-shared-integration-22okt`, Basis `b33fb94d55fe6e6c01e3075b1262dbd7b9164de0`. Dies ist ein belegter Fehler des gemeinsamen CV-Renderers, keine neue Aussage zum Word-Importer.

## Tatsächlicher Produktfehler

Eine gültige Referenz darf eine separate E-Mail oder Zusatzzeile enthalten, obwohl das ältere Sammelfeld `kontakt` leer ist. Der vorhandene gemeinsame Helfer `referenceHasContent` und der Hauptbereich unterstützen diesen Vertrag bereits. Die Sidebar verwendete an drei Stellen noch den alten Vertrag:

1. Die Sichtbarkeit der ganzen Rubrik berücksichtigte nur Name, Funktion und `kontakt`.
2. Die Liste entfernte Referenzkarten ohne diese alten Werte.
3. Selbst bei einer benannten Karte wurde die Kontaktzeile nur bei nichtleerem `kontakt` gezeichnet.

Dadurch verschwanden E-Mail-/Zusatzfelder im gerenderten Sidebar-Inhalt links wie rechts. Die Werte waren weiterhin in den Eingabedaten vorhanden. Das ist weder ein verlorener Word-SDT-Besitzer noch ein Pixel-/Rundungsproblem: Der sichtbare Quellinhalt fehlte bereits vor einem Export. Eine neue Word-Rückgabe ist für den Nachweis dieses Quellfehlers nicht erforderlich.

## Begrenzte Korrektur

`CvCanvasBase.tsx` verwendet nun auch für Sidebar-Rubrik und Referenzkarten `referenceHasContent`. Die Kontaktzeile prüft sämtliche von `referenceContactFields` gelieferten Werte, wie der bestehende Hauptbereich. Ein alter zusammengesetzter Kontakt bleibt ohne doppelte E-Mail-/Zusatzzeile erhalten. Versteckte oder vollständig leere Referenzen bleiben ausgeblendet; ausdrücklich im Hauptbereich platzierte Referenzen wechseln ihre Spalte nicht.

Die Datei wurde mit der Repository-Konfiguration formatiert. Der normalisierte ausgegebene JavaScript-Code entspricht exakt dem bisherigen Code plus diesen drei Sichtbarkeitskorrekturen. Geometrie, Bild-/Crop-Code, Feldkennungen und Benutzerdaten werden nicht neu definiert. Die wieder sichtbaren Zeilen beanspruchen ihren normalen Platz; die Prüfung unten behauptet keine neue Seitenumbruch-Abnahme.

## Nachweis vor und nach dem Fix

Die neue Regression rendert den echten `CvCanvasBase` mit React `renderToStaticMarkup`. Die HTML-Auswahl beschränkt sich auf tatsächliche CV-Seiten und deren Sidebar-/Hauptbereiche; versteckte Messknoten können fehlende Felder nicht ersetzen. Renderer und Sichtbarkeit werden nicht gemockt. Eingabedaten und Präsentation bleiben unverändert.

| Prüfung | Ergebnis |
| --- | --- |
| Unveränderter Ausgangscode mit den zwölf neuen Fällen | 6 PASS / 6 FAIL: E-Mail allein, Zusatz allein und benannte separate Kontaktfelder scheitern jeweils links/rechts |
| Korrigierter Renderer | 12/12 PASS, einschliesslich Legacy-Kontakt, verborgener/leerer Referenzen und Hauptbereich-Kontrollen |
| Gezielte Gesamtprüfung | **30 Tests / 4 Dateien / 340 Assertions, keine Fehler** |
| Bestehende native Nachbarn | Referenzspalten, halbe Textbreite mit leerem 6-mm-Zwischenraum, typisierter Bildbesitz und vollständige Quellbildbytes bestehen |
| Striktes TypeScript | Echte Abhängigkeiten des geänderten Renderers mit Repository-Pfaden und `vite/client`-Typen bestehen |
| Formatierung | Beide geänderten TSX-Dateien bestehen mit der Repository-Konfiguration |

Die Typenprüfung betraf den Renderer und seine Abhängigkeiten, nicht einen vollständigen Produktionsbuild. Der Lauf verwendete Bun 1.3.13 sowie die im Repository-Lockfile gepinnten React-/React-DOM-Versionen 19.2.5 und TypeScript 5.9.3. Die Tests prüfen Quell-Markup und kanonische Feldpräsenz, keine Browser-CSS-Geometrie oder Microsoft-Word-Pagination. Die historische 528er-DOCX-Suite wird nicht als neuer Lauf ausgegeben.

## Prüfung anderer Branches

Alle 167 aktuellen Remote-Branch-Spitzen wurden inventarisiert. 27 benannte einschlägige Fix-Branches wurden gegen die Integrationsbasis verglichen: 16 sind direkte Vorfahren, 11 sind abgezweigt. Der zusätzliche Branch `tmp-reference-columns-auto` ist ebenfalls abgezweigt. Ein anderer Commit-Verlauf bedeutet daher nicht automatisch, dass ein Produktfix fehlt; umgekehrt beweist derselbe Dateiname keine Übernahme.

Für die sieben abgezweigten Produkttracks der 27er-Auswahl wurden 56 Quellpfad-Paare geprüft: kein Pfad fehlt, 15 Blobs sind bytegleich, die übrigen Dateien wurden später verändert. Das ist ausdrücklich keine pauschale Verhaltensequivalenz aller späteren Änderungen. Die heutigen fokussierten Tests bestätigen die konkreten vorhandenen Verträge für Referenzspalten, halbe Textbreite und Bildbesitz. Kein historischer Branch wird dafür gemergt oder verändert. Der neu reproduzierte Sidebar-Sichtbarkeitsfehler wird als eigener Quellfehler korrigiert.

## Browser und normaler PDF-Export nachgeprüft

Fortsetzung auf Produktstand `024515de9febd6ace85a29f2e3252f7a667a7ff6`. Ein eigenes synthetisches Projekt wird direkt aus den aktuellen Modern-Defaults und öffentlichen DEMO-Daten erzeugt. Titelblatt, Anschreiben und CV verwenden dieselbe aktuelle Vorlagenfamilie. Die Fotos sind für diese Referenzprüfung leer. Die echte `DossierPdfCanvas`, die normalen gespeicherten Datenadapter und `downloadCombinedDossierPdf` werden ohne Preflight-Ausnahme verwendet.

Vier finale Fälle bestehen: Sidebar links/rechts sowie Referenzen in halber Breite im Hauptbereich bei beiden Sidebar-Orientierungen. Je Fall gibt es ein Titelblatt, eine Anschreibenseite und einen CV: zwölf exportierte Dossierseiten, davon vier geprüfte CV-Seiten auf Dossierseite 3. **Alle 32 Referenzfelder sind im Browser genau einmal sichtbar und innerhalb ihres Bereichs; alle 32 stehen im normalen App-PDF genau einmal als Suchtext und besitzen dort sichtbare dunkle Pixel im gemessenen Feldbereich.** Die vier Browser-CVs und vier gerenderten PDF-CVs wurden zusätzlich geöffnet; die getesteten Referenzen sind vollständig und ohne sichtbare Überlappung.

Die linke Kante des ersten Referenzfeldes stimmt in allen vier Fällen mit seiner Rubriküberschrift überein. Bei halber Breite beträgt auch der gemessene Versatz zur linken Textkante des Hauptbereichs **0 mm**. Das ist ein begrenzter Browser-/PDF-Beleg gegen ein ungewolltes Rechtsverschieben dieses Referenzfalls, keine neue Word-Geometrie-Abnahme. Die reale PDF-Vorprüfung besteht viermal ohne Zustimmungsausnahme. Eingaben und gespeicherter Browserzustand bleiben beim Export unverändert; keine erfassten JavaScript-Fehler.

Laufzeit: Chrome for Testing 156.0.8078.47, Arial mit Liberation Sans als Ersatz und die originalen Repository-Cabin-Schriften. Die neue Browser-Prüfhülle besteht striktes TypeScript, die beiden JavaScript-/TSX-Dateien die Repository-Formatierung; der Node-Runner und der Python-PDF-Prüfer bestehen ihre Syntaxprüfung. Der finale Lauf verwendet keine historischen Projekt-Fixtures. Einrichtungsdurchläufe sind keine zusätzliche Fallabdeckung.

Reproduktion mit vorhandenen Repository-Abhängigkeiten, Playwright und einem expliziten Chromium-Pfad:

```sh
DOCX_NEXT_CHROMIUM_PATH=/path/to/chrome-headless-shell node scripts/qa-sidebar-reference-browser-24okt.mjs /tmp/fresh-reference-proof
python scripts/qa-sidebar-reference-pdf-24okt.py /tmp/fresh-reference-proof
```

Der Runner verlangt einen neuen Ausgabeordner. Der PDF-Prüfer bindet die Dateien an die tatsächlich heruntergeladenen PDF-Hashes; Suchtext und sichtbare Feldpixel bleiben getrennte Aussagen. Sichtbare Pixel allein erkennen keine korrekten Buchstaben, deshalb bleibt die visuelle Prüfung erforderlich. Diese CSR-Prüfhülle ist kein Nachweis vollständiger Editor-Navigation, eines produktiven SSR-Builds, langer CVs oder eines Microsoft-Word-Roundtrips. Das bestehende Word-Entscheidungspaket wird dadurch nicht ersetzt. In dieser Fortsetzung ändern sich nur QA-Skripte und Dokumentation; der Produktcode bleibt exakt auf `024515de`.

## Offene Entscheidung

Dieser Fix schliesst eine reale Lücke im sichtbaren CV-Quellinhalt. Er schliesst die Bild-/Crop- und Control-Fragen nach Word Save/Reopen nicht. Das bereits bereitgestellte Entscheidungspaket bleibt als unveränderte Bild-/Control-Triage-Eingabe gepinnt; es wird weder als neu exportiert noch als nach diesem Fix vollständig abgenommen ausgegeben.

**Sidebar-Produktfreigabe weiterhin NO-GO; aktueller Microsoft-Word-Roundtrip UNVERIFIED.** Der normale Sidebar-DOCX-Einstieg bleibt gesperrt. Keine neue Benutzer-Testdatei, keine weitere Engine-Untersuchung, kein 22er-Lauf, kein CI-Dispatch, Merge oder Deployment. Nächster Hauptschritt bleibt die Auswertung tatsächlicher Word-Speicherdateien gegen die vorbereitete identische Quelle.

[Maschinenlesbare Evidenz](docx-next-sidebar-reference-fields-24okt-evidence.json).
