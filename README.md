# CV Cover Charm

**Bewerbungsdossiers für Lehrstellen in der Schweiz erstellen und gestalten.**

CV Cover Charm ist eine browserbasierte Anwendung für ein zusammenhängendes Bewerbungsdossier aus **Titelblatt, Motivationsschreiben und Lebenslauf**. Die Dokumente lassen sich in passenden Designs bearbeiten und einzeln oder gemeinsam exportieren.

## Funktionen

- Titelblatt, Motivationsschreiben und Lebenslauf mit aufeinander abgestimmter Gestaltung
- Verschiedene Vorlagen sowie Anpassungen an Farben, Schriften, Abständen und Dokumentelementen
- Bearbeitung von Texten, Kontaktdaten, Referenzen und Bildern
- PDF-Export einzelner Dokumente und des gesamten Dossiers
- Bearbeitbarer Word-Export (DOCX) einzelner Dokumente und des gesamten Dossiers
- Dossier JSON zum Sichern und späteren Wiederherstellen des Arbeitsstands
- Lebenslauf gemessen auf eine oder zwei Seiten verteilen, mit Erhalt eigener Schriftgrössen

Im Editor befinden sich die Downloadoptionen links neben dem Menü. Zur Auswahl stehen **PDF · DOCX · Dossier JSON · Dossier PDF · Dossier DOCX**.

## Word-Export: aktueller Stand

Alle sichtbaren DOCX-Downloads verwenden den neuen gemeinsamen **DOCX-Next-Exporter**. Der frühere Word-Exporter ist nicht mehr der Standard-Download.

Der Word-Download ist derzeit noch auf vollständig gespeicherte Dossiers mit folgenden Einstellungen begrenzt:

- Vorlage **Modern** für Titelblatt, Motivationsschreiben und Lebenslauf
- Lebenslauf mit **Sidebar**
- Schrift **Sans** für Motivationsschreiben und Lebenslauf
- Kontakt-Kopfzeilen und kompakte Fusszeilen für Motivationsschreiben und Lebenslauf
- Einfacher Brieftext ohne Rich-Text-Formatierung, eingefügte Briefbilder oder eigene Brief-Typografie/-Seitenränder

Diese Voraussetzungen gelten aktuell **auch beim Download eines einzelnen DOCX-Dokuments**. Nicht unterstützte Einstellungen werden im Editor angezeigt. Der PDF-Export ist davon unabhängig.

Fest auf Seite 2 zugewiesene CV-Rubriken werden im Word-Download noch nicht unterstützt; die Anwendung verweist dafür auf den PDF-Download.

Repräsentative Browser-Downloads der unterstützten Komposition sind geprüft. Die vollständige Word-Abnahme und die Word-Unterstützung aller Vorlagen sind noch nicht abgeschlossen.

## Lokal entwickeln

Voraussetzungen: Node.js und [Bun](https://bun.sh/).

```bash
git clone https://github.com/modebrecht/cv-cover-charm.git
cd cv-cover-charm
bun install
bun run dev
```

### Prüfungen

```bash
bun run test:unit
bun run typecheck
bun run lint
bun run build
```

## Entwicklungsbranches

- **`dev`** – aktive Entwicklung und Integration
- **`render`** – Branch für die Browser-Abnahme; nicht automatisch per Vercel bereitgestellt
- **`main`** – Veröffentlichungsbranch; automatisches Vercel-Deployment ist derzeit nur für `main` konfiguriert

## Projektdateien und Datenschutz

Der gespeicherte Bearbeitungsstand wird im Browser (`localStorage`) verwaltet. Über **Dossier JSON** lässt sich ein Projekt sichern und später wieder laden. Browserdaten können verloren gehen; wichtige Entwürfe deshalb zusätzlich als JSON sichern.

Bewerbungsdaten, Fotografien und Exporte können personenbezogene Informationen enthalten. **Keine echten Bewerbungen, privaten JSON-Dateien, Fotos oder Word-/PDF-Exporte in dieses öffentliche Repository committen.**
