# Gespiegeltes CV-Foto: Word-Abnahme vom 30. Oktober 2026

Der Nutzer hat Titelblatt, Brief und normalen CV in Desktop-Word geändert,
gespeichert und visuell bestätigt. Die zurückgespeicherten Dateien behalten
alle ursprünglichen Feldkennungen: Titelblatt 11/11, Brief 28/28 und CV 53/53.
Jeweils ein Inhaltsfeld wurde geändert. Die privaten Rückläufer und der Screenshot
bleiben ausserhalb dieses öffentlichen Repositorys.

Beim gespiegelten CV zeigt Word das Foto im Hauptbereich statt in der rechten
Sidebar. Der aktive Bildumbruch ist «Quadrat»; nach manueller Umstellung auf
«Vor den Text» lässt sich das Foto laut Nutzer frei an den gewünschten Ort setzen.
Der übermittelte 04-Rückläufer ist bytegleich zum Ausgangsdokument; er enthält
keine gespeicherte manuelle Umstellung. Der Screenshot und die Rückmeldung sind
der konkrete Word-Befund, keine Abnahme des gespiegelten Ausgangsdokuments.

## Begrenzte Korrektur

Nur das gewöhnliche `cv.person.photo` in der gespiegelten rechten Sidebar erhält
`wrapMode: none`. Der gemeinsame Renderer erzeugt daraus bereits `wp:wrapNone`,
`behindDoc=0` und `allowOverlap=1`. Die linke Variante, Fotos im Hauptbereich,
Fotoquelle, Rahmen, Ausschnitt, Text und reservierter Fotoplatz bleiben unberührt.
Die Modellprüfung erlaubt diese Kombination nur für dieses rechte Seitenfoto.
Die Darstellung «Vor den Text» ist in der
[Microsoft-Open-XML-Dokumentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.drawing.wordprocessing.wrapnone?view=openxml-3.0.1#remarks)
für `wrapNone` mit `behindDoc=false` definiert.

Die neue Datei 04b stammt aus dem tatsächlichen Browser-Download des Kandidaten.
Gegenüber der bisherigen 04 unterscheiden sich ausschliesslich die beiden
Umbruch-/Überlagerungsangaben in `word/document.xml`; alle anderen Paketdateien,
Bildbytes und Feldinhalte sind bytegleich. Die deklarierten Koordinaten bleiben
erhalten; es wird kein rendererabhängiger X-Versatz kompensiert.

## Prüfstand

- 1471/1471 Unit-Tests bestanden, 280 Dateien; zusätzliche Verengung auf die
  bekannte Bildkennung mit sieben gezielten Foto-Tests nachgeprüft.
- Echter gespiegelter Handy-CV-Download bestanden; Quelldaten unverändert.
- App-Typprüfung und Lint der geänderten Dateien bestanden.
- Native LibreOffice-Ausgabe: eine Seite, Foto in der rechten Sidebar.
  LibreOffice setzt seine linke Bildkante bei ungefähr 175 mm statt der im XML
  deklarierten 155 mm. Daraus wird keine exakte Word-Positionsabnahme abgeleitet.
- Der Nutzer hat die neue 04b nach der angeforderten Word-Gegenprobe bestätigt
  («jez super danke weiter»). Die zurückgespeicherte Datei behält `wrapNone`,
  `behindDoc=0`, `allowOverlap=1`, alle 53 ursprünglichen Feldkennungen und
  sämtliche Feldinhalte. Alle neun Bilder sind nach RGBA-Dekodierung identisch;
  Word hat die Mediendateien umbenannt. Die geänderten Foto-Koordinaten belegen
  die gespeicherte manuelle Verschiebung. Der private Rückläufer bleibt ausserhalb
  dieses Repositorys. Dies schliesst die vier angeforderten Word-Dateien ab,
  nicht die gesamte Vorlagenmatrix.

Ausgangsbasis: `80877763df6e80124ba9d42305e595a4fe1b97ae`.
Die Korrektur wird mit dem separat geprüften Seitenanpassungsfix für kompakte
klassische CVs integriert. Gemeinsamer Abschlussprüfstand und CI stehen im
Handoff vom 30. Oktober.
