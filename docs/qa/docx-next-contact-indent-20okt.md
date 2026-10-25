# Word-Rückgabe 05: bewusster Rand und unbeabsichtigter Kontakteinzug

Benutzerrückmeldung: «05 gut aber das ganze cv etwas verschoben?» Basis `a74a4c500374cb37de75e8e6f694bbfec1a287eb`, bestehender Arbeitsbranch `fix/docx-next-shared-fidelity-18okt`.

Die zurückgegebenen DOCX-/PDF-Dateien wurden direkt aus den bereitgestellten Uploads gelesen; Originale bleiben unverändert. Der Inhaltsanfang von 05 liegt bei 44 mm gegenüber dem unkonfigurierten Modern-Inhaltsanfang bei 24 mm. Das ist der ausdrücklich gespeicherte QA-Sonderfall mit eigenem oberen Rand 28 mm, 4-mm-Header und 12-mm-Zusatzabstand. Word behält diese Ränder unverändert. Keine Default- oder Randkorrektur nötig.

Ein tatsächlicher Word-/Web-Unterschied bestand horizontal: Name und Dokumenttitel standen bei 24 mm, Adresse und Geburtsdatum bei 30 mm. Der native persönliche Abschnitt erbte irrtümlich den 6-mm-Inhaltseinzug der Rubriken, obwohl der Web-Kontaktkopf bei 24 mm beginnt. Auch die Kontakt-Tabellenbreite wurde um diesen Rubrikeinzug gekürzt.

Der gemeinsame klassische `compact-grid`-Kontaktpfad übernimmt nun ausschliesslich seinen Basiseinzug; die Rubriken behalten ihren gespeicherten Inhaltseinzug. Der eigene Seitenrand und alle Werte im Projekt bleiben unverändert. Der gewöhnliche Modellpfad ohne diese Option sowie die eingefrorene Sidebar bleiben unverändert. Regressionstest für Brief und Modern, gemessene Spalten sowie lange Kontaktinhalte ergänzt beziehungsweise auf den korrekten Header-Bezug aktualisiert.

Ein neuer echter UI-Export nach Projekt-Restore bestätigt den Fix. Ergänzend gerendert beginnen Name, Adresse und Geburtsdatum jeweils bei 24,04 mm; die Rubrik bleibt eingerückt. Deckblatt-/Lettermodelle, gespeicherter Snapshot und Seitenränder sind unverändert. Alle drei normalen App-PDF-Seiten sind pixelgleich zur bisherigen Referenz. Die übrigen sieben Batch-Modelle sind identisch; bei 05 ändern sich ausschliesslich persönlicher Abschnittseinzug und Kontaktbreite. Die historische Batch-Reproduktion prüft diese deklarierte Korrektur ausdrücklich.

442 DOCX-Tests, Typecheck, Lint (0 Fehler, 21 bestehende Warnungen), Format und Build bestanden. Keine erneute vollständige Unit-Suite oder CI-Neustarts. [Maschinenlesbarer Nachweis](docx-next-contact-indent-20okt/verification.json).

05 ist als grundsätzlich positiv mit konkretisiertem Einzugsbefund erfasst. Die neue Korrektur ist noch nicht in Microsoft Word abgenommen. Keine zusätzliche Einzelabnahme angefordert; sie fliesst in die nächste gemeinsame Lieferung ein. Die Anhänge 01 und 04 allein gelten ohne entsprechende Benutzeraussage nicht als neue visuelle Freigabe. Kein Merge, Deployment, Standardexportwechsel oder Eingriff in weitere Vorlagen-/Schriftgates.
