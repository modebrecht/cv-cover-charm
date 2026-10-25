# DOCX Next — gemeinsamer CV-Typografie-Batch (20.10.2026)

## Stand / Grenzen
Branch: fix/docx-next-shared-fidelity-18okt; Basis: 644cdac8ef5b04716a5a9762adeefe846a6a0d95.
Keine Änderung von main/dev/render, kein Merge, keine Vercel-Preview (vercel.json: deploymentEnabled=false), kein produktiver Exportwechsel.
Native Sidebar und Agent A unverändert eingefroren.

## Implementiert
- Im bestehenden Browser-Messadapter werden nun effektive CV-Textrollen inklusive normaler Rubriken, Dokumenttitel, Name und textgebundenen Eintragszeilen am frischen Snapshot gemessen.
- Native DOCX erhält nur bei exakt übereinstimmender Paragraph-Identität und unverändertem Inhalt die Web-Werte für Schriftgrösse, Farbe, Gewicht, Grossschreibung, Laufweite und Zeilenhöhe sowie direkt wirkenden unteren Rand.
- Unterschiedlich formatierte zusammengesetzte Zeilen, Kontaktabsätze und gemessene Pills behalten die bestehende eigene Komposition. Kein Browser/PDF im kanonischen Builder, keine Mutation der gespeicherten Daten, keine neuen Font-Fallbacks.
- Zusätzliche Tests prüfen Übernahme, ignorierte veraltete Messwerte, Namens-Textabweichung und Quell-Immutabilität.

## Automatischer Nachweis
- 1'257 Unit-Tests bestanden (0 fehlgeschlagen, 25'618 Assertions), davon 444 DOCX-Tests.
- Typecheck und Produktions-Build bestanden; Lint 0 Fehler, 21 bestehende Warnungen.
- Formatcheck aller fünf geänderten TypeScript-Dateien bestanden; der globale Formatcheck bleibt wegen 148 anderen bestehend���q�^