# Word-Rückgabe und fehlender Default-Export – 17.11.2026

Produktstand unverändert: `6267572e53ccd4b6e5d8eb9cca4ccaa1134366e9`.
Diese Fortsetzung ändert ausschliesslich Nachweise unter `History/`.

## Ergebnis der Benutzerprüfung

Das bisherige `Word_Pruefpaket_Modern_2026-11-13.zip` ist **kein Default-Test**.
Sein gespeichertes Projekt setzt `headerMode: contact` und `headerHeightMm: 32`
für das synchronisierte Dossier. Die tatsächlich gelieferten PDF-Farben sind
Header ungefähr `#111827` und Footer `#244A61`. Das Paket prüft Modern Sidebar
mit Kontaktheader; diese Einschränkung war dem Benutzer nicht klar genug
kommuniziert worden. Das Paket nicht erneut als allgemeinen Default-Test senden.

Die zurückgegebene PDF nennt Microsoft Word für Microsoft 365 als Erzeuger und
hat weiterhin drei Seiten. Ihre Header-/Footer-Farben stimmen mit der alten
Referenz überein, abgesehen von einer RGB-Stufe im ursprünglichen JPEG-Header.
Der graue Screenshot-Header ist exakt `#888C93`, die auf ganze RGB-Werte gerundete
50-Prozent-Mischung von `#111827` und Weiss. Das ist Words Darstellung inaktiver
Kopf-/Fusszeilen. Es ist kein Verlust der gespeicherten Druckfarbe.

Im gespeicherten DOCX bleiben alle 14 ursprünglichen Mediendateien bytegleich
erhalten. Kein ursprünglicher semantischer Tag fehlt; Word ergänzt eigene
Kopien von Header-Tags. Das ist keine Aussage, dass alle Stories bytegleich
sind. Ein Dateiname mit `SAVED` beweist allein auch keinen Schliessen- und
Wiederöffnen-Ablauf. Die Rückgabe ist deshalb weder eine allgemeine Word-Freigabe
noch eine Abnahme eines Default-Exports.

