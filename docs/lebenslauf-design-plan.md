# Einheitliches Dossier: Plan für den Lebenslauf

## Worum es geht

Titelblatt und Lebenslauf sollen erkennbar zusammengehören. Aktuell tun sie das
nicht. Dieses Dokument hält fest, woran es liegt – nachgemessen, nicht
geschätzt –, was bleibt, was weg muss und in welcher Reihenfolge wir
weitermachen.

## Befund

| Was | Stand |
| --- | --- |
| Farben | werden übernommen, inklusive eigener Änderungen |
| Angaben zur Person, Foto | werden übernommen |
| Typografie, Abstände | über die Familien (`dossier-family`, `dossier-theme`) gemeinsam |
| **Struktur der Vorlage** | **wird nicht übernommen** |

### 1. Der Regler ist wirkungslos

Das ist die Ursache für „egal was ich mache oder drücke". Die eingestellte
Deckkraft wird in `cv/intelligence.ts` zweimal beschnitten – erst mit einem
Faktor, dann mit einer Obergrenze:

```
backgroundOpacity = min(regler × backgroundFactor, max)
```

Für Studio (Familie *modern*) im Zweispalten-Renderer: `0.06 × 0.58 = 0.035`,
gekappt auf **0.022**. Der Hintergrund wird also mit **2,2 % Deckkraft**
gezeichnet.

Entscheidend ist die Kappung. Sie greift bereits ab einer eingestellten
Deckkraft von `0.022 / 0.58 ≈ 0.038`:

| Familie | Regler wirkt nur bis … (zweispaltig) | Voreinstellung |
| --- | --- | --- |
| classic | 3,5 % Deckkraft (96,5 % Transparenz) | 6 % |
| modern | 3,8 % Deckkraft (96,2 % Transparenz) | 6 % |
| executive | 3,4 % Deckkraft (96,6 % Transparenz) | 6 % |
| editorial | 3,6 % Deckkraft (96,4 % Transparenz) | 6 % |

**Die Voreinstellung liegt bereits jenseits des Sättigungspunkts.** Von dort
aus ändert der Regler in beide Richtungen nichts mehr – von 6 % bis 100 %
Deckkraft kommt immer dasselbe Ergebnis heraus. Genau das war zu sehen.

### 2. Selbst bei voller Deckkraft wäre es das falsche Bild

Der Lebenslauf legt den Titelblatt-Hintergrund als Ganzes unter den Text. Was
eine Vorlage *ausmacht*, ist aber eine grosse Fläche an einer bestimmten
Stelle – und die verträgt sich nicht mit durchlaufendem Text:

- **Studio**: 72 mm dunkle Spalte über die volle Höhe, dazu ein 38 mm hohes
  Akzentband.
- **Sonne**: 118 mm hohe Kopffläche – gut ein Drittel der Seite.
- **Citrus**: weisse Karte 182 × 233 mm auf orangem Verlauf.
- **Kolumne**: 70 mm Spalte über die volle Höhe.

Ein Schleier davon ist kein Wiedererkennen. Ergebnis: Jeder Lebenslauf sieht
gleich aus – weisses Blatt, eine Spalte Text – egal welche Vorlage gewählt ist.

### 3. Dazu ein selbstgemachtes Problem

Um überhaupt etwas sichtbar zu machen, war zwischenzeitlich ein Akzentband oben
eingebaut worden, das es auf dem Titelblatt gar nicht gibt. Das ist erfundenes
Design, kein übernommenes – und damit genau der Punkt der Kritik.

## Leitgedanke

> Zusammengehörigkeit entsteht aus **gemeinsamer Struktur**, gemeinsamen
> **Farbrollen** und gemeinsamer **Typografie** – nicht aus einem blassen Abzug
> des Titelblatts.

Ein blasser Hintergrund ist der Kompromiss, der beides verfehlt: man sieht ihn
kaum, und wo man ihn sieht, stört er den Text.

## Was bleibt

Tragfähig, wird nicht angefasst:

- **Seitenumbruch-Maschine** – misst Zeilen, verteilt sie auf A4-Seiten, hält
  Überschriften bei ihrem Abschnitt. Unabhängig vom Layout.
