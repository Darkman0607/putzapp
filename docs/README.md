## V1.4.0.1 – Grundriss-Drehung (25.10.2026)

**Ergänzung zwischen U16 und U17 (kein Abschluss der U17-Lagerpunkte):** Jeder einzeln ausgewählte Raum (Rechteck, L-Form oder freies Polygon) kann durch Ziehen des grünen ↻-Drehgriffs auf dem Grundriss kontinuierlich um 360° gedreht werden. Alternativ stehen −15°- und +15°-Pfeile sowie eine direkte Grad-Eingabe (0–360°) zur Verfügung. Die Drehung berechnet echte Eckpunktkoordinaten um den Polygonschwerpunkt und speichert sie im bestehenden Grundriss-Datenformat. Die Rotation eines Raums dreht benachbarte Räume nicht mit; unzulässige Überlappungen werden abgewiesen. Vorhandene Tür-/Fensteröffnungen an ausschließlich diesem Raum zugehörigen Wänden folgen der Drehung; Türen/Fenster an unveränderten Nachbarwänden bleiben dort erhalten. Wenn eine Öffnung nicht sinnvoll übertragen werden kann, wird die Änderung abgelehnt, statt die Öffnung zu verlieren. Undo/Redo funktioniert weiterhin.

**Teststand:** Automatisierte Node-Geometrietests und Chromium-Touch-Prüfung bestanden; realer Android-Praxistest und echte Installation bleiben offen. Alte Speicherschlüssel und Daten bleiben erhalten. U17–U26 sind unverändert weiter offen.

---

## V1.4.0 / U16 – Putzlager (25.10.2026)

Die Entwicklung wurde auf Wunsch auf **U16–U26 (Lager)** vorgezogen. U06–U15 bleiben offen.

**U16 umfasst genau fünf neue Punkte:** 1) Putzmittel, Zubehör, Reinigungsgeräte als getrennte Kategorien; 2) Lager unter „Mehr“ und direkter Aufruf aus Putzen zum Vormerken von Artikeln; 3) Liste/Kacheln mit dauerhaft gespeicherter Ansicht; 4) kombinierte Volltextsuche, Sortierung und Filter nach Kategorie, Lagerort, Bestand/Status; 5) Favoriten und lesbare Statusfilter für fast leer, fehlt und unvollständig.

Artikel können vorerst mit Name, Kategorie, Menge, Einheit, Mindestbestand und optionalem Lagerort hinzugefügt werden. Erweiterte Stammdaten, Nachbuchungen, mehrere Orte und Bilder folgen in **U17**, intelligente Prognosen erst in **U19–U22**. Das Vormerken beim Putzen erzeugt **keine Verbrauchsbuchung** und ist aktuell nur für die laufende App-Sitzung vorgesehen.

**Datenspeicherung:** Bestehende Wohnungs- und Reinigungsdaten bleiben unter `mein-putzmanager-beta-v1`. Das Lager nutzt eigenständig `mein-putzmanager-inventory-v1`. Ohne erfolgreiche lokale Speicherung erscheint ein Warnhinweis. Vor Browserdaten-Löschung bitte beachten: ein vollständiger Export/Restore fehlt noch (U26).

**Releasezustand:** Computergestützte Testabnahme im Repository; echter Android-Installations-/Offline-Test und vollständiger Backup/Restore auf einem Gerät sind weiterhin offen. Das ist eine Beta, keine vollständige Gerätefreigabe.

---

## V1.0.4 / U05 – Putzaufgaben und Basisreinigung (25.10.2026)

Die folgenden Funktionen sind **jetzt tatsächlich enthalten** (ältere README-Abschnitte beschreiben historische Zwischenstände):