Die frühere Farbsynchronisation ist bereits auf `dev`:
[`fc1a0caecc9eca9138444f9776342aefd8466ef0`](https://github.com/modebrecht/cv-cover-charm/commit/fc1a0caecc9eca9138444f9776342aefd8466ef0),
18.10.2026, `fix(dossier): share chrome palette and opaque surfaces across CV and Letter`.
`dossier-chrome-palette.ts` teilt weiterhin die aufgelöste Briefpalette; der
kompakte Footer hat Deckkraft 1. Diese Korrektur schaltet Words eigene
Bearbeitungsdarstellung nicht ab. Siehe auch den damaligen
[Farbbefund](../docs/qa/docx-next-modern-contact-colors-18okt.md) und
[Microsofts Erklärung zur inaktiven Header-Anzeige](https://learn.microsoft.com/en-us/answers/questions/5148107/header-and-footer-blurry-in-microsoft-word).

## Frisch geprüfter Standard für Kopf und Fuss

Der begrenzte aktuelle UI-Lauf verwendet dieselbe synthetische Modern-Sidebar-
Fixture aus `tests/fixtures/import/modern-sidebar-from-23okt.json`, setzt ihren
gesamten Chrome-Zustand aber aus `DEFAULT_DOSSIER_CHROME_STATE`. Keine erfundenen
Farboverrides, kein Kontakt-Header und keine feste Headerhöhe.

- Gespeicherter Chrome-Zustand entspricht exakt den App-Defaults.
- Header und Footer jeweils `compact`; keine explizite Headerhöhe.
- Sichtbarer Brief und CV: jeweils Header-/Footer-Farbe `rgb(17,24,39)`, Deckkraft 1.
- Echter normaler PDF-Download: drei Seiten; Brief und CV haben jeweils
  **identische gemessene Header-/Footer-Pixel `rgb(17,24,40)`**. Die eine blaue
  RGB-Stufe entsteht in der bestehenden JPEG-/PDF-Stufe, nicht durch zwei Farben.
- Echter JSON-Download; gespeicherte Dokumente bleiben durch die Downloads unverändert.
- Sämtliche drei Referenzseiten visuell geprüft; keine beobachteten abgeschnittenen
  Textenden oder zusätzliche Seite.
- 1/1 Browserfall ohne Retry/Skip, 13 einschlägige Unit-Tests, QA-TypeScript,
  ESLint und Formatierung bestanden.

**Sidebar ist dabei weiterhin eine ausdrücklich gewählte Struktur.** Das
allgemeine App-Defaultlayout ist einspaltig. Der Nachweis betrifft den Standard
für Kopf-/Fusszeilen im bisherigen Sidebar-Prüffall.

## Die eigentliche offene Produktgrenze

`src/lib/docx-next/app-source.ts`, `assertAppDocxNextSource`, verlangt derzeit
für Brief und CV ausdrücklich `headerMode === contact` und `footerMode === compact`.
Der neue tatsächliche UI-Lauf bestätigt deshalb: Mit Standard-Kopfzeile ist der
DOCX-Schalter gesperrt. `savedAppDocxNextAvailability()` meldet die Anforderung
einer Kopfzeile mit Kontaktdaten. **Es wurde kein Default-DOCX heruntergeladen
oder zur Word-Abnahme freigegeben.**

Die Sperre nicht für ein hübscheres Prüfpaket umgehen. Ein konstruierter Export
über einen internen Kandidatenpfad wäre kein normaler Produktdownload.

Der nächste konkrete Entwicklungsauftrag ist die begrenzte Unterstützung der
kompakten Standard-Kopfzeile im nativen Modern-Sidebar-Word-Export: Geometrie,
native Header-/Body-Zuordnung und Inhalt im Modell/Renderer nachweisen, dann
die Supportprüfung passend erweitern und echte Einzel-/Dossier-Downloads prüfen.
Erst danach ein neues korrekt bezeichnetes Word-Prüfpaket bereitstellen.
Die allgemeine einspaltige Word-Unterstützung bleibt davon getrennt.

Vom Benutzer werden zur Diagnose der aktuellen Farben keine weiteren Dateien
benötigt. Das alte Kontakt-Paket vorerst nicht weiter als Default-Abnahme testen.

## Nachweise und reproduzierbare Diagnose

[Rückgabe-Hashes, Farben, Paket-Chrome und neue Default-Prüfung](WORD_DEFAULT_CHROME_2026-11-17/review.json)
· [Browser-Nachweis](WORD_DEFAULT_CHROME_2026-11-17/default-browser-evidence.json)
· [Unit-Protokoll](WORD_DEFAULT_CHROME_2026-11-17/unit-tests.txt).

Die Benutzerdateien selbst werden nicht ins Repository kopiert. Der neue
Default-PDF-Download wird getrennt als Referenz bereitgestellt; er ist kein
neues Word-Prüfpaket.

Die Diagnose ist bewusst opt-in archiviert. Zum Wiederholen mit dem gepinnten
Playwright 1.56.1 / Chromium 141.0.7390.37:

```sh
cp History/WORD_DEFAULT_CHROME_2026-11-17/probe.qa.ts.txt tests/qa/word-default-chrome.qa.ts
cp History/WORD_DEFAULT_CHROME_2026-11-17/playwright.config.ts.txt tests/qa/playwright.word-default-chrome.config.ts
playwright test --config tests/qa/playwright.word-default-chrome.config.ts
```

Die temporären TS-Kopien nach der Prüfung entfernen. Die bestehenden produktiven
Default-/Farbsynchronisationstests bleiben unverändert; es wird kein neuer
allgemeiner CI-Lauf oder Produktfix behauptet.
