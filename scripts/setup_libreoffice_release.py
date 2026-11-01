#!/usr/bin/env python3
"""One bounded, checksum-verified official LO 26.8.2 extraction for CI only."""
import argparse
import hashlib
import json
import re
import subprocess
import tarfile
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

VERSION='26.8.2'
FILENAME=f'LibreOffice_{VERSION}_Linux_x86-64_deb.tar.gz'
URL=f'https://download.documentfoundation.org/libreoffice/stable/{VERSION}/deb/x86_64/{FILENAME}'


def vendor_sha256(raw):
    xml=ET.fromstring(raw)
    files=[n for n in xml.iter() if n.tag.split('}')[-1]=='file' and Path(n.get('name','')).name==FILENAME]
    if len(files)!=1:raise ValueError('Missing unique official release file')
    hashes=[n.text.strip().lower() for n in files[0].iter() if n.tag.split('}')[-1]=='hash' and n.get('type','').replace('-','').lower()=='sha256' and n.text]
    if len(set(hashes))!=1 or not re.fullmatch('[0-9a-f]{64}',hashes[0]):raise ValueError('Missing unique vendor SHA256')
    return hashes[0]


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=Path,required=True);a=p.parse_args()
    root=a.root.resolve();root.mkdir(parents=True,exist_ok=True);started=time.monotonic()
    report={'requested_version':VERSION,'archive_url':URL,'metadata_url':URL+'.metalink','installation_attempts':1,'status':'BLOCKED'}
    try:
        if (root/'extracted').exists():raise ValueError('Extraction root already exists; no repeated installation')
        with urllib.request.urlopen(URL+'.metalink',timeout=30) as response:raw=response.read(2_000_001)
        if len(raw)>2_000_000:raise ValueError('Oversized metalink')
        (root/'release.metalink').write_bytes(raw);expected=vendor_sha256(raw);report['official_sha256']=expected
        archive=root/FILENAME;h=hashlib.sha256();size=0
        with urllib.request.urlopen(URL,timeout=30) as response,archive.open('wb') as output:
            while chunk:=response.read(1024*1024):
                size+=len(chunk)
                if size>350*1024*1024 or time.monotonic()-started>240:raise ValueError('Archive size/time cap exceeded')
                h.update(chunk);output.write(chunk)
        report.update(archive_bytes=size,archive_sha256=h.hexdigest())
        if h.hexdigest()!=expected:raise ValueError('Official archive SHA256 mismatch')
        packages=root/'debs';packages.mkdir();extracted=root/'extracted';extracted.mkdir();names=[]
        with tarfile.open(archive) as tar:
            for member in tar.getmembers():
                if not member.isfile() or not member.name.endswith('.deb'):continue
                name=Path(member.name).name
                if name in names:raise ValueError('Duplicate DEB basename')
                names.append(name);file=packages/name
                with tar.extractfile(member) as src,file.open('wb') as dst:
                    while chunk:=src.read(1024*1024):dst.write(chunk)
                subprocess.run(['dpkg-deb','--extract',str(file),str(extracted)],check=True,capture_output=True,timeout=30)
                if time.monotonic()-started>300:raise ValueError('Extraction time cap exceeded')
        binary=extracted/'opt/libreoffice26.8/program/soffice'
        result=subprocess.run([str(binary),'--headless','--version'],text=True,capture_output=True,check=True,timeout=20)
        version=result.stdout.strip()
        if not version.startswith('LibreOffice '+VERSION+'.'):raise ValueError('Unexpected extracted converter version: '+version)
        report.update(status='PASS',converter_path=str(binary),converter_version=version,deb_count=len(names),extracted_bytes=sum(f.stat().st_size for f in extracted.rglob('*') if f.is_file()),metadata_sha256=hashlib.sha256(raw).hexdigest())
    except (OSError,ValueError,ET.ParseError,tarfile.TarError,subprocess.SubprocessError) as exc:
        report['error']=str(exc)
        if isinstance(exc,subprocess.CalledProcessError):report['process_stderr']=str(exc.stderr)[-4000:]
    report['setup_seconds']=round(time.monotonic()-started,3);(root/'SETUP.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
    return 0 if report['status']=='PASS' else 1


if __name__=='__main__':raise SystemExit(main())
