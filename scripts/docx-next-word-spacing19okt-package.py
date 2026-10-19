"""Package only unresolved Word cases 04/09 and their same-source references."""
import json
import shutil
import sys
from pathlib import Path

import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader

app, renders, before, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
for name in ("Referenzen", "Projekte", "Nachweise", "Vorschau"):
    (out / name).mkdir(exist_ok=True)
items = json.loads((app / "results.json").read_text())
selected = [x for x in items if x["id"][:2] in ("04", "09")]
assert len(selected) == 2
for item in selected:
    key, n = item["id"], item["id"][:2]
    shutil.copy2(app / item["file"], out / item["file"])
    shutil.copy2(app / key / "Web-PDF.pdf", out / "Referenzen" / f"{key}-App-PDF.pdf")
    shutil.copy2(renders / n / (key + ".pdf"), out / "Referenzen" / f"{key}-LibreOffice-Vorschau.pdf")
    proof = json.loads((app / key / "proof.json").read_text())
    (out / "Projekte" / (key + ".json")).write_text(json.dumps(proof["restoredProject"], ensure_ascii=False, indent=2) + "\n")
    shutil.copy2(app / key / "proof.json", out / "Nachweise" / (key + "-proof.json"))

(out / "00-Pruefen.md").write_text("""# Nachtrag zu 04 und 09

04 Farben, 05 Referenzen und 06 sind als gut erfasst. Keine erneute Zehnerrunde.

1. **04:** Zweite CV-Seite ansehen (Dossierseite 4). Im Projekt ist «Oberer Rand ab Seite 2» ausdrücklich auf 40 mm gesetzt: 8 mm unter dem 32-mm-Header. Referenzen liegen auch im normalen App-PDF auf Seite 2. Keine App-Defaults geändert.
2. **09:** Kontaktblock auf der ersten CV-Seite ansehen (Dossierseite 3). Die zusätzliche native Kontaktüberschrift entfällt. Kontaktzeilen und Geburtsdatum verwenden die Web-Abstände; die Werte stehen bündig. Name und Dokumenttitel behalten ihre bisherige native Typografie.
3. **Einmal gemeinsam antworten:** `04 Abstand ok/nok; 09 Kontaktabstände ok/nok`. Bei Abweichung möglichst Word-PDF oder Screenshot mit Dateinummer/Seite.

Die zwei DOCX sind tatsächliche App-Downloads. Unter Referenzen liegen normale App-PDFs aus demselben Projekt und ausdrücklich bezeichnete LibreOffice-Vorschauen. Die zweiseitige Übersicht zeigt die relevanten Ausschnitte. Eine LibreOffice-Vorschau ist keine Word-Abnahme.

437 DOCX-Tests sowie Kontakt-/Integrations-/Geometrieprüfungen bestanden. Neun App-Dossiers automatisiert geprüft, 35 native Vorschauseiten und 15 Layoutbeziehungen geprüft. Einzelheiten und bekannte Grenzen stehen unter Nachweise. Keine Sidebar-/Agent-A-Arbeit, kein Merge, Deployment oder Standardexportwechsel.

Die Word-Abnahme dieses Nachtrags bleibt offen. Andere Schriften, gesperrte Coverfamilien, sämtliche freien Kontaktkompositionen und All-39 sind damit nicht freigegeben.
""")

def crop(pdf_path, page, rect, name):
    doc = fitz.open(pdf_path)
    doc[page].get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(rect)).save(out / "Vorschau" / name)
    return out / "Vorschau" / name

def contact_clip(pdf_path):
    doc = fitz.open(pdf_path)
    # End cleanly after the birthday; do not cut into the next rubric/text.
    return (45, 85, 550, doc[2].search_for("14.03.2010")[0].y1 + 6)

four = next(x for x in selected if x["id"].startswith("04"))["id"]
nine = next(x for x in selected if x["id"].startswith("09"))["id"]
images = [
    ("04 Header auf der zweiten CV-Seite", "CV-Folgerand 40 mm gespeichert: 8 mm unter dem Header. Keine neuen Defaults.", [
        ("Normales App-PDF aus demselben Projekt", crop(app / four / "Web-PDF.pdf", 3, (45, 0, 550, 190), "04-App-PDF.png")),
        ("DOCX-Vorschau aus LibreOffice", crop(renders / "04" / (four + ".pdf"), 3, (45, 0, 550, 190), "04-DOCX.png")),
    ]),
    ("09 Abstände im Kontaktblock", "Die Wertespalte bleibt bündig. Zusätzliche Kontaktüberschrift entfernt.", [
        ("Vorher: DOCX Revision 2 aus LibreOffice", crop(before, 2, contact_clip(before), "09-Vorher.png")),
        ("Nachher: DOCX dieses Nachtrags aus LibreOffice", crop(renders / "09" / (nine + ".pdf"), 2, contact_clip(renders / "09" / (nine + ".pdf")), "09-Nachher.png")),
    ]),
]
pdf = canvas.Canvas(str(out / "00-Uebersicht.pdf"), pagesize=A4)
pdf.setTitle("Word Nachtrag 04 und 09")
for index, (title, note, figures) in enumerate(images):
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(16 * mm, 278 * mm, title)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(16 * mm, 268 * mm, note)
    for y, (label, image) in zip((247, 153), figures):
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(16 * mm, y * mm, label)
        pdf.drawImage(ImageReader(str(image)), 16 * mm, (y - 76) * mm, width=178 * mm, height=70 * mm, preserveAspectRatio=True, anchor="nw")
    pdf.setFont("Helvetica", 9)
    pdf.drawString(16 * mm, 55 * mm, "Bitte nur 04 und 09 in Microsoft Word pruefen und einmal gesammelt antworten.")
    pdf.drawString(16 * mm, 49 * mm, "Die Korrekturen sind in Word noch nicht abgenommen.")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(16 * mm, 16 * mm, "App-PDFs, Projektdateien und technische Nachweise liegen im Paket.")
    pdf.drawRightString(194 * mm, 16 * mm, f"{index + 1}/2")
    pdf.showPage()
pdf.save()
print(json.dumps({"docx": len(selected), "overviewPages": 2, "path": str(out)}))
