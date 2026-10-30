# Bildzuordnung nach Speichern: Vertrag und Gegenversuche, 30. Oktober 2026

**Keine Produktions- oder Word-Freigabe.** Diese Fortsetzung korrigiert die
Pruefung von Bildkontrollen und grenzt zwei unabhaengige Fehler ein. Der normale
App-Renderer und die bestehenden Bildstrukturtests wurden nicht veraendert.

## Geschlossene Pruefluecke

Die Inhaltspruefung kontrollierte eine erhaltene Fotokennung und ein global
sichtbares Foto. Nun wird zusaetzlich pro Quelle und Speicherphase geprueft:

- genau eine aktive Kontrolle mit der erwarteten Kennung und `w:picture`;
- genau ein eigenes Drawing mit genau einer eigenen eingebetteten Bildbeziehung;
- kein geliehenes Bild aus einem Nachbarfeld, Textkasten oder inaktiven XML-Zweig;
- gueltige interne Beziehung zu einer vorhandenen und dekodierbaren Bilddatei;
- separat: Quellgroesse, RGBA-Pixel und Paketbytes der tatsaechlich eigenen Datei.

Fehlende Bildzuordnung wird nie durch die einzige Foto-Datei im Paket ersetzt.
Die CI verlangt `--require-picture-ownership`. Ein Bericht kann weiterhin
`contentRoundtripAcceptance: pass` melden und an der unabhaengigen strengen
Bildzuordnung scheitern. Die Geometriesammlung laeuft nach diesem Stopp weiter,
sofern die vollstaendige Inhaltsmatrix vorliegt.

23 adversarielle Vertragstests bestehen lokal; sie decken unter anderem leere
Kontrollen neben einem sichtbaren Foto, echte Duplikate, falsche Beziehungen,
verschachtelte Rahmen, Bildverweise neben einem leeren Drawing sowie geaenderte
RGB-/Alpha-Pixel ab. Die zehn bestehenden Import-Vertragstests und die
App-Typpruefung bestehen ebenfalls. Aeltere dateibasierte Tests sind lokal am
Windows-Tempverzeichnis gescheitert; ihre Linux-CI-Ergebnisse werden separat
gewertet und nicht als lokale Erfolge ausgegeben.

## Richtige Auswertung alternativer Darstellungen

Writer exportiert moderne Word-2010-Formen und eine aeltere VML-Ersatzdarstellung
in `mc:AlternateContent`. Nur der ausgewaehlte Zweig ist aktiv. Die Pruefung
projiziert fuer die hier erzeugten Formen die unterstuetzte `wps`-Choice und
verwendet sonst den vorhandenen Fallback. Namespace-Bindungen werden im lokalen
Elementkontext aufgeloest; nicht gebundene Anforderungen werden abgelehnt.

Ein kanonisches Feld in der inaktiven Ersatzdarstellung ist keine zweite aktive
Kontrolle. Zwei gleichnamige Kontrollen im gewaehlten Zweig bleiben ein Fehler.
Ein Bild aus einem inaktiven Zweig kann eine leere aktive Kontrolle nicht retten.
Dies erweitert keine Bild-/Geometrie-Toleranz und veraendert kein Exportpaket.

## Tatsaechliche native Gegenversuche

Alle folgenden Gegenversuche verwenden dieselbe reale App-Fixture
`app-body-photo-free-main`, bestehende Bilddaten, unveraenderte andere Paketdateien
und zwei Speicherzyklen. Jede Variante bleibt eine Diagnose ohne Freigabe.

| Variante | Bildzuordnung stabil | Originalpixel stabil | sichtbare Geometrie ueber Speicherzyklen |
| --- | --- | --- | --- |
| Direkt verankerte Ellipse | nein | nein | stabil |
| Direkt verankertes Rechteck | nein | nicht nachgewiesen, Zuordnung fehlt | stabil |
| Direkt verankertes Rechteck ohne Crop | nein | nicht nachgewiesen, Zuordnung fehlt | stabil |
| Inline-Ellipse | ja | nein | stabil |
| Inline-Rechteck ohne Rand | ja | ja | stabil |
| Zeichenbezogene freie Verankerung | nein | nein | stabil |
| Urspruenglicher freier Bildrahmen | nein | nein | instabil |

