"""Combine the two bounded synthetic candidates for internal/native Word review.

No production export, Word UI action or general acceptance is performed.
All binary inputs and outputs stay outside Git. No input is modified.
"""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
import shutil
from zipfile import ZipFile

from lxml import etree as ET

spec = importlib.util.spec_from_file_location('return_check',
    Path(__file__).with_name('docx-next-photo-rich-owner-return.py'))
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)
LETTER_HASH = '4818ed92d27358cc719309a5431a1d45278b0631cb851089d3a6aa71bd0c0c73'
APP_HASH = '031159442ef39dc2f7191d409b1e507cc45fccf6b591f39d474976d70fe5345b'


def build(control, letter, app_pdf, output):
    for path, expected in [(control, check.trial.CONTROL_SOURCE_SHA256),
                           (letter, LETTER_HASH), (app_pdf, APP_HASH)]:
        if check.reader.digest(path.read_bytes()) != expected:
            raise ValueError('Use only the pinned current synthetic review inputs')
    if output.exists():
        raise ValueError('Use a new output directory')
    output.mkdir(parents=True)
    candidate = output/'01-Kombinierter-Kandidat.docx'
    with ZipFile(letter) as before, ZipFile(candidate, 'w') as after:
        root = ET.fromstring(before.read('word/document.xml'))
        check.trial.promote(root, 'inline')
        for info in before.infolist():
            payload = (ET.tostring(root, xml_declaration=True, encoding='UTF-8')
                       if info.filename == 'word/document.xml' else before.read(info.filename))
            # Preserve the source's ZIP metadata: repeated runs are byte-exact.
            after.writestr(copy.copy(info), payload)
    transform = check.trial.verify(letter, candidate, 'inline')
    preservation = check.compare(candidate, candidate)
    if preservation['failedChecks']:
        raise ValueError('Combined initial rich owner fails the bounded preservation contract')
    baseline = output/'02-Brief-Kontrollkandidat.docx'
    reference = output/'03-App-Referenz.pdf'
    shutil.copyfile(letter, baseline)
    shutil.copyfile(app_pdf, reference)
    manifest = {'scope': 'COMPLETE_SYNTHETIC_DOSSIER_INTERNAL_REVIEW_ONLY',
                'sourceControlSha256': check.trial.CONTROL_SOURCE_SHA256,
                'letterCandidateSha256': LETTER_HASH, 'appPdfSha256': APP_HASH,
                'candidateSha256': check.reader.digest(candidate.read_bytes()),
                'ownerTransform': transform,
                'initialRichOwnerCheck': preservation,
                'wordAcceptance': 'UNVERIFIED', 'renderingStatus': 'NOT_CHECKED_BY_THIS_SCRIPT',
                'referenceWrap': 'INHERITED_OPEN', 'productionExportChanged': False}
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    (output/'README.md').write_text('''# Vollständiger interner Word-Kandidat – 25. Oktober 2026

`01-Kombinierter-Kandidat.docx` verbindet den begrenzten Brief-Abstandskandidaten
mit dem Inline-Rich-Text-Besitzer des Fotos. Es ist ein vollständiges vierseitiges
synthetisches Dossier mit Prüfmuster, kein persönliches Foto. Der normale Export
bleibt unverändert. Der Referenzumbruch bleibt offen.

`02-Brief-Kontrollkandidat.docx` enthält nur den Brief-Abstandskandidaten und
weiterhin den bisherigen typisierten Foto-Besitzer. Beide DOCX unterscheiden
sich ausschliesslich durch den Foto-Besitzer. Diese zweite Datei dient dem
gezielten Vergleich; bearbeitet wird zunächst Datei 01.
`03-App-Referenz.pdf` ist die vorhandene App-Referenz; kein neuer Browserexport.
`manifest.json` dokumentiert Herkunft und Hashes. Es belegt keine Word-Bedienung.

Die externe Erstprüfung am 25. Oktober zeigt vier Seiten, unverändertes
Originalbild/Crop und 145/145 Feldvorkommen. Gegenüber Datei 02 sind alle Seiten
im gebündelten Renderer pixelidentisch. Zwei anschliessende Speicherzyklen mit
LibreOfficeDev 26.8 alpha0 verlieren bei beiden Foto-Besitzern Originalpixel und
viele Feldvorkommen. Dieser Kandidat löst das bekannte Writer-Speicherproblem
also nicht. Für Word gibt es noch keinen Bedienungs-/Speichernachweis.

Falls `04-Interne-Writer-Vorschau.pdf` beigelegt ist, zeigt sie nur die anfängliche
interne Darstellung des Kandidaten. Sie ist kein Word-Rücklauf.

## Word-Prüfung, sobald sie möglich ist

1. Kandidat in Desktop Word öffnen. Seiten, Brief-Abstände und Bildausschnitt
   vergleichen. Unbearbeitet unter neuem Namen speichern, schliessen, wieder öffnen.
2. Mit einer weiteren frischen Kopie das CV-Foto auf Seite 3 auswählen. Prüfen,
   ob ein normaler Textumbruch wählbar ist, dann umstellen und das Foto verschieben.
   Den tatsächlich gespeicherten Stand getrennt aufbewahren und erneut öffnen.
3. Crop/Zurücksetzen und Ersetzen jeweils in weiteren Kopien prüfen. Diese Aktionen
   verändern absichtlich Bild oder Ausschnitt und gehören nicht zum unveränderten
   Positions-/Besitzergate. Kopieren des Fotos aus seinem Control ist kein Erfolg.

Die XML-Prüfung für unverändertes Bild bzw. Umfluss/Bewegen benutzt als erstes
Argument den enthaltenen Brief-Kontrollkandidaten mit SHA-256
`4818ed92d27358cc719309a5431a1d45278b0631cb851089d3a6aa71bd0c0c73`:

```sh
python scripts/docx-next-photo-rich-owner-return.py 02-Brief-Kontrollkandidat.docx \\
  01-Kombinierter-Kandidat.docx WORD-SAVED.docx NEW-REPORT.json
```

Sie prüft Feldzuordnung, aktive eingebettete Originalbytes/-pixel, Crop und Rahmen.
Sie beweist weder Word-Bedienung noch sichtbare Platzierung, Wiederöffnung oder
Gesamtfreigabe. Falls Umfluss weiter ausgegraut ist, bleibt die Foto-Hypothese
unbestätigt; dann nicht in den Export integrieren.
''')
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ['control', 'letter', 'app_pdf', 'output']:
        parser.add_argument(name, type=Path)
    args = parser.parse_args()
    result = build(args.control, args.letter, args.app_pdf, args.output)
    print(json.dumps({k: result[k] for k in ['candidateSha256', 'wordAcceptance', 'referenceWrap']}))


if __name__ == '__main__':
    main()
