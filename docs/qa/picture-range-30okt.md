# Freies Foto: nichtleerer Kontrollbereich, 30. Oktober 2026

**Bereichs-Workaround wegen Normverletzung verworfen.** Der normale Renderer wurde
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

Auch die aktuelle Geometriematrix wurde nachgezaehlt und alle 44 PDF-Uebergaenge
erneut gerendert und verglichen: 18/22 Faelle sind exakt
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
| Ein eigenes Drawing und ein Bildverweis in allen Phasen | nein | ja |
| Textfreier Inhalt der typisierten Bildkontrolle | ja | nein |
| Strenger Bildvertrag in allen Phasen | nein | nein |
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

Die [Microsoft-Dokumentation zu `w:picture`](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sdtcontentpicture?view=openxml-3.0.1)
gibt die einschlaegige ISO-Regel wieder: Eine solche Kontrolle ist auf ein
einzelnes DrawingML-Bild beschraenkt. Zusaetzliche WORD JOINER-Zeichen sind
weiterhin Text. Der Versuch erklaert moeglicherweise den Writer-Mechanismus,
ist aber als Produktfix verworfen; ein Word-Versuch wuerde diese Normverletzung
nicht aufheben.

Der strenge Pruefer lehnt jetzt zusaetzlichen Text einschliesslich unsichtbarer,
ausgeblendeter und Feldcode-Zeichen in Bildkontrollen ab. 26 Vertragstests bestehen.
Alle 66 alten Phasen wurden mit diesem strengeren Vertrag erneut gelesen;
es bleiben dieselben vier Zuordnungsfehler. Die neuen Bereichsquellen werden
dagegen bereits vor dem ersten Speichern korrekt abgelehnt. Ihre Messung darf
nur als ausdruecklich ungueltiger Mechanismus-Gegenversuch weiterlaufen.

Die [gepinnten nativen Gegenversuche](https://github.com/modebrecht/cv-cover-charm/actions/runs/41123950685)
auf `84df3749` sind gesammelt: alle acht Varianten mit drei Phasen. Die
25.8.7.3-Engine bestaetigt denselben physischen Bereichseffekt. Auch der direkte
Vergleich zur unveraenderten Quellansicht und beide Speicheruebergaenge wurden
aus den erhaltenen PDFs unabhaengig neu gerendert: exakt gleich.

Das neue Archiv `13010975631` wurde heruntergeladen und gegen den Digest
`10d4781439a08eb9fb55c34fbfb6baaa3c48b5655819a6ed3c2d473bd599d607` verifiziert.
Alle 24 DOCX-/PDF-Probenbindungen wurden nachgeprueft. Der strengere Pruefer
lehnt die Bereichsvariante in Quelle und beiden Speicherphasen ab, obwohl
Drawing und Bildverweis physisch erhalten sind. Die 66 Phasen der regulaeren
App-Matrix ergeben damit weiterhin dieselben vier Zuordnungsfehler.

Der native Job auf `84df3749` verwendete noch den vorherigen Pruefer. Der neue
Textvertrag wurde mit den gespeicherten unveraenderten Belegen nachgeprueft;
dafuer wurden keine weiteren nativen Exporte ausgefuehrt. Ein durchgespielter,
hashgebundener Replay des aktualisierten Sammlers bestaetigt, dass dieser den
bewusst ungueltigen Bereichsversuch messen kann, ohne ihn als bestandenen
Bildvertrag auszugeben. Zusaetzlich bestehen elf Inhalts- und sieben Medien-
Vertragstests. Dieser QA-Nachtrag startet keine erneute volle Browsermatrix.

Die Neurasterung runder Fotos, die rechte Rasterdrift und die Desktop-Word-
Abnahme der unveraenderten, textfreien Quelle bleiben offen. Der Bereichs-
Workaround wird nicht integriert. Kein Merge.

Maschinenlesbare Belege: [picture-range-30okt.json](picture-range-30okt.json).
Gelesene primaere Quellen, jeweils auf die CI-Version gebunden:

- [DomainMapper_Impl.cxx](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/sw/source/writerfilter/dmapper/DomainMapper_Impl.cxx)
- [docxattributeoutput.cxx](https://github.com/LibreOffice/core/blob/libreoffice-25.8.7.3/sw/source/filter/ww8/docxattributeoutput.cxx)


## CI-Stand beim Abschluss

Stand 2026-10-30T20:40:53.141Z (UTC), Code `84df3749`:
Native Matrix: zwoelf Jobs erfolgreich, `app-body-content` korrekt am strengen
Bildvertrag gestoppt, historischer `picture-identity`-Pin weiterhin fehlerhaft;
`stable-comparison` noch offen. Release: Fast-Checks mit 1490 Unit-Tests bestanden,
acht von elf Browsergruppen erfolgreich; `dossier-flow`, `cv-pdf-core` und
`templates-layout` noch offen. Keine abschliessende Gesamtfreigabe behaupten.

Die Fortsetzung lief in der isolierten Linux-Umgebung. Der Windows-Checkout
wurde nicht erneut verbunden oder synchronisiert; sein letzter bestaetigter
Stand bleibt `e395d4d6`. `dev`, `main` und `render` sind unveraendert.
