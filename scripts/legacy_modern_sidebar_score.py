#!/usr/bin/env python3
"""QA-only multi-page measurement; does not change production code."""
import json, subprocess, re, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image, ImageOps, ImageChops, ImageDraw
import numpy as np
from skimage.metrics import structural_similarity as ssim

ROOT=Path("artifacts/legacy-modern-sidebar"); DOCX=ROOT/"converted"; IMG=ROOT/"raster"
DOCX.mkdir(parents=True,exist_ok=True);IMG.mkdir(parents=True,exist_ok=True)
def run(a, timeout=120):
 return subprocess.run(a,capture_output=True,text=True,timeout=timeout)
def pages(p):
 a=run(["pdfinfo",str(p)]).stdout
 m=re.search(r"Pages:\s+(\d+)",a)
 return int(m.group(1)) if m else None
def text(p):
 return run(["pdftotext","-layout",str(p),"-"]).stdout
def snap(p,n,mode):
 target=IMG/f"{p.stem}--cv-{n}.png"
 if not target.exists():
  z=run(["pdftoppm","-f",str(n),"-l",str(n),"-scale-to-x","794","-scale-to-y","1123","-singlefile","-png",str(p),str(target.with_suffix(""))],timeout=90)
  if z.returncode: return None
 return target if target.exists() else None
def view(path):
 im=Image.open(path).convert("RGB")
 return ImageOps.fit(im,(794,1123),method=Image.Resampling.LANCZOS)
def similarity(a,b):
 aa=np.asarray(a.resize((265,375)),dtype=np.uint8);bb=np.asarray(b.resize((265,375)),dtype=np.uint8)
 return {"rgb":round(float(ssim(aa,bb,channel_axis=2,data_range=255)),4),"layout":round(float(ssim(np.mean(aa,axis=2),np.mean(bb,axis=2),data_range=255)),4)}
def sections(docx):
 with zipfile.ZipFile(docx) as z:
  root=ET.fromstring(z.read("word/document.xml"))
  ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
  ms=[]
  for sect in root.findall(".//w:sectPr",ns):
   a=sect.find("w:pgMar",ns)
   if a is not None:ms.append({k:round(int(v)/1440*25.4,2) for k,v in (("top",a.get("{"+ns['w']+"}top")),("bottom",a.get("{"+ns['w']+"}bottom")),("left",a.get("{"+ns['w']+"}left")),("right",a.get("{"+ns['w']+"}right"))) if v})
  return ms
def cvstart(pdf,pg):
 # Cover is picture-based, letter contains "Guten Tag"; start at first later physical page with CV heading.
 for idx in range(1,pg+1):
  r=run(["pdftotext","-f",str(idx),"-l",str(idx),str(pdf),"-"]).stdout
  if "LEBENSLAUF" in r and ("SCHULBILDUNG" in r or "SPRACHEN" in r):return idx
 return None
