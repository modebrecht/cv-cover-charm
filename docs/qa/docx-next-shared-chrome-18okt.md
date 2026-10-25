# Gemeinsame Header und Footer Farben

Status PARTIAL. Die gemeinsame Implementierung ist als `fc1a0caecc9eca9138444f9776342aefd8466ef0` auf `fix/docx-next-shared-fidelity-18okt` veröffentlicht. Der GitHub-Zugang erzeugte diesen neuen Commit mit exakt demselben Git-Tree `3cfeabb4c5416710932901727f089590cbb04a50` wie der zuvor lokal berichtete Produktcommit `901de4a8`. Es wurde keine veröffentlichte Historie umgeschrieben.

Bei aktiviertem Sync verwendet die gemeinsame Auflösung die Palette des Anschreibens für beide Dokumentrollen. Eigene Farben und ausgeschalteter Sync bleiben erhalten. Modern respektiert eigene Flächen auch nach erneuter Vorlagenauflösung; kompakte Footerflächen sind deckend. Die bestehenden Neon-/Prism-Verläufe liegen am gemeinsamen Header-/Footer-Baustein. Der SSR- und Client-Snapshot für die Nachbarpalette ist konsistent.

[Kandidat 08](docx-next-shared-chrome-18okt/08-Modern-Gemeinsame-Farben.docx) ist über denselben App-Einstieg erneut erzeugt und **bytegleich** zum früheren Kandidaten: Git-Blob `cf61812ee070cfe3d6630a986a0589279741bc75`. Das beweist die Reproduktion der Datei, keine Microsoft-Word-Abnahme.

Die vorherige Runde berichtete 30 Browserfälle auf fünf Vorlagen, 1233 Unit- und 420 DOCX-Tests. Der grosse historische QA-Sammelcommit `62119bcb` wurde nicht als solcher veröffentlicht; seine vollständigen Rohbelege sind auf diesem Branch nicht gesichert. Der aktuelle kompakte Nachweis enthält den identischen Kandidaten 08 und den [neuen CV-Zeilenlauf](docx-next-shared-reading-rows-18okt.md). Dessen 1238 Unit-/425 DOCX-Tests und fünf gespeicherte Projektfälle sind neue Nachweise; die fünf Fälle ersetzen keine erneute vollständige 30er-Farbmatrix.

Reproduktion der Farbmatrix: `scripts/dossier-chrome-palette18okt.ts`. Word-Darstellung, Speichern/Wiederöffnen, Footer-Ränder und die Gesamtmatrix aller 39 Vorlagen bleiben offen. Kein Merge, Deployment oder Standardexport-Wechsel.