- **Familien und Theme** (`dossier-family`, `dossier-theme`) – Schrift,
  Überschriftenstil, Dichte, Linienstärke. Die Grundlage für alles Weitere.
- **Gemeinsame Foto-Bedienung** (`components/photo`, `lib/dossier-photo`).
- **Übernahme** von Vorlage, Farben, Person und Foto.
- **Getrennte Historien, JSON, pausiertes Autosave.**
- **Lesbarkeitsprüfung der Schriftfarben** – bleibt, wird aber pro Bereich
  angewandt statt global (Stufe 2).

## Was weg muss

- Der **Vollflächen-Hintergrund als Träger der Identität**. Er bleibt höchstens
  leise Deko.
- Das **erfundene Akzentband**.
- Die **doppelte Dämpfung** aus `backgroundFactor` und `max` in
  `cv/intelligence.ts`. Sie macht den Regler zur Attrappe.
- Das **globale Aufhellen aller Farben** (`softColors`). Es macht aus jeder
  Vorlage dasselbe Pastell.

## Stufe 1 – Struktur übernehmen

Die 19 Vorlagen lassen sich auf vier Bauformen zurückführen. Massgeblich ist,
was die grossen Flächen tun – abgelesen aus `CoverBackground.tsx`:

| Bauform | Vorlagen | Lebenslauf übernimmt |
| --- | --- | --- |
| **Seitenspalte** (3) | Studio, Kolumne, Blockig | Farbige Spalte links (Breite wie auf dem Titelblatt): Foto, Kontakt, Sprachen, Hobbys, Stärken. Hauptspalte: Schule, Praktika, Referenzen. |
| **Kopf- und Fussband** (8) | Sonne, Warm, Aurora, Edel blockig, Colorful, Horizont, Seriös, Modern | Farbband oben mit Name und Zeile darunter, Höhe aus der Vorlage abgeleitet; Fussstreifen, wo die Vorlage einen hat. Inhalt einspaltig. |
| **Karte auf Fläche** (3) | Citrus, Verlauf, Neon | Farbige Grundfläche voll deckend, weisse Textkarte darauf. Folgeseiten behalten die Fläche. |
| **Ruhig: Rahmen und Linien** (5) | Editorial, Edel, Rahmen, Human, Bogen | Helles Papier, Rahmen und Linien der Vorlage, grosse Formen als Zierde. Im Kern das heutige Layout – für diese Vorlagen ist es richtig. |

Zwei Vorlagen sitzen anders, als eine Namensliste vermuten lässt, darum je ein
Wort dazu: **Warm** hat kein feines Raster, sondern eine 115 mm hohe
Kopffläche – es gehört zum Band. **Modern** und **Seriös** haben nur schmale
Streifen von 4 bzw. 6 mm; sie sind formal Bänder, sehen aber ruhig aus, und
genau so übernimmt es der Lebenslauf.

Die Bandhöhen und Spaltenbreiten werden aus derselben Quelle abgeleitet wie das
Titelblatt, nicht neu erfunden: Studio 72 mm, Kolumne 70 mm, Sonne 118 mm,
Aurora 128 mm, Edel blockig 36 mm oben und 65 mm unten.

Die Zuordnung liegt in **einer Tabelle**, nicht im Code verstreut, und ist damit
später leicht zu korrigieren.

**Aufwand:** drei neue Bauformen (die vierte existiert bereits) plus
Zuordnungstabelle. Der Seitenumbruch funktioniert für alle gleich, weil er nur
mit Zeilenhöhen rechnet.

**Risiko:** Bei „Karte auf Fläche" und bei hohen Kopfbändern ist die nutzbare
Höhe kleiner – ein längerer Lebenslauf braucht dort eher zwei Seiten. Das ist
vertretbar und sichtbar, nicht versteckt.

## Stufe 2 – Farbrollen statt Aufhellen

Statt alle Farben pauschal aufzuhellen, bekommt jeder Bereich eine Rolle:

- **Auf Farbe** (Seitenspalte, Kopfband, Grundfläche): helle Schrift auf
  kräftigem Grund – wie auf dem Titelblatt. Die Fläche bleibt **voll deckend**.