out=[]
for raw in json.loads((ROOT/"results.json").read_text()):
 item=dict(raw);id=item['id'];docx=ROOT/(id+"--docx.docx");pdf=ROOT/(id+"--pdf.pdf")
 web=[ROOT/(id+f"--web-{i+1}.png") for i in range(item.get('webPages',0))]
 # Production Web preview is one screenshot of the complete multipage CV wrapper.
 # Split physical A4 sheets; preserve the original full screenshot unchanged.
 if len(web)==1 and web[0].exists():
  src=Image.open(web[0])
  if src.height>src.width*1.9:
   page_h=round(src.width*1123/794)
   positions=[0,src.height-page_h]
   split=[]
   for k,y in enumerate(positions,1):
    target=ROOT/f"{id}--webpage-{k}.png"
    src.crop((0,y,src.width,y+page_h)).save(target)
    split.append(target)
   web=split
 item["cvWebPhysicalPages"]=len(web)
 item["docxMediaEntries"]=None
 if (ROOT/(id+"--docx.docx")).exists():
  with zipfile.ZipFile(ROOT/(id+"--docx.docx")) as pack:
   item["docxMediaEntries"]=len([n for n in pack.namelist() if n.startswith("word/media/")])
 item["photoMissingInDocxPackage"]=bool(item.get("photo")) and item["docxMediaEntries"]==0
 item['measures']={}
 if item.get('geometry',{}).get('sidebar'):
  geo=item['geometry'];factor=210/geo['pageWidthPx']/(25.4/96)
  item['geometryWebMm']={k:round(v*factor,2) for k,v in geo['sidebar'].items()}
 if docx.exists():
  try:
   item['docxMarginsMm']=sections(docx)
   target=DOCX/(id+"--docx.pdf")
   if not target.exists():
    r=run(["libreoffice","-env:UserInstallation=file:///tmp/lo-legacy-modern-parity","--headless","--convert-to","pdf","--outdir",str(DOCX),str(docx)],timeout=150)
    item['convertLog']=r.stdout.strip()[-250:]
   if target.exists():item['docxPdfPages']=pages(target)
   else:item['conversionFailure']=True
  except Exception as e:item['conversionError']=str(e)
 if pdf.exists():item['pdfPages']=pages(pdf)
 pdoc=DOCX/(id+"--docx.pdf")
 item['cvFirstPage']={}
 for kind,file in [('pdf',pdf),('docx',pdoc)]:
  if file.exists():
   n=pages(file)
   item['cvFirstPage'][kind]=cvstart(file,n) if n else None
   txt=text(file)
   for token in (["Praxisstation 01","Praxisstation 17"] if item.get("long") else ["Sekundarschule"]):
    item.setdefault("textFound",{})[f"{kind}:{token}"]=token.lower() in txt.lower()
 if item.get("docxPdfPages"):
  item["cvExtraDocxPages"]=max(0,item["docxPdfPages"]-2-len(web))
 if item.get("pdfPages"):
  item["cvExtraPdfPages"]=max(0,item["pdfPages"]-2-len(web))
 if web:
  base=view(web[0])
  pts={}
  for kind,file in [('pdf',pdf),('docx',pdoc)]:
   first=item['cvFirstPage'].get(kind)
   if not first or not file.exists():continue
   count=max(0,pages(file)-first+1)
   item['cvPages'+kind.capitalize()]=count
   sim=[];comp=[]
   for idx,wfile in enumerate(web):
    if idx>=count:
     sim.append({"page":idx+1,"missing":True});continue
    imp=snap(file,first+idx,kind)
    if not imp:sim.append({"page":idx+1,"missing":True});continue
    w=view(wfile);p=view(imp)
    val=similarity(w,p);sim.append({"page":idx+1,**val})
    if idx==0:
     blend=Image.blend(w,p,.5)
     blend.save(ROOT/f"{id}--overlay-{kind}.png")
     comp.append(p)
   pts[kind]=sim
  item['measures']=pts
  if pts.get("pdf") and pts.get("docx"):
   pair=[]
   first_p=item["cvFirstPage"]["pdf"]
   first_d=item["cvFirstPage"]["docx"]
   for idx in range(min(len(web),item.get("cvPagesPdf",0),item.get("cvPagesDocx",0))):
    a=snap(pdf,first_p+idx,"pdf");b=snap(pdoc,first_d+idx,"docx")
    if a and b: pair.append({"page":idx+1,**similarity(view(a),view(b))})
   item["measures"]["pdf_docx"]=pair
  if (ROOT/f"{id}--overlay-pdf.png").exists() and (ROOT/f"{id}--overlay-docx.png").exists():
   imgs=[base,view(ROOT/f"{id}--overlay-pdf.png"),view(ROOT/f"{id}--overlay-docx.png")]
   sheet=Image.new('RGB',(794*3,1160),'white')
   for i,im in enumerate(imgs):sheet.paste(im,(i*794,37))
   draw=ImageDraw.Draw(sheet)
   for i,txt in enumerate(['Web preview','Web / PDF overlay','Web / Legacy DOCX overlay']):draw.text((i*794+20,10),txt,fill='black')
   sheet.save(ROOT/f"{id}--comparison.png")
 if item.get("cvPagesDocx") is not None:
  item["cvExtraDocxPages"]=max(0,item["cvPagesDocx"]-len(web))
 if item.get("cvPagesPdf") is not None:
  item["cvExtraPdfPages"]=max(0,item["cvPagesPdf"]-len(web))
 out.append(item)
 (ROOT/"measurements.json").write_text(json.dumps(out,indent=2,ensure_ascii=False))
 print(id,item.get("pdfPages"),item.get("docxPdfPages"),item.get('measures'))

stress=ROOT/"modern-margin47--docx.docx"
if stress.exists():
 (ROOT/"margin-stress.json").write_text(json.dumps({"requestedCvBottomMm":47,"docxSectionsMm":sections(stress)},indent=2))
