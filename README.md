# Mein Putzmanager — Private Beta V1.0.0

Eigenständige installierbare Android-Web-App (PWA). **Nicht** Teil von `MR-Hausservice`; keine gemeinsame Datenbank und kein Import.

## Inhalt (Mastercheckliste: U01 / fünf Funktionen)

1. Eigenständiges installierbares, offline startendes PWA-Grundgerüst.
2. Vier funktionsfähige Hauptmenüs: Zuhause, Putzen, Putzplan, Mehr; schneller Start einer einfachen Reinigung.
3. Premium-Oberfläche im Stil der fünf Designvorlagen: Anthrazit/Türkis, plastische Navigation; Hell/Dunkel und vier Akzentfarben mit gespeicherter Einstellung.
4. Private Einzelnutzung ohne Konto, PIN oder Gewerbemodul.
5. Grundriss-zentrierte Startseite mit explizitem Einrichtungszustand, solange noch kein echter Grundriss existiert.

**Kleiner Beta-Zusatz:** Eine einfache Reinigung mit Start/Pause/Abschließen und lokalem Zeitprotokoll ist möglich. Das ist **noch kein** vollständiges Putzmodul mit Raum-Checklisten oder Sauberkeitsbewertung (U04/U05). Die Grundriss-Zeichnung folgt in U02 / V1.0.1.

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
