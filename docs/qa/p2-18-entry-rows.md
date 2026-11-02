# P2-18 — Folgeeinträge und Referenzgruppe

Basis `7d937d504d583ee6cc7d373df38ccd20baa2121c`, separater Branch
`work/02nov-p2-18-entry-rows`.

Geplanter begrenzter Versuch: vier tatsächliche 18-Einträge-Next-Quellen aus P2-17
(normale/wechselnde Beschreibungslängen, links/rechts) und ihre eingefrorenen App-Messwerte.
Keine neuen App-Exporte. Drei Kopien je Quelle: bisherige feste Aufteilung 5/14,
eine äußere Zeile je Folgeeintrag ab 06 mit gemeinsamer Referenzzeile,
dieselbe Struktur mit `cantSplit` nur auf den neuen Folgezeilen (12 Konvertierungen).
Die ersten fünf Einträge bleiben zusammen mit der unveränderten Sidebar in der
ursprünglichen ersten Layoutzeile. Das ist eine Diagnose, kein allgemeiner Paginator.

Alle ursprünglichen Hauptspaltenblöcke bleiben erhalten und geordnet, alle 19
inneren Eintrag-/Referenztabellen, 107 Inhaltssteuerelemente, acht Grafikpayloads,
Zellanfänge und andere ZIP-Teile bleiben unverändert. Rechts besteht die bekannte
Änderung der globalen XML-Lesereihenfolge der Strukturkopie weiter.

Zusätzlicher Prüfer: Referenzüberschrift und Referenztext müssen auf derselben
PDF-Seite stehen; eine sichtbare Linie allein reicht nicht. Inhalts-, Split-,
Geometrie- und Fotogates bleiben unverändert. Keine Produkt- oder Word-Freigabe.
Ein weiterer echter rechter P2-17-Download wird samt Quellhash dauerhaft erhalten.

Nur der bestehende `compatibility-probe`-Job im bestehenden Workflow läuft.
`src`, normaler Export, Paketdateien und `dev`/`render`/`main` bleiben unverändert.

Native Ergebnisse stehen noch aus und werden nach dem Lauf hier dokumentiert.
