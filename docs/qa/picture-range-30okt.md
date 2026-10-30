# Freies Foto: nichtleerer Kontrollbereich, 30. Oktober 2026

**Diagnose, keine Produkt- oder Word-Freigabe.** Der normale Renderer wurde
nicht geaendert. Die neue Variante bleibt auf die bestehende synthetische
Fixture `app-body-photo-free-main` begrenzt und veraendert nur die Quell-XML.
Gespeicherte Pakete werden nicht repariert; bestehende Gates bleiben bestehen.

## Neu verifizierte bestehende Belege

Das Archiv `12994854230` des Code-Commits `e395d4d6` wurde heruntergeladen.
Sein SHA-256 stimmt mit dem veroeffentlichten Digest ueberein:
`1dbf1bc61c10f81991735dc6f4c2958cbc3dcbf590f5d059fa9e6012e3ca8c6e`.
Die lesende Wiederholung von `docx-next-picture-owner-audit.py` bestaetigt alle
66 DOCX-/PDF-Phasenbindungen und dieselben vier leeren Bildkontrollen.
Die neue Archivpruefung schliesst damit die zuvor dokumentierte lokale Belegluecke.

Auch die aktuelle Geometriematrix wurde nachgezaehlt: 18/22 Faelle sind exakt
stabil. Dieselben vier rechten Sidebar-Faelle scheitern an sichtbarer,
serialisierter und in der CI gemessener oeffentlicher Rastergeometrie.
Eine neue oeffentliche UNO-Messung wurde dabei nicht durchgefuehrt.

## Konkrete Hypothese und Gegenversuche

Der zum CI-Release passende Writer-Code erzeugt in `PopSdt()` eine Kontrolle
ueber einen Textbereich. `ImportGraphic()` behandelt verankerte Objekte
zusaetzlich als Absatzobjekte. Daraus folgt die **Hypothese**, dass ein Bereich
ohne eigene Textzeichen den Verlust der Bildzuordnung beguenstigt. Die genaue
interne Import-/Export-Ursache ist damit noch nicht instrumentiert nachgewiesen.

Ein begrenzter Gegenversuch setzt vor und hinter das unveraenderte Drawing je
einen WORD JOINER (`U+2060`, Schriftgroesse 0.5 pt). Das Foto bleibt frei
verankert, rund und mit unveraendertem Rand, Crop und Bildquellbytes. Alle
anderen Paketbestandteile bleiben bytegleich. Die zwei neuen Textzeichen sind
eine Diagnosehilfe und keine angenommene Erweiterung des Produktionsformats.

| Entwicklungsengine, zwei Speicherzyklen | Unveraendert | Nichtleerer Bereich |
| --- | --- | --- |
| Eigene typisierte Bildkontrolle in allen Phasen | nein | ja |
| Foto in allen drei PDFs vorhanden | ja | ja |
| Quell-PDF exakt gleich der unveraenderten Quelle | ja | ja |
| Sichtbare Geometrie nach beiden Speicherzyklen exakt gleich | ja | ja |
| Urspruengliche RGBA-Pixel erhalten | nein | nein |

Diese Ergebnisse stammen ausschliesslich von der vorhandenen
`LibreOfficeDev 26.8.0.0.alpha0`, Build
`2c87e51eeaa2b413ff4ae097b2705eea1995d8e5`, mit getrennten CLI-Profilen.
Sie sind keine Abnahme der gepinnten CI-Engine 25.8.7.3 und keine Word-Abnahme.

Ein vorausgehender Versuch mit `w:vanish` an denselben Bereichszeichen blieb
zwar ebenfalls ueber beide Speicherzyklen zugeordnet, blendete aber das Foto
schon im Quell-PDF aus. Er ist ausdruecklich verworfen. Nur gleiche PDFs
zwischen Speicherzyklen haetten diesen Fehlschlag nicht gezeigt. Der Pruefer
meldet deshalb jetzt zusaetzlich den Vergleich zur unveraenderten Quellansicht
und die Fotoanzahl in allen drei Phasen. Ohne mitgesammelte Baseline bleiben
diese Zusatzbefunde ungemessen; sie werden nicht als Erfolg ausgegeben.

## Verbleibende Grenzen

Die gepinnte native CI prueft denselben neuen Gegenversuch als achte Variante.
Ihr Ergebnis ist bis zum Abschluss offen. Die Quellen der App-Matrix selbst
werden nicht auf den Bereichsversuch umgestellt.

Die Neurasterung runder Fotos, die rechte Rasterdrift und die Desktop-Word-
Abnahme bleiben offen. Vor einer Produktintegration muss zusaetzlich geklaert
werden, ob Word die zusaetzlichen Bereichszeichen in einer typisierten
Bildkontrolle unveraendert und ohne Reparatur akzeptiert. Kein Merge.

Maschinenlesbare Belege: [picture-range-30okt.json](picture-range-30okt.json).
Gelesene primaere Quellen, jeweils auf die CI-Version gebunden:

- [DomainMapper_Impl.cxx](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/sw/source/writerfilter/dmapper/DomainMapper_Impl.cxx)
- [docxattributeoutput.cxx](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/sw/source/filter/ww8/docxattributeoutput.cxx)
