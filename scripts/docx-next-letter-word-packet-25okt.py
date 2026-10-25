"""Package two pinned recipient-minimum candidates for separate desktop Word review.

This copies existing verified synthetic DOCX bytes; it never rewrites a document,
changes a photo owner, runs Word, or grants acceptance. Generated files stay out of Git.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

from lxml import etree as ET

spec = importlib.util.spec_from_file_location(
    'word_reader', Path(__file__).with_name('docx-next-word-acceptance-23okt.py'))
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)

INPUTS = {
    'Letter-Candidate.docx': ('01-Brief-Standard.docx',
        'b663a5efa1eb2b86494955983f869af5f3d744c40b85b23620e8c201099d7e2b'),
    'wide-Candidate.docx': ('02-Brief-Breiter-Empfaenger.docx',
        'b157868f87d21ff065f2af798add7375542b306f1ca2cb11940607b636b841bc'),
}
APP_SHA256 = '031159442ef39dc2f7191d409b1e507cc45fccf6b591f39d474976d70fe5345b'
PHOTO_SHA256 = 'f8ba8f4b000d9aa4f18a5f476a630615232905810aec92c69d4e128cbfdec69c'
README = '''# Word-Prüfung: Empfänger-Mindesthöhe, Version 2 vom 25. Oktober 2026

Dieses separate Paket prüft ausschliesslich die neue Brief-Komposition. Beide
DOCX enthalten vollständige synthetische Dossiers mit einem Prüfmuster als Foto.
Das bestehende Fotoprüfpaket bleibt gültig und unverändert. Dies ist kein neuer
Fotoverankerungs-Kandidat. Der normale Export bleibt unverändert.

Datei 01 enthält den Standardbrief. Datei 02 enthält denselben Brief mit einer
absichtlich breiten Empfängerzeile aus zehn W-Gruppen. Diese Zeile soll natürlich
umbrechen und die Empfängerfläche vergrössern. Die Schrift wird nicht verkleinert.
Die anschliessende Datumszeile soll ohne Überschneidung und ohne zusätzlich
reservierten Leerraum folgen. Titelblatt und CV bleiben in beiden Dateien gleich.

Datei 03 ist die vorhandene App-Referenz des Standardfalls. Sie stammt aus dem
ursprünglichen Browserexport, nicht aus einer neuen Aufnahme. Für die künstliche
W-Zeile gibt es keine eigene frische App-Referenz. Beide Kandidaten haben intern
vier Seiten: Titelblatt, Brief und zwei CV-Seiten. Das ist keine Word-Abnahme.

## Prüfung in Desktop Word, wenn Zeit dafür ist

1. Zuerst Datei 01 öffnen. Vier Dossierseiten, Briefseite, Empfänger, Datum,
   Unterschrift/Beilagen und den unveränderten Bildausschnitt ansehen.
2. Ohne Bearbeitung als neue Datei speichern, schliessen und wieder öffnen.
   Diesen Stand als Save1 aufbewahren. Anschliessend erneut unverändert als
   Save2 speichern, schliessen und wieder öffnen. Beide DOCX getrennt behalten.
3. Datei 02 ebenso prüfen. Alle 60 W müssen lesbar sein; der Empfänger darf
   umbrechen und wachsen. Auf Datum, Folgeabstände und Seitenzahl achten.
   Save1 und Save2 getrennt aufbewahren.
4. Eine PDF-Ausgabe jedes wieder geöffneten Falls zusammen mit den gespeicherten
   DOCX ermöglicht den Vergleich von Darstellung und Feld-/Bildbesitz.

Foto-Bewegen/Umfluss, Crop und Ersetzen gehören weiterhin zum separaten
Fotoprüfpaket. Diese Brief-Dateien behalten den bisherigen typisierten
Inline-Fotobesitzer; sie versprechen keine neue Word-Fotobedienung.

## Rücklaufprüfung für den Agenten

Die jeweils unveränderte enthaltene DOCX ist die Kontrollquelle für ihren eigenen
Save1/Save2-Rücklauf. Den breiten Fall nicht gegen den Standardfall vergleichen.
Der bestehende Leser bleibt unverändert:

```sh
python scripts/docx-next-word-acceptance-23okt.py 01-Brief-Standard.docx WORD-SAVE1.docx NEW-REPORT.json
```

Er ist ein lesender XML-Bericht, keine automatische Freigabe. Alle 145 ursprünglichen
Feldvorkommen, ihre Inhalte, kanonischen Rollen und Besitzer sowie Originalbild und
numerischer Crop müssen erhalten bleiben. Hinzu kommen sichtbare Word-Prüfung,
Empfänger-Zeilenwachstum und tatsächliches Schliessen/Wiederöffnen. Native Tabellen-
Mindesthöhe und Feldstruktur getrennt anhand des Rücklaufs beurteilen; Bildschirmaussehen
allein belegt keine erhaltenen Felder. Keine Word- oder Gesamtfreigabe aus einem
Selbstvergleich oder aus den internen Writer-Bildern ableiten.

Der Referenz-Funktionsumbruch im CV bleibt offen. Das bekannte Writer-Speicherproblem
ist durch diese Änderung nicht behoben. Kein Merge und keine Produktionsfreigabe.
'''


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect_candidate(path):
    package = reader.inspect(path)
    photos = [p for p in package['pictures'] if 'cv.person.photo' in p['owners']]
    photo_controls = package['fields'].get('cv.person.photo', [])
    if (sum(map(len, package['fields'].values())) != 145 or len(package['fields']) != 134
            or len(photos) != 1 or len(photo_controls) != 1
            or not photo_controls[0]['typedPicture']
            or photos[0]['embeddedFileSha256'] != PHOTO_SHA256
            or photos[0]['imageRelationshipStatus'] != 'RESOLVED_EMBEDDED_IMAGE'
            or not photos[0]['storyRoles'] or not photos[0]['pixels']):
        raise ValueError('Initial canonical fields/original typed photo are not preserved')
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    rows = root.xpath('.//w:tr[w:trPr/w:trHeight]', namespaces=reader.NS)
    if len(rows) != 1:
        raise ValueError('Require exactly one recipient minimum row')
    row = rows[0]
    heights = row.findall('w:trPr/w:trHeight', reader.NS)
    tags = row.xpath('.//w:sdtPr/w:tag/@w:val', namespaces=reader.NS)
    if (len(heights) != 1 or heights[0].get('{'+reader.W+'}val') != '1381'
            or heights[0].get('{'+reader.W+'}hRule') != 'atLeast'
            or row.find('w:trPr/w:cantSplit', reader.NS) is not None
            or len(tags) != 4 or not all(t.startswith('letter.recipient.') for t in tags)):
        raise ValueError('Require the pinned growable recipient composition')
    return {'controlOccurrences': 145, 'canonicalTags': 134,
            'recipientMinimumTwips': 1381, 'recipientHeightRule': 'atLeast',
            'recipientFields': tags, 'recipientRowCanSplit': True,
            'originalPhotoSha256': PHOTO_SHA256, 'photoPixels': photos[0]['pixels'],
            'photoCropFractions': photos[0]['cropFractions'], 'typedPhotoOwner': True}


def build(replay, app_pdf, output):
    payloads, checks = {}, {}
    for original, (name, expected) in INPUTS.items():
        path = replay / original
        data = path.read_bytes()
        if digest(data) != expected:
            raise ValueError('Only the exact pinned recipient-minimum inputs are accepted')
        checks[name] = inspect_candidate(path)
        payloads[name] = data
    app = app_pdf.read_bytes()
    if digest(app) != APP_SHA256:
        raise ValueError('Require the original pinned App reference')
    if output.exists():
        raise ValueError('Use a new output ZIP path')
    payloads['03-App-Referenz-Standard.pdf'] = app
    payloads['README.md'] = README.encode('utf-8')
    manifest = {'scope': 'SEPARATE_LETTER_RECIPIENT_MINIMUM_WORD_PACKET_V2',
        'files': {n: {'sha256': digest(b), 'bytes': len(b)} for n, b in payloads.items()},
        'initialChecks': checks, 'freshBrowserCapture': False,
        'wordAcceptance': 'UNVERIFIED', 'wordUiOrSaveReopenPerformed': False,
        'photoOwnerOrAnchorChanged': False, 'productionExportChanged': False,
        'existingPhotoPacketSha256': '430f88185d3091270d8cc7f40bade4fa295abc000cbdb22a6575b7c6e510f509'}
    payloads['manifest.json'] = (json.dumps(manifest, ensure_ascii=False, indent=2)+'\n').encode()
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation protects inputs and existing delivery packets. Fixed ZIP
    # metadata makes separate builds reproducible without touching document bytes.
    with ZipFile(output, 'x', compression=ZIP_DEFLATED) as archive:
        for name, data in payloads.items():
            info = ZipInfo(name, date_time=(2026, 10, 25, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    return {'zipSha256': digest(output.read_bytes()), 'bytes': output.stat().st_size,
            'files': len(payloads), 'wordAcceptance': 'UNVERIFIED'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['replay', 'app_pdf', 'output']:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.replay, args.app_pdf, args.output)))


if __name__ == '__main__':
    main()