Das Rechteck-Inline-Ergebnis ist eine positive technische Kontrolle. Form,
Rand und Positionierungsverhalten unterscheiden sich von der benoetigten freien
runden Fotovariante; daraus wird keine gleichwertige Produktloesung abgeleitet.

Die Wiederherstellung des urspruenglichen Rahmenpakets erfolgt durch den echten
unveraenderten Renderer. Seine Rekonstruktion prueft Bytegleichheit mit dem
tatsaechlichen App-Paket im jeweiligen Modus. Quell-Hashes:

- direkt: `7dd758c90f92d5a490ef022923c738edff042c539aa578e451aa1909bcd81923`;
- Rahmen: `097ee7f74bbbf9571a46c1840a97814725c61c19864d2c79f888eb9378a0eb95`.

Beim Rahmen lautet die Anzahl physischer Foto-Kontrollen ueber die Phasen
`1,2,2`, die Anzahl aktiver Kontrollen dagegen `1,1,1`. Die Bildzuordnung bleibt
trotz dieser korrekt behandelten Alternativen fehlerhaft. Die vollstaendige
App-Pruefung des Rahmenversuchs scheitert ausserdem an der nativen Feldreihenfolge.
Die normale Rahmenkomposition ist deshalb kein angenommener Ersatz fuer den
direkten Kandidaten. Der isolierte CI-Kandidat verwendet wieder seinen vorherigen
direkten Modus; dessen negative Besitzbefunde werden jetzt strikt erkannt.

## Bindung der bisherigen Belege

`picture-owner-contract-30okt.json` ist die unabhaengige, rein lesende Neuauswertung
der 66 gebundenen DOCX-/PDF-Phasen des Code-Commits `3972e87b`. Ihr Inhaltsbericht
ist durch SHA-256 gebunden. Sie startet keine nativen Exporte. Die vier darin
abgelehnten direkten Fotofaelle bleiben auch nach der Alternativen-Auswertung
abgelehnt. Die fruehere Inhaltsfreigabe allein ist kein Besitznachweis.

Ausgefuehrte neue Laeufe:

- [cfdf5721: Native Matrix](https://github.com/modebrecht/cv-cover-charm/actions/runs/41089779138):
  die sechs ersten Gegenversuche wurden gesammelt; der strenge Besitzvertrag
  weist den direkten Kandidaten nach 22 Inhaltsfaellen zurueck.
- [cfdf5721: Release-Regression](https://github.com/modebrecht/cv-cover-charm/actions/runs/41089779156):
  vollstaendig erfolgreich, einschliesslich 1490 Unit-Tests und elf Browsergruppen.
- [e04eb8ed: Native Matrix](https://github.com/modebrecht/cv-cover-charm/actions/runs/41092237822):
  sieben Gegenversuche einschliesslich des echten Rahmenpakets ausgefuehrt;
  Rahmen-App-Matrix an der nativen Feldreihenfolge gestoppt.

Ein zwischenzeitlicher `stable-comparison`-Lauf scheiterte am unveraenderten
Vertrag fuer sparse Import-Callbacks. Die Kriterien wurden beibehalten. Rohdaten
werden nun vor dieser Validierung gespeichert und als Artefakt erhalten, damit
eine kuenftige Abweichung nicht wieder nur als unspezifisches AssertionError endet.
Der historische `picture-identity`-Paket-Pin wurde ebenfalls nicht ersetzt.

## Grenzen und naechster Schwerpunkt

Die durchgefuehrte Word-UI-Anbahnung hat kein Testdokument erfolgreich geoeffnet
oder gespeichert. Es gibt weiterhin keine neue Desktop-Word-Abnahme fuer diesen
Pfad. Die frueher vom Nutzer bestaetigten Produktdateien werden dadurch nicht
neu bewertet.

Die beiden Restprobleme bleiben getrennt: Writer verliert die eigene Bildbindung
bei freien Objekten beziehungsweise aendert ihre native Feldreihenfolge; runde
Bildformen werden neu gerastert. Die rechte Tabellenrasterdrift bleibt ebenfalls
offen. Keine nachtraegliche Reparatur gespeicherter Pakete und keine Lockerung
der bestehenden Grenzen wurden als Erfolg gewertet.
