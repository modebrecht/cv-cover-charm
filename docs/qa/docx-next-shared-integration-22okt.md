# Gemeinsamer DOCX Integrationsstand

22. Oktober 2026. Branch: `fix/docx-next-shared-integration-22okt`. Basis: aktueller Fidelity-Kopf `7be40063856d1376acb60e917fe85599a6033dad`.

Die gesicherten Sidebar-, Pagination-, Seitenflächen- und Dokument-Skalierungs-Fixes sind hier zu einem gemeinsamen Quellstand zusammengeführt. Die lokale Projektion bestand 206 gezielte Tests und eine fokussierte strikte Typprüfung. Nach dem Ausfall der Ausführungsumgebung wurde die gleiche dokumentierte Patchfolge über die verifizierten GitHub-Quellen erneut zusammengesetzt und auf diesem Branch gesichert. Neue App-Exporte und eine vollständige Produktionsfreigabe sind damit noch nicht nachgewiesen.

## Gepinnte Quellen

| Anteil | Quellstand |
| --- | --- |
| Fidelity mit aktuellen Cover-/Avatar-Primitiven | `7be40063856d1376acb60e917fe85599a6033dad` |
| Sidebar-Fotos, Referenzen und halbe Textbreite | `f73c776e2eca6b9b0d858ee2ab997230259797ac` |
| CV-Pagination und Fusszeilenreserve | `e1f11779db1da78c08651b22b552cf6f54006e5d` |
| Durchgehende CV-Seitenfläche | `f256e1817bad54767f58cfba6c958d21a2151441` |
| Dokumenteigene Skalierung mit neuer Prüfung | `727124a7071aa6184b2e0976c6801a59ff5f14d0` |

Der bestehende 26-Dateien-Transport von Sidebar und Pagination wurde auf den aktuellen Fidelity-Stand angewendet. Darauf folgen der Seitenflächen-Patch und die Skalierung. Die ältere komplette Builder- oder Renderer-Datei wurde nicht über den aktuellen Fidelity-Stand kopiert.

## Aufgelöste Überschneidung

Ein Hunk des Skalierungs-Patches betraf eine Formatierungsstelle bei einer älteren Cover-/Avatar-Prüfung im Builder. Er lässt sich auf die neuere Fidelity-Fassung nicht direkt anwenden. Die aktuellen Fidelity-Bedingungen bleiben erhalten. Aus diesem Patch wurden im Builder ausschliesslich der Import von `scaleCvReadingFlow` und der Aufruf nach Übernahme der gemessenen CV-Textrollen ergänzt. Die übrigen Skalierungsdateien und der Seitenflächen-Patch wurden unverändert übernommen.

Die CV-Seitenfläche ist seitengebundene Dekoration. Tabellenbreiten, Content Controls, Fotos und Textpositionen behalten ihre bestehenden Besitzer. Die Skalierung greift nur im klassischen gemessenen CV-Lesefluss. Der Sidebar-Pfad bleibt davon ausgeschlossen. Die Fusszeilenreserve und die expliziten Benutzereinstellungen behalten ihre zuvor geprüften Regeln.

## Prüfung und Grenzen

| Prüfung | Ergebnis |
| --- | --- |
| Frisch verifizierte Fidelity-Anwendungsquellen vor den Patches | 417 Dateien |
| Zusätzlich benötigte Remote-Eingaben | 40 Dateien einschliesslich Root-Konfiguration |
| Gezielte Tests des gemeinsamen lokalen Standes | 206 bestanden, 0 fehlgeschlagen, 27 Testdateien, 2851 Erwartungen |
| Fokussiertes striktes TypeScript | PASS für Builder, Renderer und Browser-Skalierungshelfer |
| Unveränderte Übernahme der beiden neuen Quell-Checkpoints | 7 betroffene Quell-/Testdateien exakt gleich; Builder bewusst kombiniert |
| Repository-Lockdatei | Originalabhängigkeiten eingefroren installiert, 463 Pakete |
| Originaler Vite-Buildbefehl | Prozess meldete Exit 0; Buildlog und Artefakte danach nicht mehr lesbar |
| Neue UI-Downloads des integrierten Branches | Noch nicht ausgeführt |
| Neues natives Rendering des integrierten Branches | Noch nicht ausgeführt |
| Microsoft Word für diesen gemeinsamen Stand | Unbestätigt |

