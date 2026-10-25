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
