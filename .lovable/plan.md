# Titelblatt-Generator für Lehrstellenbewerbung (Schweiz)

Einseitige Web-App: professionelles A4-Deckblatt für eine Schweizer Lehrstellenbewerbung, Live-Vorschau, PDF-Download.

## Fokus

- A4-Titelblatt (nicht Lebenslauf), deutschsprachig (CH)
- Foto **mittig** und **optional**
- Alle Felder optional – **leere Felder werden im Preview/PDF komplett weggelassen** (kein leerer Platzhalter, kein Label, Abstände passen sich an)
- Pro Vorlage individuelle **Farbwahl** (Hauptfarbe, Sekundärfarbe, ggf. dritte Akzentfarbe)

## Felder (alle optional)

- Bewerbung als … (Dropdown gängiger CH-Lehrberufe EFZ/EBA + Freitext)
- Lehrbeginn (z.B. "August 2027")
- Vorname, Nachname
- Adresse, PLZ/Ort
- Telefon (CH-Format), E-Mail, Geburtsdatum
- Lehrbetrieb (Firma), Ansprechperson, Adresse Lehrbetrieb
- Ort + Datum (mit heute vorausgefüllt, CH-Format TT.MM.JJJJ)
- Foto-Upload (mit "Entfernen"-Button)

Regel im Renderer: jedes Feld wird nur ausgegeben, wenn Wert vorhanden. Ganze Blöcke (z.B. Empfänger-Adresse, Kontakt) verschwinden, wenn alle enthaltenen Felder leer sind. Templates nutzen dafür flex/grid mit `gap`, damit keine leeren Lücken entstehen.

## Vorlagen (3), jede mit Farb-Chooser

1. **Klassisch** – Serif, ruhig, zentrierte Komposition. Farben:
   - Hauptfarbe (Textakzent / feine Trennlinie)
   - Sekundärfarbe (Hintergrund, standardmässig Cremeweiss)
2. **Modern** – Sans-Serif, Akzentbalken. Farben:
   - Hauptfarbe (Akzentbalken)
   - Sekundärfarbe (Text-Akzent)
   - Hintergrundfarbe
3. **Freundlich** – Farbiger Block/Kreis hinter zentriertem Foto. Farben:
   - Hauptfarbe (Block)
   - Sekundärfarbe (zweiter Formakzent)
   - Akzentfarbe (Typo-Highlight)
   - Hintergrundfarbe

Jede Vorlage funktioniert mit und ohne Foto (Fallback: Initialen-Monogramm oder rein typografische Komposition).

Color-Chooser: pro Vorlage sichtbare Swatches + native `<input type="color">` je Slot. Sinnvolle Defaults pro Vorlage, "Zurücksetzen"-Button. Farben werden per inline CSS-Custom-Properties (`--tpl-primary`, `--tpl-secondary`, `--tpl-accent`, `--tpl-bg`) an das Vorlagen-Root gebunden – Templates greifen ausschliesslich über diese Variablen zu, damit die Wahl live wirkt und im PDF landet.

## Seite & Ablauf

- Route `/` (ersetzt Placeholder): Split-Layout, links Formular + Vorlagenauswahl + Farb-Chooser, rechts A4-Preview. Mobil untereinander.
- Sticky "PDF herunterladen" → `Bewerbung-Titelblatt-<Nachname>.pdf`
- Reine Client-App

## Technische Umsetzung

- `src/routes/index.tsx` – State via `useState` (Formdaten, gewählte Vorlage, Farb-Map pro Vorlage), eigenes `head()` mit CH-Titel/Description/OG
- `src/components/cover/CoverForm.tsx` – alle Felder, Foto-Upload (FileReader → dataURL, entfernbar), Berufs-Dropdown
- `src/components/cover/TemplatePicker.tsx` – 3 Thumbnails
- `src/components/cover/ColorChooser.tsx` – rendert die für die aktive Vorlage definierten Farb-Slots (Anzahl variabel), Swatch + Colorpicker + Reset
- `src/components/cover/CoverPreview.tsx` – wählt Template, setzt Farb-Variablen via `style`, rendert A4-Verhältnis
- `src/components/cover/templates/{Klassisch,Modern,Freundlich}.tsx` – jedes Template exportiert seine Slot-Definition (`slots`, `defaults`) und rendert konditional (leere Felder weglassen)
- PDF: `html2canvas-pro` + `jspdf` via `bun add`, Preview-DOM → Canvas → A4-PDF
- Semantische Tokens in `src/styles.css` (App-Chrome, nicht Vorlagenfarben – die kommen aus Inline-Vars)