- Aufgaben pro Raum oder Unterbereich: aus 12 Vorschlägen wählen, frei anlegen, bearbeiten, löschen; bisherige U04-Aufgaben bleiben gespeichert.
- Intervalle: einmalig, täglich, wöchentlich oder alle 1–365 Tage. Nach einem dokumentierten Abschluss werden `lastDoneAt` und die nächste Fälligkeit gesetzt. Offene und fällige Aufgaben werden in der Übersicht gezählt.
- Schnellreinigung: alle Teilbereiche sind zunächst ausgewählt, abwählbar. Nur ausgewählte Teilflächen und Restflächen erhalten einen neuen **geschätzten** Sauberkeitswert 100 %. Datum/Uhrzeit und optionale Notiz werden gespeichert.
- Detailreinigung: jede Aufgabe separat auswählen; nur deren Unterbereich oder allgemeine Restflächen bekommen den neuen Schätzwert. Kein automatisches Hochsetzen nicht gereinigter Bereiche.
- Reinigungshistorie: chronologische Dokumentation von bis zu 500 letzten Raumreinigungen mit Art, Datum/Uhrzeit, Bereichen, Aufgaben, Vorher-/Nachher-Schätzwert und Notiz. Ältere U01-Stoppuhr-Sitzungen sind weiterhin getrennt vorhanden.

Technik: gleiche lokale Browser-Datenkennung `mein-putzmanager-beta-v1`; `home.history`, erweiterte `home.floors[].rooms[].cleanliness` und `task-model.js`; keine Cloud. GitHub-Pages-Root und `/docs` bleiben deckungsgleich. Automatische Tests, Chromium-Mobile-Tests und Zip-Test belegen den Beta-Stand; echte Android-WebAPK-Installation, Offline-Praxistest und vollständiger Backup-Restore **nicht** bestätigt.

# Mein Putzmanager — Private Beta V1.0.1

Eigenständige installierbare Android-Web-App (PWA). **Nicht** Teil von `MR-Hausservice`; keine gemeinsame Datenbank und kein Import.

## Inhalt (Mastercheckliste: U01 / fünf Funktionen)

1. Eigenständiges installierbares, offline startendes PWA-Grundgerüst.
2. Vier funktionsfähige Hauptmenüs: Zuhause, Putzen, Putzplan, Mehr; schneller Start einer einfachen Reinigung.
3. Premium-Oberfläche im Stil der fünf Designvorlagen: Anthrazit/Türkis, plastische Navigation; Hell/Dunkel und vier Akzentfarben mit gespeicherter Einstellung.
4. Private Einzelnutzung ohne Konto, PIN oder Gewerbemodul.
5. Grundriss-zentrierte Startseite mit explizitem Einrichtungszustand, solange noch kein echter Grundriss existiert.

**Kleiner Beta-Zusatz:** Eine einfache Reinigung mit Start/Pause/Abschließen und lokalem Zeitprotokoll ist möglich. Das ist **noch kein** vollständiges Putzmodul mit Raum-Checklisten oder Sauberkeitsbewertung (U04/U05). Die Grundriss-Zeichnung ist in U02 / V1.0.1 als Beta-Editor enthalten.

## Start und Installation

Lokal: `python3 -m http.server 8000`, danach `http://localhost:8000` öffnen. Ein Service Worker braucht HTTPS oder `localhost`; nicht direkt `file://` öffnen.

Android: Dateien vollständig auf einen HTTPS-Webserver (z. B. GitHub Pages, falls im Repository aktiviert) laden, in Chrome öffnen, Browser-Menü → **App installieren**. Der Service Worker ist für den Offline-Start vorgesehen, dies muss jedoch auf einem echten Android-Gerät noch getestet werden. Der einfache Zeitstempel-Verlauf verwendet Browser-`localStorage` und bleibt nur auf dem betreffenden Gerät/Browser. **Keine Datensicherungsfunktion in dieser Version** – sichere wichtige Daten nicht ausschließlich hier. Daten können bei Browser-Speicherbereinigung verloren gehen.

## Prüfungen

`node --test tests/*.test.mjs` verifiziert die Lieferdateien und Quellcode-Invarianten. Zusätzlich Browser-Smoke-Test (`tests/browser_smoke.py`) mit Playwright/Chromium: Navigation, Themes, Zeitprotokoll, simulierter Neustart und Smartphone-Layout. Die Testumgebung blockiert lokale Browser-Navigation; deshalb werden HTML, CSS und JavaScript direkt in die Browser-Testseite eingespeist. **Echter HTTP-/Service-Worker-Offline-Test und Installation auf einem Android-Smartphone sind noch ausständig.**

