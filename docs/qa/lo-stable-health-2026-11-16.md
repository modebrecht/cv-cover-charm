# Stabile Writer-Gegenprobe: Laufzeit hier nicht verfügbar

Stand 16.11.2026 · [#202](https://github.com/modebrecht/cv-cover-charm/issues/202)
· Ausgangsstand `56c8f3df1e456858c2465f684b091654b97049db`

Die begrenzte Gegenprobe mit dem offiziellen LibreOffice **26.8.3** endet
bereits beim normalen Text-zu-PDF-Gesundheitstest. **Exitcode 1, leere
Standardausgabe und Fehlerausgabe, keine PDF.** Damit wurden keine aktuellen
Produkt-DOCX mit dieser stabilen Version geöffnet oder zurückgespeichert.
Stabile Writer-Kompatibilität bleibt **UNVERIFIED**; das Ergebnis ist weder
ein DOCX-Fehlernachweis noch eine Abnahme.

## Verifizierte Laufzeit und Versuch

Der vollständige Linux-x86-64-DEB-Download stimmt mit dem SHA-256 der
[offiziellen Spiegelübersicht](https://download.documentfoundation.org/libreoffice/stable/26.8.3/deb/x86_64/LibreOffice_26.8.3_Linux_x86-64_deb.tar.gz.mirrorlist)
überein. Die 42 Pakete wurden isoliert entpackt, ohne Systeminstallation.
Der normale mitgelieferte `soffice`-Starter meldet bei `--version` erfolgreich:

```text
LibreOffice 26.8.3.1 861effc5289d539f15c4c18d1ba8579ffd78728b
```

| Messung                                                        | Ergebnis                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Archivgrösse                                                   | 221377373 Bytes                                                    |
| Archiv-SHA-256, offiziell und lokal gleich                     | `e7cd3538e85818ff9dd9bb65386769fde927011242aace5a144989f4000dcabf` |
| Versionsprobe                                                  | Exit 0, keine Fehlerausgabe                                        |
| Text-zu-PDF mit frischem Profil und Ausgabeordner              | Exit 1 nach rund 0,49 Sekunden, keine PDF                          |
| `soffice.bin` und `libmergedlo.so` vor/nach Gesundheitsprüfung | SHA-256 unverändert                                                |
| Abgeschlossene stabile Produkt-DOCX-Speichervergleiche         | 0                                                                  |

Die Eingabe ist eine neue reine Textdatei ohne Bilder oder Controls:

```text
CVCC stable runtime health check
Synthetic plain text without images or controls.
```

Ein einziger Konvertierungsversuch verwendet den öffentlichen CLI-Aufruf;
die tatsächlichen absoluten Pfade stehen im Nachweis:

```sh
"$stable_soffice" --headless \
  "-env:UserInstallation=$fresh_profile_uri" \
  --convert-to pdf:writer_pdf_Export \
  --outdir "$fresh_output_dir" "$health_txt"
```

Erfolg hätte Exit 0 und eine lesbare einseitige PDF mit dem vollständigen
Prüftext verlangt. Es gab kein Teilergebnis. Die Ursache des Laufzeitfehlers
ist nicht geklärt. Kein LibreOfficeKit-Umweg, weiterer Versionsversuch,
Engine-Patch oder Exporter-Umbau wurde angeschlossen. Die bereits am
[24. Oktober festgelegte Grenze](docx-next-sidebar-stable-runtime-24okt.md)
gilt weiterhin: Laufzeitdebugging hier beenden.

## Konsequenz und nächster Schritt

Der [aktuelle Produktvergleich vom 15. November](lo-product-roundtrip-2026-11-15.md)
bleibt ausdrücklich auf die dort benannte LibreOfficeDev-Alpha-Laufzeit
begrenzt. Deren Foto-/Feldbindungsbefunde werden durch diesen gescheiterten
Gesundheitstest weder auf stabile Writer-Versionen übertragen noch verworfen.
Keine Anwendung, Exportfreigabe oder gespeicherte Diagnose-DOCX wurde geändert.

Alle drei GitHub-Workflows des Ausgangsstands `56c8f3d` sind erfolgreich:
[Dossier Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/43748932127),
[Dossier Visual Parity](https://github.com/modebrecht/cv-cover-charm/actions/runs/43748932159)
und [Pages](https://github.com/modebrecht/cv-cover-charm/actions/runs/43748931823).
Dies sind Ergebnisse dieses Ausgangsstands, keine neuen stabilen Writer-Tests.
Für die vorliegende reine Dokumentationsänderung wurden keine Produkt-Suites
erneut ausgeführt.

Der nächste fachliche Nachweis erfordert eine funktionierende stabile Writer-
Umgebung für dieselben erhaltenen Produktdateien oder die separate Microsoft-
Desktop-Word-Abnahme mit dem bereits vorhandenen Prüfpaket. Bei einer späteren
stabilen Writer-Prüfung müssen Speichern **und** PDF-Rendern dieselbe stabile
Laufzeit verwenden: `--soffice` allein ersetzt den separat gewählten
`--renderer` im bestehenden Runner nicht. Der bereitgestellte Alpha-Renderer
darf nicht unbemerkt als stabile Gegenprobe gezählt werden.

Kein neues Benutzer-Prüfpaket; die zwei Web/PDF-Kreis-REVIEWs bleiben eigene
offene Befunde. Ohne neue relevante Evidenz werden weder Kreisvarianten noch
die hier beendeten Office-Laufzeitversuche wiederholt.

[Maschinenlesbarer Nachweis mit Versionsprobe, Paket-/Binärhashes, exaktem
CLI-Aufruf und CI-Status](lo-stable-health-2026-11-16/evidence.json) ·
[synthetische Gesundheitstest-Eingabe](lo-stable-health-2026-11-16/health.txt)
