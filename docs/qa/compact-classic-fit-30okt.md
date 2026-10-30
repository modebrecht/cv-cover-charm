# Kompakte Standard-CVs automatisch auf eine Seite – 30. Oktober 2026

Ein kurzer Standard-CV mit bereits halbbreiten Rubriken blieb nach «Automatisch:
1–2 Seiten» auf zwei Seiten. Der reproduzierte Fall benötigt nur rund 68 Prozent
der verfügbaren Höhe. Die einzelne Messzeile `masonry-sprachen-hobbys-staerken`
wurde der vorherigen Rubrik zugeschlagen; drei einzelne Höhen fehlten und lösten
die konservative Zweitseiten-Entscheidung aus.

Für einen bereits kompakten klassischen CV ohne freie Platzierung oder freie
Elemente verwendet die automatische Entscheidung jetzt die vollständige
Bedarfsquote des bestehenden Paginators. Seine Messung umfasst auch gepackte
Zweierspalten und Masonry. Die Zehn-Prozent-Reserve bleibt bestehen. Das Ergebnis
behält die vorhandenen Breiten und Packungsarten; nur die Seitenzuordnungen
wechseln auf Seite eins. Text, Fotoquelle und Schriftwerte werden nicht verändert.
Die bestehende Sidebar-Logik und die explizite Zwei-Seiten-Aktion bleiben getrennt.
Fehlende oder ungültige Gesamtmessungen ergeben weiterhin zwei Seiten; freie
Seite-2-Zuordnungen haben Vorrang.

Lokaler Abschlussprüfstand:

- 1473/1473 Unit-Tests bestanden, 280 Dateien; drei neue gezielte Entscheidungsfälle.
- Sechs neue Browserfälle bestanden: normale Zweierspalten und Masonry,
  jeweils Desktop und Handy, wiederholte Aktion und Neuladen, langer Inhalt und
  frei platzierte Zweitseiten-Referenz. Die beiden Desktopfälle enthalten echte
  einseitige PDF-Downloads mit vollständigen Kontrolltexten.
- App-/QA-Typprüfung, vollständige Formatprüfung und Build bestanden;
  ESLint ohne Fehler, 21 bestehende Warnungen.
- Die vollständige Fit-Suite besteht mit 41/41 Browserfällen: neun explizite
  Zwei-Seiten-Fälle, 22 automatische Fälle und zehn Ein-Seiten-Fälle. Darin
  enthalten sind die sechs neuen kompakten Standard-CV-Fälle.
- Die Release-CI für eine `dev`-Integration ist noch offen. Der geprüfte Stand
  bleibt auf dem Arbeitsbranch gesichert; nichts auf `dev` veröffentlicht.

Ausgangsbasis ist `80877763df6e80124ba9d42305e595a4fe1b97ae`.
Der neue Word-Befund wird separat bearbeitet; private Rückläufer werden nicht
in dieses öffentliche Repository aufgenommen.
