"""Shared content/photo checks; independent of the visual report CLI."""
from pathlib import Path
import re,unicodedata
from xml.etree import ElementTree as ET
from zipfile import ZipFile
import numpy as np
from PIL import Image

COLORS = [(223,38,56), (25,168,103), (32,79,200), (255,240,36)]


def compact(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if c.isalnum())


def marker_pages(texts, markers):
    normalized = [compact(t) for t in texts]
    return {marker: [i+1 for i, text in enumerate(normalized) if compact(marker) in text] for marker in markers}


def docx_text(path):
    with ZipFile(path) as pkg:
        names = [n for n in pkg.namelist() if re.fullmatch(r'word/(document|[^/]*(?:header|footer)[^/]*)\.xml', n)]
        return ' '.join(t.text or '' for n in names for t in ET.fromstring(pkg.read(n)).iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'))


def photo_signature(rgb, page_mm=(210,297)):
    arr = np.asarray(rgb.convert('RGB'), dtype=np.int16)
    distances = np.max(np.abs(arr[:,:,None,:] - np.array(COLORS)), axis=3)
    labels = np.where(distances.min(2) < 18, distances.argmin(2) + 1, 0)
    y,x = np.where(labels > 0)
    if len(x) < 40: return {'visible': False, 'pixels': int(len(x))}
    x0,x1,y0,y1 = int(x.min()),int(x.max()),int(y.min()),int(y.max())
    crop = labels[y0:y1+1,x0:x1+1]
    grid = []
    for ys in np.array_split(crop,8,axis=0):
        for cell in np.array_split(ys,8,axis=1):
            count = np.bincount(cell.flatten(),minlength=5)
            grid.append(int(count.argmax()))
    h,w=labels.shape
    return {'visible':True,'pixels':int(len(x)), 'bbox_mm':[round(x0/w*page_mm[0],3),round(y0/h*page_mm[1],3),round((x1-x0+1)/w*page_mm[0],3),round((y1-y0+1)/h*page_mm[1],3)], 'grid':grid, 'colors':{str(i):int((crop==i).sum()) for i in range(1,5)}}


def compare_photo(expected, actual, *, tolerance_mm=2.0):
    if not expected.get('visible') or not actual.get('visible'):
        return {'status':'FAIL','reason':'calibration photo missing from App or DOCX PDF'}
    deltas = [round(abs(a-b),3) for a,b in zip(expected['bbox_mm'],actual['bbox_mm'])]
    agreement = sum(a==b for a,b in zip(expected['grid'],actual['grid'])) / 64
    ok = max(deltas) <= tolerance_mm and agreement >= .90
    return {'status':'PASS' if ok else 'FAIL','bbox_delta_mm':deltas,'max_allowed_mm':tolerance_mm,'pattern_agreement':round(agreement,4),'min_pattern_agreement':.90}

