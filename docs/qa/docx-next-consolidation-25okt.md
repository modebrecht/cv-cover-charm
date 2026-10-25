# DOCX-Konsolidierung vom 25. Oktober 2026

Der gemeinsame Integrationsstand ist über [PR #185](https://github.com/modebrecht/cv-cover-charm/pull/185) regulär nach `dev` gemergt. **Ab jetzt ist `dev` die einzige aktive gemeinsame Entwicklungsbasis dieses DOCX-Arbeitsstrangs.** Die acht bisherigen DOCX-Branches bleiben unverändert als historische Nachweise bestehen; dort keine weitere Bearbeitung und keine Synchronisierungsmerges. Die älteren ausschliesslichen Arbeitsanweisungen für `fix/docx-next-shared-integration-22okt` sind damit überholt.

## Tatsächliche Übernahme

- Alter `dev`-Kopf: `8901a830a792d75e9e792345c5180827218b4e1e`.
- Übernommener Integrationskopf: `a54070eab5b4a16d25bc386cd25b3296a824286e`.
- Mergecommit: `781c22a4fb658fe5f29faf39efde24b96a62477c`, mit genau diesen beiden Eltern.
- Dateibaum des tatsächlichen Merges: `aab23f195dd3354b4dc8343ab0610815fdc8919a`, exakt gleich dem geprüften Integrationskopf.
- Vorher 158 Commits voraus / 0 zurück. Vollständiger Baumvergleich: 1’146 veränderte Dateipfade; GitHub zählt 1’145 Dateien. Darunter 167 Produktquellen-Pfade, 161 Tests/Fixtures, 76 Scripte, 739 Dokumentations-/QA-Pfade und 3 Root-Dateien. Der vollständige Baumvergleich umgeht die 300-Dateien-Grenze des Compare-Endpunkts.
- `main` und `render` unverändert; keine Branch-Löschung, keine umgeschriebene Historie, kein Squash/Rebase/Force-Push. Kein CI-Dispatch oder manuell ausgelöstes Deployment.

## Übernahmeprüfung

Alle 18 eigenständigen Vorgängercommits wurden zugeordnet; neun enthalten Produktänderungen in insgesamt 17 Quellpfaden. Kein Produktpfad fehlt. Die drei ursprünglichen Transportpatches wurden auf den gepinnten Fidelity-Dateien erneut angewendet: alle 32 Code-, Test- und Hilfsdateien reproduzieren den veröffentlichten ersten Integrationscommit `90216cb21ffeaf3b555ebde48b5e65c7bc64f602` bytegenau. Der bekannte ältere Formatierungshunk im Builder bleibt wie damals ausgelassen; die neueren Fidelity-Bedingungen bleiben erhalten. Alle 45 Dateihashes des damaligen Integrationsmanifests stimmen mit diesem Commit überein. Kein fehlender Produktfix gefunden.

Einige historische QA-Berichte sowie drei frühere Bildprüfscripte wurden nicht in den Integrationsbaum kopiert. Ihre Originale bleiben über die unveränderten Vorgängerbranches und die im Nachweis gepinnten Commit-IDs erreichbar. Das ist kein Anlass, die alten Teilbranches erneut zu mergen.

## Prüfung und weiterhin getrennte Freigaben

Der letzte Produktstand bestand 1’425 Tests ohne Fehler, Typecheck und Produktionsbuild. Der anschliessende Integrationskopf dokumentiert ausschliesslich die Benutzerabnahme. Diese Prüfungen wurden für den unveränderten Merge nicht wiederholt. GitHub meldete den PR vor dem Merge konfliktfrei; der Vercel-Status und der Vercel-Feedbackcheck waren erfolgreich. Ein neuer GitHub-Actions-Testlauf lag nicht vor und wird nicht behauptet.

Der Benutzer hat zur aktuellen `CV-Foto.docx` bestätigt: «sieht super aus, lässt sich wie ein normales bild verschieben done». Darstellung und normale Fotobewegung in Word sind abgenommen; die gezielte Fotoreparatur ist abgeschlossen. Keine neue Foto-, Umbenennungs- oder Save1/Save2-Matrix anfordern. Der Referenzfix ist in derselben Datei enthalten; der konkrete Referenz-Zeilenumbruch wurde nicht separat vom Benutzer bestätigt. Rubrikverschiebung bleibt optional.

Die vollständige Abnahme aller 39 Vorlagen und eine allgemeine Exportfreigabe bleiben getrennt. Die normale Exportstrecke und ihre Sperren wurden durch die Konsolidierung nicht geöffnet; der gewöhnliche Sidebar-Fotopfad bleibt eine ausdrückliche Kandidatenoption. Die bestehende Vercel-Branch-Konfiguration bleibt erhalten.

[Maschinenlesbarer Konsolidierungsnachweis](docx-next-consolidation-25okt-evidence.json).
