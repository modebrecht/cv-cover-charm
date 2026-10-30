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

Beim einzelnen **DOCX**-Download muss nur das ausgewählte Dokument ausgefüllt sein
und sein unterstütztes Profil erfüllen. Andere Dossierteile dürfen fehlen oder andere
Vorlagen und Formatierungen verwenden. Vorhandene gemeinsame Kontakt- und
Farbeinstellungen bleiben berücksichtigt; der Download verändert die gespeicherten
Dossierteile nicht.

| Dokument             | Unterstütztes Word-Profil                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titelblatt           | Modern mit der geprüften Sans-Schrift                                                                                                                                      |
| Motivationsschreiben | Modern, Sans, Kontakt-Kopfzeile und kompakte Fusszeile; einfacher Brieftext ohne Rich-Text-Formatierung, eingefügte Briefbilder oder eigene Brief-Typografie/-Seitenränder |
| Lebenslauf           | Modern mit Sidebar, Sans, Kontakt-Kopfzeile und kompakte Fusszeile                                                                                                         |

**Dossier DOCX** setzt weiterhin ein vollständig gespeichertes Dossier voraus, in dem
alle drei Teile ihre jeweiligen Word-Voraussetzungen erfüllen. Nicht unterstützte
Einstellungen werden für Einzel- und Dossierdownload getrennt angezeigt. Der
PDF-Export ist davon unabhängig.

Fest auf Seite 2 zugewiesene CV-Rubriken werden im Word-Download noch nicht unterstützt; die Anwendung verweist dafür auf den PDF-Download.

Die vier repräsentativen Dateien (Titelblatt mit Beilagen, Brief, normaler und
gespiegelter Sidebar-CV) sind nach Bearbeiten und Speichern in Desktop-Word vom
Nutzer bestätigt. Das rechte gespiegelte CV-Foto verwendet «Vor den Text» und
lässt sich direkt verschieben. Die vollständige Word-Unterstützung aller Vorlagen
ist damit noch nicht abgedeckt. Nachweis: `docs/qa/mirrored-photo-front-30okt.md`.

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