## Release

Version 1.0.0 | Paket U01 | Projektstand 25.10.2026. Weitere 25 Updates sind in der separaten Master-Word-Checkliste geplant.

## V1.0.0.1 – Installationsfix (25.10.2026)

GitHub Pages nutzt Branch `Root`; aktuell ist der Veröffentlichungsordner `/ (root)` eingestellt. Eine inhaltlich identische Kopie unter `/docs` ist als zusätzliche Absicherung enthalten, falls der Pages-Ordner später geändert wird. Auf der Startseite liegt nun ein Installationsknopf. Ist `beforeinstallprompt` verfügbar, wird der native Chrome-Dialog geöffnet. Andernfalls prüft ein Diagnosefenster Manifest, Icons, Startadresse und Service-Worker und erläutert die Installation in Chrome. Manifest-Scope und `start_url` sind eindeutig `/putzapp/`; die Datenkennung `mein-putzmanager-beta-v1` bleibt unverändert. Neu gefasster Service Worker ermöglicht eine Offline-Fallback-Navigation. Ein echter Android-WebAPK-Installationstest kann ausschließlich auf einem physischen Endgerät abschließend bestätigt werden.

**Nachweisgrenze:** Nur ein erfolgreicher GitHub-Pages-Workflow und eine Bestätigung auf dem Android-Gerät können die öffentliche Auslieferung bzw. die echte Installation belegen. Lokale Browser-Smoke-Tests reichen dafür nicht.

## V1.0.1 — U02 Wohnungsanlage und Grundriss-Editor (25.10.2026)

- Haus/Wohnung mit einer Ebene oder weiteren benannten Etagen, Ebenen bearbeiten/wechseln/löschen.
- Kombination von frei gezeichneter Außenkontur und Raum-für-Raum-Aufbau.
- Vollbild-Editor mit SVG-Zeichenfläche, Zwei-Finger-Zoom, Ein-Finger-Pan und Zoomtasten.
- Rechtecke, L-Form und freie Polygone; Räume umbenennen, per Drag bewegen, an Eckpunkten anpassen, sicher löschen.
- Sofortige lokale Speicherung unter dem bisherigen Speicher-Schlüssel mit Undo/Redo je Editor-Sitzung.

**Wichtig:** Vorhandene Einstellungen und Reinigungsprotokolle bleiben beim Laden erhalten. Der Grundriss wird nur in der lokalen Browser-Datenbank (`localStorage`) gesichert; ein vollständiges Backup kommt erst später. U03 (gemeinsame Wände, Tür-/Fensteröffnungen und exakte Maße), U04 (Sauberkeitswerte) und U05 (Putzaufgaben) sind **noch nicht** Bestandteil dieser Version. Undo/Redo gilt innerhalb der geöffneten Editor-Sitzung; nach App-Neustart ist der gespeicherte letzte Grundriss verfügbar, nicht die Undo-Historie. Die reale PWA-Installation und ein Offline-Test auf einem Android-Smartphone bleiben offen.


## V1.0.2 – U03: Lückenlose Wandgeometrie, Maße, Türen und Fenster (25.10.2026)

