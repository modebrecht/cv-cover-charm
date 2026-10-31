# ONLYOFFICE: begrenzter DOCX-Next-Proof-of-Concept

Der Word-Abschluss und die Klassifikation stehen in
[word-commit-review-31okt.md](word-commit-review-31okt.md). Der normale
Produktexport bleibt unverändert. Dieser Versuch vergleicht Konverter und ist
keine Word-Freigabe oder Umstellung des Downloads.

## Umfang

Genau drei vollständige dreiseitige DOCX-Next-Dossiers entstehen mit dem echten
Renderer aus den vorhandenen App-Testdaten. Es wird kein Test-XML von Hand
zusammengesetzt und kein gespeichertes Paket nachträglich repariert.

| Datei              | Herkunft                                                             | Bild                                              |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------- |
| 01-normal          | sidebarFixture left, Renderer mit Standardoptionen                   | kein Foto, Negativkontrolle                       |
| 02-inline-photo    | sidebarFixture photo-left, Renderer mit Standardoptionen             | eingebettetes rundes Foto                         |
| 03-word-free-photo | sidebarFixture photo-free-main, explizite Rich-Text-Diagnoseoptionen | das bereits in Word geprüfte frei platzierte Foto |

Datei 03 entspricht bytegenau der früheren Rendererquelle (SHA-256 beginnt
`e70655fa`). Die beiden anderen Dateien sind Standardausgaben des isolierten
DOCX-Next-Renderers. Sie ersetzen keinen Browsernachweis des normalen Downloads.
Die normalisierten synthetischen 120×180-Fotodaten stammen aus der bereits
versionierten, hashgeprüften App-Fixture; keine privaten Bilder oder Downloads
sind zum Erzeugen der Quellen erforderlich.

ONLYOFFICE Document Builder 10.0.0 wird nur entpackt, nicht ins System installiert.
Der offizielle Linux-x86_64-Release ist per SHA-256 gebunden:
`194f348429239fbcee4d1c29861550127885facdbb700706c7bb1429a21b33e4`.
Auch docbuilder, libdoctrenderer und x2t werden gegen den Archivinhalt geprüft.
Die [offizielle CLI-Dokumentation](https://api.onlyoffice.com/docs/document-builder/using-cli/overview)
beschreibt das Öffnen/Speichern über Skripte. Die
[kostenlose Version erzeugt Wasserzeichen](https://api.onlyoffice.com/docs/document-builder/get-started/installing).
Diese bleiben vollständig sichtbar und werden weder aus PDFs noch aus SSIM
entfernt. Damit ist dieser Versuch keine faire Rangliste der intrinsischen
Darstellungsqualität zweier lizenzgleicher Konverter.

Je Datei: ein LibreOffice-Referenz-PDF, drei ONLYOFFICE-PDFs (Quelle, Save 1,
Save 2) und zwei echte ONLYOFFICE-DOCX-Saves. Quellen bleiben unverändert.
Das sind zwölf PDFs mit insgesamt 36 Seiten und sechs native DOCX-Saves.
`rasterize_pdf` und `pair_scores` werden direkt aus dem unveränderten vorhandenen
`scripts/dossier_visual_parity.py` verwendet. SSIM bleibt beobachtend. Zusätzlich
prüft eine ausdrücklich auf das synthetische rot/blaue Testfoto begrenzte
Kontrolle dessen Sichtbarkeit auf der CV-Seite in allen drei ONLYOFFICE-Phasen.
Sie ist kein allgemeiner Fotodetektor.

## Bestehender Workflow

Es gibt genau eine geänderte Workflow-Datei:
`.github/workflows/dossier-visual-parity.yml`. Beim manuellen Start auf dem
Arbeitsbranch `mode=onlyoffice-poc` wählen. Dann läuft ausschließlich der kleine
PoC-Job. `mode=full` bleibt Standard; die vorhandenen x39-Quell-/Vergleichsschritte
bleiben erhalten. Der render-Push führt weiterhin den x39-Lauf aus.
Die Nebenläufigkeit ist pro Modus getrennt. Kein zweiter Workflow wurde angelegt.

Das Ergebnis-Artefakt `dossier-visual-parity-onlyoffice-poc` enthält Quellen,
SHA-Bindungen, PDFs, DOCX-Saves, Metriken und Vergleichsbilder. Die Spalten der
Vergleichsbilder sind links LibreOffice, mittig ONLYOFFICE Quelle und rechts
ONLYOFFICE Save 2. Fehlerhafte oder unvollständige Konvertierung und ein fehlendes
erwartetes Testfoto lassen den kleinen PoC fehlschlagen; ein niedriger SSIM allein
ist weiterhin kein Fehlerstatus und kein neues Produkt-Release-Gate.

Lokaler Aufruf mit vorhandenen Parity-Abhängigkeiten und entpacktem SDK:

```text
bun scripts/docx-next-onlyoffice-sources.ts NEW_SOURCES
python -m unittest discover -s scripts -p test_docx_next_onlyoffice_poc.py -v
python scripts/docx_next_onlyoffice_poc.py --sources NEW_SOURCES --out NEW_REPORT --onlyoffice SDK/docbuilder --archive OFFICIAL_ARCHIVE
```

Optional verwendet `--lo-kit EXISTING_ADAPTER` den bereits eingerichteten lokalen
LibreOfficeKit-Referenzadapter; CI nutzt die bestehende LibreOffice-CLI-Funktion.
Vorhandene Quellen-/Berichtsordner werden nicht überschrieben. Alle erzeugten
Binärdateien verbleiben im ignorierten Artefaktordner.

Die sieben Tests prüfen Quellenänderung, Duplikate, Pfad-/Erwartungsmanipulation,
Überschreibschutz, fremden Engine-Digest, falsche Seitenzahl und einen echten
PDF-Gegenbeleg: Ein fehlendes Foto kann trotz Gesamt-SSIM über 0,98 vorliegen.
Sie täuschen keine native Konvertierung vor. Die native Dreiermatrix wird
gesondert ausgeführt und im Ergebnisbericht dokumentiert.

## Grenzen und nächste Schritte

Der PoC prüft ONLYOFFICEs eigene Darstellung und eigene Saves. Er hat die neuen
ONLYOFFICE-Rückläufe noch nicht in Desktop Word abgenommen. Als Nächstes sind der
kleine CI-Modus auf diesem Branch, anschließend der Word-Abgleich der beiden
Fotofälle und eine getrennte Bewertung von Wasserzeichen, Schriftmetriken und
Umbrüchen sinnvoll. Eine spätere Konverterentscheidung braucht zusätzliche
Belege; der normale Produktexport wird hier nicht geändert.
