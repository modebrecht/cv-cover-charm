"""Validate returned Word pill evidence and one saved-settings app comparison.
Usage: python SCRIPT APP_CASE PRIOR_PACKET PRIOR_RENDER UPLOADS NEW_RENDER OUTPUT
Never rewrites a DOCX package. Word acceptance of the new input remains open.
"""
import collections
import hashlib
import json
import shutil
import sys
from pathlib import Path
from zipfile import ZipFile

import fitz
from lxml import etree

app, prior, prior_render, uploads, rendered, out = map(Path, sys.argv[1:8])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def read(root, name):
    return json.loads((root/(name+".json")).read_text())


def walk(blocks):
    for b in blocks:
        yield b
        if b.get("heading"):
            yield b["heading"]
        yield from walk(b.get("blocks", []))
        for row in b.get("rows", []):
            for cell in row["cells"]:
                yield from walk(cell)


def locate(pdf, block):
    label = "".join(r["text"].upper() if r["style"].get("allCaps") else r["text"] for r in block["runs"])
    surface = block["flowSurface"]
    for i in [2,3]:
        rects = pdf[i].search_for(label)
        if not rects:
            continue
        text = rects[0]
        imgs = [x for x in pdf[i].get_image_info() if abs((x["bbox"][3]-x["bbox"][1])-surface["heightMm"]*72/25.4)<.3 and abs((x["bbox"][2]-x["bbox"][0])-surface["rowWidthMm"]*72/25.4)<2]
        paint = fitz.Rect(min(imgs,key=lambda x:abs(x["bbox"][1]-text.y0))["bbox"])
        right = paint.x0 + surface["widthMm"]/surface["rowWidthMm"]*paint.width
        assert paint.y0-.1 <= text.y0 and text.y1 <= paint.y1+.1 and text.x0 >= paint.x0 and text.x1 <= right+.1
        spans = [s for b in pdf[i].get_text("dict")["blocks"] if "lines" in b for l in b["lines"] for s in l["spans"] if s["text"] == label]
        assert len(spans)==1
        return {"label":label,"page":i+1,"textBoxPt":list(text),"paintBoxPt":list(paint),"fontPt":spans[0]["size"],"contained":True}
    raise AssertionError("Missing rubric: "+label)


old = read(prior,"model")
new = read(app,"model")
source = read(app,"snapshot")
assert read(app,"editor-settings-snapshot") == source
assert read(app,"editor-controls") == {"continuationTopMarginMm":20,"rubricFontSizePx":14}
assert json.loads(read(app,"interior-metrics")["sourceKey"]) == source
assert new["cover"] == old["cover"] and new["letter"] == old["letter"]
assert new["cv"]["page"]["margins"]["top"]==20
assert new["cv"]["layout"]["pagination"]=={"firstTopMarginMm":24,"continuationTopMarginMm":20,"firstPageLeadMm":4}
old_blocks, new_blocks = list(walk(old["cv"]["blocks"])),list(walk(new["cv"]["blocks"]))
assert [(b["id"],b["kind"])for b in old_blocks] == [(b["id"],b["kind"])for b in new_blocks]
for a,b in zip(old_blocks,new_blocks):
    if a["kind"] != "paragraph":
        continue
    if a.get("flowSurface"):
        assert [r["text"]for r in a["runs"]]==[r["text"]for r in b["runs"]]
        assert all(r["style"]["sizePt"]==10.5 for r in b["runs"])
        assert b["beforeMm"]==0 and b["flowSurface"]["spacingOwner"]=="previous-block"
    elif a["role"] == "heading" and a["runs"] != b["runs"]:
        assert a["id"] == "cv.section.person.heading"
        expected = json.loads(json.dumps(a["runs"]))
        for run in expected:
            run["style"]["sizePt"] = 10.5
        assert expected == b["runs"]
    else:
        assert a["runs"]==b["runs"]

