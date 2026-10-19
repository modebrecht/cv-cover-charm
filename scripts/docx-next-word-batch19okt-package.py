"""Package numbered app downloads, Web references and a compact visual guide."""
import html
import json
import shutil
import sys
from pathlib import Path
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

app, renders, validation_file, out = map(Path, sys.argv[1:])
out.mkdir(parents=True, exist_ok=True)
items = json.loads((app / "results.json").read_text())
validation = json.loads(validation_file.read_text())
checked = {x["id"]: x for x in validation["results"]}
for folder in ["Referenzen", "Projekte", "Nachweise", "Vorschau"]:
    (out / folder).mkdir(exist_ok=True)
shutil.copy2(app / "results.json", out / "Nachweise/app-downloads.json")
shutil.copy2(validation_file, out / "Nachweise/validation.json")

readme = """# Word Abnahme Batch 19 Oktober 2026

Zehn echte App-Exporte. Bitte die DOCX-Dateien 01 bis 10 nacheinander in Desktop Microsoft Word öffnen und einmal gesammelt Rückmeldung geben.

1. **Visuelle Runde:** Deckblatt, Anschreiben und sämtliche CV-Seiten kurz ansehen. Achten auf überlappende/fehlende Texte, Pills, Header-/Footer-Flächen, Spalten und Bildausschnitt. In 01 sind insgesamt 3 Seiten vorgesehen, in 02 insgesamt 4; die Ein-/Zweiseiten-Aktion betrifft den CV.
2. **Kurzer Bearbeitungstest nur mit 06 und 10:** Im Deckblatt August 2028 zu August 2029 ändern, einen kurzen Satz im Anschreiben ändern, speichern, schliessen und erneut öffnen. Prüfen, ob Text, Foto und Seitenaufteilung erhalten bleiben. Diese zwei Dateien decken beide Coverfamilien und beide Fototypen ab.
3. **Eine Rückmeldung:** z. B. `01 ok; 02 ok; 05 Seite 4 Referenz zu weit rechts; 06/10 nach Wiederöffnen ok`. Nur bei Abweichungen Screenshot/Word-PDF und möglichst die gespeicherte DOCX zurückgeben. Nicht jede Kleinigkeit einzeln abnehmen.

`00-Uebersicht.pdf` zeigt die zehn Fälle und ihre Prüfschwerpunkte. `00-Uebersicht.html` enthält vergrösserbare Web-Bilder und direkte Links zu den Dateien und PDF-Referenzen.

## Grenzen dieser Runde

- Microsoft-Word-Darstellung, Bearbeitung und Save/Reopen sind **noch nicht abgenommen**. Die DOCX-Vorschaubilder stammen aus unverändertem LibreOfficeDev 26.8 und dienen nur als ergänzende Prüfung.
- Zwei Coverfamilien sind enthalten: Modern und Brief. Verlauf, Neon und Freundlich/Warm bleiben wegen der bereits dokumentierten Cover-Abweichungen gesperrt. Native Sidebar/Agent A bleiben eingefroren. Die All-39-Abnahme ist offen.
- Sans ist in den Testprojekten ausdrücklich gespeichert. Der Browser verwendet das geprüfte Liberation-Sans-Profil; Word wird Arial angefordert. Andere Schriften und Windows-Schriftersetzungen sind nicht durch diesen Batch freigegeben.
- Modern 01/02 verwenden die echte Ein-/Zweiseiten-Aktion. Die anderen Fälle wurden ohne diese Aktion exportiert; dort können zwei native CV-Seiten gegenüber einer Web-CV-Seite auftreten. Das ist dokumentiert und keine neue pauschale Verdichtung.
- Brief 08-10 behalten die vorhandene native CV-Komposition, darunter die zusätzliche Kontaktüberschrift und gestapelte Zeilen. Das ist keine Freigabe identischer Web-/Word-CV-Geometrie für Brief.
- Pill-Text bleibt nativ bearbeitbar. Die getrennte Hintergrundfläche vergrössert sich bei beliebig längerem Word-Text nicht automatisch. Die gesperrte Pill-Gruppierung wurde nicht aktiviert.
- Die Web-PDFs sind echte normale App-Downloads aus demselben Zustand. Manche Covertexte liegen dort in der Rasterebene und sind nicht vollständig extrahierbar; die Textprüfung und ihre Ausnahmen sind in `Nachweise/validation.json` erfasst. Es wird keine vollständige Cover-Suchbarkeit behauptet.
- Fotos in 06/10 sind bewusst farbige Crop-Testkarten, keine Bewerbungsfotos. Original-PNG-Daten sind in den DOCX-Dateien erhalten.

## Technischer Stand

Gemeinsame Korrekturen: schmale Datumsspalten und Sprachspalten verwenden wie im Web 20 statt 27 mm; reine E-Mail-/Zusatz-Referenzen bleiben im klassischen Web-CV sichtbar. Seitenpreset und gespeicherte Einstellungen gelangen unverändert durch Restore/Reload und Export.

1246 Unit-Tests einschliesslich 433 DOCX-Tests bestanden. Typecheck, Lint der geänderten Dateien, Formatprüfung und Build bestanden. 10/10 Projekt-Restores, unveränderter gespeicherter Zustand, tatsächlicher UI-DOCX-Download bytegleich zur frischen App-Erzeugung und 10 normale PDF-Downloads. 39 ergänzend gerenderte A4-Seiten, 805 native Textfelder und 49 CV-Pill-Flächen geprüft. Word-Freigabe bleibt offen.

Arbeitsbranch: `fix/docx-next-shared-fidelity-18okt`; Ausgangspunkt `702f714d348d698f911145406ca61b801f053c45`. Kein Merge, Deployment oder Wechsel des Standardexports.
"""
(out / "00-START-HIER.md").write_text(readme)

