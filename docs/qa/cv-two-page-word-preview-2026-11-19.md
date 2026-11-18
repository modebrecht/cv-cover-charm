# Zweiseitiger Modern-CV im Word-Prüfexport

Am 19.11.2026 mit LibreOffice Writer Dev 26.8.0.0.alpha0
(`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`) unter Linux geprüft.
Alle fünf DOCX-Prüfexporte ergeben genau zwei A4-Seiten.

Die Dateien stammen aus dem [CI-Artefakt](https://github.com/modebrecht/cv-cover-charm/actions/runs/44411857256/artifacts/14476959864)
zum Produktcommit [`c118e6e`](https://github.com/modebrecht/cv-cover-charm/commit/c118e6e567f41f2d16fe6b90b01f02dd9dc69637).
Der Artefakt-ZIP entspricht dem von GitHub angegebenen SHA-256
`d1288b61dad54719d422afa561bcd12d01dfc1182b65e89113b14386d4b813da`.
Die fünf Dateien lassen sich mit dem Filter `two-page Word preview` in
[`playwright.two-page-fit.config.ts`](../../tests/qa/playwright.two-page-fit.config.ts) erzeugen.

| Testdatei | Variante | A4-Seiten | Textfelder Seite 1 / 2 | Foto | Referenz |
| --- | --- | ---: | ---: | --- | --- |
| `word-preview-left.docx` | Kurz, Sidebar links | 2 | 22 / 21 | Seite 1 | Seite 2 |
| `word-preview-right.docx` | Kurz, Sidebar rechts | 2 | 22 / 21 | Seite 1 | Seite 2 |
| `word-preview-narrow.docx` | Sidebar links, 22 % | 2 | 22 / 21 | Seite 1 | Seite 2 |
| `word-preview-wide.docx` | Sidebar rechts, 50 % | 2 | 22 / 21 | Seite 1 | Seite 2 |
| `word-preview-long.docx` | Lang, sieben zusätzliche Praxiseinsätze | 2 | 43 / 28 | Seite 1 | Seite 2 |

Die zehn gerenderten Seiten wurden visuell auf den Umbruch und abgeschnittene
Inhalte geprüft. Für die Textprüfung wurden die Werte der markierten
DOCX-Inhaltsfelder ohne Leerzeichen und weiche Trennzeichen mit dem extrahierten
Text auf der jeweils vorgesehenen PDF-Seite verglichen. Alle Werte waren
vorhanden. Im langen Fall stehen Praxiseinsätze 1–3 vollständig auf Seite 1,
Praxiseinsätze 4–7 vollständig auf Seite 2. Die Referenz folgt dort auf den
letzten Einsatz. Das Testfoto erscheint einmal auf Seite 1.

Für den Desktop-Word-Abgleich eignen sich dieselben kurzen und langen Dateien:

| Datei | SHA-256 |
| --- | --- |
| `word-preview-left.docx` | `eb847990b26657a9a876b786d1b9190cca0b424b88dc864ee12833292b78075d` |
| `word-preview-long.docx` | `e9d0d6dfb610afec8538cc0817b4ce104ed9d724968932c9700a69f00a3cae3c` |

Der nächste Schritt für [#205](https://github.com/modebrecht/cv-cover-charm/issues/205)
ist derselbe Seiten- und Inhaltsabgleich in Microsoft Word Desktop. Der reguläre
Download für explizit auf Seite 2 verteilte CV-Rubriken verweist bis zur Freigabe
auf PDF.