original_docx=prior/"04-Modern-CV-Pills-Abstand-Test.docx"
returned_docx=uploads/original_docx.name
returned_pdf=uploads/"04-Modern-CV-Pills-Abstand-Test.pdf"
word=fitz.open(returned_pdf)
native=fitz.open(rendered/"candidate.pdf")
assert len(word)==len(native)==4 and "Word" in word.metadata["producer"]
with ZipFile(original_docx)as a,ZipFile(returned_docx)as b:
    roots=[etree.fromstring(z.read("word/document.xml"))for z in [a,b]]
    tags=[x.xpath("//w:sdtPr/w:tag/@w:val",namespaces=ns)for x in roots]
    assert tags[0]==tags[1] and len(tags[0])==82
    controls=[]
    for x in roots:
        controls.append({c.find("w:sdtPr/w:tag",ns).get("{"+ns["w"]+"}val"):"".join(c.xpath(".//w:t/text()",namespaces=ns))for c in x.xpath("//w:sdt",namespaces=ns)if c.find("w:sdtPr/w:tag",ns)is not None})
    edits={k:{"before":controls[0][k],"after":v}for k,v in controls[1].items()if controls[0][k].strip()!=v.strip()}
    assert edits=={"cv.documentTitle":{"before":"Lebenslauf","after":"Lebenslaufi"}}
    media=lambda z:collections.Counter(hashlib.sha256(z.read(p)).hexdigest()for p in z.namelist()if p.startswith("word/media/"))
    assert media(a)==media(b) and sum(media(a).values())==13
    original_top=roots[0].xpath("//w:sectPr/w:pgMar/@w:top",namespaces=ns)[-1]
    returned_top=roots[1].xpath("//w:sectPr/w:pgMar/@w:top",namespaces=ns)[-1]
    assert original_top==returned_top=="567"

word_rows=[locate(word,b)for b in old_blocks if b.get("flowSurface")]
new_rows=[locate(native,b)for b in new_blocks if b.get("flowSurface")]
assert len(word_rows)==len(new_rows)==7
assert all(r["fontPt"]==12 for r in word_rows)
assert all(r["fontPt"]==10.5 for r in new_rows)
for i in [1,2]:
    assert (rendered/f"page-{i}.png").read_bytes()==(prior_render/f"page-{i}.png").read_bytes()
for f in ["web.png","web-letter.png"]:
    assert (app/f).read_bytes()==(prior_render.parent/f).read_bytes()

header_bottom_mm=4
clearance=lambda rows:(next(r for r in rows if r["page"]==4)["paintBoxPt"][1]*25.4/72)-header_bottom_mm
assert 5<clearance(word_rows)<6 and 15<clearance(new_rows)<16
for n in ["project","snapshot","metrics","interior-metrics","model","app-evidence","editor-controls","editor-settings-snapshot"]:
    if (out/(n+".json")).exists() and n=="project":
        assert read(out,n)==read(app,n)
    shutil.copyfile(app/(n+".json"),out/(n+".json"))
shutil.copyfile(app/"candidate.docx",out/"05-Modern-CV-Pills-Rand20-Schrift14.docx")
shutil.copyfile(returned_docx,out/"word-return-04.docx")
shutil.copyfile(returned_pdf,out/"word-return-04.pdf")
validation={"classification":"PARTIAL; candidate 04 bounded Word render/save PASS; settings candidate 05 Word UNVERIFIED","wordProducer":word.metadata["producer"],"wordReturnedDocxDiffersFromOriginal":sha(returned_docx)!=sha(original_docx),"wordRubrics":word_rows,"wordNativeSdtTagsPreserved":82,"wordPictureBytesPreserved":13,"wordNativeTextEdits":edits,"wordCloseReopenSequence":"not directly observed","sourceContinuationMm":source["settings"]["cvContinuationTopMarginMm"],"nativeContinuationTopTwips":1134,"nativeFirstPageLeadMm":4,"firstPageContentTopMm":24,"sourceRubricPx":source["cv"]["design"]["sectionTitleFontSizePx"],"nativeRubrics":new_rows,"oldWordHeaderToPillClearanceMm":clearance(word_rows),"newSupplementaryHeaderToPillClearanceMm":clearance(new_rows),"newNativeA4Pages":4,"coverLetterModelsIdentical":True,"coverLetterPageRastersByteIdentical":True,"coverLetterWebCapturesByteIdentical":True,"nonHeadingNativeTextStylesUnchanged":True,"newCandidateWordAcceptance":"UNVERIFIED","productionCodeOrDefaultsChanged":False}
(out/"validation.json").write_text(json.dumps(validation,ensure_ascii=False,indent=2)+"\n")
(out/"sha256.json").write_text(json.dumps({p.name:sha(p)for p in sorted(out.iterdir())if p.suffix in [".docx",".pdf"]},indent=2)+"\n")
print(json.dumps({"returnedWordPills":"7/7 PASS","nativeControls":82,"pictureBytesPreserved":13,"newAppCandidate":"4 A4 pages; 7/7 supplementary containment","oldClearanceMm":clearance(word_rows),"newClearanceMm":clearance(new_rows),"newWord":"UNVERIFIED","sha256":sha(out/"05-Modern-CV-Pills-Rand20-Schrift14.docx")}))