- Raumbereiche teilen sich nur **ein** geometrisch abgeleitetes Wandsegment; beim gezielten Ziehen des gemeinsamen Wandgriffs ändern sich beide angrenzenden Raumkonturen. Verbundene Räume verschieben sich als Gruppe, gemeinsame Ecken werden synchron bearbeitet.
- Raum-Vorlagen werden kollisionsfrei neben vorhandenen Räumen platziert. Beim Verschieben rasten benachbarte Kanten aneinander; ein Versuch, Räume überlappend abzulegen, wird verworfen und angezeigt.
- Planmaße sind **zunächst ausdrücklich unkalibriert**. Eine reale Wandlänge dient zur freiwilligen Maßstabs-Kalibrierung (Meter pro Plan-Einheit). Gerade Wände lassen sich später in der Länge ändern; rechteckige Räume haben editierbare Breite und Tiefe. Für komplexe Nicht-Rechtecke wird eine solche maßgebundene Bearbeitung sicher verweigert.
- Türen (ein- oder zweiflügelig, offen, Schiebetür; Anschlag, Breite, Position) und Fenster (Typ, Breite, optionale Höhe, Position) sind echte Unterbrechungen der gezeichneten Wandlinie. Öffnungen werden pro Ebene gespeichert und in der Startseiten-Vorschau gezeigt.
- Das vorhandene lokale Datenformat `mein-putzmanager-beta-v1` und alle U02-Wohnungsdaten bleiben erhalten. Ein neuer optionaler Zustand `openings` und `metersPerUnit` je Ebene wird beim Lesen ergänzt; die Version benötigt keinen Datenreset.
- Einschränkungen: Eine Bestätigung der echten Android-PWA-Installation und des Offline-Verhaltens erfordert noch einen Test auf einem physischen Android-Gerät. Die Maßfunktion ist kein bautechnisch kalibriertes CAD-System; freie schräge Wände lassen sich weiterhin zeichnen, aber nicht am Griff parallel verschieben.

## V1.0.3 / U04 – Raumübersicht und Sauberkeitsmodell (25.10.2026)

Im Wohnungs-Dashboard Räume per kurzem Tippen öffnen und per langem Druck Schnellaktionen aufrufen. Freie Unterbereiche pro Raum (WC, Boden, Dusche) anlegen, umbenennen, löschen und mit einfachen abhackbar gespeicherten Putzaufgaben versehen sowie einzeln von 0–100 % bewerten. Jeder Raum besitzt einen Ausgangswert von **50 % als neutrale Startschätzung** (keine Messung). Nicht erfasste Flächen haben eine Gewichtung von 1; jeder angelegte Bereich ebenfalls 1. Der gerundete Durchschnitt bildet den Raumwert. Eine explizit manuell gesetzte Gesamtnote übersteuert diese Berechnung vorübergehend; sobald ein Unterbereich oder die Restfläche geändert wird, gilt wieder die berechnete Note. In der Wohnungsansicht werden Farben und Prozentwerte gezeigt, auch über Etagen hinweg. Kein Sensorwert, keine automatische Zeitabwertung, noch keine Termin-/Intervallverwaltung (folgt mit U05). Die Daten bleiben unter dem bisherigen localStorage-Schlüssel erhalten.

## V1.4.0.2 – Lager bearbeiten und Materialien je Putzaufgabe (Beta, 25.10.2026)

**Sonderupdate, keine vollständige Abnahme von U17–U22:**

- JEDER vorhandene Lagerartikel kann über „Bearbeiten“ geändert werden: Name, Kategorie, Menge, Einheit, Mindestbestand, Ort, Marke, Modell, Notiz und Wiederverwendbarkeit; stabile IDs und dokumentierte Nutzungen bleiben erhalten.
- Icon-Auswahl für blaue, weiße und rosa Handschuhe, Geschirrtücher, Putztücher, Sprays, Schwämme, Bürsten und Geräte. Bis zu drei beim Hinzufügen/Bearbeiten verkleinerte eigene Fotos pro Artikel werden **lokal im Browser** gespeichert. Grenzen des localStorage gelten; bei Speicherfehler bleibt die alte Version erhalten.
- In der Raumreinigung vor/während oder nach dem Putzen Artikel abhaken; die zuletzt **bestätigte** Auswahl wird pro Raum und pro tatsächlich erledigter Aufgabe wieder mit Häkchen vorausgewählt. Auswahl ist bis zum Abschluss nur ein Entwurf.
- Eine erfolgreich dokumentierte Reinigung erhält eine eindeutige Sitzungs-ID; jede ausgewählte Produkt-ID wird je Sitzung maximal einmal als verwendet gezählt. Putzmittel: Anzahl der realen Verwendungen plus gewichtete Verbrauchseinheiten (wenig 0,5 / normal 1 / viel 2). Vollständige Materialzuordnung wird aufgabenspezifisch gespeichert. Wiederverwendbare Artikel werden nicht verbraucht, Einweg-Zubehör wird um ein Stück je bestätigter Verwendung verringert.
- Erst bei explizitem „Flasche leer“ wird die aufgezeichnete Anzahl der Nutzungen/Einheiten einer **einzigen aktiven Flasche** als Lernprobe gespeichert und eine Flasche aus dem manuell gepflegten Vorrat abgezogen. Noch keine Restnutzungs-Prognose, keine mehreren parallelen offenen Flaschen, keine vollumfängliche Fotobackup-/Restore-Funktion, keine Zuordnung zu verschiedenen Gebindegrößen/Lagerorten.

