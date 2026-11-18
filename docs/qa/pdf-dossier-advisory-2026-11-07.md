# Einmalige Freigabe einer Messwarnung beim Gesamt-PDF

Teil von [#208](https://github.com/modebrecht/cv-cover-charm/issues/208).

Der Standarddownload setzt einen bestandenen Preflight voraus. Meldet die
Briefpaginierung `measurement-failed`, kann der Export über «PDF trotzdem
herunterladen» einmal bestätigt werden. Dafür muss der vollständige Brief auf
einer finalen A4-Seite liegen und der Preflight muss Titelblatt, Brief und
Lebenslauf ohne weitere PDF-Beanstandungen prüfen können. Der Dialog zeigt die
Messwarnung direkt beim Freigabeknopf.

Ausstehende Messungen oder Ressourcen, Überläufe, unbekannte Warnungen, falsche
Seitenfolgen und fehlende oder unsichtbare Inhalte sperren den Export. Fehlende
Textprüfdaten sowie fehlende oder ungültige Bildprüfdaten des Briefs sperren
ebenfalls. Die Bestätigung gilt einmal für genau diesen Drucksatz und seinen
geprüften Zustand. Der Export prüft diesen Zustand vor und während der
Erzeugung erneut. Im PDF-Raster müssen auch Brieftext und erforderliche
Briefangaben vorhanden sein. Der experimentelle native Druck hat einen eigenen
Prüfpfad.

Die Gruppe `pdf-consent` in `Dossier Regression` prüft die tatsächliche
Bestätigung im Dialog, die Sperren bei zusätzlichen Fehlern, veraltete und
erneut verwendete Bestätigungen sowie Textverlust im Raster. Der erfolgreiche
Test archiviert das vierseitige A4-PDF (Titelblatt, Brief, zwei CV-Seiten).
Wiederöffnen und Neuladen erfordern eine neue Bestätigung.

## Prüfung der Bildrahmen im PDF-Raster, 18.11.2026

Ein im Raster verschobenes Titelblattbild konnte am Seitenrand abgeschnitten
werden, obwohl die Druckvorschau korrekt war. Das Raster prüft jetzt dieselben
Seitenränder wie die Vorschau. Für ein bewusst zugeschnittenes Foto zählt sein
Rahmen. Im CV werden auch freie Elemente geprüft.

Der erweiterte Browsertest verschiebt ein Titelblattbild und eine freie CV-Form
gezielt im Raster. Beide Fälle stoppen den Export. Nach dem Entfernen der
Störung lädt die normale PDF-Aktion das vollständige Dossier herunter. Der
separate Bestätigungstest lädt das Dossier auch nach einer zulässigen
Messwarnung herunter. Beide Testdateien enthalten vier A4-Seiten mit dem
Brieftext, den Beilagen und den CV-Testinhalten auf den erwarteten Seiten.
