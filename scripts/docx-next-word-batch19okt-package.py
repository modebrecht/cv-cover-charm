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

readme = """# Word Abnahme Batch 19 Oktober 2026 – Revision 2

Zehn echte App-Exporte. Die Rückmeldung zur ersten Runde ist erfasst: 01, 07, 08 und 10 optisch OK; 02 bleibt ohne automatische Aufblähung. Bitte einmal gesammelt nur die Änderungen prüfen; keine neue vollständige Zehnerrunde nötig.

1. **04:** Kopf-/Fussfarben von Anschreiben und CV sind jetzt synchronisiert. **06:** normale Datum-Pille links und Foto in Originalgrösse, mittig auf der dekorativen Kreisfläche. **09:** Geburtsdatum steht unter Ort und E-Mail. Dieselbe Kontaktkorrektur gilt für 08 und 10.
2. **03/04:** Unterschiedliche Inhaltsanfänge sind durch die Web-Einstellung «Oberer Rand ab Seite 2» vorgesehen. Regler jeweils 20 mm; mit Header-Schutz beginnt der Inhalt auf Folgeseiten bei 30 bzw. 36 mm. Seite 1 beginnt bei 47 bzw. 53 mm. Diese Werte und Defaults wurden nicht geändert. Web/PDF/DOCX aus demselben Zustand sind geprüft.
3. **05:** Die zweite Referenz hat jetzt einen Namen und eine E-Mail ohne Telefonnummer. Die vorige isolierte E-Mail war nur ein schlecht erklärter technischer Test, kein gewünschtes CV-Design.
4. **Eine Rückmeldung:** z. B. `04 Farben ok; 06 Bild/Pille ok; 09 Angaben bündig`. Bei Abweichungen Dateinummer und Seite angeben, möglichst Word-PDF oder Screenshot zurückgeben. Die überarbeiteten Dateien sind noch nicht in Microsoft Word abgenommen.

`00-Uebersicht.pdf` zeigt die zehn Fälle. `00-Uebersicht.html` enthält Web-Bilder und Links zu DOCX und normalen App-PDFs. `Nachweise` enthält automatische Ergebnisse. Die Benutzer-Rückgaben werden durch Prüfsummen und Befunde dokumentiert; Original-Rückgaben sind nicht öffentlich beigefügt.

## Grenzen

- Aus der ersten Runde liegen fünf vom Nutzer gespeicherte DOCX und fünf Microsoft-Word-PDFs vor (06–10). Alle behalten die ursprünglichen Inhaltskontrollen und Bilddaten; bearbeiteter Deckblatttitel ist nachweisbar. Schliessen/Wiederöffnen ist nicht unabhängig nachweisbar. Die Korrekturen dieser Revision haben noch keine Word-Abnahme.
- DOCX-Vorschauen stammen aus unverändertem LibreOfficeDev 26.8. Sie ersetzen Microsoft Word nicht.
- Nur Modern und Brief mit ausdrücklich gespeichertem Sans. Browser: Liberation Sans; Word: Arial angefordert, tatsächliche Windows-Schriftidentität ungeprüft. Verlauf, Neon und Freundlich/Warm bleiben gesperrt; Native Sidebar/Agent A eingefroren. All-39 bleibt offen.
- 01/02 verwenden die echte Ein-/Zweiseiten-Aktion. Andere Fälle können zwei native CV-Seiten gegenüber einer Web-CV-Seite haben. Kein automatisches Strecken auf volle Seiten.
- Brief 08–10 verwenden jetzt die bestehende gemeinsame Kontakttabelle. Zusätzliche native Kontaktüberschrift und gestapelte Eintragszeilen bleiben bestehen; keine vollständige Web-/Word-Gleichheit behauptet. Die kompakte Kontaktkomposition unterstützt nur volle Breite im klassischen Textfluss.
- Datum-Pill-Text bleibt nativ bearbeitbar; die separate Hintergrundfläche wächst bei beliebig längerem Word-Text nicht automatisch mit. Die verworfene Gruppierung bleibt gesperrt.
- Einige Web-PDF-Covertexte liegen in einer Rasterebene. Fehlende Textextraktion ist einzeln dokumentiert; keine vollständige Cover-Suchbarkeit behauptet.
- Fotos 06/10 sind farbige Crop-Testkarten mit eingebetteten Original-PNG-Daten.

Automatische Prüfungen und genauer Branch/Commit stehen in `Nachweise/TECHNIK.md`. Der historische vollständige Lauf mit 1246 Unit-Tests wurde nicht wiederholt; diese Revision wird gezielt geprüft.
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

page = '''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Word Abnahme Batch 19 Oktober 2026 – Revision 2</title><style>
*{box-sizing:border-box}body{margin:0;background:#f2f4f6;color:#182331;font:15px/1.5 system-ui,sans-serif}header,main{max-width:1200px;margin:auto;padding:28px}h1{font-size:30px;margin:0 0 10px}h2{font-size:18px;margin:0}p{margin:5px 0 12px}.notice{background:#fff5dd;border-radius:10px;padding:16px}main{padding-top:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}article{background:white;border:1px solid #dce1e7;border-radius:12px;padding:20px}.top{display:flex;gap:12px}.number{background:#244a61;color:white;border-radius:8px;padding:8px;height:40px}.counts{font-size:13px;color:#586779}.links{display:flex;flex-wrap:wrap;gap:10px}.links a{padding:7px 11px;border:1px solid #c9d5dd;border-radius:6px;color:#214b62;text-decoration:none;font-weight:600}.gallery{display:flex;overflow-x:auto;gap:12px;padding-top:14px}figure{margin:0;min-width:140px;max-width:190px}img{width:100%;border:1px solid #d6dce1;display:block}figcaption{font-size:12px;color:#62707d;margin-top:5px}summary{cursor:pointer;font-size:13px;margin-top:15px}a{color:#1c526f}li{margin:5px 0}@media(max-width:780px){main{grid-template-columns:1fr}header,main{padding:16px}}@media print{main{display:block}article{break-inside:avoid;margin-bottom:16px}}
</style><header><h1>Word Abnahme Batch 19 Oktober 2026 – Revision 2</h1><p>Zehn echte App-Dossiers · zwei Coverfamilien · eine gemeinsame Rückmeldung</p><div class="notice"><b>Word noch offen.</b> Web-Bilder und Web-PDF stammen aus demselben Projekt wie die DOCX-Dateien. Ergänzende DOCX-Bilder sind LibreOffice-Vorschauen.</div><ol><li>Nur Änderungen 04/06/09 prüfen: Farben, Foto/Pille und Ausrichtung des Geburtsdatums. 08/10 haben dieselbe Kontaktkorrektur.</li><li>03/04: Der bestehende Folgeseitenregler bleibt wirksam; unterschiedliche erste und folgende Ränder sind kein Exportfehler.</li><li>Einmal gesammelt antworten: Dateinummer, Seite, Problem. Details und offene Grenzen: <a href="00-START-HIER.md">Prüfliste</a>.</li></ol><p>Verlauf, Neon, Freundlich/Warm, Native Sidebar, andere Schriften und die All-39-Abnahme bleiben offen. Zwei native CV-Seiten ohne Einseiten-Aktion sind dokumentiert.</p></header><main>'''+"\n".join(cards)+"</main></html>"
(out / "00-Uebersicht.html").write_text(page)

pdf = canvas.Canvas(str(out / "00-Uebersicht.pdf"), pagesize=A4)
pdf.setTitle("Word Abnahme Batch 19 Oktober 2026 – Revision 2")
style = ParagraphStyle("body", fontName="Helvetica", fontSize=9, leading=12)
def para(text, x, y, width):
    p = Paragraph(text, style); _, height = p.wrap(width, 1000)
    p.drawOn(pdf, x, y-height); return height
for page_index in range(2):
    pdf.setFillColorRGB(0, 0, 0); pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(16*mm, 278*mm, "Word Abnahme Batch 19 Oktober 2026 – Revision 2")
    para("10 echte App-Dossiers. Änderungen 04/06/09 prüfen. 01/02/07 sind unverändert; 08/10 erhalten dieselbe Kontaktkorrektur wie 09. Eine Rückmeldung genügt.", 16*mm, 269*mm, 178*mm)
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
