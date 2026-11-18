# Standard-Kopf/Fuss im Word-Export – 17.11.2026

**Aktualisiert am 18.11.2026:** Der Benutzer hat den Farb- und Klickfix
bestätigt. Zwei schmale Farbbänder sind seit `723d6cb` der normale Standard;
die vorherige Header-Variante bleibt ausschliesslich als interner Dev-Rückfall.
Es steht keine erneute Benutzerprüfung dieses Fixes aus. Siehe den
[aktuellen Nachweis](../docs/qa/word-chrome-default-2026-11-17.md) und den
[Projektstatus](PROJECT_STATUS_2026-11-18.md).
Der folgende Bericht dokumentiert den älteren Header-Stand `4523909`.

Produktcommit: [`45239090c89841057765eee1da0d3954141dd04e`](https://github.com/modebrecht/cv-cover-charm/commit/45239090c89841057765eee1da0d3954141dd04e), direkt auf `dev`.

Der normale Word-Download unterstützt jetzt neben dem bisherigen Kontaktheader
auch die kompakte Standard-Kopfzeile im unterstützten Modern-Sidebar-Profil.
Die Standardoptionen werden unverändert übernommen: kompakte Kopf-/Fussbänder,
keine feste Headerhöhe, identische aufgelöste Farben und volle Deckkraft.
Das gilt für das Gesamtdossier und für unabhängige Brief-/CV-Downloads.

## Umsetzung

- Der App-Export aktiviert die vorhandene quellgetreue Kompaktband-Komposition.
- Im kompakten Brief bleiben die fünf Absenderfelder als normale bearbeitbare
  Absätze im Dokumentkörper. Schriftgrösse und der Abstand vor dem Empfänger
  folgen dem Web-Brief. Der Empfängerblock bleibt nativ mitwachsend.
- Der bisherige Kontaktheader-Pfad bleibt unverändert; sein Modell wird im
  Unit-Test gegen die bisherige Komposition verglichen.
- Nicht unterstützte Chrome-Texte, Verläufe, verschobene Adressblöcke und
  abweichende Fortsetzungsmodi bleiben gesperrt. Gemischte Kopfzeilenmodi in
  einem Gesamtdossier bleiben gesperrt; unabhängige Exporte prüfen ihren Teil.
- Der tatsächliche Default-Downloadtest ist eine feste Browsergruppe der
  `Dossier Regression`, keine nur lokal verfügbare Diagnose.

Die Grenze bleibt ausdrücklich **Modern / Sans / Sidebar**. Das allgemeine
einspaltige App-Defaultlayout ist damit nicht pauschal für Word freigegeben.

## Geprüfte Dateien und Downloads

Der normale JSON-Import lädt die vorhandene synthetische Modern-Sidebar-Fixture
mit exakt `DEFAULT_DOSSIER_CHROME_STATE`. Der Test bedient die echten Download-
Schalter: PDF, DOCX und JSON des Gesamtdossiers sowie DOCX von Brief und CV
einzeln. Kein interner Rendereraufruf ersetzt einen der Downloads.

- Default-Browserfall **1/1 PASS**, keine Retries/Skips. Sichtbare Kopf-/Fuss-
  farben in Brief und CV jeweils `rgb(17,24,39)`, Deckkraft 1.
- Das App-PDF hat **drei Seiten**. Seine Brief-/CV-Bänder sind jeweils exakt
  gleichfarbig: `rgb(17,24,40)`. Die einzelne blaue RGB-Stufe entsteht in der
  bestehenden JPEG-/PDF-Stufe.
- Das Dossier-DOCX enthält drei Sektionen und alle fünf nativen Absenderfelder;
  die beiden Einzel-DOCX enthalten jeweils genau ihren eigenen Dokumentteil.
  Die ergänzende native Darstellung beider Einzel-DOCX ergibt jeweils eine
  Seite. Der CV enthält weiterhin sein gewöhnliches verschiebbares Bild.
- Alle Downloads lassen die gespeicherten Dokumente unverändert.
- Ergänzende Darstellung des Dossier-DOCX mit dem kanonischen `render_docx.py`:
  **drei Seiten**, visuell auf Textenden, Foto und Seitenumbrüche geprüft.
  Beide Bänder sind auch hier jeweils `rgb(17,24,40)`.
- **1’545 Unit-Tests**, App-/QA-TypeScript, gezieltes ESLint, Formatierung,
  Produktionsbuild und **3/3 bisherige Kontakt-Word-Browserfälle** bestanden.

Die Dateien entstanden auf dem Arbeitsstand der später bytegleich publizierten
Produktänderungen. Der ursprüngliche Browser-Nachweis nennt deshalb noch den
Basiscommit `7b52d3f`; die Zuordnung zum veröffentlichten Produktbaum und die
exakten Datei-Hashes stehen in [verified-output.json](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/verified-output.json).

Die ergänzende native Darstellung verwendet LibreOffice. Sie ersetzt keine
Microsoft-Word-Abnahme. Der alte Word-Rücklauf gehörte zum Kontakt-Header und
belegt keinen Speichern-/Wiederöffnen-Ablauf dieses neuen Default-DOCX.

## Historisches Prüfpaket für den Header-Stand

[Word_Pruefpaket_Modern_Standard_Kopf_Fuss_2026-11-17.zip](https://chatgpt.com/library?file_id=libfile_735203c7ffac81919d17ac19b43ba0ea&account_id=personal)
ersetzt das frühere Paket unter derselben Dateiidentität, Version 1.
Es enthält die tatsächlichen DOCX-/PDF-/JSON-Downloads, die beiden Einzel-DOCX
und eine kurze Anleitung. SHA-256 des ZIP:
`59f2a56141911d84e8ff0bcc95a4aa2b16dc2cdd73d63010f64d94821b0e0cd4`.

Dieses Paket gehört zum damaligen Header-Stand und wird nicht als neuer
Prüfauftrag angeboten. Die anschliessend bestätigte Datei
`02_Word_Farben_Klicken_FIX.docx` und ihr unveränderter normaler Download sind
im aktuellen Nachweis verzeichnet. Für den bestätigten Farb-/Klickfix wird
nichts Weiteres vom Benutzer benötigt.

## Reproduktion und Nachweise

```sh
bun test tests/unit
playwright test --config tests/qa/playwright.word-default-chrome.config.ts
playwright test tests/e2e/dossier-docx-reference.spec.ts --workers=1
```

Der zweite Befehl startet Vite selbst. Für den dritten muss die App auf Port
4173 laufen. Playwright 1.56.1, Chromium 141.0.7390.37.

[Browser-Ergebnis](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/browser-results.json)
· [Default-Optionen und Webfarben](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/browser-evidence.json)
· [Datei-Hashes, Struktur und Rasterfarben](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/verified-output.json)
· [Unit-Ergebnis](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/unit-summary.txt)
· [Bisheriger Kontakt-Download](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/contact-regression.txt)

## CI-Verlauf

Der neue Standard-Downloadfall bestand in der CI beim ersten Lauf: **1/1 PASS**
in 27,4 Sekunden, ohne Retry oder Skip. Alle fünf anderen ausgelösten Workflows
sowie zwölf Browsergruppen der Dossier-Regression bestanden ebenfalls.

Im ersten `dossier-flow`-Lauf scheiterte ein bestehender Richtext-Editor-Test:
`letter layout controls and Word-like formatting persist` erwartete drei
Vorschau-Divs, erhielt aber zwei. Die übrigen 90 Fälle bestanden. Derselbe Test
bestand lokal unverändert zuerst einzeln und danach dreimal wiederholt.
Es wurde weder eine Produktänderung für diesen Befund vorgenommen noch die
Erwartung des Tests abgeschwächt. Nur die fehlgeschlagene CI-Gruppe und ihre
abhängigen Abschlussjobs wurden erneut ausgeführt. Die Wiederholung bestand
mit **91/91 Fällen**; der anfängliche Fehler bleibt im Nachweis erhalten.

[Erster Standard-CI-Download](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/ci-default-download.txt)
· [Anfänglicher Formatierungsfehler](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/ci-initial-failure.txt)
· [Einzelwiederholung](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/formatting-focused-rerun.txt)
· [Drei weitere Wiederholungen](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/formatting-repeat-three.txt)
· [CI-Wiederholung: 91/91 PASS](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/ci-dossier-rerun.txt)

Alle sechs Workflows auf dem Produktcommit sind abgeschlossen und erfolgreich:

| Workflow                      | Nachweis                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------ |
| Dossier Regression, Versuch 2 | [44085804461](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085804461) |
| DOCX Next Stable Sidebar      | [44085804437](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085804437) |
| Dossier Visual Parity         | [44085804450](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085804450) |
| CV measured page fit          | [44085804485](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085804485) |
| Template Contact Integrity    | [44085804407](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085804407) |
| Pages build and deployment    | [44085802730](https://github.com/modebrecht/cv-cover-charm/actions/runs/44085802730) |

Die Regression bestätigt alle 13 Browsergruppen und schnelle Prüfungen; der
Commitstatus `M6 Release Candidate` ist `success`. Der optionale
`native-print-benchmark` und der nur manuell auslösbare `app-body-content`-Job
bleiben übersprungen. Die neue Standard-Downloadprüfung wurde nicht übersprungen.
Die historischen Foto-Kreisrand-REVIEW und die spätere Desktop-Word-Abnahme
werden durch erfolgreiche technische Workflows nicht pauschal freigegeben.

[Workflow-/Jobstatus und anfänglicher Fehlerverlauf](WORD_DEFAULT_CHROME_ENABLED_2026-11-17/ci-summary.json).
