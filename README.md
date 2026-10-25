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

Android: Dateien vollständig auf einen HTTPS-Webserver (z. B. GitHub Pages, falls im Repository aktiviert) laden, in Chrome öffnen, Browser-Menü → **App installieren**. Die App ist anschließend offline startbar. Der einfache Zeitstempel-Verlauf verwendet Browser-`localStorage` und bleibt nur auf dem betreffenden Gerät/Browser. **Keine Datensicherungsfunktion in dieser Version** – sichere wichtige Daten nicht ausschließlich hier. Daten können bei Browser-Speicherbereinigung verloren gehen.

## Prüfungen

`node --test tests/*.test.mjs` verifiziert die Lieferdateien und Quellcode-Invarianten. Zusätzlich Browser-Smoke-Test (`tests/browser_smoke.py`) mit Playwright/Chromium inkl. Navigation, Themes, Zeitprotokoll, Neustart, Offline-Test und Smartphone-Layout. Plattformtest auf echtem Android-Smartphone bleibt als eigener Freigabeschritt offen.

## Release

Version 1.0.0 | Paket U01 | Projektstand 25.10.2026. Weitere 25 Updates sind in der separaten Master-Word-Checkliste geplant.