cards = []
for item in items:
    key = item["id"]
    number = key[:2]
    source = app / key
    v = checked[key]
    shutil.copy2(app / item["file"], out / item["file"])
    shutil.copy2(source / "Web-PDF.pdf", out / "Referenzen" / f"{key}-Web-PDF.pdf")
    proof = json.loads((source / "proof.json").read_text())
    (out / "Projekte" / f"{key}.json").write_text(json.dumps(proof["restoredProject"], ensure_ascii=False, indent=2)+"\n")
    (out / "Nachweise" / f"{key}-proof.json").write_text(json.dumps(proof, ensure_ascii=False, indent=2)+"\n")
    for p in source.glob("Web-*.png"):
        image = Image.open(p).convert("RGB"); image.thumbnail((700, 990))
        image.save(out / "Vorschau" / f"{key}-{p.name}")
    for page in [1, 3]:
        image = Image.open(renders / number / f"page-{page}.png").convert("RGB")
        image.thumbnail((700, 990)); image.save(out / "Vorschau" / f"{key}-DOCX-{page}.png")
    title = key[3:].replace("-", " ")
    gallery = "".join(f'<figure><a href="Vorschau/{html.escape(key)}-{html.escape(p)}"><img loading="lazy" src="Vorschau/{html.escape(key)}-{html.escape(p)}" alt="{html.escape(p)}"></a><figcaption>{html.escape(p.replace(".png", ""))}</figcaption></figure>' for p in item["captures"])
    cards.append(f'''<article id="case-{number}"><div class="top"><b class="number">{number}</b><div><h2>{html.escape(title)}</h2><p>{html.escape(item['purpose'])}</p></div></div>
    <p class="counts">CV-Seiten: Web {item['webCvPages']} · DOCX-Vorschau {v['supplementalNativeCvPages']} · Word offen</p>
    <div class="links"><a href="{html.escape(item['file'])}">DOCX öffnen</a><a href="Referenzen/{html.escape(key)}-Web-PDF.pdf">Web-PDF</a><a href="Projekte/{html.escape(key)}.json">Projektdatei</a></div>
    <div class="gallery">{gallery}</div><details><summary>Ergänzende DOCX-Vorschau aus LibreOffice</summary><div class="gallery"><figure><a href="Vorschau/{html.escape(key)}-DOCX-1.png"><img loading="lazy" src="Vorschau/{html.escape(key)}-DOCX-1.png" alt="DOCX Cover"></a><figcaption>DOCX Cover</figcaption></figure><figure><a href="Vorschau/{html.escape(key)}-DOCX-3.png"><img loading="lazy" src="Vorschau/{html.escape(key)}-DOCX-3.png" alt="DOCX CV"></a><figcaption>DOCX CV Anfang</figcaption></figure></div></details></article>''')