- **Auf Papier** (Hauptspalte, Karte): dunkle Schrift auf Weiss, Kontrast
  geprüft.

Damit wird die Lesbarkeitsprüfung dort angewandt, wo sie hingehört, und dunkle
Vorlagen behalten ihren Charakter, statt zu Grau zu werden.

Der Transparenzregler bleibt – aber nur für die **Deko** (Kreise, Verläufe,
Blobs), nicht für die tragenden Flächen. Er bekommt einen ehrlichen Bereich
ohne versteckte Kappung: was eingestellt ist, wird gezeichnet. Sein Zweck wird
damit „wie viel Zierde", nicht „sieht man überhaupt etwas".

## Stufe 3 – Feinschliff

- Gleiche Satzspiegel wie das Titelblatt (Ränder, Spaltenbreiten).
- Abschnittsüberschriften im Label-Stil der Familie (Versalien, Laufweite).
- Foto in derselben Rahmenform wie auf dem Titelblatt.
- Ab Seite 2 eine dezente Fusszeile mit Name und Seitenzahl.

## Reihenfolge und Prüfung

Jede Stufe ist für sich lieferbar. Nach jeder Stufe:

1. Titelblatt und Lebenslauf derselben Vorlage nebeneinander ansehen – für
   mindestens Studio (Spalte), Citrus (Karte), Sonne (Band), Editorial (ruhig).
2. Automatische Prüfungen: kein Seitenüberlauf, Kontrast in beiden Bereichen,
   PDF mit korrekter Seitenzahl, **und der Regler bewegt messbar etwas** – die
   Prüfung, die heute gefehlt hat.
3. Die bestehenden Prüfungen für Titelblatt, Historie und Autosave laufen
   unverändert weiter.

## Offene Entscheidung

Wie weit soll die Struktur übernommen werden?

- **A – alle vier Bauformen.** Grösste Wirkung, meiste Arbeit. Empfehlung.
- **B – nur Seitenspalte und Kopfband.** Deckt 10 der 19 Vorlagen und die
  auffälligsten ab; der Rest bleibt beim heutigen ruhigen Layout, das dort
  ohnehin passt.
- **C – nur Regler reparieren, Farbrollen und Feinschliff.** Am günstigsten,
  behebt das „immer weiss", löst die Kernkritik aber nicht.

Empfohlen ist **A**, ersatzweise **B**: Studio ohne seine Spalte und Citrus ohne
seine Karte sind schlicht nicht wiederzuerkennen – und das sind genau die
Vorlagen, bei denen der Unterschied am meisten auffällt.

Unabhängig von der Wahl wird die Reglerkappung repariert. Sie ist ein Fehler,
keine Gestaltungsfrage.

## Stand

**Entschieden: A.** Stufe 1 und Stufe 2 sind umgesetzt:

- `cv/archetype.ts` hält die Bauformen und die Zuordnungstabelle aller 19
  Vorlagen samt Massen; `cvContentBox()` gibt den Textbereich je Seite.
- Die Seitenumbruch-Maschine rechnet jetzt mit **einer Höhe pro Seite** – nötig,
  weil Seite 1 das volle Kopfband trägt und die Folgeseiten nur dessen Streifen.
- `onColorRoles()` in `cv/palette.ts` liefert Schrift **auf** farbigem Grund.
  Das pauschale Aufhellen entfällt, die Flächen bleiben voll deckend.
- Die doppelte Dämpfung in `cv/intelligence.ts` ist weg; die Voreinstellung
  steht wieder auf 75 % Transparenz.

Nachgemessen über alle 19 Vorlagen: kein Seitenüberlauf, Kontrast im Textbereich
13,6–18,9:1, in Spalte und Band 4,7–16,5:1 (Mindestwert 4,5), PDF-Seitenzahl
gleich der Vorschau, und der Regler verändert das Blatt bei **jeder** Vorlage
messbar – auch bei Citrus, Verlauf und Neon, wo der Grund die tragende Fläche
ist und der Regler stattdessen bestimmt, wie viel Farbe in die Textkarte
durchscheint.

Stufe 3 (Feinschliff) steht noch aus.