**Testgrenze:** Node- und mobile Chromium-Tests belegen diesen Browser-Beta-Stand. Echte Android-Installation, Offline-Gerätetest und vollständiger Backup-Restore mit Fotos bleiben offen. Die Variante „Nach dem Putzen“ öffnet die Materialauswahl erst beim ersten Speicherversuch, die eigentliche Bestätigung erfolgt per zweitem Speicherklick. Falls die Lagerbuchung nach dem Speichern der Raumreinigung wegen voller Browser-Speicherung scheitert, erscheint eine Warnung; es gibt keine echte transaktionale Zwei-Datenbank-Sicherung.


## V1.4.0.3 – Eigene Lagerkategorien (25.10.2026)

- Unter **Mehr → Putzlager → ⚙ Kategorien** lassen sich eigene Kategorien erstellen, beliebig umbenennen und sicher löschen. Beim Erstellen einer Kategorie wird einmalig die zugehörige Lager-Artikelart (Putzmittel, Zubehör oder Reinigungsgerät) ausgewählt, damit die bestehende Verbrauchslogik erhalten bleibt. Ein späterer Wechsel der Artikelart ist deshalb gesperrt; Name und Kategoriezuordnung einzelner Artikel sind weiterhin editierbar.
- Vorhandene drei Standardkategorien und sämtliche Artikel bleiben beim Update bestehen; die Lagerdatenkennung `mein-putzmanager-inventory-v1` ändert sich **nicht**. Kategorienamen erscheinen in Artikelformular, Filtern, Suche und Lagerkacheln. Die Artikelart sorgt dafür, dass Reinigungsnutzungen für Unterkategorien korrekt gezählt werden.
- Löschen einer unbenutzten Kategorie erfordert eine Bestätigung. Sind Artikel zugeordnet, müssen sie vor dem Löschen explizit in eine andere Kategorie derselben Artikelart verschoben werden. Kein stilles Löschen von Artikeln, Fotos, Nutzungen oder Lagerorten. Die letzte vorhandene Kategorie kann nicht gelöscht werden.
- Das Update wurde lokal mit Node-Regressionstests und Chromium-Browser-Smoke-Tests geprüft. Echte Android-Geräteinstallation und ein vollständiges Backup/Restore sind weiterhin nicht getestet bzw. noch nicht implementiert.

## V1.4.0.4 – Interaktive 3D-Reinigungsansicht (U07/U08 Beta, 25.10.2026)