Die erste Testausführung enthielt zwei Modul-Ladefehler wegen der fehlenden jsPDF-Abhängigkeit in der partiellen Prüfumgebung. Nach Verknüpfung mit der vorhandenen echten jsPDF-4.2.1-UMD-Abhängigkeit lief die vollständige hier materialisierte 27-Dateien-Auswahl grün. Das ist kein Mock und keine Produktänderung. Diese anfänglichen Läufe werden nicht als PASS gezählt.

Die Auswahl umfasst die vorhandenen CV-/Pagination-/Modelltests, Sidebar-/Foto-/Tabellen-Tests, die kombinierte Cover-/Sidebar-Ownership-Prüfung und angrenzende Cover-/Brief-Tests. Das Repository hat weitere Unit-Testdateien; eine vollständige Repository-Suite wird nicht als bestanden erklärt.

Nach Installation der unveränderten Repository-Lockdatei wurde `vite build` mit der Originalkonfiguration gestartet. Die Prozessschnittstelle lieferte Exit 0. Beim anschliessenden Lesen des Protokolls brach die Verbindung ab; danach meldet die Umgebung ausdrücklich `environment_offline`. Deshalb wird der Build hier nur als erfolgreich beendeter Prozess, nicht als vollständig geprüfter Produktionsbuild mit inspizierten Artefakten geführt.

Die Rekonstruktion nach dem Ausfall nutzt dieselben drei veröffentlichten Patches in derselben Reihenfolge und die oben beschriebene gezielte Builder-Auflösung. Die 17 benötigten Basis-Blobs wurden unabhängig gegen ihre Git-IDs geprüft. Die veröffentlichten Dateihashes stehen im [Integrationsnachweis](docx-next-shared-integration-22okt-evidence.json). Der vollständige lokale Baum konnte nach dem Ausfall nicht erneut ausgelesen werden.

## Bestehende Word-Ergebnisse bleiben begrenzt

Die ursprüngliche 02/12-Word-Abnahme einschliesslich Speichern und erneutem Öffnen bleibt geschlossen. Sie wird nicht auf neue Paketbytes übertragen. Die bisherigen Sidebar-Foto-Ergebnisse behalten ihren genauen bisherigen Umfang. Die drei App-Downloads der rekonstruierten Skalierung und die früheren Seitenflächen-Render sind Ergebnisse der jeweiligen Einzel-Checkpoints und keine neue Abnahme dieses gemeinsamen Branches.

Die vollständige Sidebar-Geometrie, Bildbearbeitbarkeit, All-39-Fidelity und allgemeine Browser-/Word-Seitengleichheit bleiben getrennte Gates. Es wurde kein Gate abgesenkt und keine Zwischenrunde beim Benutzer angefordert.

## Nächster ausführbarer Schritt

1. Diesen gepinnten Integrationsbranch in einer wieder verfügbaren Laufzeit laden und die Quellhashes aus dem Nachweis prüfen.
2. Originale Typ-/Buildprüfungen mit der Lockdatei vollständig protokollieren und die Build-Artefakte kontrollieren.
3. Einen gebündelten App-Smoke ausführen: Modern 05 ohne Seitenanpassungsaktion, Modern 02 und Brief 12 mit ihren bestehenden Seitenaktionen sowie die bereits problematischen Sidebar-Fotofälle 04/05 und eine Fortsetzung. Texte, Controls, Originalbilder und Seitendekoration im gemeinsamen Paket prüfen.
4. Erst danach einen konsolidierten Word-Kandidaten bereitstellen. Keine Wiederholung einzelner bereits abgenommener Zwischenpakete.

**Status: gemeinsamer Code-Checkpoint veröffentlicht, lokale gezielte Tests bestanden, integrierte App-/Word-Abnahme offen.** Kein Merge nach `dev`, `main`, `render` oder in die aktiven Fidelity-/Reparaturbranches. Kein Deployment, CI-Dispatch, Produktionsschalter oder Engine-Patch.
