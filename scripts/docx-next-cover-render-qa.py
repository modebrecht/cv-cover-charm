
#!/usr/bin/env python3
"""Measure a rejected cover experiment without turning package validity into visual acceptance."""
import argparse, json, re, subprocess, sys, xml.etree.ElementTree as E
from pathlib import Path
from zipfile import ZipFile

def run(*args):
    return subprocess.check_output(args,text=True)
def norm(text):
    return re.sub(r"\s+","",text).casefold()
def pages(path):
    return int(re.search(r"^Pages:\s+(\d+)",run("pdfinfo",str(path)),re.M)[1])
def cover_fields(path):
    ns={"w":"http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root=E.fromstring(ZipFile(path).read("word/document.xml"))
    fields={}
    for control in root.findall(".//w:sdt",ns):
        tag=control.find("w:sdtPr/w:tag",ns)
        if tag is None: continue
        key=tag.get("{"+ns["w"]+"}val","")
        if key.startswith("cover."):
            fields[key]="".join(t.text or "" for t in control.findall(".//w:t",ns))
    return fields
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("packages",type=Path);parser.add_argument("pdfs",type=Path)
    parser.add_argument("--check",action="store_true")
    args=parser.parse_args()
    matrix=json.loads((args.packages/"matrix.json").read_text())
    rows=[]
    for case in matrix["templates"]:
        key=case["id"]
        before=args.pdfs/(key+"-before.pdf");candidate=args.pdfs/(key+"-candidate.pdf")
        page1=norm(run("pdftotext","-f","1","-l","1",str(candidate),"-"))
        missing=[field for field,value in cover_fields(args.packages/(key+"-candidate.docx")).items()
                 if value.strip() and norm(value) not in page1]
        old,new=pages(before),pages(candidate)
        rows.append({"id":key,"beforePages":old,"candidatePages":new,
                     "missingCoverFieldsOnPage1":missing,
                     "layout":"FAIL" if missing or new!=old else "UNVERIFIED"})
    result={"status":"BLOCKED" if any(r["layout"]=="FAIL" for r in rows) else "UNVERIFIED",
            "engine":run("soffice","--version").strip()+" (not Microsoft Word)",
            "templates":rows,"failed":sum(r["layout"]=="FAIL" for r in rows),
            "wordVisualAcceptance":"UNVERIFIED"}
    (args.packages/"native-layout.json").write_text(json.dumps(result,indent=2)+"\n")
    print(json.dumps({"status":result["status"],"templates":len(rows),"failed":result["failed"],
                      "brief":rows[0]}))
    return int(args.check and result["status"]=="BLOCKED")
if __name__=="__main__":sys.exit(main())