- Auf **Zuhause → 3D Reinigen** ist aus dem unveränderten 2D-Grundriss ein räumliches, offline-fähiges SVG-Modell sichtbar. Es existiert **keine zweite Wohnung und keine Migration**: Räume, ID, Namen, Punkte, Türen, Fenster, Etagen und Sauberkeitswerte stammen aus dem bisherigen `mein-putzmanager-beta-v1`-Datensatz.
- Geschätzte Zustandsfarben und Prozentwerte sind identisch mit der 2D-Ansicht. Tippen auf einen Raum öffnet **dieselben** Raumdetails; die Auswahl bietet Schnellreinigung, Detailreinigung/Checkliste, Aufgabenverwaltung und gezielte manuelle Sauberkeitskorrektur. Abgeschlossene Reinigungen verwenden die bestehenden Historien-/Lagerbuchungen.
- 360° Ansicht mit Ein-Finger-Drehen, Neigen, Zwei-Finger-Zoom/Schwenken, Pfeil-/Zoom-Tasten und Reset; kein versehentliches Bearbeiten der Raumkonturen. Für mehr als 35 Räume bzw. über 320 Eckpunkte wird auf vereinfachte Wandgeometrie umgeschaltet.
- Gemeinsame 2D-Wände werden nur einmal in 3D dargestellt, Tür-/Fensterbereiche bleiben als Öffnungen berücksichtigt. **Einschränkung:** Die anschauliche Wandhöhe ist in dieser Beta schematisch (145 Zeichenplan-Einheiten) und keine technisch exakte, kalibrierte Raumhöhe; ein vollwertiges 3D-CAD-/Möbelmodell ist ausdrücklich nicht enthalten.
- **Prüfstand:** 74/74 Node-Tests und Chromium-Mobile-3D-End-to-End-Test (inkl. 50-Raum-Fallback, Reload, Etagen, Reinigen, Kamerabewegung) bestanden; bestehende Browser-/Editor-/Lager-/Putz-Regressionen bestanden. Ohne physisches Android-Gerät bleiben die tatsächliche PWA-Installation, offline Gerätetests, langzeitstabile Touch-/Leistungsprüfung und vollständiges Backup/Restore **offen**. In der Mastercheckliste sind nur tatsächlich belegte Teilaufgaben markiert.

## V1.4.0.5 – Lagerbuchung, Waschkorb und Raum-Stoppuhr (25.10.2026)

- Pro Lagerartikel wählbare **Buchungsart** statt unzuverlässiger Zuordnung über Kategorien: *Flüssigmittel*, *Einweg*, *waschbar*, *dauerhaft*. Legacy-Artikeln (auch irrtümlich als „Putzmittel“ klassifizierten Handschuhen) wird eine vorläufige Buchungsart nach Name/Icon/Reusable-Flag zugeordnet. Bei Bedarf unter Artikel → Bearbeiten korrigieren.
- Raumreinigungen buchen nach bestätigtem Abschluss je ausgewähltem Artikel und eindeutiger Sitzungs-ID genau einmal: *Einweg* −1 Bestandseinheit; *waschbar* +1 Wäsche, −1 sauber verfügbar (Gesamtmenge unverändert); *Flüssigmittel* nur Nutzung, physischer Abzug mit „Flasche leer“; *dauerhaft* ohne Mengenänderung.
- Bei fehlenden Beständen verweigert das Modell die **gesamte Buchung vor jeder Veränderung**. Die Raumhistorie wird erst nach erfolgreicher Lagerbuchung gespeichert. Im Fehlerfall bleibt der Reinigungsdialog offen und nennt den fehlenden Artikel. Keine Abbuchung beim Abbrechen.
- Unter **Mehr → Putzlager**: je waschbarem Artikel Anzeige *sauber / in Wäsche / gesamt*, Schaltflächen „Gewaschen +1“ und „Alle gewaschen“. Waschen bucht sauber zurück, nicht zusätzlich auf die Gesamtmenge.
- **Stoppuhr je Raum** für Schnell- und Detailreinigung: Start, Pause, Weiter, Reset, Auto-Pause bei versteckter App, lokale Sicherung des pausierten Zeitstands und Dauer im Reinigungsjournal. „Letzte Reinigungen“ listet zusätzlich die raumbezogenen Sitzungen und Dauer.
- Tests: `node --test tests/*.test.mjs` sowie `python tests/stock_timer_browser.py`. Browserprüfungen: tatsächlicher Abschluss, Einweg −1, Wäsche +1, Waschen, Pausieren/Zeitspeicherung, Stopp bei Fehlbestand und erneutes Laden. Keine Echtgeräte-/Backup-Freigabe.

**Hinweise:** Der Verbrauch von Flüssigmitteln bleibt wie geplant eine Nutzungszählung, keine geschätzte Milliliterbuchung. Bei bereits angelegten Artikelbeständen die Buchungsart kontrollieren; ein korrekt ausgewähltes Material wird nur beim bestätigten Reinigen gebucht. Individuelle Tücher/Handschuhe werden in dieser Beta als Mengenpool erfasst, nicht als einzelne RFID-/Inventarnummern.
