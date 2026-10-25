"""Audit existing defaults, exact native paint changes and returned Word evidence.
Usage: python SCRIPT APP OVERRIDE PRIOR_PACKET PRIOR_RENDER UPLOADS NEW_RENDER OUTPUT
All DOCX and supplied evidence copies are byte-preserving. No XML repairs.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from zipfile import ZipFile

import fitz
from lxml import etree

app, override, prior, prior_render, uploads, rendered, out = map(Path, sys.argv[1:9])
out.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda root, name: json.loads((root/(name+".json")).read_text())
ns = {"wp":"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "a":"http://schemas.openxmlformats.org/drawingml/2006/main"}
source, model = read(app,"snapshot"),read(app,"model")
assert "sectionTitleFontSizePx" not in read(app,"project")["cv"]["design"]
assert "portableState" not in read(app,"project")["cv"]
assert read(app,"editor-controls")=={"continuationTopMarginMm":20,"rubricFontSizePx":14}
assert read(app,"editor-settings-snapshot")==source==read(prior,"snapshot")
assert json.loads(read(app,"interior-metrics")["sourceKey"])==source
assert read(override,"editor-controls")=={"continuationTopMarginMm":12,"rubricFontSizePx":18}
assert read(override,"snapshot")["settings"]["cvContinuationTopMarginMm"]==12
assert read(override,"snapshot")["cv"]["design"]["sectionTitleFontSizePx"]==18
assert read(override,"model")["cv"]["page"]["margins"]["top"]==12
old_model=read(prior,"model")
for part in ["cover","letter","cv"]:
    new_part=dict(model[part])
    if part!="cover":
        assert new_part.pop("pagePaintCoverage")=="native-grid"
    assert new_part==old_model[part]

old_docx=prior/"05-Modern-CV-Pills-Rand20-Schrift14.docx"
with ZipFile(old_docx)as a,ZipFile(app/"candidate.docx")as b:
    assert a.namelist()==b.namelist()
    changed=[n for n in a.namelist()if a.read(n)!=b.read(n)]
    assert set(changed)=={"word/letter-header.xml","word/letter-header-first.xml","word/cv-header.xml","word/cv-header-first.xml"}
    native_extents=[]
    for name in changed:
        x,y=[etree.fromstring(z.read(name))for z in [a,b]]
        for root in [x,y]:
            for el in root.xpath('//wp:anchor[contains(wp:docPr/@name,".page-paint.")]//wp:extent | //wp:anchor[contains(wp:docPr/@name,".page-paint.")]//a:ext',namespaces=ns):
                if root is y and el.tag.endswith("extent"):
                    width,height=[int(el.get(k))for k in ["cx","cy"]]
                    assert width==7560945 and height==10692765
                    native_extents.append({"part":name,"widthEmu":width,"heightEmu":height,"rightPt":width/12700,"bottomPt":height/12700})
                el.attrib.pop("cx",None)
                el.attrib.pop("cy",None)
        assert etree.tostring(x,method="c14n")==etree.tostring(y,method="c14n")
    assert len(native_extents)==4

word_path=uploads/"05-Modern-CV-Pills-Rand20-Schrift144.pdf"
word=fitz.open(word_path)
native=fitz.open(rendered/"candidate.pdf")
old_native=fitz.open(prior_render/"candidate.pdf")
assert "Word" in word.metadata["producer"] and len(word)==len(native)==len(old_native)==4
edges=[]
for i in [1,2,3]:
    page=word[i]
    img=max(page.get_image_info(),key=lambda x:x["width"]*x["height"])
    right=page.rect.width-img["bbox"][2]
    bottom=page.rect.height-img["bbox"][3]
    assert .06<right<.08 and .06<bottom<.08
    assert all(e["rightPt"]>=page.rect.width and e["bottomPt"]>=page.rect.height for e in native_extents)
    supplementary=max(native[i].get_image_info(),key=lambda x:x["width"]*x["height"])
    assert supplementary["bbox"][2]>=native[i].rect.width and supplementary["bbox"][3]>=native[i].rect.height
    edges.append({"page":i+1,"wordPaperPt":list(page.rect),"wordImagePt":list(img["bbox"]),"rightGapPt":right,"bottomGapPt":bottom,"rightGapMm":right*25.4/72,"bottomGapMm":bottom*25.4/72,"newSupplementaryImagePt":list(supplementary["bbox"])})
for i in range(4):
    assert native[i].get_text("words")==old_native[i].get_text("words")
    assert abs(native[i].rect.width-595.3)<.2 and abs(native[i].rect.height-841.89)<.2


def walk(blocks):
    for b in blocks:
        yield b
        if b.get("heading"):yield b["heading"]
        yield from walk(b.get("blocks",[]))


def check_pills(pdf):
    found=[]
    for b in walk(model["cv"]["blocks"]):
        if not b.get("flowSurface"):continue
        label="".join(r["text"].upper()if r["style"].get("allCaps")else r["text"]for r in b["runs"])
        for i in [2,3]:
            matches=pdf[i].search_for(label)
            if not matches:continue
            text=matches[0];s=b["flowSurface"]
            imgs=[x for x in pdf[i].get_image_info()if abs((x["bbox"][3]-x["bbox"][1])-s["heightMm"]*72/25.4)<.3 and abs((x["bbox"][2]-x["bbox"][0])-s["rowWidthMm"]*72/25.4)<2]
            paint=fitz.Rect(min(imgs,key=lambda x:abs(x["bbox"][1]-text.y0))["bbox"])
            assert paint.y0-.1<=text.y0 and text.y1<=paint.y1+.1
            spans=[s for block in pdf[i].get_text("dict")["blocks"]if "lines" in block for line in block["lines"]for s in line["spans"]if s["text"]==label]
            # Word's PDF reports 10.56 for the native document's nominal 10.5 pt.
            expected_size=10.56 if pdf is word else 10.5
            assert len(spans)==1 and abs(spans[0]["size"]-expected_size)<.001
            found.append({"label":label,"page":i+1,"contained":True,"pdfFontPt":spans[0]["size"],"textBox":list(text),"paintBox":list(paint)})
    assert len(found)==7
    return found

word_pills=check_pills(word)
native_pills=check_pills(native)
web=[]
for n in ["web.png","web-letter.png","web-cv.png"]:
    assert (app/n).read_bytes()==(prior_render.parent/n).read_bytes()
    web.append({"file":n,"sha256":sha(app/n),"byteIdenticalToReviewedSettings":True})
assert (app/"baseline.docx").read_bytes()==(prior_render.parent/"baseline.docx").read_bytes()
for name in ["project","snapshot","metrics","interior-metrics","model","app-evidence","editor-controls","editor-settings-snapshot"]:
    shutil.copyfile(app/(name+".json"),out/(name+".json"))
for name in ["snapshot","model","app-evidence","editor-controls"]:
    shutil.copyfile(override/(name+".json"),out/("override-"+name+".json"))
shutil.copyfile(app/"candidate.docx",out/"06-Modern-CV-Pills-Footer-Randtest.docx")
shutil.copyfile(word_path,out/"word-before-05.pdf")
shutil.copyfile(uploads/"image(20261018-115109).png",out/"user-footer-edge.png")
validation={"classification":"PARTIAL; scoped defaults PASS; native footer coverage candidate Word UNVERIFIED","wordProducer":word.metadata["producer"],"word05Rubrics":word_pills,"newNativeRubrics":native_pills,"word05EdgeMeasurements":edges,"newNativePaintExtents":native_extents,"changedPackageParts":changed,"onlyPaintExtentAttributesChange":True,"allOtherPackagePartsByteIdentical":True,"allTextPositionsIdenticalToPriorSupplementary":True,"newNativeA4Pages":4,"webRegression":web,"ordinaryNextBaselineByteIdenticalToExplicitReviewedSettings":True,"defaultSourceEqualsReviewedExplicitSettings":True,"customSavedValuesPreserved":{"marginMm":12,"rubricPx":18},"newFooterWordVisualSaveReopen":"UNVERIFIED; no returned DOCX supplied in this round","productionExportEngineDefaultSwitched":False}
(out/"validation.json").write_text(json.dumps(validation,ensure_ascii=False,indent=2)+"\n")
(out/"sha256.json").write_text(json.dumps({p.name:sha(p)for p in sorted(out.iterdir())if p.suffix in [".docx",".pdf",".png"]},indent=2)+"\n")
print(json.dumps({"actualAppDefaults":"20 mm / 14 px","savedOverride":"12 mm / 18 px retained","oldWordGapMm":edges[0]["rightGapMm"],"changedHeaderParts":4,"bodyStylesPictures":"byte identical","newWord":"UNVERIFIED","sha256":sha(out/"06-Modern-CV-Pills-Footer-Randtest.docx")}))
