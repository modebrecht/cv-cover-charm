"""Measure supplied Word evidence and retain one unmodified actual app trial.

Usage: python SCRIPT APP_CASE PRIOR_PACKET PRIOR_RENDER UPLOADS OUTPUT
No XML edits. Supplementary render success never establishes Word acceptance.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from zipfile import ZipFile

import fitz
from lxml import etree

app, prior, prior_render, uploads, out = map(Path, sys.argv[1:6])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main", "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"}
w = "{" + ns["w"] + "}"


def walk(blocks):
    for b in blocks:
        yield b
        if b.get("heading"):
            yield b["heading"]
        yield from walk(b.get("blocks", []))
        for row in b.get("rows", []):
            for cell in row["cells"]:
                yield from walk(cell)


old_docx = prior / "03-Modern-Lebenslauf-Rubrikpills.docx"
returned_docx = uploads / old_docx.name
returned_pdf = uploads / "03-Modern-Lebenslauf-Rubrikpills.pdf"
assert returned_docx.read_bytes() == old_docx.read_bytes(), "Returned DOCX must be classified separately if it was resaved"
source = json.loads((app/"snapshot.json").read_text())
model = json.loads((app/"model.json").read_text())
metrics = json.loads((app/"interior-metrics.json").read_text())
assert json.loads(metrics["sourceKey"]) == source
old_model = json.loads((prior/"cv-pills-model.json").read_text())
assert model["cover"] == old_model["cover"] and model["letter"] == old_model["letter"]
assert model["cv"]["page"] == old_model["cv"]["page"]
semantic = lambda m: [{"id":b["id"],"role":b["role"],"runs":b["runs"]}for b in walk(m["cv"]["blocks"])if b["kind"]=="paragraph"]
assert semantic(model) == semantic(old_model)

with ZipFile(old_docx) as a, ZipFile(app/"candidate.docx") as b:
    assert a.namelist() == b.namelist()
    changed_parts = [p for p in a.namelist() if a.read(p) != b.read(p)]
    assert changed_parts == ["word/document.xml"]
    old_root, new_root = [etree.fromstring(z.read("word/document.xml")) for z in [a,b]]
    assert len(old_root.xpath("//w:p",namespaces=ns)) == len(new_root.xpath("//w:p",namespaces=ns))
    assert len(old_root.xpath("//w:tbl",namespaces=ns)) == len(new_root.xpath("//w:tbl",namespaces=ns))
    old_spacing, new_spacing = [t.xpath("//w:spacing",namespaces=ns) for t in [old_root,new_root]]
    changes = [{"spacingIndex":i,"old":dict(x.attrib),"new":dict(y.attrib)} for i,(x,y) in enumerate(zip(old_spacing,new_spacing)) if x.attrib != y.attrib]
    assert len(changes) == 14
    for tree in [old_root,new_root]:
        for el in tree.xpath("//w:spacing",namespaces=ns):
            for attr in ["before","after"]:
                el.attrib.pop(w+attr,None)
    assert etree.tostring(old_root,method="c14n") == etree.tostring(new_root,method="c14n")
    # Reload original spacing for the quantitative Word diagnosis below.
    old_paragraphs = etree.fromstring(a.read("word/document.xml")).xpath("//w:p",namespaces=ns)

word = fitz.open(returned_pdf)
old_native = fitz.open(prior_render/"candidate.pdf")
native = fitz.open(app/"rendered/candidate.pdf")
assert len(word) == len(native) == 4
assert "Word" in word.metadata.get("producer", "")
for i,page in enumerate(native):
    assert abs(page.rect.width-595.3)<.2 and abs(page.rect.height-841.89)<.2
    assert (app/"rendered"/f"page-{i+1}.png").read_bytes() == (prior_render/f"page-{i+1}.png").read_bytes()

prior_case = prior_render.parent
regression = {"nativePages": [], "webCaptures": [], "ordinaryNext": []}
for name in [f"page-{i+1}.png" for i in range(4)]:
    regression["nativePages"].append({"file":name,"sha256":sha(app/"rendered"/name),"priorSha256":sha(prior_render/name),"byteIdentical":True})
for name in ["web.png","web-letter.png","web-cv.png"]:
    assert (app/name).read_bytes() == (prior_case/name).read_bytes()
    regression["webCaptures"].append({"file":name,"sha256":sha(app/name),"priorSha256":sha(prior_case/name),"byteIdentical":True})
assert (app/"baseline.docx").read_bytes() == (prior_case/"baseline.docx").read_bytes()
regression["ordinaryNext"].append({"case":"cv-pills","sha256":sha(app/"baseline.docx"),"priorSha256":sha(prior_case/"baseline.docx"),"byteIdentical":True})
(out/"regression.json").write_text(json.dumps(regression,indent=2)+"\n")


def locate(pdf, label, surface):
    for i in [2,3]:
        rects = pdf[i].search_for(label)
        if not rects:
            continue
        rect = rects[0]
        images = [x for x in pdf[i].get_image_info() if abs((x["bbox"][3]-x["bbox"][1])-surface["heightMm"]*72/25.4)<.3 and abs((x["bbox"][2]-x["bbox"][0])-surface["rowWidthMm"]*72/25.4)<2]
        paint = fitz.Rect(min(images,key=lambda x:abs(x["bbox"][1]-rect.y0))["bbox"])
        pill_right = paint.x0 + surface["widthMm"]/surface["rowWidthMm"]*paint.width
        contained = paint.y0-.1 <= rect.y0 and rect.y1 <= paint.y1+.1 and paint.x0 <= rect.x0 and rect.x1 <= pill_right+.1
        return {"page":i+1,"textBox":list(rect),"paintBox":list(paint),"contained":contained,"textMinusPaintTopPt":rect.y0-paint.y0}
    raise AssertionError("Missing native label: "+label)


rows=[]
for p in walk(model["cv"]["blocks"]):
    if not p.get("flowSurface"):
        continue
    label="".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in p["runs"])
    surface=p["flowSurface"]
    measured_word, measured_old, measured_new = [locate(pdf,label,surface) for pdf in [word,old_native,native]]
    assert measured_new["contained"]
    index=next(i for i,x in enumerate(old_paragraphs) if x.xpath('.//wp:docPr[@name="'+p["id"]+'.flow-paint"]',namespaces=ns))
    before=old_paragraphs[index].find("w:pPr/w:spacing",ns)
    previous=old_paragraphs[index-1].find("w:pPr/w:spacing",ns)
    before_pt=int(before.get(w+"before","0"))/20
    previous_after_pt=int(previous.get(w+"after","0"))/20
    starts_page=word[measured_word["page"]-1].get_text().strip().splitlines()[0].strip()==label
    predicted=0 if starts_page else max(0,before_pt-previous_after_pt)
    offset=measured_word["textMinusPaintTopPt"]-measured_old["textMinusPaintTopPt"]
    assert abs(offset-predicted)<.2
    rows.append({"id":p["id"],"label":label,"wordBefore":measured_word,"priorLibreOffice":measured_old,"candidateLibreOffice":measured_new,"beforePt":before_pt,"previousAfterPt":previous_after_pt,"startsWordPage":starts_page,"observedExtraWordOffsetPt":offset,"predictedMissingCollapsedGapPt":predicted,"residualPt":offset-predicted})
assert len(rows)==7 and sum(x["wordBefore"]["contained"]for x in rows)==1

for name in ["project","snapshot","metrics","interior-metrics","model","app-evidence"]:
    shutil.copyfile(app/(name+".json"),out/(name+".json"))
target=out/"04-Modern-CV-Pills-Abstand-Test.docx"
shutil.copyfile(app/"candidate.docx",target)
assert target.read_bytes() == (app/"candidate.docx").read_bytes()
shutil.copyfile(returned_pdf,out/"word-before.pdf")
(out/"validation.json").write_text(json.dumps({"classification":"PARTIAL; old Word trial rejected; new Word acceptance UNVERIFIED","inputDocxMatchesOriginal":True,"originalDocxSha256":sha(returned_docx),"wordPdfMetadata":word.metadata,"wordPdfSha256":sha(returned_pdf),"oldWordPillsContained":1,"oldWordPillsFailed":6,"newLibreOfficePillsContained":7,"candidatePages":4,"fourPageRastersPixelIdentical":True,"coverLetterModelsUnchanged":True,"allSemanticParagraphsRunsStylesUnchanged":True,"noNewParagraphsOrTables":True,"changedPackageParts":changed_parts,"spacingChanges":changes,"pillMeasurements":rows,"candidateSha256":sha(target),"WordVisualEditingSaveReopen":"UNVERIFIED for new candidate"},ensure_ascii=False,indent=2)+"\n")
(out/"sha256.json").write_text(json.dumps({p.name:sha(p) for p in sorted(out.iterdir()) if p.suffix in [".docx",".pdf"]},indent=2)+"\n")
print(json.dumps({"oldWord":"1/7 contained; 6/7 rejected","candidate":"1 actual app dossier, 4 A4 pages","newLibreOffice":"7/7 contained; all 4 pages unchanged","WordAcceptance":"UNVERIFIED","sha256":sha(target)}))