page = '''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Abnahme Batch 19 Oktober 2026</title><style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f6;color:#182331;font:15px/1.5 system-ui,sans-serif}header,main{max-width:1200px;margin:auto;padding:28px}h1{font-size:30px;margin:0 0 10px}h2{font-size:18px;margin:0}p{margin:5px 0 12px}.notice{background:#fff5dd;border-radius:10px;padding:16px}main{padding-top:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}article{background:white;border:1px solid #dce1e7;border-radius:12px;padding:20px}.top{display:flex;gap:12px}.number{background:#244a61;color:white;border-radius:8px;padding:8px;height:40px}.counts{font-size:13px;color:#586779}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:7px 11px;border:1px solid #c9d5dd;border-radius:6px;color:#214b62;text-decoration:none;font-weight:600}.gallery{display:flex;overflow-x:auto;gap:12px;padding-top:14px}figure{margin:0;min-width:140px;max-width:190px}img{width:100%;border:1px solid #d6dce1;display:block}figcaption{font-size:12px;color:#62707d;margin-top:5px}summary{cursor:pointer;font-size:13px;margin-top:15px}a{color:#1c526f}li{margin:5px 0}@media(max-width:780px){main{grid-template-columns:1fr}header,main{padding:16px}}@media print{main{display:block}article{break-inside:avoid;margin-bottom:16px}}
</style><header><h1>Word Abnahme Batch 19 Oktober 2026</h1><p>Zehn echte App-Dossiers · zwei Coverfamilien · eine gemeinsame Rückmeldung</p><div class="notice"><b>Word noch offen.</b> Web-Bilder und Web-PDF stammen aus demselben Projekt wie die DOCX-Dateien. Ergänzende DOCX-Bilder sind LibreOffice-Vorschauen.</div><ol><li>Dateien 01 bis 10 in Word nacheinander kurz ansehen. 01 soll einen CV auf einer Seite, 02 auf zwei Seiten zeigen.</li><li>Nur in 06 und 10: August 2028 zu August 2029 ändern, einen Satz im Anschreiben ändern, speichern, schliessen, wieder öffnen.</li><li>Einmal gesammelt antworten: Dateinummer, Seite, Problem. Details und offene Grenzen: <a href="00-START-HIER.md">Prüfliste</a>.</li></ol><p>Verlauf, Neon, Freundlich/Warm, Native Sidebar, andere Schriften und die All-39-Abnahme bleiben offen. Zwei native CV-Seiten ohne Einseiten-Aktion sind dokumentiert.</p></header><main>'''+"\n".join(cards)+"</main></html>"
(out / "00-Uebersicht.html").write_text(page)

pdf = canvas.Canvas(str(out / "00-Uebersicht.pdf"), pagesize=A4)
pdf.setTitle("Word Abnahme Batch 19 Oktober 2026")
style = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12)
def para(text, x, y, width):
    p = Paragraph(text, style); _, height = p.wrap(width, 1000)
    p.drawOn(pdf, x, y-height); return height
for page_index in range(2):
    pdf.setFillColorRGB(0, 0, 0); pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(16*mm, 278*mm, "Word Abnahme Batch 19 Oktober 2026")
    para("10 echte App-Dossiers. Erst 01-10 ansehen, dann nur 06 und 10 bearbeiten, speichern und wieder öffnen. Eine gemeinsame Rückmeldung genügt.", 16*mm, 269*mm, 178*mm)
    para("Vorschaubilder: links Web-Cover, rechts DOCX-CV aus LibreOffice. Microsoft Word ist noch nicht abgenommen.", 16*mm, 253*mm, 178*mm)
    for row_index, item in enumerate(items[page_index*5:page_index*5+5]):
        y = (238-row_index*42)*mm
        key=item["id"]; v=checked[key]
        pdf.setStrokeColorRGB(.84,.87,.9); pdf.line(16*mm, y+2*mm, 194*mm, y+2*mm)
        for index, suffix in enumerate(["Web-Cover-01.png", "DOCX-3.png"]):
            image=Image.open(out/"Vorschau"/f"{key}-{suffix}")
            pdf.drawImage(ImageReader(image), (16+index*28)*mm, y-35*mm, width=25*mm, height=35.36*mm, preserveAspectRatio=True)
        pdf.setFont("Helvetica-Bold", 10)
        title=key[:2]+"  "+key[3:].replace("-"," ")
        pdf.drawString(75*mm, y-3*mm, title)
        para(html.escape(item["purpose"]), 75*mm, y-7*mm, 118*mm)
        pdf.setFont("Helvetica", 8.5)
        pdf.drawString(75*mm, y-25*mm, f"CV-Seiten: Web {item['webCvPages']} | DOCX-Vorschau {v['supplementalNativeCvPages']}")
        pdf.drawString(75*mm, y-31*mm, "Datei "+key[:2]+" im Hauptordner öffnen")
    pdf.setFont("Helvetica", 8)
    pdf.drawString(16*mm, 16*mm, "Prüfliste und Grenzen: 00-START-HIER.md | Web-PDFs im Ordner Referenzen")
    pdf.drawRightString(194*mm, 16*mm, f"{page_index+1}/2")
    pdf.showPage()
pdf.save()
print(json.dumps({"directory":str(out),"docxFiles":len(items),"overviewPages":2}))
